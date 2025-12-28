import { TestBed } from '@angular/core/testing';
import { JokerExplainerService, JokerExplanation } from './joker-explainer.service';

describe('JokerExplainerService', () => {
  let service: JokerExplainerService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [JokerExplainerService],
    });
    service = TestBed.inject(JokerExplainerService);
  });

  describe('getExplanation', () => {
    it('should return explanation for known joker "splash"', () => {
      const explanation = service.getExplanation('splash');

      expect(explanation).not.toBeNull();
      expect(explanation!.effect).toContain('suit');
      expect(explanation!.implication).toContain('flush');
      expect(explanation!.tips.length).toBeGreaterThan(0);
    });

    it('should return explanation for known joker "blueprint"', () => {
      const explanation = service.getExplanation('blueprint');

      expect(explanation).not.toBeNull();
      expect(explanation!.effect).toContain('Copies');
      expect(explanation!.implication.length).toBeGreaterThan(0);
      expect(explanation!.tips.length).toBeGreaterThan(0);
    });

    it('should return explanation for known joker "triboulet"', () => {
      const explanation = service.getExplanation('triboulet');

      expect(explanation).not.toBeNull();
      expect(explanation!.effect).toContain('King');
      expect(explanation!.effect).toContain('Queen');
      expect(explanation!.tips.length).toBeGreaterThan(0);
    });

    it('should return explanation for known joker "egg"', () => {
      const explanation = service.getExplanation('egg');

      expect(explanation).not.toBeNull();
      expect(explanation!.effect.toLowerCase()).toContain('sell');
      expect(explanation!.tips.length).toBeGreaterThan(0);
    });

    it('should return null for unknown joker', () => {
      const explanation = service.getExplanation('unknown_joker_xyz');

      expect(explanation).toBeNull();
    });

    it('should handle joker IDs with j_ prefix', () => {
      const withPrefix = service.getExplanation('j_blueprint');
      const withoutPrefix = service.getExplanation('blueprint');

      expect(withPrefix).not.toBeNull();
      expect(withoutPrefix).not.toBeNull();
      expect(withPrefix!.effect).toBe(withoutPrefix!.effect);
    });

    it('should return explanation for economy joker "golden_joker"', () => {
      const explanation = service.getExplanation('golden_joker');

      expect(explanation).not.toBeNull();
      expect(explanation!.effect.toLowerCase()).toContain('$');
      expect(explanation!.tips.length).toBeGreaterThan(0);
    });

    it('should return explanation for face card joker "baron"', () => {
      const explanation = service.getExplanation('baron');

      expect(explanation).not.toBeNull();
      expect(explanation!.effect).toContain('King');
      expect(explanation!.implication.length).toBeGreaterThan(0);
    });

    it('should return explanation for scaling joker "vampire"', () => {
      const explanation = service.getExplanation('vampire');

      expect(explanation).not.toBeNull();
      expect(explanation!.effect.toLowerCase()).toContain('mult');
    });
  });

  describe('hasExplanation', () => {
    it('should return true for known jokers', () => {
      expect(service.hasExplanation('blueprint')).toBeTrue();
      expect(service.hasExplanation('triboulet')).toBeTrue();
      expect(service.hasExplanation('splash')).toBeTrue();
    });

    it('should return false for unknown jokers', () => {
      expect(service.hasExplanation('nonexistent_joker')).toBeFalse();
      expect(service.hasExplanation('')).toBeFalse();
    });

    it('should handle j_ prefix', () => {
      expect(service.hasExplanation('j_blueprint')).toBeTrue();
      expect(service.hasExplanation('j_unknown')).toBeFalse();
    });
  });

  describe('getExplanationCount', () => {
    it('should return the number of available explanations', () => {
      const count = service.getExplanationCount();

      // We created ~40 explanations in the JSON
      expect(count).toBeGreaterThanOrEqual(20);
    });
  });

  describe('JokerExplanation structure', () => {
    it('should have effect, implication, and tips fields', () => {
      const explanation = service.getExplanation('blueprint');

      expect(explanation).toBeDefined();
      expect(typeof explanation!.effect).toBe('string');
      expect(typeof explanation!.implication).toBe('string');
      expect(Array.isArray(explanation!.tips)).toBeTrue();
    });

    it('should have non-empty tips array', () => {
      const explanation = service.getExplanation('triboulet');

      expect(explanation!.tips.length).toBeGreaterThan(0);
      explanation!.tips.forEach(tip => {
        expect(typeof tip).toBe('string');
        expect(tip.length).toBeGreaterThan(0);
      });
    });
  });
});
