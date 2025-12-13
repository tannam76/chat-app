// ===== VIDEO FUNCTIONS =====
function updateToggleButtons() {
    const cameraBtn = document.getElementById('cameraBtn');
    const micBtn = document.getElementById('micBtn');
    
    if (localStream) {
        cameraBtn.disabled = false;
        micBtn.disabled = false;
        cameraBtn.textContent = isCameraOn ? '📷' : '📷❌';
        micBtn.textContent = isMicOn ? '🎤' : '🎤❌';
        cameraBtn.title = 'Tắt/Bật Camera';
        micBtn.title = 'Tắt/Bật Mic';
    } else {
        cameraBtn.disabled = true;
        micBtn.disabled = true;
        cameraBtn.textContent = '📷';
        micBtn.textContent = '🎤';
        cameraBtn.title = 'Đang khởi tạo camera...';
        micBtn.title = 'Đang khởi tạo mic...';
    }
}

async function startLocalStream() {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ 
            video: true, 
            audio: true 
        });
        localVideo.srcObject = localStream;
        console.log('Local stream started');
        
        isCameraOn = true;
        isMicOn = true;
        updateToggleButtons();
    } catch (err) {
        console.error('Error accessing media devices:', err);
        alert('Không thể truy cập camera/micro. Vui lòng kiểm tra quyền truy cập thiết bị.');
        updateToggleButtons();
    }
}

function toggleCamera() {
    if (localStream) {
        const videoTrack = localStream.getVideoTracks()[0];
        if (videoTrack) {
            videoTrack.enabled = !videoTrack.enabled;
            isCameraOn = videoTrack.enabled;
            updateToggleButtons();
        }
    }
}

function toggleMic() {
    if (localStream) {
        const audioTrack = localStream.getAudioTracks()[0];
        if (audioTrack) {
            audioTrack.enabled = !audioTrack.enabled;
            isMicOn = audioTrack.enabled;
            updateToggleButtons();
        }
    }
}

function startCall() {
    if (!currentRemotePeerId || !localStream) {
        alert('Không có đối thủ hoặc camera chưa sẵn sàng!');
        return;
    }
    currentCall = peer.call(currentRemotePeerId, localStream);
    currentCall.on('stream', (remoteStream) => {
        remoteVideo.srcObject = remoteStream;
        console.log('Receiving remote stream');
    });
    currentCall.on('close', () => {
        endCall();
    });
    document.getElementById('endCallBtn').style.display = 'inline-block';
    document.getElementById('startCallBtn').style.display = 'none';
}

function acceptCall() {
    if (!incomingCall || !localStream) {
        alert('Không có cuộc gọi đến hoặc camera chưa sẵn sàng!');
        return;
    }
    stopRingtone();
    document.getElementById('incomingCallControls').style.display = 'none';
    incomingCall.answer(localStream);
    currentCall = incomingCall;
    currentCall.on('stream', (remoteStream) => {
        remoteVideo.srcObject = remoteStream;
        console.log('Receiving remote stream');
    });
    currentCall.on('close', () => {
        endCall();
    });
    document.getElementById('endCallBtn').style.display = 'inline-block';
    incomingCall = null;
}

function rejectCall() {
    stopRingtone();
    document.getElementById('incomingCallControls').style.display = 'none';
    if (incomingCall) {
        incomingCall.close();
        incomingCall = null;
    }
}

function endCall() {
    if (currentCall) {
        currentCall.close();
        currentCall = null;
    }
    remoteVideo.srcObject = null;
    document.getElementById('endCallBtn').style.display = 'none';
    document.getElementById('startCallBtn').style.display = 'inline-block';
    document.getElementById('incomingCallControls').style.display = 'none';
    stopRingtone();
    console.log('Call ended');
}
