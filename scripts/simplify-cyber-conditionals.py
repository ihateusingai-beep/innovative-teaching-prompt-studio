#!/usr/bin/env python3
"""
v3.4.0 Path A — Auto-simplify App.jsx theme === 'cyber' conditionals.

Strategy:
  - Cyber 已經 alias 退役，body class 永遠唔會係 'theme-cyber'
    (CSS 入面 cyber rules 都 alias 去 plain rules)
  - 所以 `theme === 'cyber' ? A : B` 等同 `B` (因為 cyber 永遠 false)
  - 但要 preserve semantic：如果 B 係 warm branch，`A : B` 變 `theme === 'warm' ? B : <deeper default>`

Simple case: `theme === 'cyber' ? A : B`
  → If `A` 同 `B` 內容一樣：直接 collapse 為 `B`
  → Else: 保留 ternary 但換做 plain check:
       `theme === 'cyber' ? A : B` → `theme === 'plain' ? B : A`
       (cyber alias 退役，但 plain check 永遠 true，所以 plain branch B 是 default)

Nested case: `theme === 'cyber' ? A : (theme === 'warm' ? B : C)`
  → Skip，留 manual review (script reports 但唔改)

Apply: regex-based line substitution, count replacements, log changes.
"""

import re
import sys
from pathlib import Path

INPUT = Path('/Users/kencheng/workspace/vs code/Innovative Teaching Prompt Studio/src/App.jsx')
BACKUP = Path('/Users/kencheng/workspace/vs code/Innovative Teaching Prompt Studio/src/App.jsx.v3.3.3.bak')

content = INPUT.read_text(encoding='utf-8')
original = content
changes = []
skipped = []

# Pattern 1: simple ternary — `theme === 'cyber' ? A : B`
# Match `theme === 'cyber' ? <value> : <value>` where values can be strings or nested balanced parens
# Use bracket-aware matching for parens balance

def find_ternary_end(s, start_idx):
    """Given index pointing to '?', find matching ':' for ternary — careful with nested ternaries"""
    depth = 0
    i = start_idx + 1  # skip '?'
    in_string = None  # None or quote char
    while i < len(s):
        c = s[i]
        # Handle string literals (skip their content)
        if in_string:
            if c == '\\':
                i += 2
                continue
            if c == in_string:
                in_string = None
            i += 1
            continue
        # Outside string
        if c in ('"', "'", '`'):
            in_string = c
            i += 1
            continue
        if c == '(':
            depth += 1
        elif c == ')':
            depth -= 1
        elif c == '?' and depth == 0:
            # nested ternary start — skip
            nested_end = find_ternary_end(s, i)
            if nested_end is None:
                return None
            i = nested_end + 1
            continue
        elif c == ':' and depth == 0:
            return i
        i += 1
    return None


def find_a_value(s, start_idx, end_idx):
    """Find A value from start_idx to its boundary, handling parens + strings"""
    i = start_idx
    in_string = None
    depth = 0
    while i < end_idx:
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
            i += 1
            continue
        if c == '(':
            depth += 1
        elif c == ')':
            depth -= 1
        elif depth == 0 and c in (':', '?'):
            return i, s[start_idx:i].strip()
        i += 1
    return None, s[start_idx:end_idx].strip()


# Process line by line — simpler than full-file because App.jsx uses
# `theme === 'cyber' ? X : Y` mostly on single lines within template literals
lines = content.split('\n')
new_lines = []

for line_num, line in enumerate(lines, 1):
    new_line = line
    if "theme === 'cyber'" not in line:
        new_lines.append(line)
        continue

    # Find all `theme === 'cyber'` occurrences in this line
    pattern = re.compile(r"theme === 'cyber'")
    matches = list(pattern.finditer(line))
    if not matches:
        new_lines.append(line)
        continue

    # Check if nested ternary (multi-line or inline)
    # If line contains unmatched parens OR multiple `?` after the cyber check, skip
    if line.count('?') > 1 and '`theme' not in line and '<' not in line.split('theme === \'cyber\'')[1][:50]:
        skipped.append((line_num, line, 'nested ternary suspected'))
        new_lines.append(line)
        continue

    # Try each match
    for match in reversed(matches):  # reverse to keep earlier indices valid
        cyber_pos = match.start()
        q_pos = line.find('?', cyber_pos)
        if q_pos == -1:
            skipped.append((line_num, line, 'no ? after cyber'))
            continue

        # Find A value (between ? and :)
        a_end, a_value = find_a_value(line, q_pos + 1, len(line))
        if a_end is None:
            skipped.append((line_num, line, 'cannot find A end'))
            continue

        # Find B value (after :)
        b_start = a_end + 1
        # Skip whitespace
        while b_start < len(line) and line[b_start] in ' \t':
            b_start += 1

        # Find end of B (until end of line or unmatched brace)
        # For simplicity, take until end of line or next top-level operator
        # But App.jsx ternaries usually end at line end or close paren
        # Find matching close paren if any
        b_end = len(line)
        depth = 0
        in_string = None
        i = b_start
        while i < len(line):
            c = line[i]
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
                if depth == 0:
                    b_end = i
                    break
                depth -= 1
            elif depth == 0 and c == ',':
                b_end = i
                break
            i += 1
        b_value = line[b_start:b_end].strip()

        # Determine replacement
        # Simple case: A === B → collapse to B
        # Else: convert to `theme === 'plain' ? B : A` (cyber alias means
        # `theme === 'plain'` is always true so B is default; but this changes
        # the semantic — better: convert to `theme === 'warm' ? B : A` if
        # we want warm to override; but if A is cyber-style and B is plain,
        # we lose nothing because cyber alias never matches)
        #
        # SAFER: convert to `theme === 'plain' ? B : A` (flip the ternary)
        # — preserves both behaviors: when theme is 'plain' use B, else use A
        # — since cyber never matches, this gives B in practice

        if a_value == b_value:
            # Collapse to B
            replacement = b_value
            kind = 'collapse-equal'
        else:
            # Flip: theme === 'cyber' ? A : B  →  theme === 'plain' ? B : A
            # Since `theme === 'plain'` is always true (cyber alias = plain),
            # B is always used. But we keep the ternary for explicit semantic.
            # Even simpler: replace with just B (since cyber never matches)
            replacement = b_value
            kind = 'collapse-default-to-plain'

        # Apply replacement: replace from cyber_pos to b_end with replacement
        original_segment = line[cyber_pos:b_end]
        new_segment = replacement
        new_line = new_line[:cyber_pos] + new_segment + new_line[b_end:]
        changes.append((line_num, kind, original_segment, new_segment))

    new_lines.append(new_line)

# Apply changes
new_content = '\n'.join(new_lines)

# Write output
if new_content != original:
    INPUT.write_text(new_content, encoding='utf-8')

# Report
print(f'Total replacements: {len(changes)}')
print(f'Total skipped: {len(skipped)}')
print()
print('Sample replacements (first 10):')
for line_num, kind, orig, new in changes[:10]:
    print(f'  Line {line_num} [{kind}]:')
    print(f'    WAS: ...{orig[:80]}...')
    print(f'    NOW: ...{new[:80]}...')
    print()

print('Sample skipped (first 5):')
for line_num, line, reason in skipped[:5]:
    print(f'  Line {line_num} [{reason}]:')
    print(f'    {line[:120]}')
    print()

# Backup status
print(f'Backup at: {BACKUP}')
print(f'To revert: mv {BACKUP} {INPUT}')
