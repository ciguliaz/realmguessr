export interface Coordinates3D {
  x: number;
  y: number;
  z: number;
}

export interface Coordinates2D {
  x: number;
  y: number;
}

export interface GameLocation {
  id: string;
  name: string;
  hint?: string;
  panoramaUrl: string;
  coords: Coordinates2D; // In normalized [0, 1] or game engine units
}

export interface GameConfig {
  id: string;
  title: string;
  subtitle: string;
  bounds: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  };
  heightmapUrl?: string;
  textureUrl?: string;
  locations: GameLocation[];
}

export interface RoundResult {
  round: number;
  actualLocation: GameLocation;
  guessCoords: Coordinates2D;
  distanceMeters: number;
  points: number;
}

export interface GameState {
  currentGame: GameConfig;
  currentRoundIndex: number;
  totalScore: number;
  rounds: RoundResult[];
  isRoundComplete: boolean;
  isGameComplete: boolean;
}
