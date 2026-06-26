// === Web Crypto helpers — AES-GCM encryption with PBKDF2-derived key ===
// 純瀏覽器 API，零 dependency
//
// Security model:
//   - Passphrase 永遠唔離開 memory / 唔落 localStorage
//   - Salt 隨機 16 bytes，每次 unlock 重新 derive → same passphrase 都會 derive 出唔同 key
//     （但 Salt 必須儲喺 localStorage，否則下次 unlock derive 唔返同樣 key → decrypt 失敗）
//   - IV (nonce) 每次 encrypt 隨機 12 bytes → 同一個 plaintext 唔同 ciphertext
//   - AES-GCM 256-bit + PBKDF2 310,000 iterations（OWASP 2024 baseline）
//
// 儲存格式 (all base64):
//   TDA_PROFILE_BANK_V1 = {
//     salt: '<b64>',         // 16 bytes salt，永久儲存
//     profiles: [            // encrypted entries
//       {
//         id: 'profile_xxx',
//         iv: '<b64>',       // 12 bytes IV per entry
//         ciphertext: '<b64>',  // AES-GCM encrypted JSON({name, preset, customNotes, ...})
//       }
//     ]
//   }

// === Salt / IV 生成 ===
export const generateSalt = () => crypto.getRandomValues(new Uint8Array(16));
export const generateIV = () => crypto.getRandomValues(new Uint8Array(12));

// === Base64 helpers ===
const b64encode = (bytes) => {
    let binary = '';
    const chunkSize = 8192;
    for (let i = 0; i < bytes.length; i += chunkSize) {
        binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
    }
    return btoa(binary);
};
const b64decode = (b64) => {
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
};

// === PBKDF2: passphrase + salt → AES-GCM CryptoKey ===
// 310k iterations + SHA-256（OWASP 2024 recommended baseline）
const PBKDF2_ITERATIONS = 310000;
const deriveKey = async (passphrase, saltBytes) => {
    const encoder = new TextEncoder();
    const baseKey = await crypto.subtle.importKey(
        'raw',
        encoder.encode(passphrase),
        'PBKDF2',
        false,
        ['deriveKey']
    );
    return crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: saltBytes,
            iterations: PBKDF2_ITERATIONS,
            hash: 'SHA-256',
        },
        baseKey,
        { name: 'AES-GCM', length: 256 },
        false,                            // non-extractable
        ['encrypt', 'decrypt']
    );
};

// === Encrypt: plaintext string → { iv, ciphertext } base64 strings ===
export const encryptString = async (plaintext, key, iv) => {
    const encoder = new TextEncoder();
    const cipherBuffer = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        encoder.encode(plaintext)
    );
    return {
        iv: b64encode(iv),
        ciphertext: b64encode(new Uint8Array(cipherBuffer)),
    };
};

// === Decrypt: { iv, ciphertext } → plaintext string ===
// throws if key is wrong / data corrupted
export const decryptString = async (ivB64, cipherB64, key) => {
    const iv = b64decode(ivB64);
    const cipherBytes = b64decode(cipherB64);
    const plainBuffer = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        cipherBytes
    );
    return new TextDecoder().decode(plainBuffer);
};

// === High-level: setup new vault (generate salt) ===
// 用嚟第一次開 Profile Bank
export const createVault = async (passphrase) => {
    if (!passphrase || passphrase.length < 8) {
        throw new Error('Passphrase 至少 8 個字元。');
    }
    const salt = generateSalt();
    const key = await deriveKey(passphrase, salt);
    return {
        salt: b64encode(salt),
        key,                              // CryptoKey, keep in memory
    };
};

// === High-level: open existing vault (derive key from stored salt) ===
export const unlockVault = async (passphrase, saltB64) => {
    if (!passphrase) throw new Error('Passphrase 唔可以空白。');
    const saltBytes = b64decode(saltB64);
    const key = await deriveKey(passphrase, saltBytes);
    // 唔做 decrypt test — caller 試 decrypt 第一個 profile 就會知道 passphrase 啱唔啱
    return { key };
};

// === Encrypt a profile entry ===
// entry shape: { name, preset: {...formData subset...}, customNotes, updatedAt }
// 我哋將成個 entry JSON.stringify 然後 encrypt
export const encryptProfileEntry = async (entry, key) => {
    const iv = generateIV();
    const plaintext = JSON.stringify(entry);
    const { iv: ivB64, ciphertext } = await encryptString(plaintext, key, iv);
    return {
        id: entry.id,
        iv: ivB64,
        ciphertext,
        updatedAt: entry.updatedAt,  // 明碼保留 metadata（用嚟 sort/display）
    };
};

// === Decrypt a profile entry ===
// throws if key 唔啱 / ciphertext 壞
export const decryptProfileEntry = async (encryptedEntry, key) => {
    const plaintext = await decryptString(encryptedEntry.iv, encryptedEntry.ciphertext, key);
    const entry = JSON.parse(plaintext);
    return {
        ...entry,
        id: encryptedEntry.id,
        updatedAt: encryptedEntry.updatedAt,
    };
};

// === Test unlock without exposing key — 試 decrypt 一個已知 entry 嚟 verify passphrase ===
// 用嚟喺 Profile Bank 入面 "verify passphrase" step
// entry 可以係任何一個 encrypted entry；如果 throw 就有問題
export const testUnlock = async (encryptedEntry, key) => {
    return decryptProfileEntry(encryptedEntry, key);
};