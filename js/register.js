
import { auth, db } from './firebase-config.js';
import { createUserWithEmailAndPassword, updateProfile } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { setDoc, doc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

async function siguiente() {
    console.log('Iniciando el proceso de registro...');
    const email = document.getElementById('email')?.value.trim();
    const username = document.getElementById('username')?.value.trim();
    const password = document.getElementById('password')?.value;
    const confirmPassword = document.getElementById('confirm-password')?.value;
    const div1 = document.getElementById('datosP');
    const div2 = document.getElementById('datosJ');

    if (!email || !username || !password || !confirmPassword) {
        alert('Por favor, completa todos los campos.');
        return;
    }
    if (password !== confirmPassword) {
        alert('Las contraseñas no coinciden.');
        return;
    }

    try {
        // 1. Crear usuario en Firebase Auth
        console.log('Creando usuario en Firebase Auth...');
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        console.log('Usuario creado exitosamente:', user);

        // 3. Actualizar perfil de usuario (solo nombre)
        console.log('Actualizando perfil de usuario...');
        await updateProfile(user, { displayName: username });
        console.log('Perfil de usuario actualizado.');

        // 4. Guardar datos en Firestore (sin avatar)
        console.log('Guardando datos en Firestore...');
        await setDoc(doc(db, 'users', user.uid), {
            username: username,
            email: email,
            uid: user.uid
        });
        console.log('Datos guardados en Firestore.');

        // Redirigir al login tras registro exitoso
        console.log('Registro exitoso. Redirigiendo a login.html...');
        window.location.href = 'login.html';
    } catch (error) {
        console.error('Error detallado en el registro:', error);
        alert('Error en el registro: ' + error.message);
    }
}

// Asignar el event listener al botón después de cargar el DOM
document.addEventListener('DOMContentLoaded', () => {
    const btnSiguiente = document.getElementById('btn-siguiente');
    if (btnSiguiente) {
        btnSiguiente.addEventListener('click', siguiente);
    }
});

// Eliminado manejo de previsualización de imagen