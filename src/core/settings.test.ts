import {
  SettingsManager,
  DEFAULT_SETTINGS,
  SETTINGS_STORAGE_KEY,
  StorageProvider,
  UserSettings,
} from './settings';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`[FAIL] Assertion Failed: ${message}`);
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

  public clear(): void {
    this.store.clear();
  }
}

export function runSettingsTests() {
  console.log('Running SettingsManager Comprehensive Test Suite...\n');

  // Test 1: Returns defaults when storage is empty
  const storage = new MockStorage();
  const manager = new SettingsManager(storage);
  const initial = manager.getSettings();

  assert(initial.invertX === DEFAULT_SETTINGS.invertX, 'Expected default invertX to match');
  assert(initial.invertY === DEFAULT_SETTINGS.invertY, 'Expected default invertY to match');
  assert(initial.sensitivity === DEFAULT_SETTINGS.sensitivity, 'Expected default sensitivity 1.0');
  assert(initial.enableZoom === DEFAULT_SETTINGS.enableZoom, 'Expected default enableZoom true');
  assert(initial.dynamicResolution === DEFAULT_SETTINGS.dynamicResolution, 'Expected default dynamicResolution true');
  console.log('[PASS] Test 1: Returns defaults when storage is empty');

  // Test 2: Updates partial settings and persists to storage
  const updated = manager.updateSettings({ invertX: true, sensitivity: 1.5 });
  assert(updated.invertX === true, 'Expected invertX to be true');
  assert(updated.invertY === false, 'Expected invertY to remain false');
  assert(updated.sensitivity === 1.5, 'Expected sensitivity to be 1.5');

  const storedRaw = storage.getItem(SETTINGS_STORAGE_KEY);
  assert(storedRaw !== null, 'Expected settings to be written to storage');
  const storedParsed = JSON.parse(storedRaw!) as UserSettings;
  assert(storedParsed.invertX === true, 'Expected stored invertX to be true');
  assert(storedParsed.sensitivity === 1.5, 'Expected stored sensitivity to be 1.5');
  console.log('[PASS] Test 2: Updates partial settings and persists to storage');

  // Test 3: Clamps out-of-range sensitivity values
  manager.updateSettings({ sensitivity: 10.0 });
  assert(manager.getSettings().sensitivity === 2.0, 'Expected sensitivity clamped to 2.0 max');

  manager.updateSettings({ sensitivity: 0.1 });
  assert(manager.getSettings().sensitivity === 0.5, 'Expected sensitivity clamped to 0.5 min');
  console.log('[PASS] Test 3: Clamps out-of-range sensitivity values safely');

  // Test 4: Subscriptions fire on change and return unsubscribe function
  let lastEmitted: UserSettings | null = null;
  const unsubscribe = manager.subscribe((settings) => {
    lastEmitted = settings;
  });

  assert(lastEmitted !== null, 'Expected immediate callback on subscribe');
  manager.updateSettings({ enableZoom: false });
  assert(lastEmitted!.enableZoom === false, 'Expected subscriber to receive updated settings');

  unsubscribe();
  manager.updateSettings({ enableZoom: true });
  assert(lastEmitted!.enableZoom === false, 'Expected subscriber not called after unsubscribe');
  console.log('[PASS] Test 4: Subscriptions fire on change and support unsubscribing');

  // Test 5: resetToDefaults restores all original values
  manager.updateSettings({ invertX: true, invertY: true, sensitivity: 1.8, enableZoom: false });
  manager.resetToDefaults();
  const reset = manager.getSettings();
  assert(reset.invertX === false, 'Expected invertX reset to false');
  assert(reset.invertY === false, 'Expected invertY reset to false');
  assert(reset.sensitivity === 1.0, 'Expected sensitivity reset to 1.0');
  assert(reset.enableZoom === true, 'Expected enableZoom reset to true');
  console.log('[PASS] Test 5: resetToDefaults cleanly restores all baseline values');

  // Test 6: Corrupted or invalid JSON in storage falls back gracefully
  storage.setItem(SETTINGS_STORAGE_KEY, '{ invalid json garbage');
  const fallbackManager = new SettingsManager(storage);
  const fallback = fallbackManager.getSettings();
  assert(fallback.sensitivity === 1.0, 'Expected fallback to default on JSON parse error');
  console.log('[PASS] Test 6: Corrupted storage data falls back cleanly without crashing\n');

  console.log('ALL 6 SETTINGS TESTS PASSED SUCCESSFULLY!\n');
}

runSettingsTests();
