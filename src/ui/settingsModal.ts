import { SettingsManager, UserSettings } from '../core/settings';

export interface SettingsModalElements {
  container: HTMLElement;
  invertXBtn: HTMLButtonElement;
  invertYBtn: HTMLButtonElement;
  sensitivitySlider: HTMLInputElement;
  sensitivityValue: HTMLElement;
  zoomBtn: HTMLButtonElement;
  dynamicResBtn: HTMLButtonElement;
  resetBtn: HTMLButtonElement;
  closeBtn: HTMLButtonElement;
}

export class SettingsModalController {
  private elements: SettingsModalElements;
  private manager: SettingsManager;
  private isVisible = false;
  private unsubscribeSettings: (() => void) | null = null;

  constructor(elements: SettingsModalElements, manager: SettingsManager) {
    this.elements = elements;
    this.manager = manager;

    this.bindEvents();
    this.syncUI(this.manager.getSettings());

    // Subscribe to settings changes so UI stays up to date
    this.unsubscribeSettings = this.manager.subscribe((settings) => {
      this.syncUI(settings);
    });

    this.close();
  }

  public open(): void {
    this.isVisible = true;
    this.elements.container.classList.remove('hidden');
    this.syncUI(this.manager.getSettings());
  }

  public close(): void {
    this.isVisible = false;
    this.elements.container.classList.add('hidden');
  }

  public toggle(): boolean {
    if (this.isVisible) {
      this.close();
    } else {
      this.open();
    }
    return this.isVisible;
  }

  public isOpen(): boolean {
    return this.isVisible;
  }

  public destroy(): void {
    if (this.unsubscribeSettings) {
      this.unsubscribeSettings();
      this.unsubscribeSettings = null;
    }
  }

  private bindEvents(): void {
    // Invert X toggle
    this.elements.invertXBtn.addEventListener('click', () => {
      const current = this.manager.getSettings().invertX;
      this.manager.updateSettings({ invertX: !current });
    });

    // Invert Y toggle
    this.elements.invertYBtn.addEventListener('click', () => {
      const current = this.manager.getSettings().invertY;
      this.manager.updateSettings({ invertY: !current });
    });

    // Sensitivity slider
    this.elements.sensitivitySlider.addEventListener('input', () => {
      const val = parseFloat(this.elements.sensitivitySlider.value) / 100;
      this.manager.updateSettings({ sensitivity: val });
    });

    // Zoom toggle
    this.elements.zoomBtn.addEventListener('click', () => {
      const current = this.manager.getSettings().enableZoom;
      this.manager.updateSettings({ enableZoom: !current });
    });

    // Dynamic resolution toggle
    this.elements.dynamicResBtn.addEventListener('click', () => {
      const current = this.manager.getSettings().dynamicResolution;
      this.manager.updateSettings({ dynamicResolution: !current });
    });

    // Reset button
    this.elements.resetBtn.addEventListener('click', () => {
      this.manager.resetToDefaults();
    });

    // Close button
    this.elements.closeBtn.addEventListener('click', () => {
      this.close();
    });

    // Close on clicking backdrop
    this.elements.container.addEventListener('click', (e) => {
      if (e.target === this.elements.container) {
        this.close();
      }
    });
  }

  private syncUI(settings: UserSettings): void {
    // Invert X
    this.elements.invertXBtn.textContent = settings.invertX ? 'Inverted' : 'Normal';
    this.setToggleStyle(this.elements.invertXBtn, settings.invertX);

    // Invert Y
    this.elements.invertYBtn.textContent = settings.invertY ? 'Inverted' : 'Normal';
    this.setToggleStyle(this.elements.invertYBtn, settings.invertY);

    // Sensitivity
    const percentage = Math.round(settings.sensitivity * 100);
    this.elements.sensitivitySlider.value = String(percentage);
    this.elements.sensitivityValue.textContent = `${percentage}%`;

    // Zoom
    this.elements.zoomBtn.textContent = settings.enableZoom ? 'Enabled' : 'Disabled';
    this.setToggleStyle(this.elements.zoomBtn, settings.enableZoom);

    // Dynamic Resolution
    this.elements.dynamicResBtn.textContent = settings.dynamicResolution
      ? 'Enabled (720p Drag)'
      : 'Disabled (1080p Fixed)';
    this.setToggleStyle(this.elements.dynamicResBtn, settings.dynamicResolution);
  }

  private setToggleStyle(btn: HTMLButtonElement, isActive: boolean): void {
    if (isActive) {
      btn.classList.add('border-skyrim-accent', 'text-skyrim-accent', 'bg-skyrim-accent/10');
      btn.classList.remove('border-slate-800', 'text-slate-400', 'bg-slate-950');
    } else {
      btn.classList.remove('border-skyrim-accent', 'text-skyrim-accent', 'bg-skyrim-accent/10');
      btn.classList.add('border-slate-800', 'text-slate-400', 'bg-slate-950');
    }
  }
}
