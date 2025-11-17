
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
                alert('Por favor, completa todos los campos.');
                return;
            }
            try {
                await signInWithEmailAndPassword(auth, email, password);
                window.location.href = 'main.html';
            } catch (error) {
                alert('Error al iniciar sesión: ' + error.message);
            }
        });
    }
});
