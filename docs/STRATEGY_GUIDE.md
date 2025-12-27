# Balatro Strategy Guide

> Comprehensive guide for winning runs, compiled from community research including Reddit, Discord, Steam discussions, and wiki resources.

## Table of Contents

- [Score Thresholds & Scaling Math](#score-thresholds--scaling-math)
- [Joker Tier List](#joker-tier-list)
- [Early Game Strategy (Ante 1-2)](#early-game-strategy-ante-1-2)
- [Late Game Closers (Ante 6-8)](#late-game-closers-ante-6-8)
- [Winning Builds](#winning-builds)
- [Joker Synergies & Combos](#joker-synergies--combos)
- [Boss Blind Strategies](#boss-blind-strategies)
- [Legendary Jokers](#legendary-jokers)

---

## Score Thresholds & Scaling Math

### Core Formula

```
Score = Chips x Multiplier
```

### Base Chip Requirements by Ante

| Ante | Base Chips | Small Blind (1x) | Big Blind (1.5x) | Boss Blind (2x) |
|------|------------|------------------|------------------|-----------------|
| 1    | 300        | 300              | 450              | 600             |
| 2    | 800        | 800              | 1,200            | 1,600           |
| 3    | 2,800      | 2,800            | 4,200            | 5,600           |
| 4    | 6,000      | 6,000            | 9,000            | 12,000          |
| 5    | 11,000     | 11,000           | 16,500           | 22,000          |
| 6    | 20,000     | 20,000           | 30,000           | 40,000          |
| 7    | 35,000     | 35,000           | 52,500           | 70,000          |
| 8    | 50,000     | 50,000           | 75,000           | 100,000         |

### Endless Mode Scaling (Ante 9+)

For antes beyond 8: `a*(b+(k*c)^d)^c`
- a = 50,000
- b = 1.6
- k = 0.75
- c = ante - 8
- d = 1 + 0.2*(ante-8)

**Ante 18 requires approximately 5.53e30 (5.53 nonillion) chips.**

### When +Mult Falls Off vs X-Mult

| Concept | Scaling Type | Early Game | Late Game |
|---------|--------------|------------|-----------|
| +Chips  | Linear       | Strong     | Weak      |
| +Mult   | Linear       | Strong     | Diminishing returns |
| X-Mult  | Quadratic    | Weak       | Dominant  |

**Key insight**: X-Mult multiplies your total mult, so a small X-Mult on a high base mult is exponentially better than +Mult additions.

**Example**: 1.5x Polychrome on 8,000 Mult = 12,000 Mult. You'd need +4,000 flat Mult to match.

### Optimal Chip/Mult Balance

For maximum score, keep your **Chips** and **Mult** numbers as close together as possible. If your Mult is 100x but Chips are only 50, you're leaving score on the table.

### Minimum X-Mult to Reach Ante 8

To consistently beat Ante 8 Boss Blind (100,000 chips):
- With a Level 10 Flush (~800 chips, 40 mult base): need ~X3 total X-Mult
- With Level 5 Flush (~400 chips, 20 mult): need ~X12.5 total X-Mult

**Rule of thumb**: Aim for X4-X8 total multiplicative mult by Ante 7, higher for weaker base hands.

---

## Joker Tier List

### S-Tier (Always Take - Win Condition Jokers)

These jokers can single-handedly carry runs regardless of build:

| Joker | Effect | Why It's S-Tier |
|-------|--------|-----------------|
| **Blueprint** | Copies the Joker to the right | Most versatile joker. Turns one deck-breaking joker into two. |
| **Brainstorm** | Copies leftmost Joker | Pair with Blueprint for insane combos. Polychrome Brainstorm is elite. |
| **Triboulet** | X2 Mult for each King/Queen scored | With Sock and Buskin: 5 face cards = X1024 Mult |
| **Cavendish** | X3 Mult (0.001% destroy chance) | Common rarity, massive consistent X-Mult |
| **Throwback** | X0.25 Mult per blind skipped | Skip aggressively = X4 by Ante 8 |

### A-Tier (Strong in Most Builds)

| Joker | Effect | Notes |
|-------|--------|-------|
| **Baron** | X1.5 Mult per King held in hand | Core of Steel/Baron builds |
| **Mime** | Retriggers held-in-hand effects | Doubles Baron, Steel cards |
| **Hack** | Retriggers 2-5 rank cards | Pairs with Dusk for 3x retriggers |
| **Dusk** | Retriggers final hand cards | Best with 5-card hands |
| **Sock and Buskin** | Retriggers face cards | Triboulet synergy is broken |
| **Bloodstone** | X1.5 Mult for Hearts (1 in 2) | Heart flush builds |
| **The Idol** | X2 Mult for specific card | Control deck to guarantee triggers |
| **Glass Joker** | X0.75 per Glass card destroyed | Fastest scaling X-Mult |
| **Steel Joker** | X0.2 Mult per Steel card | Scales with deck manipulation |
| **Photograph** | X2 Mult on first face card | Hanging Chad synergy |
| **Hanging Chad** | Retriggers first card 2x | Photograph = X8 Mult |

### B-Tier (Build-Dependent Strong)

| Joker | Best Build | Effect |
|-------|------------|--------|
| **Smeared Joker** | Flush | Hearts = Diamonds, Spades = Clubs (2-suit game) |
| **Four Fingers** | Flush/Straight | 4-card straights and flushes count |
| **Shortcut** | Straights | Gaps of 1 allowed in straights |
| **Lusty Joker** | Hearts | +20 Mult for each Heart |
| **Supernova** | Any | +Mult per hand type played this run |
| **Green Joker** | Any | Scaling +Mult per hand |
| **Spare Trousers** | Two Pair | +2 permanent Mult per Two Pair |
| **Square Joker** | 4-card hands | +4 permanent Chips per 4-card hand |
| **Runner** | Straights | +Chips when playing straights |
| **Ride the Bus** | No face cards | +Mult for consecutive non-face hands |

### Economy Jokers (Critical Early Game)

| Joker | Effect | Priority |
|-------|--------|----------|
| **Cloud 9** | $1 per 9 in deck at round end | Insane passive income |
| **Golden Joker** | $4 at end of round | Consistent |
| **Rocket** | $1 at round end, +$2 on boss beat | Scales well |
| **Egg** | Gains $3 sell value per round | Long-term value |
| **To the Moon** | Extra $1 interest per $5 held | Stacks with bank interest |
| **Business Card** | 1/2 chance for $2 when face card scored | Face card builds |

---

## Early Game Strategy (Ante 1-2)

### Economy First

1. **Build to $25 quickly** - Max interest ($5/round) is crucial
2. **Every dollar in Ante 1-2 compounds** - A strong multiplier obtained early carries for hours
3. **Aggressive rerolling is correct** - Finding the right joker is worth spending money

### Joker Priority Order

1. **Economy joker** (Cloud 9, Golden, Rocket)
2. **Consistent +Chips joker** (Square Joker, Scary Face)
3. **Consistent +Mult joker** (Supernova, Spare Trousers)
4. **X-Mult joker** (weaker early but scales)

### The Basic "Joker" Card

Don't underestimate it:
- Doubles score of Straight/Flush/Full House at Level 1
- Cheap buying price = faster to 3+ joker lineup
- Consistent $1 savings per blind cleared in one hand

### Critical Checkpoints

- **End of Ante 1**: Have at least 1 scoring joker
- **End of Ante 2**: Must have scaling mechanism or you fail to launch
- **Your machine must be good by Ante 7** or you're toast

### Tags Worth Skipping Blinds For

| Tag | Effect | Skip Value |
|-----|--------|------------|
| **Holographic** | +1 random joker with foil | Great early mult |
| **Investment** | +$25 after Boss Blind | Huge economy boost |
| **Buffoon** | +2 free jokers | Build acceleration |
| **Coupon** | Next shop is free | Save $$ |

---

## Late Game Closers (Ante 6-8)

### By Ante 6, You Need:

- [ ] Reliable X-Mult source (X2 minimum, X4+ preferred)
- [ ] Way to boost base chips (leveled hand type or chip jokers)
- [ ] Focused deck (ideally 20-30 cards for consistency)
- [ ] Economy stable at $25+ interest per round

### Scaling Priority Shift

| Phase | Priority |
|-------|----------|
| Ante 1-3 | +Mult, +Chips, economy |
| Ante 4-5 | Transition to X-Mult |
| Ante 6-8 | Stack X-Mult, maximize retriggers |

### Cards That Close Games

| Card | Why It Closes |
|------|---------------|
| **Polychrome** edition | X1.5 Mult on any joker |
| **Blueprint + strong X-Mult** | Doubles your best joker |
| **Glass Cards** | X2 per card, X1024 with 5 retriggered |
| **Steel Cards** | X1.5 per card held in hand |
| **Level 10+ Poker Hand** | Base chips/mult doubled |

---

## Winning Builds

### Flush Build (Easiest)

**Core Jokers:**
- Smeared Joker (reduces to 2-suit game)
- Lusty Joker / Bloodstone (Hearts)
- Wrathful Joker / Arrowhead (Spades)
- Four Fingers (4-card flushes count)

**Strategy:**
1. Pick a suit (Hearts for mult, Spades for chips)
2. Grab Smeared Joker ASAP
3. Remove off-suit cards with Hanged Man
4. Level up Flush with Saturn repeatedly

**Why It Works:** Only needs 5 cards of same color, very consistent.

### X-Mult Scaling (Blueprint/Brainstorm)

**Core Jokers:**
- Blueprint (mandatory)
- Brainstorm (optional but powerful)
- Any strong X-Mult joker (Photograph, Idol, Baron)
- Sock and Buskin or Hack for retriggers

**Strategy:**
1. Find one strong X-Mult joker
2. Find Blueprint - now you have two
3. Add Brainstorm for three
4. Stack retriggers to multiply further

**Key Insight:** Blueprint copies to the RIGHT. Position matters:
```
[+Mult jokers] → [Blueprint] → [X-Mult target]
```

### Retrigger Build (Mime/Dusk/Hack)

**Core Jokers:**
- Mime (retriggers held-in-hand)
- Dusk (retriggers final hand)
- Hack (retriggers 2-5 rank)
- Baron or Steel cards

**Strategy:**
1. Build around held-in-hand effects (Baron, Steel)
2. Mime doubles all held effects
3. Add Dusk for scored card retriggers
4. Use Red Seals for additional retriggers

**Power Example:** 5 Steel Kings with Baron + Mime = X1.5^10 = X57.67 Mult from Kings alone.

### Steel/Glass Scaling

**Steel Path:**
- Steel Cards give X1.5 Mult while held in hand
- Red Seals retrigger held effects
- Mime doubles all held-in-hand effects
- Baron adds X1.5 per King held
- Combine: Steel King + Red Seal + Mime + Baron

**Glass Path:**
- Glass Cards give X2 Mult when scored
- Retriggers do NOT re-roll break chance
- 5 Red Seal Glass Cards = X1024 Mult
- Glass Joker scales X0.75 per glass destroyed

**Combo Strategy:**
1. Fill deck with Steel cards (for holding)
2. Add Glass cards for scoring
3. Cartomancer/Vagabond for Tarot access
4. Justice creates Glass, Hanged Man destroys

---

## Joker Synergies & Combos

### God-Tier Combos

#### Baron + Mime
- Baron: X1.5 per King held
- Mime: Retriggers all held-in-hand effects
- Result: Each King gives X1.5 TWICE = X2.25 per King
- With 4 Kings held: X25.6 Mult

#### Photograph + Hanging Chad
- Photograph: X2 Mult on first face card
- Hanging Chad: Retriggers first card 2 more times
- Result: X2 × 3 = X8 Mult on first face card

#### Sock and Buskin + Triboulet
- Triboulet: X2 per King/Queen scored
- Sock and Buskin: Retriggers face cards
- 5 Kings/Queens without S&B: X32
- 5 Kings/Queens with S&B: X1024

#### Caino + Blueprint + Brainstorm
- Caino: Gains X1 per face card destroyed
- Blueprint copies Caino
- Brainstorm copies Caino (leftmost)
- Result: X10+ copied 3 times = tens of millions per hand

### Strong Combos

| Combo | Effect | Notes |
|-------|--------|-------|
| **Square + Spare Trousers** | +4 Chips + +2 Mult per 4-card hand | Both scale on same trigger |
| **Fortune Teller + Steel Joker** | +Mult per Tarot + X-Mult per Steel | Use Chariot to stack both |
| **Perkeo + Observatory** | Duplicate planets + X1.5 per planet | Exponential mult stacking |
| **Midas Mask + Vampire** | Face cards → Gold + Enhancement eaten | Vampire scales faster |

### Joker Ordering Rules

Position matters for multiplicative effects:

```
LEFT: +Chips jokers
      +Mult jokers
      Scaling jokers (Supernova, Green)
RIGHT: X-Mult jokers
       Blueprint (copies to the right)
       Brainstorm (copies leftmost, but activates in position)
```

**Key:** Additive effects should process before multiplicative effects multiply them.

---

## Boss Blind Strategies

### Counter Tools

| Tool | Effect |
|------|--------|
| **Luchador** | Sell to disable current Boss Blind |
| **Director's Cut** | Reroll Boss Blind once per ante ($10) |
| **Retcon** | Reroll Boss Blind unlimited times ($10 each) |
| **Boss Tag** | Rerolls next Boss Blind |

### Specific Boss Counters

#### The Needle (Only 1 hand)
- **Counter:** Build deck to one-shot every blind anyway
- Dusk and Acrobat activate instantly against Needle
- Burglar's +3 hands neutralizes it completely

#### The Plant (Face cards debuffed)
- **Counter:** Play numbered cards (2-10) or Aces
- Pivot away from face card builds temporarily
- Aces have high base chips, aren't face cards

#### The Water (No discards)
- **Counter:** Play weak hands instead of discarding
- Burglar's +3 hands helps cycle cards
- High hand count is critical

#### The Pillar (Previously played cards debuffed)
- **Counter:** Modify debuffed cards to "change" them
- Changing suit or enhancement removes debuff
- Plan different cards each blind

#### Face-Down Cards (The House, The Fish)
- Face-down cards still sort correctly by rank/suit
- Apply Tarot effects to reveal them
- Position in hand gives hints

#### The Wall (4x chip requirement)
- No counter - just need raw power
- Skip if your build isn't ready
- Often appears Ante 6-7

### General Boss Strategy

1. **Check upcoming bosses** before committing to builds
2. If Boss counters your build and you can't reroll, **pivot**
3. One-hand builds work against most bosses
4. Keep Luchador in mind as emergency escape

---

## Legendary Jokers

Obtained only from The Soul Spectral Card (rare spawn in Spectral/Arcana packs).

### Triboulet

**Effect:** X2 Mult for each King or Queen scored

**Strategy:**
- Sock and Buskin synergy = X1024 with 5 face cards
- Ghost Deck helps find The Soul
- Red Seals retrigger the X2 effect
- Focus deck on Kings/Queens only

### Canio

**Effect:** X1 Mult start, +X1 per face card destroyed

**Strategy:**
- The Hanged Man → instant X3 Mult
- Pareidolia: All cards count as face cards
- Trading Card: Free destroy each blind
- Easily reaches X10+ Mult

### Yorick

**Effect:** X1 Mult start, +X1 per 23 cards discarded

**Strategy:**
- Red Deck (extra discard) accelerates scaling
- Drunkard / Merry Andy for more discards
- **Avoid Burglar** (sets discards to 0)
- Hand size increasers help discard safely

### Perkeo

**Effect:** Creates negative copy of random consumable when leaving shop

**Strategy:**
- Keep planet cards for infinite leveling
- Ghost Deck for direct spectral buys
- Blueprint/Brainstorm = 2-3 copies per blind
- Observatory voucher: X1.5 per planet held

### Chicot

**Effect:** Disables Boss Blind effects

**Strategy:**
- Makes every Boss Blind a normal blind
- Allows riskier builds that would lose to specific bosses
- Pure consistency improvement

---

## Quick Reference Card

### The Three-Part Score Machine

1. **+Chips joker** (Square, Stuntman, Scary Face)
2. **Scaling +Mult joker** (Supernova, Green, Spare Trousers)
3. **X-Mult jokers** (as many as possible, rightmost position)

### Commit to One Hand Type

- **Flush** = Easiest, most forgiving
- **Full House** = Relatively simple
- **Straight** = Requires careful discarding
- **High Card/Pair** = Advanced (Steel/Baron builds)

### Score Formula Reminder

```
Final Score = (Base Chips + Card Chips + Joker Chips)
              × (Base Mult + Card Mult + Joker +Mult)
              × (Joker X-Mult₁) × (Joker X-Mult₂) × ...
```

---

## Sources

This guide was compiled from community resources including:

- [Mobalytics Joker Tier List](https://mobalytics.gg/blog/tier-lists/best-balatro-jokers/)
- [Balatro Wiki - General Strategy](https://balatrowiki.org/w/Guide:_General_strategy)
- [Balatro Wiki - Scaling Guide](https://balatrowiki.org/w/Guide:_Scaling)
- [Balatro Wiki - Blinds and Antes](https://balatrowiki.org/w/Blinds_and_Antes)
- [PC Gamer - 19 Essential Balatro Tips](https://www.pcgamer.com/balatro-tips/)
- [SteelSeries Balatro Guide](https://steelseries.com/blog/balatro-tips-and-guide)
- [Balatro University High Scores Guide](https://setsideb.com/beginners-guide-to-scoring-high-in-balatro/)
- [GameRant - Best Strategies](https://gamerant.com/balatro-best-strategies/)
- [The Gamer - Best Joker Combos](https://www.thegamer.com/balatro-best-joker-combos-tips-strategy/)
- [Steam Community Discussions](https://steamcommunity.com/app/2379780/discussions/)
- [Balatro Fandom Wiki](https://balatrogame.fandom.com/)
