// === v3.17.0 1.1: Auto-Fill from Student Profile tests ===
// Tests:
//   - defaultProfileId persists in localStorage (TDA_DEFAULT_PROFILE_ID_V1)
//   - autoApplyEnabled toggle persists (TDA_AUTO_FILL_ENABLED_V1, default true)
//   - Auto-apply effect triggers when formData is empty + default is set + profiles loaded
//   - Clobber gate: formData with content does NOT auto-apply
//   - Stale default profile id: setDefaultProfileId(null) + pushWarning
//   - clearDefaultProfile() resets to null
//   - ProfileBankPanel 設為預設 button toggles state

// @vitest-environment jsdom

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import React from 'react';

// --- Mock useLocalStorage (same pattern as reduced-motion.test.js) ---
const mockStorage = new Map();
vi.mock('../src/hooks/useLocalStorage.js', () => ({
    useLocalStorage: (key, defaultValue) => {
        const [value, setRawValue] = React.useState(() => {
            const stored = mockStorage.get(key);
            if (stored === undefined) return defaultValue;
            // Mock localStorage may serialize booleans/strings; coerce back
            if (typeof defaultValue === 'boolean') return stored === 'true' || stored === true;
            return stored;
        });
        const setter = (valOrUpdater) => {
            setRawValue(prev => {
                const v = typeof valOrUpdater === 'function' ? valOrUpdater(prev) : valOrUpdater;
                if (v === null || v === undefined) mockStorage.delete(key);
                // PATCH 2026-07-17: stringify booleans so the mock matches real
                // localStorage semantics (real localStorage.setItem(true) stores
                // "true" as a string, but our Map-based mock was storing the raw
                // boolean). The reader path below already coerces strings back
                // to booleans, so this just makes the write side consistent.
                // Without this, `expect(mockStorage.get('TDA_AUTO_FILL_ENABLED_V1')).toBe('false')`
                // fails because get() returns the boolean false, not the string 'false'.
                else mockStorage.set(key, typeof v === 'boolean' ? String(v) : v);
                return v;
            });
        };
        return [value, setter];
    },
}));

// --- Mock useProfileBank: avoid crypto + control profiles list for tests ---
const mockBankState = {
    profiles: [],
    vaultExists: false,
    isLocked: true,
    hasProfiles: false,
};
vi.mock('../src/hooks/useProfileBank.js', () => ({
    useProfileBank: () => ({
        vaultExists: mockBankState.vaultExists,
        isLocked: mockBankState.isLocked,
        profiles: mockBankState.profiles,
        hasProfiles: mockBankState.hasProfiles,
        MAX_PROFILES: 50,
        lastError: null,
        setup: vi.fn(),
        unlock: vi.fn(),
        lock: vi.fn(),
        addProfile: vi.fn(),
        updateProfile: vi.fn(),
        deleteProfile: vi.fn(),
        exportEncrypted: vi.fn(),
        importEncrypted: vi.fn(),
    }),
}));

import { useAppState } from '../src/state/useAppState.js';
import { ProfileBankPanel } from '../src/components/ProfileBankPanel.jsx';

// --- Test fixtures ---
const sampleProfile = {
    id: 'profile_abc123',
    name: '小明 ASD 模板',
    preset: {
        senTypes: ['ASD 自閉症譜系'],
        grade: '小三',
    },
    customNotes: '喜歡視覺提示',
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
};

const anotherProfile = {
    id: 'profile_xyz789',
    name: '小美 ADHD 模板',
    preset: {
        senTypes: ['ADHD 專注力不足/過度活躍'],
        grade: '小二',
    },
    customNotes: '',
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
};

describe('v3.17.0 1.1 — Auto-Fill from Default Student Profile', () => {
    beforeEach(() => {
        mockStorage.clear();
        mockBankState.profiles = [];
        mockBankState.vaultExists = false;
        mockBankState.isLocked = true;
        mockBankState.hasProfiles = false;
    });

    afterEach(() => {
        cleanup();
        mockStorage.clear();
    });

    it('defaultProfileId state: starts as null, persists to localStorage on set', () => {
        const { result } = renderHook(() => useAppState());
        expect(result.current.defaultProfileId).toBe(null);

        act(() => {
            result.current.setDefaultProfileId('profile_abc123');
        });
        expect(result.current.defaultProfileId).toBe('profile_abc123');
        expect(mockStorage.get('TDA_DEFAULT_PROFILE_ID_V1')).toBe('profile_abc123');
    });

    it('autoApplyEnabled toggle: defaults to true, persists on change', () => {
        const { result } = renderHook(() => useAppState());
        expect(result.current.autoApplyEnabled).toBe(true);

        act(() => {
            result.current.setAutoApplyEnabled(false);
        });
        expect(result.current.autoApplyEnabled).toBe(false);
        expect(mockStorage.get('TDA_AUTO_FILL_ENABLED_V1')).toBe('false');
    });

    it('clearDefaultProfile() resets to null and clears localStorage', () => {
        const { result } = renderHook(() => useAppState());
        act(() => {
            result.current.setDefaultProfileId('profile_abc123');
        });
        expect(result.current.defaultProfileId).toBe('profile_abc123');

        act(() => {
            result.current.clearDefaultProfile();
        });
        expect(result.current.defaultProfileId).toBe(null);
        expect(mockStorage.get('TDA_DEFAULT_PROFILE_ID_V1')).toBeUndefined();
    });

    it('auto-apply effect: when default set + profiles loaded + formData empty, applies profile', async () => {
        // Set up: vault unlocked with 1 profile
        mockBankState.profiles = [sampleProfile];
        mockBankState.vaultExists = true;
        mockBankState.isLocked = false;
        mockBankState.hasProfiles = true;
        mockStorage.set('TDA_DEFAULT_PROFILE_ID_V1', 'profile_abc123');

        const { result } = renderHook(() => useAppState());

        // formData starts at initial state (toolName + purpose empty)
        expect(result.current.formData.toolName).toBe('');
        expect(result.current.formData.purpose).toBe('');

        // PATCH 2026-07-17: auto-apply useEffect runs AFTER render, so we must
        // waitFor the assertion. Synchronous expect() was reading the pre-effect
        // initial formData and tripping on the default suggestion for grade
        // (e.g. "小學二年級 (P2)" from options-table) instead of the profile's
        // applied value ("小三"). waitFor retries until the effect-driven value
        // lands (or times out — failure then means auto-apply never fired,
        // which is exactly what the test is meant to catch).
        await waitFor(() => {
            expect(result.current.formData.senTypes).toContain('ASD 自閉症譜系');
            expect(result.current.formData.grade).toBe('小三');
        });
    });

    it('clobber gate: formData with content does NOT auto-apply (existing work preserved)', async () => {
        // Mount WITHOUT default profile set (so the first-mount effect is a no-op)
        const { result } = renderHook(() => useAppState());

        // Simulate teacher is mid-work: set formData with content first
        act(() => {
            result.current.setFormData({
                ...result.current.formData,
                toolName: '我嘅現有工具',
                purpose: '我嘅現有核心用途',
            });
        });

        // Now set up: default profile + vault unlocked (trigger effect re-run)
        mockBankState.profiles = [sampleProfile];
        mockBankState.vaultExists = true;
        mockBankState.isLocked = false;
        mockBankState.hasProfiles = true;
        act(() => {
            result.current.setDefaultProfileId('profile_abc123');
        });

        // Clobber gate: formData has content → apply was blocked
        expect(result.current.formData.toolName).toBe('我嘅現有工具');
        expect(result.current.formData.purpose).toBe('我嘅現有核心用途');
        // Profile's senTypes should NOT have been merged
        expect(result.current.formData.senTypes).not.toContain('ASD 自閉症譜系');
    });

    it('stale default: profile id points to deleted profile → clears localStorage + warns', async () => {
        // Set up: default points to a profile that's NOT in the list
        mockBankState.profiles = [anotherProfile];  // different profile than default
        mockBankState.vaultExists = true;
        mockBankState.isLocked = false;
        mockBankState.hasProfiles = true;
        mockStorage.set('TDA_DEFAULT_PROFILE_ID_V1', 'profile_deleted');

        const { result } = renderHook(() => useAppState());

        // Effect detects stale id → sets to null
        expect(result.current.defaultProfileId).toBe(null);
        expect(mockStorage.get('TDA_DEFAULT_PROFILE_ID_V1')).toBeUndefined();
        // Warning was pushed
        const warningTitles = result.current.warnings.map(w => w.title);
        expect(warningTitles.some(t => t.includes('預設 profile 唔見咗'))).toBe(true);
    });
});

describe('v3.17.0 1.1 — ProfileBankPanel 設為預設 button', () => {
    beforeEach(() => {
        mockStorage.clear();
        mockBankState.profiles = [sampleProfile, anotherProfile];
        mockBankState.vaultExists = true;
        mockBankState.isLocked = false;
        mockBankState.hasProfiles = true;
    });

    afterEach(() => {
        cleanup();
        mockStorage.clear();
    });

    it('shows 設為預設 button on each non-default profile', () => {
        const setDefaultId = vi.fn();
        const clearDefault = vi.fn();
        render(
            <ProfileBankPanel
                theme="plain"
                bank={{
                    vaultExists: true,
                    isLocked: false,
                    profiles: [sampleProfile, anotherProfile],
                    hasProfiles: true,
                    MAX_PROFILES: 50,
                    lastError: null,
                    setup: vi.fn(),
                    unlock: vi.fn(),
                    lock: vi.fn(),
                    addProfile: vi.fn(),
                    updateProfile: vi.fn(),
                    deleteProfile: vi.fn(),
                    exportEncrypted: vi.fn(),
                    importEncrypted: vi.fn(),
                }}
                formData={{}}
                onApplyProfile={vi.fn()}
                onClose={vi.fn()}
                defaultProfileId={null}
                setDefaultProfileId={setDefaultId}
                clearDefaultProfile={clearDefault}
                autoApplyEnabled={true}
                setAutoApplyEnabled={vi.fn()}
            />
        );

        const starButtons = screen.getAllByTitle(/設為預設 profile/);
        expect(starButtons.length).toBe(2);  // both profiles should have the button
    });

    it('clicking 設為預設 calls setDefaultProfileId with profile id', () => {
        const setDefaultId = vi.fn();
        const clearDefault = vi.fn();
        render(
            <ProfileBankPanel
                theme="plain"
                bank={{
                    vaultExists: true,
                    isLocked: false,
                    profiles: [sampleProfile, anotherProfile],
                    hasProfiles: true,
                    MAX_PROFILES: 50,
                    lastError: null,
                    setup: vi.fn(),
                    unlock: vi.fn(),
                    lock: vi.fn(),
                    addProfile: vi.fn(),
                    updateProfile: vi.fn(),
                    deleteProfile: vi.fn(),
                    exportEncrypted: vi.fn(),
                    importEncrypted: vi.fn(),
                }}
                formData={{}}
                onApplyProfile={vi.fn()}
                onClose={vi.fn()}
                defaultProfileId={null}
                setDefaultProfileId={setDefaultId}
                clearDefaultProfile={clearDefault}
                autoApplyEnabled={true}
                setAutoApplyEnabled={vi.fn()}
            />
        );

        const starButtons = screen.getAllByTitle(/設為預設 profile/);
        fireEvent.click(starButtons[0]);
        expect(setDefaultId).toHaveBeenCalledWith('profile_abc123');
    });

    it('shows 預設中 badge on the current default profile', () => {
        render(
            <ProfileBankPanel
                theme="plain"
                bank={{
                    vaultExists: true,
                    isLocked: false,
                    profiles: [sampleProfile, anotherProfile],
                    hasProfiles: true,
                    MAX_PROFILES: 50,
                    lastError: null,
                    setup: vi.fn(),
                    unlock: vi.fn(),
                    lock: vi.fn(),
                    addProfile: vi.fn(),
                    updateProfile: vi.fn(),
                    deleteProfile: vi.fn(),
                    exportEncrypted: vi.fn(),
                    importEncrypted: vi.fn(),
                }}
                formData={{}}
                onApplyProfile={vi.fn()}
                onClose={vi.fn()}
                defaultProfileId="profile_abc123"
                setDefaultProfileId={vi.fn()}
                clearDefaultProfile={vi.fn()}
                autoApplyEnabled={true}
                setAutoApplyEnabled={vi.fn()}
            />
        );

        expect(screen.getByText('預設中')).toBeTruthy();
    });

    it('clicking 已預設 profile button calls clearDefaultProfile', () => {
        const clearDefault = vi.fn();
        render(
            <ProfileBankPanel
                theme="plain"
                bank={{
                    vaultExists: true,
                    isLocked: false,
                    profiles: [sampleProfile, anotherProfile],
                    hasProfiles: true,
                    MAX_PROFILES: 50,
                    lastError: null,
                    setup: vi.fn(),
                    unlock: vi.fn(),
                    lock: vi.fn(),
                    addProfile: vi.fn(),
                    updateProfile: vi.fn(),
                    deleteProfile: vi.fn(),
                    exportEncrypted: vi.fn(),
                    importEncrypted: vi.fn(),
                }}
                formData={{}}
                onApplyProfile={vi.fn()}
                onClose={vi.fn()}
                defaultProfileId="profile_abc123"
                setDefaultProfileId={vi.fn()}
                clearDefaultProfile={clearDefault}
                autoApplyEnabled={true}
                setAutoApplyEnabled={vi.fn()}
            />
        );

        // Find the button on the default profile (its title is "取消呢個 profile 作為預設")
        const unsetButton = screen.getByTitle(/取消呢個 profile 作為預設/);
        fireEvent.click(unsetButton);
        expect(clearDefault).toHaveBeenCalled();
    });

    it('opt-out toggle: clicking checkbox calls setAutoApplyEnabled', () => {
        const setAutoApply = vi.fn();
        render(
            <ProfileBankPanel
                theme="plain"
                bank={{
                    vaultExists: true,
                    isLocked: false,
                    profiles: [sampleProfile],
                    hasProfiles: true,
                    MAX_PROFILES: 50,
                    lastError: null,
                    setup: vi.fn(),
                    unlock: vi.fn(),
                    lock: vi.fn(),
                    addProfile: vi.fn(),
                    updateProfile: vi.fn(),
                    deleteProfile: vi.fn(),
                    exportEncrypted: vi.fn(),
                    importEncrypted: vi.fn(),
                }}
                formData={{}}
                onApplyProfile={vi.fn()}
                onClose={vi.fn()}
                defaultProfileId={null}
                setDefaultProfileId={vi.fn()}
                clearDefaultProfile={vi.fn()}
                autoApplyEnabled={true}
                setAutoApplyEnabled={setAutoApply}
            />
        );

        const checkbox = screen.getByRole('checkbox');
        fireEvent.click(checkbox);
        expect(setAutoApply).toHaveBeenCalledWith(false);
    });
});
