// extension/popup.js

document.addEventListener("DOMContentLoaded", () => {
  // const SIGNALING_SERVER_URL = "stun.l.google.com:19302";

  // --- Elementos da UI ---
  const myIdDisplaySpan = document.querySelector("#my-id-display span");
  const myIdValue = document.getElementById("my-id-value");
  const myDisplayNameSpan = document.getElementById("my-display-name");
  const editNameBtn = document.getElementById("edit-name-btn");
  const nameModal = document.getElementById("name-modal");
  const modalIdDisplay = document.getElementById("modal-id-display");
  const modalDisplayNameInput = document.getElementById(
    "modal-display-name-input",
  );
  const modalSaveBtn = document.getElementById("modal-save-btn");
  const modalCancelBtn = document.getElementById("modal-cancel-btn");
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
  const contactIdToSaveInput = document.getElementById("contact-id-to-save");
  const pinBtn = document.getElementById("pin-btn");
  const conversationInfo = document.getElementById("conversation-info");
  let typingTimeout = null;

  const signalingUrlInput = document.getElementById("signaling-url-input");

  // ============ NOVO: Suporte a Token de Autenticação ============
  let authTokenInput = document.getElementById("auth-token-input");
  let requiresAuth = false; // Flag que indica se o servidor exige autenticação

  // Se o elemento não existir no HTML, cria um dinamicamente
  if (!authTokenInput) {
    const setupView = document.getElementById("setup-view");
    const tokenContainer = document.createElement("div");
    tokenContainer.id = "token-container";
    tokenContainer.style.cssText =
      "margin-bottom: 10px; padding: 8px; background: #f0f0f0; border-radius: 4px; display: none;";
    tokenContainer.innerHTML = `
      <label style="display: block; font-size: 12px; margin-bottom: 4px; font-weight: bold;">🔐 Token de Autenticação:</label>
      <input id="auth-token-input" type="password" placeholder="Digite o token do servidor" style="width: 100%; padding: 6px; font-size: 12px; border: 1px solid #ccc; border-radius: 3px; box-sizing: border-box;" />
      <small style="display: block; margin-top: 4px; color: #666;">Obrigatório para conectar ao servidor seguro</small>
    `;
    setupView.insertBefore(tokenContainer, setupView.children[1]);
    authTokenInput = document.getElementById("auth-token-input");
  }

  // --- Rodapé Global (Informações e Créditos) ---
  const appContainer = document.getElementById("app");
  if (appContainer) {
    const footer = document.createElement("footer");
    footer.style.cssText =
      "padding: 8px; text-align: center; font-size: 11px; color: #6c757d; border-top: 1px solid #dee2e6; background-color: #f8f9fa; flex-shrink: 0;";

    const manifest = chrome.runtime.getManifest();

    footer.innerHTML = `
          <div style="margin-bottom: 3px;">
            <strong>${manifest.name}</strong> <span style="background: #e9ecef; padding: 1px 4px; border-radius: 3px; font-size: 10px;">v${manifest.version}</span>
          </div>
          <div style="margin-bottom: 3px;">Criado por <strong>Gusvioli</strong></div>
          <div style="color: #28a745; font-size: 10px; display: flex; align-items: center; justify-content: center; gap: 4px;" title="Suas mensagens são criptografadas de ponta a ponta">
            <span>🔒</span> Segurança E2EE Ativa
          </div>
      `;
    appContainer.appendChild(footer);
  }

  // --- Estado da Aplicação ---
  let myId = null;
  let peerId = null;
  let signalingSocket = null;
  let keyPair = null;
  let sharedSecretKey = null;
  let rtcHandler = null;
  let currentFingerprint = null;

  // ============ NOVO: Gerenciamento de Nome de Exibição ============
  function loadDisplayName(userId) {
    const stored = localStorage.getItem(`displayName_${userId}`);
    return stored || userId.substring(0, 8) + "...";
  }

  function saveDisplayName(userId, displayName) {
    if (displayName.trim()) {
      localStorage.setItem(`displayName_${userId}`, displayName.trim());
    } else {
      localStorage.removeItem(`displayName_${userId}`);
    }
    updateDisplayNameUI();
  }

  function updateDisplayNameUI() {
    if (!myId) return;
    const displayName = loadDisplayName(myId);
    const isCustom = localStorage.getItem(`displayName_${myId}`);

    if (isCustom) {
      myDisplayNameSpan.textContent = `(${displayName})`;
      myDisplayNameSpan.style.display = "inline";
    } else {
      myDisplayNameSpan.style.display = "none";
    }
  }

  // Modal de edição
  editNameBtn.addEventListener("click", () => {
    if (!myId) return;
    modalIdDisplay.textContent = myId;
    const stored = localStorage.getItem(`displayName_${myId}`);
    modalDisplayNameInput.value = stored || "";
    nameModal.style.display = "flex";
    modalDisplayNameInput.focus();
  });

  modalCancelBtn.addEventListener("click", () => {
    nameModal.style.display = "none";
  });

  modalSaveBtn.addEventListener("click", () => {
    const newName = modalDisplayNameInput.value.trim();
    saveDisplayName(myId, newName);
    displaySystemMessage(
      newName
        ? `✅ Nome alterado para: "${newName}"`
        : `✅ Nome redefinido para padrão`,
      "success",
    );
    nameModal.style.display = "none";
  });

  // Fechar modal ao clicar fora
  nameModal.addEventListener("click", (e) => {
    if (e.target === nameModal) {
      nameModal.style.display = "none";
    }
  });

  // Enter para salvar
  modalDisplayNameInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      modalSaveBtn.click();
    }
  });

  // =================================================================================
  // 1. INICIALIZAÇÃO E SINALIZAÇÃO (WEBSOCKET)
  // =================================================================================

  function connectToSignaling() {
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

    // ⚠️  MUDANÇA SEGURANÇA: Não envia ID via query string, deixa o servidor gerar
    signalingSocket = new WebSocket(baseUrl);
    signalingSocket.onmessage = handleSignalingMessage;
    signalingSocket.onopen = () => {
      console.log("🔗 Conectado ao servidor de sinalização.");
      // Aguarda resposta com ID antes de fazer qualquer coisa
    };
    signalingSocket.onclose = () => {
      console.log("🔌 Desconectado do servidor de sinalização.");
      displaySystemMessage(
        "Conexão com o servidor perdida. Tentando reconectar...",
        "warning",
      );
      updatePeerStatus("Offline", "offline");
      setTimeout(connectToSignaling, 3000);
    };
    signalingSocket.onerror = () => {
      console.error("❌ Erro no WebSocket.");
      displaySystemMessage(
        "Não foi possível conectar ao servidor. Verifique a URL e se o servidor está ativo.",
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

  // ⚠️  NOVO: Função para autenticar com o servidor
  function authenticateWithServer() {
    const token = authTokenInput.value.trim();
    if (!token) {
      displaySystemMessage("❌ Insira o token de autenticação.", "error");
      authTokenInput.focus();
      return;
    }

    if (signalingSocket && signalingSocket.readyState === WebSocket.OPEN) {
      signalingSocket.send(
        JSON.stringify({
          type: "authenticate",
          token: token,
        }),
      );
    } else {
      displaySystemMessage(
        "❌ Não conectado ao servidor. Tente novamente.",
        "error",
      );
    }
  }

  // ⚠️  NOVO: Adiciona listener para o campo de token (Enter para autenticar)
  if (authTokenInput) {
    authTokenInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        authenticateWithServer();
      }
    });
  }

  async function handleSignalingMessage(event) {
    const msg = JSON.parse(event.data);

    // --- Proteção contra múltiplas conexões ---
    // Se já estivermos conectados (peerId definido) e recebermos mensagem de outro usuário, ignoramos.
    // Mensagens do sistema (como 'your-id') não têm 'from', então passam direto.
    if (peerId && msg.from && msg.from !== peerId) {
      if (msg.type === "key-exchange") {
        displaySystemMessage(
          `Tentativa de conexão de ${msg.from} bloqueada. Você já está em uma sessão.`,
          "warning",
        );
      } else {
        console.warn(
          `Ignorando mensagem ${msg.type} de ${msg.from} pois estamos conectados com ${peerId}.`,
        );
      }
      return;
    }

    switch (msg.type) {
      case "your-id":
        myId = msg.id;
        requiresAuth = msg.requiresAuth || false; // ⚠️  NOVO: Armazena se autenticação é obrigatória
        myIdValue.textContent = myId;
        updateDisplayNameUI(); // Atualiza exibição do nome
        chrome.storage.local.set({ savedId: myId });

        // ⚠️  NOVO: Se servidor exigir autenticação, mostra campo e pede para autenticar
        if (requiresAuth) {
          const tokenContainer = document.getElementById("token-container");
          if (tokenContainer) {
            tokenContainer.style.display = "block";
          }
          displaySystemMessage(
            "🔐 Autenticação obrigatória. Insira o token do servidor.",
            "warning",
          );
        } else {
          const tokenContainer = document.getElementById("token-container");
          if (tokenContainer) {
            tokenContainer.style.display = "none";
          }
          displaySystemMessage(
            "✅ Conectado ao servidor (sem autenticação).",
            "success",
          );
        }
        break;

      case "authenticated":
        signalingSocket.authenticated = true; // ⚠️  NOVO: Marca socket como autenticado
        displaySystemMessage(
          "✅ Autenticado com sucesso! Agora você pode conectar a um par.",
          "success",
        );
        break;

      case "error":
        if (msg.message && msg.message.includes("Autenticação")) {
          displaySystemMessage(`❌ ${msg.message}`, "error");
        } else {
          displaySystemMessage(
            `Erro: ${msg.message || "Desconhecido"}`,
            "error",
          );
        }
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
        displayMessage(payload.content, "received", payload.timestamp);
        notifyIfHidden("Nova Mensagem", payload.content);
      } else if (payload.type === "typing") {
        handleTypingIndicator();
      } else if (payload.type === "file" && payload.content) {
        const byteString = atob(payload.content);
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) {
          ia[i] = byteString.charCodeAt(i);
        }
        const blob = new Blob([ab], { type: payload.mimeType });
        displayImage(URL.createObjectURL(blob), "received", payload.timestamp);
        notifyIfHidden("Novo Arquivo", "Você recebeu uma imagem.");
      }
    } catch (e) {
      console.error("Erro ao processar payload recebido:", e);
      displaySystemMessage(
        "Formato de mensagem desconhecido recebido.",
        "warning",
      );
    }
  }

  function notifyIfHidden(title, message) {
    // Se a janela estiver oculta ou minimizada, envia notificação
    if (document.visibilityState === "hidden") {
      chrome.notifications.create({
        type: "basic",
        iconUrl: "icons/icon128.png",
        title: title,
        message: message,
        priority: 2,
      });
    }
  }

  function handleTypingIndicator() {
    const statusSpan = document.getElementById("peer-status");
    const originalText = statusSpan.textContent;

    if (!statusSpan.textContent.includes("digitando...")) {
      statusSpan.textContent = "digitando...";
      setTimeout(() => {
        statusSpan.textContent = "Conectado (Seguro)";
      }, 2000);
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
    // ⚠️  NOVO: Se servidor exigir autenticação, autentica primeiro
    if (requiresAuth && !signalingSocket.authenticated) {
      const token = authTokenInput.value.trim();
      if (!token) {
        displaySystemMessage(
          "❌ Token de autenticação obrigatório. Insira o token do servidor.",
          "error",
        );
        authTokenInput.focus();
        return;
      }

      // Envia mensagem de autenticação
      if (signalingSocket && signalingSocket.readyState === WebSocket.OPEN) {
        signalingSocket.send(
          JSON.stringify({
            type: "authenticate",
            token: token,
          }),
        );
        // Aguarda resposta de autenticação antes de continuar
        // A resposta virá via handleSignalingMessage
        setTimeout(() => {
          // Se não autenticou, tenta novamente
          if (!signalingSocket.authenticated) {
            displaySystemMessage(
              "❌ Falha na autenticação. Tente novamente.",
              "error",
            );
          }
        }, 2000);
        return;
      }
    }

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

  // Lógica de envio de "Digitando..."
  let lastTypingSent = 0;
  messageInput.addEventListener("input", async () => {
    const now = Date.now();
    if (now - lastTypingSent > 2000 && sharedSecretKey && rtcHandler) {
      lastTypingSent = now;
      try {
        const payload = JSON.stringify({ type: "typing" });
        const encrypted = await CryptoHandler.encrypt(sharedSecretKey, payload);
        rtcHandler.send(encrypted);
      } catch (e) {
        console.error("Erro ao enviar typing indicator", e);
      }
    }
  });

  async function sendMessage() {
    const text = messageInput.value;
    if (!text) return;
    if (!sharedSecretKey) {
      displaySystemMessage("Erro: Conexão segura não estabelecida.", "error");
      return;
    }

    try {
      const timestamp = new Date().toISOString();
      const payload = { type: "text", content: text, timestamp: timestamp };
      const payloadString = JSON.stringify(payload);
      const encryptedMessage = await CryptoHandler.encrypt(
        sharedSecretKey,
        payloadString,
      );
      rtcHandler.send(encryptedMessage);

      displayMessage(text, "sent", timestamp);
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
        const timestamp = new Date().toISOString();
        const payload = {
          type: "file",
          content: base64Content,
          mimeType: file.type,
          name: file.name,
          timestamp: timestamp,
        };
        const payloadString = JSON.stringify(payload);
        const encryptedFile = await CryptoHandler.encrypt(
          sharedSecretKey,
          payloadString,
        );

        rtcHandler.send(encryptedFile);
        displayImage(URL.createObjectURL(file), "sent", timestamp);
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

  function displayMessage(text, className, timestamp) {
    const el = document.createElement("div");
    el.className = `message ${className}`;

    // Adiciona nome do remetente
    const senderDiv = document.createElement("div");
    senderDiv.style.cssText =
      "font-size: 11px; font-weight: bold; margin-bottom: 4px; color: #666;";

    if (className === "sent") {
      const myDisplayName = loadDisplayName(myId);
      senderDiv.textContent = `📤 Você (${myDisplayName})`;
    } else {
      const peerDisplayName = loadDisplayName(peerId);
      senderDiv.textContent = `📥 ${peerDisplayName}`;
    }
    el.appendChild(senderDiv);

    const contentDiv = document.createElement("div");
    contentDiv.textContent = text;
    el.appendChild(contentDiv);

    const timeDiv = document.createElement("div");
    timeDiv.style.cssText =
      "font-size: 10px; text-align: right; margin-top: 4px; opacity: 0.7;";
    const date = timestamp ? new Date(timestamp) : new Date();
    timeDiv.textContent = date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    el.appendChild(timeDiv);

    messagesDiv.appendChild(el);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  }

  function displayImage(url, className, timestamp) {
    const el = document.createElement("div");
    el.className = `message ${className}`;

    // Adiciona nome do remetente
    const senderDiv = document.createElement("div");
    senderDiv.style.cssText =
      "font-size: 11px; font-weight: bold; margin-bottom: 4px; color: #666;";

    if (className === "sent") {
      const myDisplayName = loadDisplayName(myId);
      senderDiv.textContent = `📤 Você (${myDisplayName})`;
    } else {
      const peerDisplayName = loadDisplayName(peerId);
      senderDiv.textContent = `📥 ${peerDisplayName}`;
    }
    el.appendChild(senderDiv);

    const img = document.createElement("img");
    img.src = url;
    el.appendChild(img);

    const timeDiv = document.createElement("div");
    timeDiv.style.cssText =
      "font-size: 10px; text-align: right; margin-top: 4px; opacity: 0.7;";
    const date = timestamp ? new Date(timestamp) : new Date();
    timeDiv.textContent = date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    el.appendChild(timeDiv);

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
    }
  }

  // --- Lógica de Fixar Janela (Pop-out) ---
  const isPinned = window.location.search.includes("pinned=true");

  if (isPinned) {
    pinBtn.textContent = "❌";
    pinBtn.title = "Desfixar (Fechar janela)";

    // Desativa o ícone da extensão enquanto a janela pinada estiver aberta
    if (chrome.action) {
      chrome.action.disable();
      const reenable = () => chrome.action.enable();
      window.addEventListener("beforeunload", reenable);
      window.addEventListener("unload", reenable);
    }

    // Remove restrições de tamanho do CSS para preencher a nova janela maior
    document.documentElement.style.width = "100%";
    document.documentElement.style.height = "100%";
    document.body.style.width = "100%";
    document.body.style.height = "100%";
  }

  if (!pinBtn.dataset.listenerAttached) {
    pinBtn.dataset.listenerAttached = "true";
    pinBtn.addEventListener("click", (e) => {
      e.preventDefault();
      if (isPinned) {
        window.close();
      } else {
        handleOpenUnique();
      }
    });
  }

  // --- Função Helper para Singleton (Janela Única) ---
  function handleOpenUnique() {
    const extensionUrl = chrome.runtime.getURL("popup.html");

    if (pinBtn) pinBtn.disabled = true;

    chrome.tabs.getCurrent((currentTab) => {
      const currentTabId = currentTab ? currentTab.id : -1;

      chrome.tabs.query({ url: extensionUrl + "*" }, (tabs) => {
        // Encontra qualquer aba da extensão que NÃO seja a atual
        const otherTab = tabs.find((t) => t.id !== currentTabId);

        if (otherTab) {
          // Foca na existente
          chrome.tabs.update(otherTab.id, { active: true });
          chrome.windows.update(otherTab.windowId, { focused: true });
          window.close();
        } else {
          // Cria nova
          chrome.windows.create(
            {
              url: extensionUrl + "?pinned=true",
              type: "popup",
              width: 500,
              height: 700,
            },
            () => window.close(),
          );
        }

        setTimeout(() => {
          if (pinBtn) pinBtn.disabled = false;
        }, 1000);
      });
    });
  }

  // Salva e reconecta quando o usuário altera a URL do servidor
  signalingUrlInput.addEventListener("change", () => {
    connectToSignaling();
  });

  // --- Alterar ID Personalizado ---
  editIdBtn.addEventListener("click", (e) => {
    e.stopPropagation();

    const container = document.getElementById("my-id-display");
    if (!container) return;

    const currentId = myId || "";

    // Esconde os elementos atuais (texto do ID e botão lápis)
    const children = Array.from(container.children);
    children.forEach((child) => (child.style.display = "none"));

    // Cria interface de edição inline
    const wrapper = document.createElement("span");
    wrapper.style.display = "inline-flex";
    wrapper.style.alignItems = "center";

    const input = document.createElement("input");
    input.type = "text";
    input.value = currentId;
    input.placeholder = "Novo ID";
    input.style.cssText =
      "width: 80px; font-size: 11px; padding: 2px; margin-right: 4px; border: 1px solid #ccc; border-radius: 3px;";

    const saveBtn = document.createElement("button");
    saveBtn.textContent = "OK";
    saveBtn.style.cssText =
      "font-size: 10px; padding: 2px 6px; margin-right: 2px; background: #28a745; color: white; border: none; border-radius: 3px; cursor: pointer;";

    const cancelBtn = document.createElement("button");
    cancelBtn.textContent = "X";
    cancelBtn.style.cssText =
      "font-size: 10px; padding: 2px 6px; background: #dc3545; color: white; border: none; border-radius: 3px; cursor: pointer;";

    function closeEdit() {
      wrapper.remove();
      children.forEach((child) => (child.style.display = ""));
    }

    saveBtn.onclick = () => {
      const newId = input.value.trim();
      closeEdit();

      if (newId === currentId) return;

      if (newId) {
        // ⚠️  NOVO: IDs customizados agora devem ser removidos, pois o servidor gera seguramente
        displaySystemMessage(
          "ℹ️  O servidor agora gera IDs seguros automaticamente. O ID customizado foi ignorado.",
          "info",
        );
        // Desconecta e reconecta para obter novo ID do servidor
        if (signalingSocket) {
          signalingSocket.close();
        }
        setTimeout(connectToSignaling, 500);
      } else {
        // Se tentar limpar, apenas reconecta
        if (signalingSocket) {
          signalingSocket.close();
        }
        setTimeout(connectToSignaling, 500);
      }
    };

    cancelBtn.onclick = closeEdit;

    input.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter") saveBtn.click();
      if (ev.key === "Escape") cancelBtn.click();
    });

    wrapper.appendChild(input);
    wrapper.appendChild(saveBtn);
    wrapper.appendChild(cancelBtn);
    container.appendChild(wrapper);
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

  // ⚠️  NOVO: Listener para botão de autenticação
  const authBtn = document.getElementById("auth-btn");
  if (authBtn) {
    authBtn.addEventListener("click", authenticateWithServer);
  }

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
