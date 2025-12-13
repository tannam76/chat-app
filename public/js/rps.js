// ===== GAME RPS (KÉO BÚA BAO) =====
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
    updateRPSUI();
}

function getChoiceEmoji(choice) {
    const emojis = { rock: '✊', paper: '✋', scissors: '✌️' };
    return emojis[choice] || '❓';
}

function displayRPSResult(data) {
    const resultDiv = document.getElementById('rpsResult');
    if (!resultDiv || !peerId) return;

    const myChoice = data.choices[peerId];
    const oppChoice = Object.values(data.choices).find(c => c !== myChoice);
    const oppPeerId = currentRemotePeerId;

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

    if (myRPSChoice && !rpsResult) {
        choiceBtns.forEach(btn => btn.style.display = 'none');
        resultDiv.innerHTML = '<p style="text-align: center; color: #667eea;">Đang chờ đối thủ chọn...</p>';
        resultDiv.style.display = 'block';
        if (resetBtn) resetBtn.style.display = 'none';
    }
    else if (rpsResult) {
        choiceBtns.forEach(btn => btn.style.display = 'none');
        resultDiv.style.display = 'block';
        if (resetBtn) resetBtn.style.display = 'block';
    }
    else {
        choiceBtns.forEach(btn => btn.style.display = 'inline-block');
        resultDiv.style.display = 'none';
        if (resetBtn) resetBtn.style.display = 'none';
    }
}

function resetRPS() {
    myRPSChoice = null;
    rpsResult = null;
    updateRPSUI();
    socket.emit('requestRemotePeers', joinedRoom);
    console.log('Manual RPS reset');
}

// ===== SOCKET EVENTS FOR RPS =====
socket.on('rpsResult', (data) => {
    if (data.roomName !== joinedRoom) return;
    rpsResult = data;
    displayRPSResult(data);
    console.log('RPS result received:', data);
});

socket.on('rpsReset', (data) => {
    if (data.roomName !== joinedRoom) return;
    myRPSChoice = null;
    rpsResult = null;
    updateRPSUI();
    console.log('RPS reset');
});
