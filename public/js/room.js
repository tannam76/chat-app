// ===== ROOM FUNCTIONS =====
function joinRoom() {
    const roomName = roomInput.value.trim() || 'general';
    if (roomName === joinedRoom && isInRoom) return;
    
    joinedRoom = roomName;
    localStorage.setItem('currentRoom', roomName);
    socket.emit('joinRoom', roomName);
    if (peerId) {
        socket.emit('peer-id', peerId);
        console.log('Re-emitted peer-id to room:', roomName);
    }
    isInRoom = true;
    updateRoomUI();
}

function leaveRoom() {
    if (!joinedRoom || !isInRoom) return;
    socket.emit('leaveRoom', joinedRoom);
    joinedRoom = null;
    isInRoom = false;
    currentRemotePeerId = null;
    updateRoomUI();
    chatBox.innerHTML = '';
    roomInput.value = '';
    console.log('Left room:', joinedRoom);
}

function updateRoomUI() {
    const leaveBtn = document.getElementById('leaveRoomBtn');
    const currentRoomSpan = document.getElementById('currentRoomSpan');
    const startCallBtn = document.getElementById('startCallBtn');
    
    if (isInRoom && joinedRoom) {
        leaveBtn.style.display = 'inline-block';
        currentRoomSpan.textContent = `Phòng hiện tại: ${joinedRoom}`;
        
        if (currentRemotePeerId) {
            startCallBtn.disabled = false;
            startCallBtn.textContent = '📞 Bắt đầu Gọi';
        } else {
            startCallBtn.disabled = true;
            startCallBtn.textContent = '📞 Không có ai trong phòng';
        }
    } else {
        leaveBtn.style.display = 'none';
        currentRoomSpan.textContent = '';
        startCallBtn.disabled = true;
        startCallBtn.textContent = '📞 Tham gia phòng trước';
    }
    updateRPSUI();
    updateToggleButtons();
}

// ===== SOCKET EVENTS FOR ROOM =====
socket.on('remotePeers', (data) => {
    if (data.roomName !== joinedRoom) return;
    const allPeerIds = data.allPeerIds.filter(id => id !== peerId);
    if (allPeerIds.length > 0) {
        currentRemotePeerId = allPeerIds[0];
        console.log('Remote peer found:', currentRemotePeerId);
        updateRoomUI();
    } else {
        currentRemotePeerId = null;
        updateRoomUI();
    }
    updateRPSUI();
});
