// Cấu hình chung
const path = require('path');
const os = require('os');

const CONFIG = {
    PORT: process.env.PORT || 5000,
    SECRET_KEY: process.env.JWT_SECRET || 'your_secret_key',
    UPLOAD_DIR: 'public/uploads/',
    MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
    JWT_EXPIRATION: '1h'
};

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

module.exports = {
    CONFIG,
    getLocalIP
};
