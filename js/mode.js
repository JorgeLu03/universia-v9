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
      Swal.fire({
        icon: "warning",
        title: "Datos incompletos",
        text: "Selecciona un modo de juego: ",
        confirmButtonText: "Entendido"
      });
      return;
    }

    if (selectedMode === 'individual') {
      
      const dificultad = difficultySelect.value;
      // Guardar en localStorage
      localStorage.setItem("dificultad", dificultad);
      window.location.href = 'level.html';

    } else {
      alert('El modo multijugador estara disponible proximamente.');
    }
  });

});