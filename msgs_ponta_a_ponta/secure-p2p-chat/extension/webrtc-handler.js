// extension/webrtc-handler.js

/**
 * Cria e gerencia uma instância de RTCPeerConnection, abstraindo a complexidade do WebRTC.
 * @param {function} onDataChannelMessage - Callback para quando uma mensagem é recebida.
 * @param {function} onConnectionStateChange - Callback para mudanças no estado da conexão.
 * @param {function} onIceCandidate - Callback para quando um candidato ICE é gerado.
 * @returns {object} Um objeto com métodos para controlar a conexão WebRTC.
 */
function WebRTCHandler(onDataChannelMessage, onConnectionStateChange, onIceCandidate, onDataChannelOpen) {
    const peerConnection = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });
    
    let dataChannel;

    peerConnection.onicecandidate = event => {
        if (event.candidate) {
            onIceCandidate(event.candidate);
        }
    };

    peerConnection.onconnectionstatechange = () => {
        onConnectionStateChange(peerConnection.connectionState);
    };
    
    peerConnection.oniceconnectionstatechange = () => {
        if (peerConnection.iceConnectionState === 'connected' || peerConnection.iceConnectionState === 'completed') {
            onConnectionStateChange('connected');
        }
    };

    peerConnection.ondatachannel = event => {
        dataChannel = event.channel;
        setupDataChannelEvents();
    };

    function setupDataChannelEvents() {
        dataChannel.binaryType = 'arraybuffer';
        dataChannel.onmessage = event => onDataChannelMessage(event.data);
        
        const onOpenHandler = () => {
            console.log('✅ Canal de dados P2P aberto!');
            if (onDataChannelOpen) onDataChannelOpen();
        };

        if (dataChannel.readyState === 'open') {
            onOpenHandler();
        } else {
            dataChannel.onopen = onOpenHandler;
        }
        
        dataChannel.onclose = () => console.log('❌ Canal de dados P2P fechado!');
    }

    function waitForIceGathering() {
        return new Promise(resolve => {
            if (peerConnection.iceGatheringState === 'complete') {
                resolve(peerConnection.localDescription);
                return;
            }

            let timeoutId;
            const done = () => {
                peerConnection.removeEventListener('icegatheringstatechange', checkState);
                peerConnection.removeEventListener('icecandidate', checkCandidate);
                clearTimeout(timeoutId);
                resolve(peerConnection.localDescription);
            };

            const checkState = () => {
                if (peerConnection.iceGatheringState === 'complete') done();
            };
            const checkCandidate = (event) => {
                if (!event.candidate) done();
            };

            peerConnection.addEventListener('icegatheringstatechange', checkState);
            peerConnection.addEventListener('icecandidate', checkCandidate);
            
            timeoutId = setTimeout(done, 3000);
        });
    }

    return {
        async createOffer() {
            dataChannel = peerConnection.createDataChannel('secure-chat-channel');
            setupDataChannelEvents();
            
            const offer = await peerConnection.createOffer();
            await peerConnection.setLocalDescription(offer);
            return offer;
        },
        
        async createOfferWithGathering() {
            dataChannel = peerConnection.createDataChannel('secure-chat-channel');
            setupDataChannelEvents();
            const offer = await peerConnection.createOffer();
            await peerConnection.setLocalDescription(offer);
            return await waitForIceGathering();
        },

        async createAnswer(offer) {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);
            return answer;
        },

        async createAnswerWithGathering(offer) {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);
            return await waitForIceGathering();
        },

        async handleAnswer(answer) {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
        },

        async addIceCandidate(candidate) {
            try {
                await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (e) {
                console.error('Erro ao adicionar candidato ICE recebido', e);
            }
        },

        send(data) {
            if (dataChannel && dataChannel.readyState === 'open') {
                dataChannel.send(data);
            } else {
                console.error('Tentativa de envio, mas o canal de dados não está aberto.');
                throw new Error('Canal de dados não está aberto.');
            }
        },

        close() {
            if (peerConnection) {
                peerConnection.close();
            }
        }
    };
}