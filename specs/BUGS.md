# Bug Tracker

## Status: 3 Open Bugs (2025-12-29)

22 bugs logged total. 19 fixed, 3 open from latest QA session.

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
| BUG-016 | P2 | Hand Analyzer | Fixed | 5 |
| BUG-017 | P1 | Score Preview | Fixed | 5 |
| BUG-018 | P1 | Score Preview | Fixed | 5 |
| BUG-019 | P1 | Score Engine | Fixed | 5 |
| BUG-020 | P1 | Shop Overlay | Open | - |
| BUG-021 | P1 | Hand Analyzer | Open | - |
| BUG-022 | P3 | Hand Guidance UI | Open | - |

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

### BUG-016: Best play doesn't account for debuffed card scoring impact
- **Severity**: P2
- **Component**: Hand Analyzer
- **Observed**: Best play recommends Two Pair when 2 of the 4 cards are debuffed spades; projection doesn't reflect reduced score
- **Expected**: Should either show accurate reduced score for the debuffed hand, or recommend alternative play with non-debuffed cards
- **Fix**: Added debuff checks to `getCardChipValue()`, `getEnhancementEffect()`, and `getEditionEffect()` - debuffed cards now contribute 0
- **Status**: Fixed (Sprint 5)

### BUG-017: Flush score projection ~4x higher than actual
- **Severity**: P1
- **Component**: Score Preview
- **Observed**: Flush projected 1300, actual score was 316 (~4x overestimate)
- **Expected**: Projection should closely match actual game score
- **Fix**: Same root cause as BUG-016 - debuffed cards were incorrectly contributing chip values
- **Status**: Fixed (Sprint 5)

### BUG-018: Straight score projection lower than actual
- **Severity**: P1
- **Component**: Score Preview
- **Observed**: Straight projected 308, actual score was 420 (~27% underestimate)
- **Expected**: Projection should closely match actual game score
- **Fix**: Same root cause as BUG-016/017 - debuffed cards calculation issue
- **Status**: Fixed (Sprint 5)

### BUG-019: Unknown joker conditions applied unconditionally
- **Severity**: P1
- **Component**: Score Engine
- **Observed**: Two Pair projected 920, actual was 488; x3 mult joker (all same color) incorrectly applied when condition not met
- **Expected**: Jokers with unrecognized conditions should not apply their effects
- **Fix**: Changed default case in `evaluateJokerCondition()` to return `defaultReturn` instead of applying the effect
- **Status**: Fixed (Sprint 5)

### BUG-020: Planet cards (Jupiter) displayed as jokers
- **Severity**: P1
- **Component**: Shop Overlay
- **Observed**: Jupiter planet card labeled as a joker instead of planet card
- **Expected**: Should display as PLANET with hand type upgrade info
- **Notes**: Similar to BUG-001 (Mars as unknown joker) - may be regression or incomplete fix

### BUG-021: Two pair not detected, recommends pair or discard instead
- **Severity**: P1
- **Component**: Hand Analyzer
- **Observed**:
  - Hand 5522: recommends "Pair 55" with projection 1.2k; actual was 120 (10x overestimate)
  - Hand 6655: recommends discarding 55 and keeping just 66 (pair) instead of playing two pair
  - Hand 6655+2: not suggesting adding 5th card (like 2) for free discard while scoring two pair
- **Expected**: Should recommend Two Pair (4 cards) + low kicker for 5-card hand to thin deck
- **Notes**: Two pair detection/recommendation appears fundamentally broken; also missing BUG-007 padding logic

### BUG-022: Hand guidance UI confusing - best play vs discard recommendation unclear
- **Severity**: P3
- **Component**: Hand Guidance UI
- **Observed**: Shows "best play: pair" then projected score, then discard recommendation below - user mistook pair for final recommendation
- **Expected**: Clearer visual hierarchy showing discard recommendation as the primary action when it applies
- **Notes**: Feature IS working, but UI layout causes confusion

---

## Sprint Summary

| Sprint | Bugs Fixed | Focus Area |
|--------|------------|------------|
| 1 | BUG-010, BUG-013, BUG-014 | Hand Analyzer - Two pair, Debuff handling |
| 2 | BUG-007, BUG-011 | Hand Analyzer - Discard strategy, Padding |
| 3 | BUG-001, BUG-003 | Lua Bridge - Shop/Booster export |
| 4 | BUG-002, BUG-008, BUG-009, BUG-012, BUG-015 | Build Detector, Shop Advisor |
| 5 | BUG-016, BUG-017, BUG-018, BUG-019 | Score Preview/Engine - Debuffed cards, joker conditions |

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
