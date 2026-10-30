import { Coordinates2D } from '../core/types';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`[FAIL] Assertion Failed: ${message}`);
  }
}

// Standalone mathematical model matching TerrainMapViewer implementation
function worldToNormalized(worldX: number, worldZ: number, mapSize = 100): Coordinates2D {
  const normX = Math.max(0, Math.min(1, (worldX + mapSize / 2) / mapSize));
  const normY = Math.max(0, Math.min(1, (worldZ + mapSize / 2) / mapSize));
  return { x: Number(normX.toFixed(4)), y: Number(normY.toFixed(4)) };
}

function normalizedToWorld(coords: Coordinates2D, mapSize = 100): { x: number; z: number } {
  const clampedX = Math.max(0, Math.min(1, coords.x));
  const clampedY = Math.max(0, Math.min(1, coords.y));
  const worldX = clampedX * mapSize - mapSize / 2;
  const worldZ = clampedY * mapSize - mapSize / 2;
  return { x: Number(worldX.toFixed(2)), z: Number(worldZ.toFixed(2)) };
}

export function runCoordinateTests() {
  console.log('Running Coordinate Normalization Comprehensive Test Suite...\n');

  // Test 1: Origin / Center coordinate
  const centerNorm = worldToNormalized(0, 0);
  assert(centerNorm.x === 0.5 && centerNorm.y === 0.5, `Expected center to be (0.5, 0.5), got (${centerNorm.x}, ${centerNorm.y})`);
  console.log('[PASS] Test 1: World center (0, 0) maps to normalized (0.5, 0.5)');

  // Test 2: Boundaries and corners
  const minCorner = worldToNormalized(-50, -50);
  assert(minCorner.x === 0 && minCorner.y === 0, `Expected min corner to be (0, 0), got (${minCorner.x}, ${minCorner.y})`);

  const maxCorner = worldToNormalized(50, 50);
  assert(maxCorner.x === 1 && maxCorner.y === 1, `Expected max corner to be (1, 1), got (${maxCorner.x}, ${maxCorner.y})`);
  console.log('[PASS] Test 2: Bounding corners map precisely to (0, 0) and (1, 1)');

  // Test 3: Out-of-bounds clamping
  const outOfBounds = worldToNormalized(-100, 200);
  assert(outOfBounds.x === 0 && outOfBounds.y === 1, `Expected out of bounds to clamp to (0, 1), got (${outOfBounds.x}, ${outOfBounds.y})`);
  console.log('[PASS] Test 3: Out-of-bounds coordinates clamp safely to [0, 1]');

  // Test 4: Reverse transformation (normalized to world)
  const worldFromCenter = normalizedToWorld({ x: 0.5, y: 0.5 });
  assert(worldFromCenter.x === 0 && worldFromCenter.z === 0, `Expected center world to be (0, 0), got (${worldFromCenter.x}, ${worldFromCenter.z})`);

  const worldFromCorner = normalizedToWorld({ x: 0, y: 1 });
  assert(worldFromCorner.x === -50 && worldFromCorner.z === 50, `Expected world corner (-50, 50), got (${worldFromCorner.x}, ${worldFromCorner.z})`);
  console.log('[PASS] Test 4: Normalized coordinates map back to correct world 3D units');

  // Test 5: Roundtrip accuracy
  const testCoords = [
    { x: 0.1234, y: 0.5678 },
    { x: 0.75, y: 0.25 },
    { x: 0.05, y: 0.95 },
  ];
  for (const c of testCoords) {
    const w = normalizedToWorld(c);
    const roundtrip = worldToNormalized(w.x, w.z);
    assert(
      Math.abs(roundtrip.x - c.x) < 0.001 && Math.abs(roundtrip.y - c.y) < 0.001,
      `Roundtrip failed for (${c.x}, ${c.y}) -> (${w.x}, ${w.z}) -> (${roundtrip.x}, ${roundtrip.y})`
    );
  }
  console.log('[PASS] Test 5: Bi-directional roundtrip maintains decimal precision');

  console.log('\nALL 5 COORDINATE TESTS PASSED SUCCESSFULLY!\n');
}

runCoordinateTests();
