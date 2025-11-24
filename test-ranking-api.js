// Script para probar la nueva API de ranking con dificultades
// Ejecutar con: node test-ranking-api.js

const API_BASE_URL = 'http://localhost:4000';

async function testAPI() {
  console.log('🚀 Probando nueva API de Ranking con dificultades\n');
  
  // Datos de prueba
  const testData = [
    { uid: 'user1', username: 'Jugador1', level: 1, difficulty: 'normal' }, // 100 pts
    { uid: 'user1', username: 'Jugador1', level: 2, difficulty: 'normal' }, // 200 pts
    { uid: 'user1', username: 'Jugador1', level: 3, difficulty: 'hard' },   // 600 pts (300*2)
    { uid: 'user2', username: 'Jugador2', level: 1, difficulty: 'hard' },   // 200 pts (100*2)
    { uid: 'user2', username: 'Jugador2', level: 2, difficulty: 'hard' },   // 400 pts (200*2)
    { uid: 'user3', username: 'Jugador3', level: 1, difficulty: 'normal' }, // 100 pts
  ];

  try {
    // 1. Probar envío de puntuaciones
    console.log('📤 Enviando puntuaciones de prueba...');
    for (let i = 0; i < testData.length; i++) {
      const data = testData[i];
      try {
        const response = await fetch(`${API_BASE_URL}/api/scores`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`❌ Error ${response.status} en registro ${i + 1}: ${errorText}`);
          continue;
        }
        
        const result = await response.json();
        console.log(`✅ ${result.username} - Nivel ${result.level} (${result.difficulty}): ${result.points} pts (Total: ${result.totalPoints})`);
      } catch (error) {
        console.error(`❌ Error en registro ${i + 1} (${data.username} L${data.level}):`, error.message);
      }
    }

    console.log('\n📊 Obteniendo ranking actualizado...');
    
    // 2. Probar obtención del ranking
    const rankingResponse = await fetch(`${API_BASE_URL}/api/scores/top`);
    if (!rankingResponse.ok) {
      throw new Error(`Error ${rankingResponse.status}: ${await rankingResponse.text()}`);
    }
    
    const ranking = await rankingResponse.json();
    console.log('\n🏆 TOP RANKING:');
    ranking.forEach((player, index) => {
      console.log(`${index + 1}. ${player.username}: ${player.totalPoints} pts`);
    });

    console.log('\n🎯 Puntuación esperada por nivel y dificultad:');
    console.log('Nivel 1 Normal: 100 pts | Nivel 1 Difícil: 200 pts');
    console.log('Nivel 2 Normal: 200 pts | Nivel 2 Difícil: 400 pts');
    console.log('Nivel 3 Normal: 300 pts | Nivel 3 Difícil: 600 pts');
    
    console.log('\n✅ Todas las pruebas completadas exitosamente!');
    
  } catch (error) {
    console.error('❌ Error en las pruebas:', error.message);
  }
}

// Verificar que el servidor esté corriendo
async function checkServer() {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    if (response.ok) {
      console.log('✅ Servidor API está corriendo\n');
      return true;
    }
  } catch (error) {
    console.error('❌ El servidor API no está corriendo. Inicia el servidor con: npm start');
    console.error('   O manualmente con: node api/index.js\n');
    return false;
  }
}

// Ejecutar pruebas
async function main() {
  if (await checkServer()) {
    await testAPI();
  }
}

main();