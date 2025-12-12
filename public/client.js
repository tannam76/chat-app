const socket = io();
const peer = new Peer();
let sender = localStorage.getItem('username') || 'Ẩn danh';
let peerId = null;
let joinedRoom = null; // Track room client-side
let isInRoom = false; // Track trạng thái trong room

// Video states
let isCameraOn = true;
let isMicOn = true;
let currentCall = null;
let incomingCall = null; // Lưu incoming call để accept/reject
let ringtoneAudio = null; // Âm thanh chuông
let isRingtonePlaying = false; // Flag để track trạng thái phát chuông


// Chat
const chatBox = document.getElementById('chatBox');
const messageInput = document.getElementById('messageInput');
const roomInput = document.getElementById('roomInput');

// Game RPS states
let myRPSChoice = null; // Lựa chọn của tôi
let rpsResult = null; // Kết quả hiện tại

let localStream = null;
let currentRemotePeerId = null;
let remoteVideo = document.getElementById('remoteVideo');
let localVideo = document.getElementById('localVideo');

// Khởi tạo ringtone audio
function initRingtone() {
    ringtoneAudio = new Audio('/ringtone.mp3'); // Đường dẫn file âm thanh
    ringtoneAudio.loop = true; // Lặp lại
    ringtoneAudio.volume = 0.5; // Âm lượng
    // Event để track trạng thái
    ringtoneAudio.addEventListener('play', () => {
        isRingtonePlaying = true;
        console.log('Chuông bắt đầu phát');
    });
    ringtoneAudio.addEventListener('pause', () => {
        isRingtonePlaying = false;
        console.log('Chuông dừng phát');
    });
    ringtoneAudio.addEventListener('ended', () => {
        isRingtonePlaying = false;
        console.log('Chuông kết thúc');
    });
}

// Phát chuông
function playRingtone() {
    if (ringtoneAudio && !isRingtonePlaying) {
        ringtoneAudio.play().then(() => {
            console.log('Phát chuông thành công');
        }).catch(err => {
            console.error('Không thể phát âm thanh:', err);
            // Fallback: Thử lại sau user interaction (như click nút)
        });
    } else {
        console.log('Chuông đang phát hoặc không tồn tại');
    }
}

// Dừng chuông
function stopRingtone() {
    if (ringtoneAudio && isRingtonePlaying) {
        ringtoneAudio.pause();
        ringtoneAudio.currentTime = 0;
        console.log('Dừng chuông thành công');
    } else {
        console.log('Chuông không đang phát');
    }
}

// Hàm cập nhật trạng thái nút toggle (enable/disable và text)
function updateToggleButtons() {
    const cameraBtn = document.getElementById('cameraBtn');
    const micBtn = document.getElementById('micBtn');
    
    if (localStream) {
        // Enable nút và cập nhật text
        cameraBtn.disabled = false;
        micBtn.disabled = false;
        cameraBtn.textContent = isCameraOn ? '📷' : '📷❌';
        micBtn.textContent = isMicOn ? '🎤' : '🎤❌';
        cameraBtn.title = 'Tắt/Bật Camera';
        micBtn.title = 'Tắt/Bật Mic';
    } else {
        // Disable nếu chưa có stream
        cameraBtn.disabled = true;
        micBtn.disabled = true;
        cameraBtn.textContent = '📷';
        micBtn.textContent = '🎤';
        cameraBtn.title = 'Đang khởi tạo camera...';
        micBtn.title = 'Đang khởi tạo mic...';
    }
}

function joinRoom() {
    const roomName = roomInput.value.trim() || 'general';
    if (roomName === joinedRoom && isInRoom) return; // Tránh join lại
    joinedRoom = roomName;
    localStorage.setItem('currentRoom', roomName); // Lưu phiên
    socket.emit('joinRoom', roomName);
    if (peerId) {
        socket.emit('peer-id', peerId);
        console.log('Re-emitted peer-id to room:', roomName);
    }
    isInRoom = true;
    updateRoomUI(); // Cập nhật UI
}

function leaveRoom() {
    if (!joinedRoom || !isInRoom) return;
    socket.emit('leaveRoom', joinedRoom);
    joinedRoom = null;
    isInRoom = false;
    currentRemotePeerId = null; // Reset ở đây, chỉ khi rời phòng
    updateRoomUI();
    chatBox.innerHTML = ''; // Xóa chat history khi rời
    roomInput.value = ''; // Reset input
    console.log('Left room:', joinedRoom);
}

function updateRoomUI() {
    const leaveBtn = document.getElementById('leaveRoomBtn');
    const currentRoomSpan = document.getElementById('currentRoomSpan');
    const startCallBtn = document.getElementById('startCallBtn');
    if (isInRoom && joinedRoom) {
        leaveBtn.style.display = 'inline-block';
        currentRoomSpan.textContent = `Phòng hiện tại: ${joinedRoom}`;
        // Kiểm tra peers để enable/disable nút gọi
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
        startCallBtn.disabled = true; // Disable khi không ở room
        startCallBtn.textContent = '📞 Tham gia phòng trước';
    }
    updateRPSUI(); // Cập nhật UI RPS
    updateToggleButtons(); // Cập nhật toggle (mặc dù luôn visible)
}

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
              socket.emit('chatMessage', { content: data.filePath, sender, roomName, isFile: true });
              fileInput.value = '';
          } else {
              alert(data.error || 'Lỗi upload!');
          }
      }).catch(err => {
          console.error('Upload error:', err);
          alert('Lỗi upload!');
      });
}

// Socket events
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

function displayMessage(msg) {
    const div = document.createElement('div');
    div.classList.add('message-bubble');
    if (msg.sender === sender) {
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
}

// Peer events
peer.on('open', (id) => {
    peerId = id;
    console.log('My peer ID is: ' + id);
    if (joinedRoom) {
        socket.emit('peer-id', id);
    }
});

peer.on('call', (call) => {
    incomingCall = call;
    initRingtone(); // Khởi tạo nếu chưa
    playRingtone();
    document.getElementById('incomingCallControls').style.display = 'flex';
    console.log('Incoming call from: ' + call.peer);
});

peer.on('error', (err) => {
    console.error('Peer error:', err);
    alert('Lỗi kết nối PeerJS: ' + err.type);
});

// Xử lý remote peers
socket.on('remotePeers', (data) => {
    if (data.roomName !== joinedRoom) return;
    const allPeerIds = data.allPeerIds.filter(id => id !== peerId);
    if (allPeerIds.length > 0) {
        currentRemotePeerId = allPeerIds[0]; // Giả sử 1:1, lấy peer đầu tiên
        console.log('Remote peer found:', currentRemotePeerId);
        updateRoomUI();
    } else {
        currentRemotePeerId = null;
        updateRoomUI();
    }
    updateRPSUI();
});

// Xử lý game RPS
socket.on('rpsResult', (data) => {
    if (data.roomName !== joinedRoom) return;
    rpsResult = data;
    displayRPSResult(data);
    console.log('RPS result received:', data);
});

// Event reset RPS
socket.on('rpsReset', (data) => {
    if (data.roomName !== joinedRoom) return;
    myRPSChoice = null;
    rpsResult = null;
    updateRPSUI();
    console.log('RPS reset');
});

// Hàm gửi lựa chọn RPS
function sendRPSChoice(choice) {
    if (!isInRoom || !joinedRoom || !currentRemotePeerId) {
        alert('Vui lòng tham gia phòng và có đối thủ!');
        return;
    }
    if (rpsResult) {
        alert('Đợi kết quả trước khi chơi lại!');
        return;
    }
    myRPSChoice = choice;
    socket.emit('playRPS', { roomName: joinedRoom, choice });
    updateRPSUI(); // Ẩn nút chọn tạm thời
}

// Hiển thị kết quả (fix: filter dựa trên peerId chính xác)
function displayRPSResult(data) {
    const resultDiv = document.getElementById('rpsResult');
    if (!resultDiv || !peerId) return; // Đảm bảo có peerId

    // Lựa chọn của tôi (dựa trên peerId của bản thân)
    const myChoice = data.choices[peerId];
    // Lựa chọn của đối thủ (chỉ 1 đối thủ trong 1:1)
    const oppChoice = Object.values(data.choices).find(c => c !== myChoice);
    const oppPeerId = currentRemotePeerId; // Giả sử 1:1

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

   
}

// Lấy emoji cho lựa chọn
function getChoiceEmoji(choice) {
    const emojis = { rock: '✊', paper: '✋', scissors: '✌️' };
    return emojis[choice] || '❓';
}

// Cập nhật UI RPS (fix: hiển thị nút reset khi có kết quả)
function updateRPSUI() {
    const rpsSection = document.getElementById('rpsSection');
    const choiceBtns = document.querySelectorAll('.rps-choice-btn');
    const resultDiv = document.getElementById('rpsResult');
    const resetBtn = document.getElementById('resetRPSBtn');

    if (!isInRoom || !currentRemotePeerId || !peerId) {
        if (rpsSection) rpsSection.style.display = 'none';
        return;
    }
    if (rpsSection) rpsSection.style.display = 'block';

    // Nếu đang chờ kết quả (đã chọn nhưng chưa ready)
    if (myRPSChoice && !rpsResult) {
        choiceBtns.forEach(btn => btn.style.display = 'none');
        resultDiv.innerHTML = '<p style="text-align: center; color: #667eea;">Đang chờ đối thủ chọn...</p>';
        resultDiv.style.display = 'block';
        if (resetBtn) resetBtn.style.display = 'none';
    }
    // Nếu có kết quả
    else if (rpsResult) {
        choiceBtns.forEach(btn => btn.style.display = 'none');
        resultDiv.style.display = 'block';
        if (resetBtn) resetBtn.style.display = 'block';
    }
    // Bình thường: hiển thị nút chọn
    else {
        choiceBtns.forEach(btn => btn.style.display = 'inline-block');
        resultDiv.style.display = 'none';
        if (resetBtn) resetBtn.style.display = 'none';
    }
}

// Thêm hàm reset thủ công (nếu nhấn nút chơi lại)
function resetRPS() {
    myRPSChoice = null;
    rpsResult = null;
    updateRPSUI();
    socket.emit('requestRemotePeers', joinedRoom); // Re-fetch peers nếu cần
    console.log('Manual RPS reset');
}

// Video functions
async function startLocalStream() {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localVideo.srcObject = localStream;
        console.log('Local stream started');
        // Cập nhật trạng thái mặc định (bật)
        isCameraOn = true;
        isMicOn = true;
        updateToggleButtons(); // Enable nút sau khi stream sẵn
    } catch (err) {
        console.error('Error accessing media devices:', err);
        alert('Không thể truy cập camera/micro. Vui lòng kiểm tra quyền truy cập thiết bị.');
        updateToggleButtons(); // Giữ disabled
    }
}

function toggleCamera() {
    if (localStream) {
        const videoTrack = localStream.getVideoTracks()[0];
        if (videoTrack) {
            videoTrack.enabled = !videoTrack.enabled;
            isCameraOn = videoTrack.enabled;
            updateToggleButtons(); // Cập nhật text nút
        }
    }
}

function toggleMic() {
    if (localStream) {
        const audioTrack = localStream.getAudioTracks()[0];
        if (audioTrack) {
            audioTrack.enabled = !audioTrack.enabled;
            isMicOn = audioTrack.enabled;
            updateToggleButtons(); // Cập nhật text nút
        }
    }
}

// Gọi video
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

// Chấp nhận cuộc gọi
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

// Từ chối cuộc gọi
function rejectCall() {
    stopRingtone();
    document.getElementById('incomingCallControls').style.display = 'none';
    if (incomingCall) {
        incomingCall.close();
        incomingCall = null;
    }
}

// Kết thúc cuộc gọi
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

// Khởi tạo khi load
initRingtone();
updateToggleButtons(); // Ban đầu disabled

// ===== TÍNH NĂNG GHI ÂM TIN NHẮN THOẠI =====
let mediaRecorder = null;
let audioChunks = [];
let recordingStartTime = 0;
let recordingTimer = null;

// ====== GHI ÂM THOẠI - ĐÃ FIX MICRO 100% ======
async function requestMicPermission() {
    if (micPermissionGranted) return true;
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(t => t.stop());
        micPermissionGranted = true;
        alert('Đã cấp quyền micro! Giờ bạn có thể nhấn giữ để ghi âm');
        return true;
    } catch (err) {
        alert('Không thể truy cập micro!\n\nBẮT BUỘC:\n• Mở bằng http://localhost:5000\n• Hoặc dùng ngrok (HTTPS)');
        return false;
    }
}

// Bấm 1 lần vào nút để xin quyền trước
voiceRecordBtn.addEventListener('click', async (e) => {
    if (!micPermissionGranted) {
        e.preventDefault();
        await requestMicPermission();
    }
});

async function startRecording() {
    if (!micPermissionGranted) {
        alert('Vui lòng bấm 1 lần vào nút mic để cấp quyền trước!');
        return;
    }

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
        audioChunks = [];

        mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
        mediaRecorder.onstop = () => {
            const blob = new Blob(audioChunks, { type: 'audio/webm' });
            sendVoiceMessage(blob);
            stream.getTracks().forEach(t => t.stop());
        };

        mediaRecorder.start();
        recordingStartTime = Date.now();
        recordingOverlay.style.display = 'flex';

        const timer = setInterval(() => {
            const elapsed = Math.floor((Date.now() - recordingStartTime) / 1000);
            const m = String(Math.floor(elapsed / 60)).padStart(2, '0');
            const s = String(elapsed % 60).padStart(2, '0');
            recordingTime.textContent = `${m}:${s}`;
        }, 100);

        mediaRecorder.addEventListener('stop', () => clearInterval(timer), { once: true });

    } catch (err) {
        console.error('Lỗi ghi âm:', err);
        alert('Không thể ghi âm!');
    }
}

function stopRecording() {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
        recordingOverlay.style.display = 'none';
    }
}

function sendVoiceMessage(blob) {
    const reader = new FileReader();
    reader.onload = () => {
        const base64 = reader.result.split(',')[1];
        const duration = Math.floor((Date.now() - recordingStartTime) / 1000);
        socket.emit('chatMessage', {
            content: base64,
            sender,
            roomName: joinedRoom || 'general',
            isVoice: true,
            duration
        });
    };
    reader.readAsDataURL(blob);
}

// Nhấn giữ để ghi âm
voiceRecordBtn.addEventListener('mousedown', startRecording);
voiceRecordBtn.addEventListener('mouseup', stopRecording);
voiceRecordBtn.addEventListener('mouseleave', stopRecording);
voiceRecordBtn.addEventListener('touchstart', e => { e.preventDefault(); startRecording(); });
voiceRecordBtn.addEventListener('touchend', e => { e.preventDefault(); stopRecording(); });

// Format thời gian mm:ss
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
}

// Bắt đầu ghi âm
async function startRecording() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
        audioChunks = [];

        mediaRecorder.ondataavailable = (event) => {
            audioChunks.push(event.data);
        };

        mediaRecorder.onstop = () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            sendVoiceMessage(audioBlob);
            stream.getTracks().forEach(track => track.stop()); // Tắt mic
        };

        mediaRecorder.start();
        recordingStartTime = Date.now();
        recordingOverlay.style.display = 'flex';
        recordingTimer = setInterval(() => {
            const elapsed = Math.floor((Date.now() - recordingStartTime) / 1000);
            recordingTime.textContent = formatTime(elapsed);
        }, 1000);

        // Thêm hiệu ứng wave
        recordingOverlay.innerHTML = `<span id="recordingTime">${formatTime(0)}</span><div id="recordingWave"></div><span style="margin-left:10px; font-size:0.9em;">Đang ghi âm...</span>`;

    } catch (err) {
        console.error("Không thể truy cập micro:", err);
        alert("Không thể ghi âm. Vui lòng cấp quyền micro!");
    }
}

// Dừng ghi âm
function stopRecording() {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
        clearInterval(recordingTimer);
        recordingOverlay.style.display = 'none';
    }
}

// Gửi tin nhắn thoại
function sendVoiceMessage(blob) {
    const roomName = joinedRoom || 'general';
    const reader = new FileReader();
    reader.onload = function() {
        const base64audio = reader.result.split(',')[1]; // Chỉ lấy phần data

        // Gửi qua socket dưới dạng base64
        socket.emit('chatMessage', {
            content: base64audio,
            sender,
            roomName,
            isVoice: true,
            duration: Math.floor((Date.now() - recordingStartTime) / 1000)
        });
    };
    reader.readAsDataURL(blob);
}

// Sự kiện nhấn giữ nút
voiceRecordBtn.addEventListener('mousedown', startRecording);
voiceRecordBtn.addEventListener('mouseup', stopRecording);
voiceRecordBtn.addEventListener('mouseleave', stopRecording); // Nếu kéo ra ngoài
voiceRecordBtn.addEventListener('touchstart', (e) => {
    e.preventDefault();
    startRecording();
});
voiceRecordBtn.addEventListener('touchend', (e) => {
    e.preventDefault();
    stopRecording();
});
