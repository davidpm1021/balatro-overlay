import {
  binomialCoefficient,
  hypergeometricPMF,
  hypergeometricCDF,
  hypergeometricAtLeast,
  hypergeometricExpectedValue,
  calculateHypergeometric
} from './probability.utils';

describe('Probability Utils', () => {
  describe('binomialCoefficient', () => {
    it('should return 1 for C(n, 0)', () => {
      expect(binomialCoefficient(10, 0)).toBe(1);
      expect(binomialCoefficient(52, 0)).toBe(1);
    });

    it('should return 1 for C(n, n)', () => {
      expect(binomialCoefficient(10, 10)).toBe(1);
      expect(binomialCoefficient(5, 5)).toBe(1);
    });

    it('should return n for C(n, 1)', () => {
      expect(binomialCoefficient(10, 1)).toBe(10);
      expect(binomialCoefficient(52, 1)).toBe(52);
    });

    it('should calculate C(52, 5) correctly (poker hands)', () => {
      expect(binomialCoefficient(52, 5)).toBe(2598960);
    });

    it('should calculate small values correctly', () => {
      expect(binomialCoefficient(5, 2)).toBe(10);
      expect(binomialCoefficient(6, 3)).toBe(20);
      expect(binomialCoefficient(10, 3)).toBe(120);
    });

    it('should return 0 for invalid inputs', () => {
      expect(binomialCoefficient(5, -1)).toBe(0);
      expect(binomialCoefficient(5, 6)).toBe(0);
    });

    it('should handle symmetry C(n, k) = C(n, n-k)', () => {
      expect(binomialCoefficient(10, 3)).toBe(binomialCoefficient(10, 7));
      expect(binomialCoefficient(52, 5)).toBe(binomialCoefficient(52, 47));
    });
  });

  describe('hypergeometricPMF', () => {
    it('should calculate classic urn problem correctly', () => {
      // 20 balls, 7 red, draw 12, P(4 red)
      const result = hypergeometricPMF(20, 7, 12, 4);
      expect(result).toBeCloseTo(0.3576, 3);
    });

    it('should calculate P(exactly 1 heart in 5-card draw from full deck)', () => {
      // 52 cards, 13 hearts, draw 5, want exactly 1 heart
      const result = hypergeometricPMF(52, 13, 5, 1);
      expect(result).toBeCloseTo(0.4114, 3);
    });

    it('should return 0 for impossible outcomes', () => {
      // Draw 5 cards, want 6 hearts - impossible
      expect(hypergeometricPMF(52, 13, 5, 6)).toBe(0);
    });

    it('should return 0 when k > K', () => {
      // 13 hearts in deck, want 14 hearts
      expect(hypergeometricPMF(52, 13, 20, 14)).toBe(0);
    });

    it('should return 0 when k < max(0, n-(N-K))', () => {
      // If we must draw more successes than we want
      // Draw 45 from 52 with only 39 non-hearts, must get at least 6 hearts
      expect(hypergeometricPMF(52, 13, 45, 2)).toBe(0);
    });

    it('should handle edge case of empty deck', () => {
      expect(hypergeometricPMF(0, 0, 0, 0)).toBe(0);
    });

    it('should calculate Balatro scenario: 1 heart in 5-card draw from 44-card deck with 10 hearts', () => {
      const result = hypergeometricPMF(44, 10, 5, 1);
      expect(result).toBeGreaterThan(0.3);
      expect(result).toBeLessThan(0.5);
    });

    it('should return valid probability for guaranteed outcome', () => {
      // 5 cards, all hearts, draw 5, want 5 hearts = 1.0
      expect(hypergeometricPMF(5, 5, 5, 5)).toBe(1);
    });
  });

  describe('hypergeometricCDF', () => {
    it('should sum to approximately 1 for all possible outcomes', () => {
      // P(X <= max possible) should be 1
      const result = hypergeometricCDF(20, 7, 12, 7);
      expect(result).toBeCloseTo(1, 6);
    });

    it('should be monotonically increasing', () => {
      const p0 = hypergeometricCDF(52, 13, 5, 0);
      const p1 = hypergeometricCDF(52, 13, 5, 1);
      const p2 = hypergeometricCDF(52, 13, 5, 2);
      const p3 = hypergeometricCDF(52, 13, 5, 3);

      expect(p1).toBeGreaterThan(p0);
      expect(p2).toBeGreaterThan(p1);
      expect(p3).toBeGreaterThan(p2);
    });

    it('should calculate P(at most 2 hearts in 5-card draw)', () => {
      const result = hypergeometricCDF(52, 13, 5, 2);
      expect(result).toBeCloseTo(0.9072, 3);
    });
  });

  describe('hypergeometricAtLeast', () => {
    it('should calculate P(at least 1 heart in 5-card draw from full deck)', () => {
      const result = hypergeometricAtLeast(52, 13, 5, 1);
      expect(result).toBeCloseTo(0.7785, 3);
    });

    it('should return 1 when k <= 0', () => {
      expect(hypergeometricAtLeast(52, 13, 5, 0)).toBe(1);
      expect(hypergeometricAtLeast(52, 13, 5, -1)).toBe(1);
    });

    it('should calculate flush probability: P(at least 5 of same suit)', () => {
      // 13 hearts, draw 5, need all 5 to be hearts
      const result = hypergeometricPMF(52, 13, 5, 5);
      expect(result).toBeCloseTo(0.000495, 5);
    });

    it('should satisfy P(at least k) + P(at most k-1) = 1', () => {
      const atLeast2 = hypergeometricAtLeast(52, 13, 5, 2);
      const atMost1 = hypergeometricCDF(52, 13, 5, 1);
      expect(atLeast2 + atMost1).toBeCloseTo(1, 6);
    });
  });

  describe('hypergeometricExpectedValue', () => {
    it('should calculate expected value correctly', () => {
      // E[X] = n * K / N
      // Draw 5 from 52, 13 hearts: E = 5 * 13 / 52 = 1.25
      expect(hypergeometricExpectedValue(52, 13, 5)).toBe(1.25);
    });

    it('should return 0 for empty deck', () => {
      expect(hypergeometricExpectedValue(0, 0, 0)).toBe(0);
    });

    it('should scale linearly with draws', () => {
      const e5 = hypergeometricExpectedValue(52, 13, 5);
      const e10 = hypergeometricExpectedValue(52, 13, 10);
      expect(e10).toBe(e5 * 2);
    });
  });

  describe('calculateHypergeometric', () => {
    it('should return all probability measures', () => {
      const result = calculateHypergeometric(52, 13, 5, 2);

      expect(result.exactProbability).toBeGreaterThan(0);
      expect(result.atLeastProbability).toBeGreaterThan(0);
      expect(result.atMostProbability).toBeGreaterThan(0);
      expect(result.expectedValue).toBe(1.25);
    });

    it('should have consistent probabilities', () => {
      const result = calculateHypergeometric(52, 13, 5, 2);

      // atLeast + atMost - exact should equal 1
      expect(result.atLeastProbability + result.atMostProbability - result.exactProbability).toBeCloseTo(1, 6);
    });

    it('should handle edge case with all success cards', () => {
      const result = calculateHypergeometric(10, 10, 5, 5);

      expect(result.exactProbability).toBe(1);
      expect(result.atLeastProbability).toBe(1);
      expect(result.atMostProbability).toBe(1);
      expect(result.expectedValue).toBe(5);
    });
  });
});
