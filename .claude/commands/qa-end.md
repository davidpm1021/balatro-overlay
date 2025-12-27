# /qa-end - End QA Mode and Create Spec

End QA testing mode, prioritize bugs, and create a fix spec.

## Behavior

When this command is invoked:

1. Read `specs/BUGS.md` to get all logged bugs

2. Prioritize bugs by:
   - Severity (P0 > P1 > P2 > P3)
   - Dependencies (signal/data flow issues before UI issues)
   - Quick wins (simpler fixes first if equal severity)

3. Create spec file `specs/XXX-bug-fixes.md`:
   - Determine next spec number (001, 002, etc.)
   - Include all open bugs in priority order

4. Spec file structure:
   ```markdown
   # Spec XXX: Bug Fixes from QA Testing

   ## Summary

   X bugs identified during manual testing. All batched into single fix branch.

   ---

   ## Bugs to Fix (Priority Order)

   ### 1. BUG-XXX: [Title]
   **Severity**: P# | **Component**: [Component]

   **Problem**: [What's broken]

   **Root Cause (Investigate)**:
   - [Possible cause 1]
   - [Possible cause 2]

   **Fix Approach**:
   1. [Step 1]
   2. [Step 2]

   **Acceptance Criteria**:
   - [ ] [Criterion 1]
   - [ ] [Criterion 2]

   ---

   [Repeat for each bug]

   ## Files to Modify

   | File | Bugs |
   |------|------|
   | `file.ts` | BUG-XXX, BUG-YYY |

   ## Test Requirements

   Write failing tests FIRST for each bug:
   1. Test: [description]
   2. Test: [description]

   ## Quality Gates

   - [ ] All bugs have regression tests
   - [ ] Existing tests still pass
   - [ ] `npm run build` passes
   - [ ] Manual verification of each fix
   ```

5. Update `specs/BUGS.md`:
   - Change status header to "Testing Complete - Prioritized for Spec XXX"
   - Update each bug's Status column to "Spec XXX"
   - Add Fix Priority column values

6. Respond with:
   ```
   QA Mode ended.

   Summary:
   - Total bugs: X
   - P0: X, P1: X, P2: X, P3: X

   Created: specs/XXX-bug-fixes.md

   Priority order:
   1. BUG-XXX - [title] (P#)
   2. BUG-YYY - [title] (P#)
   ...

   Ready to delegate to worker with /sprint-start
   ```

## Rules

- DO NOT implement any fixes
- DO analyze root causes for the spec
- DO create detailed fix approaches
- DO identify files to modify
