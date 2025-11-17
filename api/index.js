import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import { z } from 'zod';
import db from './db.js';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT ?? 4000);
const rawOrigins = process.env.CORS_ORIGINS ?? 'http://127.0.0.1:5501';
const allowedOrigins = rawOrigins.split(',').map((origin) => origin.trim()).filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Origen no permitido: ' + origin));
  }
}));
app.use(express.json());

const POINTS_BY_LEVEL = { 1: 100, 2: 200, 3: 300 };
const scoreSchema = z.object({
  uid: z.string().min(1),
  username: z.string().min(3),
  level: z.number().int().min(1).max(3)
});

const insertScore = db.prepare(
  'INSERT INTO scores (uid, username, level, points) VALUES (?, ?, ?, ?)'
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
  SELECT level, points, created_at
  FROM scores
  WHERE uid = ?
  ORDER BY created_at DESC
`);

app.post('/api/scores', (req, res) => {
  const parsed = scoreSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: 'Datos invalidos',
      details: parsed.error.flatten().fieldErrors
    });
  }
  const { uid, username, level } = parsed.data;
  const points = POINTS_BY_LEVEL[level];
  insertScore.run(uid, username, level, points);
  const totalRow = sumScoresForUser.get(uid) ?? { totalPoints: points };
  return res.status(201).json({
    uid,
    username,
    level,
    points,
    totalPoints: totalRow.totalPoints,
    savedAt: new Date().toISOString()
  });
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