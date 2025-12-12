// Xử lý upload file
const multer = require('multer');
const { CONFIG } = require('./config');

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, CONFIG.UPLOAD_DIR),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});

const upload = multer({
    storage,
    limits: { fileSize: CONFIG.MAX_FILE_SIZE },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Chỉ hỗ trợ file ảnh!'), false);
        }
    }
});

const handleUpload = (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Không có file được tải lên' });
    const filePath = `/uploads/${req.file.filename}`;
    res.json({ filePath });
};

module.exports = {
    upload,
    handleUpload
};
