import { GameSession, mockGameConfig } from './gameLoop';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`[FAIL] Assertion Failed: ${message}`);
  }
}

export function runGameLoopTests() {
  console.log('Running GameSession Comprehensive Test Suite...\n');

  // Test 1: Initial state
  const session = new GameSession(mockGameConfig);
  assert(session.getState() === 'IDLE', 'Initial state must be IDLE');
  console.log('[PASS] Test 1: Initial state is IDLE');

  // Test 2: Start session
  const snapshot = session.start({ realmId: 'training_grounds', timerSeconds: 90, explorationMode: 'classic' });
  assert(snapshot.state === 'IN_ROUND', 'State after start must be IN_ROUND');
  assert(snapshot.currentRoundIndex === 0, 'First round index must be 0');
  assert(snapshot.totalScore === 0, 'Starting score must be 0');
  assert(snapshot.currentLocation.id === 'mock_loc_1', 'Must load first location');
  console.log('[PASS] Test 2: Session starts in round 1 with 0 score');

  // Test 3: Perfect guess (exact coordinates)
  const loc1 = mockGameConfig.locations[0];
  const perfectResult = session.submitGuess({ x: loc1.coords.x, y: loc1.coords.y });
  assert(perfectResult.points === 5000, `Expected 5000 points for perfect guess, got ${perfectResult.points}`);
  assert(perfectResult.distanceMeters === 0, 'Distance must be 0 for exact guess');
  assert(session.getState() === 'ROUND_REVEALED', 'State must be ROUND_REVEALED after submit');
  console.log('[PASS] Test 3: Perfect guess awards exactly 5,000 points');

  // Test 4: Next round advance
  const round2Snapshot = session.nextRound();
  assert(round2Snapshot.currentRoundIndex === 1, 'Round index must advance to 1');
  assert(round2Snapshot.state === 'IN_ROUND', 'State must return to IN_ROUND');
  console.log('[PASS] Test 4: Round advances to Round 2');

  // Test 5: Timeout scenario (null coordinates submitted)
  const timeoutResult = session.submitGuess(null);
  assert(timeoutResult.points === 0, `Expected 0 points for timeout/null guess, got ${timeoutResult.points}`);
  assert(timeoutResult.distanceMeters > 0, 'Distance must be > 0 on timeout');
  assert(session.getSnapshot().totalScore === 5000, 'Total score should remain 5000 (0 added)');
  console.log('[PASS] Test 5: Timeout (null coordinates) awards 0 points without crashing');

  // Test 6: Advance through remaining rounds to completion
  session.nextRound(); // to Round 3 (index 2)
  session.submitGuess({ x: 0.5, y: 0.5 }); // perfect for citadel
  session.nextRound(); // to Round 4 (index 3)
  session.submitGuess({ x: 0.85, y: 0.4 }); // perfect for timber ridge
  session.nextRound(); // to Round 5 (index 4)
  session.submitGuess({ x: 0.4, y: 0.15 }); // perfect for lighthouse

  const finalSnapshot = session.nextRound(); // All 5 rounds done
  assert(finalSnapshot.state === 'MATCH_OVER', 'State after round 5 must be MATCH_OVER');
  assert(finalSnapshot.history.length === 5, 'History must contain all 5 rounds');
  console.log('[PASS] Test 6: Completing 5 rounds transitions state to MATCH_OVER with full history');

  // Test 7: Invalid state action guard
  let errorCaught = false;
  try {
    session.submitGuess({ x: 0, y: 0 });
  } catch {
    errorCaught = true;
  }
  assert(errorCaught, 'Submitting guess while in MATCH_OVER must throw error');
  console.log('[PASS] Test 7: Invalid state transitions throw descriptive errors');

  // Test 8: Clean abort
  session.abort();
  assert(session.getState() === 'IDLE', 'State must be IDLE after abort');
  assert(session.getSnapshot().totalScore === 0, 'Score must be reset to 0 after abort');
  console.log('[PASS] Test 8: abort() cleanly resets state to IDLE');

  console.log('\nALL 8 TESTS PASSED SUCCESSFULLY!\n');
}

// Run if executed directly
runGameLoopTests();
