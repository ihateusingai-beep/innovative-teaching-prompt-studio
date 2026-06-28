#!/usr/bin/env python3
"""
v3.10.0 Path X — Outer ternary collapse with nested ternary support.

For each `theme === 'cyber' ? OUTER_A : OUTER_B`:
  - OUTER_A is itself a nested ternary: `cond ? A1 : A2` (or any expression)
  - OUTER_B is the plain branch (string or expression)
  - Retire cyber alias: collapse to just OUTER_A (since cyber branch unreachable)
  - Equivalently: delete `theme === 'cyber' ? OUTER_A : ` keep `OUTER_B`

Strategy: walk forward from `theme === 'cyber'`, find outer `?`, then find outer `:`
by tracking nested ternary depth + paren/bracket/brace depth + string literals.
Extract everything between outer `?` and outer `:` as A (delete it).
Everything after outer `:` is B (keep).
"""

import sys
from pathlib import Path

INPUT = Path('/Users/kencheng/workspace/vs code/Innovative Teaching Prompt Studio/src/App.jsx')
BACKUP = Path('/Users/kencheng/workspace/vs code/Innovative Teaching Prompt Studio/src/App.jsx.v3.9.0.bak')

content = INPUT.read_text(encoding='utf-8')
original = content

TARGET = "theme === 'cyber'"
TARGET_LEN = len(TARGET)  # 17


def skip_ws(s, i):
    while i < len(s) and s[i] in ' \t\n\r':
        i += 1
    return i


def find_matching_close(s, open_pos, open_char, close_char):
    """Find matching close_char for open_char at open_pos. Tracks strings + nested."""
    assert s[open_pos] == open_char
    depth = 1
    i = open_pos + 1
    in_string = None
    in_template_expr_depth = 0
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
            i += 1
            continue
        if in_template_expr_depth > 0:
            if c == '{':
                in_template_expr_depth += 1
            elif c == '}':
                in_template_expr_depth -= 1
            i += 1
            continue
        if c == '$' and i + 1 < len(s) and s[i + 1] == '{':
            in_template_expr_depth = 1
            i += 2
            continue
        if c == open_char:
            depth += 1
        elif c == close_char:
            depth -= 1
            if depth == 0:
                return i
        i += 1
    return -1


def find_outer_ternary(s, condition_end):
    """Find outer '?' and ':' that bracket the ternary using `theme === 'cyber'`.

    Returns (q_pos, colon_pos, end_after_b_value) or (None, None, None).

    Strategy: skip whitespace, expect '?'. Then track nested ternary depth
    (any `?` increases, matching `:` decreases). When we hit a `:` at depth 0,
    that's the outer colon. Then B starts — find B end by balance tracking.
    """
    i = skip_ws(s, condition_end)
    if i >= len(s) or s[i] != '?':
        return None, None, None
    q_pos = i

    # Walk forward tracking depth
    i = q_pos + 1
    ternary_depth = 1
    paren_depth = 0
    bracket_depth = 0
    brace_depth = 0
    in_string = None
    in_template_expr_depth = 0

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
            i += 1
            continue
        if in_template_expr_depth > 0:
            if c == '{':
                in_template_expr_depth += 1
            elif c == '}':
                in_template_expr_depth -= 1
            i += 1
            continue
        if c == '$' and i + 1 < len(s) and s[i + 1] == '{':
            in_template_expr_depth = 1
            i += 2
            continue
        if c == '(':
            paren_depth += 1
        elif c == ')':
            if paren_depth == 0:
                # End of enclosing parens — stop
                break
            paren_depth -= 1
        elif c == '[':
            bracket_depth += 1
        elif c == ']':
            if bracket_depth == 0:
                break
            bracket_depth -= 1
        elif c == '{':
            brace_depth += 1
        elif c == '}':
            if brace_depth == 0:
                break
            brace_depth -= 1
        elif c == '?':
            ternary_depth += 1
        elif c == ':':
            ternary_depth -= 1
            if ternary_depth == 0:
                # Outer colon found
                colon_pos = i
                # Now find end of B value
                b_start = colon_pos + 1
                b_start = skip_ws(s, b_start)
                # Walk B to find its end — need to handle:
                # - string literal
                # - parenthesized expression
                # - JSX element <...>
                # - simple value
                b_end = b_start
                if b_end >= len(s):
                    return q_pos, colon_pos, len(s)
                if s[b_end] == "'" or s[b_end] == '"' or s[b_end] == '`':
                    quote = s[b_end]
                    j = b_end + 1
                    while j < len(s):
                        if s[j] == '\\':
                            j += 2
                            continue
                        if s[j] == quote:
                            b_end = j + 1
                            break
                        j += 1
                elif s[b_end] == '(':
                    close = find_matching_close(s, b_end, '(', ')')
                    if close == -1:
                        return q_pos, colon_pos, None
                    b_end = close + 1
                elif s[b_end] == '<':
                    # JSX element — find matching </...> or self-close />
                    j = b_end + 1
                    depth = 1
                    while j < len(s):
                        if s[j] == '<' and s[j:j+2] != '<=':
                            # check if closing tag
                            rest = s[j:]
                            if rest.startswith('</'):
                                depth -= 1
                                if depth == 0:
                                    # find '>'
                                    gt = s.find('>', j)
                                    b_end = gt + 1
                                    break
                            elif not rest.startswith('/>'):
                                depth += 1
                        j += 1
                else:
                    # bare expression — read until comma/}/)/]/, or end
                    j = b_end
                    depth_b = 0
                    while j < len(s):
                        ch = s[j]
                        if ch in '([{':
                            depth_b += 1
                        elif ch in ')]}':
                            if depth_b == 0:
                                break
                            depth_b -= 1
                        elif ch == ',' and depth_b == 0:
                            break
                        j += 1
                    b_end = j
                return q_pos, colon_pos, b_end
        i += 1
    return None, None, None


# Iterate
new_content = []
i = 0
replacements = []
skipped = []
while i < len(content):
    idx = content.find(TARGET, i)
    if idx == -1:
        new_content.append(content[i:])
        break
    new_content.append(content[i:idx])
    condition_end = idx + TARGET_LEN
    q_pos, colon_pos, b_end = find_outer_ternary(content, condition_end)
    if q_pos is None or b_end is None:
        skipped.append(idx)
        new_content.append(content[idx:idx + TARGET_LEN])
        i = idx + TARGET_LEN
        continue
    # Replace content[idx:b_end] with just B value
    # But we want to keep B value
    b_value = content[colon_pos + 1:b_end]
    # Strip leading whitespace
    new_content.append(b_value.lstrip())
    replacements.append({
        'line': content[:idx].count('\n') + 1,
        'original': content[idx:b_end].replace('\n', '\\n'),
        'replacement': b_value.lstrip().replace('\n', '\\n'),
    })
    i = b_end

final = ''.join(new_content)
print(f'Replacements: {len(replacements)}')
print(f'Skipped: {len(skipped)}')
print()
for r in replacements[:8]:
    print(f"Line {r['line']}:")
    print(f"  WAS: {r['original'][:120]}")
    print(f"  NOW: {r['replacement'][:120]}")
    print()

if skipped:
    print(f'Skipped lines: {[content[:s].count(chr(10)) + 1 for s in skipped[:10]]}')

if replacements:
    INPUT.write_text(final, encoding='utf-8')
    BACKUP.write_text(original, encoding='utf-8')
    print(f'\nWritten. Backup at {BACKUP}')
    print(f'Before: {original.count(TARGET)} cyber conditionals')
    print(f'After:  {final.count(TARGET)} cyber conditionals')
else:
    print('\nNo replacements applied.')