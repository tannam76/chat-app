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
              alert(data.error || 'Lỗi upload');
          }
      }).catch(err => alert('Lỗi upload: ' + err));
}

// Chat History
socket.on('chatHistory', (messages) => {
    chatBox.innerHTML = '';
    messages.forEach((msg) => appendMessage(msg));
    chatBox.scrollTop = chatBox.scrollHeight;
});

// New Message
socket.on('chatMessage', (msg) => {
    appendMessage(msg);
});

// Helper append message (với escape cho text, handle file)
function appendMessage(msg) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message-bubble', 'new-message');
    const timestamp = new Date(msg.timestamp).toLocaleString();
    if (msg.isFile || msg.is_file) {
        messageElement.innerHTML = `<span class="timestamp">[${timestamp}]</span> <strong>${escapeHtml(msg.sender)}:</strong> <img src="${msg.content}" alt="file" class="file-img" onerror="this.outerHTML='<a href=\"${msg.content}\" target=\"_blank\" class=\"file-link\">📎 File</a>'">`;
    } else {
        messageElement.innerHTML = `<span class="timestamp">[${timestamp}]</span> <strong>${escapeHtml(msg.sender)}:</strong> <span class="message-text">${escapeHtml(msg.content)}</span>`;
    }
    chatBox.appendChild(messageElement);
    chatBox.scrollTop = chatBox.scrollHeight;
}

function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

// PeerJS events
peer.on('open', (id) => {
    peerId = id;
    console.log('My peer ID is: ' + id);
    // Nếu đã join room, re-emit
    if (joinedRoom) {
        socket.emit('peer-id', id);
    }
    updateRPSUI(); // Init UI sau khi có peerId
});

// Remote peers update
socket.on('remotePeers', ({ roomName, allPeerIds }) => {
    if (roomName !== joinedRoom) return;
    // FILTER EXCLUDE SELF
    const peerIds = allPeerIds.filter(id => id !== peerId);
    console.log('Remote peers after filter:', peerIds);
    if (peerIds.length > 0) {
        currentRemotePeerId = peerIds[0]; // 1:1 call
        console.log('Selected remote:', currentRemotePeerId);
    } else {
        currentRemotePeerId = null;
    }
    // Luôn cập nhật UI nếu là room hiện tại
    if (roomName === joinedRoom) {
        updateRoomUI();
    }
});

// Start call (gọi ra) - THÊM CHECK SELF
function startCall() {
    if (!isInRoom) return alert('Vui lòng tham gia phòng trước!');
    if (!localStream) return alert('Chưa lấy được stream local!');
    if (!currentRemotePeerId) return alert('Không có người dùng nào trong phòng!');
    if (currentRemotePeerId === peerId) return alert('Không thể gọi chính mình!');
    console.log('Calling to', currentRemotePeerId);
    currentCall = peer.call(currentRemotePeerId, localStream);
    setupCallHandlers(currentCall);
    document.getElementById('startCallBtn').style.display = 'none';
    document.getElementById('endCallBtn').style.display = 'block';
    document.getElementById('toggleControls').style.display = 'flex';
}

// End call (THÊM emit endCall đến room để đồng bộ)
function endCall() {
    stopRingtone(); // Dừng chuông nếu đang reo
    if (currentCall) {
        currentCall.close();
        currentCall = null;
    }
    if (incomingCall) {
        incomingCall.close();
        incomingCall = null;
    }
    resetUICall();
    // Emit endCall đến room để notify tất cả (bao gồm callee)
    if (joinedRoom && isInRoom) {
        socket.emit('endCall', joinedRoom);
        console.log('Broadcasted endCall to room:', joinedRoom);
    }
    // Re-fetch remote peers để khôi phục nút gọi (nếu có peers)
    if (joinedRoom && isInRoom) {
        socket.emit('requestRemotePeers', joinedRoom);
        console.log('Re-fetched peers after end call in room:', joinedRoom);
    }
}

// Reset UI sau khi end call hoặc reject (KHÔNG reset currentRemotePeerId)
function resetUICall() {
    document.getElementById('endCallBtn').style.display = 'none';
    document.getElementById('startCallBtn').style.display = 'block';
    document.getElementById('toggleControls').style.display = 'none'; // Ẩn toggle khi không gọi
    document.getElementById('incomingCallControls').style.display = 'none';
    remoteVideo.srcObject = null;
    // KHÔNG reset currentRemotePeerId ở đây → Giữ để gọi lại ngay
    // Nó sẽ được cập nhật qua re-fetch nếu cần
    updateRoomUI(); // Cập nhật UI ngay
}

// Incoming call (cuộc gọi đến)
peer.on('call', (call) => {
    console.log('Incoming call from', call.peer);
    if (incomingCall) {
        call.close(); // Từ chối nếu đang có call khác
        return;
    }
    incomingCall = call;
    handleIncomingCall();
});

// Xử lý incoming call: Hiển thị UI và phát chuông
function handleIncomingCall() {
    if (!localStream) {
        incomingCall.close();
        return;
    }
    playRingtone();
    document.getElementById('startCallBtn').style.display = 'none';
    document.getElementById('toggleControls').style.display = 'none';
    document.getElementById('incomingCallControls').style.display = 'flex';
    // Có thể thêm thông báo: alert('Có cuộc gọi từ ' + incomingCall.peer + '!');
}

// Chấp nhận cuộc gọi
function acceptCall() {
    console.log('Nhấn chấp nhận cuộc gọi');
    stopRingtone();
    if (!incomingCall || !localStream) return;
    currentCall = incomingCall;
    incomingCall.answer(localStream);
    incomingCall = null;
    document.getElementById('incomingCallControls').style.display = 'none';
    document.getElementById('endCallBtn').style.display = 'block';
    document.getElementById('toggleControls').style.display = 'flex';
    setupCallHandlers(currentCall);
}

// Từ chối cuộc gọi
function rejectCall() {
    console.log('Nhấn từ chối cuộc gọi');
    stopRingtone();
    if (incomingCall) {
        incomingCall.close();
        incomingCall = null;
    }
    resetUICall();
}

// Call handlers (cho cả outgoing và incoming) - THÊM gọi endCall() trong close
function setupCallHandlers(call) {
    call.on('stream', (remoteStream) => {
        remoteVideo.srcObject = remoteStream;
    });
    call.on('close', () => {
        console.log('Call ended');
        stopRingtone();
        remoteVideo.srcObject = null;
        currentCall = null;
        endCall(); // Gọi endCall() để đồng bộ (reset UI + emit nếu cần)
    });
    call.on('error', (err) => {
        console.error('Call error:', err);
        stopRingtone();
        alert('Lỗi kết nối: ' + err.message);
        endCall(); // Đồng bộ error như end call
    });
}

// Listener cho endCall từ remote (khi caller end, callee nhận và reset)
socket.on('endCallRemote', () => {
    console.log('Received endCall from remote');
    stopRingtone();
    if (currentCall) {
        currentCall.close();
        currentCall = null;
    }
    if (incomingCall) {
        incomingCall.close();
        incomingCall = null;
    }
    resetUICall();
});

// Tự động join saved room khi load
document.addEventListener('DOMContentLoaded', () => {
    const savedRoom = localStorage.getItem('currentRoom');
    if (savedRoom && sender) { // Chỉ nếu đã login
        roomInput.value = savedRoom;
        joinedRoom = savedRoom;
        isInRoom = true;
        joinRoom(); // Tự động join
    }
    updateRoomUI(); // Khởi tạo UI
    updateRPSUI(); // Thêm dòng này
});

// Cập nhật logout() để xóa session room
function logout() {
    localStorage.removeItem('currentRoom'); // Xóa phiên phòng khi logout
    leaveRoom(); // Rời room trước khi logout
    localStorage.clear();
    window.location.href = '/login';
}

// Khởi tạo ringtone khi load
initRingtone();

// Đảm bảo user interaction trước khi phát âm thanh (tùy chọn: gọi sau khi click nút nào đó đầu tiên)
document.addEventListener('click', () => {
    if (ringtoneAudio && !ringtoneAudio.paused) return;
    console.log('User interaction detected - ready for audio');
}, { once: true });

// ===== RPS GAME INTEGRATION =====
// Event nhận kết quả RPS (fix để filter myChoice và oppChoice đúng)
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
    } catch (err) {
        console.error('Error accessing media devices:', err);
        alert('Không thể truy cập camera/micro. Vui lòng kiểm tra quyền.');
    }
}

function toggleCamera() {
    if (localStream) {
        const videoTrack = localStream.getVideoTracks()[0];
        if (videoTrack) {
            videoTrack.enabled = !videoTrack.enabled;
            isCameraOn = videoTrack.enabled;
            document.getElementById('cameraBtn').textContent = isCameraOn ? '📷' : '📷❌';
        }
    }
}

function toggleMic() {
    if (localStream) {
        const audioTrack = localStream.getAudioTracks()[0];
        if (audioTrack) {
            audioTrack.enabled = !audioTrack.enabled;
            isMicOn = audioTrack.enabled;
            document.getElementById('micBtn').textContent = isMicOn ? '🎤' : '🎤❌';
        }
    }
}

// Khởi tạo stream khi load (sau user interaction)
document.addEventListener('click', () => {
    if (!localStream) {
        startLocalStream();
    }
}, { once: true });