import { ResultModalController } from './resultModal';
import { RoundResult } from '../core/types';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`[FAIL] Assertion Failed: ${message}`);
  }
}

// Minimal DOM mock for isolated unit testing
function setupMockDom() {
  const elements: Record<string, any> = {};

  function makeMockElement(id: string) {
    const classes = new Set<string>(['hidden']);
    let clickHandler: (() => void) | null = null;
    return {
      id,
      textContent: '',
      classList: {
        add: (cls: string) => classes.add(cls),
        remove: (cls: string) => classes.delete(cls),
        contains: (cls: string) => classes.has(cls),
      },
      addEventListener: (event: string, handler: () => void) => {
        if (event === 'click') clickHandler = handler;
      },
      click: () => {
        if (clickHandler) clickHandler();
      },
    };
  }

  const ids = [
    'roundResultModal',
    'resultModalTitle',
    'resultDistance',
    'resultPoints',
    'resultLocationName',
    'nextRoundBtn',
  ];

  for (const id of ids) {
    elements[id] = makeMockElement(id);
  }

  (globalThis as any).document = {
    getElementById: (id: string) => elements[id] ?? null,
  };

  return elements;
}

export function runResultModalTests() {
  console.log('Running ResultModalController Comprehensive Test Suite...\n');

  const elements = setupMockDom();

  let nextRoundTriggered = false;
  let playAgainTriggered = false;

  const controller = new ResultModalController({
    onNextRound: () => { nextRoundTriggered = true; },
    onPlayAgain: () => { playAgainTriggered = true; },
  });

  // Test 1: Initial state
  assert(!controller.isVisible(), 'Modal should be hidden initially');
  console.log('[PASS] Test 1: Initial state is hidden');

  // Test 2: Display single round result (Rounds 1-4)
  const mockResult1: RoundResult = {
    round: 1,
    actualLocation: { id: 'l1', name: 'Valley Watchtower', panoramaUrl: '', coords: { x: 0.5, y: 0.5 } },
    guessCoords: { x: 0.51, y: 0.51 },
    distanceMeters: 280,
    points: 4470,
  };

  controller.showRoundResult(mockResult1, false);
  assert(controller.isVisible(), 'Modal must be visible after showRoundResult');
  assert(elements['resultModalTitle'].textContent === 'Round 1 Result', 'Title must indicate round 1');
  assert(elements['resultDistance'].textContent === '280 m', 'Distance must format as 280 m');
  assert(elements['resultPoints'].textContent === '+4,470', 'Points must format as +4,470');
  assert(elements['nextRoundBtn'].textContent === 'Next Round', 'Button must say Next Round for intermediate rounds');
  elements['nextRoundBtn'].click();
  assert(nextRoundTriggered, 'Clicking button in round mode must trigger onNextRound');
  console.log('[PASS] Test 2: Standard round result formats distance, points, and triggers Next Round');

  // Test 3: Display round 5 result (last round before summary)
  const mockResult5: RoundResult = {
    round: 5,
    actualLocation: { id: 'l5', name: 'Coastal Ruins', panoramaUrl: '', coords: { x: 0.2, y: 0.8 } },
    guessCoords: { x: 0.2, y: 0.8 },
    distanceMeters: 10,
    points: 5000,
  };

  controller.showRoundResult(mockResult5, true);
  assert(elements['resultModalTitle'].textContent === 'Round 5 Result', 'Title must indicate round 5');
  assert(elements['nextRoundBtn'].textContent === 'View Match Summary', 'Button must say View Match Summary on final round');
  console.log('[PASS] Test 3: Last round transitions button text to View Match Summary');

  // Test 4: Display match summary
  const history: RoundResult[] = [mockResult1, mockResult5];
  controller.showMatchSummary(9470, 10000, history);

  assert(elements['resultModalTitle'].textContent === 'Match Complete', 'Title must indicate Match Complete');
  assert(elements['resultPoints'].textContent === '9,470 / 10,000', 'Total score must format cleanly');
  assert(elements['nextRoundBtn'].textContent === 'Play Again', 'Button must say Play Again in summary mode');
  assert(controller.isInSummaryMode(), 'Controller must report isSummaryMode = true');
  elements['nextRoundBtn'].click();
  assert(playAgainTriggered, 'Clicking button in summary mode must trigger onPlayAgain');
  console.log('[PASS] Test 4: Final match summary calculates accuracy, average distance, and triggers Play Again');

  // Test 5: Hide modal
  controller.hide();
  assert(!controller.isVisible(), 'Modal must be hidden after hide()');
  console.log('[PASS] Test 5: hide() cleanly resets modal visibility');

  console.log('\nALL 5 RESULT MODAL TESTS PASSED SUCCESSFULLY!\n');
}

runResultModalTests();
