// 🔍 Diagnóstico de Túneles - Sistema de Ranking Universia
// Ejecutar con: node diagnostico-tunnels.js

async function diagnosticoTunnels() {
  console.log('🌐 DIAGNÓSTICO DE TÚNELES DE DESARROLLO\n');
  
  const FRONTEND_TUNNEL = 'https://rkvgqth7-5501.usw3.devtunnels.ms';
  const API_TUNNEL = 'https://rkvgqth7-4000.usw3.devtunnels.ms';
  const LOCAL_API = 'http://localhost:4000';
  
  // 1. Verificar API Local
  console.log('1️⃣ Verificando API Local (localhost:4000)...');
  try {
    const response = await fetch(`${LOCAL_API}/health`, { 
      signal: AbortSignal.timeout(5000) 
    });
    if (response.ok) {
      console.log('   ✅ API local funcionando');
    } else {
      console.log('   ❌ API local responde con error:', response.status);
    }
  } catch (error) {
    console.log('   ❌ API local no responde');
    console.log('   💡 Ejecutar: npm start');
  }
  
  // 2. Verificar Túnel de API
  console.log('\n2️⃣ Verificando Túnel de API...');
  try {
    const response = await fetch(`${API_TUNNEL}/health`, { 
      signal: AbortSignal.timeout(10000) 
    });
    if (response.ok) {
      const health = await response.json();
      console.log('   ✅ Túnel de API funcionando');
      console.log(`   🔗 URL: ${API_TUNNEL}`);
    } else {
      console.log('   ❌ Túnel de API responde con error:', response.status);
    }
  } catch (error) {
    console.log('   ❌ Túnel de API no accesible');
    console.log('   💡 Crear túnel en VS Code para puerto 4000');
    console.log('   📋 Pasos:');
    console.log('      1. Ctrl+Shift+P → "Ports: Focus on Ports View"');
    console.log('      2. Agregar puerto 4000');
    console.log('      3. Hacer público el puerto');
  }
  
  // 3. Verificar CORS desde túnel
  console.log('\n3️⃣ Verificando CORS desde túnel...');
  try {
    const response = await fetch(`${API_TUNNEL}/api/scores/top?limit=1`, {
      method: 'GET',
      headers: { 
        'Origin': FRONTEND_TUNNEL,
        'Content-Type': 'application/json' 
      },
      signal: AbortSignal.timeout(10000)
    });
    
    if (response.ok) {
      console.log('   ✅ CORS funcionando desde túnel');
      const data = await response.json();
      console.log(`   📊 ${data.length} registros obtenidos`);
    } else {
      console.log('   ❌ Error CORS desde túnel:', response.status);
    }
  } catch (error) {
    console.log('   ❌ Error probando CORS desde túnel');
    console.log('   💡 Verificar configuración CORS en api/index.js');
  }
  
  // 4. Verificar Frontend
  console.log('\n4️⃣ Verificando Frontend...');
  try {
    const response = await fetch(`${FRONTEND_TUNNEL}/ranking.html`, {
      signal: AbortSignal.timeout(10000)
    });
    if (response.ok) {
      console.log('   ✅ Frontend accesible');
      console.log(`   🔗 URL: ${FRONTEND_TUNNEL}/ranking.html`);
    } else {
      console.log('   ❌ Frontend no accesible:', response.status);
    }
  } catch (error) {
    console.log('   ❌ Frontend no disponible');
    console.log('   💡 Ejecutar: python -m http.server 5501');
  }
  
  // 5. Mostrar configuración actual
  console.log('\n5️⃣ Configuración Detectada:');
  console.log(`   🌐 Frontend: ${FRONTEND_TUNNEL}`);
  console.log(`   📡 API: ${API_TUNNEL}`);
  console.log(`   🔧 Local API: ${LOCAL_API}`);
  
  // 6. Instrucciones finales
  console.log('\n📋 INSTRUCCIONES:');
  console.log('   1. Asegúrate de que ambos servidores estén corriendo:');
  console.log('      - API: npm start (puerto 4000)');
  console.log('      - Frontend: python -m http.server 5501');
  console.log('   2. Crear túneles en VS Code para ambos puertos');
  console.log('   3. Acceder a: ' + FRONTEND_TUNNEL + '/ranking.html');
  
  console.log('\n🔧 Si hay problemas:');
  console.log('   - Verificar que los túneles estén públicos');
  console.log('   - Revisar configuración CORS en api/index.js');
  console.log('   - Comprobar que no haya firewall bloqueando');
}

// Ejecutar diagnóstico
diagnosticoTunnels().catch(error => {
  console.error('❌ Error en diagnóstico:', error.message);
});