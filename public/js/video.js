// Xử lý video và gọi
//update video
const startLocalStream = async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        const localVideo = document.getElementById('localVideo');
        localVideo.srcObject = stream;
        
        window.appState.video.localStream = stream;
        window.appState.video.isCameraOn = true;
        window.appState.video.isMicOn = true;
        
        console.log('Local stream started');
    } catch (err) {
        console.error('Error accessing media devices:', err);
        alert('Không thể truy cập camera/micro. Vui lòng kiểm tra quyền truy cập thiết bị.');
    }
};

const toggleCamera = () => {
    const { localStream } = window.appState.video;
    if (localStream) {
        const videoTrack = localStream.getVideoTracks()[0];
        if (videoTrack) {
            videoTrack.enabled = !videoTrack.enabled;
            window.appState.video.isCameraOn = videoTrack.enabled;
        }
    }
};

const toggleMic = () => {
    const { localStream } = window.appState.video;
    if (localStream) {
        const audioTrack = localStream.getAudioTracks()[0];
        if (audioTrack) {
            audioTrack.enabled = !audioTrack.enabled;
            window.appState.video.isMicOn = audioTrack.enabled;
        }
    }
};

const startCall = () => {
    const { currentRemotePeerId, localStream } = window.appState.video;
    const { peer } = window.appState.peer;
    const { socket } = window.appState;
    
    if (!currentRemotePeerId || !localStream) {
        alert('Không có đối thủ hoặc camera chưa sẵn sàng!');
        return;
    }
    
    window.appState.video.currentCall = peer.call(currentRemotePeerId, localStream);
    window.appState.video.currentCall.on('stream', (remoteStream) => {
        const remoteVideo = document.getElementById('remoteVideo');
        remoteVideo.srcObject = remoteStream;
        console.log('Receiving remote stream');
    });
    window.appState.video.currentCall.on('close', () => {
        endCall();
    });
    
    document.getElementById('endCallBtn').style.display = 'inline-block';
    document.getElementById('startCallBtn').style.display = 'none';
};

const acceptCall = () => {
    const { incomingCall, localStream } = window.appState.video;
    const { stopRingtone } = window.recordingModule;
    
    if (!incomingCall || !localStream) {
        alert('Không có cuộc gọi đến hoặc camera chưa sẵn sàng!');
        return;
    }
    
    stopRingtone();
    document.getElementById('incomingCallControls').style.display = 'none';
    
    incomingCall.answer(localStream);
    window.appState.video.currentCall = incomingCall;
    window.appState.video.currentCall.on('stream', (remoteStream) => {
        const remoteVideo = document.getElementById('remoteVideo');
        remoteVideo.srcObject = remoteStream;
        console.log('Receiving remote stream');
    });
    window.appState.video.currentCall.on('close', () => {
        endCall();
    });
    
    document.getElementById('endCallBtn').style.display = 'inline-block';
    window.appState.video.incomingCall = null;
};

const rejectCall = () => {
    const { incomingCall } = window.appState.video;
    const { stopRingtone } = window.recordingModule;
    
    stopRingtone();
    document.getElementById('incomingCallControls').style.display = 'none';
    
    if (incomingCall) {
        incomingCall.close();
        window.appState.video.incomingCall = null;
    }
};

const endCall = () => {
    const { currentCall } = window.appState.video;
    const { stopRingtone } = window.recordingModule;
    const { socket, joinedRoom } = window.appState.socket;
    
    if (currentCall) {
        currentCall.close();
        window.appState.video.currentCall = null;
    }
    
    const remoteVideo = document.getElementById('remoteVideo');
    remoteVideo.srcObject = null;
    document.getElementById('endCallBtn').style.display = 'none';
    document.getElementById('startCallBtn').style.display = 'inline-block';
    document.getElementById('incomingCallControls').style.display = 'none';
    stopRingtone();
    
    console.log('Call ended');
};

export {
    acceptCall, endCall, rejectCall, startCall, startLocalStream,
    toggleCamera,
    toggleMic
};

