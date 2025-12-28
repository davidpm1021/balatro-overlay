# Spec 009: Hand Guidance Panel

**Status**: Draft
**Priority**: High (Product Vision Priority #3)
**Created**: 2024-12-28
**Depends On**: Spec 003 (Build Detector), Spec 008 (Build Identity), HandCalculatorService

---

## Overview

Create a **Hand Guidance Panel** that analyzes the player's current hand and provides actionable recommendations on what to play and what to discard. This addresses the gap where the Score Preview shows mathematical breakdowns but no strategic guidance.

### Current State
- `ScorePreviewComponent` shows score breakdown for selected cards
- `HandCalculatorService` can detect hand types and calculate scores
- `BuildDetectorService` detects the player's build strategy
- No discard/keep recommendations provided

### Target State
- Panel showing the best playable hand from current cards
- Discard recommendations with build-aware explanations
- Keep recommendations highlighting cards that support the build
- Blind comparison showing if projected score beats the goal

---

## User Stories

### US-1: See Best Playable Hand
**As a** player with cards in hand
**I want to** see the best hand I can play from my current cards
**So that** I can make optimal scoring decisions

**Acceptance Criteria**:
- Show the detected best hand type (e.g., "Flush (Hearts)")
- Display the specific cards that form this hand
- Show projected score for this hand

### US-2: Know If I Beat the Blind
**As a** player deciding whether to play or discard
**I want to** see if my best hand beats the current blind
**So that** I know whether to commit or draw more cards

**Acceptance Criteria**:
- Show projected score vs blind requirement
- Clear visual indicator: checkmark if beats, X if not
- Show margin (how much over/under)

### US-3: Get Discard Recommendations
**As a** player learning optimal play
**I want to** see which cards to discard and why
**So that** I can improve my deck efficiency

**Acceptance Criteria**:
- List cards recommended for discard
- Explain why each card doesn't contribute (e.g., "off-suit for flush build")
- Consider build context

### US-4: Get Keep Recommendations
**As a** player building toward a strategy
**I want to** see which cards to keep and why
**So that** I protect important cards

**Acceptance Criteria**:
- List cards recommended to keep
- Explain why each card helps
- Highlight enhanced/special cards

---

## Technical Design

### Architecture

```
hand-guidance/
├── hand-guidance.component.ts       # Main panel
├── hand-guidance.component.spec.ts  # Component tests
├── services/
│   ├── hand-analyzer.service.ts     # Core analysis logic
│   └── hand-analyzer.service.spec.ts
└── index.ts
```

### Key Interfaces

```typescript
interface AnalyzedCard {
  card: Card;
  action: 'play' | 'keep' | 'discard';
  reason: string;
  isPartOfBestHand: boolean;
}

interface HandAnalysis {
  bestHand: {
    handType: HandType;
    handTypeLabel: string;
    cards: Card[];
    projectedScore: number;
    beatsBlind: boolean;
    margin: number;
  };
  analyzedCards: AnalyzedCard[];
  cardsToPlay: AnalyzedCard[];
  cardsToDiscard: AnalyzedCard[];
  cardsToKeep: AnalyzedCard[];
  buildContext: {
    buildType: StrategyType | null;
    buildName: string;
  };
}
```

### Discard Reason Templates

```typescript
const DISCARD_REASONS = {
  off_suit: "Off-suit for your {suit} flush build",
  no_pairs: "No duplicates - can't form pairs",
  breaks_sequence: "Doesn't connect for straights",
  not_face_card: "Not a face card (your build uses J, Q, K)",
  low_value: "Low value, expendable",
};

const KEEP_REASONS = {
  forms_best_hand: "Part of your best hand",
  matches_build: "Matches your {build} build",
  has_enhancement: "Has {enhancement} enhancement",
  has_edition: "Has {edition} edition",
  has_seal: "Has {seal} seal",
};
```

---

## UI Mockup

```
┌─────────────────────────────────────────────┐
│ HAND GUIDANCE                               │
├─────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────┐ │
│ │ BEST PLAY: Flush (Hearts)               │ │
│ │                                         │ │
│ │ ♥K  ♥Q  ♥9  ♥5  ♥2                      │ │
│ │                                         │ │
│ │ PROJECTED: 2,450                        │ │
│ │ Blind: 1,800  ✓ BEATS (+650)            │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ ┌─────────────────────────────────────────┐ │
│ │ RECOMMENDATION                          │ │
│ │                                         │ │
│ │ DISCARD:                                │ │
│ │ ♠7  Off-suit for Hearts flush           │ │
│ │ ♣3  Off-suit for Hearts flush           │ │
│ │                                         │ │
│ │ KEEP:                                   │ │
│ │ ♥K ♥Q ♥9 ♥5 ♥2  Forms your flush        │ │
│ └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

---

## Files to Create

| File | Purpose |
|------|---------|
| `hand-guidance/hand-guidance.component.ts` | Main panel |
| `hand-guidance/hand-guidance.component.spec.ts` | Component tests |
| `hand-guidance/services/hand-analyzer.service.ts` | Analysis logic |
| `hand-guidance/services/hand-analyzer.service.spec.ts` | Service tests |
| `hand-guidance/index.ts` | Exports |

## Files to Modify

| File | Change |
|------|--------|
| `app.component.ts` | Import HandGuidanceComponent |
| `app.component.html` | Add `<app-hand-guidance />` |

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
