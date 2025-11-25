import express from 'express'; // <-- Cambio: Usar import
import path from 'path';       // <-- Cambio: Usar import

const app = express();
const FRONTEND_PORT = 8080;

// Obtiene la ruta de trabajo actual del sistema
const rootDirectory = process.cwd();

// 1. Sirve todos los archivos estáticos
app.use(express.static(rootDirectory)); 

// 2. Define una ruta específica para el raíz ('/')
app.get('/', (req, res) => {
    // path.join funciona igual con import
    res.sendFile(path.join(rootDirectory, 'main.html'));
});

// 3. Iniciar el servidor
app.listen(FRONTEND_PORT, () => {
    console.log(`Juego Web (Frontend) escuchando en http://localhost:${FRONTEND_PORT}`);
});