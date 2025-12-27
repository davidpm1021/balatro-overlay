/**
 * Joker Database Validation Tests
 *
 * These tests verify the integrity and completeness of the jokers-complete.json database.
 * Tests are designed to fail initially to expose data issues that need fixing.
 */
import jokersData from './jokers-complete.json';

interface JokerEntry {
  id: string;
  name: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
  cost: number;
  effect: string;
  scoringType: string;
  position?: {
    sensitive?: boolean;
    requirement?: string;
    copyable?: boolean;
  };
}

interface JokersDatabase {
  jokers: JokerEntry[];
}

describe('Jokers Complete Database', () => {
  const jokers: JokerEntry[] = (jokersData as JokersDatabase).jokers;

  describe('Total Count', () => {
    it('should have exactly 150 jokers', () => {
      expect(jokers.length).toBe(150);
    });
  });

  describe('Rarity Distribution', () => {
    it('should have exactly 61 common jokers', () => {
      const commonJokers = jokers.filter((j) => j.rarity === 'common');
      expect(commonJokers.length).toBe(61);
    });

    it('should have exactly 64 uncommon jokers', () => {
      const uncommonJokers = jokers.filter((j) => j.rarity === 'uncommon');
      expect(uncommonJokers.length).toBe(64);
    });

    it('should have exactly 20 rare jokers', () => {
      const rareJokers = jokers.filter((j) => j.rarity === 'rare');
      expect(rareJokers.length).toBe(20);
    });

    it('should have exactly 5 legendary jokers', () => {
      const legendaryJokers = jokers.filter((j) => j.rarity === 'legendary');
      expect(legendaryJokers.length).toBe(5);
    });

    it('should have rarity counts that sum to 150', () => {
      const common = jokers.filter((j) => j.rarity === 'common').length;
      const uncommon = jokers.filter((j) => j.rarity === 'uncommon').length;
      const rare = jokers.filter((j) => j.rarity === 'rare').length;
      const legendary = jokers.filter((j) => j.rarity === 'legendary').length;

      expect(common + uncommon + rare + legendary).toBe(150);
    });
  });

  describe('xMult Jokers', () => {
    it('should have all 35 xMult jokers with scoringType "xmult"', () => {
      const xmultJokers = jokers.filter((j) => j.scoringType === 'xmult');
      expect(xmultJokers.length).toBe(35);
    });
  });

  describe('Position-Sensitive Jokers', () => {
    const EXPECTED_POSITION_SENSITIVE_JOKERS = [
      'blueprint',
      'brainstorm',
      'ceremonial_dagger',
      'photograph',
      'hanging_chad',
    ];

    it('should have exactly 5 position-sensitive jokers', () => {
      const positionSensitive = jokers.filter(
        (j) => j.position?.sensitive === true
      );
      expect(positionSensitive.length).toBe(5);
    });

    EXPECTED_POSITION_SENSITIVE_JOKERS.forEach((jokerId) => {
      it(`should have position.sensitive = true for ${jokerId}`, () => {
        const joker = jokers.find((j) => j.id === jokerId);
        expect(joker).toBeDefined();
        expect(joker?.position?.sensitive).toBe(true);
      });
    });
  });

  describe('Required Jokers Exist', () => {
    const REQUIRED_JOKERS = ['luchador', 'riff_raff'];

    REQUIRED_JOKERS.forEach((jokerId) => {
      it(`should have joker: ${jokerId}`, () => {
        const joker = jokers.find((j) => j.id === jokerId);
        expect(joker).toBeDefined();
      });
    });
  });

  describe('Data Integrity', () => {
    it('should have unique joker IDs', () => {
      const ids = jokers.map((j) => j.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(jokers.length);
    });

    it('should have all required fields for each joker', () => {
      jokers.forEach((joker) => {
        expect(joker.id).toBeDefined();
        expect(joker.name).toBeDefined();
        expect(joker.rarity).toBeDefined();
        expect(joker.cost).toBeDefined();
        expect(joker.effect).toBeDefined();
        expect(joker.scoringType).toBeDefined();
      });
    });

    it('should have valid rarity values', () => {
      const validRarities = ['common', 'uncommon', 'rare', 'legendary'];
      jokers.forEach((joker) => {
        expect(validRarities).toContain(joker.rarity);
      });
    });
  });
});
