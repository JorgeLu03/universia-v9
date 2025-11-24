// 🧪 Prueba de CORS para Túneles
// Ejecutar con: node test-cors-tunnels.js

async function testCORSTunnels() {
  console.log('🧪 PROBANDO CORS DESDE TÚNELES\n');
  
  const API_TUNNEL = 'https://rkvgqth7-4000.usw3.devtunnels.ms';
  const FRONTEND_TUNNEL = 'https://rkvgqth7-5501.usw3.devtunnels.ms';
  
  // 1. Probar OPTIONS (preflight)
  console.log('1️⃣ Probando petición OPTIONS (preflight)...');
  try {
    const optionsResponse = await fetch(`${API_TUNNEL}/api/scores/top`, {
      method: 'OPTIONS',
      headers: {
        'Origin': FRONTEND_TUNNEL,
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'Content-Type'
      }
    });
    
    console.log(`   Status: ${optionsResponse.status}`);
    console.log('   Headers recibidos:');
    optionsResponse.headers.forEach((value, key) => {
      if (key.startsWith('access-control')) {
        console.log(`     ${key}: ${value}`);
      }
    });
    
    if (optionsResponse.status === 200) {
      console.log('   ✅ Preflight exitoso');
    } else {
      console.log('   ❌ Preflight falló');
    }
  } catch (error) {
    console.log('   ❌ Error en preflight:', error.message);
  }
  
  // 2. Probar GET real
  console.log('\n2️⃣ Probando petición GET real...');
  try {
    const getResponse = await fetch(`${API_TUNNEL}/api/scores/top?limit=1`, {
      method: 'GET',
      headers: {
        'Origin': FRONTEND_TUNNEL,
        'Content-Type': 'application/json'
      }
    });
    
    if (getResponse.ok) {
      const data = await getResponse.json();
      console.log('   ✅ Petición GET exitosa');
      console.log(`   📊 Datos recibidos: ${data.length} registros`);
    } else {
      console.log(`   ❌ GET falló: ${getResponse.status}`);
    }
  } catch (error) {
    console.log('   ❌ Error en GET:', error.message);
  }
  
  // 3. Probar desde navegador simulado
  console.log('\n3️⃣ Probando con headers de navegador...');
  try {
    const browserResponse = await fetch(`${API_TUNNEL}/api/scores/top?limit=1`, {
      method: 'GET',
      headers: {
        'Origin': FRONTEND_TUNNEL,
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Test)',
        'Accept': 'application/json, text/plain, */*',
        'Referer': `${FRONTEND_TUNNEL}/ranking.html`
      }
    });
    
    if (browserResponse.ok) {
      console.log('   ✅ Simulación de navegador exitosa');
    } else {
      console.log(`   ❌ Simulación de navegador falló: ${browserResponse.status}`);
    }
  } catch (error) {
    console.log('   ❌ Error en simulación:', error.message);
  }
  
  console.log('\n📋 RESUMEN:');
  console.log(`   🔗 API Tunnel: ${API_TUNNEL}`);
  console.log(`   🌐 Frontend Tunnel: ${FRONTEND_TUNNEL}`);
  console.log('   💡 Si hay errores, revisar configuración CORS en api/index.js');
}

testCORSTunnels().catch(console.error);