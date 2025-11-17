import { auth } from './firebase-config.js';

const API_BASE_URL = window.SCORES_API_URL ?? 'http://localhost:4000';
export const POINTS_BY_LEVEL = Object.freeze({ 1: 100, 2: 200, 3: 300 });

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {})
    },
    ...options
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error ?? 'No se pudo comunicar con el servidor de puntuaciones');
  }
  return payload;
}

export async function awardScoreForLevel(level) {
  if (!POINTS_BY_LEVEL[level]) {
    throw new Error(`Nivel ${level} no esta configurado`);
  }
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Debes iniciar sesion para guardar puntuaciones');
  }
  return request('/api/scores', {
    method: 'POST',
    body: JSON.stringify({
      uid: user.uid,
      username: user.displayName ?? user.email,
      level
    })
  });
}

export async function fetchTopScores(limit = 10) {
  const params = new URLSearchParams({ limit: `${limit}` });
  return request(`/api/scores/top?${params.toString()}`);
}

export async function fetchUserScores(uid) {
  const effectiveUid = uid ?? auth.currentUser?.uid;
  if (!effectiveUid) {
    throw new Error('No hay usuario autenticado');
  }
  return request(`/api/scores/${effectiveUid}`);
}

window.universiaScores = {
  awardScoreForLevel,
  fetchTopScores,
  fetchUserScores,
  POINTS_BY_LEVEL
};