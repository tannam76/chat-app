const express = require('express');
const router = express.Router();
const authenticateToken = require('../middlewares/auth');
const { upload } = require('../utils/multer');

// Route upload file
router.post('/upload', authenticateToken, upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Không có file được tải lên' });
    const filePath = `/uploads/${req.file.filename}`;
    res.json({ filePath });
});

module.exports = router;