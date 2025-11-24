🚨 ACCIÓN REQUERIDA: Crear Túnel para API (Puerto 4000)

📋 PASOS A SEGUIR:

1️⃣ **En VS Code:**
   - Presiona `Ctrl + Shift + P`
   - Busca "Ports: Focus on Ports View"
   - En la vista de Ports, haz clic en "Forward a Port"
   - Ingresa: `4000`
   - Haz clic derecho en el puerto 4000 → "Port Visibility" → "Public"

2️⃣ **Obtener URL del túnel:**
   - Copia la URL generada (algo como: https://rkvgqth7-4000.usw3.devtunnels.ms)
   - Si es diferente a la que pusimos por defecto, actualiza ranking.html

3️⃣ **Si la URL del túnel API es diferente:**
   ```javascript
   // En ranking.html, cambiar línea ~23:
   window.SCORES_API_URL = 'https://TU-URL-TUNNEL-AQUI';
   ```

✅ **Estado Actual:**
- ✅ API Local: Puerto 4000 funcionando
- ✅ Frontend Local: Puerto 5501 funcionando  
- ✅ Túnel Frontend: https://rkvgqth7-5501.usw3.devtunnels.ms
- ⚠️ Túnel API: **PENDIENTE DE CREAR**

🎯 **Una vez creado el túnel para puerto 4000:**
   Accede a: https://rkvgqth7-5501.usw3.devtunnels.ms/ranking.html

💡 **El ranking debería cargar automáticamente con los datos correctos.**