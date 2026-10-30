export class RoundTimer {
  private remainingSeconds = 0;
  private targetEndTime = 0;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private isPaused = false;
  private onTickCallback?: (seconds: number) => void;
  private onExpireCallback?: () => void;

  /**
   * Starts or restarts a round countdown timer.
   * If seconds is 0 or negative, treats as unlimited mode (no interval created).
   */
  public start(
    seconds: number,
    onTick?: (seconds: number) => void,
    onExpire?: () => void
  ): void {
    this.stop(); // Guarantee no overlapping intervals

    this.onTickCallback = onTick;
    this.onExpireCallback = onExpire;
    this.isPaused = false;

    if (seconds <= 0) {
      this.remainingSeconds = 0;
      this.targetEndTime = 0;
      if (this.onTickCallback) {
        this.onTickCallback(0);
      }
      return;
    }

    this.remainingSeconds = Math.max(0, Math.floor(seconds));
    this.targetEndTime = Date.now() + this.remainingSeconds * 1000;

    // Initial immediate tick so the HUD updates instantly
    if (this.onTickCallback) {
      this.onTickCallback(this.remainingSeconds);
    }

    // Interval checks every 250ms to ensure accurate second boundaries without drift
    this.intervalId = setInterval(() => {
      this.tick();
    }, 250);
  }

  /**
   * Internal tick evaluation based on wall-clock elapsed time
   */
  public tick(currentTimeOverride?: number): void {
    if (this.isPaused || this.targetEndTime === 0) {
      return;
    }

    const now = currentTimeOverride ?? Date.now();
    const remaining = Math.max(0, Math.ceil((this.targetEndTime - now) / 1000));

    if (remaining !== this.remainingSeconds) {
      this.remainingSeconds = remaining;
      if (this.onTickCallback) {
        this.onTickCallback(this.remainingSeconds);
      }
    }

    if (remaining <= 0) {
      this.stop();
      if (this.onExpireCallback) {
        this.onExpireCallback();
      }
    }
  }

  /**
   * Pauses the timer and preserves remaining seconds
   */
  public pause(currentTimeOverride?: number): void {
    if (this.isActive() && !this.isPaused) {
      const now = currentTimeOverride ?? Date.now();
      this.remainingSeconds = Math.max(0, Math.ceil((this.targetEndTime - now) / 1000));
      this.clearCurrentInterval();
      this.isPaused = true;
    }
  }

  /**
   * Resumes a paused timer with the preserved remaining seconds
   */
  public resume(): void {
    if (this.isPaused && this.remainingSeconds > 0) {
      this.start(this.remainingSeconds, this.onTickCallback, this.onExpireCallback);
    }
  }

  /**
   * Stops and resets the timer
   */
  public stop(): void {
    this.clearCurrentInterval();
    this.isPaused = false;
    this.targetEndTime = 0;
  }

  private clearCurrentInterval(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  public getRemainingSeconds(): number {
    return this.remainingSeconds;
  }

  public isActive(): boolean {
    return this.intervalId !== null;
  }

  public isTimerPaused(): boolean {
    return this.isPaused;
  }

  /**
   * Formats seconds into human-readable HUD string (e.g., 90 -> '1:30', 45 -> '45s')
   */
  public static formatTime(seconds: number): string {
    const s = Math.max(0, Math.floor(seconds));
    if (s >= 60) {
      const mins = Math.floor(s / 60);
      const secs = s % 60;
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    return `${s}s`;
  }
}
