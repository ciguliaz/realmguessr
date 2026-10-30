import { Coordinates2D } from './types';

/**
 * Calculates Euclidean distance between two 2D points
 */
export function calculateDistance(p1: Coordinates2D, p2: Coordinates2D): number {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Computes standard GeoGuessr score between 0 and 5,000 points using exponential decay
 * @param distance Distance in meters
 * @param decayConstant Scaling factor controlling scoring steepness (e.g. 1500 for a medium open-world map)
 */
export function calculateScore(distance: number, decayConstant = 1500): number {
  if (distance <= 15) {
    return 5000; // Perfect score threshold
  }
  const score = 5000 * Math.exp(-distance / decayConstant);
  return Math.max(0, Math.min(5000, Math.round(score)));
}

/**
 * Formats distance into a human-readable string (meters or kilometers)
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(2)} km`;
}
