import { RoundTimer } from './timer';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`[FAIL] Assertion Failed: ${message}`);
  }
}

export function runTimerTests() {
  console.log('Running RoundTimer Wall-Clock Comprehensive Test Suite...\n');

  const timer = new RoundTimer();

  // Test 1: Initial state
  assert(!timer.isActive(), 'Timer should not be active initially');
  assert(timer.getRemainingSeconds() === 0, 'Initial remaining seconds must be 0');
  console.log('[PASS] Test 1: Initial state is inactive with 0s remaining');

  // Test 2: Unlimited mode (seconds = 0)
  let tickValue = -1;
  timer.start(0, (sec) => { tickValue = sec; });
  assert(!timer.isActive(), 'Unlimited mode (0s) must not create an active interval');
  assert(tickValue === 0, 'Unlimited mode must report 0s to tick callback');
  console.log('[PASS] Test 2: Unlimited mode (0s) does not start an active countdown');

  // Test 3: Starting with positive duration
  let initialTickReceived = -1;
  const startTime = Date.now();
  timer.start(30, (sec) => { initialTickReceived = sec; });
  assert(timer.isActive(), 'Timer must be active after start(30)');
  assert(timer.getRemainingSeconds() === 30, 'Remaining seconds must be 30');
  assert(initialTickReceived === 30, 'Immediate initial tick must be fired with 30s');
  console.log('[PASS] Test 3: start(30) sets active state and fires immediate tick');

  // Test 4: Wall-clock simulated time advancement (simulating 5 seconds elapsed)
  timer.tick(startTime + 5000);
  assert(timer.getRemainingSeconds() === 25, `Expected 25s remaining after 5s elapsed, got ${timer.getRemainingSeconds()}s`);
  console.log('[PASS] Test 4: Wall-clock delta accurately computes elapsed time without drift');

  // Test 5: Pause and Resume
  timer.pause(startTime + 5000);
  assert(!timer.isActive(), 'Timer must not be active after pause()');
  assert(timer.isTimerPaused(), 'Timer must report isPaused = true');
  assert(timer.getRemainingSeconds() === 25, 'Remaining seconds must be preserved during pause');

  timer.resume();
  assert(timer.isActive(), 'Timer must be active after resume()');
  assert(!timer.isTimerPaused(), 'Timer must not report isPaused after resume');
  assert(timer.getRemainingSeconds() === 25, 'Resume restarts countdown from preserved duration');
  console.log('[PASS] Test 5: Pause and resume cleanly preserve countdown duration');

  // Test 6: Early stop
  timer.stop();
  assert(!timer.isActive(), 'Timer must become inactive after stop()');
  console.log('[PASS] Test 6: stop() cleanly halts interval');

  // Test 7: Expiration callback via simulated wall-clock completion
  let expired = false;
  const now = Date.now();
  timer.start(5, undefined, () => {
    expired = true;
  });
  timer.tick(now + 2000); // 3s left
  assert(!expired, 'Should not expire at 3s remaining');
  timer.tick(now + 5100); // reached target end
  assert(expired, 'Expiration callback must be invoked when target time is reached');
  assert(!timer.isActive(), 'Timer must stop itself upon expiration');
  console.log('[PASS] Test 7: Target timestamp expiration fires onExpire and halts cleanly');

  // Test 8: Format utility
  assert(RoundTimer.formatTime(90) === '1:30', `Expected '1:30', got ${RoundTimer.formatTime(90)}`);
  assert(RoundTimer.formatTime(45) === '45s', `Expected '45s', got ${RoundTimer.formatTime(45)}`);
  assert(RoundTimer.formatTime(0) === '0s', `Expected '0s', got ${RoundTimer.formatTime(0)}`);
  assert(RoundTimer.formatTime(125) === '2:05', `Expected '2:05', got ${RoundTimer.formatTime(125)}`);
  console.log('[PASS] Test 8: formatTime utility converts seconds to standard HUD strings');

  console.log('\nALL 8 TIMER TESTS PASSED SUCCESSFULLY!\n');
}

runTimerTests();
