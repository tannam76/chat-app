const db = require('../config/db');
const { saveMessage, determineWinner } = require('../utils/helpers');

const roomPeers = new Map(); // roomName -> Map<socket.id, peerId>
const gameStates = new Map(); // roomName -> { choices: Map<peerId, choice>, ready: false }

function initSocket(io) {
    io.on('connection', (socket) => {
        console.log('Một người dùng đã kết nối:', socket.id);

        // Xử lý tham gia phòng
        socket.on('joinRoom', (roomName) => {
            // Rời tất cả room cũ
            socket.rooms.forEach(room => {
                if (room !== socket.id) socket.leave(room);
            });
            socket.join(roomName);

            // Khởi tạo map cho room nếu chưa có
            if (!roomPeers.has(roomName)) {
                roomPeers.set(roomName, new Map());
            }

            // Emit lịch sử chat
            db.query('SELECT content, sender, timestamp, is_file, is_voice, duration FROM messages WHERE room_id = (SELECT id FROM rooms WHERE name = ?) ORDER BY timestamp', [roomName], (err, results) => {
                if (err) return console.error('Lỗi lấy tin nhắn:', err);

                // Format lại để client nhận đúng kiểu
                const formattedHistory = results.map(msg => ({
                    content: msg.content,
                    sender: msg.sender,
                    timestamp: msg.timestamp,
                    roomName: roomName,
                    isFile: Boolean(msg.is_file),
                    isVoice: Boolean(msg.is_voice),
                    duration: msg.duration
                }));

                socket.emit('chatHistory', { roomName, history: formattedHistory });
            });
        });

        // Xử lý chat message
        socket.on('chatMessage', (msg) => {
            const { content, sender, roomName, isFile, isVoice, duration } = msg;
            saveMessage(content, sender, roomName, isFile, isVoice, duration, io, roomName);
        });

        // Xử lý upload file (qua socket nếu cần, nhưng hiện tại dùng route HTTP)
        // Nếu bạn muốn xử lý qua socket, thêm ở đây

        // Xử lý voice message (tương tự chatMessage)

        // Xử lý signaling cho video call: offer, answer, ice-candidate
        socket.on('offer', (data) => {
            io.to(data.roomName).emit('offer', data);
        });

        socket.on('answer', (data) => {
            io.to(data.roomName).emit('answer', data);
        });

        socket.on('ice-candidate', (data) => {
            io.to(data.roomName).emit('ice-candidate', data);
        });

        // Xử lý peer-id
        socket.on('peer-id', (data) => {
            const { roomName, peerId } = data;
            const roomMap = roomPeers.get(roomName);
            if (roomMap) {
                roomMap.set(socket.id, peerId);
                const allPeerIds = Array.from(roomMap.values());
                io.to(roomName).emit('remotePeers', { roomName, allPeerIds });
                console.log(`Updated allPeers in ${roomName}:`, allPeerIds);
            }
        });

        // Xử lý RPS choice
        socket.on('rpsChoice', (data) => {
            const { roomName, peerId, choice } = data;
            if (!gameStates.has(roomName)) {
                gameStates.set(roomName, { choices: new Map(), ready: false });
            }
            const gameState = gameStates.get(roomName);
            gameState.choices.set(peerId, choice);

            // Kiểm tra nếu cả hai đã chọn
            const roomMap = roomPeers.get(roomName);
            if (!roomMap) return;
            const peerIds = Array.from(roomMap.values());
            const allChoicesFilled = peerIds.every(pid => gameState.choices.has(pid));
            if (allChoicesFilled && !gameState.ready) {
                gameState.ready = true;

                // Mapping choices
                const choicesObj = {};
                peerIds.forEach(pid => {
                    choicesObj[pid] = gameState.choices.get(pid);
                });

                // Lấy 2 peerIds
                const peerId1 = peerIds[0];
                const peerId2 = peerIds[1];
                const choice1 = choicesObj[peerId1];
                const choice2 = choicesObj[peerId2];

                // Tính kết quả
                const result = determineWinner(choice1, choice2, peerId1, peerId2);
                console.log(`RPS result in ${roomName}: choices=${JSON.stringify(choicesObj)}, winner=${result.winner}, winPeerId=${result.winPeerId}`);

                // Broadcast kết quả
                io.to(roomName).emit('rpsResult', {
                    roomName,
                    choices: choicesObj,
                    winner: result.winner,
                    winPeerId: result.winPeerId
                });

                // Reset state sau 5s
                setTimeout(() => {
                    gameState.choices.clear();
                    gameState.ready = false;
                    io.to(roomName).emit('rpsReset', { roomName });
                    console.log(`RPS reset in ${roomName}`);
                }, 5000);
            }
        });

        // Xử lý ngắt kết nối
        socket.on('disconnect', () => {
            console.log('Người dùng đã ngắt kết nối:', socket.id);
            const rooms = Array.from(socket.rooms).filter(room => room !== socket.id);
            rooms.forEach(roomName => {
                const roomMap = roomPeers.get(roomName);
                if (roomMap) {
                    roomMap.delete(socket.id);
                    const allPeerIds = Array.from(roomMap.values());
                    io.to(roomName).emit('remotePeers', { roomName, allPeerIds });
                    console.log(`Updated allPeers after disconnect in ${roomName}:`, allPeerIds);

                    // Xóa game state nếu room rỗng
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
}

module.exports = initSocket;