export interface MatchSettings {
  realmId: string;
  timerSeconds: number; // 0 = unlimited
  explorationMode: 'classic' | 'locked';
}

export function setupLobby(onStartGame: (settings: MatchSettings) => void) {
  const lobbyOverlay = document.getElementById('lobbyOverlay');
  const startQuestBtn = document.getElementById('startQuestBtn');

  if (!lobbyOverlay || !startQuestBtn) return;

  const currentSettings: MatchSettings = {
    realmId: 'skyrim',
    timerSeconds: 0,
    explorationMode: 'classic',
  };

  // 1. Timer Buttons Setup
  const timerButtons = document.querySelectorAll('.timer-btn');
  timerButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      timerButtons.forEach((b) => {
        b.classList.remove('bg-skyrim-accent', 'text-slate-950', 'font-bold', 'shadow-md');
        b.classList.add('bg-slate-800/80', 'text-slate-300');
      });
      btn.classList.add('bg-skyrim-accent', 'text-slate-950', 'font-bold', 'shadow-md');
      btn.classList.remove('bg-slate-800/80', 'text-slate-300');
      currentSettings.timerSeconds = parseInt(btn.getAttribute('data-time') || '0', 10);
    });
  });

  // 2. Exploration Mode Buttons Setup
  const modeButtons = document.querySelectorAll('.mode-btn');
  modeButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      modeButtons.forEach((b) => {
        b.classList.remove('bg-skyrim-accent', 'text-slate-950', 'font-bold', 'shadow-md');
        b.classList.add('bg-slate-800/80', 'text-slate-300');
      });
      btn.classList.add('bg-skyrim-accent', 'text-slate-950', 'font-bold', 'shadow-md');
      btn.classList.remove('bg-slate-800/80', 'text-slate-300');
      currentSettings.explorationMode = (btn.getAttribute('data-mode') || 'classic') as 'classic' | 'locked';
    });
  });

  // 3. Start Quest Action
  startQuestBtn.addEventListener('click', () => {
    lobbyOverlay.classList.add('opacity-0', 'pointer-events-none');
    setTimeout(() => {
      lobbyOverlay.classList.add('hidden');
      onStartGame(currentSettings);
    }, 400);
  });
}
