import './style.css';
import { setupLobby, openLobby, MatchSettings } from './ui/lobby';
import { GameSession, GameSessionSnapshot } from './core/gameLoop';
import { RoundTimer } from './core/timer';
import { MinimapController } from './ui/minimap';
import { ResultModalController } from './ui/resultModal';
import { PhotosphereViewer } from './viewer/PhotosphereViewer';
import { TerrainMapViewer } from './viewer/TerrainMapViewer';
import { Coordinates2D } from './core/types';

// DOM Element references
const inGameHud = document.getElementById('inGameHud')!;
const minimapContainer = document.getElementById('minimapContainer')!;
const returnToMenuBtn = document.getElementById('returnToMenuBtn')!;
const roundIndicator = document.getElementById('roundIndicator')!;
const scoreIndicator = document.getElementById('scoreIndicator')!;
const timerContainer = document.getElementById('timerContainer')!;
const timerIndicator = document.getElementById('timerIndicator')!;
const gameTitle = document.getElementById('gameTitle')!;
const panoCanvas = document.getElementById('panoCanvas') as HTMLCanvasElement;
const mapCanvas = document.getElementById('mapCanvas') as HTMLCanvasElement;

// Persistent singletons to prevent WebGL context leaks
let panoViewer: PhotosphereViewer | null = null;
let terrainViewer: TerrainMapViewer | null = null;
let minimapController: MinimapController | null = null;
let resultModalController: ResultModalController | null = null;

const gameSession = new GameSession();
const roundTimer = new RoundTimer();

function initEngines(): void {
  if (!panoViewer) {
    panoViewer = new PhotosphereViewer(panoCanvas);
  }

  if (!terrainViewer) {
    terrainViewer = new TerrainMapViewer(mapCanvas);
    terrainViewer.onPinPlaced((coords) => {
      minimapController?.onPinPlaced(coords);
    });
  }

  if (!minimapController) {
    minimapController = new MinimapController({
      onGuessSubmitted: (coords) => handleGuessSubmission(coords),
      onPinCleared: () => terrainViewer?.clearPins(),
      onResizeRequested: () => terrainViewer?.resize(),
    });
  }

  if (!resultModalController) {
    resultModalController = new ResultModalController({
      onNextRound: () => handleNextRound(),
      onPlayAgain: () => handleRestartMatch(),
    });
  }
}

function startMatch(settings: MatchSettings): void {
  initEngines();

  const snapshot = gameSession.start(settings);

  inGameHud.classList.remove('hidden');
  minimapContainer.classList.remove('hidden');
  gameTitle.textContent = snapshot.settings.realmId === 'skyrim' ? 'Skyrim Province' : 'Training Grounds';

  loadActiveRound(snapshot);
}

function loadActiveRound(snapshot: GameSessionSnapshot): void {
  roundIndicator.textContent = `${snapshot.currentRoundIndex + 1} / ${snapshot.totalRounds}`;
  scoreIndicator.textContent = snapshot.totalScore.toLocaleString();

  minimapController?.clearPin();
  terrainViewer?.clearPins();

  // Load 360 panorama or preview
  panoViewer?.createFallbackPanorama(`Round ${snapshot.currentRoundIndex + 1}: ${snapshot.currentLocation.name}`);

  // Manage timer countdown
  if (snapshot.settings.timerSeconds > 0) {
    timerContainer.classList.remove('hidden');
    roundTimer.start(
      snapshot.settings.timerSeconds,
      (secondsRemaining) => {
        timerIndicator.textContent = RoundTimer.formatTime(secondsRemaining);
      },
      () => {
        handleTimeout();
      }
    );
  } else {
    timerContainer.classList.add('hidden');
    roundTimer.stop();
  }
}

function handleGuessSubmission(coords: Coordinates2D | null): void {
  roundTimer.stop();

  const result = gameSession.submitGuess(coords);

  // Reveal 3D distance line on terrain map
  terrainViewer?.revealRoundResult(result.actualLocation.coords, result.guessCoords);

  // Update HUD score
  scoreIndicator.textContent = gameSession.getSnapshot().totalScore.toLocaleString();

  // Show outcome modal
  const snapshot = gameSession.getSnapshot();
  const isLastRound = snapshot.currentRoundIndex === snapshot.totalRounds - 1;
  resultModalController?.showRoundResult(result, isLastRound);
}

function handleTimeout(): void {
  const placedCoords = minimapController?.getSelectedCoords() ?? null;
  handleGuessSubmission(placedCoords);
}

function handleNextRound(): void {
  const snapshot = gameSession.getSnapshot();

  if (snapshot.currentRoundIndex < snapshot.totalRounds - 1) {
    const nextSnapshot = gameSession.nextRound();
    loadActiveRound(nextSnapshot);
  } else {
    const finalSnapshot = gameSession.nextRound(); // Transitions to MATCH_OVER
    resultModalController?.showMatchSummary(
      finalSnapshot.totalScore,
      finalSnapshot.totalRounds * 5000,
      finalSnapshot.history
    );
  }
}

function handleRestartMatch(): void {
  const settings = gameSession.getSnapshot().settings;
  startMatch(settings);
}

function abortToMenu(): void {
  roundTimer.stop();
  gameSession.abort();

  minimapController?.collapse();
  minimapController?.clearPin();
  terrainViewer?.clearPins();
  resultModalController?.hide();

  inGameHud.classList.add('hidden');
  minimapContainer.classList.add('hidden');

  openLobby();
}

// Attach Abort / Menu Return
returnToMenuBtn.addEventListener('click', abortToMenu);

// Boot Lobby
setupLobby(startMatch);
