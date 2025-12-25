# BalatroOverlay Bridge Mod

Lua mod that exports Balatro game state to JSON for the overlay application.

## Requirements

- [Lovely Injector](https://github.com/ethangreen-dev/lovely-injector) - Lua mod loader for Balatro
- Balatro (Steam version)

## Installation

1. **Install Lovely Injector**
   - Download the latest release from [Lovely Injector releases](https://github.com/ethangreen-dev/lovely-injector/releases)
   - Extract `dwmapi.dll` (Windows) or the appropriate loader to your Balatro game directory

2. **Install the Bridge Mod**
   ```
   # Copy the mod folder to Balatro's mods directory:

   Windows:
   %APPDATA%\Balatro\Mods\BalatroOverlay\

   Linux/Mac:
   ~/.local/share/Balatro/Mods/BalatroOverlay/
   ```

3. **Copy Lovely Config**
   ```
   # Copy lovely.toml to the lovely directory:

   Windows:
   %APPDATA%\Balatro\Mods\lovely\lovely.toml

   Or merge with existing lovely.toml if you have other mods
   ```

## Directory Structure

```
%APPDATA%/Balatro/Mods/
├── lovely/
│   └── lovely.toml          # Patch configuration
└── BalatroOverlay/
    └── BalatroOverlay.lua   # Main mod code
```

## Output

The mod exports game state to:
- **Windows**: `%APPDATA%/Balatro/overlay_state.json`
- **Linux/Mac**: `~/.local/share/Balatro/overlay_state.json`

State is updated at most 10 times per second (100ms throttle).

## JSON Schema

The exported JSON matches the TypeScript interfaces in `shared/models/game-state.model.ts`:

```json
{
  "timestamp": 1703001234,
  "version": "0.2.0",
  "deck": {
    "remaining": [...],
    "hand": [...],
    "discarded": [...],
    "played": [...],
    "selected": ["card_id_1", "card_id_2"],
    "totalCards": 52,
    "cardsRemaining": 40,
    "composition": {
      "bySuit": { "hearts": 10, "diamonds": 12, "clubs": 9, "spades": 9 },
      "byRank": { "2": 3, "3": 4, ... },
      "enhancements": { "none": 38, "bonus": 2 },
      "editions": { "none": 40 },
      "seals": { "none": 40 }
    }
  },
  "jokers": [...],
  "progress": {
    "ante": 1,
    "round": 1,
    "phase": "playing",
    "handsRemaining": 4,
    "discardsRemaining": 3,
    "money": 4,
    "runSeed": "ABC123"
  },
  "blind": {
    "type": "small",
    "name": "Small Blind",
    "chipGoal": 300,
    "chipsScored": 0,
    "isBoss": false
  },
  "handLevels": [...],
  "consumables": {...},
  "vouchers": {...},
  "shop": null,
  "booster": null,
  "handHistory": [...]
}
```

### New in v0.2.0

- **Selected cards**: `deck.selected` contains IDs of highlighted cards in hand
- **Deck composition**: `deck.composition` provides counts by suit, rank, enhancement, edition, and seal for probability calculations
- **Booster pack state**: When opening a pack, `booster` contains pack type, available cards, and selection limit
- **Extended shop items**: Shop now captures tarots and planets when available

## Debug Mode

To enable debug logging, add to `love.load()` after initialization:

```lua
BalatroOverlay.setDebug(true)
```

Debug messages will appear in the game's console/log.

## Troubleshooting

### Mod not loading
- Verify Lovely Injector is installed correctly
- Check that `dwmapi.dll` is in the Balatro game directory
- Ensure `lovely.toml` is in the correct location

### No JSON output
- Check if the output directory exists
- Verify file permissions
- Enable debug mode to see error messages

### Incorrect data
- Some game states may not capture all data (e.g., during transitions)
- Shop data only appears when in shop phase
- Hand history clears on new run

## Development

The mod uses:
- Local variables for all internal state
- Nil-safe accessors for all game state access
- JSON encoding without external dependencies
- Throttled updates to minimize performance impact

## License

MIT - See main project LICENSE
