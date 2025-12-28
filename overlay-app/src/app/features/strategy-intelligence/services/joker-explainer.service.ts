import { Injectable } from '@angular/core';
import jokerExplanationsJson from '../data/joker-explanations.json';

/**
 * Plain-English joker explanation for new players
 */
export interface JokerExplanation {
  /** What the joker actually does */
  effect: string;
  /** The practical implication / "what this means for you" */
  implication: string;
  /** Tips for using this joker effectively */
  tips: string[];
}

/**
 * Structure of the joker explanations JSON file
 */
interface JokerExplanationsData {
  version: string;
  explanations: Record<string, JokerExplanation>;
}

/**
 * Service that provides plain-English explanations for jokers.
 * Helps new players understand what jokers do and why they matter.
 *
 * Follows the "always explain the why" philosophy from the Product Vision.
 */
@Injectable({ providedIn: 'root' })
export class JokerExplainerService {
  private readonly explanations: Map<string, JokerExplanation>;

  constructor() {
    this.explanations = this.loadExplanations();
  }

  /**
   * Load explanations from JSON into a Map for fast lookup
   */
  private loadExplanations(): Map<string, JokerExplanation> {
    const map = new Map<string, JokerExplanation>();
    const data = jokerExplanationsJson as JokerExplanationsData;

    for (const [jokerId, explanation] of Object.entries(data.explanations)) {
      // Store with both raw ID and j_ prefix for compatibility
      map.set(jokerId, explanation);
      map.set(`j_${jokerId}`, explanation);
    }

    return map;
  }

  /**
   * Get the plain-English explanation for a joker
   * @param jokerId - The joker ID (with or without j_ prefix)
   * @returns The explanation or null if not available
   */
  getExplanation(jokerId: string): JokerExplanation | null {
    // Try direct lookup first
    const direct = this.explanations.get(jokerId);
    if (direct) {
      return direct;
    }

    // Try without j_ prefix
    const withoutPrefix = this.explanations.get(jokerId.replace('j_', ''));
    if (withoutPrefix) {
      return withoutPrefix;
    }

    return null;
  }

  /**
   * Check if an explanation exists for a joker
   * @param jokerId - The joker ID to check
   * @returns True if an explanation exists
   */
  hasExplanation(jokerId: string): boolean {
    return this.getExplanation(jokerId) !== null;
  }

  /**
   * Get the number of available explanations
   * @returns Count of unique joker explanations
   */
  getExplanationCount(): number {
    // Divide by 2 because we store both with and without prefix
    return this.explanations.size / 2;
  }
}
