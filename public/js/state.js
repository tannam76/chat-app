// Quản lý state global
const SocketIOState = {
    socket: io(),
    sender: localStorage.getItem('username') || 'Ẩn danh',
    joinedRoom: null,
    isInRoom: false
};

// Video states
const VideoState = {
    isCameraOn: true,
    isMicOn: true,
    currentCall: null,
    incomingCall: null,
    localStream: null,
    currentRemotePeerId: null
};

// Game RPS states
const GameState = {
    myChoice: null,
    rpsResult: null
};

// Peer state
const PeerState = {
    peer: new Peer(),
    peerId: null
};

// Recording state
const RecordingState = {
    mediaRecorder: null,
    audioChunks: [],
    recordingStartTime: 0,
    recordingTimer: null,
    isRingtonePlaying: false,
    micPermissionGranted: false,
    ringtoneAudio: null
};

export {
    GameState,
    PeerState,
    RecordingState, SocketIOState,
    VideoState
};

