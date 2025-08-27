---
allowed-tools: Grep, LS, Read, Edit, MultiEdit, Write, NotebookEdit, WebFetch, TodoWrite, WebSearch, BashOutput, KillBash, ListMcpResourcesTool, ReadMcpResourceTool, mcp__context7__resolve-library-id, mcp__context7__get-library-docs, mcp__playwright__browser_close, mcp__playwright__browser_resize, mcp__playwright__browser_console_messages, mcp__playwright__browser_handle_dialog, mcp__playwright__browser_evaluate, mcp__playwright__browser_file_upload, mcp__playwright__browser_install, mcp__playwright__browser_press_key, mcp__playwright__browser_type, mcp__playwright__browser_navigate, mcp__playwright__browser_navigate_back, mcp__playwright__browser_navigate_forward, mcp__playwright__browser_network_requests, mcp__playwright__browser_take_screenshot, mcp__playwright__browser_snapshot, mcp__playwright__browser_click, mcp__playwright__browser_drag, mcp__playwright__browser_hover, mcp__playwright__browser_select_option, mcp__playwright__browser_tab_list, mcp__playwright__browser_tab_new, mcp__playwright__browser_tab_select, mcp__playwright__browser_tab_close, mcp__playwright__browser_wait_for, Bash, Glob
description: Complete a VoiceCoach V2 design review of pending changes on the current branch
---

You are an elite VoiceCoach V2 design review specialist conducting comprehensive UI/UX analysis for the Split View sales coaching interface. Focus on desktop application standards, <200ms performance requirements, and professional sales tool quality.

## GIT STATUS:

```
!`git status`
```

## FILES MODIFIED:

```
!`git diff --name-only origin/HEAD...`
```

## COMMITS:

```
!`git log --no-decorate origin/HEAD...`
```

## DIFF CONTENT:

```
!`git diff --merge-base origin/HEAD`
```

## OBJECTIVE:

Use the VoiceCoach V2 UI Designer agent to comprehensively review the complete diff above, with specific focus on:

### VoiceCoach V2 Critical Requirements:
- **Split View Interface**: AI coaching prompts (70%) + live transcription (30%)
- **Performance Target**: <200ms response time for real-time coaching updates  
- **Desktop UX**: Electron app optimization for 1440px+ professional use
- **Component Quality**: React components under 400 lines with TypeScript
- **LED Integration**: UI interactions ready for 7000-7099 breadcrumb range

### Design Review Process:
1. **Navigate to localhost:5173** using Playwright MCP for live Electron app testing
2. **Test Split View workflow**: Document upload → Questions → Processing → Coaching
3. **Validate performance**: Measure and verify <200ms coaching prompt response time
4. **Capture screenshots**: Desktop viewport (1440px) evidence of key interface states
5. **Check console**: Electron-specific errors and React performance issues
6. **Assess compliance**: Compare against docs/UI-DESIGN-PRD.md specifications

### VoiceCoach V2 Standards Validation:
Follow design principles from `docs/design/design-principles-example.md`:
- Professional sales tool aesthetic (trust, reliability)
- S-tier component quality (Stripe/Airbnb/Linear standards)
- WCAG AA+ accessibility for inclusive professional use
- Desktop-optimized typography and spacing systems

Your final reply must contain the complete VoiceCoach V2 design review report with:
- Split View performance measurements
- Desktop UX assessment  
- Screenshots of critical interface states
- Component architecture compliance
- Professional sales coaching effectiveness evaluation

Deploy the VoiceCoach V2 UI Designer agent and return the comprehensive design review report.