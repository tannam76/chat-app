// Các hàm tiện ích cho chat
const db = require('../db');

// Lưu tin nhắn vào database
const saveMessage = (content, sender, roomName, isFile, isVoice, duration, io) => {
    db.query(
        'INSERT INTO messages (content, sender, room_id, is_file, is_voice, duration, timestamp) VALUES (?, ?, (SELECT id FROM rooms WHERE name = ?), ?, ?, ?, NOW())',
        [content, sender, roomName, !!isFile, !!isVoice, duration || null],
        (err) => {
            if (err) {
                console.error('Lỗi lưu tin nhắn:', err);
                return;
            }

            const timestamp = new Date();
            const messageToSend = {
                content: content,
                sender: sender,
                timestamp: timestamp,
                roomName: roomName,
                isFile: Boolean(isFile),
                isVoice: Boolean(isVoice),
                duration: isVoice ? (duration || 0) : undefined
            };

            io.to(roomName).emit('chatMessage', messageToSend);
            io.to(roomName).emit('notification', { 
                message: `Tin nhắn mới từ ${sender}` 
            });
        }
    );
};

// Tính thắng thua RPS
const determineWinner = (choice1, choice2, peerId1, peerId2) => {
    if (choice1 === choice2) {
        return { winner: 'tie', winPeerId: null };
    }
    const wins = {
        rock: 'scissors',
        scissors: 'paper',
        paper: 'rock'
    };
    if (wins[choice1] === choice2) {
        return { winner: 'player1', winPeerId: peerId1 };
    } else {
        return { winner: 'player2', winPeerId: peerId2 };
    }
};

module.exports = {
    saveMessage,
    determineWinner
};
