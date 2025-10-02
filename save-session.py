#!/usr/bin/env python3
"""
VoiceCoach V2 - Automated Session Save & Project Index Generator

Usage:
    python save-session.py

The script will:
1. Automatically find the most recent Claude session JSONL file
2. Parse and convert it to readable markdown
3. Save to Context/{date}/session-{timestamp}.md
4. Scan the entire project structure
5. Generate/update PROJECT_INDEX.md with current file listings

No manual copy/paste needed - all processing done automatically!
No Claude tokens used - all processing done locally.
"""

import os
import sys
import json
from datetime import datetime
from pathlib import Path
import re


def find_latest_session_file(project_root):
    """Find the most recent Claude session JSONL file for this project."""
    # Construct the Claude projects path
    home = Path.home()
    claude_projects_path = home / '.claude' / 'projects'

    # Just use the last part of the path name for matching
    project_name = project_root.name  # e.g., "VoiceCoach-v2"

    # Find the project folder - look for folders containing the project name
    project_folders = list(claude_projects_path.glob(f'*{project_name}*'))

    if not project_folders:
        print(f"Warning: Could not find Claude session folder for project")
        print(f"Looked for: {project_name}")
        print(f"In: {claude_projects_path}")
        return None

    # Get the matching project folder (should be first match)
    project_folder = project_folders[0]

    # Find all JSONL files and get the most recent
    jsonl_files = list(project_folder.glob('*.jsonl'))

    if not jsonl_files:
        print(f"Warning: No session files found in {project_folder}")
        return None

    # Sort by modification time, most recent first
    latest_file = max(jsonl_files, key=lambda f: f.stat().st_mtime)

    return latest_file


def parse_jsonl_to_markdown(jsonl_path):
    """Parse JSONL file and convert to readable markdown."""

    if not jsonl_path or not jsonl_path.exists():
        return None

    markdown_lines = []
    markdown_lines.append(f"# Claude Session - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    markdown_lines.append(f"\n**Source:** `{jsonl_path.name}`")
    markdown_lines.append(f"**File Size:** {jsonl_path.stat().st_size:,} bytes")
    markdown_lines.append("\n---\n")

    try:
        with open(jsonl_path, 'r', encoding='utf-8', errors='ignore') as f:
            for line_num, line in enumerate(f, 1):
                line = line.strip()
                if not line:
                    continue

                try:
                    entry = json.loads(line)

                    # Extract entry type
                    entry_type = entry.get('type', 'unknown')

                    # Skip file history snapshots (noise)
                    if entry_type == 'file-history-snapshot':
                        continue

                    # Skip summary entries
                    if entry_type == 'summary':
                        continue

                    # Process user messages
                    if entry_type == 'user':
                        message = entry.get('message', {})
                        content = message.get('content', '')

                        # Handle string content
                        if isinstance(content, str):
                            markdown_lines.append(f"\n## User\n")
                            markdown_lines.append(format_content(content))

                        # Handle array content (tool results, etc.)
                        elif isinstance(content, list):
                            for item in content:
                                if isinstance(item, dict):
                                    item_type = item.get('type', '')

                                    if item_type == 'text':
                                        markdown_lines.append(f"\n## User\n")
                                        markdown_lines.append(format_content(item.get('text', '')))

                                    elif item_type == 'tool_result':
                                        # Tool results are usually just confirmation, skip in output
                                        pass

                    # Process assistant messages
                    elif entry_type == 'assistant':
                        message = entry.get('message', {})
                        content = message.get('content', [])

                        if isinstance(content, list):
                            for item in content:
                                if isinstance(item, dict):
                                    item_type = item.get('type', '')

                                    if item_type == 'text':
                                        text = item.get('text', '').strip()
                                        if text:
                                            markdown_lines.append(f"\n## Assistant\n")
                                            markdown_lines.append(format_content(text))

                                    elif item_type == 'tool_use':
                                        tool_name = item.get('name', 'unknown')
                                        tool_input = item.get('input', {})

                                        markdown_lines.append(f"\n### Tool: {tool_name}\n")

                                        # Format tool input nicely
                                        if tool_input:
                                            markdown_lines.append("```json")
                                            markdown_lines.append(json.dumps(tool_input, indent=2))
                                            markdown_lines.append("```\n")

                except json.JSONDecodeError:
                    # Skip malformed lines
                    continue
                except Exception as e:
                    # Skip lines that cause other errors
                    continue

    except Exception as e:
        print(f"Error reading JSONL file: {e}")
        return None

    return '\n'.join(markdown_lines)


def format_content(text):
    """Format text content for markdown output."""
    # Clean up excessive whitespace
    text = text.strip()

    # Preserve code blocks
    if '```' in text:
        return text + '\n'

    # Add paragraph breaks for readability
    return text + '\n'


def get_line_count(file_path):
    """Count lines in a file."""
    try:
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            return len(f.readlines())
    except Exception:
        return 0


def extract_description(file_path):
    """Extract description from file comments/docstrings."""
    try:
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read(500)  # First 500 chars

            # Look for JSDoc comments
            jsdoc = re.search(r'/\*\*\s*\n\s*\*\s*(.+?)\n', content)
            if jsdoc:
                return jsdoc.group(1).strip()

            # Look for single-line comments
            comment = re.search(r'//\s*(.+)', content)
            if comment:
                return comment.group(1).strip()

            return ""
    except Exception:
        return ""


def scan_directory(base_path, relative_to):
    """Recursively scan directory and return file information."""
    files_info = []

    try:
        for item in sorted(Path(base_path).rglob('*')):
            # Skip node_modules, dist, build, .git, etc.
            skip_dirs = {'node_modules', 'dist', 'build', '.git', 'chromadb_data',
                        'data', '.taskmaster', '.playwright-mcp', '.claude', 'oldApp'}

            if any(skip_dir in item.parts for skip_dir in skip_dirs):
                continue

            if item.is_file():
                # Only index relevant file types
                valid_extensions = {'.ts', '.tsx', '.js', '.jsx', '.cjs', '.json',
                                  '.md', '.html', '.css', '.py'}

                if item.suffix in valid_extensions:
                    rel_path = item.relative_to(relative_to)
                    line_count = get_line_count(item)
                    description = extract_description(item)

                    files_info.append({
                        'path': str(rel_path).replace('\\', '/'),
                        'name': item.name,
                        'lines': line_count,
                        'description': description,
                        'category': categorize_file(rel_path)
                    })
    except Exception as e:
        print(f"Warning: Error scanning directory: {e}")

    return files_info


def categorize_file(path):
    """Categorize file based on its location."""
    parts = Path(path).parts

    if 'src' not in parts:
        if path.name == 'main.cjs':
            return 'entry-points'
        elif path.name == 'preload.js':
            return 'entry-points'
        elif path.name == 'index.html':
            return 'entry-points'
        elif path.name.startswith('package'):
            return 'config'
        elif path.name.endswith('config.js') or path.name.endswith('config.ts'):
            return 'config'
        elif path.suffix == '.md':
            return 'docs'
        return 'root'

    if 'components' in parts:
        return 'components'
    elif 'services' in parts:
        return 'services'
    elif 'hooks' in parts:
        return 'hooks'
    elif 'types' in parts:
        return 'types'
    elif 'lib' in parts or 'utils' in parts:
        return 'utils'
    elif 'tests' in parts:
        return 'tests'
    else:
        return 'other'


def generate_project_index(files_info, project_root):
    """Generate PROJECT_INDEX.md content."""
    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

    # Group files by category
    categories = {}
    for file_info in files_info:
        cat = file_info['category']
        if cat not in categories:
            categories[cat] = []
        categories[cat].append(file_info)

    # Build index content
    content = f"""# VoiceCoach V2 - Project Index

**Last Updated:** {timestamp}
**Auto-generated** by `save-session.py`

---

## 📋 Quick Navigation

- [Entry Points](#entry-points) - Main application entry files
- [Components](#components) - React UI components
- [Services](#services) - Business logic and integrations
- [Hooks](#hooks) - Custom React hooks
- [Types](#types) - TypeScript type definitions
- [Utils](#utils) - Helper functions and utilities
- [Configuration](#configuration) - Config files
- [Documentation](#documentation) - Project docs

---

## Entry Points

"""

    # Entry points section
    if 'entry-points' in categories:
        for file in sorted(categories['entry-points'], key=lambda x: x['name']):
            desc = f" - {file['description']}" if file['description'] else ""
            content += f"- **{file['path']}** ({file['lines']} lines){desc}\n"

    # Components section
    content += "\n---\n\n## Components\n\n**Location:** `src/components/`\n\n"
    if 'components' in categories:
        # Group by subdirectory
        component_dirs = {}
        for file in categories['components']:
            parts = Path(file['path']).parts
            if len(parts) > 2:
                subdir = parts[2]  # src/components/{subdir}
            else:
                subdir = 'root'

            if subdir not in component_dirs:
                component_dirs[subdir] = []
            component_dirs[subdir].append(file)

        for subdir in sorted(component_dirs.keys()):
            if subdir != 'root':
                content += f"\n### {subdir}/\n"
            for file in sorted(component_dirs[subdir], key=lambda x: x['name']):
                desc = f" - {file['description']}" if file['description'] else ""
                content += f"- **{file['name']}** ({file['lines']} lines){desc}\n"
    else:
        content += "*No components found*\n"

    # Services section
    content += "\n---\n\n## Services\n\n**Location:** `src/services/`\n\n"
    if 'services' in categories:
        # Group by subdirectory
        service_dirs = {}
        for file in categories['services']:
            parts = Path(file['path']).parts
            if len(parts) > 2:
                subdir = parts[2]  # src/services/{subdir}
            else:
                subdir = 'root'

            if subdir not in service_dirs:
                service_dirs[subdir] = []
            service_dirs[subdir].append(file)

        for subdir in sorted(service_dirs.keys()):
            if subdir != 'root':
                content += f"\n### {subdir}/\n"
            for file in sorted(service_dirs[subdir], key=lambda x: x['name']):
                desc = f" - {file['description']}" if file['description'] else ""
                content += f"- **{file['name']}** ({file['lines']} lines){desc}\n"
    else:
        content += "*No services found*\n"

    # Hooks section
    content += "\n---\n\n## Hooks\n\n**Location:** `src/hooks/`\n\n"
    if 'hooks' in categories:
        for file in sorted(categories['hooks'], key=lambda x: x['name']):
            desc = f" - {file['description']}" if file['description'] else ""
            content += f"- **{file['name']}** ({file['lines']} lines){desc}\n"
    else:
        content += "*No custom hooks found*\n"

    # Types section
    content += "\n---\n\n## Types\n\n**Location:** `src/types/`\n\n"
    if 'types' in categories:
        for file in sorted(categories['types'], key=lambda x: x['name']):
            desc = f" - {file['description']}" if file['description'] else ""
            content += f"- **{file['name']}** ({file['lines']} lines){desc}\n"
    else:
        content += "*No type definition files found*\n"

    # Utils section
    content += "\n---\n\n## Utils\n\n**Location:** `src/lib/` and `src/utils/`\n\n"
    if 'utils' in categories:
        for file in sorted(categories['utils'], key=lambda x: x['name']):
            desc = f" - {file['description']}" if file['description'] else ""
            content += f"- **{file['name']}** ({file['lines']} lines){desc}\n"
    else:
        content += "*No utility files found*\n"

    # Configuration section
    content += "\n---\n\n## Configuration\n\n"
    if 'config' in categories:
        for file in sorted(categories['config'], key=lambda x: x['name']):
            content += f"- **{file['path']}** ({file['lines']} lines)\n"

    # Statistics
    total_files = len(files_info)
    total_lines = sum(f['lines'] for f in files_info)

    content += f"""
---

## 📊 Project Statistics

- **Total Files Indexed:** {total_files}
- **Total Lines of Code:** {total_lines:,}
- **Components:** {len(categories.get('components', []))}
- **Services:** {len(categories.get('services', []))}
- **Hooks:** {len(categories.get('hooks', []))}

---

## 🔄 How to Update This Index

Run the following command anytime:

```bash
python save-session.py
```

The script will automatically:
1. Find your most recent Claude session
2. Save it to Context/{'{date}'}/session-{'{time}'}.md
3. Regenerate this complete project index

---

**Note:** This index is automatically generated by scanning the project structure. For decision history and context, see [Context/INDEX.md](Context/INDEX.md).
"""

    return content


def save_session_content(session_content, project_root):
    """Save session content to Context folder."""
    if not session_content:
        return None

    today = datetime.now().strftime('%Y-%m-%d')
    timestamp = datetime.now().strftime('%H-%M-%S')

    # Create date folder if needed
    context_dir = project_root / 'Context' / today
    context_dir.mkdir(parents=True, exist_ok=True)

    # Save session content
    filename = f"session-{timestamp}.md"
    filepath = context_dir / filename

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(session_content)

    return filepath


def main():
    """Main execution function."""
    print("=" * 60)
    print("VoiceCoach V2 - Automated Session Save & Index Generator")
    print("=" * 60)
    print()

    # Get project root
    project_root = Path(__file__).parent.absolute()
    print(f"Project Root: {project_root}")
    print()

    # Find latest session file
    print("Finding most recent Claude session...")
    session_file = find_latest_session_file(project_root)

    if session_file:
        print(f"[OK] Found: {session_file.name}")
        print(f"     Size: {session_file.stat().st_size:,} bytes")
        print(f"     Modified: {datetime.fromtimestamp(session_file.stat().st_mtime).strftime('%Y-%m-%d %H:%M:%S')}")
    else:
        print("[SKIP] No session file found - will only update project index")

    # Parse session to markdown
    if session_file:
        print("\nParsing session conversation...")
        session_markdown = parse_jsonl_to_markdown(session_file)

        if session_markdown:
            print("[OK] Parsed conversation successfully")

            # Save session content
            print("\nSaving session to Context folder...")
            saved_file = save_session_content(session_markdown, project_root)

            if saved_file:
                print(f"[OK] Session saved to: {saved_file.relative_to(project_root)}")
        else:
            print("[SKIP] Could not parse session content")

    # Scan project
    print("\nScanning project structure...")
    files_info = scan_directory(project_root, project_root)
    print(f"[OK] Found {len(files_info)} files")

    # Generate index
    print("\nGenerating PROJECT_INDEX.md...")
    index_content = generate_project_index(files_info, project_root)

    # Write index
    index_path = project_root / 'PROJECT_INDEX.md'
    with open(index_path, 'w', encoding='utf-8') as f:
        f.write(index_content)

    print(f"[OK] Index saved to: PROJECT_INDEX.md")

    print("\n" + "=" * 60)
    print("[OK] Complete!")
    print("=" * 60)
    print()
    print("Results:")
    if session_file:
        print(f"  - Session saved: Context/{datetime.now().strftime('%Y-%m-%d')}/session-{datetime.now().strftime('%H-%M')}.md")
    print(f"  - Project index: PROJECT_INDEX.md ({len(files_info)} files)")
    print()
    print("Next steps:")
    print("  1. Review saved session in Context folder")
    print("  2. Check PROJECT_INDEX.md for current project structure")
    print("  3. Start new Claude session with full context available")
    print()


if __name__ == '__main__':
    main()
