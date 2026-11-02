export interface DebugMetricsProvider {
  getSessionState: () => string;
  getRoundInfo: () => string;
  getPanoMetrics: () => {
    fps: number;
    scalingLevel: number;
    isRendering: boolean;
    isMotionActive: boolean;
    drawCalls: number;
  } | null;
  getMapMetrics: () => {
    fps: number;
    isRendering: boolean;
    drawCalls: number;
  } | null;
}

export class DebugOverlayController {
  private container: HTMLElement;
  private provider: DebugMetricsProvider;
  private isVisible = false;
  private updateTimer: ReturnType<typeof setInterval> | null = null;

  constructor(container: HTMLElement, provider: DebugMetricsProvider) {
    this.container = container;
    this.provider = provider;
    this.hide();
  }

  public toggle(): boolean {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
    return this.isVisible;
  }

  public show(): void {
    this.isVisible = true;
    this.container.classList.remove('hidden');
    this.startUpdating();
  }

  public hide(): void {
    this.isVisible = false;
    this.container.classList.add('hidden');
    this.stopUpdating();
  }

  public isOpen(): boolean {
    return this.isVisible;
  }

  private startUpdating(): void {
    this.stopUpdating();
    this.renderMetrics();
    // Update every 200ms (5 times/sec) for smooth monitoring without CPU overhead
    this.updateTimer = setInterval(() => {
      this.renderMetrics();
    }, 200);
  }

  private stopUpdating(): void {
    if (this.updateTimer !== null) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }
  }

  public renderMetrics(): void {
    if (!this.isVisible) return;
    const pano = this.provider.getPanoMetrics();
    const map = this.provider.getMapMetrics();
    const sessionState = this.provider.getSessionState();
    const roundInfo = this.provider.getRoundInfo();

    const fps = pano ? pano.fps : 0;
    const frameTime = fps > 0 ? (1000 / fps).toFixed(1) : '0.0';
    const panoState = !pano
      ? 'UNLOADED'
      : (pano.isMotionActive
          ? `DRAGGING (${pano.scalingLevel.toFixed(1)}x)`
          : (pano.isRendering ? `IDLE (${pano.scalingLevel.toFixed(1)}x)` : 'SLEEPING'));
    const mapState = !map
      ? 'UNLOADED'
      : (map.isRendering ? 'ACTIVE' : 'SLEEPING');
    const drawCalls = (pano?.drawCalls ?? 0) + (map?.drawCalls ?? 0);

    this.container.innerHTML = `
      <div>FPS: <span class="text-slate-100 font-bold">${fps}</span> (${frameTime} ms)</div>
      <div>Draw Calls: <span class="text-slate-100">${drawCalls}</span></div>
      <div>Photosphere: <span class="${pano?.isMotionActive ? 'text-amber-400' : 'text-slate-300'}">${panoState}</span></div>
      <div>Minimap: <span class="text-slate-300">${mapState}</span></div>
      <div class="pt-1 mt-1 border-t border-slate-800/80 text-[10px] text-slate-400">
        State: <span class="text-skyrim-ice font-semibold">${sessionState}</span> • ${roundInfo}
      </div>
    `;
  }
}
