# /sprint-review - Validate Worker Output

Review and validate completed worker output against spec requirements.

## Behavior

When this command is invoked after worker completes:

1. Run verification commands:
   ```bash
   npm run build    # Verify build succeeds
   npm run test     # Verify all tests pass
   npm run lint     # Verify no lint errors
   ```

2. Review worker's reported changes:
   - Files modified
   - Tests added
   - Commits made

3. Check spec completion:

   For each bug/requirement in spec:
   - [ ] Has regression test
   - [ ] Acceptance criteria met
   - [ ] Fix approach followed

4. Check code quality:
   - [ ] Follows Angular patterns (signals, OnPush, inject)
   - [ ] No hardcoded data (uses JSON sources)
   - [ ] No console.log left behind
   - [ ] Matches existing code style

5. Generate review report:
   ```
   Sprint Review: specs/XXX-*.md

   BUILD: [PASS/FAIL]
   TESTS: XXX passing (YYY new)
   LINT:  [PASS/FAIL]

   Spec Completion:
   - [x] BUG-001: [title] - Fixed, tested
   - [x] BUG-002: [title] - Fixed, tested
   - [ ] BUG-003: [title] - INCOMPLETE: [reason]

   Code Quality:
   - [x] Angular patterns followed
   - [x] No hardcoded data
   - [x] Clean commits

   VERDICT: [APPROVED / NEEDS WORK]

   [If approved]
   Ready to merge to main branch.

   [If needs work]
   Issues to address:
   1. [Issue 1]
   2. [Issue 2]

   Options:
   A) Resume worker to fix issues
   B) Log as new bugs for next sprint
   ```

6. If approved, optionally merge:
   ```bash
   git checkout main
   git merge --no-ff feature/branch
   git push origin main
   ```

## Checklist Template

```markdown
## Sprint Review Checklist

### Build & Tests
- [ ] `npm run build` passes
- [ ] `npm run test` passes (XXX tests)
- [ ] `npm run lint` passes

### Spec Requirements
- [ ] Requirement 1 complete
- [ ] Requirement 2 complete
- [ ] Requirement N complete

### Code Quality
- [ ] Signals used (not BehaviorSubject)
- [ ] OnPush change detection
- [ ] inject() not constructor
- [ ] @if/@for not *ngIf/*ngFor
- [ ] No hardcoded data
- [ ] Tests for new logic

### Commits
- [ ] Conventional commit format
- [ ] Logical commit units
- [ ] No WIP or fixup commits

### Manual Verification
- [ ] Feature works as expected
- [ ] No regressions observed
```

## Rules

- Run actual verification commands
- Check EVERY acceptance criterion
- Be thorough but fair
- Log new bugs if issues found
