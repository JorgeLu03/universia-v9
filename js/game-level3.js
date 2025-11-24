import { auth } from '../js/firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";


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
	HTMLPictureElement.style.display = "none";
	updateBattleUI();
	showMessage('Presiona ATACAR para comenzar el combate');
	// Reproduce el sonido de PELEA
	try {
		if (window.battleAudio && typeof window.battleAudio.pause === 'function') {
			window.battleAudio.pause();
			window.battleAudio.currentTime = 0;
		}
		window.battleAudio = new Audio('./assets/Sonido/PELEA.mp3');
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

let currentUser = null;

const dificultad = localStorage.getItem("dificultad") || "normal";
const contenedor = document.getElementById("escena3D");

const EnergyUI = document.getElementById("EnergyUI");
const HPUI = document.getElementById("HPUI");
const scene = new THREE.Scene();
scene.background = new THREE.Color("#34495E");

const camera = new THREE.PerspectiveCamera(
	45,
	contenedor.clientWidth / contenedor.clientHeight
);
camera.position.set(0, 30, -50);

// --- Player system ---
const maxSpeed = 0.05;
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

// Variables de Partículas (Explosión)
let particlesPool = [];
const maxParticles = 500;
let particleGeometry;
let particleMaterial;
let particlesSystem;
const explosionDuration = 1.0; 

// Inicializa la geometría y el material de las partículas
function initializeParticles() {
  particleGeometry = new THREE.BufferGeometry();
  const positions = new Float32Array(maxParticles * 3);
  const colors = new Float32Array(maxParticles * 3);
  
  for (let i = 0; i < maxParticles * 3; i++) {
	positions[i] = 0;
  }
  
  particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
  particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3).setUsage(THREE.DynamicDrawUsage));
  
  particleMaterial = new THREE.PointsMaterial({
	size: 0.2,
	sizeAttenuation: true,
	transparent: true,
	opacity: 1.0,
	vertexColors: true
  });
  
  particlesSystem = new THREE.Points(particleGeometry, particleMaterial);
  particlesSystem.visible = false;
  scene.add(particlesSystem);
  
  for (let i = 0; i < maxParticles; i++) {
	particlesPool.push({
	  active: false,
	  velocity: new THREE.Vector3(),
	  lifetime: 0,
	  maxLifetime: 0,
	  originalColor: new THREE.Color()
	});
  }
  console.log('[level2] Sistema de partículas inicializado');
}
initializeParticles();


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
	defense: 10,
    energy: 100,
    maxEnergy: 100
};

onAuthStateChanged(auth, (user) => {
    currentUser = user;
    playerStats.name = currentUser.displayName;
});

let enemyStats = {
    name: "Enemigo",
    hp: 100,
    maxHp: 100,
    attack: 15,
    defense: 8
};
if(dificultad === "dificil"){
      enemyStats.attack = 22;
	  enemyStats.defense = 10;
}

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
loaderGLB.load("./assets/models/scenario3.glb", function (model) {
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
loaderGLB.load("./assets/models/bee_cartoon.glb", function (model) {
	const obj = model.scene;
	obj.scale.set(0.5, 0.5, 0.5);
	obj.rotateY(-Math.PI / 2);
	obj.position.set(9, 1.8, 15);
	obj.userData.enemyName = "Abeja";
	obj.userData.isEnemy = true;
	scene.add(obj);
	enemies.push(obj);
});
loaderGLB.load("./assets/models/ice_bear_we_bare_bears.glb", function (model) {
	const obj = model.scene;
	obj.scale.set(0.4, 0.4, 0.4);
	obj.position.set(0, 1.5, -10);
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
loaderGLB.load("./assets/models/low_poly_toucan.glb", function (model) {
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
animScene.load("./assets/models/elephant.glb", function (model) {
	const obj = model.scene;
	obj.rotateY(Math.PI / 2);
	obj.scale.set(1.6, 1.6, 1.6);
	obj.position.set(-6, 0, 18);
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
animScene.load("./assets/models/day_20_-_snowy_owl.glb", function (model) {
	const obj = model.scene;
	obj.rotateY(-1.5);
	obj.scale.set(1.5, 1.5, 1.5);
	obj.position.set(10, 2, 5);
	obj.userData.enemyName = "Buho";
    obj.userData.isEnemy = true;
	scene.add(obj);
	enemies.push(obj);

	mixer2 = new THREE.AnimationMixer(obj);
	const action2 = mixer2.clipAction(model.animations[0]);
	action2.play();
});


/* OBJETOS ESPECIALES */

function aplicarBrilloModelos(model) {
	  model.traverse((child) => {
			if (child.isMesh) {
				child.material.emissive = new THREE.Color("rgb(70%, 30%, 30%)");  // tono cálido
				child.material.emissiveIntensity = 0.2;               // brillo (0–1)
			}
	  });
}

const coffeeCount = Math.floor(Math.random() * 3) + 1;
const coffees = [];

for (let i = 0; i < coffeeCount; i++) {
	  loaderGLB.load("assets/models/coffee_cup.glb", function (model) {
		const obj = model.scene;
		aplicarBrilloModelos(obj);
		obj.scale.set(0.15, 0.15, 0.15);

		const randomX = Math.random() * 24 - 12;
		const randomZ = Math.random() * 32 - 16;
		const randomY = 0.8;

		obj.position.set(randomX, randomY, randomZ);
		obj.userData.type = "coffee";
		obj.userData.baseY = obj.position.y;
		obj.userData.floatOffset = Math.random() * Math.PI * 2;

		coffees.push(obj);
		scene.add(obj);
	  });
}

const tabletCount = Math.floor(Math.random() * 2) + 1; // 1–2 tabletas
const tablets = [];

for (let i = 0; i < tabletCount; i++) {
	loaderGLB.load("assets/models/tablet_folder.glb", function (model) {
		const obj = model.scene;
		aplicarBrilloModelos(obj);

		obj.scale.set(0.03, 0.03, 0.03);

		const randomX = Math.random() * 20 - 10;
		const randomZ = Math.random() * 20 - 10;
		const randomY = 0.8;

		obj.position.set(randomX, randomY, randomZ);
		obj.userData.type = "tablet";
		obj.userData.baseY = obj.position.y;
		obj.userData.floatOffset = Math.random() * Math.PI * 2;

		tablets.push(obj);
		scene.add(obj);
	});
}

const sandwiches = [];
const sandwichCount = Math.floor(Math.random() * 3) + 1;

for (let i = 0; i < sandwichCount; i++) {
    loaderGLB.load("assets/models/sandwich.glb", function (model) {
        const obj = model.scene;

        aplicarBrilloModelos(obj);
        obj.scale.set(0.4, 0.4, 0.4);

        const randomX = Math.random() * 24 - 12;
        const randomZ = Math.random() * 32 - 16;
        const randomY = 0.8;

        obj.position.set(randomX, randomY, randomZ);
        obj.userData.type = "sandwich";
        obj.userData.baseY = obj.position.y;
        obj.userData.floatOffset = Math.random() * Math.PI * 2;

        sandwiches.push(obj);
        scene.add(obj);
    });
}

const objectPrompt = document.getElementById("objectPrompt");

function checkNearbyObjects() {
    if (!player || inBattle) return null;

    let closestObject = null;
    let closestDist = 2;

    // Buscar cafés
    coffees.forEach(obj => {
        const dist = player.position.distanceTo(obj.position);
        if (dist < closestDist) {
            closestObject = obj;
            closestDist = dist;
        }
    });

    // Buscar tabletas
    tablets.forEach(obj => {
        const dist = player.position.distanceTo(obj.position);
        if (dist < closestDist) {
            closestObject = obj;
            closestDist = dist;
        }
    });

    // Buscar sandwiches
    sandwiches.forEach(obj => {
        const dist = player.position.distanceTo(obj.position);
        if (dist < closestDist) {
            closestObject = obj;
            closestDist = dist;
        }
    });

    objectPrompt.style.display = closestObject ? "block" : "none";

    return closestObject;
}

document.addEventListener('keydown', (e) => {
	  if (e.code === 'Space') {
		const obj = checkNearbyObjects();
        if (!obj) return;

        if (obj.userData.type === "coffee") {
            playerStats.energy = Math.min(playerStats.maxEnergy, playerStats.energy + 15);
            coffees.splice(coffees.indexOf(obj), 1);
        }

        if (obj.userData.type === "tablet") {
            playerStats.energy = Math.max(0, playerStats.energy - 20);
            tablets.splice(tablets.indexOf(obj), 1);
        }

		if (obj.userData.type === "sandwich") {
            playerStats.hp = Math.min(playerStats.maxHp, playerStats.hp + 20);
            sandwiches.splice(sandwiches.indexOf(obj), 1);
        }

        // Quitar de la escena
        scene.remove(obj);

		updateHPUI();
        updateEnergyUI();
	  }
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
			EnergyUI.style.display = "none";
			HPUI.style.display = "none";
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
	const pushDistance = 0.01;
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

// Función para crear el efecto de explosión (Gris/Blanco)
function createExplosion(position, color, numParticles = 50) {
  particlesSystem.visible = true;
  let activeCount = 0;

  const baseColorHex = 0xD3D3D3; 

  for (let i = 0; i < maxParticles; i++) {
	const particle = particlesPool[i];
	if (!particle.active) {
	  // Posición
	  const pos = particleGeometry.attributes.position.array;
	  pos[i * 3 + 0] = position.x;
	  pos[i * 3 + 1] = position.y + 1.0;
	  pos[i * 3 + 2] = position.z;

	  // Color (Usar color base gris y variar aleatoriamente hacia el blanco)
	  const particleColor = new THREE.Color(baseColorHex);
	  
	  const variance = Math.random() * 0.15;
	  particleColor.r = Math.min(1.0, particleColor.r + variance);
	  particleColor.g = Math.min(1.0, particleColor.g + variance);
	  particleColor.b = Math.min(1.0, particleColor.b + variance);
	  
	  const colors = particleGeometry.attributes.color.array;
	  colors[i * 3 + 0] = particleColor.r;
	  colors[i * 3 + 1] = particleColor.g;
	  colors[i * 3 + 2] = particleColor.b;
	  
	  // Velocidad aleatoria (efecto de estallido)
	  const speed = Math.random() * 5 + 3;
	  particle.velocity.set(
		(Math.random() - 0.5) * speed,
		Math.random() * speed + 2, // Empuje vertical
		(Math.random() - 0.5) * speed
	  );
	  
	  // Inicializar y activar
	  particle.active = true;
	  particle.lifetime = 0;
	  particle.maxLifetime = explosionDuration * (0.5 + Math.random() * 0.5);
	  particle.originalColor.copy(particleColor);
	  activeCount++;
	  if (activeCount >= numParticles) break;
	}
  }

  particleGeometry.attributes.position.needsUpdate = true;
  particleGeometry.attributes.color.needsUpdate = true;
}

// Actualizar partículas cada frame
function updateParticles(delta) {
  if (!particlesSystem || !particlesSystem.visible) return;

  const positions = particleGeometry.attributes.position.array;
  const colors = particleGeometry.attributes.color.array;
  let activeCount = 0;
  
  const gravity = -9.8 * 0.5;
  
  for (let i = 0; i < maxParticles; i++) {
	const particle = particlesPool[i];
	
	if (particle.active) {
	  particle.lifetime += delta;
	  
	  if (particle.lifetime > particle.maxLifetime) {
		// Desactivar y mover fuera de la vista
		particle.active = false;
		positions[i * 3 + 0] = 10000;
		positions[i * 3 + 1] = 10000;
		positions[i * 3 + 2] = 10000;
		colors[i * 3 + 0] = 0;
		colors[i * 3 + 1] = 0;
		colors[i * 3 + 2] = 0;
		continue;
	  }

	  // Aplicar gravedad y velocidad
	  particle.velocity.y += gravity * delta;
	  positions[i * 3 + 0] += particle.velocity.x * delta;
	  positions[i * 3 + 1] += particle.velocity.y * delta;
	  positions[i * 3 + 2] += particle.velocity.z * delta;
	  
	  activeCount++;
	}
  }

  particleGeometry.attributes.position.needsUpdate = true;
  particleGeometry.attributes.color.needsUpdate = true;
  
  // Ocultar si todas las partículas han terminado
  if (activeCount === 0) {
	particlesSystem.visible = false;
  }
}

const clock = new THREE.Clock();
function animate() {
	requestAnimationFrame(animate);
	const delta = clock.getDelta();
	if (!isGamePaused) {
		if (mixer) mixer.update(delta);
		if (playerController) playerController.updateMixer(delta);
		if (mixer2) mixer2.update(delta);
		//Objetos especiales
        scene.traverse(obj => {
            if (obj.userData.type === "coffee" || obj.userData.type === "tablet" || obj.userData.type === "sandwich") {
                obj.rotation.y += 0.003;
                const amplitude = 0.15;    // cuánto sube/baja
                const speed = 1.5;         // qué tan rápido flota
                const elapsed = clock.getElapsedTime();
                obj.position.y = obj.userData.baseY 
                              + Math.sin(elapsed * speed + obj.userData.floatOffset) * amplitude;
            }
        });
		checkNearbyObjects();
		updatePlayerMovement();
		updateAggressiveEnemies();
		checkNearbyEnemies();
		updateCamera();
		updateParticles(delta);
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

// --- LÓGICA DE BATALLA Y ATAQUE ---
function updateBattleUI() {
	const playerHPPercent = (playerStats.hp / playerStats.maxHp) * 100;
	const playerEnergyPercent = (playerStats.energy / playerStats.maxEnergy) * 100;
	const enemyHPPercent = (enemyStats.hp / enemyStats.maxHp) * 100;

	document.getElementById('playerHP').style.width = playerHPPercent + '%';
	document.getElementById('playerEnergy').style.width = playerEnergyPercent + '%';
	document.getElementById('enemyHP').style.width = enemyHPPercent + '%';

	document.getElementById('playerHPText').textContent = `HP: ${Math.max(0, playerStats.hp)}/${playerStats.maxHp}`;
	document.getElementById('playerEnergyText').textContent = `Energia: ${Math.max(0, playerStats.energy)}/${playerStats.maxEnergy}`;
	document.getElementById('enemyHPText').textContent = `HP: ${Math.max(0, enemyStats.hp)}/${enemyStats.maxHp}`;
}
function showMessage(message) {
	document.getElementById('battleMessage').innerHTML = `<p style="margin: 0;">${message}</p>`;
}

function updateEnergyUI(){
    const playerEnergyPercent = (playerStats.energy / playerStats.maxEnergy) * 100;
    document.getElementById('playerEnergyUI').style.width = playerEnergyPercent + '%';
    document.getElementById('playerEnergyTextUI').textContent = `Energia: ${Math.max(0, playerStats.energy)}/${playerStats.maxEnergy}`;
}
function updateHPUI(){
	const playerHPPercent = (playerStats.hp / playerStats.maxHp) * 100;
    document.getElementById('playerHPUI').style.width = playerHPPercent + '%';
    document.getElementById('playerHPTextUI').textContent = `HP: ${Math.max(0, playerStats.hp)}/${playerStats.maxHp}`;
}
function playerAttack() {
	if (!isPlayerTurn) return;
	if(playerStats.energy <=3){
        showMessage('No tienes energia suficiente para atacar!');
        return;
    }
	playAttackSound();
	const damage = Math.max(5, playerStats.attack - enemyStats.defense + Math.floor(Math.random() * 10));
	enemyStats.hp -= damage;
	showMessage(`${playerStats.name} atacó e hizo ${damage} de daño!`);

	const energyCost = 3 + Math.floor(Math.random() * 4);
    playerStats.energy = Math.max(0, playerStats.energy - energyCost);
	
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
	if(playerStats.energy <=8){
        showMessage('No tienes energia suficiente para un ataque especial!');
        return;
      }
	playAttackSound();
	const damage = Math.max(10, playerStats.attack * 1.5 - enemyStats.defense + Math.floor(Math.random() * 15));
	enemyStats.hp -= damage;

	const energyCost = 8 + Math.floor(Math.random() * 8);
    playerStats.energy = Math.max(0, playerStats.energy - energyCost);  
	
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
	
	// Recuperar energía al defenderse
	const energyRecovery = 20;
	playerStats.energy = Math.min(playerStats.maxEnergy, playerStats.energy + energyRecovery);
	
	showMessage(`${playerStats.name} se preparó para defenderse y recuperó ${energyRecovery} de energía...`);
	playerStats.defense += 5;
	
	// Actualizar la interfaz de energía
	updateEnergyUI();
	updateBattleUI();
	
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
// Función helper para convertir dificultad de español a inglés
function getDifficultyForAPI(dificultad) {
	return dificultad === 'dificil' ? 'hard' : 'normal';
}

async function persistLevelThreeScore() {
	if (level3ScoreSaved) return;
	try {
		const difficulty = getDifficultyForAPI(dificultad);
		await awardScoreForLevel(3, difficulty);
		level3ScoreSaved = true;
		console.log(`[scores] nivel 3 guardado en modo ${difficulty}`);
	} catch (error) {
		level3ScoreSaved = false;
		console.error('[scores] no se pudo guardar nivel 3', error);
	}
}

function endBattle(won) {
	setTimeout(() => {
		if (won) {
				createExplosion(currentBattleEnemy.position, '#0xD3D3D3', 100); // Explosión 

				Swal.fire({
				title: "¡Ganaste!",
				text: "Has derrotado a " + enemyStats.name,
				imageUrl: "./assets/images/win-icon.png",
				imageWidth: 100,
				imageHeight: 100,
				confirmButtonText: "¡Genial!"
			});
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
				// Solo otorgar puntos cuando se complete el nivel completo
				if (enemies.length === 0) {
					persistLevelThreeScore();
					console.log('🎉 ¡Nivel 3 completado! Puntos otorgados.');
					Swal.fire({
					title: "¡Nivel completado!",
					text: "Has derrotado a todos los enemigos",
					imageUrl: "./assets/images/level-complete.png",
					imageWidth: 120,
					imageHeight: 120,
					confirmButtonText: "Volver al inicio"
					}).then(() => {
					window.location.href = "main.html";
					});
				}
			}
		} else {
			Swal.fire({
            title: "¡Oh no!",
            text: "No has podido completar este nivel",
            imageUrl: "./assets/images/death.png",
            imageWidth: 100,
            imageHeight: 100,
            confirmButtonText: "Volver al inicio"
          }).then(() => {
				window.location.href = "main.html";
			});
		}
		document.getElementById('battleUI').style.display = 'none';
		EnergyUI.style.display = "block";
		HPUI.style.display = "block";
        updateEnergyUI();
		updateHPUI();
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
	const attackAudio = new Audio('./assets/Sonido/ATTACK.mp3');
	attackAudio.volume = 1.0;
	attackAudio.play();
}
