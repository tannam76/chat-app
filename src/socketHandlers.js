// Xử lý Socket.IO events
const db = require('../db');
const { saveMessage, determineWinner } = require('./chatUtils');

// Global state
const roomPeers = new Map(); // roomName -> Map<socket.id, peerId>
const gameStates = new Map(); // roomName -> { choices: Map<peerId, choice>, ready: false }

const initializeSocketHandlers = (io) => {
    io.on('connection', (socket) => {
        console.log('Một người dùng đã kết nối:', socket.id);

        // ===== ROOM EVENTS =====
        socket.on('joinRoom', (roomName) => {
            // Rời tất cả room cũ
            socket.rooms.forEach(room => {
                if (room !== socket.id) socket.leave(room);
            });
            socket.join(roomName);

            if (!roomPeers.has(roomName)) {
                roomPeers.set(roomName, new Map());
            }

            // Lấy lịch sử chat
            db.query(
                'SELECT content, sender, timestamp, is_file, is_voice, duration FROM messages WHERE room_id = (SELECT id FROM rooms WHERE name = ?) ORDER BY timestamp',
                [roomName],
                (err, results) => {
                    if (err) return console.error('Lỗi lấy tin nhắn:', err);

                    const formattedHistory = results.map(msg => ({
                        content: msg.content,
                        sender: msg.sender,
                        timestamp: msg.timestamp,
                        roomName: roomName,
                        isFile: Boolean(msg.is_file),
                        isVoice: Boolean(msg.is_voice),
                        duration: msg.duration || 0
                    }));

                    socket.emit('chatHistory', formattedHistory);
                }
            );

            const roomMap = roomPeers.get(roomName);
            const allPeerIds = Array.from(roomMap.values());
            socket.emit('remotePeers', { roomName, allPeerIds });
            console.log(`User ${socket.id} joined ${roomName}, allPeers:`, allPeerIds);
        });

        socket.on('leaveRoom', (roomName) => {
            if (socket.rooms.has(roomName)) {
                socket.leave(roomName);
                const roomMap = roomPeers.get(roomName);
                if (roomMap) {
                    roomMap.delete(socket.id);
                    const allPeerIds = Array.from(roomMap.values());
                    io.to(roomName).emit('remotePeers', { roomName, allPeerIds });
                    console.log(`User ${socket.id} left ${roomName}`);
                }
                if (roomMap && roomMap.size === 0) {
                    roomPeers.delete(roomName);
                }
            }
        });

        socket.on('requestRemotePeers', (roomName) => {
            if (socket.rooms.has(roomName)) {
                const roomMap = roomPeers.get(roomName);
                if (roomMap) {
                    const allPeerIds = Array.from(roomMap.values());
                    socket.emit('remotePeers', { roomName, allPeerIds });
                }
            }
        });

        // ===== CALL EVENTS =====
        socket.on('endCall', (roomName) => {
            if (socket.rooms.has(roomName)) {
                io.to(roomName).emit('endCallRemote');
            }
        });

        // ===== PEER EVENTS =====
        socket.on('peer-id', (peerId) => {
            socket.peerId = peerId;
            const rooms = Array.from(socket.rooms).filter(room => room !== socket.id);
            if (rooms.length > 0) {
                const roomName = rooms[0];
                const roomMap = roomPeers.get(roomName);
                if (roomMap) {
                    roomMap.set(socket.id, peerId);
                    const allPeerIds = Array.from(roomMap.values());
                    io.to(roomName).emit('remotePeers', { roomName, allPeerIds });
                }
            }
        });

        // ===== CHAT EVENTS =====
        socket.on('chatMessage', ({ content, sender, roomName, isFile, isVoice, duration }) => {
            db.query('SELECT id FROM rooms WHERE name = ?', [roomName], (err, results) => {
                if (err || !results.length) {
                    db.query('INSERT INTO rooms (name) VALUES (?)', [roomName], (err) => {
                        if (err) return console.error('Lỗi tạo phòng:', err);
                        saveMessage(content, sender, roomName, isFile, isVoice, duration, io);
                    });
                } else {
                    saveMessage(content, sender, roomName, isFile, isVoice, duration, io);
                }
            });
        });

        // ===== GAME EVENTS =====
        socket.on('playRPS', ({ roomName, choice }) => {
            console.log(`[RPS] Player ${socket.id} in room ${roomName} chose ${choice}, peerId: ${socket.peerId}`);
            if (!socket.rooms.has(roomName)) {
                console.log(`[RPS] Not in room ${roomName}`);
                return;
            }

            const roomMap = roomPeers.get(roomName);
            console.log(`[RPS] Room ${roomName} has ${roomMap?.size || 0} peers`);
            if (!roomMap || roomMap.size !== 2) {
                console.log(`[RPS] Not enough players (need 2, have ${roomMap?.size || 0})`);
                return;
            }

            if (!gameStates.has(roomName)) {
                gameStates.set(roomName, { choices: new Map(), ready: false });
            }
            const gameState = gameStates.get(roomName);
            const playerPeerId = socket.peerId;
            if (!playerPeerId) {
                console.log(`[RPS] No peerId for socket ${socket.id}`);
                return;
            }

            gameState.choices.set(playerPeerId, choice);
            console.log(`[RPS] Choices so far:`, Array.from(gameState.choices.entries()));

            const peerIds = Array.from(roomMap.values());
            const allChoicesFilled = peerIds.every(pid => gameState.choices.has(pid));
            console.log(`[RPS] All choices filled: ${allChoicesFilled}, peerIds: ${peerIds}`);
            
            if (allChoicesFilled && !gameState.ready) {
                gameState.ready = true;

                const choicesObj = {};
                peerIds.forEach(pid => {
                    choicesObj[pid] = gameState.choices.get(pid);
                });

                const peerId1 = peerIds[0];
                const peerId2 = peerIds[1];
                const choice1 = choicesObj[peerId1];
                const choice2 = choicesObj[peerId2];

                const result = determineWinner(choice1, choice2, peerId1, peerId2);
                console.log(`[RPS] Result: ${JSON.stringify(result)}, emitting to room ${roomName}`);

                io.to(roomName).emit('rpsResult', {
                    roomName,
                    choices: choicesObj,
                    winner: result.winner,
                    winPeerId: result.winPeerId
                });

                setTimeout(() => {
                    gameState.choices.clear();
                    gameState.ready = false;
                    io.to(roomName).emit('rpsReset', { roomName });
                }, 5000);
            }
        });

        // ===== DISCONNECT =====
        socket.on('disconnect', () => {
            console.log('Người dùng đã ngắt kết nối:', socket.id);
            const rooms = Array.from(socket.rooms).filter(room => room !== socket.id);
            rooms.forEach(roomName => {
                const roomMap = roomPeers.get(roomName);
                if (roomMap) {
                    roomMap.delete(socket.id);
                    const allPeerIds = Array.from(roomMap.values());
                    io.to(roomName).emit('remotePeers', { roomName, allPeerIds });

                    if (roomMap.size === 0) {
                        roomPeers.delete(roomName);
                        if (gameStates.has(roomName)) {
                            gameStates.delete(roomName);
                        }
                    }
                }
            });
        });
    });
};

module.exports = {
    initializeSocketHandlers,
    roomPeers,
    gameStates
};
