// 🚀 Servidor Unificado - Archivos estáticos + API de puntuaciones
import express from 'express';
import path from 'path';
import cors from 'cors';
import { z } from 'zod';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import db from './api/db.js';

const app = express();
const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 5501;

console.log('🔧 INICIANDO SERVIDOR UNIFICADO');
console.log(`📡 Puerto: ${PORT}`);
console.log(`🌍 Directorio: ${__dirname}`);

// CORS configurado para túneles
app.use(cors({
  origin: true,
  credentials: true, 
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'Accept', 'X-Requested-With'],
  optionsSuccessStatus: 200
}));

app.use(express.json());
app.use(express.static(__dirname));

// Configuración de puntuación
const BASE_POINTS_BY_LEVEL = { 1: 100, 2: 200, 3: 300 };
const scoreSchema = z.object({
  uid: z.string().min(1),
  username: z.string().min(3),
  level: z.number().int().min(1).max(3),
  difficulty: z.enum(['normal', 'hard']).default('normal')
});

function calculatePoints(level, difficulty) {
  const basePoints = BASE_POINTS_BY_LEVEL[level];
  const multiplier = difficulty === 'hard' ? 2 : 1;
  return basePoints * multiplier;
}

// 🎯 RUTAS API
app.post('/api/scores', async (req, res) => {
  try {
    console.log('📊 [POST /api/scores] Recibiendo puntuación:', req.body);
    
    const validatedData = scoreSchema.parse(req.body);
    const { uid, username, level, difficulty } = validatedData;
    const points = calculatePoints(level, difficulty);
    
    console.log(`💯 Puntos calculados: ${points} (Nivel ${level} ${difficulty})`);
    
    const stmt = db.prepare(`
      INSERT INTO scores (uid, username, level, difficulty, points) 
      VALUES (?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(uid, username, level, difficulty, points);
    
    console.log('✅ Puntuación guardada:', { id: result.lastInsertRowid, points });
    
    res.status(201).json({
      success: true,
      id: result.lastInsertRowid,
      points,
      message: `¡${points} puntos añadidos por completar nivel ${level} en modo ${difficulty}!`
    });
    
  } catch (error) {
    console.error('❌ Error guardando puntuación:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Error procesando puntuación'
    });
  }
});

app.get('/api/scores/top', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    console.log(`🏆 [GET /api/scores/top] Obteniendo top ${limit} jugadores`);
    
    const stmt = db.prepare(`
      SELECT 
        username,
        SUM(points) as total_points,
        COUNT(*) as levels_completed,
        MAX(created_at) as last_activity
      FROM scores 
      GROUP BY uid, username
      ORDER BY total_points DESC, last_activity DESC
      LIMIT ?
    `);
    
    const results = stmt.all(limit);
    console.log(`📈 Encontrados ${results.length} jugadores en ranking`);
    
    res.json({
      success: true,
      count: results.length,
      players: results
    });
    
  } catch (error) {
    console.error('❌ Error obteniendo ranking:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo ranking'
    });
  }
});

// 📄 Servir archivos HTML
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'main.html'));
});

app.get('/game', (req, res) => {
  res.sendFile(path.join(__dirname, 'game.html'));
});

app.get('/ranking', (req, res) => {
  res.sendFile(path.join(__dirname, 'ranking.html'));
});

// ❤️ Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    port: PORT,
    api: 'Scores API v2.0',
    database: 'Connected'
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor unificado ejecutándose en http://localhost:${PORT}`);
  console.log(`🎮 Juego: http://localhost:${PORT}/game`);
  console.log(`🏆 Ranking: http://localhost:${PORT}/ranking`);
  console.log(`📊 API: http://localhost:${PORT}/api/scores`);
  console.log(`❤️ Health: http://localhost:${PORT}/health`);
});