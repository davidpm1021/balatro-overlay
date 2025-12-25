/**
 * Run history and statistics type definitions
 */

import { StrategyType } from './strategy.model';
import { HandType } from './game-state.model';

export type RunOutcome = 'victory' | 'defeat' | 'abandoned';

export type DeckType =
  | 'red'
  | 'blue'
  | 'yellow'
  | 'green'
  | 'black'
  | 'magic'
  | 'nebula'
  | 'ghost'
  | 'abandoned'
  | 'checkered'
  | 'zodiac'
  | 'painted'
  | 'anaglyph'
  | 'plasma'
  | 'erratic';

export type StakeLevel = 'white' | 'red' | 'green' | 'black' | 'blue' | 'purple' | 'orange' | 'gold';

/**
 * Summary of a completed run
 */
export interface RunSummary {
  id: string;           // Unique run ID
  seed?: string;        // Game seed if available
  startedAt: number;    // Unix timestamp
  endedAt: number;      // Unix timestamp
  duration: number;     // Seconds

  // Run configuration
  deck: DeckType;
  stake: StakeLevel;

  // Outcome
  outcome: RunOutcome;
  finalAnte: number;
  finalRound: number;

  // Strategy used
  primaryStrategy: StrategyType;
  detectedStrategies: StrategyType[];

  // Key stats
  maxScore: number;
  totalMoneyEarned: number;
  jokersUsed: string[];       // Joker IDs
  handsPlayed: number;
  discardsUsed: number;

  // Best hand
  bestHand: {
    type: HandType;
    score: number;
    cards: string[];  // Card descriptions
  };
}

/**
 * Aggregate statistics for personal meta tracking
 */
export interface PlayerStats {
  // Overall
  totalRuns: number;
  totalWins: number;
  totalLosses: number;
  winRate: number;

  // By deck
  deckStats: Record<DeckType, DeckStat>;

  // By strategy
  strategyStats: Record<StrategyType, StrategyStat>;

  // By joker (top performers)
  jokerStats: JokerStat[];

  // Time stats
  totalPlayTime: number;      // Seconds
  averageRunDuration: number; // Seconds
  fastestWin?: RunSummary;
  longestRun?: RunSummary;

  // Streaks
  currentWinStreak: number;
  bestWinStreak: number;
  currentLossStreak: number;

  // High scores
  highestScore: number;
  highestAnte: number;
}

export interface DeckStat {
  deck: DeckType;
  runs: number;
  wins: number;
  losses: number;
  winRate: number;
  averageAnte: number;
}

export interface StrategyStat {
  strategy: StrategyType;
  runs: number;
  wins: number;
  losses: number;
  winRate: number;
  averageAnte: number;
  bestRun?: RunSummary;
}

export interface JokerStat {
  jokerId: string;
  jokerName: string;
  timesUsed: number;
  winsWith: number;
  winRate: number;
  averageFinalAnte: number;
}
