// Định tuyến cho API
const express = require('express');
const path = require('path');
const { register, login, authenticateToken } = require('./auth');
const { upload, handleUpload } = require('./fileUpload');

const initializeRoutes = (app) => {
    // ===== Auth Routes =====
    app.post('/register', register);
    app.post('/login', login);

    // ===== Upload Routes =====
    app.post('/upload', authenticateToken, upload.single('file'), handleUpload);

    // ===== Serve Pages =====
    app.get('/', (req, res) => {
        res.sendFile(path.join(__dirname, '../public', 'index.html'));
    });

    app.get('/login', (req, res) => {
        res.sendFile(path.join(__dirname, '../public', 'login.html'));
    });

    app.get('/register', (req, res) => {
        res.sendFile(path.join(__dirname, '../public', 'register.html'));
    });
};

module.exports = {
    initializeRoutes
};
