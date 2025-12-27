# /sprint-start - Delegate Spec to Worker

Delegate a spec file to a worker agent for implementation.

## Arguments

`/sprint-start <spec-file>` - The spec file to implement (e.g., "004" or "specs/004-bug-fixes.md")

## Behavior

When this command is invoked:

1. Read the specified spec file

2. Gather context:
   - Read relevant source files mentioned in spec
   - Check current test count with `npm test`
   - Understand current codebase state

3. Create worker prompt with full context:
   ```
   Implement specs/XXX-*.md following these requirements:

   CONTEXT:
   - Angular 19+ codebase with signals, OnPush, inject()
   - Follow patterns in CLAUDE.md
   - Current test count: XXX tests passing

   REQUIREMENTS:
   1. Write failing tests FIRST for each bug/feature
   2. Implement fixes to make tests pass
   3. Run `npm run build` and `npm run test` after each fix
   4. Commit with conventional format: fix(scope): description

   SPEC DETAILS:
   [Full spec content pasted here]

   FILES TO READ FIRST:
   - [List files from spec]

   QUALITY GATES:
   - [ ] All new tests pass
   - [ ] Existing XXX tests still pass
   - [ ] Build succeeds
   - [ ] Each acceptance criterion met

   Report back with:
   - Summary of changes made
   - Test results (new count)
   - Files modified
   - Any issues encountered
   ```

4. Delegate to Task agent with `subagent_type: "general-purpose"`

5. Report delegation:
   ```
   Delegated specs/XXX-*.md to worker agent.

   Worker will:
   - Write failing tests first
   - Implement fixes
   - Run build and tests
   - Commit changes

   Waiting for worker to complete...
   ```

6. When worker completes, summarize results and transition to review mode

## Rules

- Orchestrator NEVER writes implementation code
- ALL implementation delegated to worker
- Provide COMPLETE context in worker prompt
- Worker has full autonomy within spec bounds
