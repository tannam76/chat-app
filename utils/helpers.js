const db = require('../config/db');

function saveMessage(content, sender, roomName, isFile, isVoice, duration, io, roomNameParam) {
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
                roomName: roomNameParam,
                isFile: Boolean(isFile),
                isVoice: Boolean(isVoice),
                duration: isVoice ? (duration || 0) : undefined
            };

            io.to(roomNameParam).emit('chatMessage', messageToSend);
            io.to(roomNameParam).emit('notification', { 
                message: `Tin nhắn mới từ ${sender}` 
            });
        }
    );
}

function determineWinner(choice1, choice2, peerId1, peerId2) {
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
}

function getLocalIP() {
    const os = require('os');
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return 'localhost';
}

module.exports = { saveMessage, determineWinner, getLocalIP };