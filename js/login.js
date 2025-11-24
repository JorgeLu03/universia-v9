import { auth, db } from './firebase-config.js';
import { 
    signInWithEmailAndPassword, 
    GoogleAuthProvider, 
    signInWithPopup, 
    signInWithRedirect,
    getRedirectResult,
    setPersistence,
    browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Variable para rastrear intentos de login
let isGoogleLoginInProgress = false;

// Configurar persistencia de sesión
setPersistence(auth, browserLocalPersistence).catch(console.error);

// Verificar si hay un resultado de redirección pendiente
getRedirectResult(auth).then(async (result) => {
    if (result && result.user) {
        console.log('Login exitoso via redirect:', result.user);
        
        // Mostrar estado de éxito si los elementos están disponibles
        setTimeout(() => {
            showGoogleStatus('¡Inicio de sesión exitoso!', 'success');
        }, 100);
        
        await handleGoogleUser(result.user);
        
        Swal.fire("Bienvenido", "Inicio de sesión exitoso con Google", "success")
        .then(() => {
            window.location.href = "main.html";
        });
    }
}).catch((error) => {
    console.error('Error en redirect result:', error);
    
    // Mostrar error si los elementos están disponibles
    setTimeout(() => {
        showGoogleStatus('Error en la autenticación', 'error');
    }, 100);
});

// Función para manejar datos del usuario de Google
async function handleGoogleUser(user) {
    try {
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);

        if (!userDoc.exists()) {
            await setDoc(userDocRef, {
                username: user.displayName || 'Usuario Google',
                email: user.email,
                uid: user.uid,
                photoURL: user.photoURL || null,
                provider: 'google',
                createdAt: new Date()
            });
            console.log('Nuevo usuario Google guardado en Firestore');
        }
    } catch (error) {
        console.error('Error guardando usuario Google:', error);
    }
}

// Función para mostrar estado del login de Google
function showGoogleStatus(message, type = 'info') {
    const statusDiv = document.getElementById('google-login-status');
    const statusText = document.getElementById('status-text');
    
    if (statusDiv && statusText) {
        statusText.textContent = message;
        statusDiv.style.display = 'block';
        
        switch (type) {
            case 'success':
                statusDiv.style.background = '#d4edda';
                statusDiv.style.color = '#155724';
                break;
            case 'error':
                statusDiv.style.background = '#f8d7da';
                statusDiv.style.color = '#721c24';
                break;
            case 'info':
            default:
                statusDiv.style.background = '#d1ecf1';
                statusDiv.style.color = '#0c5460';
        }
        
        if (type === 'success' || type === 'error') {
            setTimeout(() => {
                statusDiv.style.display = 'none';
            }, 3000);
        }
    }
}

// Función mejorada para login con Google
async function handleGoogleLogin() {
    if (isGoogleLoginInProgress) {
        console.log('Login con Google ya en progreso...');
        showGoogleStatus('Procesando solicitud anterior...', 'info');
        return;
    }

    isGoogleLoginInProgress = true;
    const provider = new GoogleAuthProvider();
    
    // Configurar scopes y parámetros adicionales
    provider.addScope('email');
    provider.addScope('profile');
    provider.setCustomParameters({
        prompt: 'select_account'
    });

    try {
        showGoogleStatus('Abriendo ventana de Google...', 'info');
        console.log('Intentando login con popup...');
        
        // Intentar primero con popup
        const result = await signInWithPopup(auth, provider);
        const user = result.user;
        
        console.log('Login exitoso con popup:', user);
        showGoogleStatus('¡Inicio de sesión exitoso!', 'success');
        
        await handleGoogleUser(user);
        
        setTimeout(() => {
            window.location.href = "main.html";
        }, 1000);
        
    } catch (error) {
        console.error('Error en popup:', error);
        
        // Si el popup falla, intentar con redirect
        if (error.code === 'auth/popup-blocked' || 
            error.code === 'auth/popup-closed-by-user' ||
            error.code === 'auth/cancelled-popup-request') {
            
            console.log('Popup bloqueado o cancelado, usando redirect...');
            showGoogleStatus('Redirigiendo a Google...', 'info');
            
            try {
                // Usar redirect como alternativa
                await signInWithRedirect(auth, provider);
                // No necesitamos hacer nada más aquí, 
                // getRedirectResult manejará el resultado
            } catch (redirectError) {
                console.error('Error en redirect:', redirectError);
                showGoogleStatus('Error de autenticación', 'error');
                
                Swal.fire({
                    icon: "error",
                    title: "Error de autenticación",
                    text: "No se pudo iniciar sesión con Google. Por favor, intenta de nuevo o usa email/contraseña.",
                    confirmButtonText: "Entendido"
                });
            }
        } else {
            // Otro tipo de error
            console.error('Error de Google login:', error);
            
            let errorMessage = "Error desconocido";
            switch (error.code) {
                case 'auth/network-request-failed':
                    errorMessage = "Error de conexión. Verifica tu internet.";
                    break;
                case 'auth/too-many-requests':
                    errorMessage = "Demasiados intentos. Espera un momento.";
                    break;
                case 'auth/user-disabled':
                    errorMessage = "Esta cuenta ha sido deshabilitada.";
                    break;
                case 'auth/account-exists-with-different-credential':
                    errorMessage = "Ya existe una cuenta con este email usando otro método.";
                    break;
                default:
                    errorMessage = error.message || "Error al iniciar sesión";
            }
            
            showGoogleStatus('Error: ' + errorMessage, 'error');
            
            // Solo mostrar SweetAlert para errores críticos
            if (error.code !== 'auth/popup-closed-by-user') {
                Swal.fire({
                    icon: "error",
                    title: "Error de Google Login",
                    text: errorMessage,
                    confirmButtonText: "Entendido"
                });
            }
        }
    } finally {
        isGoogleLoginInProgress = false;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Login con email y contraseña
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
            
            // Deshabilitar botón mientras se procesa
            loginBtn.disabled = true;
            loginBtn.textContent = "Iniciando sesión...";
            
            try {
                const userCredential = await signInWithEmailAndPassword(auth, email, password);
                console.log('Login exitoso:', userCredential.user);
                
                Swal.fire("Bienvenido", "Inicio de sesión exitoso", "success")
                .then(() => {
                    window.location.href = "main.html";
                });
                
            } catch (error) {
                console.error('Error en login con email:', error);
                
                let errorMessage = "Error al iniciar sesión";
                switch (error.code) {
                    case 'auth/user-not-found':
                        errorMessage = "No existe una cuenta con este email";
                        break;
                    case 'auth/wrong-password':
                        errorMessage = "Contraseña incorrecta";
                        break;
                    case 'auth/invalid-email':
                        errorMessage = "Email inválido";
                        break;
                    case 'auth/user-disabled':
                        errorMessage = "Esta cuenta ha sido deshabilitada";
                        break;
                    case 'auth/too-many-requests':
                        errorMessage = "Demasiados intentos fallidos. Intenta más tarde";
                        break;
                    default:
                        errorMessage = error.message;
                }
                
                Swal.fire({
                    icon: "error",
                    title: "Error de inicio de sesión",
                    text: errorMessage,
                    confirmButtonText: "Entendido"
                });
            } finally {
                // Rehabilitar botón
                loginBtn.disabled = false;
                loginBtn.textContent = "INICIAR SESIÓN";
            }
        });
    }

    // Login con Google
    const googleBtn = document.getElementById('btn-google');
    if (googleBtn) {
        googleBtn.addEventListener('click', (e) => {
            e.preventDefault();
            handleGoogleLogin();
        });
    }
});
