const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const path = require('path');
const { getLocalIP } = require('./utils/helpers');

// Import routes
const authRoutes = require('./routes/auth');
const uploadRoutes = require('./routes/upload');
const pagesRoutes = require('./routes/pages');

// Import socket handlers
const initSocket = require('./sockets/handlers');

// Serve static files từ thư mục public
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Sử dụng routes
app.use(authRoutes);
app.use(uploadRoutes);
app.use(pagesRoutes);

// Khởi tạo Socket.IO handlers
initSocket(io);

// Khởi động server
const PORT = process.env.PORT || 5000;
http.listen(PORT, '0.0.0.0', () => {
    console.log(`Server đang chạy trên cổng ${PORT}`);
    console.log(`Truy cập: http://${getLocalIP()}:${PORT}`);
});