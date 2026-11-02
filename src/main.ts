import './style.css';
import { setupLobby, openLobby, MatchSettings } from './ui/lobby';
import { GameSession, GameSessionSnapshot } from './core/gameLoop';
import { RoundTimer } from './core/timer';
import { SettingsManager } from './core/settings';
import { MinimapController } from './ui/minimap';
import { ResultModalController } from './ui/resultModal';
import { SettingsModalController } from './ui/settingsModal';
import { PhotosphereViewer } from './viewer/PhotosphereViewer';
import { TerrainMapViewer } from './viewer/TerrainMapViewer';
import { DebugOverlayController } from './ui/debugOverlay';
import { Coordinates2D } from './core/types';

// DOM Element references
const inGameHud = document.getElementById('inGameHud')!;
const minimapContainer = document.getElementById('minimapContainer')!;
const returnToMenuBtn = document.getElementById('returnToMenuBtn')!;
const lobbySettingsBtn = document.getElementById('lobbySettingsBtn')!;
const hudSettingsBtn = document.getElementById('hudSettingsBtn')!;
const roundIndicator = document.getElementById('roundIndicator')!;
const scoreIndicator = document.getElementById('scoreIndicator')!;
const timerContainer = document.getElementById('timerContainer')!;
const timerIndicator = document.getElementById('timerIndicator')!;
const gameTitle = document.getElementById('gameTitle')!;
const panoCanvas = document.getElementById('panoCanvas') as HTMLCanvasElement;
const mapCanvas = document.getElementById('mapCanvas') as HTMLCanvasElement;
const debugOverlayElement = document.getElementById('debugOverlay')!;
const settingsModalElement = document.getElementById('settingsModal')!;

// Persistent singletons to prevent WebGL context leaks
let panoViewer: PhotosphereViewer | null = null;
let terrainViewer: TerrainMapViewer | null = null;
let minimapController: MinimapController | null = null;
let resultModalController: ResultModalController | null = null;
let debugOverlayController: DebugOverlayController | null = null;
let settingsModalController: SettingsModalController | null = null;

const gameSession = new GameSession();
const roundTimer = new RoundTimer();
const settingsManager = new SettingsManager();

function initEngines(): void {
  if (!panoViewer) {
    panoViewer = new PhotosphereViewer(panoCanvas);
    panoViewer.applySettings(settingsManager.getSettings());
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

// Reactively apply settings to viewers
settingsManager.subscribe((settings) => {
  panoViewer?.applySettings(settings);
});

// Setup Settings Modal Controller
settingsModalController = new SettingsModalController(
  {
    container: settingsModalElement,
    invertXBtn: document.getElementById('invertXBtn') as HTMLButtonElement,
    invertYBtn: document.getElementById('invertYBtn') as HTMLButtonElement,
    sensitivitySlider: document.getElementById('sensitivitySlider') as HTMLInputElement,
    sensitivityValue: document.getElementById('sensitivityValue')!,
    zoomBtn: document.getElementById('zoomBtn') as HTMLButtonElement,
    dynamicResBtn: document.getElementById('dynamicResBtn') as HTMLButtonElement,
    resetBtn: document.getElementById('resetSettingsBtn') as HTMLButtonElement,
    closeBtn: document.getElementById('closeSettingsBtn') as HTMLButtonElement,
  },
  settingsManager
);

// Connect Done button in settings modal
const doneSettingsBtn = document.getElementById('doneSettingsBtn');
if (doneSettingsBtn) {
  doneSettingsBtn.addEventListener('click', () => {
    settingsModalController?.close();
  });
}

// Open settings from lobby or in-game HUD
lobbySettingsBtn.addEventListener('click', () => {
  settingsModalController?.open();
});

hudSettingsBtn.addEventListener('click', () => {
  settingsModalController?.open();
});

function startMatch(settings: MatchSettings): void {
  initEngines();
  panoViewer?.startRendering();
  terrainViewer?.startRendering();

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
  terrainViewer?.stopRendering();
  panoViewer?.stopRendering();
  resultModalController?.hide();
  settingsModalController?.close();

  inGameHud.classList.add('hidden');
  minimapContainer.classList.add('hidden');

  openLobby();
}

// Attach Abort / Menu Return
returnToMenuBtn.addEventListener('click', abortToMenu);

// Setup F3 Debug Overlay Controller (Global)
debugOverlayController = new DebugOverlayController(debugOverlayElement, {
  getSessionState: () => gameSession.getSnapshot().state,
  getRoundInfo: () => {
    const snap = gameSession.getSnapshot();
    return snap.state === 'IDLE' ? 'Lobby' : `Round ${snap.currentRoundIndex + 1}/${snap.totalRounds}`;
  },
  getPanoMetrics: () => (panoViewer ? panoViewer.getPerformanceMetrics() : null),
  getMapMetrics: () => (terrainViewer ? terrainViewer.getPerformanceMetrics() : null),
});

window.addEventListener('keydown', (e) => {
  if (e.code === 'F3') {
    e.preventDefault();
    debugOverlayController?.toggle();
  } else if (e.code === 'Escape') {
    if (settingsModalController?.isOpen()) {
      e.preventDefault();
      settingsModalController.close();
    }
  }
});

// Boot Lobby
setupLobby(startMatch);
