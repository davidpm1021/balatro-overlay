# Spec 004: Bug Fixes from QA Testing

## Summary

4 bugs identified during manual testing. All batched into single fix branch.

---

## Bugs to Fix (Priority Order)

### 1. BUG-004: Build detection not updating on joker acquisition
**Severity**: P1 | **Component**: BuildDetectorService

**Problem**: Build detection computed signal doesn't react when player acquires new jokers.

**Root Cause (Investigate)**:
- Signal dependency chain may be broken
- GameStateService.jokers() may not be triggering recomputation
- Possible stale closure in computed()

**Fix Approach**:
1. Verify GameStateService.jokers is a proper signal
2. Check BuildDetectorService.jokers computed depends on gameState.jokers()
3. Add explicit dependency if needed
4. Write test that verifies reactivity

**Acceptance Criteria**:
- [ ] Acquiring flush joker immediately shows flush build detection
- [ ] Build confidence updates in real-time as jokers change

---

### 2. BUG-001: Planet cards displayed as unknown jokers
**Severity**: P1 | **Component**: Shop Overlay / Card Display

**Problem**: Mars planet card shows "JOKER 50 - Unknown joker" instead of planet info.

**Root Cause (Investigate)**:
- Shop item type detection not checking for `type: 'planet'`
- All non-joker items falling through to joker scoring
- Missing planet display template

**Fix Approach**:
1. Check ShopAdvisorService.scoreShopItem() for type handling
2. Add proper planet card scoring/display
3. Show planet name + hand it upgrades

**Acceptance Criteria**:
- [ ] Planet cards show as "PLANET" type
- [ ] Display shows which hand type it upgrades
- [ ] Score reflects value of upgrading that hand

---

### 3. BUG-003: Shop advisor missing for buffoon packs
**Severity**: P1 | **Component**: Shop Advisor / Booster Phase

**Problem**: No overlay appears when opening buffoon packs to help select jokers.

**Root Cause (Investigate)**:
- Booster phase not detected in GameStateService
- ShopOverlayComponent not rendering during booster phase
- Lua mod may not be exporting booster pack contents

**Fix Approach**:
1. Check if Lua mod exports booster phase + contents
2. Verify GameStateService has booster phase detection
3. Update ShopOverlayComponent to show during booster phase
4. Use scoreBoosterContents() method (already exists)

**Acceptance Criteria**:
- [ ] Opening buffoon pack shows overlay with joker scores
- [ ] Each joker option scored based on current build
- [ ] Recommendations sorted by score

---

### 4. BUG-002: Build detection shows confidence on empty state
**Severity**: P2 | **Component**: BuildDetectorService

**Problem**: Shows "Pairs 30%" on fresh run with no jokers owned.

**Root Cause**:
- Deck composition signal (30% weight) contributes even when joker signal is 0
- Standard deck has pairs, so pairs strategy gets 30% confidence

**Fix Approach**:
1. Add minimum joker signal threshold for any detection
2. If jokerSignal < 10, return 0 confidence
3. Or: Require at least 1 strategy-relevant joker to show build

**Acceptance Criteria**:
- [ ] Fresh run with no jokers shows "No build detected" or 0%
- [ ] Build only shows after acquiring relevant jokers

---

## Files to Modify

| File | Bugs |
|------|------|
| `build-detector.service.ts` | BUG-004, BUG-002 |
| `shop-advisor.service.ts` | BUG-001 |
| `shop-overlay.component.ts` | BUG-001, BUG-003 |
| `game-state.service.ts` | BUG-004, BUG-003 |

## Test Requirements

Write failing tests FIRST for each bug:
1. Test: Build detection updates when jokers signal changes
2. Test: Planet cards scored as planets, not jokers
3. Test: Booster phase triggers advisor display
4. Test: Zero jokers = zero build confidence

## Quality Gates

- [ ] All 4 bugs have regression tests
- [ ] Existing 248 tests still pass
- [ ] `npm run build` passes
- [ ] Manual verification of each fix

## Commits (Suggested)

1. `test: add failing tests for QA bugs`
2. `fix(build-detector): update reactivity on joker changes`
3. `fix(shop-advisor): handle planet cards correctly`
4. `fix(shop-overlay): show advisor during booster phase`
5. `fix(build-detector): require joker signal for confidence`
