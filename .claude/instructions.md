\# Project: VoiceCoach Development Standards



\## MANDATORY: LED Breadcrumb System

ALL code in this project MUST use the LED Breadcrumb System defined in:

`LED-SYSTEM-CORE.md`



\### Non-Negotiable Rules:

1\. Every new function gets LED instrumentation

2\. Every LED includes verification (expected vs actual)

3\. Code is NOT complete until verification passes

4\. Use assigned LED ranges (see master guide)



\### Before Claiming Code Works:

\- Run: `window.debug.breadcrumbs.getLastVerification()`

\- Ensure: All checkpoints passed

\- Verify: No LED failures in your range



\### Import Required:

```typescript

import { VerifiableBreadcrumbTrail } from '@/lib/breadcrumb-system';

