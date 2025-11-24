import { fetchTopScores } from './score-service.js';

const rankingList = document.querySelector('[data-ranking-list]');
const statusLabel = document.getElementById('ranking-status');
const refreshButton = document.getElementById('refresh-ranking');
const REFRESH_INTERVAL_MS = 15000;

async function renderRanking() {
  if (!rankingList) return;
  rankingList.innerHTML = '<li class="loading">Cargando puntuaciones...</li>';
  try {
    console.log('[ranking] Intentando obtener puntuaciones...');
    const rows = await fetchTopScores();
    console.log('[ranking] Puntuaciones obtenidas:', rows.length);
    
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
    console.error('[ranking] error completo:', error);
    let errorMsg = 'Error de conexión con el servidor';
    
    if (error.message.includes('Failed to fetch')) {
      errorMsg = '⚠️ No se puede conectar al servidor de puntuaciones. Asegúrate de que la API esté corriendo en puerto 4000.';
    } else if (error.message.includes('ERR_BLOCKED_BY_CLIENT')) {
      errorMsg = '⚠️ Conexión bloqueada. Verifica la configuración CORS del servidor.';
    }
    
    rankingList.innerHTML = `<li class="error">${errorMsg}</li>`;
    if (statusLabel) {
      statusLabel.textContent = `Error: ${new Date().toLocaleTimeString()}`;
    }
  }
}

refreshButton?.addEventListener('click', renderRanking);
renderRanking();
setInterval(renderRanking, REFRESH_INTERVAL_MS);