// ===== KHỞI TẠO SOCKET VÀ PEER =====
const socket = io();
const peer = new Peer();

// Global states
let sender = localStorage.getItem('username') || 'Ẩn danh';
let peerId = null;
let joinedRoom = null;
let isInRoom = false;

// Video states
let isCameraOn = true;
let isMicOn = true;
let currentCall = null;
let incomingCall = null;
let ringtoneAudio = null;
let isRingtonePlaying = false;
let localStream = null;
let currentRemotePeerId = null;

// Game RPS states
let myRPSChoice = null;
let rpsResult = null;

// Voice recording states
let mediaRecorder = null;
let audioChunks = [];
let recordingStartTime = 0;
let recordingTimer = null;
let micPermissionGranted = false;

// DOM elements
const chatBox = document.getElementById('chatBox');
const messageInput = document.getElementById('messageInput');
const roomInput = document.getElementById('roomInput');
const remoteVideo = document.getElementById('remoteVideo');
const localVideo = document.getElementById('localVideo');
const voiceRecordBtn = document.getElementById('voiceRecordBtn');
const recordingOverlay = document.getElementById('recordingOverlay');
const recordingTime = document.getElementById('recordingTime');

// ===== RINGTONE FUNCTIONS =====
function initRingtone() {
    ringtoneAudio = new Audio('/ringtone.mp3');
    ringtoneAudio.loop = true;
    ringtoneAudio.volume = 0.5;
    
    ringtoneAudio.addEventListener('play', () => {
        isRingtonePlaying = true;
        console.log('Chuông bắt đầu phát');
    });
    ringtoneAudio.addEventListener('pause', () => {
        isRingtonePlaying = false;
        console.log('Chuông dừng phát');
    });
    ringtoneAudio.addEventListener('ended', () => {
        isRingtonePlaying = false;
        console.log('Chuông kết thúc');
    });
}

function playRingtone() {
    if (ringtoneAudio && !isRingtonePlaying) {
        ringtoneAudio.play().then(() => {
            console.log('Phát chuông thành công');
        }).catch(err => {
            console.error('Không thể phát âm thanh:', err);
        });
    }
}

function stopRingtone() {
    if (ringtoneAudio && isRingtonePlaying) {
        ringtoneAudio.pause();
        ringtoneAudio.currentTime = 0;
        console.log('Dừng chuông thành công');
    }
}

// ===== PEER EVENTS =====
peer.on('open', (id) => {
    peerId = id;
    console.log('My peer ID is: ' + id);
    if (joinedRoom) {
        socket.emit('peer-id', id);
    }
});

peer.on('call', (call) => {
    incomingCall = call;
    initRingtone();
    playRingtone();
    document.getElementById('incomingCallControls').style.display = 'flex';
    console.log('Incoming call from: ' + call.peer);
});

peer.on('error', (err) => {
    console.error('Peer error:', err);
    alert('Lỗi kết nối PeerJS: ' + err.type);
});

// ===== KHỞI TẠO KHI LOAD =====
function initializeApp() {
    initRingtone();
    updateToggleButtons();
    startLocalStream();
}

// Chạy khi trang load
window.addEventListener('load', initializeApp);
