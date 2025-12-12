// Xử lý game RPS
const sendRPSChoice = (choice) => {
    console.log('[RPS] Sending choice:', choice);
    const socketState = window.appState.socket;
    const { currentRemotePeerId } = window.appState.video;
    const { myChoice, rpsResult } = window.appState.game;
    
    console.log('[RPS] State - isInRoom:', socketState.isInRoom, 'joinedRoom:', socketState.joinedRoom, 'remotePeerId:', currentRemotePeerId);
    
    if (!socketState.isInRoom || !socketState.joinedRoom || !currentRemotePeerId) {
        const msg = `Vui lòng tham gia phòng và có đối thủ!\nisInRoom: ${socketState.isInRoom}\njoinedRoom: ${socketState.joinedRoom}\nremotePeerId: ${currentRemotePeerId}`;
        alert(msg);
        return;
    }
    if (rpsResult) {
        alert('Đợi kết quả trước khi chơi lại!');
        return;
    }
    
    console.log('[RPS] Emitting playRPS with choice:', choice);
    window.appState.game.myChoice = choice;
    socketState.socket.emit('playRPS', { roomName: socketState.joinedRoom, choice });
    window.uiModule.updateRPSUI();
};

const resetRPS = () => {
    const socketState = window.appState.socket;
    
    window.appState.game.myChoice = null;
    window.appState.game.rpsResult = null;
    window.uiModule.updateRPSUI();
    socketState.socket.emit('requestRemotePeers', socketState.joinedRoom);
    console.log('Manual RPS reset');
};

export {
    resetRPS, sendRPSChoice
};

