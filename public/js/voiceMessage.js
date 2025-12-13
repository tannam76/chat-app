// ===== VOICE MESSAGE RECORDING =====
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

        mediaRecorder.ondataavailable = (event) => {
            audioChunks.push(event.data);
        };

        mediaRecorder.onstop = () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            sendVoiceMessage(audioBlob);
            stream.getTracks().forEach(track => track.stop());
        };

        mediaRecorder.start();
        recordingStartTime = Date.now();
        recordingOverlay.style.display = 'flex';
        recordingTimer = setInterval(() => {
            const elapsed = Math.floor((Date.now() - recordingStartTime) / 1000);
            recordingTime.textContent = formatTime(elapsed);
        }, 1000);

        recordingOverlay.innerHTML = `<span id="recordingTime">${formatTime(0)}</span><div id="recordingWave"></div><span style="margin-left:10px; font-size:0.9em;">Đang ghi âm...</span>`;

    } catch (err) {
        console.error("Không thể truy cập micro:", err);
        alert("Không thể ghi âm. Vui lòng cấp quyền micro!");
    }
}

function stopRecording() {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
        clearInterval(recordingTimer);
        recordingOverlay.style.display = 'none';
    }
}

function sendVoiceMessage(blob) {
    const roomName = joinedRoom || 'general';
    const reader = new FileReader();
    reader.onload = function() {
        const base64audio = reader.result.split(',')[1];

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

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
}

// ===== EVENT LISTENERS =====
voiceRecordBtn.addEventListener('mousedown', startRecording);
voiceRecordBtn.addEventListener('mouseup', stopRecording);
voiceRecordBtn.addEventListener('mouseleave', stopRecording);
voiceRecordBtn.addEventListener('touchstart', (e) => {
    e.preventDefault();
    startRecording();
});
voiceRecordBtn.addEventListener('touchend', (e) => {
    e.preventDefault();
    stopRecording();
});
