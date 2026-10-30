import './style.css';
import { setupLobby, MatchSettings } from './ui/lobby';

// DOM Elements
const inGameHud = document.getElementById('inGameHud');
const minimapContainer = document.getElementById('minimapContainer');

// Boot Lobby UI
setupLobby((settings: MatchSettings) => {
  // Reveal game UI elements once lobby exits
  if (inGameHud) inGameHud.classList.remove('hidden');
  if (minimapContainer) minimapContainer.classList.remove('hidden');

  console.log('Game starting with settings:', settings);
});
