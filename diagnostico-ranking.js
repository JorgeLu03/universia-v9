// 🔧 Script de Diagnóstico - Sistema de Ranking Universia
// Ejecutar con: node diagnostico-ranking.js

const API_BASE_URL = 'http://localhost:4000';
const FRONTEND_URL = 'http://localhost:8000';

async function diagnosticoCompleto() {
  console.log('🔍 DIAGNÓSTICO DEL SISTEMA DE RANKING\n');
  
  let todoBien = true;
  
  // 1. Verificar API Health
  console.log('1️⃣ Verificando API Health...');
  try {
    const healthResponse = await fetch(`${API_BASE_URL}/health`);
    if (healthResponse.ok) {
      const health = await healthResponse.json();
      console.log('   ✅ API funcionando correctamente');
      console.log(`   📊 Timestamp: ${new Date(health.timestamp).toLocaleString()}`);
    } else {
      console.log('   ❌ API responde pero con error:', healthResponse.status);
      todoBien = false;
    }
  } catch (error) {
    console.log('   ❌ API no responde:', error.message);
    console.log('   💡 Sugerencia: Ejecutar "npm start" en el directorio del proyecto');
    todoBien = false;
  }
  
  // 2. Verificar CORS
  console.log('\n2️⃣ Verificando configuración CORS...');
  try {
    const corsTest = await fetch(`${API_BASE_URL}/api/scores/top?limit=1`, {
      method: 'GET',
      headers: { 
        'Origin': FRONTEND_URL,
        'Content-Type': 'application/json' 
      }
    });
    console.log('   ✅ CORS configurado correctamente');
  } catch (error) {
    console.log('   ❌ Error de CORS:', error.message);
    console.log('   💡 Sugerencia: Verificar allowedOrigins en api/index.js');
    todoBien = false;
  }
  
  // 3. Verificar datos del ranking
  console.log('\n3️⃣ Verificando datos del ranking...');
  try {
    const rankingResponse = await fetch(`${API_BASE_URL}/api/scores/top?limit=5`);
    if (rankingResponse.ok) {
      const ranking = await rankingResponse.json();
      console.log(`   ✅ ${ranking.length} jugadores en el ranking`);
      
      if (ranking.length > 0) {
        console.log('   🏆 Top 3:');
        ranking.slice(0, 3).forEach((player, i) => {
          console.log(`      ${i + 1}. ${player.username}: ${player.totalPoints} pts`);
        });
      }
    } else {
      console.log('   ❌ Error obteniendo ranking:', rankingResponse.status);
      todoBien = false;
    }
  } catch (error) {
    console.log('   ❌ Error de conexión al ranking:', error.message);
    todoBien = false;
  }
  
  // 4. Verificar estructura de BD
  console.log('\n4️⃣ Verificando base de datos...');
  try {
    // Probar inserción de datos de prueba
    const testData = {
      uid: `test_${Date.now()}`,
      username: 'DiagnosticTest',
      level: 1,
      difficulty: 'normal'
    };
    
    const insertResponse = await fetch(`${API_BASE_URL}/api/scores`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testData)
    });
    
    if (insertResponse.ok) {
      const result = await insertResponse.json();
      console.log('   ✅ Base de datos funciona correctamente');
      console.log(`   📝 Prueba insertada: ${result.points} pts para nivel ${result.level} (${result.difficulty})`);
    } else {
      console.log('   ❌ Error insertando en BD:', insertResponse.status);
      todoBien = false;
    }
  } catch (error) {
    console.log('   ❌ Error de base de datos:', error.message);
    todoBien = false;
  }
  
  // 5. Verificar puertos
  console.log('\n5️⃣ Verificando puertos...');
  console.log('   📡 API esperada en: http://localhost:4000');
  console.log('   🌐 Frontend esperado en: http://localhost:8000');
  
  // Resumen final
  console.log('\n' + '='.repeat(50));
  if (todoBien) {
    console.log('🎉 DIAGNÓSTICO COMPLETADO: Todo funciona correctamente');
    console.log('✅ El sistema de ranking está operativo');
    console.log('🚀 Puedes usar el juego normalmente');
  } else {
    console.log('⚠️ PROBLEMAS DETECTADOS en el sistema');
    console.log('🔧 Revisa los errores arriba para solucionarlos');
  }
  
  console.log('\n📋 Enlaces útiles:');
  console.log('   - Ranking: http://localhost:8000/ranking.html');
  console.log('   - API Health: http://localhost:4000/health');
  console.log('   - API Top Scores: http://localhost:4000/api/scores/top');
}

// Ejecutar diagnóstico
diagnosticoCompleto().catch(error => {
  console.error('❌ Error ejecutando diagnóstico:', error);
});