# PROJECT_CONTEXT.md

Balatro Overlay Tracker — a transparent sidebar that floats over Balatro, updating in real-time with deck tracking, probability calculations, score previews, joker displays, and strategy intelligence.

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              BALATRO GAME                                   │
│                          (Love2D / Lua Runtime)                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         BRIDGE MOD (Lua)                                    │
│  bridge-mod/BalatroOverlay/main.lua                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  • Hooks love.update() to export state every frame                  │    │
│  │  • Serializes: deck, hand, jokers, blinds, hand levels              │    │
│  │  • Throttled to max 10 writes/sec (100ms interval)                  │    │
│  │  • Defensive nil handling for all G.* globals                       │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                     FILE SYSTEM (JSON Bridge)                               │
│  %AppData%/Balatro/overlay_state.json                                       │
│  • Updated every 100ms during gameplay                                      │
│  • Contains complete OverlayGameState snapshot                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        ELECTRON MAIN PROCESS                                │
│  overlay-app/electron/main.ts                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  • chokidar file watcher monitors overlay_state.json                │    │
│  │  • Debounces reads (50ms) to prevent flooding                       │    │
│  │  • Creates transparent, always-on-top, click-through window         │    │
│  │  • Re-asserts alwaysOnTop every 500ms (fights fullscreen games)     │    │
│  │  • Global shortcut: Ctrl+Shift+B toggles visibility                 │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
                                     │
                            IPC: "game-state:update"
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          PRELOAD BRIDGE                                     │
│  overlay-app/electron/preload.ts                                            │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  contextBridge.exposeInMainWorld('electronAPI', {...})              │    │
│  │  • onGameStateUpdate(callback)                                      │    │
│  │  • setClickThrough(enabled)                                         │    │
│  │  • setOpacity(opacity)                                              │    │
│  │  • startDrag/dragMove (window positioning)                          │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        ANGULAR RENDERER                                     │
│  overlay-app/src/app/                                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  CORE SERVICES (Singleton State Management)                         │    │
│  │  ┌───────────────────────────────────────────────────────────────┐  │    │
│  │  │  GameStateService                                             │  │    │
│  │  │  • state = signal<OverlayGameState | null>()                  │  │    │
│  │  │  • Computed: phase, deck, jokers, hands, isInGame             │  │    │
│  │  │  • Receives IPC updates via electronAPI.onGameStateUpdate()   │  │    │
│  │  └───────────────────────────────────────────────────────────────┘  │    │
│  │  ┌───────────────────────────────────────────────────────────────┐  │    │
│  │  │  ScoreEngineService                                           │  │    │
│  │  │  • calculateBreakdown(context) → step-by-step scoring         │  │    │
│  │  │  • detectHandType(cards) → poker hand classification          │  │    │
│  │  │  • projectScore() → min/avg/max projections                   │  │    │
│  │  └───────────────────────────────────────────────────────────────┘  │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  FEATURE MODULES                                                    │    │
│  │  • deck-tracker/      → Card grid visualization (4 suits × 13)     │    │
│  │  • joker-display/     → Joker bar with scaling counters            │    │
│  │  • probability/       → Hypergeometric draw odds                   │    │
│  │  • score-preview/     → Score breakdown + blind comparison         │    │
│  │  • strategy-intelligence/                                          │    │
│  │    └─ BuildDetectorV2Service → Build detection (flush, pairs...)   │    │
│  │    └─ ShopOverlayComponent → Item recommendations                  │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow: Lua → JSON → Electron → Angular

```
1. GAME EVENT (card played, phase change, etc.)
   │
   ▼
2. LUA: love.update() hook triggers export_state()
   │   • Throttle check: skip if <100ms since last export
   │   • Serialize: G.deck, G.hand, G.jokers, G.GAME
   │   • Write JSON to overlay_state.json
   │
   ▼
3. FILE: overlay_state.json updated on disk
   │
   ▼
4. ELECTRON: chokidar detects file change
   │   • Debounce 50ms to batch rapid changes
   │   • Read file, parse JSON
   │   • IPC send: "game-state:update"
   │
   ▼
5. PRELOAD: contextBridge passes to renderer
   │   • electronAPI.onGameStateUpdate(callback)
   │
   ▼
6. ANGULAR: GameStateService receives update
   │   • state.set(newState) triggers signal graph
   │   • Computed signals re-evaluate (deck, jokers, phase)
   │
   ▼
7. COMPONENTS: React to signal changes
   │   • DeckTracker → cardsBySuitAndRank() recomputes
   │   • ScorePreview → calculateBreakdown() runs
   │   • BuildDetector → detectedBuild() updates
   │
   ▼
8. UI: Templates re-render via OnPush + signals
```

---

## Key Files and Purposes

### Bridge Mod (Lua)
| File | Purpose |
|------|---------|
| `bridge-mod/BalatroOverlay/main.lua` | State exporter, hooks love.update(), serializes game state to JSON |
| `bridge-mod/lovely/lovely.toml` | Lovely Injector configuration |

### Electron
| File | Purpose |
|------|---------|
| `overlay-app/electron/main.ts` | Window creation, file watcher, IPC handlers, always-on-top management |
| `overlay-app/electron/preload.ts` | Context bridge exposing electronAPI to renderer |

### Angular Core
| File | Purpose |
|------|---------|
| `overlay-app/src/app/core/services/game-state.service.ts` | Central state management via signals, IPC receiver |
| `overlay-app/src/app/core/services/score-engine.service.ts` | Hand scoring calculations, joker effect application |
| `overlay-app/src/app/app.component.ts` | Root component, layout orchestration |

### Angular Features
| File | Purpose |
|------|---------|
| `features/deck-tracker/deck-tracker.component.ts` | 4×13 card grid visualization |
| `features/joker-display/joker-bar.component.ts` | Active joker display with scaling values |
| `features/probability/probability.service.ts` | Hypergeometric draw probability calculations |
| `features/score-preview/services/hand-calculator.service.ts` | Hand detection and score breakdown |
| `features/strategy-intelligence/services/build-detector-v2.service.ts` | Build type detection (flush, pairs, mult, etc.) |
| `features/strategy-intelligence/components/shop-overlay.component.ts` | Shop phase recommendations |

### Data Files
| File | Purpose |
|------|---------|
| `overlay-app/src/app/data/jokers-complete.json` | Full joker database with strategy affinities |
| `overlay-app/src/app/data/scoring-reference.json` | Base hand values, enhancements, editions, joker effects |
| `overlay-app/src/app/data/bosses-complete.json` | Boss blind effects and metadata |

### Shared Types
| File | Purpose |
|------|---------|
| `shared/models/game-state.model.ts` | Root `OverlayGameState` interface |
| `shared/models/card.model.ts` | `DeckCard` with suit, rank, enhancement, edition, seal |
| `shared/models/joker.model.ts` | `JokerState` with effects, scaling, rarity |
| `shared/models/strategy.model.ts` | `DetectedStrategy`, `StrategyType`, confidence scores |

---

## Known Issues from Assessment

### Incomplete Implementations

1. **Scaling Joker Detection (Lua)**
   - Location: `bridge-mod/BalatroOverlay/main.lua:186`
   - Issue: `isScaling = false` hardcoded; TODO to detect scaling jokers
   - Impact: Scaling counters (Ride the Bus, etc.) not tracked

2. **Joker Effect Calculations (Score Engine)**
   - Complex joker interactions simplified (retriggers, chains)
   - Random effects assumed (Lucky cards show projection range)
   - Some conditions marked "assume condition met"

3. **Build Detection Gaps**
   - Debuffed cards not excluded from deck composition signals
   - No economy-focused build detection (pure money generation)
   - Hybrid threshold (70%) is fixed, not adaptive

4. **Missing UI Panels**
   - Hand history tracking (data exists, no display)
   - Consumables (Tarot/Planet cards) not shown
   - Voucher tracking not displayed

### Performance Concerns

1. **DeckTrackerComponent**
   - Recomputes full `cardsBySuitAndRank()` Map on every state change
   - No memoization or differential updates

2. **BuildDetectorV2Service**
   - No caching of joker data lookups during detection

3. **Electron alwaysOnTop**
   - Re-asserted every 500ms, may impact performance
   - Necessary workaround for fullscreen game overlay

### Error Handling Gaps

1. **Joker Data Loading**
   - Async fetch in constructor with fallback to hardcoded defaults
   - No explicit error handling if JSON fetch fails mid-gameplay

2. **Window Position**
   - No persistent save/restore of window position

---

## Patterns to Follow

### Angular 17+ Required Patterns

```typescript
// ✅ CORRECT: Modern Angular patterns
@Component({
  selector: 'app-example',
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (isVisible()) {
      <div class="content">
        @for (item of items(); track item.id) {
          <app-item [data]="item" (clicked)="onItemClick($event)" />
        }
      </div>
    }
  `,
})
export class ExampleComponent {
  // Inject dependencies
  private stateService = inject(GameStateService);

  // Signals for state
  items = computed(() => this.stateService.state()?.items ?? []);
  isVisible = signal(true);

  // Inputs/outputs as functions
  data = input.required<DataType>();
  clicked = output<void>();
}
```

```typescript
// ❌ WRONG: Legacy patterns to avoid
@Component({
  standalone: true,  // Don't set explicitly (default)
})
export class BadComponent {
  @Input() data: DataType;           // Use input() instead
  @Output() clicked = new EventEmitter();  // Use output() instead

  constructor(private service: MyService) {}  // Use inject() instead
}

// In template:
<div *ngIf="condition">  // Use @if instead
<div *ngFor="let item of items">  // Use @for instead
```

### Service Pattern

```typescript
@Injectable({ providedIn: 'root' })
export class FeatureService {
  // Main state signal
  private _state = signal<State | null>(null);

  // Public read-only access
  state = this._state.asReadonly();

  // Computed derived values
  derivedValue = computed(() => this._state()?.value ?? defaultValue);

  // Methods update the signal
  updateState(newState: State) {
    this._state.set(newState);
  }
}
```

### Lua Patterns

```lua
-- Always use local
local function export_state()
    -- Defensive nil checks
    if not G or not G.GAME then return end

    -- Throttle writes
    local now = love.timer.getTime()
    if now - last_export < 0.1 then return end
    last_export = now

    -- Safe table access
    local ante = (G.GAME.round_resets and G.GAME.round_resets.ante) or 1
end

-- Preserve original when hooking
local orig_update = love.update
love.update = function(dt)
    orig_update(dt)
    export_state()
end
```

### IPC Patterns

```typescript
// Preload: Always use contextBridge
contextBridge.exposeInMainWorld('electronAPI', {
  onGameStateUpdate: (callback: (state: unknown) => void) => {
    ipcRenderer.on('game-state:update', (_, state) => callback(state));
  },
});

// Renderer: Type-safe access
declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
```

---

## Development Quick Reference

```bash
# Install and run
cd overlay-app
npm install
npm run dev              # Angular + Electron together

# Testing
npm run test             # All tests
npm run lint             # ESLint + Prettier

# Bridge mod installation
cp -r bridge-mod/BalatroOverlay "%AppData%/Balatro/Mods/"
```

### File Locations
| Purpose | Path |
|---------|------|
| Game state JSON | `%AppData%/Balatro/overlay_state.json` |
| Bridge mod | `%AppData%/Balatro/Mods/BalatroOverlay/` |
| Joker synergy data | `src/app/features/strategy-intelligence/data/joker-synergies.json` |

### IPC Channels
| Channel | Direction | Purpose |
|---------|-----------|---------|
| `game-state:update` | Main → Renderer | New state from file watcher |
| `set-click-through` | Renderer → Main | Toggle click-through mode |
| `set-opacity` | Renderer → Main | Adjust overlay opacity |
| `minimize-overlay` | Renderer → Main | Collapse to minimal bar |
