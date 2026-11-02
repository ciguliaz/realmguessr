import { SettingsModalController, SettingsModalElements } from './settingsModal';
import { SettingsManager, StorageProvider } from '../core/settings';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`[FAIL] Assertion Failed: ${message}`);
  }
}

class MockElement {
  public classList = {
    classes: new Set<string>(['hidden']),
    add: (...cls: string[]) => cls.forEach((c) => this.classList.classes.add(c)),
    remove: (...cls: string[]) => cls.forEach((c) => this.classList.classes.delete(c)),
    contains: (cls: string) => this.classList.classes.has(cls),
  };
  public textContent = '';
  public value = '';
  public listeners: Record<string, ((e?: any) => void)[]> = {};

  public addEventListener(event: string, callback: (e?: any) => void) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  public click() {
    if (this.listeners['click']) {
      this.listeners['click'].forEach((cb) => cb({ target: this }));
    }
  }

  public triggerInput(value: string) {
    this.value = value;
    if (this.listeners['input']) {
      this.listeners['input'].forEach((cb) => cb());
    }
  }
}

class MockStorage implements StorageProvider {
  private store: Map<string, string> = new Map();
  public getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }
  public setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
}

export function runSettingsModalTests() {
  console.log('Running SettingsModalController Comprehensive Test Suite...\n');

  const container = new MockElement() as unknown as HTMLElement;
  const invertXBtn = new MockElement() as unknown as HTMLButtonElement;
  const invertYBtn = new MockElement() as unknown as HTMLButtonElement;
  const sensitivitySlider = new MockElement() as unknown as HTMLInputElement;
  const sensitivityValue = new MockElement() as unknown as HTMLElement;
  const zoomBtn = new MockElement() as unknown as HTMLButtonElement;
  const dynamicResBtn = new MockElement() as unknown as HTMLButtonElement;
  const resetBtn = new MockElement() as unknown as HTMLButtonElement;
  const closeBtn = new MockElement() as unknown as HTMLButtonElement;

  const elements: SettingsModalElements = {
    container,
    invertXBtn,
    invertYBtn,
    sensitivitySlider,
    sensitivityValue,
    zoomBtn,
    dynamicResBtn,
    resetBtn,
    closeBtn,
  };

  const storage = new MockStorage();
  const manager = new SettingsManager(storage);

  const controller = new SettingsModalController(elements, manager);

  // Test 1: Initial state is closed
  assert(!controller.isOpen(), 'Expected modal to be closed initially');
  assert((container as unknown as MockElement).classList.contains('hidden'), 'Expected container hidden class');
  console.log('[PASS] Test 1: Initial state is closed');

  // Test 2: open() and close() toggles hidden class
  controller.open();
  assert(controller.isOpen(), 'Expected modal to be open');
  assert(!(container as unknown as MockElement).classList.contains('hidden'), 'Expected hidden removed');

  controller.close();
  assert(!controller.isOpen(), 'Expected modal to be closed');
  assert((container as unknown as MockElement).classList.contains('hidden'), 'Expected hidden restored');
  console.log('[PASS] Test 2: open() and close() properly manipulate visibility');

  // Test 3: Invert X toggle click updates manager and button text
  (invertXBtn as unknown as MockElement).click();
  assert(manager.getSettings().invertX === true, 'Expected manager invertX to be true');
  assert((invertXBtn as unknown as MockElement).textContent === 'Inverted', 'Expected button text Inverted');

  (invertXBtn as unknown as MockElement).click();
  assert(manager.getSettings().invertX === false, 'Expected manager invertX to be false');
  assert((invertXBtn as unknown as MockElement).textContent === 'Normal', 'Expected button text Normal');
  console.log('[PASS] Test 3: Invert X toggle click updates settings and UI');

  // Test 4: Sensitivity slider updates manager and percentage display
  (sensitivitySlider as unknown as MockElement).triggerInput('150');
  assert(manager.getSettings().sensitivity === 1.5, 'Expected sensitivity to be 1.5');
  assert((sensitivityValue as unknown as MockElement).textContent === '150%', 'Expected display 150%');
  console.log('[PASS] Test 4: Sensitivity slider correctly updates value and display');

  // Test 5: Zoom toggle click updates manager and button text
  (zoomBtn as unknown as MockElement).click();
  assert(manager.getSettings().enableZoom === false, 'Expected zoom disabled');
  assert((zoomBtn as unknown as MockElement).textContent === 'Disabled', 'Expected button text Disabled');

  (zoomBtn as unknown as MockElement).click();
  assert(manager.getSettings().enableZoom === true, 'Expected zoom re-enabled');
  assert((zoomBtn as unknown as MockElement).textContent === 'Enabled', 'Expected button text Enabled');
  console.log('[PASS] Test 5: Zoom toggle click updates settings and UI');

  // Test 6: Reset button restores defaults
  manager.updateSettings({ invertX: true, sensitivity: 1.8, enableZoom: false });
  (resetBtn as unknown as MockElement).click();
  assert(manager.getSettings().invertX === false, 'Expected invertX reset');
  assert(manager.getSettings().sensitivity === 1.0, 'Expected sensitivity reset');
  assert((sensitivityValue as unknown as MockElement).textContent === '100%', 'Expected display 100%');
  console.log('[PASS] Test 6: Reset button restores all default values');

  controller.destroy();
  console.log('ALL 6 SETTINGS MODAL TESTS PASSED SUCCESSFULLY!\n');
}

runSettingsModalTests();
