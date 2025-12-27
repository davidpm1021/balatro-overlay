# /qa-bug - Log a Bug

Log a bug from user description. Only works in QA mode.

## Arguments

`/qa-bug <description>` - Optional inline description

## Behavior

When user reports a bug (either via command or natural language):

1. Assign next sequential bug ID (BUG-001, BUG-002, etc.)

2. Determine severity based on description:
   - P0: Crash, data loss, app won't start
   - P1: Major feature completely broken
   - P2: Feature broken but workaround exists
   - P3: Minor, cosmetic, edge case

3. Identify component from description:
   - Build Detector, Shop Advisor, Deck Tracker, etc.
   - Or "UI / Display" if unclear

4. Add entry to `specs/BUGS.md`:

   **In the table:**
   ```
   | BUG-XXX | P# | Component | Open | - |
   ```

   **In Bug Details section:**
   ```markdown
   ### BUG-XXX: [Short title]
   - **Severity**: P#
   - **Component**: [Component name]
   - **Observed**: [What happened]
   - **Expected**: [What should happen]
   - **Notes**: [Any additional context]
   ```

5. Acknowledge:
   ```
   Logged: BUG-XXX ([severity]) - [short title]
   Component: [component]

   Continue testing or say "testing complete" when done.
   ```

## Examples

User: "The score preview shows NaN when I have no cards selected"
→ Log as: BUG-XXX: Score preview shows NaN on empty selection (P2, Score Preview)

User: "App crashes when opening settings"
→ Log as: BUG-XXX: Crash on settings open (P0, Settings/UI)

User: "Planet cards show as unknown jokers"
→ Log as: BUG-XXX: Planet cards displayed as unknown jokers (P1, Shop Overlay)

## Rules

- DO NOT fix the bug
- DO NOT analyze root cause in detail
- DO NOT modify source code
- ONLY log and acknowledge
