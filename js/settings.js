import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, updateProfile, updateEmail } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
  const volumeSlider = document.getElementById('volume');
  const usernameInput = document.getElementById('username');
  const emailInput = document.getElementById('correo');
  const saveBtn = document.getElementById('save-settings');
  const backBtn = document.getElementById('back-settings');
  const isEmbedded = window.top && window.top !== window;
  const eventTarget = (window.top && window.top !== window) ? window.top : window;

  let currentUser = null;

  if (volumeSlider) {
    const savedVolume = parseFloat(localStorage.getItem('universiaVolume') ?? '0.8');
    volumeSlider.value = Math.round(savedVolume * 100);

    volumeSlider.addEventListener('input', (event) => {
      const value = Number(event.target.value);
      const normalized = Math.min(Math.max(value / 100, 0), 1);
      const volumeChange = new CustomEvent('universia-volume-change', {
        detail: normalized
      });
      eventTarget.dispatchEvent(volumeChange);
    });
  }

  onAuthStateChanged(auth, (user) => {
    currentUser = user;
    console.log(user);
    if (user && usernameInput) {
      usernameInput.value = user.displayName;
      usernameInput.disabled = false;
      emailInput.value = user.email;
    } else if (usernameInput) {
      usernameInput.value = '';
      usernameInput.disabled = true;
      saveBtn.textContent = "INGRESAR"
    }
  });

  saveBtn?.addEventListener('click', async () => {
    if (!currentUser) {
      window.location.href = "login.html"
    }
    const newName = usernameInput?.value.trim();
    const newEmail = emailInput?.value.trim();
    if (!newName || !newEmail) {
      Swal.fire("Error", "Por favor llena todos los campos", "error");
      return;
    }
    saveBtn.disabled = true;
    try {
      await updateProfile(currentUser, { displayName: newName });
      await updateEmail(currentUser, newEmail);

      await updateDoc(doc(db, "users", currentUser.uid), {
        username: newName,
        email: newEmail
      });
      Swal.fire("Exito", "Datos guardados correctamente", "success");
    } catch (error) {
      console.error('[settings] error actualizando nombre', error);
      Swal.fire({
        icon: "error",
        title: "Ocurrió un problema",
        text: "No se pudo actualizar: " + error.message,
        confirmButtonText: "Entendido"
      });
    } finally {
      saveBtn.disabled = false;
    }
  });

  backBtn?.addEventListener('click', () => {
    if (isEmbedded) {
      window.top?.postMessage('close-settings-overlay', '*');
    } else {
      window.history.back();
    }
  });
});
