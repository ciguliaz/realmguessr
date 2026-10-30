import { GameConfig, GameLocation, Coordinates2D, RoundResult } from './types';
import { calculateDistance, calculateScore } from './math';
import { MatchSettings } from '../ui/lobby';

export type SessionState = 'IDLE' | 'IN_ROUND' | 'ROUND_REVEALED' | 'MATCH_OVER';

export interface GameSessionSnapshot {
  state: SessionState;
  currentRoundIndex: number;
  totalRounds: number;
  currentLocation: GameLocation;
  totalScore: number;
  lastRoundResult: RoundResult | null;
  history: RoundResult[];
  settings: MatchSettings;
}

/**
 * Generic mock game configuration for testing the game loop
 * independently of any specific real-world or game asset pack.
 */
export const mockGameConfig: GameConfig = {
  id: 'training_grounds',
  title: 'Training Grounds',
  subtitle: 'Orientation Realm (5 Target Landmarks)',
  bounds: {
    minX: 0,
    maxX: 10000,
    minY: 0,
    maxY: 10000,
  },
  locations: [
    {
      id: 'mock_loc_1',
      name: 'North Observation Post',
      hint: 'Near the northern signal tower overlooking the valley.',
      panoramaUrl: '/mock/north_post.jpg',
      coords: { x: 0.5, y: 0.8 },
    },
    {
      id: 'mock_loc_2',
      name: 'Sunken Valley Crossing',
      hint: 'Shallow river basin between rocky cliffs.',
      panoramaUrl: '/mock/sunken_valley.jpg',
      coords: { x: 0.2, y: 0.3 },
    },
    {
      id: 'mock_loc_3',
      name: 'Central Citadel Ruins',
      hint: 'Ancient stone archway in the heart of the realm.',
      panoramaUrl: '/mock/citadel_ruins.jpg',
      coords: { x: 0.5, y: 0.5 },
    },
    {
      id: 'mock_loc_4',
      name: 'Eastern Timber Ridge',
      hint: 'Dense tree line facing the sunrise ridge.',
      panoramaUrl: '/mock/timber_ridge.jpg',
      coords: { x: 0.85, y: 0.4 },
    },
    {
      id: 'mock_loc_5',
      name: 'South Sea Lighthouse',
      hint: 'Cliffside lighthouse beacon warning ships.',
      panoramaUrl: '/mock/lighthouse.jpg',
      coords: { x: 0.4, y: 0.15 },
    },
  ],
};

export class GameSession {
  private config: GameConfig;
  private settings: MatchSettings;
  private state: SessionState = 'IDLE';
  private currentRoundIndex = 0;
  private totalScore = 0;
  private history: RoundResult[] = [];
  private lastRoundResult: RoundResult | null = null;

  // Scale factor: converts normalized [0, 1] distance to world units (meters)
  private mapScaleMeters = 20000;

  constructor(config: GameConfig = mockGameConfig) {
    this.config = config;
    this.settings = {
      realmId: config.id,
      timerSeconds: 0,
      explorationMode: 'classic',
    };
  }

  /**
   * Starts a new match with the given settings and optional custom config
   */
  public start(settings: MatchSettings, customConfig?: GameConfig): GameSessionSnapshot {
    if (customConfig) {
      this.config = customConfig;
    }
    this.settings = settings;
    this.state = 'IN_ROUND';
    this.currentRoundIndex = 0;
    this.totalScore = 0;
    this.history = [];
    this.lastRoundResult = null;

    return this.getSnapshot();
  }

  /**
   * Submits a guess for the active round.
   * If guessCoords is null (e.g. timeout), awards 0 points and reveals actual location.
   */
  public submitGuess(guessCoords: Coordinates2D | null): RoundResult {
    if (this.state !== 'IN_ROUND') {
      throw new Error(`Cannot submit guess while in state: ${this.state}`);
    }

    const actualLocation = this.config.locations[this.currentRoundIndex];
    let distanceMeters: number;
    let points: number;
    const fallbackCoords: Coordinates2D = guessCoords ?? { x: 0.5, y: 0.5 };

    if (!guessCoords) {
      // Timeout without pin placed: 0 points awarded, max distance recorded
      distanceMeters = this.mapScaleMeters;
      points = 0;
    } else {
      const rawDistance = calculateDistance(guessCoords, actualLocation.coords);
      distanceMeters = rawDistance * this.mapScaleMeters;
      points = calculateScore(distanceMeters, 2500);
    }

    const result: RoundResult = {
      round: this.currentRoundIndex + 1,
      actualLocation,
      guessCoords: fallbackCoords,
      distanceMeters,
      points,
    };

    this.lastRoundResult = result;
    this.history.push(result);
    this.totalScore += points;
    this.state = 'ROUND_REVEALED';

    return result;
  }

  /**
   * Advances to the next round, or transitions to MATCH_OVER if 5 rounds are done
   */
  public nextRound(): GameSessionSnapshot {
    if (this.state !== 'ROUND_REVEALED') {
      throw new Error(`Cannot advance round while in state: ${this.state}`);
    }

    if (this.currentRoundIndex < this.config.locations.length - 1) {
      this.currentRoundIndex++;
      this.state = 'IN_ROUND';
    } else {
      this.state = 'MATCH_OVER';
    }

    return this.getSnapshot();
  }

  /**
   * Aborts the active match cleanly (e.g. user clicked Return to Menu)
   */
  public abort(): void {
    this.state = 'IDLE';
    this.currentRoundIndex = 0;
    this.totalScore = 0;
    this.history = [];
    this.lastRoundResult = null;
  }

  /**
   * Returns an immutable snapshot of current game state
   */
  public getSnapshot(): GameSessionSnapshot {
    return {
      state: this.state,
      currentRoundIndex: this.currentRoundIndex,
      totalRounds: this.config.locations.length,
      currentLocation: this.config.locations[this.currentRoundIndex],
      totalScore: this.totalScore,
      lastRoundResult: this.lastRoundResult,
      history: [...this.history],
      settings: { ...this.settings },
    };
  }

  public getState(): SessionState {
    return this.state;
  }
}
