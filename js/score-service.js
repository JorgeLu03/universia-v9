import { auth } from './firebase-config.js';

const API_BASE_URL = window.SCORES_API_URL ?? 'http://localhost:4000';
export const BASE_POINTS_BY_LEVEL = Object.freeze({ 1: 100, 2: 200, 3: 300 });

// Función para calcular puntos basados en nivel y dificultad
export function calculatePoints(level, difficulty = 'normal') {
  const basePoints = BASE_POINTS_BY_LEVEL[level];
  return difficulty === 'hard' ? basePoints * 2 : basePoints;
}

async function request(path, options = {}) {
  const fullUrl = `${API_BASE_URL}${path}`;
  console.log(`[score-service] Intentando conectar a: ${fullUrl}`);
  
  try {
    const response = await fetch(fullUrl, {
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers ?? {})
      },
      ...options
    });
    
    console.log(`[score-service] Respuesta recibida: ${response.status} ${response.statusText}`);
    
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error ?? `Error ${response.status}: No se pudo comunicar con el servidor de puntuaciones`);
    }
    return payload;
  } catch (error) {
    console.error(`[score-service] Error en petición a ${fullUrl}:`, error);
    throw error;
  }
}

export async function awardScoreForLevel(level, difficulty = 'normal') {
  if (!BASE_POINTS_BY_LEVEL[level]) {
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
      level,
      difficulty
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
  BASE_POINTS_BY_LEVEL,
  calculatePoints
};