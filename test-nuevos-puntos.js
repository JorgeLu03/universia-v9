// 🧪 Script para probar el nuevo sistema de puntuación por niveles completados
// Ejecutar con: node test-nuevos-puntos.js

const API_BASE_URL = 'http://localhost:4001';

async function testNuevoSistemaPuntos() {
  console.log('🎯 PROBANDO NUEVO SISTEMA DE PUNTUACIÓN\n');
  
  // Crear usuario de prueba
  const testUser = {
    uid: `test_complete_level_${Date.now()}`,
    username: `TestCompleteLevel${Math.floor(Math.random() * 1000)}`
  };
  
  console.log('👤 Usuario de prueba:', testUser.username);
  console.log('🆔 UID:', testUser.uid);
  
  console.log('\n📊 Puntuaciones antes de las pruebas:');
  await mostrarPuntuacionUsuario(testUser.uid);
  
  // Simular completar niveles
  console.log('\n🎮 Simulando completar niveles...\n');
  
  // 1. Completar Nivel 1 en Normal
  console.log('1️⃣ Completando Nivel 1 (Normal)...');
  await completarNivel(testUser, 1, 'normal');
  await mostrarPuntuacionUsuario(testUser.uid);
  
  // 2. Completar Nivel 2 en Difícil  
  console.log('\n2️⃣ Completando Nivel 2 (Difícil)...');
  await completarNivel(testUser, 2, 'hard');
  await mostrarPuntuacionUsuario(testUser.uid);
  
  // 3. Completar Nivel 3 en Normal
  console.log('\n3️⃣ Completando Nivel 3 (Normal)...');
  await completarNivel(testUser, 3, 'normal');
  await mostrarPuntuacionUsuario(testUser.uid);
  
  console.log('\n🏆 RESUMEN FINAL:');
  console.log('   Nivel 1 Normal: 100 pts');
  console.log('   Nivel 2 Difícil: 400 pts (200 × 2)');  
  console.log('   Nivel 3 Normal: 300 pts');
  console.log('   TOTAL ESPERADO: 800 pts');
  
  await mostrarPuntuacionFinal(testUser.uid);
}

async function completarNivel(user, level, difficulty) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/scores`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        uid: user.uid,
        username: user.username,
        level: level,
        difficulty: difficulty
      })
    });
    
    if (response.ok) {
      const result = await response.json();
      const difficultyText = difficulty === 'hard' ? 'Difícil' : 'Normal';
      console.log(`   ✅ ${result.points} pts otorgados (${difficultyText})`);
      console.log(`   📊 Total acumulado: ${result.totalPoints} pts`);
      return result;
    } else {
      console.log(`   ❌ Error: ${response.status}`);
      return null;
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    return null;
  }
}

async function mostrarPuntuacionUsuario(uid) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/scores/${uid}`);
    if (response.ok) {
      const scores = await response.json();
      if (scores.length === 0) {
        console.log('   📊 Sin puntuaciones registradas');
      } else {
        console.log('   📊 Historial de puntuaciones:');
        scores.forEach((score, i) => {
          const diffText = score.difficulty === 'hard' ? 'Difícil' : 'Normal';
          console.log(`      ${i + 1}. Nivel ${score.level} (${diffText}): ${score.points} pts`);
        });
        const total = scores.reduce((sum, s) => sum + s.points, 0);
        console.log(`   🎯 Total: ${total} pts`);
      }
    }
  } catch (error) {
    console.log('   ❌ Error obteniendo puntuaciones:', error.message);
  }
}

async function mostrarPuntuacionFinal(uid) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/scores/${uid}`);
    if (response.ok) {
      const scores = await response.json();
      const total = scores.reduce((sum, s) => sum + s.points, 0);
      
      if (total === 800) {
        console.log('   🎉 ¡PERFECTO! Total correcto: 800 pts');
      } else {
        console.log(`   ⚠️  Total obtenido: ${total} pts (esperado: 800)`);
      }
    }
  } catch (error) {
    console.log('   ❌ Error en verificación final');
  }
}

// Ejecutar pruebas
testNuevoSistemaPuntos().catch(console.error);