// extension/popup.js

document.addEventListener("DOMContentLoaded", () => {
  const SIGNALING_SERVER_URL = "ws://localhost:8080";

  // --- Elementos da UI ---
  const myIdDisplaySpan = document.querySelector("#my-id-display span");
  const peerStatus = document.getElementById("peer-status");
  const setupView = document.getElementById("setup-view");
  const chatView = document.getElementById("chat-view");
  const peerIdInput = document.getElementById("peer-id-input");
  const connectBtn = document.getElementById("connect-btn");
  const messagesDiv = document.getElementById("messages");
  const messageInput = document.getElementById("message-input");
  const sendBtn = document.getElementById("send-btn");
  const disconnectBtn = document.getElementById("disconnect-btn");
  const imageInput = document.getElementById("image-input");
  const contactNicknameInput = document.getElementById("contact-nickname");
  const saveContactBtn = document.getElementById("save-contact-btn");
  const contactsList = document.getElementById("contacts-list");
  const pinBtn = document.getElementById("pin-btn");

  const connectionModeSelect = document.getElementById("connection-mode");
  const autoModeUi = document.getElementById("auto-mode-ui");
  const manualModeUi = document.getElementById("manual-mode-ui");
  const createManualOfferBtn = document.getElementById(
    "create-manual-offer-btn",
  );
  const manualCodeDisplay = document.getElementById("manual-code-display");
  const manualCodeInput = document.getElementById("manual-code-input");
  const processManualCodeBtn = document.getElementById(
    "process-manual-code-btn",
  );

  // --- Estado da Aplicação ---
  let myId = null;
  let peerId = null;
  let signalingSocket = null;
  let keyPair = null;
  let sharedSecretKey = null;
  let rtcHandler = null;

  // =================================================================================
  // 1. INICIALIZAÇÃO E SINALIZAÇÃO (WEBSOCKET)
  // =================================================================================

  function connectToSignaling() {
    if (connectionModeSelect.value === "manual") return;
    signalingSocket = new WebSocket(SIGNALING_SERVER_URL);
    signalingSocket.onmessage = handleSignalingMessage;
    signalingSocket.onopen = () =>
      console.log("🔗 Conectado ao servidor de sinalização.");
    signalingSocket.onclose = () => {
      console.log("🔌 Desconectado do servidor de sinalização.");
      displaySystemMessage(
        "Desconectado do servidor. Tentando reconectar...",
        "warning",
      );
      updatePeerStatus("Offline", "offline");
      if (connectionModeSelect.value === "auto")
        setTimeout(connectToSignaling, 3000);
    };
    signalingSocket.onerror = () => {
      console.error("❌ Erro no WebSocket.");
      displaySystemMessage(
        "Erro de conexão com o servidor de sinalização.",
        "warning",
      );
    };
  }

  function sendSignalingMessage(type, payload) {
    if (
      signalingSocket &&
      signalingSocket.readyState === WebSocket.OPEN &&
      peerId
    ) {
      signalingSocket.send(JSON.stringify({ target: peerId, type, payload }));
    }
  }

  async function handleSignalingMessage(event) {
    const msg = JSON.parse(event.data);

    switch (msg.type) {
      case "your-id":
        myId = msg.id;
        myIdDisplaySpan.textContent = myId;
        break;

      case "key-exchange":
        peerId = msg.from;
        initializeWebRTCHandler();
        keyPair = await CryptoHandler.generateKeys();
        sharedSecretKey = await CryptoHandler.deriveSharedSecret(
          keyPair.privateKey,
          msg.payload.publicKey,
        );

        const myPublicKey = await CryptoHandler.exportPublicKey(
          keyPair.publicKey,
        );
        sendSignalingMessage("key-exchange-reply", { publicKey: myPublicKey });
        break;

      case "key-exchange-reply":
        sharedSecretKey = await CryptoHandler.deriveSharedSecret(
          keyPair.privateKey,
          msg.payload.publicKey,
        );
        const offer = await rtcHandler.createOffer();
        sendSignalingMessage("webrtc-offer", offer);
        break;

      case "webrtc-offer":
        const answer = await rtcHandler.createAnswer(msg.payload);
        sendSignalingMessage("webrtc-answer", answer);
        break;

      case "webrtc-answer":
        await rtcHandler.handleAnswer(msg.payload);
        break;

      case "ice-candidate":
        if (rtcHandler) {
          await rtcHandler.addIceCandidate(msg.payload);
        }
        break;
    }
  }

  // =================================================================================
  // 2. LÓGICA P2P (WEBRTC) E CRIPTOGRAFIA
  // =================================================================================

  // --- Lógica Manual (Sem Servidor) ---
  async function createManualOffer() {
    displaySystemMessage("Gerando código de convite... Aguarde.", "info");
    initializeWebRTCHandler();
    keyPair = await CryptoHandler.generateKeys();
    const myPublicKey = await CryptoHandler.exportPublicKey(keyPair.publicKey);

    // Cria oferta e espera coletar todos os candidatos ICE
    const offer = await rtcHandler.createOfferWithGathering();

    const codeData = {
      type: "offer",
      sdp: offer,
      publicKey: myPublicKey,
    };

    const codeString = btoa(JSON.stringify(codeData));
    manualCodeDisplay.value = codeString;
    manualCodeDisplay.style.display = "block";
    manualCodeDisplay.select();
    displaySystemMessage(
      "Copie o código acima e envie para seu contato.",
      "success",
    );
  }

  async function processManualCode() {
    const codeString = manualCodeInput.value.trim();
    if (!codeString) return;

    try {
      const data = JSON.parse(atob(codeString));

      if (data.type === "offer") {
        // Recebi um convite, vou gerar resposta
        displaySystemMessage("Processando convite...", "info");
        initializeWebRTCHandler();
        keyPair = await CryptoHandler.generateKeys();

        // Deriva chave secreta
        sharedSecretKey = await CryptoHandler.deriveSharedSecret(
          keyPair.privateKey,
          data.publicKey,
        );

        // Gera resposta WebRTC
        const answer = await rtcHandler.createAnswerWithGathering(data.sdp);
        const myPublicKey = await CryptoHandler.exportPublicKey(
          keyPair.publicKey,
        );

        const responseData = {
          type: "answer",
          sdp: answer,
          publicKey: myPublicKey,
        };

        const responseString = btoa(JSON.stringify(responseData));
        manualCodeDisplay.value = responseString;
        manualCodeDisplay.style.display = "block";
        manualCodeDisplay.select();
        displaySystemMessage(
          "Convite aceito! Envie o código acima de volta para quem te convidou.",
          "success",
        );
      } else if (data.type === "answer") {
        // Recebi a resposta do meu convite
        if (!rtcHandler || !keyPair) {
          displaySystemMessage(
            "Erro: Sessão perdida. Mantenha a janela aberta.",
            "error",
          );
          return;
        }
        displaySystemMessage("Finalizando conexão...", "info");
        sharedSecretKey = await CryptoHandler.deriveSharedSecret(
          keyPair.privateKey,
          data.publicKey,
        );
        await rtcHandler.handleAnswer(data.sdp);
      }
    } catch (e) {
      console.error(e);
      displaySystemMessage("Código inválido.", "error");
    }
  }

  function initializeWebRTCHandler() {
    rtcHandler = WebRTCHandler(
      handleDataChannelMessage,
      handleConnectionStateChange,
      (candidate) => sendSignalingMessage("ice-candidate", candidate),
      activateChat,
    );
  }

  async function handleDataChannelMessage(encryptedData) {
    const decryptedData = await CryptoHandler.decrypt(
      sharedSecretKey,
      encryptedData,
    );
    if (!decryptedData) {
      displaySystemMessage(
        "Falha ao descriptografar mensagem recebida.",
        "error",
      );
      return;
    }

    try {
      const payloadString = new TextDecoder().decode(decryptedData);
      const payload = JSON.parse(payloadString);

      if (payload.type === "text") {
        displayMessage(payload.content, "received");
      } else if (payload.type === "file" && payload.content) {
        const byteString = atob(payload.content);
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) {
          ia[i] = byteString.charCodeAt(i);
        }
        const blob = new Blob([ab], { type: payload.mimeType });
        displayImage(URL.createObjectURL(blob), "received");
      }
    } catch (e) {
      console.error("Erro ao processar payload recebido:", e);
      displaySystemMessage("Recebida mensagem em formato inválido.", "warning");
    }
  }

  function handleConnectionStateChange(state) {
    console.log("Estado da conexão WebRTC:", state);
    if (state === "connected") {
      updatePeerStatus("Conectado (Seguro)", "online");
      activateChat();
    } else if (["disconnected", "failed", "closed"].includes(state)) {
      resetState();
    }
  }

  // =================================================================================
  // 3. AÇÕES E MANIPULAÇÃO DA UI
  // =================================================================================

  function loadContacts() {
    chrome.storage.local.get(["contacts"], (result) => {
      const contacts = result.contacts || [];
      renderContacts(contacts);
    });
  }

  function saveContact() {
    const id = peerIdInput.value.trim();
    const nickname = contactNicknameInput.value.trim() || id;

    if (!id) {
      displaySystemMessage("Digite um ID para salvar.", "error");
      return;
    }

    chrome.storage.local.get(["contacts"], (result) => {
      // Garante que contacts seja um array
      const contacts = Array.isArray(result.contacts) ? result.contacts : [];
      const existingIndex = contacts.findIndex((c) => c.id === id);
      if (existingIndex >= 0) {
        contacts[existingIndex].nickname = nickname;
      } else {
        contacts.push({ id, nickname });
      }

      chrome.storage.local.set({ contacts }, () => {
        if (chrome.runtime.lastError) {
          console.error("Erro ao salvar contato:", chrome.runtime.lastError);
          displaySystemMessage("Erro ao salvar contato.", "error");
        } else {
          loadContacts();
          contactNicknameInput.value = "";
          displaySystemMessage("Contato salvo com sucesso!", "success");
        }
      });
    });
  }

  function deleteContact(id) {
    chrome.storage.local.get(["contacts"], (result) => {
      let contacts = result.contacts || [];
      contacts = contacts.filter((c) => c.id !== id);
      chrome.storage.local.set({ contacts }, () => loadContacts());
    });
  }

  function renderContacts(contacts) {
    contactsList.innerHTML = "";
    if (contacts.length === 0) {
      contactsList.innerHTML =
        '<li style="color: #999; font-size: 12px; text-align: center;">Nenhum contato salvo.</li>';
      return;
    }
    contacts.forEach((contact) => {
      const li = document.createElement("li");
      li.style.cssText =
        "display: flex; justify-content: space-between; align-items: center; padding: 5px; border-bottom: 1px solid #f0f0f0;";
      li.innerHTML = `<span style="cursor: pointer; font-weight: 500; flex-grow: 1;" title="${contact.id}">${contact.nickname}</span>
                            <button class="delete-btn" style="padding: 2px 6px; font-size: 12px; background: #dc3545; color: white; border: none; border-radius: 3px; cursor: pointer;">×</button>`;
      li.querySelector("span").onclick = () => {
        peerIdInput.value = contact.id;
      };
      li.querySelector(".delete-btn").onclick = (e) => {
        e.stopPropagation();
        deleteContact(contact.id);
      };
      contactsList.appendChild(li);
    });
  }

  async function startConnection() {
    const id = peerIdInput.value.trim();
    if (!id) {
      displaySystemMessage("Por favor, insira o ID do outro usuário.", "error");
      return;
    }
    peerId = id;

    initializeWebRTCHandler();
    keyPair = await CryptoHandler.generateKeys();
    const myPublicKey = await CryptoHandler.exportPublicKey(keyPair.publicKey);
    sendSignalingMessage("key-exchange", { publicKey: myPublicKey });
  }

  async function sendMessage() {
    const text = messageInput.value;
    if (!text) return;
    if (!sharedSecretKey) {
      displaySystemMessage(
        "Erro: Chave de criptografia não estabelecida.",
        "error",
      );
      return;
    }

    try {
      const payload = { type: "text", content: text };
      const payloadString = JSON.stringify(payload);
      const encryptedMessage = await CryptoHandler.encrypt(
        sharedSecretKey,
        payloadString,
      );
      rtcHandler.send(encryptedMessage);

      displayMessage(text, "sent");
      messageInput.value = "";
    } catch (error) {
      console.error("Falha ao enviar mensagem:", error);
      displaySystemMessage("Falha ao enviar a mensagem.", "error");
    }
  }

  function sendFile(file) {
    if (!file) return;
    if (!sharedSecretKey) {
      displaySystemMessage(
        "Erro: Chave de criptografia não estabelecida.",
        "error",
      );
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const base64Content = e.target.result.split(",")[1];
        const payload = {
          type: "file",
          content: base64Content,
          mimeType: file.type,
          name: file.name,
        };
        const payloadString = JSON.stringify(payload);
        const encryptedFile = await CryptoHandler.encrypt(
          sharedSecretKey,
          payloadString,
        );
        rtcHandler.send(encryptedFile);
        displayImage(URL.createObjectURL(file), "sent");
      } catch (error) {
        console.error("Falha ao enviar arquivo:", error);
        displaySystemMessage("Falha ao enviar o arquivo.", "error");
      }
    };
    reader.readAsDataURL(file);
  }

  function resetState() {
    if (rtcHandler) rtcHandler.close();

    updatePeerStatus("Offline", "offline");
    chatView.classList.add("hidden");
    setupView.classList.remove("hidden");
    messagesDiv.innerHTML = "";
    peerIdInput.value = "";

    peerId = null;
    keyPair = null;
    sharedSecretKey = null;
    rtcHandler = null;
  }

  function updatePeerStatus(text, className) {
    peerStatus.textContent = text;
    peerStatus.className = className;
  }

  function displayMessage(text, className) {
    const el = document.createElement("div");
    el.className = `message ${className}`;
    el.textContent = text;
    messagesDiv.appendChild(el);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  }

  function displayImage(url, className) {
    const el = document.createElement("div");
    el.className = `message ${className}`;
    const img = document.createElement("img");
    img.src = url;
    el.appendChild(img);
    messagesDiv.appendChild(el);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  }

  function displaySystemMessage(text, type = "info") {
    console.log(`SYSTEM [${type}]: ${text}`);
    if (chatView.classList.contains("hidden")) {
      const setupMessages = document.getElementById("setup-messages");
      if (setupMessages) {
        setupMessages.innerHTML = "";
        const el = document.createElement("div");
        el.className = `message system ${type}`;
        el.textContent = text;
        el.style.margin = "0 auto";
        setupMessages.appendChild(el);
      }
    } else {
      const el = document.createElement("div");
      el.className = `message system ${type}`;
      el.textContent = text;
      messagesDiv.appendChild(el);
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }
  }

  function activateChat() {
    // Garante que a troca de view só aconteça uma vez
    if (chatView.classList.contains("hidden")) {
      setupView.classList.add("hidden");
      chatView.classList.remove("hidden");
      messageInput.focus();

      // Limpa UI manual para evitar confusão se desconectar
      if (manualCodeDisplay) {
        manualCodeDisplay.value = "";
        manualCodeDisplay.style.display = "none";
      }
      if (manualCodeInput) manualCodeInput.value = "";
    }
  }

  // --- Lógica de Fixar Janela (Pop-out) ---
  const isPinned = window.location.search.includes("pinned=true");

  if (isPinned) {
    pinBtn.textContent = "❌";
    pinBtn.title = "Desfixar (Fechar janela)";
    // Tenta prevenir fechamento acidental
    window.onbeforeunload = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
  }

  pinBtn.addEventListener("click", () => {
    if (isPinned) {
      window.close();
    } else {
      chrome.windows.create({
        url: chrome.runtime.getURL("popup.html?pinned=true"),
        type: "popup",
        width: 380,
        height: 600,
      });
    }
  });

  // --- Alternar Modos ---
  connectionModeSelect.addEventListener("change", (e) => {
    if (e.target.value === "manual") {
      autoModeUi.classList.add("hidden");
      manualModeUi.classList.remove("hidden");
      if (signalingSocket) signalingSocket.close();
    } else {
      autoModeUi.classList.remove("hidden");
      manualModeUi.classList.add("hidden");
      connectToSignaling();
    }
  });

  createManualOfferBtn.addEventListener("click", createManualOffer);
  processManualCodeBtn.addEventListener("click", processManualCode);
  manualCodeDisplay.addEventListener("click", () => manualCodeDisplay.select());

  // --- Event Listeners ---
  connectBtn.addEventListener("click", startConnection);
  if (saveContactBtn) saveContactBtn.addEventListener("click", saveContact);
  sendBtn.addEventListener("click", sendMessage);
  messageInput.addEventListener(
    "keypress",
    (e) => e.key === "Enter" && sendMessage(),
  );
  disconnectBtn.addEventListener("click", resetState);
  imageInput.addEventListener(
    "change",
    (e) => e.target.files[0] && sendFile(e.target.files[0]),
  );
  myIdDisplaySpan.addEventListener("click", () => {
    if (!myId) return;
    navigator.clipboard.writeText(myId).then(() => {
      const originalText = myIdDisplaySpan.textContent;
      myIdDisplaySpan.textContent = "Copiado!";
      setTimeout(() => (myIdDisplaySpan.textContent = originalText), 1500);
    });
  });

  // --- Inicialização da Aplicação ---
  connectToSignaling();
  updatePeerStatus("Offline", "offline");
  loadContacts();
});
