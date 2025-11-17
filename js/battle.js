// battle.js
// Lógica de sistema de combate modular para Universia

export function setupBattleSystem({
    getPlayerStats,
    getEnemyStats,
    getCurrentBattleEnemy,
    setCurrentBattleEnemy,
    getScene,
    getEnemies,
    setInBattle,
    getInBattle,
    getNearbyEnemy,
    setNearbyEnemy,
    getVelocity,
    playBattleMusic,
    stopBattleMusic,
    playAttackSound
}) {
    let isPlayerTurn = true;

    function startBattle(enemy) {
        setInBattle(true);
        setCurrentBattleEnemy(enemy);
        getVelocity().set(0, 0, 0);
        if (playBattleMusic) playBattleMusic();
        const playerStats = getPlayerStats();
        const enemyStats = getEnemyStats();
        playerStats.hp = playerStats.maxHp;
        enemyStats.name = enemy.userData.enemyName;
        enemyStats.hp = enemyStats.maxHp;
        document.getElementById('battleUI').style.display = 'block';
        document.getElementById('interactPrompt').style.display = 'none';
        document.getElementById('playerName').textContent = playerStats.name;
        document.getElementById('enemyName').textContent = enemyStats.name;
        const runBtn = document.getElementById('runBtn');
        if (enemy.userData.isAggressive) {
            runBtn.disabled = true;
            runBtn.style.opacity = '0.5';
            runBtn.style.cursor = 'not-allowed';
            runBtn.title = 'No puedes huir de este enemigo agresivo';
        } else {
            runBtn.disabled = false;
            runBtn.style.opacity = '1';
            runBtn.style.cursor = 'pointer';
            runBtn.title = '';
        }
        updateBattleUI();
        showMessage(`¡Un ${enemyStats.name} salvaje apareció!`);
        isPlayerTurn = true;
    }
    function updateBattleUI() {
        const playerStats = getPlayerStats();
        const enemyStats = getEnemyStats();
        const playerHPPercent = (playerStats.hp / playerStats.maxHp) * 100;
        const enemyHPPercent = (enemyStats.hp / enemyStats.maxHp) * 100;
        document.getElementById('playerHP').style.width = playerHPPercent + '%';
        document.getElementById('enemyHP').style.width = enemyHPPercent + '%';
        document.getElementById('playerHPText').textContent = `HP: ${Math.max(0, playerStats.hp)}/${playerStats.maxHp}`;
        document.getElementById('enemyHPText').textContent = `HP: ${Math.max(0, enemyStats.hp)}/${enemyStats.maxHp}`;
    }
    function showMessage(message) {
        document.getElementById('battleMessage').innerHTML = `<p style=\"margin: 0;\">${message}</p>`;
    }
    function playerAttack() {
        if (!isPlayerTurn) return;
        if (playAttackSound) playAttackSound();
        const playerStats = getPlayerStats();
        const enemyStats = getEnemyStats();
        const damage = Math.max(5, playerStats.attack - enemyStats.defense + Math.floor(Math.random() * 10));
        enemyStats.hp -= damage;
        showMessage(`${playerStats.name} atacó e hizo ${damage} de daño!`);
        updateBattleUI();
        if (enemyStats.hp <= 0) {
            endBattle(true);
        } else {
            isPlayerTurn = false;
            setTimeout(enemyAttack, 1500);
        }
    }
    function playerSpecialAttack() {
        if (!isPlayerTurn) return;
        if (playAttackSound) playAttackSound();
        const playerStats = getPlayerStats();
        const enemyStats = getEnemyStats();
        const damage = Math.max(10, playerStats.attack * 1.5 - enemyStats.defense + Math.floor(Math.random() * 15));
        enemyStats.hp -= damage;
        showMessage(`¡${playerStats.name} usó Ataque Especial e hizo ${damage} de daño!`);
        updateBattleUI();
        if (enemyStats.hp <= 0) {
            endBattle(true);
        } else {
            isPlayerTurn = false;
            setTimeout(enemyAttack, 1500);
        }
    }
    function playerDefend() {
        if (!isPlayerTurn) return;
        const playerStats = getPlayerStats();
        showMessage(`${playerStats.name} se preparó para defenderse...`);
        playerStats.defense += 5;
        isPlayerTurn = false;
        setTimeout(() => {
            enemyAttack();
            playerStats.defense -= 5;
        }, 1500);
    }
    function enemyAttack() {
        if (playAttackSound) playAttackSound();
        const playerStats = getPlayerStats();
        const enemyStats = getEnemyStats();
        const damage = Math.max(3, enemyStats.attack - playerStats.defense + Math.floor(Math.random() * 8));
        playerStats.hp -= damage;
        showMessage(`¡${enemyStats.name} contraatacó e hizo ${damage} de daño!`);
        updateBattleUI();
        if (playerStats.hp <= 0) {
            endBattle(false);
        } else {
            isPlayerTurn = true;
        }
    }
    function runFromBattle() {
        const currentBattleEnemy = getCurrentBattleEnemy();
        if (currentBattleEnemy && currentBattleEnemy.userData.isAggressive) {
            showMessage(`¡No puedes huir de este enemigo agresivo!`);
            return;
        }
        const escapeChance = Math.random();
        if (escapeChance > 0.5) {
            showMessage(`¡Escapaste con éxito!`);
            setTimeout(() => endBattle(false), 1000);
        } else {
            showMessage(`¡No pudiste escapar!`);
            isPlayerTurn = false;
            setTimeout(enemyAttack, 1500);
        }
    }
    function endBattle(won) {
        setTimeout(() => {
            if (stopBattleMusic) stopBattleMusic();
            const scene = getScene();
            const enemies = getEnemies();
            const currentBattleEnemy = getCurrentBattleEnemy();
            const enemyStats = getEnemyStats();
            const playerStats = getPlayerStats();
            if (won) {
                alert(`¡Ganaste! Has derrotado a ${enemyStats.name}`);
                if (currentBattleEnemy) {
                    scene.remove(currentBattleEnemy);
                    const index = enemies.indexOf(currentBattleEnemy);
                    if (index > -1) {
                        enemies.splice(index, 1);
                    }
                    if (getNearbyEnemy() === currentBattleEnemy) {
                        setNearbyEnemy(null);
                        document.getElementById('interactPrompt').style.display = 'none';
                    }
                }
            } else {
                alert(`Has perdido el combate...`);
            }
            document.getElementById('battleUI').style.display = 'none';
            setInBattle(false);
            setCurrentBattleEnemy(null);
        }, 1500);
    }
    document.getElementById('attackBtn').addEventListener('click', playerAttack);
    document.getElementById('specialBtn').addEventListener('click', playerSpecialAttack);
    document.getElementById('defendBtn').addEventListener('click', playerDefend);
    document.getElementById('runBtn').addEventListener('click', runFromBattle);

    return {
        startBattle,
        updateBattleUI,
        showMessage
    };
}
