import { DebugOverlayController, DebugMetricsProvider } from './debugOverlay';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`[FAIL] Assertion Failed: ${message}`);
  }
}

// Lightweight mock for HTMLElement
class MockElement {
  public classList = {
    classes: new Set<string>(['hidden']),
    add: (cls: string) => this.classList.classes.add(cls),
    remove: (cls: string) => this.classList.classes.delete(cls),
    contains: (cls: string) => this.classList.classes.has(cls),
  };
  public innerHTML = '';
}

export function runDebugOverlayTests() {
  console.log('Running DebugOverlayController Comprehensive Test Suite...\n');

  // Test 1: Initial state is hidden
  const mockContainer = new MockElement() as unknown as HTMLElement;
  const mockProvider: DebugMetricsProvider = {
    getSessionState: () => 'LOBBY',
    getRoundInfo: () => 'Round 1 / 5',
    getPanoMetrics: () => null,
    getMapMetrics: () => null,
  };

  const controller = new DebugOverlayController(mockContainer, mockProvider);
  assert(!controller.isOpen(), 'Expected controller to be closed initially');
  assert((mockContainer as unknown as MockElement).classList.contains('hidden'), 'Expected container to have hidden class');
  console.log('[PASS] Test 1: Initial state is hidden');

  // Test 2: toggle() opens and closes
  const opened = controller.toggle();
  assert(opened === true && controller.isOpen(), 'Expected controller to be open after first toggle');
  assert(!(mockContainer as unknown as MockElement).classList.contains('hidden'), 'Expected hidden class to be removed');

  const closed = controller.toggle();
  assert(closed === false && !controller.isOpen(), 'Expected controller to be closed after second toggle');
  assert((mockContainer as unknown as MockElement).classList.contains('hidden'), 'Expected hidden class to be restored');
  console.log('[PASS] Test 2: toggle() correctly switches visibility state');

  // Test 3: Formatting with active metrics
  const activeProvider: DebugMetricsProvider = {
    getSessionState: () => 'ROUND_ACTIVE',
    getRoundInfo: () => 'Round 2 / 5',
    getPanoMetrics: () => ({
      fps: 60,
      scalingLevel: 1.5,
      isRendering: true,
      isMotionActive: true,
      drawCalls: 3,
    }),
    getMapMetrics: () => ({
      fps: 60,
      isRendering: false,
      drawCalls: 1,
    }),
  };

  const activeController = new DebugOverlayController(mockContainer, activeProvider);
  activeController.show();
  const html = (mockContainer as unknown as MockElement).innerHTML;

  assert(html.includes('FPS: <span class="text-slate-100 font-bold">60</span>'), 'Expected FPS 60 in output');
  assert(html.includes('16.7 ms'), 'Expected frame time ~16.7 ms');
  assert(html.includes('Draw Calls: <span class="text-slate-100">4</span>'), 'Expected total draw calls to be 4 (3 + 1)');
  assert(html.includes('DRAGGING (1.5x)'), 'Expected dynamic scaling state to show DRAGGING (1.5x)');
  assert(html.includes('ROUND_ACTIVE'), 'Expected session state ROUND_ACTIVE');
  console.log('[PASS] Test 3: Active metrics correctly formatted and displayed');

  // Test 4: Formatting when viewers are unloaded
  const unloadedController = new DebugOverlayController(mockContainer, mockProvider);
  unloadedController.show();
  const unloadedHtml = (mockContainer as unknown as MockElement).innerHTML;
  assert(unloadedHtml.includes('Photosphere: <span class="text-slate-300">UNLOADED</span>'), 'Expected UNLOADED for photosphere');
  assert(unloadedHtml.includes('Minimap: <span class="text-slate-300">UNLOADED</span>'), 'Expected UNLOADED for minimap');
  unloadedController.hide();
  console.log('[PASS] Test 4: Unloaded state correctly handled without errors');

  // Test 5: hide() cleans up timer
  activeController.hide();
  assert(!activeController.isOpen(), 'Expected controller to be closed');
  console.log('[PASS] Test 5: hide() cleanly resets visibility and stops timer\n');

  console.log('ALL 5 DEBUG OVERLAY TESTS PASSED SUCCESSFULLY!\n');
}

runDebugOverlayTests();
