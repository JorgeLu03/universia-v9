// room-manager.js
// Sistema de gestión de salas para multijugador
import { database } from './firebase-config.js';
import { 
    ref, 
    set, 
    get, 
    push, 
    onValue, 
    serverTimestamp,
    remove,
    onDisconnect
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

export class RoomManager {
    constructor() {
        this.roomsRef = ref(database, 'game_sessions');
    }

    // Crear una nueva sala
    async createRoom(hostUser) {
        const roomId = this.generateRoomId();
        const roomRef = ref(database, `game_sessions/${roomId}`);
        
        const roomData = {
            roomId: roomId,
            hostId: hostUser.uid,
            hostName: hostUser.displayName || 'Host',
            createdAt: serverTimestamp(),
            maxPlayers: 4,
            currentPlayers: 1,
            isActive: true,
            gameStarted: false,
            players: {
                [hostUser.uid]: {
                    playerId: hostUser.uid,
                    playerName: hostUser.displayName || 'Host',
                    isHost: true,
                    x: 0,
                    y: 0,
                    z: 0,
                    rotation: 0,
                    isMoving: false,
                    joinedAt: serverTimestamp(),
                    isOnline: true
                }
            }
        };

        try {
            await set(roomRef, roomData);
            
            // Configurar desconnexión automática para el host
            const hostPlayerRef = ref(database, `game_sessions/${roomId}/players/${hostUser.uid}`);
            onDisconnect(hostPlayerRef).remove();
            
            // Si el host se desconecta, marcar sala como inactiva
            onDisconnect(roomRef).update({
                isActive: false,
                hostDisconnected: true
            });
            
            return roomId;
        } catch (error) {
            console.error('Error creando la sala:', error);
            throw error;
        }
    }

    // Unirse a una sala existente
    async joinRoom(roomId, user) {
        const roomRef = ref(database, `game_sessions/${roomId}`);
        
        try {
            // Verificar si la sala existe
            const roomSnapshot = await get(roomRef);
            if (!roomSnapshot.exists()) {
                throw new Error('La sala no existe');
            }

            const roomData = roomSnapshot.val();
            
            // Verificar si la sala está llena
            if (roomData.currentPlayers >= roomData.maxPlayers) {
                throw new Error('La sala está llena');
            }

            // Verificar si el juego ya comenzó
            if (roomData.gameStarted) {
                throw new Error('El juego ya ha comenzado');
            }

            // Añadir jugador a la sala
            const playerRef = ref(database, `game_sessions/${roomId}/players/${user.uid}`);
            const playerData = {
                playerId: user.uid,
                playerName: user.displayName || 'Jugador',
                isHost: false,
                x: Math.random() * 10 - 5, // Posición aleatoria inicial
                y: 0,
                z: Math.random() * 10 - 5,
                rotation: Math.PI, // Rotación inicial de 180 grados
                isMoving: false,
                joinedAt: serverTimestamp(),
                isOnline: true
            };

            await set(playerRef, playerData);

            // Configurar desconnexión automática
            onDisconnect(playerRef).remove();
            
            // Configurar recalculo automático del contador al desconectarse
            const disconnectRef = onDisconnect(ref(database, `game_sessions/${roomId}`));
            disconnectRef.update({
                lastUpdate: serverTimestamp()
            });
            
            // Actualizar contador de jugadores recalculándolo
            await this.updatePlayerCount(roomId);

            return true;
        } catch (error) {
            console.error('Error uniéndose a la sala:', error);
            throw error;
        }
    }

    // Obtener lista de salas disponibles
    async getAvailableRooms() {
        try {
            const roomsSnapshot = await get(this.roomsRef);
            if (!roomsSnapshot.exists()) {
                return [];
            }

            const rooms = [];
            const roomsData = roomsSnapshot.val();
            
            for (const [roomId, roomData] of Object.entries(roomsData)) {
                // Solo mostrar salas activas, no iniciadas y con espacio
                if (roomData.isActive && 
                    !roomData.gameStarted && 
                    roomData.currentPlayers < roomData.maxPlayers) {
                    
                    rooms.push({
                        roomId: roomId,
                        hostName: roomData.hostName,
                        currentPlayers: roomData.currentPlayers,
                        maxPlayers: roomData.maxPlayers,
                        createdAt: roomData.createdAt
                    });
                }
            }

            // Ordenar por fecha de creación (más recientes primero)
            return rooms.sort((a, b) => b.createdAt - a.createdAt);
        } catch (error) {
            console.error('Error obteniendo salas:', error);
            return [];
        }
    }

    // Salir de una sala
    async leaveRoom(roomId, userId) {
        try {
            const playerRef = ref(database, `game_sessions/${roomId}/players/${userId}`);
            await remove(playerRef);

            // Actualizar contador de jugadores
            const roomRef = ref(database, `game_sessions/${roomId}`);
            const roomSnapshot = await get(roomRef);
            
            if (roomSnapshot.exists()) {
                const roomData = roomSnapshot.val();
                const newPlayerCount = Math.max(0, roomData.currentPlayers - 1);
                
                if (newPlayerCount === 0) {
                    // Si no quedan jugadores, eliminar la sala
                    await remove(roomRef);
                } else {
                    // Actualizar contador
                    const currentPlayersRef = ref(database, `game_sessions/${roomId}/currentPlayers`);
                    await set(currentPlayersRef, newPlayerCount);
                }
            }
        } catch (error) {
            console.error('Error saliendo de la sala:', error);
            throw error;
        }
    }

    // Generar ID único para la sala
    generateRoomId() {
        return Math.random().toString(36).substr(2, 8).toUpperCase();
    }

    // Escuchar cambios en una sala específica
    onRoomUpdate(roomId, callback) {
        const roomRef = ref(database, `game_sessions/${roomId}`);
        return onValue(roomRef, callback);
    }

    // Actualizar contador de jugadores basado en jugadores realmente conectados
    async updatePlayerCount(roomId) {
        try {
            const roomRef = ref(database, `game_sessions/${roomId}`);
            const snapshot = await get(roomRef);
            
            if (snapshot.exists()) {
                const roomData = snapshot.val();
                const players = roomData.players || {};
                
                // Contar solo jugadores online
                const onlineCount = Object.values(players)
                    .filter(player => player.isOnline !== false).length;
                
                // Actualizar el contador
                await set(ref(database, `game_sessions/${roomId}/currentPlayers`), onlineCount);
                
                // Si no quedan jugadores, marcar la sala como inactiva
                if (onlineCount === 0) {
                    await set(ref(database, `game_sessions/${roomId}/isActive`), false);
                }
                
                return onlineCount;
            }
        } catch (error) {
            console.error('Error actualizando contador de jugadores:', error);
        }
    }

    // Limpiar salas vacías y jugadores desconectados
    async cleanupRooms() {
        try {
            const snapshot = await get(this.roomsRef);
            if (snapshot.exists()) {
                const rooms = snapshot.val();
                
                for (const [roomId, roomData] of Object.entries(rooms)) {
                    if (roomData.players) {
                        // Contar jugadores realmente conectados
                        const onlinePlayers = Object.values(roomData.players)
                            .filter(player => player.isOnline !== false);
                        
                        if (onlinePlayers.length === 0) {
                            // Eliminar sala vacía
                            await remove(ref(database, `game_sessions/${roomId}`));
                            console.log(`Sala vacía eliminada: ${roomId}`);
                        } else {
                            // Actualizar contador
                            await set(ref(database, `game_sessions/${roomId}/currentPlayers`), onlinePlayers.length);
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Error en limpieza de salas:', error);
        }
    }

    // Salir de una sala
    async leaveRoom(roomId, userId) {
        try {
            // Remover jugador
            await remove(ref(database, `game_sessions/${roomId}/players/${userId}`));
            
            // Actualizar contador
            await this.updatePlayerCount(roomId);
            
        } catch (error) {
            console.error('Error al salir de la sala:', error);
        }
    }

    // Escuchar cambios en la lista de salas
    onRoomsUpdate(callback) {
        return onValue(this.roomsRef, callback);
    }
}