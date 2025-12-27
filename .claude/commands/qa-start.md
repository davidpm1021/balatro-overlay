# /qa-start - Enter QA Mode

Enter QA testing mode. In this mode, you will:

1. Create or update `specs/BUGS.md` if it doesn't exist
2. Set mode to QA_MODE (no code fixes allowed)
3. Wait for user to report bugs

## Behavior

When this command is invoked:

1. Check if `specs/BUGS.md` exists
   - If not, create it with the bug tracker template
   - If exists, read current bug count for next ID

2. Respond with:
   ```
   QA Mode activated.

   Rules:
   - I will NOT write any code fixes
   - I will NOT modify source files
   - I will only log bugs you report

   Bug log: specs/BUGS.md
   Next bug ID: BUG-XXX

   Describe any bugs you observe during testing.
   Say "testing complete" or use /qa-end when done.
   ```

## BUGS.md Template

If creating new file:

```markdown
# Bug Tracker

## Status: QA In Progress

---

## Bug Log

| ID | Severity | Component | Status | Fix Priority |
|----|----------|-----------|--------|--------------|

---

## Bug Details

---

## Legend

**Severity Levels:**
- **P0**: Crash / data loss / completely broken
- **P1**: Major feature broken, no workaround
- **P2**: Feature broken, workaround exists
- **P3**: Minor issue, cosmetic, edge case

**Status:**
- **Open**: Reported, not yet fixed
- **In Spec**: Batched for fix
- **Fixed**: Resolved
```

## Rules

- DO NOT analyze root causes
- DO NOT suggest fixes
- DO NOT modify any source code
- ONLY log bugs and acknowledge
