# Workflow & Best Practices

This document defines HOW we work on this project. Claude Code should follow these practices for every task.

---

## The Core Loop: Explore → Plan → Code → Commit

**Never skip straight to coding.** Every significant task follows this sequence:

### 1. EXPLORE (understand first)
```
Before writing any code, read the relevant existing files.
Understand the patterns already in use.
Don't code yet — just explore.
```

### 2. PLAN (get approval)
```
Create an implementation plan:
- Files to create/modify
- Approach and patterns to use
- Potential risks or edge cases
- Test strategy

Use extended thinking for complex plans.
Don't code yet — present the plan and wait for approval.
```

### 3. CODE (implement the approved plan)
```
Now implement, following the approved plan.
Match existing patterns in the codebase.
Include error handling and edge cases.
```

### 4. COMMIT (with meaningful messages)
```
Create focused commits with descriptive messages.
Each commit should be a logical unit.
Format: "feat(scope): description" or "fix(scope): description"
```

---

## Test-Driven Generation

For any significant logic (calculators, services, algorithms):

### Step 1: Write tests FIRST
```
Write the test file based on requirements.
Include:
- Happy path cases
- Edge cases (null, empty, boundary values)
- Error cases

Do NOT write implementation yet.
```

### Step 2: Verify tests fail
```
Run the tests to confirm they fail.
This validates the tests are actually testing something.
```

### Step 3: Implement to make tests pass
```
Now write the implementation.
Do NOT modify the tests to make them pass — modify the code.
```

### Step 4: Refactor if needed
```
Once tests pass, refactor for clarity.
Tests should still pass after refactoring.
```

---

## Quality Checkpoints

### Before ANY code generation:
- [ ] Read relevant existing files first
- [ ] Check .claude/CLAUDE.md for conventions
- [ ] Understand the patterns already in use

### Before completing a task:
- [ ] Code follows project conventions (signals, OnPush, inject(), etc.)
- [ ] Tests exist for significant logic
- [ ] No TypeScript errors (`ng build` succeeds)
- [ ] No lint errors (`npm run lint` passes)
- [ ] Code is committed with descriptive message

### Before merging a feature branch:
- [ ] All tests pass
- [ ] Code reviewed (or cross-model verified)
- [ ] No console.log statements left behind
- [ ] Documentation updated if needed

---

## Tool Usage Guidelines

### Use Claude Code (terminal) for:
- Complex multi-file changes
- Architecture planning
- Debugging with logs/stack traces
- Running tests and fixing failures
- Git operations
- Any task requiring extended thinking

### Use Cursor AI panel for:
- Quick single-file edits
- Finding files/symbols
- Code completion while typing
- Quick documentation lookups

### Use Context7 MCP for:
- Looking up Angular API documentation
- Checking TypeScript patterns
- Verifying RxJS operators
- Any "is this the current way to do X?" questions

```
Example: "Use context7 to look up the current Angular best practice for reactive forms"
```

---

## Prompting Patterns That Work

### Be specific and bounded:
```
❌ "Add tests"
✅ "Write Jest tests for hand-detector.service.ts covering: 
    - All standard poker hands
    - Wild card handling  
    - Empty hand edge case
    Follow the pattern in score-calculator.service.spec.ts"
```

### Reference existing patterns:
```
❌ "Create a new component"
✅ "Create CardCellComponent following the pattern in DeckGridComponent. 
    Use signals for state, OnPush change detection."
```

### Include context:
```
❌ "Fix the bug"
✅ "The score calculator returns NaN when jokers array is empty. 
    Look at score-calculator.service.ts line 45. 
    Add a guard for empty arrays."
```

---

## Parallel Agent Coordination

### Rules for parallel work:
1. Each agent works in its own git worktree
2. Agents should NOT modify the same files
3. Define clear boundaries in task specs
4. Shared interfaces go in `shared/models/` — coordinate changes

### Before starting parallel agents:
1. Ensure foundation work is merged to main
2. Each agent gets a specific TASK_SPEC.md
3. Create worktrees from latest main:
   ```bash
   git checkout main
   git pull
   git worktree add ../project-feature feature/branch-name
   ```

### Merging parallel work:
1. Agent completes and pushes branch
2. Human reviews PR
3. Merge to main
4. Other agents rebase if needed: `git rebase main`

---

## Angular-Specific Patterns

### Component checklist:
- [ ] Standalone (don't set `standalone: true` — it's default)
- [ ] `ChangeDetectionStrategy.OnPush`
- [ ] Use `signal()` and `computed()` for state
- [ ] Use `input()` and `output()` not decorators
- [ ] Use `inject()` not constructor injection
- [ ] Use `@if`, `@for`, `@switch` not `*ngIf`, `*ngFor`

### Service checklist:
- [ ] `providedIn: 'root'` for singletons
- [ ] Expose state as signals
- [ ] Computed signals for derived state
- [ ] No direct DOM manipulation

---

## Lua-Specific Patterns (Bridge Mod)

### Before writing Lua code:
- Read existing Balatro modding examples
- Understand the game state structure (G.GAME, G.deck, etc.)
- Test in isolated chunks

### Lua checklist:
- [ ] All variables are `local`
- [ ] Functions use snake_case
- [ ] Steamodded header present
- [ ] Error handling for nil values
- [ ] Throttled state exports (max 10/sec)

---

## When Things Go Wrong

### Build fails:
```
1. Read the full error message
2. Look at the specific file and line
3. Check if it's a TypeScript type error or runtime error
4. Fix the root cause, not the symptom
```

### Tests fail:
```
1. Run the specific failing test in isolation
2. Check if test is correct or implementation is wrong
3. Don't modify tests just to make them pass
4. Add console.log in test to debug if needed, remove after
```

### Agent goes off track:
```
1. Stop and reassess
2. Use /clear to reset context if needed
3. Re-read the TASK_SPEC.md
4. Start fresh with Explore phase
```

---

## Definition of Done

A task is DONE when:
1. Code compiles without errors
2. Tests pass (if applicable)
3. Lint passes
4. Code follows project conventions
5. Changes are committed with good message
6. Works when manually tested (if UI)
7. Ready for review/merge

---

## Orchestrator Modes

The orchestrator (you) manages development through distinct operational modes. Each mode has specific rules and outputs.

---

### QA Mode

**Purpose**: Test the application and log bugs without fixing them.

**Entry**: `/qa-start` or "Switch to QA mode"

**Rules**:
1. DO NOT write any code fixes
2. DO NOT modify any source files
3. DO NOT analyze root causes beyond surface level
4. Only observe, document, and log bugs
5. Ask clarifying questions about observed behavior

**Workflow**:
```
1. User describes observed bug
2. Log bug to specs/BUGS.md with:
   - ID: BUG-XXX (sequential)
   - Severity: P0/P1/P2/P3
   - Component: Where bug appears
   - Observed: What happened
   - Expected: What should happen
   - Notes: Brief context
3. Acknowledge and wait for next bug
```

**Exit**: `/qa-end` or "testing complete"

**Severity Levels**:
| Level | Meaning |
|-------|---------|
| P0 | Crash / data loss / completely broken |
| P1 | Major feature broken, no workaround |
| P2 | Feature broken, workaround exists |
| P3 | Minor issue, cosmetic, edge case |

---

### Sprint Planning Mode

**Purpose**: Batch bugs into specs and prioritize work.

**Entry**: `/qa-end` or after QA mode completes

**Workflow**:
```
1. Review all bugs in specs/BUGS.md
2. Prioritize by:
   - Severity (P0 > P1 > P2 > P3)
   - Dependencies (signal flow issues before UI issues)
   - Complexity (quick wins first if equal severity)
3. Create specs/XXX-bug-fixes.md with:
   - Prioritized bug list
   - Root cause analysis for each
   - Fix approach for each
   - Files to modify
   - Test requirements
   - Quality gates
4. Update BUGS.md status column
```

**Output**: Spec file ready for worker delegation

---

### Implementation Mode (Worker Delegation)

**Purpose**: Delegate specs to worker agents for implementation.

**Entry**: `/sprint-start <spec-file>` or "Delegate spec XXX to worker"

**Rules**:
1. Orchestrator NEVER writes implementation code
2. All code work delegated to Task agent workers
3. Provide complete context in worker prompt
4. One worker per spec (no parallel workers on same spec)

**Worker Prompt Template**:
```
Implement [spec-file] following these requirements:

CONTEXT:
- This is a [Angular/Lua/Electron] codebase
- Follow patterns in CLAUDE.md
- Current state: [describe relevant state]

REQUIREMENTS:
1. Write failing tests FIRST (TDD)
2. Implement fixes to make tests pass
3. Run `npm run build` and `npm run test`
4. Commit with conventional format

SPEC DETAILS:
[Paste relevant spec content]

QUALITY GATES:
- [ ] All new tests pass
- [ ] Existing tests still pass
- [ ] Build succeeds
- [ ] Lint passes

Report back with:
- Summary of changes
- Test results
- Any issues encountered
```

**Exit**: Worker reports completion

---

### Review Mode

**Purpose**: Validate worker output meets spec requirements.

**Entry**: `/sprint-review` or after worker completes

**Checklist**:
```
1. VERIFY TEST RESULTS
   - [ ] Worker reported test count
   - [ ] All tests passing
   - [ ] New tests cover spec requirements

2. VERIFY BUILD STATUS
   - [ ] npm run build succeeds
   - [ ] No TypeScript errors
   - [ ] No lint warnings

3. VERIFY SPEC COMPLETION
   - [ ] Each requirement addressed
   - [ ] Acceptance criteria met
   - [ ] Files modified match spec

4. VERIFY CODE QUALITY
   - [ ] Follows Angular patterns (signals, OnPush, inject)
   - [ ] No hardcoded data (uses JSON sources)
   - [ ] No leftover console.logs

5. MERGE DECISION
   - [ ] Ready to merge → proceed
   - [ ] Issues found → create follow-up bugs
```

**Output**: Merge approval or new bugs logged

---

## Slash Commands Reference

| Command | Mode | Description |
|---------|------|-------------|
| `/qa-start` | QA | Enter QA mode, create/update BUGS.md |
| `/qa-bug` | QA | Log a bug from user description |
| `/qa-end` | Sprint | End QA, prioritize bugs, create spec |
| `/sprint-start` | Impl | Delegate spec to worker agent |
| `/sprint-review` | Review | Validate worker output |

---

## Quick Reference

| Phase | Key Question |
|-------|--------------|
| Explore | "What patterns exist already?" |
| Plan | "What's the approach and what could go wrong?" |
| Code | "Does this match the plan and conventions?" |
| Commit | "Is this a logical, focused change?" |

| Problem | Action |
|---------|--------|
| Unsure of Angular API | Use Context7 MCP |
| Complex debugging | Use extended thinking ("ultrathink") |
| Need second opinion | Ask for cross-model review |
| Going in circles | /clear and restart with Explore |

---

## Mode State Machine

```
[IDLE]
   ↓ /qa-start
[QA MODE] ←→ /qa-bug (logs bug, stays in QA)
   ↓ /qa-end
[SPRINT PLANNING] → creates spec
   ↓ /sprint-start
[IMPLEMENTATION] → worker executes
   ↓ worker completes
[REVIEW MODE]
   ↓ /sprint-review (approve)
[IDLE] or → new bugs logged → [QA MODE]
```
