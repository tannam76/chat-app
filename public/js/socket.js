// Xử lý socket events
const setupSocketEvents = () => {
    const { socket: socketIO } = window.appState;
    const { peer } = window.appState.peer;
    
    // Chat history
    socketIO.socket.on('chatHistory', (messages) => {
        const chatBox = document.getElementById('chatBox');
        chatBox.innerHTML = '';
        messages.forEach(msg => {
            window.uiModule.displayMessage(msg);
        });
    });

    // New chat message
    socketIO.socket.on('chatMessage', (data) => {
        if (data.roomName === socketIO.joinedRoom) {
            window.uiModule.displayMessage(data);
        }
    });

    // Remote peers
    socketIO.socket.on('remotePeers', (data) => {
        if (data.roomName !== socketIO.joinedRoom) return;
        const allPeerIds = data.allPeerIds.filter(id => id !== window.appState.peer.peerId);
        if (allPeerIds.length > 0) {
            window.appState.video.currentRemotePeerId = allPeerIds[0];
            console.log('Remote peer found:', window.appState.video.currentRemotePeerId);
        } else {
            window.appState.video.currentRemotePeerId = null;
        }
        window.uiModule.updateRoomUI();
    });

    // RPS Result
    socketIO.socket.on('rpsResult', (data) => {
        if (data.roomName !== socketIO.joinedRoom) return;
        window.appState.game.rpsResult = data;
        window.uiModule.displayRPSResult(data);
        console.log('RPS result received:', data);
    });

    // RPS Reset
    socketIO.socket.on('rpsReset', (data) => {
        if (data.roomName !== socketIO.joinedRoom) return;
        window.appState.game.myChoice = null;
        window.appState.game.rpsResult = null;
        window.uiModule.updateRPSUI();
        console.log('RPS reset');
    });

    // End call remote
    socketIO.socket.on('endCallRemote', () => {
        window.videoModule.endCall();
    });

    // Notification
    socketIO.socket.on('notification', (data) => {
        console.log(data.message);
    });

    // Peer events
    peer.on('open', (id) => {
        window.appState.peer.peerId = id;
        console.log('My peer ID is: ' + id);
        if (socketIO.joinedRoom) {
            socketIO.socket.emit('peer-id', id);
        }
    });

    peer.on('call', (call) => {
        window.appState.video.incomingCall = call;
        window.recordingModule.playRingtone();
        document.getElementById('incomingCallControls').style.display = 'flex';
        console.log('Incoming call from: ' + call.peer);
    });

    peer.on('error', (err) => {
        console.error('Peer error:', err);
        alert('Lỗi kết nối PeerJS: ' + err.type);
    });
};

export {
    setupSocketEvents
};
