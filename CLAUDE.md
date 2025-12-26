# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

> **See also**: `.claude/WORKFLOW.md` for process discipline (Explore → Plan → Code → Commit, test-driven generation, quality gates)

## Project Overview

Balatro Overlay Tracker — a transparent sidebar that floats over Balatro while you play, updating in real-time with deck tracking, probability calculations, score previews, joker displays, and an intelligent strategy engine.

## Architecture

```
Bridge Mod (Lua) → overlay_state.json → Electron Main → IPC → Angular Renderer
```

### Components

1. **bridge-mod/** - Lua mod using Lovely Injector + Steamodded

   - `BalatroOverlay/` - Main mod code
   - `lovely/` - Lovely loader config
   - Exports game state to JSON every 100ms

2. **overlay-app/** - Electron 28+ / Angular 19+ application

   - `electron/` - Main process (window management, file watcher, IPC)
   - `src/app/` - Angular renderer with feature modules
   - Transparent, click-through overlay window

3. **shared/** - TypeScript interfaces shared between components
   - `models/` - Game state, joker, card, strategy types

## Development Commands

```bash
# From overlay-app/
npm install              # Install dependencies
npm run dev              # Start Angular + Electron dev mode
npm run dev:angular      # Angular only (for UI work)
npm run dev:electron     # Electron only
npm run build            # Build for production
npm run test             # Run unit tests
npm run lint             # ESLint + Prettier check

# Bridge mod
cp -r bridge-mod/BalatroOverlay "%AppData%/Balatro/Mods/"
```

## Tech Stack

- **Bridge Mod**: Lua, Lovely Injector, Steamodded
- **Overlay App**: Electron 28+, Angular 19+, TypeScript 5.8+, Tailwind CSS, Dexie.js
- **Strategy Data**: JSON knowledge bases for joker synergies

## Key Features by Workstream

| Branch                          | Feature                                     |
| ------------------------------- | ------------------------------------------- |
| `feature/bridge-mod`            | Lua state export                            |
| `feature/electron-shell`        | Transparent window + file watcher           |
| `feature/deck-tracker-ui`       | Card grid visualization                     |
| `feature/probability-calc`      | Hypergeometric draw odds                    |
| `feature/hand-calculator`       | Score calculation engine                    |
| `feature/score-preview-ui`      | Score display + breakdown                   |
| `feature/joker-display`         | Joker bar + scaling counters                |
| `feature/run-history`           | Persistence + statistics                    |
| `feature/overlay-layout`        | Shell, theming, settings                    |
| `feature/strategy-intelligence` | Build detector, shop advisor, synergy graph |

---

## Angular Conventions

**IMPORTANT**: Follow Angular 17+ patterns. Do NOT use outdated patterns.

### Required Patterns

- Standalone components (do NOT explicitly set `standalone: true` — it's the default)
- `ChangeDetectionStrategy.OnPush` for ALL components
- Signals for state: `signal()`, `computed()`, `effect()`
- `input()` and `output()` functions — NOT `@Input()` / `@Output()` decorators
- `inject()` function — NOT constructor injection
- Native control flow: `@if`, `@for`, `@switch` — NOT `*ngIf`, `*ngFor`, `*ngSwitch`
- `host` property — NOT `@HostBinding` / `@HostListener`

### Component Template

```typescript
import {
  Component,
  ChangeDetectionStrategy,
  computed,
  inject,
} from "@angular/core";
import { CommonModule } from "@angular/common";

@Component({
  selector: "app-deck-tracker",
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (cards().length) {
    <div class="deck-grid">
      @for (card of cards(); track card.id) {
      <app-card-cell [card]="card" />
      }
    </div>
    } @else {
    <p>No cards remaining</p>
    }
  `,
})
export class DeckTrackerComponent {
  private stateService = inject(GameStateService);

  cards = computed(() => this.stateService.state()?.deck.remaining ?? []);
  totalCards = computed(() => this.cards().length);
}
```

### Component with Inputs/Outputs

```typescript
import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
} from "@angular/core";

@Component({
  selector: "app-card-cell",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="card" [class.dimmed]="card().isDrawn" (click)="clicked.emit()">
      {{ card().rank }}{{ card().suit }}
    </div>
  `,
})
export class CardCellComponent {
  card = input.required<DeckCard>();
  clicked = output<void>();
}
```

### Service Template

```typescript
import { Injectable, signal, computed } from "@angular/core";

@Injectable({ providedIn: "root" })
export class GameStateService {
  // Main state signal
  state = signal<OverlayGameState | null>(null);

  // Derived computed signals
  isInGame = computed(() => this.state()?.progress.phase !== "menu");
  currentAnte = computed(() => this.state()?.progress.ante ?? 0);
  deckRemaining = computed(() => this.state()?.deck.remaining ?? []);

  // Methods update the signal
  updateState(newState: OverlayGameState) {
    this.state.set(newState);
  }
}
```

### File Structure

```
src/app/
├── core/                    # Singleton services
│   └── services/
├── features/                # Feature modules
│   ├── deck-tracker/
│   │   ├── components/
│   │   ├── services/
│   │   └── deck-tracker.component.ts
│   └── ...
├── shared/                  # Reusable components, pipes
│   └── components/
└── app.routes.ts
```

### Naming Conventions

- Components: `feature-name.component.ts`
- Services: `feature-name.service.ts`
- Models: `feature-name.model.ts`
- Pipes: `feature-name.pipe.ts`
- Tests: `feature-name.component.spec.ts`

---

## Lua Conventions (Bridge Mod)

### Required Patterns

- ALL variables and functions use `local`
- Use snake_case for naming
- 4-space indentation
- Always include Steamodded header
- Throttle state exports (max 10/sec)
- Handle nil values defensively

### Steamodded Header (Required)

```lua
--- STEAMODDED HEADER
--- MOD_NAME: Balatro Overlay Bridge
--- MOD_ID: BalatroOverlayBridge
--- MOD_AUTHOR: [Author]
--- MOD_DESCRIPTION: Exports game state for external overlay
```

### Balatro Globals Reference

```lua
-- Core game state
G.GAME                        -- Main game state table
G.GAME.round_resets.ante      -- Current ante (number)
G.GAME.round                  -- Current round (1=small, 2=big, 3=boss)
G.GAME.dollars                -- Player money
G.GAME.current_round.hands_left
G.GAME.current_round.discards_left

-- Card areas (each has .cards array)
G.deck.cards                  -- Draw pile
G.hand.cards                  -- Current hand
G.discard.cards               -- Discard pile
G.play.cards                  -- Cards being played (during scoring)
G.jokers.cards                -- Joker slots

-- Card properties
card.base.suit                -- 'Hearts', 'Diamonds', 'Clubs', 'Spades'
card.base.value               -- 'Ace', 'King', 'Queen', 'Jack', '10'...'2'
card.ability                  -- Enhancement/ability data
card.edition                  -- Edition (foil, holo, polychrome)
card.seal                     -- Seal type
card.debuff                   -- Is debuffed (boolean)
card.facing                   -- 'front' or 'back'
```

### Event Hook Pattern

```lua
-- Always preserve and call the original function
local orig_func = G.FUNCS.some_function
G.FUNCS.some_function = function(...)
    local result = orig_func(...)
    export_state()  -- Our hook after original
    return result
end
```

### Defensive Nil Handling

```lua
local function get_ante()
    if G and G.GAME and G.GAME.round_resets then
        return G.GAME.round_resets.ante or 1
    end
    return 1
end

local function serialize_cards(card_area)
    local cards = {}
    if card_area and card_area.cards then
        for _, card in ipairs(card_area.cards) do
            if card then
                table.insert(cards, serialize_card(card))
            end
        end
    end
    return cards
end
```

### Throttled Export

```lua
local last_export = 0
local EXPORT_INTERVAL = 0.1  -- 100ms minimum between exports

local function export_state()
    local now = love.timer.getTime()
    if now - last_export < EXPORT_INTERVAL then
        return  -- Too soon, skip
    end
    last_export = now

    -- ... do export
end
```

---

## Electron Conventions

### Window Configuration

```typescript
const overlay = new BrowserWindow({
  width: 400,
  height: screen.getPrimaryDisplay().workAreaSize.height,
  x: screen.getPrimaryDisplay().workAreaSize.width - 400,
  y: 0,
  frame: false,
  transparent: true,
  alwaysOnTop: true,
  skipTaskbar: true,
  resizable: true,
  focusable: false, // Click-through by default
  webPreferences: {
    preload: path.join(__dirname, "preload.js"),
    contextIsolation: true,
    nodeIntegration: false,
  },
});

// Enable click-through
overlay.setIgnoreMouseEvents(true, { forward: true });
```

### Preload Script Pattern

```typescript
// preload.ts - Use contextBridge, never expose raw Node APIs
import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  onGameStateUpdate: (callback: (state: unknown) => void) => {
    ipcRenderer.on("game-state-update", (_, state) => callback(state));
  },
  setClickThrough: (enabled: boolean) => {
    ipcRenderer.send("set-click-through", enabled);
  },
  setOpacity: (opacity: number) => {
    ipcRenderer.send("set-opacity", opacity);
  },
});
```

### IPC Channels

| Channel             | Direction       | Purpose                     |
| ------------------- | --------------- | --------------------------- |
| `game-state-update` | Main → Renderer | New state from file watcher |
| `set-click-through` | Renderer → Main | Toggle click-through mode   |
| `set-opacity`       | Renderer → Main | Adjust overlay opacity      |
| `minimize-overlay`  | Renderer → Main | Collapse to minimal bar     |

---

## File Locations

| File               | Location                                                           |
| ------------------ | ------------------------------------------------------------------ |
| Game state JSON    | `%AppData%/Balatro/overlay_state.json`                             |
| Bridge mod         | `%AppData%/Balatro/Mods/BalatroOverlay/`                           |
| Run history DB     | IndexedDB via Dexie.js (browser storage)                           |
| Joker synergy data | `src/app/features/strategy-intelligence/data/joker-synergies.json` |
| User preferences   | `electron-store` or localStorage                                   |

---

## Testing

### Angular Tests

```typescript
// Use Jest matchers, mock inject() dependencies
describe("DeckTrackerComponent", () => {
  let component: DeckTrackerComponent;
  let mockStateService: jasmine.SpyObj<GameStateService>;

  beforeEach(() => {
    mockStateService = jasmine.createSpyObj("GameStateService", [], {
      state: signal(mockGameState),
    });

    TestBed.configureTestingModule({
      imports: [DeckTrackerComponent],
      providers: [{ provide: GameStateService, useValue: mockStateService }],
    });

    component = TestBed.createComponent(DeckTrackerComponent).componentInstance;
  });

  it("should compute cards from state", () => {
    expect(component.cards().length).toBe(52);
  });
});
```

### Test Commands

```bash
npm test                                    # All tests
ng test --include=**/deck-tracker/**        # Feature tests
ng test --include=**/hand-calculator.service.spec.ts  # Single file
```

### Test Data

Mock game states in `shared/test-data/`:

- `empty-state.json` - No game active
- `early-game.json` - Ante 1, full deck
- `mid-game.json` - Ante 4, partial deck, jokers
- `boss-blind.json` - Boss blind active with debuffs

---

## Common Mistakes to Avoid

### Angular

```typescript
// ❌ WRONG - Old patterns
@Component({
  standalone: true,  // Don't set explicitly
})
export class MyComponent {
  @Input() card: Card;  // Don't use decorator
  constructor(private service: MyService) {}  // Don't use constructor injection
}

// In template:
<div *ngIf="condition">  // Don't use *ngIf

// ✅ CORRECT - Angular 17+ patterns
@Component({
  // standalone is default, don't set
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MyComponent {
  card = input<Card>();  // Use input()
  private service = inject(MyService);  // Use inject()
}

// In template:
@if (condition) {
  <div>...</div>
}
```

### Lua

```lua
-- ❌ WRONG
function export_state()  -- Missing 'local'
  state = {}  -- Global variable
  if G.deck.cards then  -- No nil check on G.deck

-- ✅ CORRECT
local function export_state()
  local state = {}
  if G and G.deck and G.deck.cards then
```

---

## Quick Reference

| Task            | Pattern                                               |
| --------------- | ----------------------------------------------------- |
| Component state | `myValue = signal<Type>(initial)`                     |
| Derived state   | `computed(() => this.myValue() * 2)`                  |
| Input prop      | `myInput = input<Type>()` or `input.required<Type>()` |
| Output event    | `myOutput = output<Type>()`                           |
| Inject service  | `private myService = inject(MyService)`               |
| Conditional     | `@if (cond) { } @else { }`                            |
| Loop            | `@for (item of items(); track item.id) { }`           |
| Switch          | `@switch (value()) { @case ('a') { } }`               |
