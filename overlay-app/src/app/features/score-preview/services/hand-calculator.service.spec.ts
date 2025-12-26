import { TestBed } from '@angular/core/testing';
import { HandCalculatorService } from './hand-calculator.service';
import { Card, Suit, Rank, HandType, HandLevel, BlindState, JokerState } from '../../../../../../shared/models';

describe('HandCalculatorService', () => {
  let service: HandCalculatorService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(HandCalculatorService);
  });

  // Helper to create cards
  function createCard(
    suit: Suit,
    rank: Rank,
    overrides: Partial<Card> = {}
  ): Card {
    return {
      id: `${suit}-${rank}`,
      suit,
      rank,
      enhancement: 'none',
      edition: 'none',
      seal: 'none',
      chipValue: getChipValue(rank),
      debuffed: false,
      faceDown: false,
      ...overrides,
    };
  }

  function getChipValue(rank: Rank): number {
    const values: Record<Rank, number> = {
      '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
      'J': 10, 'Q': 10, 'K': 10, 'A': 11
    };
    return values[rank];
  }

  function createJoker(overrides: Partial<JokerState> = {}): JokerState {
    return {
      id: 'test-joker',
      name: 'Test Joker',
      description: 'Test',
      rarity: 'common',
      edition: 'none',
      slotIndex: 0,
      isScaling: false,
      effectValues: {},
      sellValue: 3,
      ...overrides,
    };
  }

  const defaultBlind: BlindState = {
    type: 'small',
    name: 'Small Blind',
    chipGoal: 300,
    chipsScored: 0,
    isBoss: false,
  };

  // --- Hand Detection Tests ---

  describe('detectHandType', () => {
    it('should detect high card', () => {
      const cards = [
        createCard('hearts', 'A'),
        createCard('clubs', '7'),
        createCard('diamonds', '4'),
        createCard('spades', '2'),
        createCard('hearts', 'K'),
      ];
      const result = service.detectHandType(cards);
      expect(result.handType).toBe('high_card');
      expect(result.scoringCards.length).toBe(1);
      expect(result.scoringCards[0].rank).toBe('A');
    });

    it('should detect pair', () => {
      const cards = [
        createCard('hearts', 'K'),
        createCard('clubs', 'K'),
        createCard('diamonds', '7'),
        createCard('spades', '4'),
        createCard('hearts', '2'),
      ];
      const result = service.detectHandType(cards);
      expect(result.handType).toBe('pair');
      expect(result.scoringCards.length).toBe(2);
    });

    it('should detect two pair', () => {
      const cards = [
        createCard('hearts', 'K'),
        createCard('clubs', 'K'),
        createCard('diamonds', '7'),
        createCard('spades', '7'),
        createCard('hearts', '2'),
      ];
      const result = service.detectHandType(cards);
      expect(result.handType).toBe('two_pair');
      expect(result.scoringCards.length).toBe(4);
    });

    it('should detect three of a kind', () => {
      const cards = [
        createCard('hearts', 'Q'),
        createCard('clubs', 'Q'),
        createCard('diamonds', 'Q'),
        createCard('spades', '7'),
        createCard('hearts', '2'),
      ];
      const result = service.detectHandType(cards);
      expect(result.handType).toBe('three_of_a_kind');
      expect(result.scoringCards.length).toBe(3);
    });

    it('should detect straight', () => {
      const cards = [
        createCard('hearts', '5'),
        createCard('clubs', '6'),
        createCard('diamonds', '7'),
        createCard('spades', '8'),
        createCard('hearts', '9'),
      ];
      const result = service.detectHandType(cards);
      expect(result.handType).toBe('straight');
      expect(result.scoringCards.length).toBe(5);
    });

    it('should detect wheel straight (A-2-3-4-5)', () => {
      const cards = [
        createCard('hearts', 'A'),
        createCard('clubs', '2'),
        createCard('diamonds', '3'),
        createCard('spades', '4'),
        createCard('hearts', '5'),
      ];
      const result = service.detectHandType(cards);
      expect(result.handType).toBe('straight');
    });

    it('should detect flush', () => {
      const cards = [
        createCard('hearts', 'A'),
        createCard('hearts', '7'),
        createCard('hearts', '4'),
        createCard('hearts', '2'),
        createCard('hearts', 'K'),
      ];
      const result = service.detectHandType(cards);
      expect(result.handType).toBe('flush');
      expect(result.scoringCards.length).toBe(5);
    });

    it('should detect full house', () => {
      const cards = [
        createCard('hearts', 'K'),
        createCard('clubs', 'K'),
        createCard('diamonds', 'K'),
        createCard('spades', '7'),
        createCard('hearts', '7'),
      ];
      const result = service.detectHandType(cards);
      expect(result.handType).toBe('full_house');
    });

    it('should detect four of a kind', () => {
      const cards = [
        createCard('hearts', 'J'),
        createCard('clubs', 'J'),
        createCard('diamonds', 'J'),
        createCard('spades', 'J'),
        createCard('hearts', '2'),
      ];
      const result = service.detectHandType(cards);
      expect(result.handType).toBe('four_of_a_kind');
      expect(result.scoringCards.length).toBe(4);
    });

    it('should detect straight flush', () => {
      const cards = [
        createCard('clubs', '5'),
        createCard('clubs', '6'),
        createCard('clubs', '7'),
        createCard('clubs', '8'),
        createCard('clubs', '9'),
      ];
      const result = service.detectHandType(cards);
      expect(result.handType).toBe('straight_flush');
    });

    it('should detect royal flush', () => {
      const cards = [
        createCard('spades', '10'),
        createCard('spades', 'J'),
        createCard('spades', 'Q'),
        createCard('spades', 'K'),
        createCard('spades', 'A'),
      ];
      const result = service.detectHandType(cards);
      expect(result.handType).toBe('royal_flush');
    });

    it('should detect five of a kind', () => {
      const cards = [
        createCard('hearts', 'A'),
        createCard('clubs', 'A'),
        createCard('diamonds', 'A'),
        createCard('spades', 'A'),
        createCard('hearts', 'A', { id: 'wild-ace', enhancement: 'wild' }),
      ];
      const result = service.detectHandType(cards);
      expect(result.handType).toBe('five_of_a_kind');
    });

    it('should return empty scoringCards for empty input', () => {
      const result = service.detectHandType([]);
      expect(result.handType).toBe('high_card');
      expect(result.scoringCards.length).toBe(0);
    });
  });

  // --- Score Calculation Tests ---

  describe('calculateScore', () => {
    it('should calculate score for pair with default values', () => {
      const cards = [
        createCard('hearts', 'K'),
        createCard('clubs', 'K'),
      ];
      const result = service.calculateScore(cards, [], [], defaultBlind);

      expect(result.handType).toBe('pair');
      expect(result.baseChips).toBe(10);
      expect(result.baseMult).toBe(2);
      expect(result.cardChips).toBe(20); // 10 + 10 for two Kings
      expect(result.finalScore).toBe(60); // (10 + 20) * 2 = 60
    });

    it('should use hand levels when provided', () => {
      const cards = [
        createCard('hearts', 'K'),
        createCard('clubs', 'K'),
      ];
      const handLevels: HandLevel[] = [
        { handType: 'pair', level: 3, baseChips: 25, baseMult: 4 },
      ];
      const result = service.calculateScore(cards, [], handLevels, defaultBlind);

      expect(result.handLevel).toBe(3);
      expect(result.baseChips).toBe(25);
      expect(result.baseMult).toBe(4);
      expect(result.finalScore).toBe(180); // (25 + 20) * 4 = 180
    });

    it('should apply bonus card enhancement', () => {
      const cards = [
        createCard('hearts', 'K', { enhancement: 'bonus' }),
        createCard('clubs', 'K'),
      ];
      const result = service.calculateScore(cards, [], [], defaultBlind);

      // Base 10 + cards 20 + bonus 30 = 60 chips, * 2 mult = 120
      expect(result.totalChips).toBe(60);
      expect(result.finalScore).toBe(120);
    });

    it('should apply mult card enhancement', () => {
      const cards = [
        createCard('hearts', 'K', { enhancement: 'mult' }),
        createCard('clubs', 'K'),
      ];
      const result = service.calculateScore(cards, [], [], defaultBlind);

      // Base 10 + cards 20 = 30 chips, mult 2 + 4 = 6, final = 180
      expect(result.totalMult).toBe(6);
      expect(result.finalScore).toBe(180);
    });

    it('should apply foil edition', () => {
      const cards = [
        createCard('hearts', 'K', { edition: 'foil' }),
        createCard('clubs', 'K'),
      ];
      const result = service.calculateScore(cards, [], [], defaultBlind);

      // Base 10 + cards 20 + foil 50 = 80 chips, * 2 mult = 160
      expect(result.totalChips).toBe(80);
      expect(result.finalScore).toBe(160);
    });

    it('should apply holographic edition', () => {
      const cards = [
        createCard('hearts', 'K', { edition: 'holographic' }),
        createCard('clubs', 'K'),
      ];
      const result = service.calculateScore(cards, [], [], defaultBlind);

      // Base 10 + cards 20 = 30 chips, mult 2 + 10 = 12, final = 360
      expect(result.totalMult).toBe(12);
      expect(result.finalScore).toBe(360);
    });

    it('should apply polychrome edition as xmult', () => {
      const cards = [
        createCard('hearts', 'K', { edition: 'polychrome' }),
        createCard('clubs', 'K'),
      ];
      const result = service.calculateScore(cards, [], [], defaultBlind);

      // Base 10 + cards 20 = 30 chips, mult 2 * 1.5 = 3, final = 90
      expect(result.totalMult).toBe(3);
      expect(result.finalScore).toBe(90);
    });

    it('should apply joker chip effect', () => {
      const cards = [
        createCard('hearts', 'K'),
        createCard('clubs', 'K'),
      ];
      const jokers = [
        createJoker({ name: 'Greedy Joker', effectValues: { chips: 20 } }),
      ];
      const result = service.calculateScore(cards, jokers, [], defaultBlind);

      expect(result.jokerEffects.length).toBe(1);
      expect(result.jokerEffects[0].effectType).toBe('chips');
      expect(result.jokerEffects[0].value).toBe(20);
      expect(result.totalChips).toBe(50); // 10 + 20 + 20
      expect(result.finalScore).toBe(100);
    });

    it('should apply joker mult effect', () => {
      const cards = [
        createCard('hearts', 'K'),
        createCard('clubs', 'K'),
      ];
      const jokers = [
        createJoker({ name: 'Lusty Joker', effectValues: { mult: 3 } }),
      ];
      const result = service.calculateScore(cards, jokers, [], defaultBlind);

      expect(result.jokerEffects.length).toBe(1);
      expect(result.jokerEffects[0].effectType).toBe('mult');
      expect(result.totalMult).toBe(5); // 2 + 3
      expect(result.finalScore).toBe(150); // 30 * 5
    });

    it('should apply joker xmult effect', () => {
      const cards = [
        createCard('hearts', 'K'),
        createCard('clubs', 'K'),
      ];
      const jokers = [
        createJoker({ name: 'Ride the Bus', effectValues: { x_mult: 2 } }),
      ];
      const result = service.calculateScore(cards, jokers, [], defaultBlind);

      expect(result.jokerEffects.length).toBe(1);
      expect(result.jokerEffects[0].effectType).toBe('xmult');
      expect(result.totalMult).toBe(4); // 2 * 2
      expect(result.finalScore).toBe(120); // 30 * 4
    });

    it('should calculate blind comparison correctly', () => {
      const cards = [
        createCard('hearts', 'K'),
        createCard('clubs', 'K'),
      ];
      const blind: BlindState = {
        type: 'small',
        name: 'Small Blind',
        chipGoal: 100,
        chipsScored: 0,
        isBoss: false,
      };
      const result = service.calculateScore(cards, [], [], blind);

      expect(result.blindGoal).toBe(100);
      expect(result.willBeat).toBe(false); // 60 < 100
      expect(result.margin).toBe(-40);
    });

    it('should report willBeat true when score exceeds blind', () => {
      const cards = [
        createCard('hearts', 'A'),
        createCard('clubs', 'A'),
        createCard('diamonds', 'A'),
        createCard('spades', 'A'),
      ];
      const blind: BlindState = {
        type: 'small',
        name: 'Small Blind',
        chipGoal: 300,
        chipsScored: 0,
        isBoss: false,
      };
      const result = service.calculateScore(cards, [], [], blind);

      // Four of a kind: 60 base + 44 cards = 104 * 7 = 728
      expect(result.finalScore).toBeGreaterThan(300);
      expect(result.willBeat).toBe(true);
      expect(result.margin).toBeGreaterThan(0);
    });
  });

  // --- Edge Cases ---

  describe('edge cases', () => {
    it('should handle single card', () => {
      const cards = [createCard('hearts', 'A')];
      const result = service.detectHandType(cards);
      expect(result.handType).toBe('high_card');
      expect(result.scoringCards.length).toBe(1);
    });

    it('should handle null blind gracefully', () => {
      const cards = [
        createCard('hearts', 'K'),
        createCard('clubs', 'K'),
      ];
      const result = service.calculateScore(cards, [], [], null);

      expect(result.blindGoal).toBe(0);
      expect(result.willBeat).toBe(true);
      expect(result.margin).toBe(60);
    });

    it('should handle stone card enhancement', () => {
      const cards = [
        createCard('hearts', 'K', { enhancement: 'stone' }),
        createCard('clubs', 'K'),
      ];
      const result = service.calculateScore(cards, [], [], defaultBlind);

      // Stone card gives +50 chips
      expect(result.cardChips).toBe(60); // 50 + 10
    });

    it('should apply multiple joker effects in order', () => {
      const cards = [
        createCard('hearts', 'K'),
        createCard('clubs', 'K'),
      ];
      const jokers = [
        createJoker({ id: 'j1', name: 'Chip Joker', effectValues: { chips: 10 } }),
        createJoker({ id: 'j2', name: 'Mult Joker', effectValues: { mult: 2 } }),
        createJoker({ id: 'j3', name: 'X Mult Joker', effectValues: { x_mult: 1.5 } }),
      ];
      const result = service.calculateScore(cards, jokers, [], defaultBlind);

      expect(result.jokerEffects.length).toBe(3);
      // Chips: 10 + 20 + 10 = 40
      // Mult: 2 + 2 = 4, then * 1.5 = 6
      // Final: 40 * 6 = 240
      expect(result.finalScore).toBe(240);
    });
  });
});
