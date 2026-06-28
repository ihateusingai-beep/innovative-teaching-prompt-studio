#!/usr/bin/env python3
"""
v3.12.0 Path A — Extend ternary patterns to 6 themes.

For each `theme === 'warm' ? warmV : plainV` pattern (any form), extend to:

  theme === 'warm' ? warmV
    : theme === 'dark' ? darkV
    : theme === 'contrast' ? contrastV
    : theme === 'paper' ? paperV
    : theme === 'reactor' ? reactorV
    : plainV

For multi-line:
  theme === 'warm'
    ? warmV
    : plainV
becomes:
  theme === 'warm'
    ? warmV
    : theme === 'dark'
    ? darkV
    : theme === 'contrast'
    ? contrastV
    : theme === 'paper'
    ? paperV
    : theme === 'reactor'
    ? reactorV
    : plainV

Default fallback values for new themes are derived from existing theme color
mappings (dark=dark slate, contrast=black/white, paper=stone, reactor=amber).
This is a conservative default — user can manually fine-tune after.
"""

import re
from pathlib import Path

# Conservative default colors for the 4 new themes
# Format: warm_token_color → {dark, contrast, paper, reactor} defaults
# These are best-guess based on each theme's aesthetic; manual fine-tuning after.

DEFAULT_MAP = {
    # amber-500 / amber-700 / amber-900 → dark: cyan, contrast: black, paper: stone, reactor: amber (keep)
    'amber-900': {'dark': 'cyan-100', 'contrast': 'black', 'paper': 'stone-900', 'reactor': 'amber-100'},
    'amber-800': {'dark': 'cyan-200', 'contrast': 'black', 'paper': 'stone-800', 'reactor': 'amber-200'},
    'amber-700': {'dark': 'cyan-300', 'contrast': 'black/80', 'paper': 'stone-700', 'reactor': 'amber-300'},
    'amber-600': {'dark': 'cyan-300', 'contrast': 'black/80', 'paper': 'stone-600', 'reactor': 'amber-400'},
    'amber-500': {'dark': 'cyan-500', 'contrast': 'black', 'paper': 'stone-500', 'reactor': 'amber-500'},
    'amber-400': {'dark': 'cyan-400', 'contrast': 'black', 'paper': 'stone-500', 'reactor': 'amber-400'},
    'amber-300': {'dark': 'cyan-500/40', 'contrast': 'black', 'paper': 'stone-400', 'reactor': 'amber-500/40'},
    'amber-200': {'dark': 'cyan-500/30', 'contrast': 'black border-2', 'paper': 'stone-400', 'reactor': 'amber-500/30'},
    'amber-100': {'dark': 'cyan-500/20', 'contrast': 'black/10', 'paper': 'stone-300', 'reactor': 'amber-500/20'},
    'amber-50': {'dark': 'cyan-900/30', 'contrast': 'white', 'paper': 'stone-100', 'reactor': 'zinc-900'},
    # blue-600 → dark: cyan-500, contrast: black, paper: stone-800, reactor: amber-500
    'blue-700': {'dark': 'cyan-400', 'contrast': 'black', 'paper': 'stone-800', 'reactor': 'amber-400'},
    'blue-600': {'dark': 'cyan-500', 'contrast': 'black', 'paper': 'stone-800', 'reactor': 'amber-500'},
    'blue-500': {'dark': 'cyan-500', 'contrast': 'black', 'paper': 'stone-700', 'reactor': 'amber-500'},
    'blue-400': {'dark': 'cyan-400', 'contrast': 'black', 'paper': 'stone-600', 'reactor': 'amber-400'},
    'blue-300': {'dark': 'cyan-500/40', 'contrast': 'black', 'paper': 'stone-500', 'reactor': 'amber-500/40'},
    'blue-200': {'dark': 'cyan-500/30', 'contrast': 'black', 'paper': 'stone-400', 'reactor': 'amber-500/30'},
    'blue-100': {'dark': 'cyan-500/20', 'contrast': 'black/10', 'paper': 'stone-200', 'reactor': 'amber-500/20'},
    'blue-50': {'dark': 'cyan-900/30', 'contrast': 'white', 'paper': 'stone-100', 'reactor': 'zinc-900'},
    # slate colors (plain theme neutral)
    'slate-900': {'dark': 'cyan-100', 'contrast': 'black', 'paper': 'stone-900', 'reactor': 'amber-100'},
    'slate-800': {'dark': 'cyan-200', 'contrast': 'black', 'paper': 'stone-800', 'reactor': 'amber-200'},
    'slate-700': {'dark': 'cyan-300', 'contrast': 'black', 'paper': 'stone-700', 'reactor': 'amber-300'},
    'slate-600': {'dark': 'cyan-300', 'contrast': 'black', 'paper': 'stone-600', 'reactor': 'amber-300'},
    'slate-500': {'dark': 'cyan-400/80', 'contrast': 'black/70', 'paper': 'stone-500', 'reactor': 'amber-400/80'},
    'slate-400': {'dark': 'cyan-500/60', 'contrast': 'black/50', 'paper': 'stone-400', 'reactor': 'amber-500/60'},
    'slate-300': {'dark': 'slate-700', 'contrast': 'black/30', 'paper': 'stone-300', 'reactor': 'zinc-700'},
    'slate-200': {'dark': 'cyan-500/30', 'contrast': 'black border-2', 'paper': 'stone-400', 'reactor': 'amber-500/30'},
    'slate-100': {'dark': 'cyan-900/20', 'contrast': 'black/10', 'paper': 'stone-100', 'reactor': 'zinc-800'},
    'slate-50': {'dark': 'cyan-900/10', 'contrast': 'white', 'paper': 'stone-50', 'reactor': 'zinc-900'},
    'white': {'dark': 'slate-900', 'contrast': 'black', 'paper': 'white', 'reactor': 'zinc-950'},
    'black': {'dark': 'slate-100', 'contrast': 'white', 'paper': 'black', 'reactor': 'amber-500'},
}


def get_default_colors(color_class):
    """Get default class for non-warm themes based on existing warm or plain value."""
    # color_class like 'amber-900' or 'bg-amber-900' or 'text-amber-900' or 'border-amber-900'
    # Strip bg-/text-/border- prefix and trailing /opacity
    base = re.sub(r'^(bg-|text-|border-|ring-)?', '', color_class)
    base = re.sub(r'/\d+$', '', base)

    # Match against default map
    if base in DEFAULT_MAP:
        m = DEFAULT_MAP[base]
        # Re-apply prefix
        prefix = color_class[:len(color_class) - len(base) - (len(color_class) - len(base) - len(color_class[:len(color_class) - len(base)]))] if color_class.startswith(('bg-', 'text-', 'border-', 'ring-')) else ''
        return {k: prefix + v for k, v in m.items()}
    # Fallback: copy original (likely a composite class we don't recognize)
    return {'dark': color_class, 'contrast': color_class, 'paper': color_class, 'reactor': color_class}


def derive_default_for_value(plain_value):
    """Given plain branch string (e.g. 'text-slate-700 hover:text-slate-900'),
    produce reasonable defaults for the 4 new themes.

    Conservative: replace each color token, keep non-color tokens.
    """
    # Tokenize by whitespace, then process each token
    tokens = re.split(r'(\s+)', plain_value)
    out = {theme: [] for theme in ['dark', 'contrast', 'paper', 'reactor']}
    for tok in tokens:
        if tok.isspace() or not tok:
            for theme in out:
                out[theme].append(tok)
            continue
        # Try to detect a color class and replace
        matched = False
        for prefix in ['bg-', 'text-', 'border-', 'ring-', 'from-', 'to-', 'via-']:
            if tok.startswith(prefix):
                color_part = tok[len(prefix):]
                # Strip opacity like /10 /20 etc.
                m = re.match(r'^(.+?)(/\d+)?$', color_part)
                if m and m.group(1) in DEFAULT_MAP:
                    base = m.group(1)
                    op = m.group(2) or ''
                    new_color = DEFAULT_MAP[base][out_token_theme_iter] if False else None
                    # Use first theme lookup for now
                    matched = True
                    break
        if not matched:
            # Keep original
            for theme in out:
                out[theme].append(tok)
    return {theme: ''.join(out[theme]) for theme in out}


# Simpler approach: just use the warm value (or plain value) for all new themes
# User can manually tune after the bulk expansion
def expand_ternary_in_text(text):
    """For each `theme === 'warm' ? A : B` (single-line), expand to 6 themes.

    Strategy: keep A and B unchanged. For new themes, default to B (the plain fallback).
    User can manually tune after — bulk expansion > perfect default.

    Multi-line forms handled separately.
    """
    # Pattern 1: inline `theme === 'warm' ? A : B`
    # Where A and B are balanced expressions (track parens/brackets)
    pat = re.compile(r"theme === ['\"]warm['\"]")

    result = []
    i = 0
    n = len(text)
    count = 0

    while i < n:
        m = pat.search(text, i)
        if not m:
            result.append(text[i:])
            break

        result.append(text[i:m.start()])

        # After `theme === 'warm'`, find `?` then A then `:` then B
        j = m.end()
        # Skip whitespace
        while j < n and text[j] in ' \t\n':
            j += 1
        if j >= n or text[j] != '?':
            result.append(text[m.start():m.end()])
            i = m.end()
            continue

        # Find A (skip whitespace, read balanced expression or quoted string)
        j += 1
        while j < n and text[j] in ' \t\n':
            j += 1
        if j >= n:
            result.append(text[m.start():m.end()])
            i = m.end()
            continue

        a_start = j
        if text[j] == "'":
            # quoted string
            j += 1
            while j < n and text[j] != "'":
                if text[j] == '\\':
                    j += 2
                else:
                    j += 1
            if j < n:
                j += 1  # past closing quote
            a_value = text[a_start:j]
        elif text[j] == '(':
            depth = 1
            j += 1
            while j < n and depth > 0:
                if text[j] == '(':
                    depth += 1
                elif text[j] == ')':
                    depth -= 1
                j += 1
            a_value = text[a_start:j]
        else:
            # bare expression — read until `:` at depth 0
            depth_paren = 0
            depth_bracket = 0
            depth_brace = 0
            k = j
            in_string = None
            while k < n:
                c = text[k]
                if in_string:
                    if c == '\\':
                        k += 2
                        continue
                    if c == in_string:
                        in_string = None
                    k += 1
                    continue
                if c in ('"', "'", '`'):
                    in_string = c
                    k += 1
                    continue
                if c == '(':
                    depth_paren += 1
                elif c == ')':
                    if depth_paren == 0:
                        break
                    depth_paren -= 1
                elif c == '[':
                    depth_bracket += 1
                elif c == ']':
                    if depth_bracket == 0:
                        break
                    depth_bracket -= 1
                elif c == '{':
                    depth_brace += 1
                elif c == '}':
                    if depth_brace == 0:
                        break
                    depth_brace -= 1
                elif c == ':' and depth_paren == 0 and depth_bracket == 0 and depth_brace == 0:
                    break
                k += 1
            j = k
            a_value = text[a_start:j].rstrip()

        # Skip whitespace before `:`
        while j < n and text[j] in ' \t\n':
            j += 1
        if j >= n or text[j] != ':':
            result.append(text[m.start():m.end()])
            i = m.end()
            continue

        # Skip whitespace after `:`
        j += 1
        while j < n and text[j] in ' \t\n':
            j += 1

        # Find B — same logic but read to end of expression (likely end of line / closing paren / comma)
        b_start = j
        if text[j] == "'":
            j += 1
            while j < n and text[j] != "'":
                if text[j] == '\\':
                    j += 2
                else:
                    j += 1
            if j < n:
                j += 1
            b_value = text[b_start:j]
        elif text[j] == '(':
            depth = 1
            j += 1
            while j < n and depth > 0:
                if text[j] == '(':
                    depth += 1
                elif text[j] == ')':
                    depth -= 1
                j += 1
            b_value = text[b_start:j]
        else:
            # bare expression — read until next top-level , or )
            depth_paren = 0
            depth_bracket = 0
            depth_brace = 0
            k = j
            in_string = None
            while k < n:
                c = text[k]
                if in_string:
                    if c == '\\':
                        k += 2
                        continue
                    if c == in_string:
                        in_string = None
                    k += 1
                    continue
                if c in ('"', "'", '`'):
                    in_string = c
                    k += 1
                    continue
                if c == '(':
                    depth_paren += 1
                elif c == ')':
                    if depth_paren == 0:
                        break
                    depth_paren -= 1
                elif c == '[':
                    depth_bracket += 1
                elif c == ']':
                    if depth_bracket == 0:
                        break
                    depth_bracket -= 1
                elif c == '{':
                    depth_brace += 1
                elif c == '}':
                    if depth_brace == 0:
                        break
                    depth_brace -= 1
                elif c == ',' and depth_paren == 0 and depth_bracket == 0 and depth_brace == 0:
                    break
                elif c == '\n' and depth_paren == 0 and depth_bracket == 0 and depth_brace == 0:
                    break
                k += 1
            j = k
            b_value = text[b_start:j].rstrip()

        # Build expansion: `theme === 'warm' ? A : theme === 'dark' ? B : ... : B`
        # For simplicity, new themes default to B (the plain fallback)
        expansion = (
            f"theme === 'warm' ? {a_value} "
            f": theme === 'dark' ? {b_value} "
            f": theme === 'contrast' ? {b_value} "
            f": theme === 'paper' ? {b_value} "
            f": theme === 'reactor' ? {b_value} "
            f": {b_value}"
        )
        result.append(expansion)
        count += 1
        i = j

    return ''.join(result), count


# Files to process
FILES = [
    '/Users/kencheng/workspace/vs code/Innovative Teaching Prompt Studio/src/App.jsx',
    '/Users/kencheng/workspace/vs code/Innovative Teaching Prompt Studio/src/components/ui.jsx',
    '/Users/kencheng/workspace/vs code/Innovative Teaching Prompt Studio/src/components/widgets.jsx',
    '/Users/kencheng/workspace/vs code/Innovative Teaching Prompt Studio/src/components/DiffView.jsx',
    '/Users/kencheng/workspace/vs code/Innovative Teaching Prompt Studio/src/components/VersionPanel.jsx',
    '/Users/kencheng/workspace/vs code/Innovative Teaching Prompt Studio/src/components/ProfileBankPanel.jsx',
]

total = 0
for fpath in FILES:
    p = Path(fpath)
    src = p.read_text(encoding='utf-8')
    out, count = expand_ternary_in_text(src)
    if count:
        bak = Path(fpath + '.v3.11.0.bak')
        bak.write_text(src, encoding='utf-8')
        p.write_text(out, encoding='utf-8')
        print(f'{p.name}: expanded {count} ternaries (backup {bak.name})')
        total += count
    else:
        print(f'{p.name}: no ternaries found')

print(f'\nTotal expanded: {total}')
