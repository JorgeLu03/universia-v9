import { fetchTopScores } from './score-service.js';

const rankingList = document.querySelector('[data-ranking-list]');
const statusLabel = document.getElementById('ranking-status');
const refreshButton = document.getElementById('refresh-ranking');
const REFRESH_INTERVAL_MS = 15000;

async function renderRanking() {
  if (!rankingList) return;
  rankingList.innerHTML = '<li class="loading">Cargando puntuaciones...</li>';
  try {
    const rows = await fetchTopScores();
    if (!rows.length) {
      rankingList.innerHTML = '<li class="empty">Aun no hay puntuaciones registradas</li>';
    } else {
      rankingList.innerHTML = rows.map((row, index) => (
        `<li><span class="jugador">${index + 1}. ${row.username}</span> - <span class="puntos">${row.totalPoints} pts</span></li>`
      )).join('');
    }
    if (statusLabel) {
      statusLabel.textContent = `Ultima actualizacion: ${new Date().toLocaleTimeString()}`;
    }
  } catch (error) {
    console.error('[ranking] error', error);
    rankingList.innerHTML = `<li class="error">${error.message}</li>`;
  }
}

refreshButton?.addEventListener('click', renderRanking);
renderRanking();
setInterval(renderRanking, REFRESH_INTERVAL_MS);