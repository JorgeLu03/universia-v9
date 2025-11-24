// multiplayer.js
// Sistema de multijugador con Firebase Realtime Database
import * as THREE from "../scene/three.module.js";
import { GLTFLoader } from "../scene/GLTFLoader.js";
import { RGBELoader } from "../assets/Light/RGBELoader.js";
import { setupBattleSystem } from './battle.js';
// OrbitControls removidos - usamos seguimiento directo como en modo local
import { auth, database } from './firebase-config.js';
import { 
    ref, 
    set, 
    get,
    onValue, 
    push, 
    onDisconnect, 
    serverTimestamp,
    off,
    remove
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { MultiplayerPlayer } from './multiplayer-player.js';

class MultiplayerGame {
    constructor() {
        // Variables de la escena
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.clock = new THREE.Clock();
        
        // Variables del juego
        this.currentUser = null;
        this.roomId = null;
        this.players = new Map();
        this.localPlayer = null;
        
        // Referencias de Firebase
        this.roomRef = null;
        this.playersRef = null;
        this.chatRef = null;
        this.battleRequestsRef = null;
        
        // UI Elements
        this.connectionStatus = document.getElementById('connectionStatus');
        this.roomIdElement = document.getElementById('roomId');
        this.playerCountElement = document.getElementById('playerCount');
        this.playersListElement = document.getElementById('playersList');
        this.chatMessages = document.getElementById('chatMessages');
        this.chatInput = document.getElementById('chatInput');
        this.sendChatBtn = document.getElementById('sendChat');
        this.exitBtn = document.getElementById('exitMultiplayer');
        
        // Estado del juego
        this.isInitialized = false;
        this.lastUpdateTime = 0;
        this.updateInterval = 1000 / 30; // 30 FPS para actualizaciones de red
        
        // Variables de batalla
        this.nearbyPlayer = null;
        this.inBattle = false;
        this.interactionDistance = 3;
        
        // Estadísticas de jugadores
        this.playerStats = {
            name: 'Jugador',
            hp: 100,
            maxHp: 100,
            attack: 20,
            defense: 10,
            energy: 100,
            maxEnergy: 100
        };
        
        this.opponentStats = {
            name: 'Oponente',
            hp: 100,
            maxHp: 100,
            attack: 20,
            defense: 10
        };
        
        this.currentBattleOpponent = null;
        this.velocity = new THREE.Vector3();
        
        // Variables para solicitudes de batalla
        this.pendingBattleRequest = null;
        this.battleRequestListener = null;
        
        // Variables para batalla sincronizada
        this.activeBattleId = null;
        this.battleStateListener = null;
        this.isMyTurn = false;
        this.battleState = null;
        
        this.init();
    }

    async init() {
        // Verificar autenticación
        onAuthStateChanged(auth, (user) => {
            if (user) {
                this.currentUser = user;
                this.initializeGame();
            } else {
                // Redirigir al login si no está autenticado
                window.location.href = 'login.html';
            }
        });
    }

    async initializeGame() {
        try {
            // Inicializar escena 3D
            this.initScene();
            
            // Crear o unirse a una sala
            await this.joinOrCreateRoom();
            
        // Configurar controles
        this.setupControls();            // Iniciar loop de renderizado
            this.animate();
            
        // Configurar UI
        this.setupUI();
        
        // Inicializar sistema de batalla
        this.initializeBattleSystem();
        
        // Deshabilitar sistema de batalla local para prevenir conflictos
        window.multiplayerMode = true;            this.updateConnectionStatus('Conectado', true);
            this.isInitialized = true;
            
        } catch (error) {
            console.error('Error inicializando el juego:', error);
            this.updateConnectionStatus('Error de conexión', false);
        }
    }

    initScene() {
        // Escena
        this.scene = new THREE.Scene();
        // El fondo se establecerá con HDRI más adelante
        
        // Cámara - Usar la misma configuración que el modo local
        const contenedor = document.getElementById('escena3D');
        this.camera = new THREE.PerspectiveCamera(
            45,
            contenedor.clientWidth / contenedor.clientHeight,
            0.1,
            1000
        );
        this.camera.position.set(0, 30, -50);
        
        // Renderizador
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.outputEncoding = THREE.sRGBEncoding;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 0.4;
        this.renderer.setSize(contenedor.clientWidth, contenedor.clientHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        document.getElementById('escena3D').appendChild(this.renderer.domElement);
        
        // Sin controles OrbitControls - usaremos seguimiento directo como en el modo local
        
        // Configuración HDRI igual que en modo local
        this.setupHDRILighting();
        
        // Crear el plano del escenario
        this.createArena();
        
        // Redimensionar ventana
        window.addEventListener('resize', () => this.onWindowResize());
    }

    // Función para actualizar la cámara siguiendo al jugador (como en modo local)
    updateCamera() {
        if (!this.localPlayer || !this.localPlayer.getObject()) return;
        
        const player = this.localPlayer.getObject();
        this.camera.position.x = player.position.x;
        this.camera.position.y = player.position.y + 8;
        this.camera.position.z = player.position.z - 10;
        this.camera.lookAt(player.position);
    }

    setupHDRILighting() {
        // Configuración de luces igual que en los niveles locales
        
        // Luz hemisférica
        const hemiLight = new THREE.HemisphereLight(0xFFFFFF, 0x444444, 0.8);
        hemiLight.position.set(0, 300, 0);
        this.scene.add(hemiLight);
        
        // Luz direccional
        const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight.position.set(-1, 0.75, 1);
        dirLight.position.multiplyScalar(50);
        dirLight.name = "dirlight";
        
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 1024;
        dirLight.shadow.mapSize.height = 1024;
        
        const d = 300;
        dirLight.shadow.camera.left = -d;
        dirLight.shadow.camera.right = d;
        dirLight.shadow.camera.top = d;
        dirLight.shadow.camera.bottom = -d;
        dirLight.shadow.camera.far = 3500;
        dirLight.shadow.bias = -0.0001;
        
        this.scene.add(dirLight);
        
        // Cargar HDRI como en el modo local
        const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
        pmremGenerator.compileEquirectangularShader();
        
        const rgbeLoader = new RGBELoader();
        rgbeLoader.load("assets/Light/HDRI.hdr", (texture) => {
            const envMap = pmremGenerator.fromEquirectangular(texture).texture;
            this.scene.environment = envMap;
            this.scene.background = envMap;
            texture.dispose();
            pmremGenerator.dispose();
        }, undefined, (error) => {
            console.error("[multijugador] No se pudo cargar la HDRI", error);
            // Fallback a color sólido si no se puede cargar HDRI
            this.scene.background = new THREE.Color("#34495E");
        });
    }

    createArena() {
        // Plano base (césped)
        const grassGeometry = new THREE.PlaneGeometry(40, 40);
        const grassMaterial = new THREE.MeshLambertMaterial({ color: 0x4CAF50 });
        const grassPlane = new THREE.Mesh(grassGeometry, grassMaterial);
        grassPlane.rotation.x = -Math.PI / 2;
        grassPlane.receiveShadow = true;
        this.scene.add(grassPlane);
        
        // Bordes del escenario
        const borderMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
        
        // Borde norte
        const northWall = new THREE.Mesh(new THREE.BoxGeometry(40, 2, 1), borderMaterial);
        northWall.position.set(0, 1, -20);
        northWall.castShadow = true;
        this.scene.add(northWall);
        
        // Borde sur
        const southWall = new THREE.Mesh(new THREE.BoxGeometry(40, 2, 1), borderMaterial);
        southWall.position.set(0, 1, 20);
        southWall.castShadow = true;
        this.scene.add(southWall);
        
        // Borde oeste
        const westWall = new THREE.Mesh(new THREE.BoxGeometry(1, 2, 40), borderMaterial);
        westWall.position.set(-20, 1, 0);
        westWall.castShadow = true;
        this.scene.add(westWall);
        
        // Borde este
        const eastWall = new THREE.Mesh(new THREE.BoxGeometry(1, 2, 40), borderMaterial);
        eastWall.position.set(20, 1, 0);
        eastWall.castShadow = true;
        this.scene.add(eastWall);
    }





    async joinOrCreateRoom() {
        // Generar ID de sala o unirse a una existente
        const urlParams = new URLSearchParams(window.location.search);
        this.roomId = urlParams.get('room') || this.generateRoomId();
        
        // Referencias de Firebase
        this.roomRef = ref(database, `game_sessions/${this.roomId}`);
        this.playersRef = ref(database, `game_sessions/${this.roomId}/players`);
        this.chatRef = ref(database, `game_sessions/${this.roomId}/chat`);
        this.battleRequestsRef = ref(database, `battle_requests`);
        this.activeBattleRef = null;
        
        // Configurar datos del jugador
        const playerData = {
            playerId: this.currentUser.uid,
            playerName: this.currentUser.displayName || 'Jugador',
            x: 0,
            y: 0,
            z: 0,
            rotation: 0,
            isMoving: false,
            joinedAt: serverTimestamp(),
            isOnline: true
        };
        
        // Añadir jugador a la sala
        const playerRef = ref(database, `game_sessions/${this.roomId}/players/${this.currentUser.uid}`);
        await set(playerRef, playerData);
        
        // Configurar desconexión automática
        onDisconnect(playerRef).remove();
        
        // Escuchar cambios en los jugadores
        onValue(this.playersRef, (snapshot) => {
            this.updatePlayers(snapshot.val());
        });
        
        // Escuchar mensajes de chat
        onValue(this.chatRef, (snapshot) => {
            this.updateChat(snapshot.val());
        });
        
        // Escuchar solicitudes de batalla dirigidas a este jugador
        this.setupBattleRequestListener();
        
        // Actualizar UI con ID de sala
        this.roomIdElement.textContent = this.roomId;
        
        console.log('Unido a la sala:', this.roomId);
    }

    generateRoomId() {
        return Math.random().toString(36).substr(2, 8).toUpperCase();
    }

    updatePlayers(playersData) {
        if (!playersData) return;
        
        const currentPlayerIds = new Set(Object.keys(playersData));
        
        // Remover jugadores que se desconectaron
        for (const [playerId, player] of this.players) {
            if (!currentPlayerIds.has(playerId)) {
                player.destroy();
                this.players.delete(playerId);
            }
        }
        
        // Actualizar o crear jugadores
        for (const [playerId, playerData] of Object.entries(playersData)) {
            if (playerId === this.currentUser.uid) {
                // Crear jugador local si no existe
                if (!this.localPlayer) {
                    this.localPlayer = new MultiplayerPlayer(
                        this.scene, 
                        playerId, 
                        playerData.playerName, 
                        true
                    );
                    this.localPlayer.loadPlayerModel(() => {
                        console.log('Jugador local cargado');
                    });
                    this.players.set(playerId, this.localPlayer);
                }
            } else {
                // Crear o actualizar jugadores remotos
                if (!this.players.has(playerId)) {
                    const remotePlayer = new MultiplayerPlayer(
                        this.scene, 
                        playerId, 
                        playerData.playerName, 
                        false
                    );
                    remotePlayer.loadPlayerModel(() => {
                        console.log(`Jugador remoto ${playerData.playerName} cargado`);
                    });
                    this.players.set(playerId, remotePlayer);
                } else {
                    // Actualizar posición del jugador remoto
                    this.players.get(playerId).updateFromNetwork(playerData);
                }
            }
        }
        
        // Actualizar UI
        this.updatePlayersUI(playersData);
    }

    updatePlayersUI(playersData) {
        const playerCount = Object.keys(playersData).length;
        this.playerCountElement.textContent = playerCount;
        
        // Actualizar lista de jugadores
        this.playersListElement.innerHTML = '';
        for (const [playerId, playerData] of Object.entries(playersData)) {
            const playerElement = document.createElement('div');
            playerElement.className = 'player-info';
            if (playerId === this.currentUser.uid) {
                playerElement.classList.add('current-player');
            }
            playerElement.innerHTML = `
                <strong>${playerData.playerName}</strong>
                ${playerId === this.currentUser.uid ? ' (Tú)' : ''}
            `;
            this.playersListElement.appendChild(playerElement);
        }
    }

    setupControls() {
        // Controles de teclado
        const keys = {};
        
        document.addEventListener('keydown', (event) => {
            keys[event.code] = true;
            
            if (this.localPlayer) {
                switch(event.code) {
                    case 'KeyW':
                        this.localPlayer.setKey('w', true);
                        break;
                    case 'KeyA':
                        this.localPlayer.setKey('a', true);
                        break;
                    case 'KeyS':
                        this.localPlayer.setKey('s', true);
                        break;
                    case 'KeyD':
                        this.localPlayer.setKey('d', true);
                        break;
                    case 'KeyE':
                        // Iniciar batalla si hay un jugador cercano
                        if (this.nearbyPlayer && !this.inBattle) {
                            this.initiateBattle(this.nearbyPlayer);
                        }
                        break;
                }
            }
            
            // Enviar mensaje con Enter
            if (event.code === 'Enter' && document.activeElement === this.chatInput) {
                this.sendChatMessage();
            }
        });
        
        document.addEventListener('keyup', (event) => {
            keys[event.code] = false;
            
            if (this.localPlayer) {
                switch(event.code) {
                    case 'KeyW':
                        this.localPlayer.setKey('w', false);
                        break;
                    case 'KeyA':
                        this.localPlayer.setKey('a', false);
                        break;
                    case 'KeyS':
                        this.localPlayer.setKey('s', false);
                        break;
                    case 'KeyD':
                        this.localPlayer.setKey('d', false);
                        break;
                }
            }
        });
    }

    setupUI() {
        // Configurar botón de enviar chat
        this.sendChatBtn.addEventListener('click', () => {
            this.sendChatMessage();
        });
        
        // Configurar botón de salir
        this.exitBtn.addEventListener('click', () => {
            this.exitMultiplayer();
        });
        
        // Auto-scroll del chat
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }

    initializeBattleSystem() {
        // En multijugador no usamos el sistema de batalla local
        // Todo se maneja a través de Firebase sincronizado
        console.log('Sistema de batalla multijugador inicializado');
    }

    async initiateBattle(opponent) {
        if (this.inBattle || this.pendingBattleRequest) return;
        
        console.log(`Enviando solicitud de batalla a ${opponent.playerName}`);
        
        // Buscar el ID del oponente
        let opponentId = null;
        for (const [playerId, player] of this.players.entries()) {
            if (player.playerName === opponent.playerName) {
                opponentId = playerId;
                break;
            }
        }
        
        if (!opponentId) {
            console.error('No se pudo encontrar el ID del oponente');
            return;
        }
        
        // Crear solicitud de batalla
        const requestId = Date.now().toString();
        const battleRequest = {
            fromplayerID: this.currentUser.uid,
            toplayerID: opponentId,
            requestID: requestId,
            status: "pending"
        };
        
        try {
            await set(ref(database, `battle_requests/${requestId}`), battleRequest);
            this.pendingBattleRequest = requestId;
            
            // Mostrar mensaje al jugador que envía la solicitud
            this.showNotification(`Solicitud de batalla enviada a ${opponent.playerName}`, 'info');
            
        } catch (error) {
            console.error('Error al enviar solicitud de batalla:', error);
            this.showNotification('Error al enviar la solicitud de batalla', 'error');
        }
    }

    sendChatMessage() {
        const message = this.chatInput.value.trim();
        if (message && this.chatRef) {
            const messageData = {
                playerId: this.currentUser.uid,
                playerName: this.currentUser.displayName || 'Jugador',
                message: message,
                timestamp: serverTimestamp()
            };
            
            push(this.chatRef, messageData);
            this.chatInput.value = '';
        }
    }

    updateChat(chatData) {
        if (!chatData) return;
        
        const messages = Object.values(chatData).sort((a, b) => a.timestamp - b.timestamp);
        this.chatMessages.innerHTML = '';
        
        messages.slice(-20).forEach(msg => { // Mostrar solo los últimos 20 mensajes
            const messageElement = document.createElement('div');
            messageElement.innerHTML = `
                <strong style="color: #FFB30F;">${msg.playerName}:</strong> 
                <span style="color: #FDF0D5;">${msg.message}</span>
            `;
            this.chatMessages.appendChild(messageElement);
        });
        
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }

    updateConnectionStatus(status, isConnected) {
        this.connectionStatus.textContent = status;
        this.connectionStatus.className = isConnected ? 'status-connected' : 'status-disconnected';
    }

    updateNetworkData() {
        if (!this.localPlayer || !this.playersRef) return;
        
        const networkData = this.localPlayer.getNetworkData();
        if (networkData) {
            const playerRef = ref(database, `game_sessions/${this.roomId}/players/${this.currentUser.uid}`);
            set(playerRef, {
                ...networkData,
                playerName: this.currentUser.displayName || 'Jugador',
                joinedAt: serverTimestamp(),
                isOnline: true
            });
        }
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        
        if (!this.isInitialized) return;
        
        const delta = this.clock.getDelta();
        const currentTime = performance.now();
        
        // Actualizar jugadores
        for (const player of this.players.values()) {
            player.updateMovement();
            player.updateMixer(delta);
        }
        
        // Actualizar cámara siguiendo al jugador local (como en modo local)
        this.updateCamera();
        
        // Detectar jugadores cercanos para batalla (solo si no estamos en batalla)
        if (!this.inBattle) {
            this.checkNearbyPlayers();
        }
        
        // Actualizar datos de red (limitado a 30 FPS)
        if (currentTime - this.lastUpdateTime > this.updateInterval) {
            this.updateNetworkData();
            this.lastUpdateTime = currentTime;
        }
        
        // Renderizar escena
        this.renderer.render(this.scene, this.camera);
    }

    checkNearbyPlayers() {
        if (!this.localPlayer || !this.localPlayer.getObject() || this.inBattle) return;
        
        this.nearbyPlayer = null;
        let closestDistance = this.interactionDistance;
        const localPlayerObj = this.localPlayer.getObject();
        
        // Revisar otros jugadores
        for (const [playerId, player] of this.players.entries()) {
            if (playerId === this.currentUser.uid) continue; // Saltar jugador local
            
            const otherPlayerObj = player.getObject();
            if (!otherPlayerObj) continue;
            
            const distance = localPlayerObj.position.distanceTo(otherPlayerObj.position);
            if (distance < closestDistance) {
                this.nearbyPlayer = player;
                closestDistance = distance;
            }
        }
        
        // Mostrar/ocultar prompt de batalla
        const battlePrompt = document.getElementById('battlePrompt');
        if (this.nearbyPlayer) {
            battlePrompt.style.display = 'block';
            battlePrompt.innerHTML = `<p style="margin: 0;">Presiona 'E' para desafiar a ${this.nearbyPlayer.playerName}</p>`;
        } else {
            battlePrompt.style.display = 'none';
        }
    }

    setupBattleRequestListener() {
        // Escuchar todas las solicitudes de batalla
        this.battleRequestListener = onValue(this.battleRequestsRef, (snapshot) => {
            const requests = snapshot.val();
            if (requests) {
                // Buscar solicitudes dirigidas a este jugador
                Object.entries(requests).forEach(([requestId, request]) => {
                    if (request.toplayerID === this.currentUser.uid && request.status === "pending") {
                        this.showBattleRequestPrompt(requestId, request);
                    }
                    
                    // Si este jugador envió una solicitud, verificar el estado
                    if (request.fromplayerID === this.currentUser.uid && this.pendingBattleRequest === requestId) {
                        if (request.status === "accepted" && !this.inBattle) {
                            this.startBattleWithPlayer(request.toplayerID);
                            this.pendingBattleRequest = null;
                        } else if (request.status === "rejected") {
                            this.showNotification('Tu solicitud de batalla fue rechazada', 'warning');
                            this.pendingBattleRequest = null;
                        }
                    }
                });
            }
        });
    }

    showBattleRequestPrompt(requestId, request) {
        // Encontrar el nombre del jugador que envía la solicitud
        let challenger = null;
        for (const [playerId, player] of this.players.entries()) {
            if (playerId === request.fromplayerID) {
                challenger = player;
                break;
            }
        }
        
        if (!challenger) return;
        
        // Crear el prompt de solicitud
        const battleRequestPrompt = document.createElement('div');
        battleRequestPrompt.id = 'battleRequestPrompt';
        battleRequestPrompt.style.cssText = `
            position: fixed; 
            top: 50%; 
            left: 50%; 
            transform: translate(-50%, -50%); 
            background: rgba(1, 41, 95, 0.95); 
            color: #FDF0D5; 
            padding: 20px; 
            border-radius: 15px; 
            text-align: center; 
            border: 3px solid #FFB30F; 
            z-index: 3000;
            min-width: 300px;
        `;
        
        battleRequestPrompt.innerHTML = `
            <h3 style="margin: 0 0 15px 0; color: #FFB30F;">¡Solicitud de Batalla!</h3>
            <p style="margin: 0 0 20px 0;">${challenger.playerName} te desafía a una batalla</p>
            <div style="display: flex; gap: 10px; justify-content: center;">
                <button id="acceptBattle" style="background: #849324; color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-weight: bold;">Aceptar</button>
                <button id="rejectBattle" style="background: #FD151B; color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-weight: bold;">Rechazar</button>
            </div>
        `;
        
        // Remover prompt anterior si existe
        const existing = document.getElementById('battleRequestPrompt');
        if (existing) existing.remove();
        
        document.body.appendChild(battleRequestPrompt);
        
        // Event listeners para los botones
        document.getElementById('acceptBattle').onclick = () => {
            this.respondToBattleRequest(requestId, 'accepted');
            battleRequestPrompt.remove();
        };
        
        document.getElementById('rejectBattle').onclick = () => {
            this.respondToBattleRequest(requestId, 'rejected');
            battleRequestPrompt.remove();
        };
    }

    async respondToBattleRequest(requestId, response) {
        try {
            await set(ref(database, `battle_requests/${requestId}/status`), response);
            
            if (response === 'accepted') {
                this.showNotification('Batalla aceptada. ¡Preparándose para el combate!', 'success');
                
                // El jugador que acepta también debe entrar en batalla inmediatamente
                const request = (await get(ref(database, `battle_requests/${requestId}`))).val();
                if (request && !this.inBattle) {
                    this.startBattleWithPlayer(request.fromplayerID);
                }
            } else {
                this.showNotification('Solicitud de batalla rechazada', 'info');
            }
            
            // Limpiar la solicitud después de procesarla
            setTimeout(async () => {
                try {
                    await remove(ref(database, `battle_requests/${requestId}`));
                } catch (error) {
                    console.error('Error al limpiar solicitud:', error);
                }
            }, 1000);
            
        } catch (error) {
            console.error('Error al responder solicitud de batalla:', error);
        }
    }

    async startBattleWithPlayer(opponentId) {
        const opponent = this.players.get(opponentId);
        if (!opponent) return;
        
        console.log(`¡Iniciando batalla sincronizada contra ${opponent.playerName}!`);
        
        // Crear ID único para la batalla
        this.activeBattleId = `battle_${Date.now()}`;
        this.activeBattleRef = ref(database, `active_battles/${this.activeBattleId}`);
        
        // Determinar quién va primero (el desafiante siempre va primero)
        const isChallenger = this.currentUser.uid < opponentId; // Usar comparación alfabética para consistencia
        this.isMyTurn = isChallenger;
        
        // Crear estado inicial de batalla
        const initialBattleState = {
            player1: {
                id: this.currentUser.uid,
                name: this.currentUser.displayName || 'Jugador',
                hp: 100,
                maxHp: 100,
                energy: 100,
                maxEnergy: 100,
                attack: 20,
                defense: 10
            },
            player2: {
                id: opponentId,
                name: opponent.playerName,
                hp: 100,
                maxHp: 100,
                energy: 100,
                maxEnergy: 100,
                attack: 20,
                defense: 10
            },
            currentTurn: isChallenger ? this.currentUser.uid : opponentId,
            status: 'active',
            lastAction: null,
            message: 'La batalla ha comenzado. ¡Es el turno del primer jugador!'
        };
        
        // Solo el desafiante crea el estado inicial
        if (isChallenger) {
            await set(this.activeBattleRef, initialBattleState);
        }
        
        // Configurar listener para el estado de batalla
        this.setupBattleStateListener();
        
        // Detener movimiento del jugador local
        this.velocity.set(0, 0, 0);
        if (this.localPlayer) {
            this.localPlayer.setKey('w', false);
            this.localPlayer.setKey('a', false);
            this.localPlayer.setKey('s', false);
            this.localPlayer.setKey('d', false);
        }
        
        // Mostrar UI de batalla personalizada
        this.showSyncedBattleUI();
    }

    setupBattleStateListener() {
        this.battleStateListener = onValue(this.activeBattleRef, (snapshot) => {
            const battleState = snapshot.val();
            if (battleState) {
                this.battleState = battleState;
                this.isMyTurn = battleState.currentTurn === this.currentUser.uid;
                this.updateSyncedBattleUI(battleState);
                
                // Verificar si la batalla ha terminado
                if (battleState.status === 'finished') {
                    this.endSyncedBattle(battleState);
                }
            }
        });
    }

    showSyncedBattleUI() {
        // Mostrar la UI de batalla
        const battleUI = document.getElementById('battleUI');
        battleUI.style.display = 'block';
        
        // Configurar event listeners para acciones sincronizadas
        this.setupSyncedBattleActions();
    }

    setupSyncedBattleActions() {
        document.getElementById('attackBtn').onclick = () => this.performSyncedAction('attack');
        document.getElementById('specialBtn').onclick = () => this.performSyncedAction('special');
        document.getElementById('defendBtn').onclick = () => this.performSyncedAction('defend');
        document.getElementById('runBtn').onclick = () => this.performSyncedAction('run');
    }

    async performSyncedAction(actionType) {
        if (!this.isMyTurn || !this.battleState) {
            this.showNotification('No es tu turno', 'warning');
            return;
        }

        const myData = this.battleState.player1.id === this.currentUser.uid ? this.battleState.player1 : this.battleState.player2;
        const opponentData = this.battleState.player1.id === this.currentUser.uid ? this.battleState.player2 : this.battleState.player1;
        
        let damage = 0;
        let message = '';
        let energyCost = 0;
        
        switch (actionType) {
            case 'attack':
                damage = Math.max(5, myData.attack - opponentData.defense + Math.floor(Math.random() * 10));
                message = `${myData.name} atacó e hizo ${damage} de daño!`;
                break;
                
            case 'special':
                if (myData.energy < 30) {
                    this.showNotification('No tienes suficiente energía', 'warning');
                    return;
                }
                damage = Math.max(10, myData.attack * 1.5 - opponentData.defense + Math.floor(Math.random() * 15));
                energyCost = 30;
                message = `${myData.name} usó Ataque Especial e hizo ${damage} de daño!`;
                break;
                
            case 'defend':
                // Restaurar energía y reducir daño del próximo ataque (implementar lógica)
                energyCost = -20; // Restaurar energía
                message = `${myData.name} se defendió y restauró energía!`;
                break;
                
            case 'run':
                message = `${myData.name} intentó huir, pero no puede escapar de una batalla PvP!`;
                break;
        }
        
        // Calcular nuevos valores
        const newOpponentHp = Math.max(0, opponentData.hp - damage);
        const newMyEnergy = Math.max(0, Math.min(myData.maxEnergy, myData.energy - energyCost));
        
        // Determinar siguiente turno
        const nextTurn = this.battleState.player1.id === this.currentUser.uid ? this.battleState.player2.id : this.battleState.player1.id;
        
        // Verificar si la batalla termina
        const battleFinished = newOpponentHp <= 0;
        
        // Crear el nuevo estado completo sin usar claves con barras
        const newBattleState = { ...this.battleState };
        
        // Actualizar HP del oponente
        if (this.battleState.player1.id === this.currentUser.uid) {
            newBattleState.player2.hp = newOpponentHp;
            newBattleState.player1.energy = newMyEnergy;
        } else {
            newBattleState.player1.hp = newOpponentHp;
            newBattleState.player2.energy = newMyEnergy;
        }
        
        // Actualizar otros campos
        newBattleState.currentTurn = battleFinished ? null : nextTurn;
        newBattleState.lastAction = {
            player: this.currentUser.uid,
            action: actionType,
            damage: damage,
            timestamp: Date.now()
        };
        newBattleState.message = message;
        newBattleState.status = battleFinished ? 'finished' : 'active';
        if (battleFinished) {
            newBattleState.winner = this.currentUser.uid;
        }
        
        try {
            await set(this.activeBattleRef, newBattleState);
        } catch (error) {
            console.error('Error al actualizar estado de batalla:', error);
        }
    }

    updateSyncedBattleUI(battleState) {
        const myData = battleState.player1.id === this.currentUser.uid ? battleState.player1 : battleState.player2;
        const opponentData = battleState.player1.id === this.currentUser.uid ? battleState.player2 : battleState.player1;
        
        // Actualizar nombres
        document.getElementById('playerName').textContent = myData.name;
        document.getElementById('enemyName').textContent = opponentData.name;
        
        // Actualizar barras de HP
        const playerHPPercent = (myData.hp / myData.maxHp) * 100;
        const enemyHPPercent = (opponentData.hp / opponentData.maxHp) * 100;
        
        document.getElementById('playerHP').style.width = playerHPPercent + '%';
        document.getElementById('enemyHP').style.width = enemyHPPercent + '%';
        
        // Actualizar texto de HP
        document.getElementById('playerHPText').textContent = `HP: ${Math.max(0, myData.hp)}/${myData.maxHp}`;
        document.getElementById('enemyHPText').textContent = `HP: ${Math.max(0, opponentData.hp)}/${opponentData.maxHp}`;
        
        // Actualizar energía
        const energyPercent = (myData.energy / myData.maxEnergy) * 100;
        document.getElementById('playerEnergy').style.width = energyPercent + '%';
        document.getElementById('playerEnergyText').textContent = `Energia: ${myData.energy}/${myData.maxEnergy}`;
        
        // Actualizar mensaje
        document.getElementById('battleMessage').innerHTML = `<p style="margin: 0;">${battleState.message}</p>`;
        
        // Habilitar/deshabilitar botones según el turno
        const buttons = ['attackBtn', 'specialBtn', 'defendBtn', 'runBtn'];
        buttons.forEach(btnId => {
            const btn = document.getElementById(btnId);
            btn.disabled = !this.isMyTurn;
            btn.style.opacity = this.isMyTurn ? '1' : '0.5';
            btn.style.cursor = this.isMyTurn ? 'pointer' : 'not-allowed';
        });
        
        // Mensaje visual del turno
        if (this.isMyTurn) {
            document.getElementById('battleMessage').style.background = 'rgba(132, 147, 36, 0.3)';
        } else {
            document.getElementById('battleMessage').style.background = 'rgba(253, 21, 27, 0.3)';
        }
    }

    async endSyncedBattle(battleState) {
        const winner = battleState.winner === this.currentUser.uid ? 'Tú' : battleState.player1.id === battleState.winner ? battleState.player1.name : battleState.player2.name;
        
        setTimeout(() => {
            document.getElementById('battleUI').style.display = 'none';
            this.inBattle = false;
            
            if (battleState.winner === this.currentUser.uid) {
                this.showNotification(`¡Ganaste la batalla!`, 'success');
            } else {
                this.showNotification(`Perdiste contra ${winner}`, 'error');
            }
            
            // Limpiar listeners de batalla
            if (this.battleStateListener) {
                off(this.activeBattleRef, 'value', this.battleStateListener);
                this.battleStateListener = null;
            }
            
            // Limpiar referencia de batalla
            this.activeBattleRef = null;
            this.activeBattleId = null;
            this.battleState = null;
        }, 2000);
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'error' ? '#FD151B' : type === 'success' ? '#849324' : type === 'warning' ? '#FFB30F' : '#01295F'};
            color: ${type === 'warning' ? '#01295F' : '#FDF0D5'};
            padding: 10px 15px;
            border-radius: 8px;
            z-index: 4000;
            font-weight: bold;
            max-width: 300px;
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Auto-remover después de 3 segundos
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 3000);
    }

    onWindowResize() {
        const contenedor = document.getElementById('escena3D');
        this.camera.aspect = contenedor.clientWidth / contenedor.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(contenedor.clientWidth, contenedor.clientHeight);
    }

    async exitMultiplayer() {
        try {
            // Remover jugador de la base de datos
            if (this.roomRef && this.currentUser) {
                const playerRef = ref(database, `game_sessions/${this.roomId}/players/${this.currentUser.uid}`);
                await remove(playerRef);
            }
            
            // Detener listeners
            if (this.playersRef) off(this.playersRef);
            if (this.chatRef) off(this.chatRef);
            if (this.battleRequestListener) off(this.battleRequestsRef, 'value', this.battleRequestListener);
            
            // Limpiar solicitudes de batalla pendientes
            if (this.pendingBattleRequest) {
                await set(ref(database, `battle_requests/${this.pendingBattleRequest}/status`), 'cancelled');
            }
            
            // Limpiar batalla activa
            if (this.battleStateListener) {
                off(this.activeBattleRef, 'value', this.battleStateListener);
            }
            if (this.activeBattleId) {
                await set(ref(database, `active_battles/${this.activeBattleId}/status`), 'abandoned');
            }
            
            // Redirigir al menú principal
            window.location.href = 'mode.html';
        } catch (error) {
            console.error('Error al salir del multijugador:', error);
            window.location.href = 'mode.html';
        }
    }
}

// Inicializar el juego cuando se cargue la página
window.addEventListener('load', () => {
    new MultiplayerGame();
});