// Xử lý authentication
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { CONFIG } = require('./config');

// Middleware xác thực JWT
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token' });
    
    jwt.verify(token, CONFIG.SECRET_KEY, (err, user) => {
        if (err) return res.status(403).json({ error: 'Invalid token' });
        req.user = user;
        next();
    });
};

// Đăng ký người dùng
const register = (req, res) => {
    const { username, password } = req.body;
    bcrypt.hash(password, 10, (err, hash) => {
        if (err) return res.status(500).json({ error: 'Lỗi hash mật khẩu' });
        
        db.query('INSERT INTO users (username, password) VALUES (?, ?)', [username, hash], (err) => {
            if (err) return res.status(500).json({ error: 'Tài khoản đã tồn tại hoặc lỗi khác' });
            res.json({ message: 'Đăng ký thành công' });
        });
    });
};

// Đăng nhập
const login = (req, res) => {
    const { username, password } = req.body;
    db.query('SELECT * FROM users WHERE username = ?', [username], (err, results) => {
        if (err || !results.length) return res.status(401).json({ error: 'Tài khoản không tồn tại' });
        
        const user = results[0];
        bcrypt.compare(password, user.password, (err, match) => {
            if (!match) return res.status(401).json({ error: 'Mật khẩu sai' });
            
            const token = jwt.sign(
                { id: user.id, username: user.username },
                CONFIG.SECRET_KEY,
                { expiresIn: CONFIG.JWT_EXPIRATION }
            );
            res.json({ token, username });
        });
    });
};

module.exports = {
    authenticateToken,
    register,
    login
};
