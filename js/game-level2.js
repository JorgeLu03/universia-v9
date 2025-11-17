import * as THREE from "../scene/three.module.js";
import { OrbitControls } from "../scene/OrbitControls.js";
import { STLLoader } from "../scene/STLLoader.js";
import { GLTFLoader } from "../scene/GLTFLoader.js";
import { Player } from "./player.js";
import { setupBattleSystem } from "./battle.js";
import { awardScoreForLevel } from "./score-service.js";

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
// const playerRadius = 0.5; // (declarado arriba para Player)

let player = null;
let playerController = null;
let velocity = new THREE.Vector3(); // Necesario para combate y movimiento

// Variables de combate
let inBattle = false;
let nearbyEnemy = null;
let currentBattleEnemy = null; // Enemigo actual en batalla
const enemies = [];
const interactionDistance = 3;

// Variables de colisiones
let scenarioModel = null;
const boundaryObjects = [];
const collisionHelpers = [];
const playerRadius = 0.5;
const enableCollisionDebug = true;

const scenarioScale = 3;
const scenarioPosition = new THREE.Vector3(0, 0, 0);

// Ejemplo de límites más grandes para el nivel 2
const scenarioBounds = {
	minX: -10.5,
	maxX: 10.5,
	minZ: -14,
	maxZ: 17,
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
let level2ScoreSaved = false;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(contenedor.clientWidth, contenedor.clientHeight);
contenedor.appendChild(renderer.domElement);

const hemisphereLight = new THREE.HemisphereLight(0xffffbb, 0x080820, 1);
scene.add(hemisphereLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(1, 5, -1);
scene.add(directionalLight);

// Escenario (Scenario2)
const loaderGLB = new GLTFLoader();
loaderGLB.load("../assets/models/Scenario2.glb", function (model) {
	scenarioModel = model.scene;
	const originalScenarioBox = new THREE.Box3().setFromObject(scenarioModel);
	const originalScenarioSize = new THREE.Vector3();
	originalScenarioBox.getSize(originalScenarioSize);
	scenarioModel.scale.set(scenarioScale, scenarioScale, scenarioScale);
	scenarioModel.position.copy(scenarioPosition);
	scene.add(scenarioModel);
	const scenarioBox = new THREE.Box3().setFromObject(scenarioModel);
	const scenarioSize = new THREE.Vector3();
	scenarioBox.getSize(scenarioSize);
	const scenarioCenter = new THREE.Vector3();
	scenarioBox.getCenter(scenarioCenter);
	window.scenarioInfo = {
		originalSize: originalScenarioSize.clone(),
		scale: scenarioScale,
		position: scenarioPosition.clone(),
		size: scenarioSize.clone(),
		center: scenarioCenter.clone()
	};
	// Mostrar la caja de colisión de los bordes solo para debug visual
	// DEBUG: Caja de colisión sencilla y ajustable
	// Debug visual: dibujar líneas en los bordes del mapa según scenarioBounds
	if (enableCollisionDebug) {
		const wallMaterial = new THREE.LineBasicMaterial({ color: 0x0074D9, linewidth: 2 });
		const points = [];
		// Esquinas del rectángulo
		points.push(new THREE.Vector3(scenarioBounds.minX, 0, scenarioBounds.minZ));
		points.push(new THREE.Vector3(scenarioBounds.maxX, 0, scenarioBounds.minZ));
		points.push(new THREE.Vector3(scenarioBounds.maxX, 0, scenarioBounds.maxZ));
		points.push(new THREE.Vector3(scenarioBounds.minX, 0, scenarioBounds.maxZ));
		points.push(new THREE.Vector3(scenarioBounds.minX, 0, scenarioBounds.minZ)); // cerrar
		const geometry = new THREE.BufferGeometry().setFromPoints(points);
		const line = new THREE.Line(geometry, wallMaterial);
		scene.add(line);
		// Líneas verticales en las esquinas
		for (let i = 0; i < 4; i++) {
			const vertPoints = [
				new THREE.Vector3(points[i].x, 0, points[i].z),
				new THREE.Vector3(points[i].x, 5, points[i].z)
			];
			const vertGeometry = new THREE.BufferGeometry().setFromPoints(vertPoints);
			const vertLine = new THREE.Line(vertGeometry, wallMaterial);
			scene.add(vertLine);
		}
		console.log('DEBUG: Límites visuales del mapa dibujados con scenarioBounds:', scenarioBounds);
	}
});

// Cargar modelo de colisiones internas (Scenario2Colissions)
loaderGLB.load("../assets/models/Scenario2Colissions.glb", function (model) {
	const collisionModel = model.scene;
	const originalCollisionBox = new THREE.Box3().setFromObject(collisionModel);
	const originalCollisionSize = new THREE.Vector3();
	originalCollisionBox.getSize(originalCollisionSize);
	let calculatedScale = scenarioScale;
	if (window.scenarioInfo && originalCollisionSize.x > 0 && originalCollisionSize.z > 0) {
		const scaleX = (window.scenarioInfo.originalSize.x / originalCollisionSize.x) * scenarioScale;
		const scaleY = (window.scenarioInfo.originalSize.y / originalCollisionSize.y) * scenarioScale;
		const scaleZ = (window.scenarioInfo.originalSize.z / originalCollisionSize.z) * scenarioScale;
		calculatedScale = (scaleX + scaleY + scaleZ) / 3;
	}
	collisionModel.scale.set(calculatedScale, calculatedScale, calculatedScale);
	collisionModel.position.copy(scenarioPosition);
	const finalCollisionBox = new THREE.Box3().setFromObject(collisionModel);
	const finalCollisionSize = new THREE.Vector3();
	finalCollisionBox.getSize(finalCollisionSize);
	let collisionCount = 0;
	const minCollisionSize = 0.1;
	collisionModel.traverse((child) => {
		if (child.isMesh && child.geometry) {
			const box = new THREE.Box3().setFromObject(child);
			const size = new THREE.Vector3();
			box.getSize(size);
			const center = new THREE.Vector3();
			box.getCenter(center);
			const distanceFromCenter = Math.sqrt(center.x * center.x + center.y * center.y + center.z * center.z);
			const isAtCenter = distanceFromCenter < 0.5;
			if (size.x > minCollisionSize && size.y > minCollisionSize && size.z > minCollisionSize) {
				if (!isAtCenter || (size.x > 1 || size.y > 1 || size.z > 1)) {
					child.visible = false;
					child.userData.isScenery = true;
					child.userData.isInternalCollision = true;
					boundaryObjects.push(child);
					collisionCount++;
					if (enableCollisionDebug) {
						const boxGeometry = new THREE.BoxGeometry(size.x, size.y, size.z);
						const boxMaterial = new THREE.MeshBasicMaterial({ 
							color: 0xff0000,
							wireframe: true,
							transparent: true,
							opacity: 0.8
						});
						const boxHelper = new THREE.Mesh(boxGeometry, boxMaterial);
						boxHelper.position.copy(center);
						boxHelper.rotation.copy(child.rotation);
						scene.add(boxHelper);
						collisionHelpers.push(boxHelper);
					}
				}
			}
		}
	});
	scene.add(collisionModel);
});


// Abeja - Enemigo
loaderGLB.load("../assets/models/bee_cartoon.glb", function (model) {
	const obj = model.scene;
	obj.scale.set(0.5, 0.5, 0.5);
	obj.position.set(6, 2, 0);
	obj.userData.enemyName = "Abeja";
	obj.userData.isEnemy = true;
	scene.add(obj);
	enemies.push(obj);
});

// Oso - Enemigo (persigue al jugador)
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

// Tucan - Enemigo
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

// Elephant Anim - Enemigo
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



// --- Crear e inicializar el personaje principal usando Player.js ---
playerController = new Player(scene, scenarioBounds, playerRadius, acceleration, maxSpeed, deceleration, rotationSpeed);
playerController.loadPlayerModel(() => {
    player = playerController.getObject();
});

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

// Inicializar sistema de combate modular
const battle = setupBattleSystem({
    getPlayerStats: () => playerStats,
    getEnemyStats: () => enemyStats,
    getCurrentBattleEnemy: () => currentBattleEnemy,
    setCurrentBattleEnemy: (e) => { currentBattleEnemy = e; },
    getScene: () => scene,
    getEnemies: () => enemies,
    setInBattle: (v) => { inBattle = v; },
    getInBattle: () => inBattle,
    getNearbyEnemy: () => nearbyEnemy,
    setNearbyEnemy: (v) => { nearbyEnemy = v; },
    getVelocity: () => velocity,
    playBattleMusic: typeof playBattleMusic !== 'undefined' ? playBattleMusic : undefined,
    stopBattleMusic: typeof stopBattleMusic !== 'undefined' ? stopBattleMusic : undefined,
    playAttackSound: typeof playAttackSound !== 'undefined' ? playAttackSound : undefined
});

// Controles de teclado para el personaje principal
window.addEventListener('keydown', (e) => {
	const key = e.key.toLowerCase();
	if (key === 'w' || key === 'arrowup') playerController.setKey('w', true);
	if (key === 'a' || key === 'arrowleft') playerController.setKey('a', true);
	if (key === 's' || key === 'arrowdown') playerController.setKey('s', true);
	if (key === 'd' || key === 'arrowright') playerController.setKey('d', true);
	if (key === 'e') {
		// Interacción/batalla
		if (nearbyEnemy && !inBattle) {
			battle.startBattle(nearbyEnemy);
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


// Lógica de movimiento del personaje principal
function updatePlayerMovement() {
    if (!playerController || inBattle) return;
    playerController.updateMovement();
    pushPlayerOutOfCollisions();
}

// Todas las funciones de colisión, combate, cámara, animación y helpers
// ...existing code from game.html copiado literalmente...

// Función para detectar colisiones con objetos del escenario
function checkSceneryCollision() {
	if (!player || boundaryObjects.length === 0) return false;
	const playerBox = new THREE.Box3().setFromObject(player);
	for (let i = 0; i < boundaryObjects.length; i++) {
		const obj = boundaryObjects[i];
		// Revisar colisiones internas y de borde
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

// Detectar enemigos cercanos
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

// Actualizar movimiento de enemigos agresivos (como el oso)
function updateAggressiveEnemies() {
		if (!player || inBattle) return;
		enemies.forEach(enemy => {
			if (!enemy.userData.isAggressive) return;
			const distance = player.position.distanceTo(enemy.position);
			console.log(`[DEBUG][N2] Distancia jugador-oso: ${distance}`);
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
					console.log('[DEBUG][N2] ¡Distancia de combate alcanzada! Llamando a startBattle');
					battle.startBattle(enemy);
				}
				enemy.userData.isChasing = false;
			} else {
				enemy.userData.isChasing = false;
			}
		});
}

// Verificar colisiones para enemigos
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

// Actualizar posición de cámara en tercera persona
function updateCamera() {
	if (!player) return;
	camera.position.x = player.position.x;
	camera.position.y = player.position.y + 8;
	camera.position.z = player.position.z - 10;
	camera.lookAt(player.position);
}

// Loop de animación unificado
const clock = new THREE.Clock();
function animate() {
	requestAnimationFrame(animate);
	const delta = clock.getDelta();
	if (mixer) mixer.update(delta);
	if (playerController) playerController.updateMixer(delta);
	if (mixer2) mixer2.update(delta);
	updatePlayerMovement();
	updateAggressiveEnemies();
	checkNearbyEnemies();
	updateCamera();
	renderer.render(scene, camera);
}
animate();

// Sistema de combate (copiado igual que en game.html)
// ...existing code for battle system, event listeners, etc. copiado literalmente...

// (startBattle ahora es provisto por battle.js)
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
async function persistLevelTwoScore() {
	if (level2ScoreSaved) return;
	try {
		await awardScoreForLevel(2);
		level2ScoreSaved = true;
		console.log('[scores] nivel 2 guardado');
	} catch (error) {
		level2ScoreSaved = false;
		console.error('[scores] no se pudo guardar nivel 2', error);
	}
}

function endBattle(won) {
	setTimeout(() => {
		stopBattleMusic();
		if (won) {
			alert(`¡Ganaste! Has derrotado a ${enemyStats.name}`);
			persistLevelTwoScore();
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

// --- AUDIO DE BATALLA ---
let battleMusic = null;
function playBattleMusic() {
	if (window.persistentMusic && window.persistentMusic.audio) {
		window.persistentMusic.audio.pause();
	}
	if (battleMusic) {
		battleMusic.pause();
		battleMusic.currentTime = 0;
	}
	battleMusic = new Audio('../assets/Sonido/PELEA.mp3');
	battleMusic.loop = true;
	battleMusic.volume = 1.0;
	battleMusic.play();
}
function stopBattleMusic() {
	if (battleMusic) {
		battleMusic.pause();
		battleMusic.currentTime = 0;
		battleMusic = null;
	}
	if (window.persistentMusic && window.persistentMusic.audio) {
		window.persistentMusic.audio.play();
	}
}

// ...existing code for all game logic (movement, collision, battle, camera, animation loop, etc.) from game.html, adapted for level 2...

// NOTA: Si necesitas que copie literalmente cada función y bloque, avísame para pegar el código completo aquí.
