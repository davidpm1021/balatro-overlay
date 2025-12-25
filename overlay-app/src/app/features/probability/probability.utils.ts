/**
 * Pure math utility functions for probability calculations.
 * These are standalone functions with no Angular dependencies.
 */

import { HypergeometricResult } from './probability.models';

/**
 * Calculate binomial coefficient C(n, k) = n! / (k! * (n-k)!)
 * Uses multiplicative formula to avoid factorial overflow.
 *
 * @param n - Total items
 * @param k - Items to choose
 * @returns The binomial coefficient, or 0 for invalid inputs
 */
export function binomialCoefficient(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  if (k === 0 || k === n) return 1;

  // Use symmetry: C(n,k) = C(n, n-k) to minimize iterations
  k = Math.min(k, n - k);

  let result = 1;
  for (let i = 0; i < k; i++) {
    result = (result * (n - i)) / (i + 1);
  }
  return Math.round(result);
}

/**
 * Hypergeometric probability mass function P(X = k).
 * Calculates the probability of exactly k successes in n draws
 * from a population of N items with K success items.
 *
 * Formula: C(K, k) * C(N-K, n-k) / C(N, n)
 *
 * @param N - Total population size (cards in deck)
 * @param K - Number of success states in population (e.g., hearts)
 * @param n - Number of draws
 * @param k - Number of observed successes
 * @returns Probability of exactly k successes
 */
export function hypergeometricPMF(N: number, K: number, n: number, k: number): number {
  // Handle edge case of empty deck
  if (N === 0) return 0;

  // k must be in valid range: max(0, n-(N-K)) <= k <= min(K, n)
  const minK = Math.max(0, n - (N - K));
  const maxK = Math.min(K, n);

  if (k < minK || k > maxK) {
    return 0;
  }

  const numerator = binomialCoefficient(K, k) * binomialCoefficient(N - K, n - k);
  const denominator = binomialCoefficient(N, n);

  return denominator === 0 ? 0 : numerator / denominator;
}

/**
 * Cumulative distribution function P(X <= k).
 * Calculates the probability of at most k successes.
 *
 * @param N - Total population size
 * @param K - Number of success states in population
 * @param n - Number of draws
 * @param k - Maximum number of successes
 * @returns Probability of at most k successes
 */
export function hypergeometricCDF(N: number, K: number, n: number, k: number): number {
  let sum = 0;
  for (let i = 0; i <= k; i++) {
    sum += hypergeometricPMF(N, K, n, i);
  }
  // Clamp to [0, 1] to handle floating point errors
  return Math.min(1, Math.max(0, sum));
}

/**
 * Calculate P(X >= k) - probability of at least k successes.
 * This is the complement of P(X <= k-1).
 *
 * @param N - Total population size
 * @param K - Number of success states in population
 * @param n - Number of draws
 * @param k - Minimum number of successes desired
 * @returns Probability of at least k successes
 */
export function hypergeometricAtLeast(N: number, K: number, n: number, k: number): number {
  if (k <= 0) return 1;
  return 1 - hypergeometricCDF(N, K, n, k - 1);
}

/**
 * Expected value E[X] = n * K / N.
 * The expected number of successes in n draws.
 *
 * @param N - Total population size
 * @param K - Number of success states in population
 * @param n - Number of draws
 * @returns Expected number of successes
 */
export function hypergeometricExpectedValue(N: number, K: number, n: number): number {
  if (N === 0) return 0;
  return (n * K) / N;
}

/**
 * Calculate complete hypergeometric probability result.
 * Returns exact, at-least, at-most probabilities and expected value.
 *
 * @param totalCards - Total cards in deck (N)
 * @param successCards - Cards that count as success (K)
 * @param draws - Number of draws (n)
 * @param desiredSuccesses - Number of successes we want (k)
 * @returns Complete probability analysis
 */
export function calculateHypergeometric(
  totalCards: number,
  successCards: number,
  draws: number,
  desiredSuccesses: number
): HypergeometricResult {
  return {
    exactProbability: hypergeometricPMF(totalCards, successCards, draws, desiredSuccesses),
    atLeastProbability: hypergeometricAtLeast(totalCards, successCards, draws, desiredSuccesses),
    atMostProbability: hypergeometricCDF(totalCards, successCards, draws, desiredSuccesses),
    expectedValue: hypergeometricExpectedValue(totalCards, successCards, draws)
  };
}
