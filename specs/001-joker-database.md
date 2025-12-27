# Spec 001: Joker Database Consolidation

## Source of Truth

- **Balatro Wiki**: https://balatrogame.fandom.com/wiki/Jokers
- **Target file**: `overlay-app/src/app/data/jokers-complete.json`
- **Current count**: 150 jokers in jokers-complete.json
- **Wiki count**: 150 jokers (verify against wiki)

## Problem Statement

Joker data is fragmented across 4+ locations:
1. `jokers-complete.json` (150 jokers) - intended source of truth
2. `joker-synergies.json` (79 jokers) - incomplete, 52% coverage
3. `BuildDetectorService` (~49 hardcoded jokers)
4. `ShopAdvisorService` (~90 hardcoded jokers)
5. `scoring-reference.json` (~100 joker effects)

Services use different data sources with inconsistent coverage.

## Requirements

### R1: Validate All 150 Jokers Against Wiki
**Acceptance Criteria:**
- [ ] Every joker ID matches wiki joker name (normalized)
- [ ] Every joker has correct rarity (common/uncommon/rare/legendary)
- [ ] Every joker has correct cost (base shop price)
- [ ] Every joker has correct effect description
- [ ] Document any discrepancies found

### R2: Consolidate joker-synergies.json into jokers-complete.json
**Acceptance Criteria:**
- [ ] All 79 synergy entries merged into jokers-complete.json
- [ ] Remaining 71 jokers have synergies field populated
- [ ] joker-synergies.json deleted
- [ ] SynergyGraphService updated to use jokers-complete.json

### R3: Single Data Loading Pattern
**Acceptance Criteria:**
- [ ] Create JokerDataService as single loader
- [ ] All services inject JokerDataService
- [ ] No direct HTTP/fetch calls in other services
- [ ] Data loaded once, cached in service

### R4: Delete Inline Hardcoded Joker Data
**Acceptance Criteria:**
- [ ] BuildDetectorService: remove JOKER_STRATEGY_TAGS
- [ ] ShopAdvisorService: remove JOKER_TIERS, SYNERGY_MAP
- [ ] BossAwarenessService: load boss data from JSON

## Failing Test Cases (Write First)

```typescript
// joker-data.service.spec.ts

describe('JokerDataService', () => {
  it('should load exactly 150 jokers', async () => {
    const service = TestBed.inject(JokerDataService);
    await service.initialize();
    expect(service.getAllJokers().length).toBe(150);
  });

  it('should have synergies for all jokers', () => {
    const service = TestBed.inject(JokerDataService);
    const jokers = service.getAllJokers();
    const missingSync = jokers.filter(j => !j.synergies || j.synergies.length === 0);
    expect(missingSync.length).toBe(0);
  });

  it('should match wiki joker names', () => {
    const service = TestBed.inject(JokerDataService);
    // List of all 150 wiki joker names
    const wikiJokers = [...]; // From wiki scrape
    const loadedNames = service.getAllJokers().map(j => j.name);
    expect(loadedNames.sort()).toEqual(wikiJokers.sort());
  });

  it('should have correct rarities', () => {
    const service = TestBed.inject(JokerDataService);
    // Wiki says: 76 common, 44 uncommon, 20 rare, 10 legendary
    const byRarity = service.getJokersByRarity();
    expect(byRarity.common.length).toBe(76);
    expect(byRarity.uncommon.length).toBe(44);
    expect(byRarity.rare.length).toBe(20);
    expect(byRarity.legendary.length).toBe(10);
  });
});

describe('BuildDetectorService', () => {
  it('should not have hardcoded joker data', () => {
    // Verify no JOKER_STRATEGY_TAGS constant exists
    const source = readFileSync('build-detector.service.ts', 'utf8');
    expect(source).not.toContain('JOKER_STRATEGY_TAGS');
    expect(source).not.toContain('strategies:');
  });
});

describe('ShopAdvisorService', () => {
  it('should not have hardcoded joker tiers', () => {
    const source = readFileSync('shop-advisor.service.ts', 'utf8');
    expect(source).not.toContain('JOKER_TIERS');
    expect(source).not.toContain('SYNERGY_MAP');
  });
});
```

## Files to Modify

| File | Action |
|------|--------|
| `overlay-app/src/app/data/jokers-complete.json` | Add synergies field to all 150 jokers |
| `overlay-app/src/app/core/services/joker-data.service.ts` | CREATE - single data loader |
| `strategy-intelligence/services/build-detector.service.ts` | Remove hardcoded data, inject JokerDataService |
| `strategy-intelligence/services/shop-advisor.service.ts` | Remove hardcoded data, inject JokerDataService |
| `strategy-intelligence/services/synergy-graph.service.ts` | Update to use JokerDataService |
| `strategy-intelligence/services/index.ts` | Update exports |

## Files to Delete

| File | Reason |
|------|--------|
| `strategy-intelligence/data/joker-synergies.json` | Merged into jokers-complete.json |
| `strategy-intelligence/services/build-detector-v2.service.ts` | Duplicate eliminated |
| `strategy-intelligence/services/shop-advisor-v2.service.ts` | Duplicate eliminated |

## Quality Gate Checklist

- [ ] `npm run build` passes
- [ ] `npm run test` passes
- [ ] `npm run lint` passes
- [ ] No console.error in browser
- [ ] 150 jokers load correctly
- [ ] All synergies populated
- [ ] No hardcoded joker data in services
- [ ] Wiki validation document created

## Wiki Validation Process

1. Scrape or manually verify all 150 joker names from wiki
2. Create `docs/wiki-validation.md` documenting:
   - Date validated
   - Discrepancies found
   - Resolutions applied
3. Add validation hash to jokers-complete.json metadata

## Dependencies

- None (can start immediately)

## Estimated Scope

- Files touched: 7
- Files deleted: 3
- New files: 2
- Test files: 1
