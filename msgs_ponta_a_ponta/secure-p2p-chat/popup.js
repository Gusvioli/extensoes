// extension/popup.js

document.addEventListener("DOMContentLoaded", () => {
  // const SIGNALING_SERVER_URL = "stun.l.google.com:19302";

  // --- Elementos da UI ---
  const myIdDisplaySpan = document.querySelector("#my-id-display span");
  const peerStatus = document.getElementById("peer-status");
  const editIdBtn = document.getElementById("edit-id-btn");
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
  const contactIdToSaveInput = document.getElementById("contact-id-to-save");
  const pinBtn = document.getElementById("pin-btn");
  const conversationInfo = document.getElementById("conversation-info");

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
  const signalingUrlInput = document.getElementById("signaling-url-input");

  // --- Estado da Aplicação ---
  let myId = null;
  let peerId = null;
  let signalingSocket = null;
  let keyPair = null;
  let sharedSecretKey = null;
  let rtcHandler = null;
  let currentFingerprint = null;

  // =================================================================================
  // 1. INICIALIZAÇÃO E SINALIZAÇÃO (WEBSOCKET)
  // =================================================================================

  function connectToSignaling() {
    if (connectionModeSelect.value === "manual") return;

    // Fecha conexão existente se houver, para evitar duplicidade e loops de reconexão
    if (signalingSocket) {
      signalingSocket.onclose = null; // Remove handler para não agendar reconexão automática do socket antigo
      signalingSocket.close();
    }

    let baseUrl = signalingUrlInput.value.trim();

    // Se estiver vazio ou for o endereço STUN (que não é WebSocket), usa localhost
    if (!baseUrl || baseUrl.includes("stun.l.google.com")) {
      baseUrl = "ws://localhost:8080";
      signalingUrlInput.value = baseUrl;
    }

    // Garante que a URL comece com ws:// ou wss://
    if (!baseUrl.startsWith("ws://") && !baseUrl.startsWith("wss://")) {
      baseUrl = `ws://${baseUrl}`;
      signalingUrlInput.value = baseUrl;
    }
    chrome.storage.local.set({ signalingUrl: baseUrl });

    chrome.storage.local.get(["customId"], (result) => {
      let url = baseUrl;
      const separator = url.includes("?") ? "&" : "?";
      if (result.customId) {
        url += `${separator}id=${encodeURIComponent(result.customId)}`;
      }

      signalingSocket = new WebSocket(url);
      signalingSocket.onmessage = handleSignalingMessage;
      signalingSocket.onopen = () =>
        console.log("🔗 Conectado ao servidor de sinalização.");
      signalingSocket.onclose = () => {
        console.log("🔌 Desconectado do servidor de sinalização.");
        displaySystemMessage(
          "Conexão com o servidor perdida. Tentando reconectar...",
          "warning",
        );
        updatePeerStatus("Offline", "offline");
        if (connectionModeSelect.value === "auto")
          setTimeout(connectToSignaling, 3000);
      };
      signalingSocket.onerror = () => {
        console.error("❌ Erro no WebSocket.");
        displaySystemMessage(
          "Não foi possível conectar ao servidor. Verifique a URL e se o servidor está ativo.",
          "warning",
        );
      };
    });
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
        currentFingerprint = await CryptoHandler.computeFingerprint(
          myPublicKey,
          msg.payload.publicKey,
        );
        sendSignalingMessage("key-exchange-reply", { publicKey: myPublicKey });
        break;

      case "key-exchange-reply":
        sharedSecretKey = await CryptoHandler.deriveSharedSecret(
          keyPair.privateKey,
          msg.payload.publicKey,
        );
        const myPub = await CryptoHandler.exportPublicKey(keyPair.publicKey);
        currentFingerprint = await CryptoHandler.computeFingerprint(
          myPub,
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
    displaySystemMessage("Criando convite seguro... Aguarde.", "info");
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
      "Convite gerado! Copie o código acima e envie para o contato.",
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
        displaySystemMessage("Verificando e processando convite...", "info");
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
        currentFingerprint = await CryptoHandler.computeFingerprint(
          myPublicKey,
          data.publicKey,
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
          "Convite validado! Envie o código de resposta acima para o remetente.",
          "success",
        );
      } else if (data.type === "answer") {
        // Recebi a resposta do meu convite
        if (!rtcHandler || !keyPair) {
          displaySystemMessage(
            "Erro: Sessão interrompida. Mantenha a janela aberta durante a conexão.",
            "error",
          );
          return;
        }
        displaySystemMessage("Estabelecendo conexão segura...", "info");
        sharedSecretKey = await CryptoHandler.deriveSharedSecret(
          keyPair.privateKey,
          data.publicKey,
        );
        const myPubManual = await CryptoHandler.exportPublicKey(
          keyPair.publicKey,
        );
        currentFingerprint = await CryptoHandler.computeFingerprint(
          myPubManual,
          data.publicKey,
        );
        await rtcHandler.handleAnswer(data.sdp);
      }
    } catch (e) {
      console.error(e);
      displaySystemMessage("O código inserido é inválido.", "error");
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
        "Erro ao descriptografar a mensagem recebida.",
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
      displaySystemMessage(
        "Formato de mensagem desconhecido recebido.",
        "warning",
      );
    }
  }

  function handleConnectionStateChange(state) {
    console.log("Estado da conexão WebRTC:", state);
    if (state === "connected") {
      updatePeerStatus("Conectado (Seguro)", "online");
      if (myId && peerId) {
        let infoText = `${myId} <--> ${peerId}`;
        if (currentFingerprint) {
          infoText += `\n🔐 Safety Number: ${currentFingerprint}`;
        }
        conversationInfo.textContent = infoText;
        conversationInfo.style.whiteSpace = "pre-wrap"; // Garante que a quebra de linha \n funcione
        conversationInfo.style.display = "block";
      } else {
        conversationInfo.style.display = "none";
      }
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
    const id = contactIdToSaveInput.value.trim() || peerIdInput.value.trim();
    const nickname = contactNicknameInput.value.trim() || id;

    if (!id) {
      displaySystemMessage("Informe um ID para salvar o contato.", "error");
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
          displaySystemMessage("Não foi possível salvar o contato.", "error");
        } else {
          loadContacts();
          contactNicknameInput.value = "";
          contactIdToSaveInput.value = "";
          displaySystemMessage("Contato salvo!", "success");
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
      displaySystemMessage("Insira o ID do usuário para conectar.", "error");
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
      displaySystemMessage("Erro: Conexão segura não estabelecida.", "error");
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
      displaySystemMessage("Não foi possível enviar a mensagem.", "error");
    }
  }

  function sendFile(file) {
    if (!file) return;
    if (!sharedSecretKey) {
      displaySystemMessage("Erro: Conexão segura não estabelecida.", "error");
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
        displaySystemMessage("Não foi possível enviar o arquivo.", "error");
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
    conversationInfo.textContent = "";
    conversationInfo.style.display = "none";

    peerId = null;
    keyPair = null;
    sharedSecretKey = null;
    rtcHandler = null;
    currentFingerprint = null;
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
  
  // Salva e reconecta quando o usuário altera a URL do servidor
  signalingUrlInput.addEventListener("change", () => {
    connectToSignaling();
  });

  // --- Alterar ID Personalizado ---
  editIdBtn.addEventListener("click", (e) => {
    e.stopPropagation();

    // Criação do Modal para substituir o prompt
    const modalOverlay = document.createElement("div");
    modalOverlay.style.cssText =
      "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:2000;";

    const modalContent = document.createElement("div");
    modalContent.style.cssText =
      "background:white;padding:20px;border-radius:8px;width:85%;max-width:300px;box-shadow:0 4px 6px rgba(0,0,0,0.1);";

    const title = document.createElement("h3");
    title.textContent = "Defina seu ID Personalizado";
    title.style.cssText = "margin-top:0;font-size:16px;color:#333;";

    const desc = document.createElement("p");
    desc.textContent = "Deixe vazio para usar um ID aleatório.";
    desc.style.cssText = "font-size:12px;color:#666;margin-bottom:10px;";

    const input = document.createElement("input");
    input.type = "text";
    input.value = myId || "";
    input.placeholder = "Ex: usuario123";
    input.style.cssText =
      "width:100%;padding:8px;margin-bottom:15px;border:1px solid #ddd;border-radius:4px;box-sizing:border-box;";

    const btnContainer = document.createElement("div");
    btnContainer.style.cssText =
      "display:flex;justify-content:flex-end;gap:10px;";

    const cancelBtn = document.createElement("button");
    cancelBtn.textContent = "Cancelar";
    cancelBtn.style.cssText =
      "background:#6c757d;color:white;border:none;padding:6px 12px;border-radius:4px;cursor:pointer;";
    cancelBtn.onclick = () => document.body.removeChild(modalOverlay);

    const saveBtn = document.createElement("button");
    saveBtn.textContent = "Salvar";
    saveBtn.style.cssText =
      "background:#007bff;color:white;border:none;padding:6px 12px;border-radius:4px;cursor:pointer;";

    saveBtn.onclick = () => {
      const newId = input.value.trim();
      document.body.removeChild(modalOverlay);

      if (newId) {
        chrome.storage.local.set({ customId: newId }, () => {
          displaySystemMessage(
            `ID personalizado definido. Reconectando...`,
            "info",
          );
          if (signalingSocket) signalingSocket.close();
        });
      } else {
        chrome.storage.local.remove("customId", () => {
          displaySystemMessage("Restaurando ID aleatório...", "info");
          if (signalingSocket) signalingSocket.close();
        });
      }
    };

    btnContainer.appendChild(cancelBtn);
    btnContainer.appendChild(saveBtn);
    modalContent.appendChild(title);
    modalContent.appendChild(desc);
    modalContent.appendChild(input);
    modalContent.appendChild(btnContainer);
    modalOverlay.appendChild(modalContent);
    document.body.appendChild(modalOverlay);
    input.focus();
  });

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
  chrome.storage.local.get(["signalingUrl"], (result) => {
    // Carrega a URL salva, exceto se for o endereço STUN incorreto (correção de legado)
    if (
      result.signalingUrl &&
      !result.signalingUrl.includes("stun.l.google.com")
    ) {
      signalingUrlInput.value = result.signalingUrl;
    } else {
      signalingUrlInput.value = "ws://localhost:8080";
    }
    connectToSignaling();
  });
  updatePeerStatus("Offline", "offline");
  loadContacts();
});
