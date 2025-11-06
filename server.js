const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const path = require('path');
const mysql = require('mysql2');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const os = require('os');
const SECRET_KEY = process.env.JWT_SECRET || 'your_secret_key'; // Sử dụng env cho an toàn

// Thiết lập Multer với filter (chỉ image, max 5MB)
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'public/uploads/'),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Chỉ hỗ trợ file ảnh!'), false);
        }
    }
});

// Thiết lập kết nối MySQL Pool
const db = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'chat_app',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

db.getConnection((err) => {
    if (err) {
        console.error('Lỗi kết nối MySQL:', err);
        return;
    }
    console.log('Đã kết nối với MySQL');
});

// Middleware JWT
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token' });
    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.status(403).json({ error: 'Invalid token' });
        req.user = user;
        next();
    });
};

// Serve static files từ thư mục public
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Route đăng ký
app.post('/register', (req, res) => {
    const { username, password } = req.body;
    bcrypt.hash(password, 10, (err, hash) => {
        if (err) return res.status(500).json({ error: 'Lỗi hash mật khẩu' });
        db.query('INSERT INTO users (username, password) VALUES (?, ?)', [username, hash], (err) => {
            if (err) return res.status(500).json({ error: 'Tài khoản đã tồn tại hoặc lỗi khác' });
            res.json({ message: 'Đăng ký thành công' });
        });
    });
});

// Route đăng nhập
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    db.query('SELECT * FROM users WHERE username = ?', [username], (err, results) => {
        if (err || !results.length) return res.status(401).json({ error: 'Tài khoản không tồn tại' });
        const user = results[0];
        bcrypt.compare(password, user.password, (err, match) => {
            if (!match) return res.status(401).json({ error: 'Mật khẩu sai' });
            const token = jwt.sign({ id: user.id, username: user.username }, SECRET_KEY, { expiresIn: '1h' });
            res.json({ token, username });
        });
    });
});

// Route upload file (protect bằng JWT)
app.post('/upload', authenticateToken, upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Không có file được tải lên' });
    const filePath = `/uploads/${req.file.filename}`;
    res.json({ filePath });
});

// Serve các trang
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

// Socket.IO xử lý chat và video signaling
const roomPeers = new Map(); // Global map: roomName -> Map<socket.id, peerId>
const gameStates = new Map(); // roomName -> { choices: Map<peerId, choice>, ready: false }

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
        db.query('SELECT content, sender, timestamp, is_file FROM messages WHERE room_id = (SELECT id FROM rooms WHERE name = ?) ORDER BY timestamp', [roomName], (err, results) => {
            if (err) return console.error('Lỗi lấy tin nhắn:', err);
            socket.emit('chatHistory', results);
        });

        // Emit TOÀN BỘ allPeerIds (client sẽ filter self)
        const roomMap = roomPeers.get(roomName);
        const allPeerIds = Array.from(roomMap.values());
        socket.emit('remotePeers', { roomName, allPeerIds });
        console.log(`User ${socket.id} joined ${roomName}, allPeers:`, allPeerIds);
    });

    // Xử lý rời phòng
    socket.on('leaveRoom', (roomName) => {
        if (socket.rooms.has(roomName)) {
            socket.leave(roomName);
            const roomMap = roomPeers.get(roomName);
            if (roomMap) {
                roomMap.delete(socket.id);
                const allPeerIds = Array.from(roomMap.values());
                io.to(roomName).emit('remotePeers', { roomName, allPeerIds });
                console.log(`User ${socket.id} left ${roomName}, updated peers:`, allPeerIds);
            }
            // Nếu room rỗng, có thể xóa map (tùy chọn)
            if (roomMap && roomMap.size === 0) {
                roomPeers.delete(roomName);
            }
        }
    });

    // Xử lý yêu cầu remote peers (cho client re-fetch sau end call)
    socket.on('requestRemotePeers', (roomName) => {
        if (socket.rooms.has(roomName)) {
            const roomMap = roomPeers.get(roomName);
            if (roomMap) {
                const allPeerIds = Array.from(roomMap.values());
                socket.emit('remotePeers', { roomName, allPeerIds });
                console.log(`Re-fetched remotePeers for ${socket.id} in ${roomName}:`, allPeerIds);
            }
        }
    });

    // Xử lý kết thúc cuộc gọi (broadcast đến room để đồng bộ)
    socket.on('endCall', (roomName) => {
        if (socket.rooms.has(roomName)) {
            io.to(roomName).emit('endCallRemote');
            console.log(`End call broadcasted to room ${roomName} from ${socket.id}`);
        }
    });

    // Nhận peer ID từ client và broadcast
    socket.on('peer-id', (peerId) => {
        socket.peerId = peerId;
        const rooms = Array.from(socket.rooms).filter(room => room !== socket.id);
        if (rooms.length > 0) {
            const roomName = rooms[0];
            const roomMap = roomPeers.get(roomName);
            if (roomMap) {
                roomMap.set(socket.id, peerId);
                // Emit TOÀN BỘ allPeerIds đến TẤT CẢ trong room (client filter self)
                const allPeerIds = Array.from(roomMap.values());
                io.to(roomName).emit('remotePeers', { roomName, allPeerIds });
                console.log(`Peer ID ${peerId} added to ${roomName}, broadcasted all:`, allPeerIds);
            }
        } else {
            console.log('No room joined yet for peer-id emit');
        }
    });

    // Xử lý tin nhắn chat
    socket.on('chatMessage', ({ content, sender, roomName, isFile }) => {
        db.query('SELECT id FROM rooms WHERE name = ?', [roomName], (err, results) => {
            if (err || !results.length) {
                db.query('INSERT INTO rooms (name) VALUES (?)', [roomName], (err) => {
                    if (err) return console.error('Lỗi tạo phòng:', err);
                    saveMessage(content, sender, roomName, isFile, io, roomName);
                });
            } else {
                saveMessage(content, sender, roomName, isFile, io, roomName);
            }
        });
    });

    // Xử lý game RPS
    socket.on('playRPS', ({ roomName, choice }) => {
        if (!socket.rooms.has(roomName)) return console.log('Không ở room:', socket.id);

        const roomMap = roomPeers.get(roomName);
        if (!roomMap || roomMap.size !== 2) {
            return console.log(`Không đủ 2 người chơi trong ${roomName}: ${roomMap?.size || 0}`);
        }

        // Khởi tạo game state nếu chưa có
        if (!gameStates.has(roomName)) {
            gameStates.set(roomName, { choices: new Map(), ready: false });
        }
        const gameState = gameStates.get(roomName);
        const playerPeerId = socket.peerId;
        if (!playerPeerId) return console.log('Không có peerId:', socket.id);

        // Lưu lựa chọn (override nếu chọn lại)
        gameState.choices.set(playerPeerId, choice);
        console.log(`Player ${playerPeerId} in ${roomName} chose: ${choice}`);

        // Kiểm tra nếu cả hai đã chọn
        const peerIds = Array.from(roomMap.values());
        const allChoicesFilled = peerIds.every(pid => gameState.choices.has(pid));
        if (allChoicesFilled && !gameState.ready) {
            gameState.ready = true;

            // Mapping choices theo peerId (chính xác, không phụ thuộc order)
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

            // Broadcast kết quả đến room (mỗi client sẽ filter cho mình)
            io.to(roomName).emit('rpsResult', {
                roomName,
                choices: choicesObj,
                winner: result.winner,  // 'player1', 'player2', hoặc 'tie'
                winPeerId: result.winPeerId  // peerId của người thắng (null nếu tie)
            });

            // Reset state sau 5s để chơi lại
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

// Hàm lưu tin nhắn (fix: thêm timestamp)
function saveMessage(content, sender, roomName, isFile, io, roomNameParam) {
    db.query('INSERT INTO messages (content, sender, room_id, is_file, timestamp) VALUES (?, ?, (SELECT id FROM rooms WHERE name = ?), ?, NOW())', [content, sender, roomName, isFile || false], (err) => {
        if (err) return console.error('Lỗi lưu tin nhắn:', err);
        const timestamp = new Date();
        io.to(roomNameParam).emit('chatMessage', { content, sender, timestamp, roomName: roomNameParam, isFile: isFile || false });
        // Notification thay vì alert (emit cho client handle)
        io.to(roomNameParam).emit('notification', { message: `Tin nhắn mới từ ${sender} trong phòng ${roomNameParam}` });
    });
}

// Hàm tính thắng thua RPS
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

// Khởi động server
const PORT = process.env.PORT || 5000;
http.listen(PORT, '0.0.0.0', () => {
    console.log(`Server đang chạy trên cổng ${PORT}`);
    console.log(`Truy cập: http://${getLocalIP()}:${PORT}`);
});

function getLocalIP() {
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
