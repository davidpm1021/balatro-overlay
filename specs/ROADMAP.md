# Project Roadmap

Balatro Overlay Tracker — development roadmap and feature checklist.

**Test Coverage**: 299 tests passing
**Last Updated**: 2024-12-27

---

## Phase 1: Core Fixes (COMPLETE)

Foundation work to consolidate duplicate services and remove hardcoded data.

### Spec 001: Joker Database Consolidation ✅
- Deleted orphaned v2 services (JokerDataV2Service, JokerSynergyV2Service)
- Fixed joker rarity discrepancies (67 uncommon → 64, 17 rare → 20)
- Added missing position.sensitive flags (photograph, hanging_chad)
- Removed hardcoded JOKER_AFFINITIES from BuildDetectorService
- **Files**: jokers-complete.json, joker-data.service.ts

### Spec 002: Shop Advisor Refactoring ✅
- Removed ~175 lines hardcoded data (JOKER_KNOWLEDGE, BOSS_BLIND_EFFECTS)
- Added JSON loading from jokers-complete.json and bosses-complete.json
- Implemented interest threshold scoring (-2 per $5 breaking threshold)
- Added boss counter detection (+20 bonus for counter jokers)
- **Files**: shop-advisor.service.ts, bosses-complete.json
- **Tests**: +28 new tests

### Spec 003: Build Detector Completion ✅
- Implemented 60/30/10 weighted detection (joker/deck/hand level signals)
- Added hybrid build detection (secondary >= 70% of primary)
- Exposed getDeckSignals() and getHandLevelSignals() methods
- Removed duplicate BuildDetectorV2Service
- **Files**: build-detector.service.ts
- **Tests**: +41 new tests

### Spec 004: Bug Fixes ✅
- BUG-002: Added MIN_JOKER_SIGNAL_THRESHOLD (no false 30% on fresh run)
- BUG-004: Verified signal reactivity working (joker acquisition updates build)
- BUG-001: Planet cards scored correctly (type: 'planet', score: 62)
- BUG-003: Booster phase detection working (scoreBoosterContents() method)
- **Files**: build-detector.service.ts, shop-advisor.service.ts
- **Tests**: +20 new tests, +31 simulation tests

---

## Phase 2: Integration Testing (CURRENT)

**Goal**: Verify all features work with real Balatro gameplay.

### Test Checklist

#### Deck Tracker
- [ ] Card grid updates as cards are drawn
- [ ] Drawn cards dimmed/marked correctly
- [ ] Suit/rank filtering works
- [ ] Card count accurate

#### Shop Advisor
- [ ] Jokers scored with correct tier (S/A/B/C/D)
- [ ] Tarot cards scored appropriately
- [ ] Planet cards show "Hand level up" reason
- [ ] Vouchers scored with "Permanent upgrade" reason
- [ ] Booster packs show contents when opened
- [ ] Synergy bonuses appear when applicable (+30)
- [ ] Boss counter bonuses appear (+20)

#### Build Detection
- [ ] Fresh run shows 0% / "No build detected"
- [ ] Acquiring flush joker shows flush build emerging
- [ ] Confidence increases with more synergistic jokers
- [ ] Hybrid detection shows when secondary >= 70% primary
- [ ] Build updates immediately on joker acquisition

#### Score Preview
- [ ] Score breakdown matches actual score (within 5%)
- [ ] Hand type detected correctly
- [ ] Joker effects applied in order
- [ ] Projection shows min/avg/max range

#### Boss Blinds
- [ ] Boss warnings appear before boss rounds
- [ ] Debuff warnings shown (e.g., "Clubs debuffed")
- [ ] Counter jokers highlighted in shop

#### Economy
- [ ] Interest threshold warning at $25
- [ ] Economy jokers penalized in late game
- [ ] "Breaking interest" shown in shop reasons

#### Probability Panel
- [ ] Draw odds displayed
- [ ] Updates as deck changes
- [ ] Accurate hypergeometric calculation

### Bug Logging

Log any issues to `specs/BUGS.md`, then batch into Spec 005.

---

## Phase 3: Missing Features

Features identified in PROJECT_CONTEXT.md assessment that need implementation.

### 3.1 Run History (Not Built)
**Status**: Data structures exist, no persistence or UI

**Requirements**:
- [ ] Save run data to IndexedDB via Dexie.js
- [ ] Track: ante reached, jokers acquired, final score, win/loss
- [ ] UI: Run history list with filtering
- [ ] UI: Run statistics (win rate, avg ante, popular jokers)
- [ ] Data export (JSON/CSV)

**Estimated Scope**: New feature module, 4-5 files

### 3.2 Overlay Positioning Issues
**Status**: Falls behind fullscreen game despite alwaysOnTop workaround

**Requirements**:
- [ ] Investigate Electron window flags for game overlay mode
- [ ] Test DirectX/OpenGL overlay compatibility
- [ ] Add window position save/restore
- [ ] Add resize handles with min/max constraints
- [ ] Settings panel for position/size

**Estimated Scope**: Electron main.ts modifications, settings service

### 3.3 Joker Effect Descriptions
**Status**: Effects calculated but not explained to user

**Requirements**:
- [ ] Show joker effect text on hover/click
- [ ] Display current scaling values (e.g., "Ride the Bus: +12 Mult")
- [ ] Show trigger conditions (e.g., "Triggers on: Hearts")
- [ ] Indicate debuffed state visually

**Estimated Scope**: joker-display module enhancements

### 3.4 Scaling Joker Detection (Lua)
**Status**: `isScaling = false` hardcoded in bridge mod

**Requirements**:
- [ ] Detect scaling jokers from ability table
- [ ] Export current scaling values (extra chips, mult, xMult)
- [ ] Track scaling history per round
- [ ] Support: Ride the Bus, Green Joker, Red Card, etc.

**Estimated Scope**: bridge-mod/main.lua modifications

### 3.5 Consumables Display
**Status**: Not shown in overlay

**Requirements**:
- [ ] Display held Tarot cards
- [ ] Display held Planet cards
- [ ] Display held Spectral cards
- [ ] Show effect on hover

**Estimated Scope**: New consumables-display component

### 3.6 Voucher Tracking
**Status**: Not displayed

**Requirements**:
- [ ] Show purchased vouchers
- [ ] Indicate active effects
- [ ] Track voucher availability per ante

**Estimated Scope**: New voucher-display component

---

## Phase 4: Polish & Performance

### 4.1 Performance Optimizations
- [ ] Memoize DeckTrackerComponent.cardsBySuitAndRank()
- [ ] Cache joker data lookups in BuildDetectorService
- [ ] Reduce alwaysOnTop re-assertion frequency (500ms → 1000ms)
- [ ] Differential deck updates (only changed cards)

### 4.2 Error Handling
- [ ] Graceful fallback if joker JSON fails to load
- [ ] Handle file watcher disconnection
- [ ] Recovery from corrupt overlay_state.json

### 4.3 UI Polish
- [ ] Consistent theming across all panels
- [ ] Smooth animations for state changes
- [ ] Loading states for async operations
- [ ] Accessibility improvements (keyboard nav, screen reader)

### 4.4 Settings Panel
- [ ] Opacity slider
- [ ] Click-through toggle
- [ ] Panel visibility toggles
- [ ] Theme selection (dark/light/custom)
- [ ] Export/import settings

---

## Backlog (Future Considerations)

### Nice-to-Have Features
- [ ] Seeded run seed display
- [ ] Challenge mode detection
- [ ] Stake indicator
- [ ] Achievement tracking
- [ ] Community joker tier list integration
- [ ] Replay analysis from saved runs

### Platform Support
- [ ] Linux compatibility testing
- [ ] macOS compatibility testing
- [ ] Steam Deck optimization

### Advanced Intelligence
- [ ] Monte Carlo simulation for expected value
- [ ] Optimal discard suggestions
- [ ] "What-if" scenario analysis
- [ ] Win probability estimation

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 0.4.0 | 2024-12-27 | Phase 1 complete, 299 tests |
| 0.3.0 | 2024-12-26 | Spec 003 build detector |
| 0.2.0 | 2024-12-25 | Spec 002 shop advisor |
| 0.1.0 | 2024-12-24 | Spec 001 joker database |

---

## Contributing

1. Check this roadmap for open items
2. Create spec in `specs/` folder
3. Write failing tests first
4. Implement to pass tests
5. Run quality gates: `npm run build && npm run test && npm run lint`
6. Submit PR with spec reference
