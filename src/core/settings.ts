export interface UserSettings {
  invertX: boolean;
  invertY: boolean;
  sensitivity: number; // Multiplier: 0.5 (half speed) to 2.0 (double speed)
  enableZoom: boolean;
  dynamicResolution: boolean;
}

export const DEFAULT_SETTINGS: UserSettings = {
  invertX: false,
  invertY: false,
  sensitivity: 1.0,
  enableZoom: true,
  dynamicResolution: true,
};

export const SETTINGS_STORAGE_KEY = 'realmguessr_settings_v1';

export type SettingsListener = (settings: UserSettings) => void;

export interface StorageProvider {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export class SettingsManager {
  private currentSettings: UserSettings;
  private storage: StorageProvider | null;
  private listeners: Set<SettingsListener> = new Set();

  constructor(customStorage?: StorageProvider) {
    if (customStorage) {
      this.storage = customStorage;
    } else if (typeof window !== 'undefined' && window.localStorage) {
      this.storage = window.localStorage;
    } else {
      this.storage = null;
    }

    this.currentSettings = this.loadSettings();
  }

  public getSettings(): UserSettings {
    return { ...this.currentSettings };
  }

  public updateSettings(partial: Partial<UserSettings>): UserSettings {
    const updated: UserSettings = {
      ...this.currentSettings,
      ...partial,
    };

    // Sanitize and clamp values
    updated.invertX = Boolean(updated.invertX);
    updated.invertY = Boolean(updated.invertY);
    updated.enableZoom = Boolean(updated.enableZoom);
    updated.dynamicResolution = Boolean(updated.dynamicResolution);
    updated.sensitivity = Math.max(0.5, Math.min(2.0, Number(updated.sensitivity) || 1.0));

    this.currentSettings = updated;
    this.persistSettings(this.currentSettings);
    this.notifyListeners();
    return this.getSettings();
  }

  public resetToDefaults(): UserSettings {
    this.currentSettings = { ...DEFAULT_SETTINGS };
    this.persistSettings(this.currentSettings);
    this.notifyListeners();
    return this.getSettings();
  }

  public subscribe(listener: SettingsListener): () => void {
    this.listeners.add(listener);
    // Immediately emit current state
    listener(this.getSettings());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private loadSettings(): UserSettings {
    if (!this.storage) {
      return { ...DEFAULT_SETTINGS };
    }

    try {
      const raw = this.storage.getItem(SETTINGS_STORAGE_KEY);
      if (!raw) {
        return { ...DEFAULT_SETTINGS };
      }

      const parsed = JSON.parse(raw);
      if (typeof parsed !== 'object' || parsed === null) {
        return { ...DEFAULT_SETTINGS };
      }

      return {
        invertX: typeof parsed.invertX === 'boolean' ? parsed.invertX : DEFAULT_SETTINGS.invertX,
        invertY: typeof parsed.invertY === 'boolean' ? parsed.invertY : DEFAULT_SETTINGS.invertY,
        sensitivity:
          typeof parsed.sensitivity === 'number' && !isNaN(parsed.sensitivity)
            ? Math.max(0.5, Math.min(2.0, parsed.sensitivity))
            : DEFAULT_SETTINGS.sensitivity,
        enableZoom:
          typeof parsed.enableZoom === 'boolean' ? parsed.enableZoom : DEFAULT_SETTINGS.enableZoom,
        dynamicResolution:
          typeof parsed.dynamicResolution === 'boolean'
            ? parsed.dynamicResolution
            : DEFAULT_SETTINGS.dynamicResolution,
      };
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  }

  private persistSettings(settings: UserSettings): void {
    if (!this.storage) return;
    try {
      this.storage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // Ignore quota or disabled storage errors safely
    }
  }

  private notifyListeners(): void {
    const snapshot = this.getSettings();
    for (const listener of this.listeners) {
      listener(snapshot);
    }
  }
}
