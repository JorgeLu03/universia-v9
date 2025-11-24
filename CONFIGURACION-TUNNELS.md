# 🚀 Configuración de Túneles de Desarrollo - Universia v9

## 📋 Pasos para Configurar los Túneles

### 1️⃣ **Túnel para Frontend (Puerto 5501)**
Ya tienes: `https://rkvgqth7-5501.usw3.devtunnels.ms`

### 2️⃣ **Túnel para API (Puerto 4000) - REQUERIDO**
Necesitas crear un túnel para la API en el puerto 4000:

```bash
# En VS Code, abre la Command Palette (Ctrl+Shift+P)
# Busca: "Ports: Focus on Ports View"
# Agrega el puerto 4000 y haz clic en "Make Public" o "Forward Port"
# Esto creará algo como: https://rkvgqth7-4000.usw3.devtunnels.ms
```

### 3️⃣ **Actualizar la URL del Túnel API**
Si tu túnel de API tiene una URL diferente, actualiza el archivo `ranking.html`:

```javascript
// En ranking.html, línea ~22, cambiar:
window.SCORES_API_URL = 'https://TU-TUNEL-API-AQUI';
```

## 🔧 **Comandos para Ejecutar**

### **Terminal 1 - API Server:**
```powershell
cd "c:\Users\jalp_\OneDrive\Escritorio\Escuela\7MO SEMESTRE\GRAFICAS WEB\universia-v9"
npm start
```

### **Terminal 2 - Frontend Server:**
```powershell
cd "c:\Users\jalp_\OneDrive\Escritorio\Escuela\7MO SEMESTRE\GRAFICAS WEB\universia-v9"
python -m http.server 5501
```

## 🌐 **URLs Finales**
- **Frontend**: https://rkvgqth7-5501.usw3.devtunnels.ms/ranking.html
- **API**: https://rkvgqth7-4000.usw3.devtunnels.ms (o la que generes)

## ✅ **Verificación**
Una vez configurado, ejecutar:
```powershell
node diagnostico-tunnels.js
```

## 🔍 **Troubleshooting**
- **CORS Error**: Verifica que ambos túneles estén en la configuración CORS
- **API No Response**: Asegúrate de que el túnel del puerto 4000 esté activo
- **Frontend No Load**: Verifica que el servidor esté corriendo en puerto 5501