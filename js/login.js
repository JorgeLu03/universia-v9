
import { auth } from './firebase-config.js';
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

document.addEventListener('DOMContentLoaded', () => {
    const loginBtn = document.getElementById('btn-login');
    if (loginBtn) {
        loginBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email')?.value.trim();
            const password = document.getElementById('login-password')?.value;
            if (!email || !password) {
                Swal.fire("Datos incompletos", "Por favor llena todos los campos", "warning");
                return;
            }
            try {
                await signInWithEmailAndPassword(auth, email, password);
                Swal.fire("Bienvenido", "Inicio de sesion exitoso", "success")
                .then(() => {
                    window.location.href = "main.html";
                });
            } catch (error) {
                console.error('Error detallado en el registro:', error);
                Swal.fire({
                icon: "error",
                title: "Ocurrio un problema",
                text: "No se pudo iniciar sesion: " + error.message,
                confirmButtonText: "Entendido"
            });
            }
        });
    }
});
