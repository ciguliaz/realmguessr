import './style.css';
import { setupLobby, openLobby, MatchSettings } from './ui/lobby';

// DOM Elements
const inGameHud = document.getElementById('inGameHud');
const minimapContainer = document.getElementById('minimapContainer');
const returnToMenuBtn = document.getElementById('returnToMenuBtn');

// Boot Lobby UI
setupLobby((settings: MatchSettings) => {
  // Reveal game UI elements once lobby exits
  if (inGameHud) inGameHud.classList.remove('hidden');
  if (minimapContainer) minimapContainer.classList.remove('hidden');

  console.log('Game starting with settings:', settings);
});

// Return to Menu action
returnToMenuBtn?.addEventListener('click', () => {
  if (inGameHud) inGameHud.classList.add('hidden');
  if (minimapContainer) minimapContainer.classList.add('hidden');
  openLobby();
});

