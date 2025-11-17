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
      alert('Selecciona un nivel antes de comenzar.');
      return;
    }
    window.location.href = selectedTarget;
  });
});