// ===== CHAT FUNCTIONS =====
function sendMessage() {
    const content = messageInput.value;
    const roomName = joinedRoom || (roomInput.value || 'general');
    if (content.trim()) {
        socket.emit('chatMessage', { content, sender, roomName });
        messageInput.value = '';
    }
}

function sendFile() {
    const fileInput = document.getElementById('fileInput');
    if (!fileInput.files[0]) return alert('Chọn file!');
    const roomName = joinedRoom || (roomInput.value || 'general');
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
              socket.emit('chatMessage', { 
                  content: data.filePath, 
                  sender, 
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
}

function displayMessage(msg) {
    const div = document.createElement('div');
    div.classList.add('message-bubble');
    if (msg.sender === sender) {
        div.classList.add('sent');
    } else {
        div.classList.add('received');
    }

    const timestamp = new Date(msg.timestamp).toLocaleTimeString([], {
        hour: '2-digit', 
        minute: '2-digit'
    });

    if (msg.isVoice) {
        const dur = msg.duration || 1;
        div.innerHTML = `
            <div style="display:flex;align-items:center;gap:10px;padding:8px 0;">
                <button onclick="this.nextElementSibling.play()" style="background:none;border:none;font-size:22px;cursor:pointer;">Play</button>
                <audio src="data:audio/webm;base64,${msg.content}" controls style="height:38px;width:200px;"></audio>
                <small style="opacity:0.7;min-width:40px;">${dur}s</small>
            </div>
            <small style="font-size:0.7em;opacity:0.6;">${timestamp}</small>
        `;
    } else if (msg.isFile) {
        div.innerHTML = `<strong>${msg.sender}:</strong> <img src="${msg.content}" alt="Ảnh" style="max-width: 200px; border-radius: 8px;" onerror="this.style.display='none'"><br><small>${timestamp}</small>`;
    } else {
        div.innerHTML = `<strong>${msg.sender}:</strong> ${msg.content}<br><small>${timestamp}</small>`;
    }

    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
}

// ===== SOCKET EVENTS =====
socket.on('chatHistory', (messages) => {
    chatBox.innerHTML = '';
    messages.forEach(msg => {
        displayMessage(msg);
    });
});

socket.on('chatMessage', (data) => {
    if (data.roomName === joinedRoom) {
        displayMessage(data);
    }
});
