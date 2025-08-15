# Fix Terminal Underline Formatting

**Triggers**: "fix underline", "fix screen"

When terminal formatting gets stuck with underlines or other formatting artifacts, reset the terminal formatting state.

## Command
```bash
tput sgr0
```

## What it does
- `tput sgr0` resets all terminal text formatting attributes to normal
- Clears any stuck underlines, bold, colors, or other formatting
- Returns terminal to default appearance

## When to use
- Terminal text appears stuck with underlines
- Text formatting persists when it shouldn't
- Terminal output looks corrupted with formatting codes
- After interrupted commands that change text appearance

## Alternative commands
```bash
# Alternative reset methods
reset
# or
printf '\033[0m'
# or
echo -e '\033[0m'
```