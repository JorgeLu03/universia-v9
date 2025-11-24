const pauseOverlay = document.getElementById('pauseOverlay');
const pauseButton = document.getElementById('pause');
const resumeBtn = document.getElementById('resumeBtn');
const reloadBtn = document.getElementById('reloadBtn');
const settingsBtn = document.getElementById('settingsBtn');
const exitBtn = document.getElementById('exitBtn');
const settingsOverlay = document.getElementById('settingsOverlay');
const closeSettingsBtn = document.getElementById('closeSettingsBtn');
const overlayVolume = document.getElementById('overlayVolume');

let isGamePaused = false;

function showPause() {
      isGamePaused = true;
      if (pauseOverlay) pauseOverlay.style.display = 'flex';
}

function hidePause(resumeGame = true) {
      if (resumeGame) {
        isGamePaused = false;
      }
      if (pauseOverlay) pauseOverlay.style.display = 'none';
}

function syncOverlayVolume() {
      if (!overlayVolume) return;
      const current = window.persistentMusic?.volume ?? parseFloat(localStorage.getItem('universiaVolume') ?? '0.8');
      overlayVolume.value = Math.round((Number.isFinite(current) ? current : 0.8) * 100);
}

function showSettingsPanel() {
      isGamePaused = true;
      if (pauseOverlay) pauseOverlay.style.display = 'none';
      if (settingsOverlay) {
        syncOverlayVolume();
        settingsOverlay.style.display = 'flex';
      }
}

function hideSettingsPanel() {
      if (settingsOverlay) settingsOverlay.style.display = 'none';
}

pauseButton?.addEventListener('click', showPause);
resumeBtn?.addEventListener('click', () => hidePause(true));

reloadBtn?.addEventListener('click', () => {
    window.location.reload();
});
settingsBtn?.addEventListener('click', showSettingsPanel);
closeSettingsBtn?.addEventListener('click', () => {
    hideSettingsPanel();
    showPause();
});

exitBtn?.addEventListener('click', () => {
    window.location.href = 'main.html';
});

overlayVolume?.addEventListener('input', (event) => {
    const value = Number(event.target.value);
    const normalized = Math.min(Math.max(value / 100, 0), 1);
    const volumeChange = new CustomEvent('universia-volume-change', { detail: normalized });
    window.dispatchEvent(volumeChange);
});
