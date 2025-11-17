// --- LÓGICA DE BATALLA Y ATAQUE ---

function startBattle(enemy) {
	if (inBattle) return;
	inBattle = true;
	currentBattleEnemy = enemy;
	// Configura los stats del enemigo según el modelo
	enemyStats.name = enemy.userData.enemyName || "Enemigo";
	enemyStats.hp = 100;
	enemyStats.maxHp = 100;
	enemyStats.attack = 15;
	enemyStats.defense = 8;
	// Puedes personalizar stats por tipo de enemigo aquí si lo deseas
	// Oculta el texto de interacción si está visible
	const interactPrompt = document.getElementById('interactPrompt');
	if (interactPrompt) interactPrompt.style.display = 'none';
	// Pausa la música de fondo (forzado)
	if (window.persistentMusic && window.persistentMusic.audio) {
		try { window.persistentMusic.audio.pause(); } catch (e) {}
	}
	// Muestra la UI de batalla
	document.getElementById('battleUI').style.display = 'block';
	document.getElementById('enemyName').textContent = enemyStats.name;
	updateBattleUI();
	showMessage('Presiona ATACAR para comenzar el combate');
	// Reproduce el sonido de PELEA
	try {
		if (window.battleAudio && typeof window.battleAudio.pause === 'function') {
			window.battleAudio.pause();
			window.battleAudio.currentTime = 0;
		}
		window.battleAudio = new Audio('../assets/Sonido/PELEA.mp3');
		window.battleAudio.volume = 1.0;
		window.battleAudio.loop = true;
		window.battleAudio.play();
	} catch (e) { /* ignorar error de audio */ }
	isPlayerTurn = true;
}
// game-level3.js
// Basado en game-level2.js, adaptado para scenario3.glb

import * as THREE from "../scene/three.module.js";
import { OrbitControls } from "../scene/OrbitControls.js";
import { STLLoader } from "../scene/STLLoader.js";
import { GLTFLoader } from "../scene/GLTFLoader.js";
import { RGBELoader } from "../assets/Light/RGBELoader.js";
import { Player } from "./player.js";
import { awardScoreForLevel } from "./score-service.js";

const pauseOverlay = document.getElementById('pauseOverlay');
const pauseButton = document.getElementById('pause');
const resumeBtn = document.getElementById('resumeBtn');
const settingsBtn = document.getElementById('settingsBtn');
const exitBtn = document.getElementById('exitBtn');
const settingsOverlay = document.getElementById('settingsOverlay');
const closeSettingsBtn = document.getElementById('closeSettingsBtn');
const overlayVolume = document.getElementById('overlayVolume');
let isGamePaused = false;

function showPause() {
	isGamePaused = true;
	if (pauseOverlay) pauseOverlay.style.display = 'flex';
}

function hidePause(resumeGame = true) {
	if (resumeGame) {
		isGamePaused = false;
	}
	if (pauseOverlay) pauseOverlay.style.display = 'none';
}

function syncOverlayVolume() {
	if (!overlayVolume) return;
	const current = window.persistentMusic?.volume ?? parseFloat(localStorage.getItem('universiaVolume') ?? '0.8');
	overlayVolume.value = Math.round((Number.isFinite(current) ? current : 0.8) * 100);
}

function showSettingsPanel() {
	isGamePaused = true;
	if (pauseOverlay) pauseOverlay.style.display = 'none';
	if (settingsOverlay) {
		syncOverlayVolume();
		settingsOverlay.style.display = 'flex';
	}
}

function hideSettingsPanel() {
	if (settingsOverlay) settingsOverlay.style.display = 'none';
}

pauseButton?.addEventListener('click', showPause);
resumeBtn?.addEventListener('click', () => hidePause(true));
settingsBtn?.addEventListener('click', showSettingsPanel);
closeSettingsBtn?.addEventListener('click', () => {
	hideSettingsPanel();
	showPause();
});
exitBtn?.addEventListener('click', () => {
	window.location.href = 'main.html';
});

overlayVolume?.addEventListener('input', (event) => {
	const value = Number(event.target.value);
	const normalized = Math.min(Math.max(value / 100, 0), 1);
	const volumeChange = new CustomEvent('universia-volume-change', { detail: normalized });
	window.dispatchEvent(volumeChange);
});

const contenedor = document.getElementById("escena3D");
const scene = new THREE.Scene();
scene.background = new THREE.Color("#34495E");

const camera = new THREE.PerspectiveCamera(
	45,
	contenedor.clientWidth / contenedor.clientHeight
);
camera.position.set(0, 30, -50);

// --- Player system ---
const maxSpeed = 0.035;
const acceleration = 0.002;
const deceleration = 0.95;
const rotationSpeed = 0.1;
let player = null;
let playerController = null;
let velocity = new THREE.Vector3();

// Variables de combate
let inBattle = false;
let nearbyEnemy = null;
let currentBattleEnemy = null;
const enemies = [];
const interactionDistance = 3;

// Variables de colisiones
let scenarioModel = null;
const boundaryObjects = [];
const collisionHelpers = [];
const playerRadius = 0.5;
const enableCollisionDebug = true;

const scenarioScale = 8; // Escenario mucho más grande
const scenarioPosition = new THREE.Vector3(0, 0, 0);

// Límites del escenario 3 (ajustar según sea necesario)
const scenarioBounds = {
	minX: -15,
	maxX: 15,
	minZ: -24,
	maxZ: 19,
};

let playerStats = {
	name: "Unicornio",
	hp: 100,
	maxHp: 100,
	attack: 20,
	defense: 10
};

let enemyStats = {
	name: "Enemigo",
	hp: 100,
	maxHp: 100,
	attack: 15,
	defense: 8
};

let isPlayerTurn = true;
let level3ScoreSaved = false;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.4;
renderer.setSize(contenedor.clientWidth, contenedor.clientHeight);
contenedor.appendChild(renderer.domElement);

const pmremGenerator = new THREE.PMREMGenerator(renderer);
pmremGenerator.compileEquirectangularShader();

new RGBELoader()
	.load("assets/Light/HDRI.hdr", (texture) => {
		const envMap = pmremGenerator.fromEquirectangular(texture).texture;
		scene.environment = envMap;
		scene.background = envMap;
		texture.dispose();
		pmremGenerator.dispose();
	}, undefined, (error) => {
		console.error("[level3] No se pudo cargar la HDRI", error);
	});

const hemisphereLight = new THREE.HemisphereLight(0xffffbb, 0x080820, 1);
scene.add(hemisphereLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(1, 5, -1);
scene.add(directionalLight);

// Escenario (Scenario3)
const loaderGLB = new GLTFLoader();
loaderGLB.load("../assets/models/scenario3.glb", function (model) {
	scenarioModel = model.scene;
	scenarioModel.scale.set(scenarioScale, scenarioScale, scenarioScale);
	scenarioModel.position.copy(scenarioPosition);
    scenarioModel.rotation.y = Math.PI / 2; // Voltear 90 grados
	scene.add(scenarioModel);
	// Aquí puedes agregar lógica para boundaries si es necesario
});

// --- Crear e inicializar el personaje principal usando Player.js ---
playerController = new Player(scene, scenarioBounds, playerRadius, acceleration, maxSpeed, deceleration, rotationSpeed);
playerController.loadPlayerModel(() => {
    player = playerController.getObject();
});

// --- Lógica de colisiones internas (ajustar si tienes Scenario3Colissions.glb) ---
// loaderGLB.load("../assets/models/Scenario3Colissions.glb", function (model) {
//     ... (igual que en nivel 2, si tienes el archivo de colisiones internas para el escenario 3)
// });

// --- Enemigos ---
loaderGLB.load("../assets/models/bee_cartoon.glb", function (model) {
	const obj = model.scene;
	obj.scale.set(0.5, 0.5, 0.5);
	obj.position.set(6, 2, 0);
	obj.userData.enemyName = "Abeja";
	obj.userData.isEnemy = true;
	scene.add(obj);
	enemies.push(obj);
});
loaderGLB.load("../assets/models/ice_bear_we_bare_bears.glb", function (model) {
	const obj = model.scene;
	obj.scale.set(0.4, 0.4, 0.4);
	obj.position.set(12, 1.5, 7);
	obj.rotateY(-Math.PI / 2);
	obj.userData.enemyName = "Oso";
	obj.userData.isEnemy = true;
	obj.userData.detectionRange = 8;
	obj.userData.chaseSpeed = 0.08;
	obj.userData.originalPosition = obj.position.clone();
	obj.userData.isChasing = false;
	obj.userData.isAggressive = true;
	scene.add(obj);
	enemies.push(obj);
});
loaderGLB.load("../assets/models/low_poly_toucan.glb", function (model) {
	const obj = model.scene;
	obj.rotateY(-Math.PI / 2);
	obj.scale.set(0.12, 0.12, 0.12);
	obj.position.set(-10, 0, 0);
	obj.userData.enemyName = "Tucán";
	obj.userData.isEnemy = true;
	scene.add(obj);
	enemies.push(obj);
});
let mixer;
const animScene = new GLTFLoader();
animScene.load("../assets/models/elephant.glb", function (model) {
	const obj = model.scene;
	obj.rotateY(-Math.PI / 2);
	obj.scale.set(1.6, 1.6, 1.6);
	obj.position.set(10, 0, -8.66);
	obj.userData.enemyName = "Elefante";
	obj.userData.isEnemy = true;
	scene.add(obj);
	enemies.push(obj);
	mixer = new THREE.AnimationMixer(obj);
	const action = mixer.clipAction(model.animations[0]);
	action.play();
});

// --- Player modular ya está integrado arriba ---

// Owl Anim
let mixer2;
animScene.load("../assets/models/day_20_-_snowy_owl.glb", function (model) {
	const obj = model.scene;
	obj.scale.set(1.5, 1.5, 1.5);
	obj.position.set(-5, 2, -8.66);
	scene.add(obj);
	mixer2 = new THREE.AnimationMixer(obj);
	const action2 = mixer2.clipAction(model.animations[0]);
	action2.play();
});

// Controles de teclado para el personaje principal
window.addEventListener('keydown', (e) => {
	const key = e.key.toLowerCase();
	if (key === 'w' || key === 'arrowup') playerController.setKey('w', true);
	if (key === 'a' || key === 'arrowleft') playerController.setKey('a', true);
	if (key === 's' || key === 'arrowdown') playerController.setKey('s', true);
	if (key === 'd' || key === 'arrowright') playerController.setKey('d', true);
	if (key === 'e') {
		if (nearbyEnemy && !inBattle) {
			startBattle(nearbyEnemy);
		}
	}
});
window.addEventListener('keyup', (e) => {
	const key = e.key.toLowerCase();
	if (key === 'w' || key === 'arrowup') playerController.setKey('w', false);
	if (key === 'a' || key === 'arrowleft') playerController.setKey('a', false);
	if (key === 's' || key === 'arrowdown') playerController.setKey('s', false);
	if (key === 'd' || key === 'arrowright') playerController.setKey('d', false);
});

function updatePlayerMovement() {
	if (!playerController || inBattle) return;
	playerController.updateMovement();
	pushPlayerOutOfCollisions();
}

function checkSceneryCollision() {
	if (!player || boundaryObjects.length === 0) return false;
	const playerBox = new THREE.Box3().setFromObject(player);
	for (let i = 0; i < boundaryObjects.length; i++) {
		const obj = boundaryObjects[i];
		if (obj.userData.isInternalCollision || obj.userData.isBoundary) {
			const objBox = new THREE.Box3().setFromObject(obj);
			if (playerBox.intersectsBox(objBox)) return true;
		}
	}
	return false;
}
function checkSceneryCollisionAtPosition(position) {
	if (!player || boundaryObjects.length === 0) return false;
	const originalPosition = player.position.clone();
	player.position.copy(position);
	const playerBox = new THREE.Box3().setFromObject(player);
	let hasCollision = false;
	for (let i = 0; i < boundaryObjects.length; i++) {
		const obj = boundaryObjects[i];
		if (obj.userData.isInternalCollision || obj.userData.isBoundary) {
			const objBox = new THREE.Box3().setFromObject(obj);
			if (playerBox.intersectsBox(objBox)) { hasCollision = true; break; }
		}
	}
	player.position.copy(originalPosition);
	return hasCollision;
}
function checkSceneryCollisionWithInfo(position) {
	if (!player || boundaryObjects.length === 0) return { hasCollision: false, normal: new THREE.Vector3(0, 0, 0) };
	const originalPosition = player.position.clone();
	player.position.copy(position);
	const playerBox = new THREE.Box3().setFromObject(player);
	const testPlayerCenter = new THREE.Vector3();
	playerBox.getCenter(testPlayerCenter);
	let collisionObj = null;
	let minDistance = Infinity;
	for (let i = 0; i < boundaryObjects.length; i++) {
		const obj = boundaryObjects[i];
		if (obj.userData.isInternalCollision || obj.userData.isBoundary) {
			const objBox = new THREE.Box3().setFromObject(obj);
			if (playerBox.intersectsBox(objBox)) {
				const objCenter = new THREE.Vector3();
				objBox.getCenter(objCenter);
				const distance = testPlayerCenter.distanceTo(objCenter);
				if (distance < minDistance) {
					minDistance = distance;
					collisionObj = { obj: obj, box: objBox, center: objCenter };
				}
			}
		}
	}
	player.position.copy(originalPosition);
	if (collisionObj) {
		const normal = new THREE.Vector3().subVectors(testPlayerCenter, collisionObj.center);
		normal.y = 0;
		if (normal.length() > 0.001) {
			normal.normalize();
		} else {
			normal.set(-velocity.x, 0, -velocity.z);
			if (normal.length() > 0.001) normal.normalize();
			else normal.set(1, 0, 0);
		}
		return { hasCollision: true, normal: normal };
	}
	return { hasCollision: false, normal: new THREE.Vector3(0, 0, 0) };
}
function calculateSlideVelocity(velocity, normal) {
	const dot = velocity.x * normal.x + velocity.z * normal.z;
	const slideX = velocity.x - dot * normal.x;
	const slideZ = velocity.z - dot * normal.z;
	const friction = 0.7;
	return new THREE.Vector3(slideX * friction, 0, slideZ * friction);
}
function pushPlayerOutOfCollisions() {
	if (!player || boundaryObjects.length === 0) return;
	const playerBox = new THREE.Box3().setFromObject(player);
	const pushDistance = 0.1;
	const maxIterations = 10;
	const originalY = player.position.y;
	for (let iteration = 0; iteration < maxIterations; iteration++) {
		let collisionFound = false;
		let pushDirectionX = 0;
		let pushDirectionZ = 0;
		for (let i = 0; i < boundaryObjects.length; i++) {
			const obj = boundaryObjects[i];
			if (obj.userData.isInternalCollision) {
				const objBox = new THREE.Box3().setFromObject(obj);
				if (playerBox.intersectsBox(objBox)) {
					collisionFound = true;
					const objCenter = new THREE.Vector3();
					objBox.getCenter(objCenter);
					const playerCenter = new THREE.Vector3();
					playerBox.getCenter(playerCenter);
					const dx = playerCenter.x - objCenter.x;
					const dz = playerCenter.z - objCenter.z;
					const distance2D = Math.sqrt(dx * dx + dz * dz);
					if (distance2D > 0.001) {
						pushDirectionX += dx / distance2D;
						pushDirectionZ += dz / distance2D;
					} else {
						pushDirectionX += (Math.random() - 0.5) * 0.1;
						pushDirectionZ += (Math.random() - 0.5) * 0.1;
					}
				}
			}
		}
		if (!collisionFound) break;
		const pushLength = Math.sqrt(pushDirectionX * pushDirectionX + pushDirectionZ * pushDirectionZ);
		if (pushLength > 0.001) {
			pushDirectionX = (pushDirectionX / pushLength) * pushDistance;
			pushDirectionZ = (pushDirectionZ / pushLength) * pushDistance;
			player.position.x += pushDirectionX;
			player.position.z += pushDirectionZ;
			player.position.y = originalY;
		} else {
			break;
		}
	}
	player.position.y = originalY;
}

function checkNearbyEnemies() {
	if (!player || inBattle) return;
	nearbyEnemy = null;
	let closestDistance = interactionDistance;
	enemies.forEach(enemy => {
		const distance = player.position.distanceTo(enemy.position);
		if (distance < closestDistance) {
			nearbyEnemy = enemy;
			closestDistance = distance;
		}
	});
	const prompt = document.getElementById('interactPrompt');
	if (nearbyEnemy) {
		prompt.style.display = 'block';
	} else {
		prompt.style.display = 'none';
	}
}

function updateAggressiveEnemies() {
	if (!player || inBattle) return;
	enemies.forEach(enemy => {
		if (!enemy.userData.isAggressive) return;
		const distance = player.position.distanceTo(enemy.position);
		const detectionRange = enemy.userData.detectionRange || 8;
		const chaseSpeed = enemy.userData.chaseSpeed || 0.08;
		const attackRange = interactionDistance;
		if (distance <= detectionRange && distance > attackRange) {
			enemy.userData.isChasing = true;
			const direction = new THREE.Vector3().subVectors(player.position, enemy.position).normalize();
			const newPosition = enemy.position.clone();
			newPosition.x += direction.x * chaseSpeed;
			newPosition.z += direction.z * chaseSpeed;
			if (!checkEnemyCollision(enemy, newPosition)) {
				enemy.position.x += direction.x * chaseSpeed;
				enemy.position.z += direction.z * chaseSpeed;
			}
			const targetRotation = Math.atan2(direction.x, direction.z);
			enemy.rotation.y = targetRotation;
		} else if (distance <= attackRange) {
			if (!inBattle) {
				startBattle(enemy);
			}
			enemy.userData.isChasing = false;
		} else {
			enemy.userData.isChasing = false;
		}
	});
}

function checkEnemyCollision(enemy, newPosition) {
	if (!enemy || boundaryObjects.length === 0) return false;
	const originalPosition = enemy.position.clone();
	enemy.position.copy(newPosition);
	const enemyBox = new THREE.Box3().setFromObject(enemy);
	let hasCollision = false;
	for (let i = 0; i < boundaryObjects.length; i++) {
		const obj = boundaryObjects[i];
		if (obj.userData.isInternalCollision) {
			const objBox = new THREE.Box3().setFromObject(obj);
			if (enemyBox.intersectsBox(objBox)) { hasCollision = true; break; }
		}
	}
	enemy.position.copy(originalPosition);
	return hasCollision;
}

function updateCamera() {
	if (!player) return;
	camera.position.x = player.position.x;
	camera.position.y = player.position.y + 8;
	camera.position.z = player.position.z - 10;
	camera.lookAt(player.position);
}

const clock = new THREE.Clock();
function animate() {
	requestAnimationFrame(animate);
	const delta = clock.getDelta();
	if (!isGamePaused) {
		if (mixer) mixer.update(delta);
		if (playerController) playerController.updateMixer(delta);
		if (mixer2) mixer2.update(delta);
		updatePlayerMovement();
		updateAggressiveEnemies();
		checkNearbyEnemies();
		updateCamera();
	}
	renderer.render(scene, camera);
}
animate();


// --- BOTÓN DE PAUSA ---
if (!document.getElementById('pause')) {
	const pauseBtn = document.createElement('button');
	pauseBtn.id = 'pause';
	pauseBtn.textContent = 'PAUSA';
	pauseBtn.onclick = () => { window.location.href = 'pause.html'; };
	document.body.appendChild(pauseBtn);
}

// --- UI DE BATALLA (si no existe) ---
if (!document.getElementById('battleUI')) {
	const battleUI = document.createElement('div');
	battleUI.id = 'battleUI';
	battleUI.style.display = 'none';
	battleUI.style.position = 'absolute';
	battleUI.style.bottom = '20px';
	battleUI.style.left = '50%';
	battleUI.style.transform = 'translateX(-50%)';
	battleUI.style.background = 'rgba(0,0,0,0.8)';
	battleUI.style.padding = '20px';
	battleUI.style.borderRadius = '10px';
	battleUI.style.color = 'white';
	battleUI.style.width = '600px';
	battleUI.innerHTML = `
		<div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
			<div style="flex: 1; margin-right: 10px;">
				<h3 id="playerName" style="margin: 0 0 5px 0;">Unicornio</h3>
				<div style="background: #333; height: 20px; border-radius: 5px; overflow: hidden;">
					<div id="playerHP" style="background: #4CAF50; height: 100%; width: 100%; transition: width 0.3s;"></div>
				</div>
				<p id="playerHPText" style="margin: 5px 0 0 0; font-size: 14px;">HP: 100/100</p>
			</div>
			<div style="flex: 1; margin-left: 10px;">
				<h3 id="enemyName" style="margin: 0 0 5px 0;">Enemigo</h3>
				<div style="background: #333; height: 20px; border-radius: 5px; overflow: hidden;">
					<div id="enemyHP" style="background: #f44336; height: 100%; width: 100%; transition: width 0.3s;"></div>
				</div>
				<p id="enemyHPText" style="margin: 5px 0 0 0; font-size: 14px;">HP: 100/100</p>
			</div>
		</div>
		<div id="battleMessage" style="background: #222; padding: 10px; border-radius: 5px; margin-bottom: 15px; min-height: 40px;">
			<p style="margin: 0;">Presiona ATACAR para comenzar el combate</p>
		</div>
		<div id="battleActions" style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
			<button id="attackBtn" style="padding: 15px; font-size: 16px; cursor: pointer; background: #2196F3; color: white; border: none; border-radius: 5px;">ATACAR</button>
			<button id="specialBtn" style="padding: 15px; font-size: 16px; cursor: pointer; background: #FF9800; color: white; border: none; border-radius: 5px;">ATAQUE ESPECIAL</button>
			<button id="defendBtn" style="padding: 15px; font-size: 16px; cursor: pointer; background: #4CAF50; color: white; border: none; border-radius: 5px;">DEFENDER</button>
			<button id="runBtn" style="padding: 15px; font-size: 16px; cursor: pointer; background: #f44336; color: white; border: none; border-radius: 5px;">HUIR</button>
		</div>
	`;
	document.body.appendChild(battleUI);
}

// --- LÓGICA DE BATALLA Y ATAQUE ---
function updateBattleUI() {
	const playerHPPercent = (playerStats.hp / playerStats.maxHp) * 100;
	const enemyHPPercent = (enemyStats.hp / enemyStats.maxHp) * 100;
	document.getElementById('playerHP').style.width = playerHPPercent + '%';
	document.getElementById('enemyHP').style.width = enemyHPPercent + '%';
	document.getElementById('playerHPText').textContent = `HP: ${Math.max(0, playerStats.hp)}/${playerStats.maxHp}`;
	document.getElementById('enemyHPText').textContent = `HP: ${Math.max(0, enemyStats.hp)}/${enemyStats.maxHp}`;
}
function showMessage(message) {
	document.getElementById('battleMessage').innerHTML = `<p style="margin: 0;">${message}</p>`;
}
function playerAttack() {
	if (!isPlayerTurn) return;
	playAttackSound();
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
	playAttackSound();
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
	showMessage(`${playerStats.name} se preparó para defenderse...`);
	playerStats.defense += 5;
	isPlayerTurn = false;
	setTimeout(() => {
		enemyAttack();
		playerStats.defense -= 5;
	}, 1500);
}
function enemyAttack() {
	playAttackSound();
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
async function persistLevelThreeScore() {
	if (level3ScoreSaved) return;
	try {
		await awardScoreForLevel(3);
		level3ScoreSaved = true;
		console.log('[scores] nivel 3 guardado');
	} catch (error) {
		level3ScoreSaved = false;
		console.error('[scores] no se pudo guardar nivel 3', error);
	}
}

function endBattle(won) {
	setTimeout(() => {
		if (won) {
			alert(`¡Ganaste! Has derrotado a ${enemyStats.name}`);
			persistLevelThreeScore();
			if (currentBattleEnemy) {
				scene.remove(currentBattleEnemy);
				const index = enemies.indexOf(currentBattleEnemy);
				if (index > -1) {
					enemies.splice(index, 1);
				}
				if (nearbyEnemy === currentBattleEnemy) {
					nearbyEnemy = null;
					document.getElementById('interactPrompt').style.display = 'none';
				}
			}
		} else {
			alert(`Has perdido el combate...`);
		}
		document.getElementById('battleUI').style.display = 'none';
		inBattle = false;
		currentBattleEnemy = null;
		// Detiene el audio de combate si existe
		if (window.battleAudio && typeof window.battleAudio.pause === 'function') {
			try {
				window.battleAudio.pause();
				window.battleAudio.currentTime = 0;
			} catch (e) {}
		}
		// Reanuda la música de fondo si existe
		if (window.persistentMusic && window.persistentMusic.audio) {
			try { window.persistentMusic.audio.play(); } catch (e) {}
		}
	}, 1500);
}
document.getElementById('attackBtn').addEventListener('click', playerAttack);
document.getElementById('specialBtn').addEventListener('click', playerSpecialAttack);
document.getElementById('defendBtn').addEventListener('click', playerDefend);
document.getElementById('runBtn').addEventListener('click', runFromBattle);

// --- AUDIO DE ATAQUE ---
function playAttackSound() {
	const attackAudio = new Audio('../assets/Sonido/ATTACK.mp3');
	attackAudio.volume = 1.0;
	attackAudio.play();
}
