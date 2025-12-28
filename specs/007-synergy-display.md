# Spec 007: Synergy Display Panel

**Status**: Implemented
**Priority**: High (Product Vision Priority #1)
**Created**: 2024-12-28

---

## Overview

Replace the current joker list with an educational **Synergy Display** that groups jokers by their relationships and explains why they work together. This is the highest-priority feature from the Product Vision, addressing the core need: helping new players understand which jokers synergize.

### Current State
- `joker-bar.component.ts` displays jokers as a flat list
- Each joker shows: name, description, scaling value, edition, sell value
- No visual indication of relationships between jokers
- No explanation of why jokers are good together

### Target State
- Jokers grouped by synergy clusters with visual connections
- Each group includes an always-visible explanation
- Orphan jokers (no synergies) flagged with guidance
- Strength indicators (strong/medium/weak) on relationships

---

## User Stories

### US-1: See Synergy Groups
**As a** new player
**I want to** see which of my jokers work together
**So that** I understand why certain combinations are powerful

**Acceptance Criteria**:
- Jokers are visually grouped by shared synergies
- Group header shows synergy type (e.g., "Flush Synergy", "Scaling Pair")
- Joker count shown per group

### US-2: Understand Why Jokers Synergize
**As a** learning player
**I want to** read an explanation of why jokers work together
**So that** I can internalize the pattern for future runs

**Acceptance Criteria**:
- Each synergy group has 1-2 sentence explanation (always visible, not tooltip)
- Explanation uses plain language, not jargon
- Specific joker names referenced in explanation

### US-3: Identify Orphan Jokers
**As a** player optimizing my build
**I want to** know which jokers don't synergize with my others
**So that** I can consider selling them

**Acceptance Criteria**:
- Jokers with no synergies shown in "No Synergy" section
- Each orphan has guidance: "Consider selling" or "Waiting for partner"
- Orphans visually distinct (dimmed or separated)

### US-4: See Synergy Strength
**As a** player choosing between options
**I want to** know which synergies are strongest
**So that** I can prioritize my strategy

**Acceptance Criteria**:
- Strong synergies highlighted (gold/bright indicator)
- Medium synergies shown normally
- Weak synergies shown subtle (gray indicator)

---

## Technical Design

### Architecture

```
synergy-display/
├── synergy-display.component.ts      # Main panel (replaces joker-bar in sidebar)
├── synergy-group.component.ts        # A single synergy cluster
├── synergy-joker-card.component.ts   # Joker card with synergy indicators
└── synergy-display.service.ts        # Grouping logic and computed state
```

### Data Flow

```
GameStateService.state().jokers[]
    ↓
SynergyDisplayService.computeSynergyGroups()
    ↓ uses
SynergyGraphService.findSynergiesBetween(jokerIds)
    ↓
SynergyGroup[] (computed signal)
    ↓
synergy-display.component template
```

### Key Interfaces

```typescript
// New interfaces for Spec 007

interface SynergyGroup {
  id: string;                          // Unique group identifier
  type: SynergyGroupType;              // 'direct' | 'strategy' | 'orphan'
  label: string;                       // "Flush Synergy", "Scaling Pair", "No Synergy"
  explanation: string;                 // Always-visible explanation text
  jokerIds: string[];                  // Jokers in this group
  strength: SynergyStrength | null;    // Overall group strength (null for orphans)
  strategyType?: StrategyType;         // If grouped by strategy
}

type SynergyGroupType =
  | 'direct'      // Jokers with explicit synergiesWith relationships
  | 'strategy'    // Jokers sharing high affinity for same strategy
  | 'orphan';     // Jokers with no connections

interface SynergyConnection {
  jokerA: string;
  jokerB: string;
  strength: SynergyStrength;
  reason: string;
}
```

### Grouping Algorithm

The `SynergyDisplayService` will group jokers using this priority:

1. **Direct Synergies First**: Use `findSynergiesBetween()` to find explicit relationships
2. **Strategy Clusters**: Group remaining jokers by shared `StrategyType` (affinity >= 70)
3. **Orphans Last**: Any joker not in a group goes to "No Synergy"

```typescript
// Pseudocode for grouping algorithm

computeSynergyGroups(jokerIds: string[]): SynergyGroup[] {
  const groups: SynergyGroup[] = [];
  const assigned = new Set<string>();

  // Step 1: Find direct synergy clusters
  const directMatches = synergyGraph.findSynergiesBetween(jokerIds);
  const directClusters = clusterByConnections(directMatches);

  for (const cluster of directClusters) {
    groups.push({
      type: 'direct',
      label: inferClusterLabel(cluster),        // e.g., "Flush Synergy (3 jokers)"
      explanation: generateExplanation(cluster), // e.g., "These all trigger on flush hands..."
      jokerIds: cluster.jokerIds,
      strength: cluster.strongestConnection,
    });
    cluster.jokerIds.forEach(id => assigned.add(id));
  }

  // Step 2: Group remaining by strategy
  const remaining = jokerIds.filter(id => !assigned.has(id));
  const strategyGroups = groupByStrategy(remaining, minAffinity: 70);

  for (const stratGroup of strategyGroups) {
    groups.push({
      type: 'strategy',
      label: `${stratGroup.strategyName} Jokers`,
      explanation: getStrategyExplanation(stratGroup.strategy),
      jokerIds: stratGroup.jokerIds,
      strength: 'medium',
      strategyType: stratGroup.strategy,
    });
    stratGroup.jokerIds.forEach(id => assigned.add(id));
  }

  // Step 3: Orphans
  const orphans = jokerIds.filter(id => !assigned.has(id));
  if (orphans.length > 0) {
    groups.push({
      type: 'orphan',
      label: 'No Synergy',
      explanation: "These don't connect with your other jokers. Consider selling or finding partners.",
      jokerIds: orphans,
      strength: null,
    });
  }

  return groups;
}
```

### Explanation Generation

Explanations must be specific and educational. Examples:

| Synergy Type | Example Explanation |
|--------------|---------------------|
| **Flush (direct)** | "Lusty Joker and Bloodstone both gain power when you score Hearts. Play heart flushes to maximize both." |
| **Scaling pair** | "Ice Cream and Banner both grow stronger as you play hands. They're building toward late-game power." |
| **Face card** | "Triboulet and Baron both multiply when you score Kings and Queens. Prioritize face cards in your plays." |
| **Retrigger** | "Hanging Chad retriggers the first card played. Pair with high-value single cards like Steel King." |
| **Orphan** | "Egg generates money but doesn't combo with your flush jokers. Consider selling once it pays off." |

Explanation templates stored in service, populated with joker names dynamically.

---

## Component Specifications

### SynergyDisplayComponent

**File**: `overlay-app/src/app/features/synergy-display/synergy-display.component.ts`

```typescript
@Component({
  selector: 'app-synergy-display',
  imports: [CommonModule, SynergyGroupComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="synergy-display">
      <header class="synergy-header">
        <span class="label">Your Synergies</span>
        <span class="count">{{ jokerCount() }}/5</span>
      </header>

      @if (groups().length === 0) {
        <div class="empty-state">
          <p>No jokers yet</p>
          <p class="hint">Jokers you acquire will appear here, grouped by how they work together.</p>
        </div>
      } @else {
        <div class="groups-container">
          @for (group of groups(); track group.id) {
            <app-synergy-group
              [group]="group"
              [jokers]="getJokersForGroup(group)"
            />
          }
        </div>
      }
    </section>
  `,
})
export class SynergyDisplayComponent {
  private synergyDisplayService = inject(SynergyDisplayService);
  private gameStateService = inject(GameStateService);

  groups = this.synergyDisplayService.groups;
  jokerCount = computed(() => this.gameStateService.state()?.jokers.length ?? 0);

  getJokersForGroup(group: SynergyGroup): Joker[] {
    // Map joker IDs to full joker data from game state
  }
}
```

### SynergyGroupComponent

**File**: `overlay-app/src/app/features/synergy-display/synergy-group.component.ts`

```typescript
@Component({
  selector: 'app-synergy-group',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="synergy-group" [class]="groupTypeClass()">
      <header class="group-header">
        <span class="group-label">{{ group().label }}</span>
        @if (group().strength) {
          <span class="strength-badge" [class]="group().strength">
            {{ strengthLabel() }}
          </span>
        }
      </header>

      <div class="group-jokers">
        @for (joker of jokers(); track joker.id) {
          <app-synergy-joker-card [joker]="joker" [isOrphan]="group().type === 'orphan'" />
        }
      </div>

      <p class="group-explanation">{{ group().explanation }}</p>
    </div>
  `,
})
export class SynergyGroupComponent {
  group = input.required<SynergyGroup>();
  jokers = input.required<Joker[]>();

  groupTypeClass = computed(() => `group-${this.group().type}`);
  strengthLabel = computed(() => {
    const s = this.group().strength;
    if (s === 'strong') return 'Strong';
    if (s === 'medium') return 'Good';
    if (s === 'weak') return 'Weak';
    return '';
  });
}
```

### SynergyJokerCardComponent

**File**: `overlay-app/src/app/features/synergy-display/synergy-joker-card.component.ts`

Simplified joker card optimized for synergy display:

```typescript
@Component({
  selector: 'app-synergy-joker-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="synergy-joker-card" [class.orphan]="isOrphan()" [class]="rarityClass()">
      <div class="joker-name">{{ joker().name }}</div>

      @if (joker().scalingValue) {
        <div class="scaling-value">{{ joker().scalingValue }}</div>
      }

      @if (isOrphan()) {
        <div class="orphan-hint">{{ orphanGuidance() }}</div>
      }
    </div>
  `,
})
export class SynergyJokerCardComponent {
  joker = input.required<Joker>();
  isOrphan = input<boolean>(false);

  rarityClass = computed(() => `rarity-${this.joker().rarity}`);

  orphanGuidance = computed(() => {
    const j = this.joker();
    if (j.generatesMoney) return 'Economy joker — keep for income';
    if (j.sellValue >= 5) return 'High sell value — consider cashing out';
    return 'Looking for synergy partner';
  });
}
```

### SynergyDisplayService

**File**: `overlay-app/src/app/features/synergy-display/synergy-display.service.ts`

```typescript
@Injectable({ providedIn: 'root' })
export class SynergyDisplayService {
  private gameStateService = inject(GameStateService);
  private synergyGraphService = inject(SynergyGraphService);

  // Main computed signal - groups update reactively when jokers change
  readonly groups = computed(() => {
    const jokers = this.gameStateService.state()?.jokers ?? [];
    if (jokers.length === 0) return [];

    const jokerIds = jokers.map(j => j.id);
    return this.computeSynergyGroups(jokerIds);
  });

  private computeSynergyGroups(jokerIds: string[]): SynergyGroup[] {
    // Implementation per algorithm above
  }

  private generateExplanation(cluster: DirectCluster): string {
    // Template-based explanation generation
  }

  private inferClusterLabel(cluster: DirectCluster): string {
    // Infer label from shared strategies/tags
  }
}
```

---

## UI Mockup

```
┌─────────────────────────────────────────────────┐
│ YOUR SYNERGIES                            3/5   │
├─────────────────────────────────────────────────┤
│                                                 │
│ ┌─────────────────────────────────────────────┐ │
│ │ FLUSH SYNERGY (3 jokers)          [Strong]  │ │
│ │ ┌─────────┐ ┌─────────┐ ┌─────────┐         │ │
│ │ │  Lusty  │ │  Blood- │ │ Smeared │         │ │
│ │ │  Joker  │ │  stone  │ │  Joker  │         │ │
│ │ │   ♥     │ │   ♥     │ │   ♥♦    │         │ │
│ │ └─────────┘ └─────────┘ └─────────┘         │ │
│ │                                             │ │
│ │ Lusty Joker and Bloodstone both gain power  │ │
│ │ when you score Hearts. Smeared Joker makes  │ │
│ │ Diamonds count as Hearts too — play any     │ │
│ │ red flush to trigger all three!             │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ ┌─────────────────────────────────────────────┐ │
│ │ NO SYNERGY                                  │ │
│ │ ┌─────────┐                                 │ │
│ │ │   Egg   │  Economy joker — keep for       │ │
│ │ │   $$$   │  income, doesn't help flushes   │ │
│ │ └─────────┘                                 │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## Styling

### Color Scheme (Tailwind classes)

| Element | Light | Dark | Class |
|---------|-------|------|-------|
| Strong synergy badge | Gold | Amber | `bg-amber-500/20 text-amber-300` |
| Medium synergy badge | Blue | Sky | `bg-sky-500/20 text-sky-300` |
| Weak synergy badge | Gray | Slate | `bg-slate-500/20 text-slate-400` |
| Orphan section | Dimmed | Dark gray | `bg-slate-800/50 opacity-75` |
| Group border | — | Subtle | `border border-slate-700` |
| Explanation text | — | Muted | `text-slate-400 text-sm` |

### Joker Card Rarity Colors

| Rarity | Border Color |
|--------|--------------|
| Common | `border-slate-500` |
| Uncommon | `border-green-500` |
| Rare | `border-blue-500` |
| Legendary | `border-purple-500` |

---

## Test Plan

### Unit Tests (synergy-display.service.spec.ts)

```typescript
describe('SynergyDisplayService', () => {
  describe('computeSynergyGroups', () => {
    it('should create direct synergy group for jokers with explicit synergies', () => {
      // Lusty Joker + Bloodstone = direct synergy
    });

    it('should create strategy group for jokers sharing strategy affinity >= 70', () => {
      // Multiple flush jokers without direct synergies
    });

    it('should place jokers with no connections in orphan group', () => {
      // Egg alone = orphan
    });

    it('should return empty array when no jokers', () => {});

    it('should handle single joker as orphan', () => {});

    it('should prioritize direct synergies over strategy groups', () => {
      // Joker in direct cluster shouldn't also appear in strategy group
    });

    it('should correctly identify strongest connection in cluster', () => {
      // 2 strong + 1 medium = group strength is strong
    });
  });

  describe('generateExplanation', () => {
    it('should include joker names in explanation', () => {});
    it('should explain the synergy mechanic', () => {});
    it('should provide actionable guidance', () => {});
  });
});
```

### Component Tests

```typescript
describe('SynergyDisplayComponent', () => {
  it('should render empty state when no jokers', () => {});
  it('should render synergy groups', () => {});
  it('should display joker count', () => {});
});

describe('SynergyGroupComponent', () => {
  it('should show group label and strength badge', () => {});
  it('should render all jokers in group', () => {});
  it('should display explanation text', () => {});
  it('should apply orphan styling for orphan groups', () => {});
});
```

### Integration Tests

```typescript
describe('Synergy Display Integration', () => {
  it('should update groups when jokers change in game state', () => {
    // Acquire new joker → groups recompute
  });

  it('should handle real synergy data from joker-synergies.json', () => {
    // Use actual joker IDs and verify groupings
  });
});
```

---

## Migration Plan

### Phase 1: Add New Components (Non-Breaking)
1. Create `synergy-display/` feature folder
2. Implement `SynergyDisplayService`
3. Implement `SynergyDisplayComponent`, `SynergyGroupComponent`, `SynergyJokerCardComponent`
4. Write tests

### Phase 2: Feature Flag Integration
1. Add `showSynergyDisplay` setting (default: true)
2. Conditionally render synergy-display OR joker-bar based on setting
3. Allow users to toggle between old/new view

### Phase 3: Replace Joker Bar
1. Update sidebar layout to use synergy-display
2. Remove joker-bar from default layout
3. Keep joker-bar available for settings toggle

### Phase 4: Cleanup (Future)
1. Deprecate joker-bar component
2. Remove feature flag once stable

---

## Files to Create

| File | Type | Purpose |
|------|------|---------|
| `synergy-display/synergy-display.component.ts` | Component | Main panel |
| `synergy-display/synergy-group.component.ts` | Component | Single group |
| `synergy-display/synergy-joker-card.component.ts` | Component | Joker card |
| `synergy-display/synergy-display.service.ts` | Service | Grouping logic |
| `synergy-display/synergy-display.service.spec.ts` | Test | Service tests |
| `synergy-display/synergy-display.component.spec.ts` | Test | Component tests |
| `shared/models/synergy-group.model.ts` | Model | New interfaces |

## Files to Modify

| File | Change |
|------|--------|
| `app.component.ts` or sidebar layout | Add synergy-display to layout |
| `shared/models/index.ts` | Export new interfaces |

---

## Dependencies

### Existing (No Changes Needed)
- `SynergyGraphService` — `findSynergiesBetween()` provides core data
- `joker-synergies.json` — Contains all synergy relationships
- `GameStateService` — Provides current jokers

### New Dependencies
- None — all infrastructure exists

---

## Success Criteria

### Functional
- [ ] Jokers grouped by synergy relationships
- [ ] Each group has always-visible explanation
- [ ] Orphan jokers shown separately with guidance
- [ ] Strength indicators displayed (strong/medium/weak)
- [ ] Groups update reactively when jokers change

### Educational (from Product Vision)
- [ ] New player can identify synergy groups after one run
- [ ] Explanations use plain language, not jargon
- [ ] Player understands why jokers are grouped together

### Quality Gates
- [ ] All tests pass: `npm run test`
- [ ] Build succeeds: `npm run build`
- [ ] Lint passes: `npm run lint`
- [ ] No regressions in existing functionality

---

## Open Questions

1. **Should clicking a group expand more detail?**
   Recommendation: Yes, expand to show individual synergy connections with reasons.

2. **Should we show "missing synergy partners" (jokers to look for)?**
   Recommendation: Defer to Spec 008 — keep this spec focused on owned jokers.

3. **Max jokers before scrolling?**
   Recommendation: 2 groups visible without scroll, scroll for more. Max height ~400px.

---

## Appendix: Explanation Templates

```typescript
const EXPLANATION_TEMPLATES = {
  // Direct synergy templates (populated with joker names)
  suit_synergy: '{jokerA} and {jokerB} both gain power when you score {suit}. Play {suit} cards together to maximize both.',

  scaling_pair: '{jokerA} and {jokerB} both grow stronger as you play hands. They\'re building toward late-game power.',

  face_card: '{jokers} all multiply when you score face cards (J, Q, K). Prioritize face cards in your plays.',

  retrigger: '{jokerA} retriggers cards, making {jokerB}\'s effect happen multiple times. Powerful combo!',

  flush_enabler: '{jokers} all reward flush plays. Focus on one suit to trigger all of them.',

  // Strategy-based templates
  strategy_flush: 'These jokers all work well with flush hands. Play 5 cards of the same suit.',

  strategy_pairs: 'These jokers reward playing pairs and multiples. Keep duplicate ranks.',

  strategy_xmult: 'These jokers multiply your score exponentially. Essential for late antes.',

  // Orphan templates
  orphan_economy: 'Economy joker — generates money but doesn\'t help your scoring synergies.',

  orphan_waiting: 'Doesn\'t connect with your current jokers. Look for synergy partners in the shop.',

  orphan_sellable: 'No synergies and high sell value. Consider cashing out.',
};
```

---

## Version History

| Date | Change |
|------|--------|
| 2024-12-28 | Initial draft |
