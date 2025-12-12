// Xử lý chat messages
const joinRoom = () => {
    const { socket } = window.appState;
    const roomInput = document.getElementById('roomInput');
    const roomName = roomInput.value.trim() || 'general';
    
    if (roomName === socket.joinedRoom && socket.isInRoom) return;
    
    socket.joinedRoom = roomName;
    localStorage.setItem('currentRoom', roomName);
    socket.socket.emit('joinRoom', roomName);
    
    if (window.appState.peer.peerId) {
        socket.socket.emit('peer-id', window.appState.peer.peerId);
        console.log('Re-emitted peer-id to room:', roomName);
    }
    socket.isInRoom = true;
    window.uiModule.updateRoomUI();
};

const leaveRoom = () => {
    const { socket } = window.appState;
    if (!socket.joinedRoom || !socket.isInRoom) return;
    
    socket.socket.emit('leaveRoom', socket.joinedRoom);
    socket.joinedRoom = null;
    socket.isInRoom = false;
    window.appState.video.currentRemotePeerId = null;
    
    window.uiModule.updateRoomUI();
    document.getElementById('chatBox').innerHTML = '';
    document.getElementById('roomInput').value = '';
    console.log('Left room:', socket.joinedRoom);
};

const sendMessage = () => {
    const { socket } = window.appState;
    const messageInput = document.getElementById('messageInput');
    const content = messageInput.value;
    const roomName = socket.joinedRoom || (document.getElementById('roomInput').value || 'general');
    
    if (content.trim()) {
        socket.socket.emit('chatMessage', { content, sender: socket.sender, roomName });
        messageInput.value = '';
    }
};

const sendFile = () => {
    const { socket } = window.appState;
    const fileInput = document.getElementById('fileInput');
    if (!fileInput.files[0]) return;
    
    const roomName = socket.joinedRoom || (document.getElementById('roomInput').value || 'general');
    const formData = new FormData();
    formData.append('file', fileInput.files[0]);
    const token = localStorage.getItem('token');
    
    fetch('/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
    }).then(res => res.json())
      .then(data => {
          if (data.filePath) {
              socket.socket.emit('chatMessage', {
                  content: data.filePath,
                  sender: socket.sender,
                  roomName,
                  isFile: true
              });
              fileInput.value = '';
          } else {
              alert(data.error || 'Lỗi upload!');
          }
      }).catch(err => {
          console.error('Upload error:', err);
          alert('Lỗi upload!');
      });
};

export {
    joinRoom,
    leaveRoom, sendFile, sendMessage
};

