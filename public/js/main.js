// Main initialization file
document.addEventListener('DOMContentLoaded', async () => {
    // Wait for Socket.IO client to be ready
    while (typeof io === 'undefined') {
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Import all modules (mảng global objects)
    window.uiModule = await import('./ui.js');
    window.videoModule = await import('./video.js');
    window.recordingModule = await import('./recording.js');
    window.chatModule = await import('./chat.js');
    window.gameModule = await import('./game.js');
    window.socketModule = await import('./socket.js');

    // Initialize app state
    window.appState = {
        socket: {
            socket: io(),
            sender: localStorage.getItem('username') || 'Ẩn danh',
            joinedRoom: null,
            isInRoom: false
        },
        video: {
            isCameraOn: true,
            isMicOn: true,
            currentCall: null,
            incomingCall: null,
            localStream: null,
            currentRemotePeerId: null
        },
        game: {
            myChoice: null,
            rpsResult: null
        },
        peer: {
            peer: new Peer(),
            peerId: null
        },
        recording: {
            mediaRecorder: null,
            audioChunks: [],
            recordingStartTime: 0,
            recordingTimer: null,
            isRingtonePlaying: false,
            micPermissionGranted: false,
            ringtoneAudio: null
        }
    };

    // Setup socket events
    window.socketModule.setupSocketEvents();

    // Start video
    await window.videoModule.startLocalStream();
    window.uiModule.updateToggleButtons();

    // Initialize ringtone
    window.recordingModule.initRingtone();

    // Setup event listeners for room
    const roomInput = document.getElementById('roomInput');
    const joinBtn = document.getElementById('joinBtn');
    const leaveBtn = document.getElementById('leaveRoomBtn');
    
    roomInput.value = localStorage.getItem('currentRoom') || '';
    
    if (joinBtn) {
        joinBtn.addEventListener('click', () => window.chatModule.joinRoom());
    }
    
    if (leaveBtn) {
        leaveBtn.addEventListener('click', () => window.chatModule.leaveRoom());
    }

    // Setup message sending
    const messageInput = document.getElementById('messageInput');
    const sendBtn = document.getElementById('sendBtn');
    if (sendBtn) {
        sendBtn.addEventListener('click', () => window.chatModule.sendMessage());
    }
    if (messageInput) {
        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') window.chatModule.sendMessage();
        });
    }

    // Setup file upload
    const fileBtn = document.getElementById('fileBtn');
    if (fileBtn) {
        fileBtn.addEventListener('click', () => window.chatModule.sendFile());
    }

    // Setup call buttons
    const startCallBtn = document.getElementById('startCallBtn');
    const acceptCallBtn = document.getElementById('acceptCallBtn');
    const rejectCallBtn = document.getElementById('rejectCallBtn');
    const endCallBtn = document.getElementById('endCallBtn');
    
    if (startCallBtn) {
        startCallBtn.addEventListener('click', () => window.videoModule.startCall());
    }
    if (acceptCallBtn) {
        acceptCallBtn.addEventListener('click', () => window.videoModule.acceptCall());
    }
    if (rejectCallBtn) {
        rejectCallBtn.addEventListener('click', () => window.videoModule.rejectCall());
    }
    if (endCallBtn) {
        endCallBtn.addEventListener('click', () => window.videoModule.endCall());
    }

    // Setup RPS game
    const resetRPSBtn = document.getElementById('resetRPSBtn');
    if (resetRPSBtn) {
        resetRPSBtn.addEventListener('click', () => window.gameModule.resetRPS());
    }

    // Setup voice recording
    const voiceRecordBtn = document.getElementById('voiceRecordBtn');
    if (voiceRecordBtn) {
        voiceRecordBtn.addEventListener('mousedown', async (e) => {
            const hasPermission = window.appState.recording.micPermissionGranted;
            if (!hasPermission) {
                const granted = await window.recordingModule.requestMicPermission();
                if (!granted) {
                    e.preventDefault();
                    return;
                }
            }
            window.recordingModule.startRecording();
        });
        voiceRecordBtn.addEventListener('mouseup', () => window.recordingModule.stopRecording());
        voiceRecordBtn.addEventListener('mouseleave', () => window.recordingModule.stopRecording());
        voiceRecordBtn.addEventListener('touchstart', async (e) => {
            e.preventDefault();
            const hasPermission = window.appState.recording.micPermissionGranted;
            if (!hasPermission) {
                const granted = await window.recordingModule.requestMicPermission();
                if (!granted) return;
            }
            window.recordingModule.startRecording();
        });
        voiceRecordBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            window.recordingModule.stopRecording();
        });
    }

    // Expose global functions for inline handlers
    window.joinRoom = () => window.chatModule.joinRoom();
    window.leaveRoom = () => window.chatModule.leaveRoom();
    window.sendMessage = () => window.chatModule.sendMessage();
    window.sendFile = () => window.chatModule.sendFile();
    window.toggleCamera = () => {
        window.videoModule.toggleCamera();
        window.uiModule.updateToggleButtons();
    };
    window.toggleMic = () => {
        window.videoModule.toggleMic();
        window.uiModule.updateToggleButtons();
    };
    window.startCall = () => window.videoModule.startCall();
    window.acceptCall = () => window.videoModule.acceptCall();
    window.rejectCall = () => window.videoModule.rejectCall();
    window.endCall = () => window.videoModule.endCall();
    window.sendRPSChoice = (choice) => window.gameModule.sendRPSChoice(choice);
    window.updateRPSUI = () => window.uiModule.updateRPSUI();
    window.logout = () => {
        localStorage.clear();
        window.location.href = '/login';
    };

    console.log('App initialized successfully!');
});
