import { auth } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

document.addEventListener('DOMContentLoaded', () => {
    const loginLink = document.getElementById('login-link');
    const userNameDiv = document.getElementById('user-name');
    const logoutBtn = document.getElementById('logout-btn');
    const playLink = document.getElementById('play-link');
    let isAuthenticated = false;

    playLink?.addEventListener('click', (event) => {
        if (!isAuthenticated) {
            event.preventDefault();
            alert('Inicia sesión para acceder a los modos de juego.');
        }
    });

    onAuthStateChanged(auth, (user) => {
        isAuthenticated = Boolean(user);
        if (user) {
            // Mostrar nombre y botón de logout
            if (userNameDiv) {
                userNameDiv.textContent = user.displayName || user.email;
                userNameDiv.style.display = 'block';
            }
            if (loginLink) {
                loginLink.style.pointerEvents = 'none';
                loginLink.style.opacity = '0.5';
            }
            if (logoutBtn) {
                logoutBtn.style.display = 'inline-block';
                logoutBtn.onclick = () => {
                    signOut(auth).then(() => {
                        window.location.reload();
                    });
                };
            }
        } else {
            // Si no hay usuario, ocultar nombre y logout, activar login
            if (userNameDiv) userNameDiv.style.display = 'none';
            if (logoutBtn) logoutBtn.style.display = 'none';
            if (loginLink) {
                loginLink.style.pointerEvents = 'auto';
                loginLink.style.opacity = '1';
            }
        }
    });
});
