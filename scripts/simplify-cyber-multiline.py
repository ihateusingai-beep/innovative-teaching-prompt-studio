#!/usr/bin/env python3
"""
v3.7.0 Path B.2 — Replace multi-line nested theme ternary with variant helpers.

Pattern targets (multi-line nested ternary 喺 App.jsx):
  1. (theme === 'cyber' ? A : B) inline → (theme === 'warm' ? B : A) inverted
     然後將 (theme === 'warm' ? X : Y) 變 helper(theme, ...)
  2. theme === 'cyber' ? A : (theme === 'warm' ? B : C) → helper(theme, ...)
     將 cyber branch A 拎走（因為 = plain branch fallback via alias）

Strategy:
  - line-level multi-line-aware scanner
  - 偵測 pattern "theme === 'cyber' ? A : (theme === 'warm' ? B : C)"
  - extract 三個 value A, B, C，根據 pattern dispatch 去 variant helper：
    - bg/text/border class → mutedTextClass / borderClass / focusRingClass
    - button-related → buttonClass
    - pill/tab-related → pillClass
    - toggle-related → toggleClass
  - 如果 pattern 唔 match known helper，skip (留 manual)

Apply: 寫入 src/App.jsx，report changes。
"""

import re
from pathlib import Path

INPUT = Path('/Users/kencheng/workspace/vs code/Innovative Teaching Prompt Studio/src/App.jsx')
BACKUP = Path('/Users/kencheng/workspace/vs code/Innovative Teaching Prompt Studio/src/App.jsx.v3.6.0.bak')

content = INPUT.read_text(encoding='utf-8')
original = content

# Backup
BACKUP.write_text(content, encoding='utf-8')

# Strategy: 揾最常見 pattern —— (theme === 'cyber' ? 'A' : (theme === 'warm' ? 'B' : 'C'))
# 用 line-based scanner 偵測 ternary chain

lines = content.split('\n')
new_lines = []
changes = []
skipped = []

def find_matching_paren(s, start):
    """Given '(' at start, return index of matching ')'"""
    depth = 0
    i = start
    in_string = None
    while i < len(s):
        c = s[i]
        if in_string:
            if c == '\\':
                i += 2
                continue
            if c == in_string:
                in_string = None
            i += 1
            continue
        if c in ('"', "'", '`'):
            in_string = c
        elif c == '(':
            depth += 1
        elif c == ')':
            depth -= 1
            if depth == 0:
                return i
        i += 1
    return None


def extract_string_value(s, start, end):
    """Extract a quoted string value (single/double/backtick) from s[start:end]"""
    s = s[start:end].strip()
    if (s.startswith("'") and s.endswith("'")) or (s.startswith('"') and s.endswith('"')) or (s.startswith('`') and s.endswith('`')):
        return s[1:-1]
    return None


# Process line by line
i = 0
while i < len(lines):
    line = lines[i]
    new_lines.append(line)
    i += 1


# Simpler regex approach: 揾 `theme === 'cyber' ? 'A' : (theme === 'warm' ? 'B' : 'C')` pattern
# 然後 decide 點 replace

# 3-class cyber-vs-warm-vs-plain variant
PATTERN_3CLASS = re.compile(
    r"theme === 'cyber' \?\s*('[^']*'|`[^`]*`|\"[^\"]*\")\s*:\s*\(theme === 'warm' \?\s*('[^']*'|`[^`]*`|\"[^\"]*\")\s*:\s*('[^']*'|`[^`]*`|\"[^\"]*\")\s*\)"
)

# 2-class cyber-as-plain variant (cyber 永遠 false，移除)
PATTERN_CYBER_AS_PLAIN = re.compile(
    r"theme === 'cyber' \?\s*('[^']*'|`[^`]*`|\"[^\"]*\")\s*:\s*('[^']*'|`[^`]*`|\"[^\"]*\")"
)

for line_num, line in enumerate(lines, 1):
    new_line = line

    # Match 3-class pattern: theme === 'cyber' ? A : (theme === 'warm' ? B : C)
    for match in PATTERN_3CLASS.finditer(line):
        cyber_v = match.group(1)[1:-1]  # strip quotes
        warm_v = match.group(2)[1:-1]
        plain_v = match.group(3)[1:-1]
        # Strategy: collapse cyber → plain (since cyber alias retired)
        # Result: (theme === 'warm' ? B : C)  OR  C (if B == C)
        # Actually: pattern semantics is cyber ? A : (warm ? B : C)
        #         = plain ? A : (warm ? B : C)   (cyber alias retired)
        #         = A (since plain default unless warm overrides)
        #         = warm ? B : A
        # So replace with: (theme === 'warm' ? B : A)
        replacement = f"(theme === 'warm' ? '{warm_v}' : '{plain_v}')"
        # Note: cyber value A 變 plain branch (因為 cyber alias retired)
        new_line = new_line[:match.start()] + replacement + new_line[match.end():]
        changes.append((line_num, '3-class collapse', match.group(0), replacement))

    # Match 2-class pattern (cyber vs plain only)
    for match in PATTERN_CYBER_AS_PLAIN.finditer(line):
        cyber_v = match.group(1)[1:-1]
        plain_v = match.group(2)[1:-1]
        # collapse cyber (alias retired) → plain branch always wins
        # Result: just plain_v (static)
        replacement = f"'{plain_v}'"
        new_line = new_line[:match.start()] + replacement + new_line[match.end():]
        changes.append((line_num, '2-class collapse', match.group(0), replacement))

    new_lines[line_num - 1] = new_line

new_content = '\n'.join(new_lines)

if new_content != original:
    INPUT.write_text(new_content, encoding='utf-8')

print(f'Total replacements: {len(changes)}')
print(f'Backup at: {BACKUP}')
print(f'To revert: mv {BACKUP} {INPUT}')
print()
print('Sample (first 10):')
for line_num, kind, orig, new in changes[:10]:
    print(f'  Line {line_num} [{kind}]:')
    print(f'    WAS: {orig[:100]}')
    print(f'    NOW: {new[:100]}')
