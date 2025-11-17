import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, updateProfile } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
  const volumeSlider = document.getElementById('volume');
  const usernameInput = document.getElementById('username');
  const saveBtn = document.getElementById('save-settings');

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
      window.dispatchEvent(volumeChange);
    });
  }

  onAuthStateChanged(auth, (user) => {
    currentUser = user;
    if (user && usernameInput) {
      usernameInput.value = user.displayName || user.email || '';
      usernameInput.disabled = false;
    } else if (usernameInput) {
      usernameInput.value = '';
      usernameInput.disabled = true;
    }
  });

  saveBtn?.addEventListener('click', async () => {
    if (!currentUser) {
      alert('Inicia sesion para guardar cambios.');
      return;
    }
    const newName = usernameInput?.value.trim();
    if (!newName) {
      alert('Ingresa un nombre valido.');
      return;
    }
    saveBtn.disabled = true;
    try {
      await updateProfile(currentUser, { displayName: newName });
      await updateDoc(doc(db, 'users', currentUser.uid), { username: newName });
      alert('Nombre actualizado correctamente.');
    } catch (error) {
      console.error('[settings] error actualizando nombre', error);
      alert('No se pudo actualizar: ' + error.message);
    } finally {
      saveBtn.disabled = false;
    }
  });
});