document.addEventListener('DOMContentLoaded', () => {
  const levelButtons = document.querySelectorAll('.nivel-btn');
  const startButton = document.getElementById('start-level');
  let selectedTarget = null;

  levelButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      levelButtons.forEach((b) => b.classList.remove('selected'));
      btn.classList.add('selected');
      selectedTarget = btn.dataset.target || null;
    });
  });

  startButton?.addEventListener('click', () => {
    if (!selectedTarget) {
      Swal.fire({
        icon: "warning",
        title: "Datos incompletos",
        text: "Por favor selecciona un nivel. ",
        confirmButtonText: "Entendido"
      });
      return;
    }
    window.location.href = selectedTarget;
  });
});