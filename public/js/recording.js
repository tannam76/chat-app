// Xử lý ghi âm thoại
const initRingtone = () => {
    const { ringtoneAudio } = window.appState.recording;
    window.appState.recording.ringtoneAudio = new Audio('/ringtone.mp3');
    window.appState.recording.ringtoneAudio.loop = true;
    window.appState.recording.ringtoneAudio.volume = 0.5;

    window.appState.recording.ringtoneAudio.addEventListener('play', () => {
        window.appState.recording.isRingtonePlaying = true;
        console.log('Chuông bắt đầu phát');
    });
    window.appState.recording.ringtoneAudio.addEventListener('pause', () => {
        window.appState.recording.isRingtonePlaying = false;
        console.log('Chuông dừng phát');
    });
};

const playRingtone = () => {
    const { ringtoneAudio, isRingtonePlaying } = window.appState.recording;
    if (ringtoneAudio && !isRingtonePlaying) {
        ringtoneAudio.play().catch(err => {
            console.error('Không thể phát âm thanh:', err);
        });
    }
};

const stopRingtone = () => {
    const { ringtoneAudio, isRingtonePlaying } = window.appState.recording;
    if (ringtoneAudio && isRingtonePlaying) {
        ringtoneAudio.pause();
        ringtoneAudio.currentTime = 0;
        console.log('Dừng chuông thành công');
    }
};

const requestMicPermission = async () => {
    const { micPermissionGranted } = window.appState.recording;
    if (micPermissionGranted) return true;
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(t => t.stop());
        window.appState.recording.micPermissionGranted = true;
        alert('Đã cấp quyền micro! Giờ bạn có thể nhấn giữ để ghi âm');
        return true;
    } catch (err) {
        alert('Không thể truy cập micro!\n\nBẮT BUỘC:\n• Mở bằng http://localhost:5000\n• Hoặc dùng ngrok (HTTPS)');
        return false;
    }
};

const startRecording = async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        window.appState.recording.mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
        window.appState.recording.audioChunks = [];

        window.appState.recording.mediaRecorder.ondataavailable = e => {
            window.appState.recording.audioChunks.push(e.data);
        };
        window.appState.recording.mediaRecorder.onstop = () => {
            const blob = new Blob(window.appState.recording.audioChunks, { type: 'audio/webm' });
            sendVoiceMessage(blob);
            stream.getTracks().forEach(t => t.stop());
        };

        window.appState.recording.mediaRecorder.start();
        window.appState.recording.recordingStartTime = Date.now();
        
        const recordingOverlay = document.getElementById('recordingOverlay');
        const recordingTime = document.getElementById('recordingTime');
        
        recordingOverlay.style.display = 'flex';

        const timer = setInterval(() => {
            const elapsed = Math.floor((Date.now() - window.appState.recording.recordingStartTime) / 1000);
            const m = String(Math.floor(elapsed / 60)).padStart(2, '0');
            const s = String(elapsed % 60).padStart(2, '0');
            if (recordingTime) recordingTime.textContent = `${m}:${s}`;
        }, 100);

        window.appState.recording.mediaRecorder.addEventListener('stop', () => clearInterval(timer), { once: true });

    } catch (err) {
        console.error('Lỗi ghi âm:', err);
        alert('Không thể ghi âm!');
    }
};

const stopRecording = () => {
    const { mediaRecorder } = window.appState.recording;
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
        const recordingOverlay = document.getElementById('recordingOverlay');
        if (recordingOverlay) recordingOverlay.style.display = 'none';
    }
};

const sendVoiceMessage = (blob) => {
    const { socket } = window.appState;
    const { peerId } = window.appState.peer;
    
    const reader = new FileReader();
    reader.onload = () => {
        const base64 = reader.result.split(',')[1];
        const duration = Math.floor((Date.now() - window.appState.recording.recordingStartTime) / 1000);
        socket.socket.emit('chatMessage', {
            content: base64,
            sender: socket.sender,
            roomName: socket.joinedRoom || 'general',
            isVoice: true,
            duration
        });
    };
    reader.readAsDataURL(blob);
};

export {
    initRingtone,
    playRingtone, requestMicPermission, sendVoiceMessage, startRecording,
    stopRecording, stopRingtone
};

