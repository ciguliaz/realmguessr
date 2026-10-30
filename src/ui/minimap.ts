import { Coordinates2D } from '../core/types';

export interface MinimapOptions {
  onGuessSubmitted: (coords: Coordinates2D) => void;
  onPinCleared: () => void;
  onResizeRequested: () => void;
}

export class MinimapController {
  private container: HTMLElement;
  private expandBtn: HTMLButtonElement;
  private submitBtn: HTMLButtonElement;
  private clearBtn: HTMLButtonElement;
  private titleElement: HTMLElement;
  private instructionsElement: HTMLElement;

  private isExpanded = false;
  private currentCoords: Coordinates2D | null = null;
  private options: MinimapOptions;

  constructor(options: MinimapOptions) {
    this.options = options;
    this.container = document.getElementById('minimapContainer')!;
    this.expandBtn = document.getElementById('expandMapBtn') as HTMLButtonElement;
    this.submitBtn = document.getElementById('submitGuessBtn') as HTMLButtonElement;
    this.clearBtn = document.getElementById('clearPinBtn') as HTMLButtonElement;
    this.titleElement = document.getElementById('mapTitle')!;
    this.instructionsElement = document.getElementById('mapInstructions')!;

    this.bindEvents();
  }

  private bindEvents(): void {
    // Expand / Collapse toggle
    this.expandBtn.addEventListener('click', () => {
      this.toggleExpand();
    });

    // Clear Pin button
    this.clearBtn.addEventListener('click', () => {
      this.clearPin();
      this.options.onPinCleared();
    });

    // Submit Guess button
    this.submitBtn.addEventListener('click', () => {
      if (this.currentCoords) {
        this.options.onGuessSubmitted(this.currentCoords);
      }
    });
  }

  public toggleExpand(): void {
    this.isExpanded = !this.isExpanded;

    if (this.isExpanded) {
      this.container.classList.remove('w-80', 'h-64', 'md:w-96', 'md:h-80');
      this.container.classList.add('w-[85vw]', 'h-[75vh]', 'max-w-4xl');
      this.expandBtn.textContent = 'Collapse';
    } else {
      this.container.classList.add('w-80', 'h-64', 'md:w-96', 'md:h-80');
      this.container.classList.remove('w-[85vw]', 'h-[75vh]', 'max-w-4xl');
      this.expandBtn.textContent = 'Expand';
    }

    // Allow CSS transition to finish before recalculating 3D canvas dimensions
    setTimeout(() => {
      this.options.onResizeRequested();
    }, 310);
  }

  public collapse(): void {
    if (this.isExpanded) {
      this.toggleExpand();
    }
  }

  public onPinPlaced(coords: Coordinates2D): void {
    this.currentCoords = coords;
    this.submitBtn.removeAttribute('disabled');
    this.submitBtn.textContent = 'Submit Guess';
    this.submitBtn.classList.remove('opacity-40', 'cursor-not-allowed');
    this.instructionsElement.classList.add('hidden');
  }

  public clearPin(): void {
    this.currentCoords = null;
    this.submitBtn.setAttribute('disabled', 'true');
    this.submitBtn.textContent = 'Place Pin to Guess';
    this.submitBtn.classList.add('opacity-40', 'cursor-not-allowed');
    this.instructionsElement.classList.remove('hidden');
  }

  public setTitle(title: string): void {
    this.titleElement.textContent = title;
  }

  public getSelectedCoords(): Coordinates2D | null {
    return this.currentCoords;
  }

  public isMapExpanded(): boolean {
    return this.isExpanded;
  }
}
