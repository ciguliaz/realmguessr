import { RoundResult } from '../core/types';
import { formatDistance } from '../core/math';

export interface ResultModalOptions {
  onNextRound: () => void;
  onPlayAgain: () => void;
}

export class ResultModalController {
  private modal: HTMLElement;
  private titleElement: HTMLElement;
  private distanceElement: HTMLElement;
  private pointsElement: HTMLElement;
  private locationElement: HTMLElement;
  private actionBtn: HTMLButtonElement;
  private options: ResultModalOptions;
  private isSummaryMode = false;

  constructor(options: ResultModalOptions) {
    this.options = options;
    this.modal = document.getElementById('roundResultModal')!;
    this.titleElement = document.getElementById('resultModalTitle')!;
    this.distanceElement = document.getElementById('resultDistance')!;
    this.pointsElement = document.getElementById('resultPoints')!;
    this.locationElement = document.getElementById('resultLocationName')!;
    this.actionBtn = document.getElementById('nextRoundBtn') as HTMLButtonElement;

    this.bindEvents();
  }

  private bindEvents(): void {
    this.actionBtn.addEventListener('click', () => {
      this.hide();
      if (this.isSummaryMode) {
        this.options.onPlayAgain();
      } else {
        this.options.onNextRound();
      }
    });
  }

  /**
   * Displays the outcome of a single round
   */
  public showRoundResult(result: RoundResult, isLastRound: boolean): void {
    this.isSummaryMode = false;
    this.titleElement.textContent = `Round ${result.round} Result`;
    this.distanceElement.textContent = formatDistance(result.distanceMeters);
    this.pointsElement.textContent = `+${result.points.toLocaleString()}`;
    this.locationElement.textContent = result.actualLocation.name;

    this.actionBtn.textContent = isLastRound ? 'View Match Summary' : 'Next Round';
    this.modal.classList.remove('hidden');
  }

  /**
   * Displays the final match summary after 5 rounds
   */
  public showMatchSummary(totalScore: number, maxScore: number, history: RoundResult[]): void {
    this.isSummaryMode = true;
    this.titleElement.textContent = 'Match Complete';

    const totalDistance = history.reduce((sum, r) => sum + r.distanceMeters, 0);
    const avgDistance = history.length > 0 ? totalDistance / history.length : 0;

    this.distanceElement.textContent = `Avg: ${formatDistance(avgDistance)}`;
    this.pointsElement.textContent = `${totalScore.toLocaleString()} / ${maxScore.toLocaleString()}`;
    
    const accuracy = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
    this.locationElement.textContent = `Completed ${history.length} rounds with ${accuracy}% accuracy.`;

    this.actionBtn.textContent = 'Play Again';
    this.modal.classList.remove('hidden');
  }

  public hide(): void {
    this.modal.classList.add('hidden');
  }

  public isVisible(): boolean {
    return !this.modal.classList.contains('hidden');
  }

  public isInSummaryMode(): boolean {
    return this.isSummaryMode;
  }
}
