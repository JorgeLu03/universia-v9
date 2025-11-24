import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import { z } from 'zod';
import db from './db.js';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT ?? 4000);
const rawOrigins = process.env.CORS_ORIGINS ?? 'http://127.0.0.1:5501,http://localhost:8000,http://127.0.0.1:8000,http://[::]:8000,https://rkvgqth7-5501.usw3.devtunnels.ms,http://localhost:5500,http://127.0.0.1:5500';
const allowedOrigins = rawOrigins.split(',').map((origin) => origin.trim()).filter(Boolean);

// Configuración CORS más permisiva para túneles
app.use(cors({
  origin: true, // Permitir todos los orígenes temporalmente para debug
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'Accept', 'X-Requested-With'],
  optionsSuccessStatus: 200
}));

app.use(express.json());

const BASE_POINTS_BY_LEVEL = { 1: 100, 2: 200, 3: 300 };
const scoreSchema = z.object({
  uid: z.string().min(1),
  username: z.string().min(3),
  level: z.number().int().min(1).max(3),
  difficulty: z.enum(['normal', 'hard']).default('normal')
});

// Función para calcular puntos basados en nivel y dificultad
function calculatePoints(level, difficulty) {
  const basePoints = BASE_POINTS_BY_LEVEL[level];
  return difficulty === 'hard' ? basePoints * 2 : basePoints;
}

const insertScore = db.prepare(
  'INSERT INTO scores (uid, username, level, difficulty, points) VALUES (?, ?, ?, ?, ?)'
);
const sumScoresForUser = db.prepare(
  'SELECT SUM(points) AS totalPoints FROM scores WHERE uid = ?'
);
const listTopScores = db.prepare(`
  SELECT uid, username, SUM(points) AS totalPoints, MAX(created_at) AS lastUpdate
  FROM scores
  GROUP BY uid, username
  ORDER BY totalPoints DESC, lastUpdate ASC
  LIMIT ?
`);
const listUserScores = db.prepare(`
  SELECT level, difficulty, points, created_at
  FROM scores
  WHERE uid = ?
  ORDER BY created_at DESC
`);

app.post('/api/scores', (req, res) => {
  try {
    console.log('📥 Recibiendo puntuación:', req.body);
    
    const parsed = scoreSchema.safeParse(req.body);
    if (!parsed.success) {
      console.log('❌ Validación fallida:', parsed.error.flatten().fieldErrors);
      return res.status(400).json({
        error: 'Datos invalidos',
        details: parsed.error.flatten().fieldErrors
      });
    }
    
    const { uid, username, level, difficulty } = parsed.data;
    console.log(`🎯 Procesando: ${username} - Nivel ${level} (${difficulty})`);
    
    const points = calculatePoints(level, difficulty);
    console.log(`💰 Puntos calculados: ${points}`);
    
    insertScore.run(uid, username, level, difficulty, points);
    console.log('💾 Puntuación guardada en BD');
    
    const totalRow = sumScoresForUser.get(uid) ?? { totalPoints: points };
    console.log(`📊 Total acumulado: ${totalRow.totalPoints}`);
    
    return res.status(201).json({
      uid,
      username,
      level,
      difficulty,
      points,
      totalPoints: totalRow.totalPoints,
      savedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('🚨 Error en /api/scores:', error);
    return res.status(500).json({ error: 'Error interno', details: error.message });
  }
});

app.get('/api/scores/top', (req, res) => {
  const limit = Math.min(Number(req.query.limit ?? 10), 50);
  const rows = listTopScores.all(limit);
  return res.json(rows);
});

app.get('/api/scores/:uid', (req, res) => {
  const rows = listUserScores.all(req.params.uid);
  return res.json(rows);
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

app.use((err, _req, res, _next) => {
  console.error('[scores-api] error', err);
  res.status(500).json({ error: 'Error interno' });
});

app.listen(PORT, () => {
  console.log(`Scores API escuchando en http://localhost:${PORT}`);
});