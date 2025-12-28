# Spec 006: Context-Aware Panel Visibility

**Status**: Draft
**Priority**: Medium (UX improvement)
**Created**: 2024-12-28
**Depends On**: None (uses existing GameStateService)

---

## Overview

Create a **PhaseVisibilityService** that controls which overlay panels are visible based on the current game phase. This reduces clutter by hiding irrelevant panels and shows the most useful information for each game context.

### Current State
- All panels are always visible in `app.component.html`
- ShopOverlayComponent has its own internal `@if (isInShop())` check
- No centralized visibility management
- No user override capability

### Target State
- Centralized PhaseVisibilityService controls panel visibility
- Each panel has a computed `isVisible` signal from the service
- Animated transitions (fade) when panels show/hide
- User can override default visibility in settings
- Edge cases handled (rapid phase changes, unknown phases)

---

## Phase-to-Panel Mapping

| Phase | Visible Panels | Hidden Panels |
|-------|----------------|---------------|
| `menu` | None | All |
| `blind_select` | Build Identity | Deck Tracker, Hand Guidance, Shop Advisor |
| `playing` | Deck Tracker, Hand Guidance, Build Identity, Synergy Display | Shop Advisor |
| `scoring` | Deck Tracker, Hand Guidance, Build Identity, Synergy Display | Shop Advisor |
| `shop` | Shop Advisor, Synergy Display, Build Identity | Deck Tracker, Hand Guidance |
| `booster` | Synergy Display, Build Identity | Deck Tracker, Hand Guidance, Shop Advisor |
| `game_over` | Build Identity | Deck Tracker, Hand Guidance, Shop Advisor |
| `victory` | Build Identity | Deck Tracker, Hand Guidance, Shop Advisor |

### Panel IDs

| Panel ID | Component | Default Behavior |
|----------|-----------|------------------|
| `deck-tracker` | DeckTrackerComponent | Show during playing/scoring |
| `hand-guidance` | HandGuidanceComponent | Show during playing/scoring |
| `build-identity` | BuildIdentityComponent | Always show (except menu) |
| `synergy-display` | SynergyDisplayComponent | Show in shop/booster/playing/scoring |
| `shop-advisor` | ShopOverlayComponent | Show in shop only |

---

## Technical Design

### Architecture

```
core/services/
├── phase-visibility.service.ts       # Visibility logic
├── phase-visibility.service.spec.ts  # Service tests
└── index.ts                          # Update exports
```

### Key Interfaces

```typescript
export type PanelId =
  | 'deck-tracker'
  | 'hand-guidance'
  | 'build-identity'
  | 'synergy-display'
  | 'shop-advisor';

export interface PanelConfig {
  showInPhases: GamePhase[];
  defaultWhenUnknown: boolean;
}

export type VisibilityOverride = boolean | null; // null = use phase default
```

### PhaseVisibilityService

```typescript
@Injectable({ providedIn: 'root' })
export class PhaseVisibilityService {
  private gameState = inject(GameStateService);

  // User overrides persisted to localStorage
  private overrides = signal<Record<PanelId, boolean | null>>({...});

  /**
   * Check if a specific panel should be visible
   */
  isPanelVisible(panelId: PanelId): Signal<boolean>;

  /**
   * Set user override for a panel
   */
  setOverride(panelId: PanelId, visible: boolean | null): void;

  /**
   * Reset all overrides to phase-based defaults
   */
  resetOverrides(): void;
}
```

---

## Files to Create

| File | Purpose |
|------|---------|
| `core/services/phase-visibility.service.ts` | Visibility logic |
| `core/services/phase-visibility.service.spec.ts` | Service tests |

## Files to Modify

| File | Change |
|------|--------|
| `core/services/index.ts` | Export PhaseVisibilityService |
| `features/deck-tracker/deck-tracker.component.ts` | Add visibility wrapper |
| `features/hand-guidance/hand-guidance.component.ts` | Add visibility wrapper |
| `features/build-identity/build-identity.component.ts` | Add visibility wrapper |
| `features/synergy-display/synergy-display.component.ts` | Add visibility wrapper |
| `features/strategy-intelligence/components/shop-overlay.component.ts` | Migrate to service |

---

## Quality Gates

```bash
npm run build   # Build must succeed
npm run test    # All tests must pass
```

---

## Version History

| Date | Change |
|------|--------|
| 2024-12-28 | Initial draft |
