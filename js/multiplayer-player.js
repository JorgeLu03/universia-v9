// multiplayer-player.js
// Clase para jugadores en modo multijugador
import * as THREE from "../scene/three.module.js";
import { GLTFLoader } from "../scene/GLTFLoader.js";

export class MultiplayerPlayer {
    constructor(scene, playerId, playerName, isLocalPlayer = false) {
        this.scene = scene;
        this.playerId = playerId;
        this.playerName = playerName;
        this.isLocalPlayer = isLocalPlayer;
        this.player = null;
        this.playerMixer = null;
        this.playerActions = {};
        this.activePlayerAction = null;
        this.playerLoaded = false;
        this.velocity = new THREE.Vector3();
        this.targetRotation = 0;
        this.keys = { w: false, a: false, s: false, d: false };
        
        // Configuración de movimiento (igual que en modo local)
        this.acceleration = 0.002;
        this.maxSpeed = 0.05;
        this.deceleration = 0.95;
        this.rotationSpeed = 0.1;
        this.playerRadius = 1;
        
        // Límites del escenario (plano básico)
        this.scenarioBounds = {
            minX: -20,
            maxX: 20,
            minZ: -20,
            maxZ: 20
        };
        
        // Etiqueta con el nombre del jugador
        this.nameLabel = null;
    }



    loadPlayerModel(onLoaded) {
        const gltfLoader = new GLTFLoader();
        
        gltfLoader.load("./assets/Anim/Estudiante.glb", (gltf) => {
            this.player = gltf.scene;
            this.player.scale.set(1.0, 1.0, 1.0);
            this.player.position.set(0, 0, 0);
            
            // Configurar sombras manteniendo materiales originales
            this.player.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });
            
            this.scene.add(this.player);
            
            // Crear etiqueta con el nombre del jugador
            this.createNameLabel();
            
            // Cargar animaciones
            this.playerMixer = new THREE.AnimationMixer(this.player);
            
            gltfLoader.load("./assets/Anim/EstudianteIdle.glb", (idleGltf) => {
                if (idleGltf.animations && idleGltf.animations.length > 1) {
                    this.playerActions.idle = this.playerMixer.clipAction(idleGltf.animations[1]);
                    this.playerActions.idle.play();
                    this.activePlayerAction = this.playerActions.idle;
                }
                
                gltfLoader.load("./assets/Anim/EstudianteRun.glb", (runGltf) => {
                    if (runGltf.animations && runGltf.animations.length > 2) {
                        this.playerActions.run = this.playerMixer.clipAction(runGltf.animations[2]);
                    }
                    
                    this.playerLoaded = true;
                    if (onLoaded) onLoaded();
                });
            });
        });
    }

    createNameLabel() {
        // Crear un canvas para el texto
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 256;
        canvas.height = 64;
        
        // Estilo del texto
        context.fillStyle = 'rgba(1, 41, 95, 0.8)';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.fillStyle = '#FDF0D5';
        context.font = '24px Arial';
        context.textAlign = 'center';
        context.fillText(this.playerName, canvas.width / 2, canvas.height / 2 + 8);
        
        // Crear textura y material
        const texture = new THREE.CanvasTexture(canvas);
        const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
        this.nameLabel = new THREE.Sprite(spriteMaterial);
        this.nameLabel.scale.set(4, 1, 1);
        this.nameLabel.position.set(0, 3, 0);
        
        if (this.player) {
            this.player.add(this.nameLabel);
        }
    }

    setKey(key, value) {
        if (this.isLocalPlayer && this.keys.hasOwnProperty(key)) {
            this.keys[key] = value;
        }
    }

    updateMovement() {
        if (!this.player || !this.isLocalPlayer) return;
        
        const direction = new THREE.Vector3();
        let isMoving = false;
        
        // Usar la misma lógica que player.js
        if (this.keys.w) { direction.z += 1; isMoving = true; }
        if (this.keys.s) { direction.z -= 1; isMoving = true; }
        if (this.keys.a) { direction.x += 1; isMoving = true; }
        if (this.keys.d) { direction.x -= 1; isMoving = true; }
        
        if (isMoving) {
            direction.normalize();
            this.velocity.x += direction.x * this.acceleration;
            this.velocity.z += direction.z * this.acceleration;
            
            const speed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.z * this.velocity.z);
            if (speed > this.maxSpeed) {
                this.velocity.x = (this.velocity.x / speed) * this.maxSpeed;
                this.velocity.z = (this.velocity.z / speed) * this.maxSpeed;
            }
            
            this.targetRotation = Math.atan2(direction.x, direction.z);
        } else {
            this.velocity.multiplyScalar(this.deceleration);
        }
        
        // Actualizar posición
        this.player.position.x += this.velocity.x;
        this.player.position.z += this.velocity.z;
        
        // Limitar a los bordes del escenario
        if (this.player.position.x < this.scenarioBounds.minX + this.playerRadius) {
            this.player.position.x = this.scenarioBounds.minX + this.playerRadius;
            this.velocity.x = 0;
        }
        if (this.player.position.x > this.scenarioBounds.maxX - this.playerRadius) {
            this.player.position.x = this.scenarioBounds.maxX - this.playerRadius;
            this.velocity.x = 0;
        }
        if (this.player.position.z < this.scenarioBounds.minZ + this.playerRadius) {
            this.player.position.z = this.scenarioBounds.minZ + this.playerRadius;
            this.velocity.z = 0;
        }
        if (this.player.position.z > this.scenarioBounds.maxZ - this.playerRadius) {
            this.player.position.z = this.scenarioBounds.maxZ - this.playerRadius;
            this.velocity.z = 0;
        }
        
        // Rotación suave (igual que en modo local)
        let rotationDiff = this.targetRotation - this.player.rotation.y;
        while (rotationDiff > Math.PI) rotationDiff -= Math.PI * 2;
        while (rotationDiff < -Math.PI) rotationDiff += Math.PI * 2;
        this.player.rotation.y += rotationDiff * this.rotationSpeed;
        
        // Animación
        if (this.playerLoaded && this.playerActions.idle && this.playerActions.run) {
            const moving = isMoving && (Math.abs(this.velocity.x) > 0.01 || Math.abs(this.velocity.z) > 0.01);
            let nextAction = moving ? this.playerActions.run : this.playerActions.idle;
            
            if (this.activePlayerAction !== nextAction) {
                if (this.activePlayerAction) {
                    this.activePlayerAction.fadeOut(0.2);
                }
                nextAction.reset().fadeIn(0.2).play();
                this.activePlayerAction = nextAction;
            }
        }
    }

    // Actualizar posición desde datos remotos (para otros jugadores)
    updateFromNetwork(data) {
        if (!this.player || this.isLocalPlayer) return;
        
        // Interpolación suave de posición
        const targetPosition = new THREE.Vector3(data.x, data.y, data.z);
        this.player.position.lerp(targetPosition, 0.1);
        
        // Interpolación suave de rotación (compensar rotación base)
        const targetRotation = data.rotation;
        let rotationDiff = targetRotation - this.player.rotation.y;
        while (rotationDiff > Math.PI) rotationDiff -= Math.PI * 2;
        while (rotationDiff < -Math.PI) rotationDiff += Math.PI * 2;
        this.player.rotation.y += rotationDiff * 0.1;
        
        // Actualizar animación basada en movimiento
        if (this.playerLoaded && this.playerActions.idle && this.playerActions.run) {
            const isMoving = data.isMoving;
            let nextAction = isMoving ? this.playerActions.run : this.playerActions.idle;
            
            if (this.activePlayerAction !== nextAction) {
                if (this.activePlayerAction) {
                    this.activePlayerAction.fadeOut(0.2);
                }
                nextAction.reset().fadeIn(0.2).play();
                this.activePlayerAction = nextAction;
            }
        }
    }

    updateMixer(delta) {
        if (this.playerMixer) {
            this.playerMixer.update(delta);
        }
    }

    getNetworkData() {
        if (!this.player) return null;
        
        return {
            playerId: this.playerId,
            x: this.player.position.x,
            y: this.player.position.y,
            z: this.player.position.z,
            rotation: this.player.rotation.y, // Enviar la rotación tal como está
            isMoving: Math.abs(this.velocity.x) > 0.01 || Math.abs(this.velocity.z) > 0.01
        };
    }

    getObject() {
        return this.player;
    }

    destroy() {
        if (this.player) {
            this.scene.remove(this.player);
        }
    }
}