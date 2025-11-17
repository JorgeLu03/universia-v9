// player.js
// Lógica y control del personaje principal (Estudiante)
import * as THREE from "../scene/three.module.js";
import { GLTFLoader } from "../scene/GLTFLoader.js";

export class Player {
    constructor(scene, scenarioBounds, playerRadius, acceleration, maxSpeed, deceleration, rotationSpeed) {
        this.scene = scene;
        this.scenarioBounds = scenarioBounds;
        this.playerRadius = playerRadius;
        this.acceleration = acceleration;
        this.maxSpeed = maxSpeed;
        this.deceleration = deceleration;
        this.rotationSpeed = rotationSpeed;
        this.player = null;
        this.playerMixer = null;
        this.playerActions = {};
        this.activePlayerAction = null;
        this.playerLoaded = false;
        this.velocity = new THREE.Vector3();
        this.targetRotation = 0;
        this.keys = { w: false, a: false, s: false, d: false };
    }

    loadPlayerModel(onLoaded) {
        const gltfLoader = new GLTFLoader();
        gltfLoader.load("../assets/Anim/Estudiante.glb", (gltf) => {
            this.player = gltf.scene;
            this.player.scale.set(1.0, 1.0, 1.0);
            this.player.position.set(0, 0, 0);
            this.scene.add(this.player);
            this.playerMixer = new THREE.AnimationMixer(this.player);
            gltfLoader.load("../assets/Anim/EstudianteIdle.glb", (idleGltf) => {
                if (idleGltf.animations && idleGltf.animations.length > 1) {
                    this.playerActions.idle = this.playerMixer.clipAction(idleGltf.animations[1]);
                    this.playerActions.idle.play();
                    this.activePlayerAction = this.playerActions.idle;
                }
                gltfLoader.load("../assets/Anim/EstudianteRun.glb", (runGltf) => {
                    if (runGltf.animations && runGltf.animations.length > 2) {
                        this.playerActions.run = this.playerMixer.clipAction(runGltf.animations[2]);
                    }
                    this.playerLoaded = true;
                    if (onLoaded) onLoaded();
                });
            });
        });
    }

    setKey(key, value) {
        if (this.keys.hasOwnProperty(key)) {
            this.keys[key] = value;
        }
    }

    updateMovement() {
        if (!this.player) return;
        const direction = new THREE.Vector3();
        let isMoving = false;
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
        this.player.position.x += this.velocity.x;
        this.player.position.z += this.velocity.z;
        // Limitar a los bordes
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

    updateMixer(delta) {
        if (this.playerMixer) this.playerMixer.update(delta);
    }

    getObject() {
        return this.player;
    }
}
