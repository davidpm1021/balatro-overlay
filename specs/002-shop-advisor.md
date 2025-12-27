# Spec 002: Shop Advisor Consolidation

## Source of Truth

- **Joker Data**: `overlay-app/src/app/data/jokers-complete.json` (after Spec 001)
- **Boss Data**: `overlay-app/src/app/data/bosses-complete.json`
- **Scoring Data**: `overlay-app/src/app/data/scoring-reference.json`
- **Service**: `strategy-intelligence/services/shop-advisor.service.ts` (single service)

## Problem Statement

Two shop advisor services exist:
1. `ShopAdvisorService` (v1) - 884 lines, hardcoded tier data
2. `ShopAdvisorV2Service` (v2) - 713 lines, loads from JSON

Both have similar functionality but:
- v1 is exported and used by components
- v2 is orphaned (not exported in index.ts)
- Neither validates data against wiki
- Score calculation logic duplicated

## Requirements

### R1: Delete v2, Keep Single ShopAdvisorService
**Acceptance Criteria:**
- [ ] ShopAdvisorV2Service deleted
- [ ] ShopAdvisorService is the only shop advisor
- [ ] No import references to deleted service

### R2: Remove Hardcoded Data, Use JSON
**Acceptance Criteria:**
- [ ] Remove JOKER_TIERS constant
- [ ] Remove SYNERGY_MAP constant
- [ ] Remove ALWAYS_BUY_JOKERS constant
- [ ] Inject JokerDataService for data access
- [ ] Load tier/synergy info from jokers-complete.json

### R3: Ante-Aware Scoring
**Acceptance Criteria:**
- [ ] Score adjusts based on current ante (1-8)
- [ ] Early game (ante 1-2): economy jokers boosted
- [ ] Late game (ante 6+): xMult jokers boosted
- [ ] Tier data has `tierByAnte.early`, `tierByAnte.mid`, `tierByAnte.late`

### R4: Boss Counter Integration
**Acceptance Criteria:**
- [ ] Service reads upcoming boss from GameStateService
- [ ] Jokers that counter upcoming boss get score boost
- [ ] Jokers weak to boss get score penalty
- [ ] Boss counter data from jokers-complete.json

### R5: Synergy Detection
**Acceptance Criteria:**
- [ ] Detects synergies with owned jokers
- [ ] Strong synergy: +15 points
- [ ] Medium synergy: +8 points
- [ ] Anti-synergy: -10 points
- [ ] Uses synergies array from jokers-complete.json

### R6: Interest Threshold Warning
**Acceptance Criteria:**
- [ ] Warns if buying drops money below $25 interest threshold
- [ ] Penalty applied to score if interest broken
- [ ] Green deck special case: no interest penalty

## Failing Test Cases (Write First)

```typescript
// shop-advisor.service.spec.ts

describe('ShopAdvisorService', () => {
  let service: ShopAdvisorService;
  let gameStateMock: jasmine.SpyObj<GameStateService>;

  beforeEach(() => {
    gameStateMock = jasmine.createSpyObj('GameStateService', [], {
      state: signal(mockGameState),
      jokers: signal([]),
      currentAnte: signal(1),
      blind: signal({ name: 'The Wall', isBoss: true }),
    });

    TestBed.configureTestingModule({
      providers: [
        ShopAdvisorService,
        { provide: GameStateService, useValue: gameStateMock },
      ],
    });
    service = TestBed.inject(ShopAdvisorService);
  });

  describe('score calculation', () => {
    it('should score S-tier jokers above 90', () => {
      const score = service.scoreJoker({ id: 'j_blueprint', ...blueprintData });
      expect(score.score).toBeGreaterThanOrEqual(90);
      expect(score.tier).toBe('S');
    });

    it('should apply synergy bonus when owning synergistic joker', () => {
      gameStateMock.jokers.and.returnValue([{ id: 'j_mime' }]);
      const withSynergy = service.scoreJoker(hangingChadData);

      gameStateMock.jokers.and.returnValue([]);
      const withoutSynergy = service.scoreJoker(hangingChadData);

      expect(withSynergy.score).toBeGreaterThan(withoutSynergy.score);
      expect(withSynergy.breakdown.synergyBonus).toBeGreaterThan(0);
    });

    it('should boost economy jokers in early game', () => {
      gameStateMock.currentAnte.and.returnValue(1);
      const earlyScore = service.scoreJoker(eggJokerData);

      gameStateMock.currentAnte.and.returnValue(7);
      const lateScore = service.scoreJoker(eggJokerData);

      expect(earlyScore.score).toBeGreaterThan(lateScore.score);
    });

    it('should boost jokers that counter upcoming boss', () => {
      gameStateMock.blind.and.returnValue({ name: 'The Wall', isBoss: true });
      const score = service.scoreJoker(jokerThatCountersWall);

      expect(score.breakdown.bossPreparation).toBeGreaterThan(0);
      expect(score.reasoning).toContain('counters The Wall');
    });

    it('should apply interest penalty when purchase breaks threshold', () => {
      gameStateMock.state.and.returnValue({
        ...mockGameState,
        progress: { money: 27 }
      });

      const score = service.scoreJoker({ cost: 5, ...jokerData });
      expect(score.breakdown.economyPenalty).toBeGreaterThan(0);
    });
  });

  describe('recommendations', () => {
    it('should return shop items sorted by score descending', () => {
      const recs = service.getShopRecommendations();
      for (let i = 1; i < recs.length; i++) {
        expect(recs[i - 1].score).toBeGreaterThanOrEqual(recs[i].score);
      }
    });

    it('should include synergy reasons in recommendation', () => {
      gameStateMock.jokers.and.returnValue([{ id: 'j_blueprint' }]);
      const recs = service.getShopRecommendations();
      const hasSynergyReason = recs.some(r => r.synergiesWithOwned.length > 0);
      expect(hasSynergyReason).toBeTrue();
    });
  });
});

describe('No v2 service exists', () => {
  it('should not have ShopAdvisorV2Service file', () => {
    const fs = require('fs');
    const exists = fs.existsSync('shop-advisor-v2.service.ts');
    expect(exists).toBeFalse();
  });
});
```

## Files to Modify

| File | Action |
|------|--------|
| `strategy-intelligence/services/shop-advisor.service.ts` | Refactor to use JokerDataService |
| `strategy-intelligence/services/index.ts` | Remove v2 export if present |
| `strategy-intelligence/components/shop-overlay.component.ts` | Verify uses ShopAdvisorService |

## Files to Delete

| File | Reason |
|------|--------|
| `strategy-intelligence/services/shop-advisor-v2.service.ts` | Duplicate eliminated |

## Quality Gate Checklist

- [ ] `npm run build` passes
- [ ] `npm run test` passes
- [ ] `npm run lint` passes
- [ ] No references to ShopAdvisorV2Service
- [ ] Shop overlay displays recommendations
- [ ] Scores adjust by ante correctly
- [ ] Synergy detection works
- [ ] Boss counter bonus applied

## Score Calculation Formula

```
BaseScore = TIER_SCORES[tierByAnte[phase]]  // S=95, A=80, B=60, C=40, D=20

SynergyBonus = sum of:
  - +15 per strong synergy with owned joker
  - +8 per medium synergy with owned joker
  - -10 per anti-synergy with owned joker
  (capped at +30 / -20)

BuildFitBonus = joker.builds[detectedBuild] * 0.3

AnteAdjustment:
  - Early (ante 1-2) + economy joker: +20
  - Late (ante 6+) + economy joker: -30

BossPreparation:
  - Hard counter to upcoming boss: +20
  - Soft counter: +10
  - Weak to boss: -10

EconomyPenalty:
  - If purchase drops below $25: penalty = min(10, dollars_below)

FINAL = clamp(0, 100, Base + Synergy + BuildFit + Ante + Boss - Economy)
```

## Dependencies

- **Requires**: Spec 001 (JokerDataService) completed first

## Estimated Scope

- Files touched: 3
- Files deleted: 1
- Test files: 1
