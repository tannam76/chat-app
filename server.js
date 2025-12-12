const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const path = require('path');

// Import các module
const { CONFIG, getLocalIP } = require('./src/config');
const { initializeRoutes } = require('./src/routes');
const { initializeSocketHandlers } = require('./src/socketHandlers');

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Khởi tạo routes
initializeRoutes(app);

// Khởi tạo Socket.IO handlers
initializeSocketHandlers(io);

// Khởi động server
const PORT = CONFIG.PORT;
http.listen(PORT, '0.0.0.0', () => {
    console.log(`Server đang chạy trên cổng ${PORT}`);
    console.log(`Truy cập: http://${getLocalIP()}:${PORT}`);
});