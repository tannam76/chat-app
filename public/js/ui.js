// Xử lý UI
const updateRoomUI = () => {
    const { isInRoom, joinedRoom } = window.appState.socket;
    const { currentRemotePeerId } = window.appState.video;
    
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
};

const updateToggleButtons = () => {
    const { isCameraOn, isMicOn, localStream } = window.appState.video;
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
};

const updateRPSUI = () => {
    const { isInRoom, joinedRoom } = window.appState.socket;
    const { currentRemotePeerId } = window.appState.video;
    const { peerId } = window.appState.peer;
    const { myChoice, rpsResult } = window.appState.game;
    
    console.log('[RPS] isInRoom:', isInRoom, 'peerId:', peerId, 'remotePeerId:', currentRemotePeerId, 'myChoice:', myChoice, 'rpsResult:', rpsResult);
    
    const rpsSection = document.getElementById('rpsSection');
    const choiceBtns = document.querySelectorAll('.rps-choice-btn');
    const resultDiv = document.getElementById('rpsResult');
    const resetBtn = document.getElementById('resetRPSBtn');

    if (!isInRoom || !currentRemotePeerId || !peerId) {
        if (rpsSection) rpsSection.style.display = 'none';
        return;
    }
    if (rpsSection) rpsSection.style.display = 'block';

    if (myChoice && !rpsResult) {
        choiceBtns.forEach(btn => btn.style.display = 'none');
        resultDiv.innerHTML = '<p style="text-align: center; color: #667eea;">Đang chờ đối thủ chọn...</p>';
        resultDiv.style.display = 'block';
        if (resetBtn) resetBtn.style.display = 'none';
    } else if (rpsResult) {
        choiceBtns.forEach(btn => btn.style.display = 'none');
        resultDiv.style.display = 'block';
        if (resetBtn) resetBtn.style.display = 'block';
    } else {
        choiceBtns.forEach(btn => btn.style.display = 'inline-block');
        resultDiv.style.display = 'none';
        if (resetBtn) resetBtn.style.display = 'none';
    }
};

const displayMessage = (msg) => {
    const { sender: currentUser } = window.appState.socket;
    const chatBox = document.getElementById('chatBox');
    
    const div = document.createElement('div');
    div.classList.add('message-bubble');
    if (msg.sender === currentUser) {
        div.classList.add('sent');
    } else {
        div.classList.add('received');
    }

    const timestamp = new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    
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
};

const displayRPSResult = (data) => {
    console.log('[displayRPS] Called with data:', data);
    const { peerId } = window.appState.peer;
    const { currentRemotePeerId } = window.appState.video;
    
    console.log('[displayRPS] peerId:', peerId, 'currentRemotePeerId:', currentRemotePeerId);
    
    const resultDiv = document.getElementById('rpsResult');
    if (!resultDiv || !peerId) {
        console.log('[displayRPS] Missing resultDiv or peerId, returning');
        return;
    }

    const myChoice = data.choices[peerId];
    const oppChoice = Object.values(data.choices).find(c => c !== myChoice);
    const oppPeerId = currentRemotePeerId;
    
    console.log('[displayRPS] myChoice:', myChoice, 'oppChoice:', oppChoice, 'winner:', data.winner, 'winPeerId:', data.winPeerId);

    let winText;
    if (data.winner === 'tie') {
        winText = 'Hòa! Chơi lại nhé!';
    } else if (data.winPeerId === peerId) {
        winText = '🎉 Bạn thắng!';
    } else if (data.winPeerId === oppPeerId) {
        winText = '😔 Đối thủ thắng!';
    } else {
        winText = 'Kết quả không rõ ràng?';
    }

    resultDiv.innerHTML = `
        <div class="rps-result">
            <div style="font-size: 1.2em; margin: 5px 0;">✊ Bạn: ${getChoiceEmoji(myChoice)}</div>
            <div style="font-size: 1.2em; margin: 5px 0;">✋ Đối thủ: ${getChoiceEmoji(oppChoice)}</div>
            <p style="font-weight: bold; font-size: 1.1em; margin-top: 10px; color: ${data.winner === 'tie' ? '#ffc107' : (data.winPeerId === peerId ? '#28a745' : '#dc3545')};">${winText}</p>
            <small style="opacity: 0.7;">Kết quả sẽ reset sau 5 giây...</small>
        </div>
    `;
    resultDiv.style.display = 'block';
    console.log('[displayRPS] Result displayed successfully');
};

const getChoiceEmoji = (choice) => {
    const emojis = { rock: '✊', paper: '✋', scissors: '✌️' };
    return emojis[choice] || '❓';
};

export {
    displayMessage,
    displayRPSResult,
    getChoiceEmoji, updateRoomUI, updateRPSUI, updateToggleButtons
};

//update ui