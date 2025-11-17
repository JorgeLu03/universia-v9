document.addEventListener('DOMContentLoaded', () => {
  const modeButtons = document.querySelectorAll('.mode-btn');
  const difficultySelect = document.getElementById('difficulty');
  const continueBtn = document.getElementById('continue-btn');
  let selectedMode = null;

  modeButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      modeButtons.forEach((b) => b.classList.remove('selected'));
      btn.classList.add('selected');
      selectedMode = btn.id;

      if (selectedMode === 'multijugador') {
        if (difficultySelect) {
          difficultySelect.disabled = true;
          difficultySelect.classList.add('disabled');
        }
      } else {
        if (difficultySelect) {
          difficultySelect.disabled = false;
          difficultySelect.classList.remove('disabled');
        }
      }
    });
  });

  continueBtn?.addEventListener('click', () => {
    if (!selectedMode) {
      alert('Selecciona un modo de juego.');
      return;
    }

    if (selectedMode === 'individual') {
      if (difficultySelect && !difficultySelect.value) {
        alert('Selecciona una dificultad.');
        return;
      }
      window.location.href = 'level.html';
    } else {
      alert('El modo multijugador estará disponible próximamente.');
    }
  });
});