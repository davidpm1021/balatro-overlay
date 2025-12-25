# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Balatro Overlay Tracker - a transparent sidebar that floats over Balatro while you play, updating in real-time with deck tracking, probability calculations, score previews, joker displays, and an intelligent strategy engine.

## Architecture

```
Bridge Mod (Lua) → overlay_state.json → Electron Main → IPC → Angular Renderer
```

### Components

1. **bridge-mod/** - Lua mod using Lovely Injector + Steamodded
   - `BalatroOverlay/` - Main mod code
   - `lovely/` - Lovely loader config
   - Exports game state to JSON every 100ms

2. **overlay-app/** - Electron 28+ / Angular 17+ application
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
npm run build            # Build for production
npm run test             # Run unit tests
npm run lint             # ESLint + Prettier check
```

## Tech Stack

- **Bridge Mod**: Lua, Lovely Injector, Steamodded
- **Overlay App**: Electron 28+, Angular 17+, TypeScript 5.x, Tailwind CSS, Dexie.js
- **Strategy Data**: JSON knowledge bases for joker synergies

## Key Features by Workstream

| Branch | Feature |
|--------|---------|
| `feature/bridge-mod` | Lua state export |
| `feature/electron-shell` | Transparent window + file watcher |
| `feature/deck-tracker-ui` | Card grid visualization |
| `feature/probability-calc` | Hypergeometric draw odds |
| `feature/hand-calculator` | Score calculation engine |
| `feature/score-preview-ui` | Score display + breakdown |
| `feature/joker-display` | Joker bar + scaling counters |
| `feature/run-history` | Persistence + statistics |
| `feature/overlay-layout` | Shell, theming, settings |
| `feature/strategy-intelligence` | Build detector, shop advisor, synergy graph |

## Angular Conventions

- Standalone components preferred
- Signals for reactive state (`signal()`, `computed()`)
- Feature modules in `src/app/features/`
- Shared services in `src/app/core/`
- File watcher state flows via `GameStateService`

## Electron IPC Channels

- `game-state:update` - New state from file watcher
- `overlay:toggle-clickthrough` - Toggle click-through mode
- `overlay:set-opacity` - Adjust overlay opacity
- `overlay:minimize` - Collapse to minimal bar

## File Locations

- Game state JSON: `%APPDATA%/Balatro/Mods/BalatroOverlay/overlay_state.json`
- Run history DB: IndexedDB via Dexie.js
- Strategy data: `src/app/features/strategy-intelligence/data/`

## Testing

- Unit tests: Jest for services, Jasmine for Angular components
- Test game states in `shared/test-data/`
- Mock file watcher for integration tests
