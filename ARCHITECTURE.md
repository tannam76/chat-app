# 🎯 Cấu trúc Dự án - Chat & Video Call

## 📁 Cấu trúc Thư mục

```
codecavt/
├── src/                          # Backend modules
│   ├── config.js                # Cấu hình chung
│   ├── auth.js                  # Xữ lý authentication (login/register)
│   ├── fileUpload.js            # Cấu hình upload file
│   ├── chatUtils.js             # Hàm tiện ích chat (saveMessage, RPS logic)
│   ├── socketHandlers.js        # Socket.IO event handlers
│   ├── routes.js                # API routes
│   └── db.js                    # Kết nối database (không thay đổi)
│
├── public/
│   ├── js/                       # Frontend modules (ES6)
│   │   ├── state.js             # State management
│   │   ├── ui.js                # UI updates (updateRoomUI, displayMessage, etc)
│   │   ├── video.js             # Video/call logic (startCall, endCall, etc)
│   │   ├── recording.js         # Voice recording (startRecording, playRingtone, etc)
│   │   ├── chat.js              # Chat functions (joinRoom, sendMessage, etc)
│   │   ├── game.js              # RPS game logic (sendRPSChoice, resetRPS)
│   │   ├── socket.js            # Socket event setup
│   │   └── main.js              # Entry point (khởi tạo app)
│   │
│   ├── index.html               # Main page
│   ├── login.html               # Login page
│   ├── register.html            # Register page
│   ├── style.css                # Styles
│   ├── client.js                # OLD - Sẽ được thay thế bởi js/ modules
│   └── uploads/                 # Upload directory
│
├── server.js                    # Server entry point (rất sạch)
├── package.json
├── db.js                        # Database setup
└── chat_app.sql                 # Database schema
```

## 🔧 Mô tả Các Modules

### Backend (Node.js)

#### `src/config.js`
- Quản lý cấu hình chung (PORT, SECRET_KEY, FILE_SIZE, etc)
- Helper: `getLocalIP()`

#### `src/auth.js`
- `register()` - Xử lý đăng ký user
- `login()` - Xử lý đăng nhập
- `authenticateToken` - Middleware JWT

#### `src/fileUpload.js`
- Thiết lập Multer storage
- `handleUpload()` - Xử lý upload file

#### `src/chatUtils.js`
- `saveMessage()` - Lưu tin nhắn vào DB
- `determineWinner()` - Tính thắng thua RPS

#### `src/socketHandlers.js`
- Tất cả Socket.IO events (joinRoom, leaveRoom, chatMessage, playRPS, etc)
- Global state: `roomPeers`, `gameStates`

#### `src/routes.js`
- Định tuyến API: POST /register, /login, /upload
- Serve HTML pages

#### `server.js`
- Sạch, chỉ import và khởi tạo modules
- ~25 dòng code!

---

### Frontend (Browser)

#### `js/ui.js`
- `updateRoomUI()` - Cập nhật trạng thái room
- `updateToggleButtons()` - Cập nhật nút camera/mic
- `updateRPSUI()` - Cập nhật UI game
- `displayMessage()` - Hiển thị tin nhắn
- `displayRPSResult()` - Hiển thị kết quả RPS

#### `js/video.js`
- `startLocalStream()` - Bật camera/mic
- `toggleCamera()`, `toggleMic()` - Bật/tắt thiết bị
- `startCall()`, `acceptCall()`, `rejectCall()` - Quản lý gọi
- `endCall()` - Kết thúc gọi

#### `js/recording.js`
- `initRingtone()` - Khởi tạo âm thanh chuông
- `playRingtone()`, `stopRingtone()` - Quản lý chuông
- `startRecording()`, `stopRecording()` - Ghi âm thoại
- `sendVoiceMessage()` - Gửi tin nhắn thoại
- `requestMicPermission()` - Xin quyền micro

#### `js/chat.js`
- `joinRoom()` - Tham gia phòng
- `leaveRoom()` - Rời phòng
- `sendMessage()` - Gửi tin nhắn text
- `sendFile()` - Gửi file/ảnh

#### `js/game.js`
- `sendRPSChoice()` - Gửi lựa chọn RPS
- `resetRPS()` - Reset game

#### `js/socket.js`
- `setupSocketEvents()` - Tất cả Socket event listeners
  - chatHistory, chatMessage, remotePeers
  - rpsResult, rpsReset
  - endCallRemote, notification
  - Peer events (open, call, error)

#### `js/main.js`
- Khởi tạo app state
- Import tất cả modules
- Setup event listeners
- Expose global functions (vì HTML vẫn dùng onclick/onkeypress)

---

## 🚀 Cách Chạy

```bash
npm install
npm start

# Truy cập: http://localhost:5000
```

## 📊 Ưu Điểm Cấu Trúc Mới

| Vấn đề Cũ | Giải Pháp |
|-----------|----------|
| `server.js` 361 dòng | Tách thành modules, server.js chỉ ~25 dòng |
| `client.js` 665 dòng | Tách thành 7 module, mỗi ~80-100 dòng |
| Code lẫn lộn | Mỗi module có 1 trách nhiệm rõ ràng |
| Khó tìm function | Biết module nào => tìm nhanh |
| Khó mở rộng | Thêm feature mới vào module tương ứng |
| Khó test | Mỗi module độc lập, dễ test |

## 📝 Hướng Dẫn Thêm Feature

### Thêm Socket Event Mới
1. Mở `src/socketHandlers.js`
2. Thêm handler vào `initializeSocketHandlers(io)`

### Thêm API Endpoint
1. Tạo hàm xử lý trong module tương ứng (ví dụ `src/chat.js`)
2. Thêm route vào `src/routes.js`

### Thêm UI Component
1. Thêm render logic vào `js/ui.js`
2. Gọi function từ module tương ứng

### Thêm Video Feature
1. Mở `js/video.js`
2. Thêm function và export
3. Gọi từ `main.js` event listener

---

## 🔐 Bảo Mật

- JWT token 1 giờ expiration
- Password hash với bcryptjs
- File upload filter (chỉ image)
- CORS bật sẵn cho Socket.IO

---

## 📱 Tương Thích

- ✅ Desktop (Chrome, Firefox, Safari, Edge)
- ✅ Mobile (Chrome, Safari iOS)
- ✅ HTTPS (cần cho getUserMedia)
- ✅ Ngrok (HTTPS tunnel)

---

## 🐛 Debug

```javascript
// Trong DevTools console
window.appState                 // Xem state
window.uiModule.updateRoomUI()  // Test function
window.socketModule             // Xem socket events
```

---

## 📚 File Lưu Ý

- `package.json` - Không thay đổi
- `db.js` - Kết nối MySQL, không di chuyển
- `chat_app.sql` - Schema database
- `public/login.html`, `register.html` - Chưa sửa (còn dùng inline JS)

---

**Tạo bởi:** Code Refactor Assistant  
**Ngày:** Tháng 12, 2025
