# Spec 011: Bug Fixes from QA Testing

## Summary

9 new bugs identified during manual QA testing session. Bugs are grouped by component and prioritized by severity (P1 > P2 > P3) and dependencies (data flow before UI).

**Open Bugs**: 12 total (3 previously reported + 9 new)
- **P1 (Critical)**: 5
- **P2 (Major)**: 6
- **P3 (Minor)**: 1

---

## Priority Order

### Group A: Hand Analyzer Critical Fixes (P1)

These affect core gameplay recommendations and should be fixed first.

---

### 1. BUG-010: Two pair not detected/recommended over single pair
**Severity**: P1 | **Component**: Hand Analyzer Service

**Problem**: Hand 6622 shows "Pair 66" instead of "Two Pair".

**Root Cause (Investigate)**:
- `detectHandType()` in `hand-calculator.service.ts:103-104` checks `pairCount >= 2` for two_pair
- `getRankCounts()` may be miscounting or duplicate cards not properly grouped
- Possible issue: card IDs are unique but ranks should be compared for grouping

**Fix Approach**:
1. Add unit test reproducing 6622 → pair bug
2. Debug `getRankCounts()` to verify count logic
3. Verify `pairCount` filter logic counts exactly 2-count ranks

**Acceptance Criteria**:
- [ ] 6622 hand returns `two_pair` not `pair`
- [ ] AA223 returns `two_pair` with AA22
- [ ] Existing pair detection still works

**Files**: `overlay-app/src/app/features/score-preview/services/hand-calculator.service.ts`

---

### 2. BUG-013 + BUG-014: Debuffed card handling
**Severity**: P1 | **Component**: Hand Analyzer Service

**Problem**:
- BUG-013: Best hand suggests pair 99 when one 9 is debuffed
- BUG-014: Debuffed cards CAN still form hand types, just don't contribute chips

**Root Cause (Investigate)**:
- `findBestHand()` in `hand-analyzer.service.ts:268-295` filters debuffed cards at line 270
- But debuffed cards DO count for hand type formation in actual Balatro
- Only the individual card's chips/mult contribution should be zero

**Fix Approach**:
1. Change approach: Include debuffed cards in hand type detection
2. In `calculateCombinationScore()`, set debuffed card chip value to 0
3. Keep debuffed filtering for the "cards to play" recommendation since they hurt score

**Acceptance Criteria**:
- [ ] AA999 with debuffed 9 detects as full house
- [ ] Score projection for debuffed cards shows 0 chips from that card
- [ ] "Best hand" can include debuffed cards when it helps hand type
- [ ] Discard recommendations still suggest discarding debuffed cards

**Files**:
- `overlay-app/src/app/features/hand-guidance/services/hand-analyzer.service.ts`
- `overlay-app/src/app/features/score-preview/services/hand-calculator.service.ts`

---

### 3. BUG-011: Best play doesn't consider discard as strategy
**Severity**: P1 | **Component**: Hand Analyzer Service

**Problem**: With 2 hands and 2 discards remaining, recommends "play pair JJ" when discarding to fish for better hand might be optimal.

**Root Cause (Investigate)**:
- `analyzeHand()` only evaluates current hand, not "should I discard?"
- No expected value calculation for discard vs play decision
- Missing context: remaining hands/discards budget, deck composition

**Fix Approach**:
1. Add `shouldDiscard()` method that calculates:
   - Current best hand score
   - Probability of improving (based on deck state)
   - Remaining hands/discards ratio
2. If (remaining discards > 0) AND (current hand is weak) AND (improvement likely):
   - Suggest "Discard X cards to improve"
3. Add discard recommendation to analysis output

**Acceptance Criteria**:
- [ ] When best hand is low (pair/high card) and discards remain, shows discard suggestion
- [ ] Discard suggestion identifies which cards to discard
- [ ] Does NOT suggest discard when hands = 1 (must play)
- [ ] Does NOT suggest discard when hand already strong (flush+)

**Files**: `overlay-app/src/app/features/hand-guidance/services/hand-analyzer.service.ts`

---

### 4. BUG-003: Shop advisor missing for buffoon packs
**Severity**: P1 | **Component**: Shop Advisor / Phase Visibility

**Problem**: No shop advisor overlay when opening buffoon packs.

**Root Cause (Investigate)**:
- `ShopOverlayComponent` template checks `recommendations().length > 0`
- `ShopAdvisorService.getEnhancedShopRecommendations()` uses `shopItems()`
- Booster pack contents likely in different state field (not `shop.items`)
- Phase detection works (shop-advisor shows in 'booster' phase per config)

**Fix Approach**:
1. Check game state structure during booster phase
2. Find where booster pack contents are stored
3. Add computed signal for booster contents
4. Create `getBoosterRecommendations()` that scores pack contents
5. ShopOverlayComponent should switch data source based on phase

**Acceptance Criteria**:
- [ ] Opening buffoon pack shows shop advisor
- [ ] Jokers in pack are scored and ranked
- [ ] Works for all booster pack types (Buffoon, Arcana, Celestial, etc.)

**Files**:
- `overlay-app/src/app/features/strategy-intelligence/services/shop-advisor.service.ts`
- `overlay-app/src/app/features/strategy-intelligence/components/shop-overlay.component.ts`
- `shared/models/game-state.model.ts` (check booster state structure)

---

### 5. BUG-001: Planet cards displayed as unknown jokers
**Severity**: P1 | **Component**: Shop Overlay / Card Display

**Problem**: Mars planet card shows as "JOKER 50 - Unknown joker".

**Root Cause (Investigate)**:
- Card type detection not distinguishing planets from jokers
- `item.type` may be incorrect in game state
- Or UI rendering logic assumes everything is a joker

**Fix Approach**:
1. Check how Lua bridge exports card types
2. Verify `ShopItem.type` field has correct value for planets
3. Update UI to handle planet/tarot/spectral display

**Acceptance Criteria**:
- [ ] Planet cards show as "PLANET" type
- [ ] Planet name displayed correctly (e.g., "Mars")
- [ ] Tarot and spectral cards also display correctly

**Files**:
- `bridge-mod/BalatroOverlay/main.lua` (type export)
- `overlay-app/src/app/features/strategy-intelligence/components/shop-overlay.component.ts`

---

### Group B: Shop Advisor Improvements (P2)

---

### 6. BUG-008: Joker tier values ignore conditions and game phase
**Severity**: P2 | **Component**: Shop Advisor

**Problem**: Shoot the Moon shows +13 mult but requires holding queens (1 of 4). Generic tier inflates conditional jokers.

**Root Cause (Investigate)**:
- `jokers-complete.json` has `tierByAnte` (early/mid/late) but no activation probability
- Flat tier score doesn't account for condition difficulty
- Some jokers are "always active" vs "sometimes active"

**Fix Approach**:
1. Add `activationProbability` field to joker JSON:
   - `1.0` = always active (Joker, Banner)
   - `0.75` = usually active (Sock and Buskin with face-heavy deck)
   - `0.25` = rarely active (Shoot the Moon - need queens in hand)
2. Multiply base tier score by activation probability
3. Context-aware: Pareidolia makes all cards face → Shoot the Moon becomes 1.0

**Acceptance Criteria**:
- [ ] Conditional jokers score lower than unconditional ones
- [ ] Activation probability visible in expanded analysis
- [ ] Synergy with enablers adjusts probability

**Files**:
- `overlay-app/src/app/data/jokers-complete.json`
- `overlay-app/src/app/features/strategy-intelligence/services/shop-advisor.service.ts`

---

### 7. BUG-012: Enabler jokers overvalued without synergy partners
**Severity**: P2 | **Component**: Build Detector

**Problem**: Pareidolia (all cards = face cards) shows 73% face cards build when no face card payoff jokers exist.

**Root Cause (Investigate)**:
- Build detector weights enablers same as payoffs
- Pareidolia has high `face_cards` affinity in JSON but provides no direct scoring
- Need to distinguish: enabler vs payoff jokers

**Fix Approach**:
1. Add `jokerRole` field to JSON: `'enabler' | 'payoff' | 'support' | 'economy'`
2. Enablers only contribute to build detection IF matching payoffs exist
3. Reduce enabler weight when no payoffs: `weight * 0.3`

**Acceptance Criteria**:
- [ ] Pareidolia alone doesn't trigger face_cards build
- [ ] Pareidolia + Smiley Face DOES trigger face_cards build
- [ ] Role visible in joker explanation

**Files**:
- `overlay-app/src/app/data/jokers-complete.json`
- `overlay-app/src/app/features/strategy-intelligence/services/build-detector.service.ts`

---

### 8. BUG-007: Best play doesn't add 5th card as free discard
**Severity**: P2 | **Component**: Hand Analyzer

**Problem**: Hand 8855 recommends two pair without suggesting adding a 5th card to thin deck.

**Root Cause (Investigate)**:
- `analyzeHand()` returns cards for best hand type only
- Doesn't consider "padding" strategy when hand type < 5 cards
- Missing: opportunity cost analysis for extra card slots

**Fix Approach**:
1. After finding best hand, check if `scoringCards.length < 5`
2. Identify lowest-value non-scoring cards in hand
3. Add suggestion: "Play with {low card} to thin deck"
4. Priority: debuffed cards > off-suit > low ranks

**Acceptance Criteria**:
- [ ] Two pair (4 cards) suggests adding 5th card
- [ ] Three of a kind (3 cards) suggests adding up to 2 cards
- [ ] Suggestion shows which cards to add
- [ ] Does NOT suggest adding cards that would hurt score

**Files**: `overlay-app/src/app/features/hand-guidance/services/hand-analyzer.service.ts`

---

### 9. BUG-002: Build detection shows confidence on empty state
**Severity**: P2 | **Component**: Build Detector

**Problem**: Fresh run with no jokers shows "Pairs 30%".

**Root Cause (Investigate)**:
- Deck composition signals contributing even with 0 jokers
- Standard deck has natural pair potential (4 of each rank)
- Build confidence should require SOME joker signal

**Fix Approach**:
1. Add minimum joker requirement: if `ownedJokers.length === 0`, return no build
2. Or: scale confidence by `min(1, jokerCount / 2)`
3. Early game with 0-1 jokers should show "No build yet"

**Acceptance Criteria**:
- [ ] 0 jokers = "No build detected" or 0% confidence
- [ ] 1 joker = reduced confidence (max ~40%)
- [ ] 2+ jokers = normal detection

**Files**: `overlay-app/src/app/features/strategy-intelligence/services/build-detector.service.ts`

---

### 10. BUG-015: No reroll recommendation logic
**Severity**: P2 | **Component**: Shop Advisor

**Problem**: Shop advisor doesn't advise when to reroll.

**Root Cause (Investigate)**:
- `ShopAdvisorService` evaluates items but never calculates reroll value
- Missing: interest threshold check, best item score vs reroll cost

**Fix Approach**:
1. Add `getRerollRecommendation()` method
2. Calculate: if money > $25 AND best item score < 60 → "Consider reroll"
3. Factor in: ante (late = less rerolls), remaining rerolls
4. Display in ShopOverlayComponent footer

**Acceptance Criteria**:
- [ ] Shows reroll suggestion when appropriate
- [ ] Accounts for interest threshold ($25)
- [ ] Considers best available item score
- [ ] Never suggests reroll if can't afford ($5)

**Files**:
- `overlay-app/src/app/features/strategy-intelligence/services/shop-advisor.service.ts`
- `overlay-app/src/app/features/strategy-intelligence/components/shop-overlay.component.ts`

---

### Group C: UI Polish (P3)

---

### 11. BUG-009: No visual indicator for unaffordable cards
**Severity**: P3 | **Component**: Shop Advisor

**Problem**: Cards costing more than current money appear identical to affordable ones.

**Root Cause (Investigate)**:
- `ShopOverlayComponent` doesn't check `item.cost > money`
- No visual styling for unaffordable state

**Fix Approach**:
1. Add computed signal: `isAffordable(item) = item.cost <= money`
2. Apply dimmed/crossed-out styling when unaffordable
3. Add "Can't afford" badge

**Acceptance Criteria**:
- [ ] Unaffordable items visually distinct (opacity, strikethrough, or badge)
- [ ] Affordability updates when money changes
- [ ] Clear visual indication (not subtle)

**Files**: `overlay-app/src/app/features/strategy-intelligence/components/shop-overlay.component.ts`

---

## Files to Modify

| File | Bugs |
|------|------|
| `hand-analyzer.service.ts` | BUG-010, BUG-013, BUG-014, BUG-011, BUG-007 |
| `hand-calculator.service.ts` | BUG-010, BUG-013 |
| `shop-advisor.service.ts` | BUG-003, BUG-008, BUG-015 |
| `shop-overlay.component.ts` | BUG-003, BUG-001, BUG-009 |
| `build-detector.service.ts` | BUG-012, BUG-002 |
| `jokers-complete.json` | BUG-008, BUG-012 |

---

## Test Requirements

Write failing tests FIRST for each bug:

### Hand Analyzer Tests
1. `it('should detect two pair from 6622')` - BUG-010
2. `it('should include debuffed cards in hand type detection')` - BUG-013
3. `it('should show 0 chips for debuffed cards in score')` - BUG-014
4. `it('should suggest discard when hand is weak and discards remain')` - BUG-011
5. `it('should suggest adding low cards to fill 5-card hand')` - BUG-007

### Shop Advisor Tests
1. `it('should show recommendations for buffoon pack contents')` - BUG-003
2. `it('should scale joker score by activation probability')` - BUG-008
3. `it('should recommend reroll when money > $25 and items weak')` - BUG-015
4. `it('should identify unaffordable items')` - BUG-009

### Build Detector Tests
1. `it('should return no build when 0 jokers owned')` - BUG-002
2. `it('should reduce enabler weight when no payoff jokers')` - BUG-012

---

## Quality Gates

- [ ] All 11 bugs have regression tests
- [ ] All existing tests still pass
- [ ] `npm run build` passes
- [ ] `npm run lint` passes
- [ ] Manual verification of each fix with live gameplay
