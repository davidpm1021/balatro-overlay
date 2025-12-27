# Spec 003: Build Detector Consolidation

## Source of Truth

- **Joker Data**: `overlay-app/src/app/data/jokers-complete.json` (after Spec 001)
- **Strategy Types**: `shared/models/strategy.model.ts`
- **Service**: `strategy-intelligence/services/build-detector.service.ts` (single service)

## Problem Statement

Two build detector services exist:
1. `BuildDetectorService` (v1) - 660 lines, ~49 hardcoded joker strategy tags
2. `BuildDetectorV2Service` (v2) - 684 lines, loads from JSON

Both detect player "build" (flush, pairs, mult stacking, etc.) but:
- v1 is exported and used by components
- v2 is orphaned (not exported in index.ts)
- v1 has hardcoded JOKER_STRATEGY_TAGS
- Detection algorithms differ slightly

## Requirements

### R1: Delete v2, Keep Single BuildDetectorService
**Acceptance Criteria:**
- [ ] BuildDetectorV2Service deleted
- [ ] BuildDetectorService is the only build detector
- [ ] No import references to deleted service

### R2: Remove Hardcoded Strategy Tags, Use JSON
**Acceptance Criteria:**
- [ ] Remove JOKER_STRATEGY_TAGS constant
- [ ] Inject JokerDataService for joker strategy data
- [ ] Use `joker.strategies[]` array from jokers-complete.json
- [ ] Each joker's strategy affinity from JSON

### R3: Weighted Detection Algorithm
**Acceptance Criteria:**
- [ ] Detection uses weighted signals:
  - Joker signal: 60% weight
  - Deck composition: 30% weight
  - Hand level signal: 10% weight
- [ ] Returns confidence score 0-100 for each strategy
- [ ] Detects 14 strategy types

### R4: Hybrid Build Detection
**Acceptance Criteria:**
- [ ] Primary build = highest confidence
- [ ] Secondary build = second highest (if >= 70% of primary)
- [ ] `isHybrid` flag when secondary qualifies
- [ ] Returns both primary and secondary strategies

### R5: Deck Composition Signals
**Acceptance Criteria:**
- [ ] Suit concentration (flush potential)
- [ ] Rank coverage (straight potential)
- [ ] Pair density (pairs potential)
- [ ] Fibonacci card count (2,3,5,8,A)
- [ ] Face card count (J,Q,K)

### R6: Real-time Updates
**Acceptance Criteria:**
- [ ] Computed signals react to GameStateService changes
- [ ] Detection recalculates when jokers change
- [ ] Detection recalculates when deck changes
- [ ] No manual refresh needed

## Strategy Types

The 14 strategy types to detect:

| Type | Description |
|------|-------------|
| `flush` | Building toward flush hands |
| `straight` | Building toward straight hands |
| `pairs` | Pairs, two pair, three/four of a kind |
| `face_cards` | Face card focused (Scary Face, Photograph) |
| `mult_stacking` | Additive mult jokers |
| `xmult_scaling` | Multiplicative xMult jokers |
| `chip_stacking` | High chip builds |
| `retrigger` | Card retrigger effects |
| `economy` | Money generation focus |
| `fibonacci` | Fibonacci card focus (2,3,5,8,A) |
| `steel_cards` | Steel card synergies |
| `glass_cards` | Glass card synergies |
| `stone_cards` | Stone card synergies |
| `lucky_cards` | Lucky card synergies |

## Failing Test Cases (Write First)

```typescript
// build-detector.service.spec.ts

describe('BuildDetectorService', () => {
  let service: BuildDetectorService;
  let gameStateMock: jasmine.SpyObj<GameStateService>;
  let jokerDataMock: jasmine.SpyObj<JokerDataService>;

  beforeEach(() => {
    gameStateMock = jasmine.createSpyObj('GameStateService', [], {
      state: signal(mockGameState),
      jokers: signal([]),
      deck: signal(mockDeck),
      handLevels: signal([]),
    });

    jokerDataMock = jasmine.createSpyObj('JokerDataService', ['getJoker', 'getAllJokers']);
    jokerDataMock.getJoker.and.callFake((id: string) => mockJokerData[id]);

    TestBed.configureTestingModule({
      providers: [
        BuildDetectorService,
        { provide: GameStateService, useValue: gameStateMock },
        { provide: JokerDataService, useValue: jokerDataMock },
      ],
    });
    service = TestBed.inject(BuildDetectorService);
  });

  describe('joker signal detection', () => {
    it('should detect flush build from flush jokers', () => {
      gameStateMock.jokers.and.returnValue([
        { id: 'j_droll', name: 'Droll Joker' },
        { id: 'j_tribe', name: 'The Tribe' },
      ]);

      const detected = service.detectedBuild();
      expect(detected.primary.type).toBe('flush');
      expect(detected.primary.confidence).toBeGreaterThan(70);
    });

    it('should detect xmult_scaling from scaling jokers', () => {
      gameStateMock.jokers.and.returnValue([
        { id: 'j_obelisk', name: 'Obelisk' },
        { id: 'j_hologram', name: 'Hologram' },
      ]);

      const detected = service.detectedBuild();
      expect(detected.primary.type).toBe('xmult_scaling');
    });

    it('should detect hybrid when secondary >= 70% of primary', () => {
      gameStateMock.jokers.and.returnValue([
        { id: 'j_droll', name: 'Droll Joker' },    // flush
        { id: 'j_tribe', name: 'The Tribe' },      // flush
        { id: 'j_jolly', name: 'Jolly Joker' },    // pairs
        { id: 'j_zany', name: 'Zany Joker' },      // pairs
      ]);

      const detected = service.detectedBuild();
      expect(detected.isHybrid).toBeTrue();
      expect(detected.secondary).toBeDefined();
    });
  });

  describe('deck signal detection', () => {
    it('should boost flush confidence with suit concentration', () => {
      // Deck with 15 hearts, 10 other suits
      const flushDeck = createDeckWithSuitConcentration('hearts', 15);
      gameStateMock.deck.and.returnValue(flushDeck);

      const signals = service.getDeckSignals();
      expect(signals.suitConcentration).toBeGreaterThan(0.4);
    });

    it('should boost straight confidence with consecutive ranks', () => {
      // Deck with A through 10 of mixed suits
      const straightDeck = createDeckWithRankCoverage(['A', 'K', 'Q', 'J', '10', '9', '8', '7', '6', '5']);
      gameStateMock.deck.and.returnValue(straightDeck);

      const signals = service.getDeckSignals();
      expect(signals.rankCoverage).toBeGreaterThan(0.7);
    });

    it('should detect fibonacci potential', () => {
      // Deck with multiple 2,3,5,8,A cards
      const fibDeck = createFibonacciDeck();
      gameStateMock.deck.and.returnValue(fibDeck);

      const signals = service.getDeckSignals();
      expect(signals.fibonacciCount).toBeGreaterThan(10);
    });
  });

  describe('hand level signal', () => {
    it('should boost strategy matching high-level hand', () => {
      gameStateMock.handLevels.and.returnValue([
        { handType: 'flush', level: 8 },
        { handType: 'pair', level: 2 },
      ]);

      const signals = service.getHandLevelSignals();
      expect(signals.flush).toBeGreaterThan(signals.pairs);
    });
  });

  describe('weighted combination', () => {
    it('should weight joker signal at 60%', () => {
      // Test that joker signal contributes 60% to final score
      const result = service.calculateStrategyConfidence('flush', {
        jokerSignal: 100,
        deckSignal: 0,
        handLevelSignal: 0,
      });
      expect(result).toBe(60);
    });

    it('should weight deck signal at 30%', () => {
      const result = service.calculateStrategyConfidence('flush', {
        jokerSignal: 0,
        deckSignal: 100,
        handLevelSignal: 0,
      });
      expect(result).toBe(30);
    });

    it('should weight hand level signal at 10%', () => {
      const result = service.calculateStrategyConfidence('flush', {
        jokerSignal: 0,
        deckSignal: 0,
        handLevelSignal: 100,
      });
      expect(result).toBe(10);
    });
  });
});

describe('No v2 service exists', () => {
  it('should not have BuildDetectorV2Service file', () => {
    const fs = require('fs');
    const exists = fs.existsSync('build-detector-v2.service.ts');
    expect(exists).toBeFalse();
  });
});

describe('No hardcoded joker data', () => {
  it('should not contain JOKER_STRATEGY_TAGS', () => {
    const source = readFileSync('build-detector.service.ts', 'utf8');
    expect(source).not.toContain('JOKER_STRATEGY_TAGS');
    expect(source).not.toContain('const strategies =');
  });
});
```

## Files to Modify

| File | Action |
|------|--------|
| `strategy-intelligence/services/build-detector.service.ts` | Refactor to use JokerDataService, remove hardcoded data |
| `strategy-intelligence/services/index.ts` | Remove v2 export, ensure v1 exported |
| `shared/models/strategy.model.ts` | Ensure all 14 strategy types defined |

## Files to Delete

| File | Reason |
|------|--------|
| `strategy-intelligence/services/build-detector-v2.service.ts` | Duplicate eliminated |

## Quality Gate Checklist

- [ ] `npm run build` passes
- [ ] `npm run test` passes
- [ ] `npm run lint` passes
- [ ] No references to BuildDetectorV2Service
- [ ] No JOKER_STRATEGY_TAGS constant
- [ ] All 14 strategy types detected
- [ ] Hybrid detection works
- [ ] Deck signals calculated correctly

## Detection Algorithm

```
For each StrategyType:

1. JOKER SIGNAL (60%)
   sum = 0
   for each owned joker:
     affinity = joker.strategies[strategyType] ?? 0
     sum += affinity
   jokerSignal = normalize(sum, 0, 500) * 100

2. DECK SIGNAL (30%)
   Varies by strategy:
   - flush: max suit concentration
   - straight: rank coverage (13 consecutive)
   - pairs: pair density (ranks with 2+ cards)
   - fibonacci: count of 2,3,5,8,A cards
   - face_cards: count of J,Q,K cards
   deckSignal = normalize(metric, minExpected, maxExpected) * 100

3. HAND LEVEL SIGNAL (10%)
   For strategy's target hand type:
   handLevelSignal = normalize(level, 1, 10) * 100

4. WEIGHTED COMBINATION
   confidence = (jokerSignal * 0.6) + (deckSignal * 0.3) + (handLevelSignal * 0.1)

5. RANK STRATEGIES
   Sort by confidence descending
   primary = strategies[0]
   if strategies[1].confidence >= primary.confidence * 0.7:
     secondary = strategies[1]
     isHybrid = true
```

## Dependencies

- **Requires**: Spec 001 (JokerDataService) completed first

## Estimated Scope

- Files touched: 3
- Files deleted: 1
- Test files: 1
