# Bug Tracker

## Status: All Spec 011 Bugs Fixed (2025-12-29)

All 12 bugs from QA testing have been resolved across 4 sprints.

---

## Bug Log

| ID | Severity | Component | Status | Sprint |
|----|----------|-----------|--------|--------|
| BUG-001 | P1 | Shop Overlay | Fixed | 3 |
| BUG-002 | P2 | Build Detector | Fixed | 4 |
| BUG-003 | P1 | Shop Advisor | Fixed | 3 |
| BUG-004 | P1 | Build Detector | Fixed | Pre-011 |
| BUG-005 | P2 | Build Detector | Fixed | Pre-011 |
| BUG-006 | P1 | Hand Analyzer | Fixed | Pre-011 |
| BUG-007 | P2 | Hand Analyzer | Fixed | 2 |
| BUG-008 | P2 | Shop Advisor | Fixed | 4 |
| BUG-009 | P3 | Shop Advisor | Fixed | 4 |
| BUG-010 | P1 | Hand Analyzer | Fixed | 1 |
| BUG-011 | P1 | Hand Analyzer | Fixed | 2 |
| BUG-012 | P2 | Build Detector | Fixed | 4 |
| BUG-013 | P1 | Hand Analyzer | Fixed | 1 |
| BUG-014 | P2 | Hand Analyzer | Fixed | 1 |
| BUG-015 | P2 | Shop Advisor | Fixed | 4 |

---

## Bug Details

### BUG-001: Planet cards displayed as unknown jokers
- **Severity**: P1
- **Component**: Shop Overlay / Card Display
- **Observed**: Mars planet card shows as "JOKER 50 - Unknown joker"
- **Expected**: Should display as PLANET with upgrade info
- **Fix**: Added `serialize_shop_item()` in Lua bridge to detect card type from `card.ability.set`
- **Status**: Fixed (Sprint 3)

### BUG-002: Build detection shows confidence on empty state
- **Severity**: P2
- **Component**: Build Detector Service
- **Observed**: Shows "Pairs 30%" on fresh run with no jokers
- **Expected**: Should show 0% or no build detected when no jokers owned
- **Fix**: `MIN_JOKER_SIGNAL_THRESHOLD` ensures 0% confidence with no jokers
- **Status**: Fixed (Sprint 4 - verified already working)

### BUG-003: Shop advisor missing for buffoon packs
- **Severity**: P1
- **Component**: Shop Advisor / Booster Phase
- **Observed**: No shop advisor overlay when opening buffoon packs
- **Expected**: Should show joker recommendations when viewing buffoon pack contents
- **Fix**: Added `G.STATES.BUFFOON_PACK` and `G.STATES.STANDARD_PACK` to phase detection; added booster contents export
- **Status**: Fixed (Sprint 3)

### BUG-004: Build detection not updating on joker acquisition
- **Severity**: P1
- **Component**: Build Detector Service
- **Observed**: Build detection did not update when selecting a joker with flush bonuses
- **Expected**: Build detection should immediately recalculate
- **Fix**: Fixed signal dependency chain in Spec 004
- **Status**: Fixed (Pre-011)

### BUG-005: Face card jokers incorrectly detecting pairs build
- **Severity**: P2
- **Component**: Build Detector Service
- **Observed**: Face card jokers showing "pairs" instead of "face cards"
- **Fix**: Added `normalizeJokerId()`, capped pairs deck score, adjusted deck/joker weighting
- **Status**: Fixed (Pre-011)

### BUG-006: Best hand ignores hand levels and joker synergies
- **Severity**: P1
- **Component**: Hand Analyzer Service
- **Observed**: Best hand uses poker rank hierarchy instead of actual projected scores
- **Fix**: Modified `findBestHand` to calculate actual projected score with hand levels + jokers
- **Status**: Fixed (Pre-011)

### BUG-007: Best play doesn't add 5th card as free discard
- **Severity**: P2
- **Component**: Hand Analyzer Service
- **Observed**: Two pair (8855) doesn't suggest adding 5th card to thin deck
- **Fix**: Added `evaluatePaddingOpportunity()` method with priority sorting (debuffed > off-suit > low rank)
- **Status**: Fixed (Sprint 2)

### BUG-008: Joker tier values ignore conditions and game phase
- **Severity**: P2
- **Component**: Shop Advisor
- **Observed**: Shoot the Moon shows +13 mult but requires holding queens (narrow condition)
- **Fix**: Added `activationProbability` field to jokers-complete.json; applies sqrt penalty to conditional jokers
- **Status**: Fixed (Sprint 4)

### BUG-009: No visual indicator for unaffordable cards
- **Severity**: P3
- **Component**: Shop Advisor
- **Observed**: Cards costing more than current money appear identical to affordable ones
- **Fix**: Added `opacity-50` styling and "NO $" badge for unaffordable items
- **Status**: Fixed (Sprint 4)

### BUG-010: Two pair not detected/recommended over single pair
- **Severity**: P1
- **Component**: Hand Analyzer Service
- **Observed**: Hand 6622 shows "Pair 66" instead of "Two Pair"
- **Fix**: Fixed combination generation in `findBestHand()` to properly evaluate all hand types
- **Status**: Fixed (Sprint 1)

### BUG-011: Best play doesn't consider discard as strategy
- **Severity**: P1
- **Component**: Hand Analyzer Service
- **Observed**: With discards remaining, recommends playing weak pair instead of discarding to improve
- **Fix**: Added `evaluateDiscardStrategy()` method with hand strength classification and improvement probability
- **Status**: Fixed (Sprint 2)

### BUG-012: Enabler jokers overvalued without synergy partners
- **Severity**: P2
- **Component**: Build Detector Service
- **Observed**: Pareidolia alone shows 73% face cards build (no payoff jokers)
- **Fix**: Added `ENABLER_JOKERS` map; reduces enabler weight by 70% when no matching payoff jokers exist
- **Status**: Fixed (Sprint 4)

### BUG-013: Best hand ignores debuffed cards
- **Severity**: P1
- **Component**: Hand Analyzer Service
- **Observed**: Recommends pair 99 when one 9 is debuffed
- **Fix**: Changed `findBestHand()` to include all cards for hand type detection (debuffed cards form hands but score 0)
- **Status**: Fixed (Sprint 1)

### BUG-014: Debuffed cards nuance - still form hands, just don't score
- **Severity**: P2
- **Component**: Hand Analyzer Service
- **Observed**: Debuffed cards excluded from hand type detection entirely
- **Fix**: Include debuffed cards in hand detection; ScoreEngineService already handles 0 chip contribution
- **Status**: Fixed (Sprint 1)

### BUG-015: No reroll recommendation logic
- **Severity**: P2
- **Component**: Shop Advisor
- **Observed**: Shop advisor doesn't advise when to reroll
- **Fix**: Added `getRerollRecommendation()` method considering money, interest threshold ($25), and best item score
- **Status**: Fixed (Sprint 4)

---

## Sprint Summary

| Sprint | Bugs Fixed | Focus Area |
|--------|------------|------------|
| 1 | BUG-010, BUG-013, BUG-014 | Hand Analyzer - Two pair, Debuff handling |
| 2 | BUG-007, BUG-011 | Hand Analyzer - Discard strategy, Padding |
| 3 | BUG-001, BUG-003 | Lua Bridge - Shop/Booster export |
| 4 | BUG-002, BUG-008, BUG-009, BUG-012, BUG-015 | Build Detector, Shop Advisor |

---

## Legend

**Severity Levels:**
- **P0**: Crash / data loss / completely broken
- **P1**: Major feature broken, no workaround
- **P2**: Feature broken, workaround exists
- **P3**: Minor issue, cosmetic, edge case

**Status:**
- **Open**: Reported, not yet fixed
- **Fixed**: Resolved
