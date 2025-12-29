# Bug Tracker

## Status: Phase 2 Integration Testing In Progress

Testing overlay with live Balatro gameplay.

---

## Bug Log

| ID | Severity | Component | Status | Fix Priority |
|----|----------|-----------|--------|--------------|

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
- **Status**: Fixed in Spec 004

### BUG-005: Face card jokers incorrectly detecting pairs build
- **Severity**: P2
- **Component**: Build Detector Service
- **Observed**: With Sock and Buskin, Smiley Face, Space Joker, and Splash jokers, build detection shows "pairs + xmult scaling" instead of "face cards"
- **Expected**: Should detect face_cards as primary build since jokers have high face_cards affinity
- **Root Cause**: Two issues:
  1. Joker ID mismatch: Lua bridge sends "j_sock_and_buskin", JSON uses "sock_and_buskin"
  2. Pairs deck score was inflated for standard decks (13 quads = 100 score)
  3. face_cards was penalized by 30/70 deck/joker weighting vs xmult_scaling's 100% joker
- **Fix**:
  1. Added normalizeJokerId() to strip "j_" prefix
  2. Capped pairs base deck score so standard decks don't max out
  3. Changed face_cards and fibonacci to 15/85 deck/joker weighting
- **Status**: Fixed

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
