# Bug Tracker

## Status: All Fixed (Spec 004 Complete)

4 bugs found, all resolved. 268 tests passing.

---

## Bug Log

| ID | Severity | Component | Status | Fix Priority |
|----|----------|-----------|--------|--------------|
| BUG-004 | P1 | Build Detector | Fixed | 1st - Reactivity |
| BUG-001 | P1 | Shop Overlay / Card Display | Fixed | 2nd - Type Detection |
| BUG-003 | P1 | Shop Advisor | Fixed | 3rd - Booster Phase |
| BUG-002 | P2 | Build Detector | Fixed | 4th - Edge Case |

---

## Bug Details

### BUG-001: Planet cards displayed as unknown jokers
- **Severity**: P1
- **Component**: Shop Overlay / Card Display
- **Observed**: Mars planet card shows as "JOKER 50 - Unknown joker"
- **Expected**: Should display as PLANET with upgrade info (e.g., "Mars - Upgrades Taurus hand")
- **Notes**: Card type detection not distinguishing planets from jokers

### BUG-002: Build detection shows confidence on empty state
- **Severity**: P2
- **Component**: Build Detector Service
- **Observed**: Shows "Pairs 30%" on fresh run with no jokers
- **Expected**: Should show 0% or no build detected when no jokers owned
- **Notes**: Deck composition signals contributing to confidence even with 0 joker signal

### BUG-003: Shop advisor missing for buffoon packs
- **Severity**: P1
- **Component**: Shop Advisor / Booster Phase
- **Observed**: No shop advisor overlay when opening buffoon packs
- **Expected**: Should show joker recommendations with scores when viewing buffoon pack contents
- **Notes**: Booster phase detection or UI trigger not working for buffoon packs

### BUG-004: Build detection not updating on joker acquisition
- **Severity**: P1
- **Component**: Build Detector Service
- **Observed**: Build detection did not update when selecting a joker with flush bonuses
- **Expected**: Build detection should immediately recalculate and show flush build when acquiring flush joker
- **Notes**: Computed signal not reacting to joker state changes; possible issue with signal dependency chain

---

## Legend

**Severity Levels:**
- **P0**: Crash / data loss / completely broken
- **P1**: Major feature broken, no workaround
- **P2**: Feature broken, workaround exists
- **P3**: Minor issue, cosmetic, edge case

**Status:**
- **Open**: Reported, not yet fixed
- **Spec 004**: Batched for fix
- **Fixed**: Resolved
