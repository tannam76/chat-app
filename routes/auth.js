const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const SECRET_KEY = process.env.JWT_SECRET || 'your_secret_key';

// Route đăng ký
router.post('/register', (req, res) => {
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
router.post('/login', (req, res) => {
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

module.exports = router;