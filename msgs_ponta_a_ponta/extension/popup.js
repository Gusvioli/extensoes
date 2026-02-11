document.addEventListener("DOMContentLoaded", () => {
  // Configuração da API do Dashboard
  const API_BASE = "http://localhost:3000";

  // Elementos da UI
  const ui = {
    views: {
      login: document.getElementById("view-login"),
      servers: document.getElementById("view-servers"),
      chat: document.getElementById("view-chat"),
    },
    login: {
      user: document.getElementById("login-username"),
      pass: document.getElementById("login-password"),
      btn: document.getElementById("btn-login"),
      error: document.getElementById("login-error"),
    },
    servers: {
      list: document.getElementById("servers-list-container"),
      refresh: document.getElementById("btn-refresh-servers"),
      logout: document.getElementById("btn-logout"),
      welcome: document.getElementById("user-welcome"),
    },
    chat: {
      disconnect: document.getElementById("btn-disconnect"),
      myId: document.getElementById("my-id-display"),
      targetId: document.getElementById("target-id"),
      msgList: document.getElementById("messages-list"),
      msgInput: document.getElementById("message-input"),
      btnSend: document.getElementById("btn-send"),
      btnGenKeys: document.getElementById("btn-gen-keys"),
      btnExchKeys: document.getElementById("btn-exchange-keys"),
      cryptoStatus: document.getElementById("crypto-status"),
      typingIndicator: document.getElementById("typing-indicator"),
    },
    status: document.getElementById("connection-status"),
  };

  // Estado da Aplicação
  let state = {
    user: null,
    servers: [],
    currentServer: null,
    myId: null,
    lastLoadedKey: null,
    typingTimeout: null,
    isTyping: false,
    typingUsers: {}, // Para gerenciar quem está digitando
    keys: {
      public: null,
      private: null,
      shared: null, // Chave compartilhada com o destinatário atual
    },
  };

  let ws = null;

  // --- HELPERS DE CRIPTOGRAFIA ---
  function arrayBufferToBase64(buffer) {
    let binary = "";
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  function base64ToArrayBuffer(base64) {
    const binary_string = window.atob(base64);
    const len = binary_string.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary_string.charCodeAt(i);
    }
    return bytes.buffer;
  }

  // --- NAVEGAÇÃO ---
  function showView(viewName) {
    Object.values(ui.views).forEach((el) => el.classList.remove("active"));
    ui.views[viewName].classList.add("active");
  }

  // --- INICIALIZAÇÃO ---
  // Verifica se já existe usuário logado no storage
  chrome.storage.local.get(["user", "lastTarget"], (res) => {
    if (res.user) {
      state.user = res.user;
      ui.servers.welcome.textContent = `Olá, ${state.user.name}`;
      fetchServers();
      showView("servers");
    } else {
      showView("login");
    }
    if (res.lastTarget) ui.chat.targetId.value = res.lastTarget;
  });

  // --- LOGIN ---
  ui.login.btn.addEventListener("click", async () => {
    const username = ui.login.user.value.trim();
    const password = ui.login.pass.value;

    if (!username || !password) return;

    ui.login.btn.disabled = true;
    ui.login.btn.textContent = "Entrando...";
    ui.login.error.style.display = "none";

    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (data.success) {
        state.user = data.user;
        // Salva sessão
        chrome.storage.local.set({ user: state.user });
        ui.servers.welcome.textContent = `Olá, ${state.user.name}`;
        fetchServers();
        showView("servers");
      } else {
        throw new Error(data.error || "Falha no login");
      }
    } catch (err) {
      ui.login.error.textContent = err.message;
      ui.login.error.style.display = "block";
    } finally {
      ui.login.btn.disabled = false;
      ui.login.btn.textContent = "Entrar";
    }
  });

  ui.servers.logout.addEventListener("click", () => {
    chrome.storage.local.remove("user");
    state.user = null;
    showView("login");
  });

  // --- LISTA DE SERVIDORES ---
  async function fetchServers() {
    ui.servers.list.innerHTML =
      '<div style="text-align:center; padding:10px;">Carregando...</div>';

    try {
      // Busca servidores públicos (o backend já filtra os ativos)
      const response = await fetch(
        `${API_BASE}/api/public-servers?status=active`,
        { credentials: "include" },
      );
      const data = await response.json();

      renderServers(data.servers || []);
    } catch (err) {
      ui.servers.list.innerHTML = `<div class="error-msg" style="display:block">Erro ao buscar servidores: ${err.message}</div>`;
    }
  }

  ui.servers.refresh.addEventListener("click", fetchServers);

  function renderServers(servers) {
    ui.servers.list.innerHTML = "";
    if (servers.length === 0) {
      const div = document.createElement("div");
      div.textContent = "Nenhum servidor ativo encontrado.";
      ui.servers.list.appendChild(div);
      return;
    }

    servers.forEach((server) => {
      const div = document.createElement("div");
      div.className = "server-item";

      const nameDiv = document.createElement("div");
      nameDiv.className = "server-name";
      nameDiv.textContent = server.name;

      const metaDiv = document.createElement("div");
      metaDiv.className = "server-meta";
      metaDiv.textContent = `${server.host}${server.port ? ":" + server.port : ""} | ${server.clientsCount || 0} online`;

      div.appendChild(nameDiv);
      div.appendChild(metaDiv);

      div.addEventListener("click", () => connectToServer(server));
      ui.servers.list.appendChild(div);
    });
  }

  // --- WEBSOCKET & CHAT ---
  async function connectToServer(server) {
    state.currentServer = server;

    // Se não tiver token, tenta buscar diretamente do servidor (fallback)
    if (!state.currentServer.token) {
      try {
        const httpProtocol = server.protocol === "wss" ? "https" : "http";
        // Corrige 0.0.0.0 para localhost, pois fetch falha em 0.0.0.0 no Windows/Chrome
        const fetchHost = server.host === "0.0.0.0" ? "localhost" : server.host;
        const portPart = server.port ? `:${server.port}` : "";
        const tokenUrl = `${httpProtocol}://${fetchHost}${portPart}/token`;

        const res = await fetch(tokenUrl);
        if (res.ok) {
          const data = await res.json();
          if (data.token) {
            state.currentServer.token = data.token;
          }
        }
      } catch (e) {
        console.warn("Falha ao buscar token automaticamente:", e);
      }
    }

    const portPart = server.port ? `:${server.port}` : "";
    const wsUrl = `${server.protocol}://${server.host}${portPart}`;

    ui.status.textContent = "Conectando...";
    showView("chat");

    try {
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        ui.status.textContent = "Conectado (Autenticando...)";
        ui.status.className = "status-indicator status-online";
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleWsMessage(data);
        } catch (e) {
          console.error("Erro JSON:", e);
        }
      };

      ws.onclose = () => {
        ui.status.textContent = "Desconectado";
        ui.status.className = "status-indicator status-offline";
        addLog("Conexão perdida.", "system");
        // Não volta automaticamente para a lista para permitir ler logs
      };

      ws.onerror = (err) => {
        console.error("WS Erro:", err);
        ui.status.textContent = "Erro de Conexão";
      };
    } catch (e) {
      alert("Erro ao criar WebSocket: " + e.message);
      showView("servers");
    }
  }

  ui.chat.disconnect.addEventListener("click", () => {
    if (ws) ws.close();
    showView("servers");
  });

  ui.chat.targetId.addEventListener("blur", () => {
    chrome.storage.local.set({ lastTarget: ui.chat.targetId.value });
    loadHistory();
  });

  ui.chat.msgInput.addEventListener("input", () => {
    const target = ui.chat.targetId.value.trim();
    if (!target || !ws || ws.readyState !== WebSocket.OPEN) return;

    clearTimeout(state.typingTimeout);

    if (!state.isTyping) {
      ws.send(
        JSON.stringify({ type: "typing_start", target: target, payload: {} }),
      );
      state.isTyping = true;
    }

    state.typingTimeout = setTimeout(() => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
            type: "typing_stop",
            target: target,
            payload: {},
          }),
        );
      }
      state.isTyping = false;
    }, 3000); // 3 segundos de inatividade para parar
  });

  ui.chat.myId.addEventListener("click", () => {
    if (state.myId) {
      navigator.clipboard.writeText(state.myId);
      const originalText = ui.chat.myId.textContent;
      ui.chat.myId.textContent = "Copiado!";
      setTimeout(() => {
        ui.chat.myId.textContent = originalText;
      }, 1000);
    }
  });

  function handleWsMessage(data) {
    console.log("WS Recebido:", data);

    switch (data.type) {
      case "your-id":
        state.myId = data.id;
        ui.chat.myId.textContent = `Meu ID: ${data.id}`;

        if (ui.chat.targetId.value) {
          loadHistory();
        }

        // Autenticação automática usando o token fornecido pelo Dashboard
        if (data.requiresAuth) {
          if (state.currentServer.token) {
            ws.send(
              JSON.stringify({
                type: "authenticate",
                token: state.currentServer.token,
              }),
            );
          } else {
            addLog(
              "⚠️ Erro: Servidor pede autenticação mas não tenho token.",
              "error",
            );
            ui.status.textContent = "Erro: Sem Token";
          }
        }
        break;

      case "authenticated":
        ui.status.textContent = "Online e Seguro";
        addLog("Autenticado no servidor.", "system");
        break;

      case "message":
        // Se for uma troca de chave pública
        if (
          typeof data.payload === "string" &&
          data.payload.startsWith("KEY::")
        ) {
          handlePublicKeyReceived(data.from, data.payload.replace("KEY::", ""));
        } else {
          // Mensagem normal (tentar descriptografar se tiver chave)
          displayReceivedMessage(data);
          // Para o indicador de digitação do remetente
          if (state.typingUsers[data.from]) {
            clearTimeout(state.typingUsers[data.from].timeoutId);
            delete state.typingUsers[data.from];
            updateTypingIndicator();
          }
          playNotificationSound();
        }
        break;

      case "typing_start":
        // Se já existe um timeout para este usuário, limpa para resetar
        if (state.typingUsers[data.from]) {
          clearTimeout(state.typingUsers[data.from].timeoutId);
        }
        // Define um novo timeout. Se não recebermos 'typing_stop' ou outra msg,
        // o indicador some sozinho após 5 segundos.
        state.typingUsers[data.from] = {
          timeoutId: setTimeout(() => {
            delete state.typingUsers[data.from];
            updateTypingIndicator();
          }, 5000),
        };
        updateTypingIndicator();
        break;

      case "typing_stop":
        if (state.typingUsers[data.from]) {
          clearTimeout(state.typingUsers[data.from].timeoutId);
          delete state.typingUsers[data.from];
          updateTypingIndicator();
        }
        break;

      case "error":
        addLog(`Erro: ${data.message}`, "system");
        break;
    }
  }

  // --- CRIPTOGRAFIA (Integração CryptoHandler) ---

  ui.chat.btnGenKeys.addEventListener("click", async () => {
    try {
      const keys = await CryptoHandler.generateKeys();
      state.keys.public = keys.publicKey;
      state.keys.private = keys.privateKey;

      ui.chat.cryptoStatus.textContent = "Chaves geradas! Pronto para troca.";
      ui.chat.cryptoStatus.style.color = "green";
      ui.chat.btnExchKeys.disabled = false;
      ui.chat.btnGenKeys.disabled = true;
      addLog("Par de chaves criptográficas gerado.", "system");
    } catch (e) {
      console.error(e);
      alert("Erro ao gerar chaves.");
    }
  });

  ui.chat.btnExchKeys.addEventListener("click", async () => {
    const target = ui.chat.targetId.value.trim();
    if (!target || !state.keys.public) return;

    // Exportar chave pública para JWK
    const jwk = await CryptoHandler.exportPublicKey(state.keys.public);
    const payload = "KEY::" + JSON.stringify(jwk);

    ws.send(
      JSON.stringify({
        type: "message",
        target: target,
        payload: payload,
      }),
    );
    addLog(`Chave pública enviada para ${target}`, "system");
  });

  async function handlePublicKeyReceived(fromId, jwkString) {
    try {
      const jwk = JSON.parse(jwkString);
      if (!state.keys.private) {
        addLog(
          `Recebi chave de ${fromId}, mas não gerei as minhas ainda!`,
          "error",
        );
        return;
      }

      // Derivar segredo compartilhado
      state.keys.shared = await CryptoHandler.deriveSharedSecret(
        state.keys.private,
        jwk,
      );

      ui.chat.cryptoStatus.textContent = `🔒 Canal Seguro com ${fromId.substr(0, 4)}`;
      addLog(`Canal E2EE estabelecido com ${fromId}`, "system");

      // Atualiza o target ID automaticamente se estiver vazio
      if (!ui.chat.targetId.value) ui.chat.targetId.value = fromId;
    } catch (e) {
      console.error("Erro ao processar chave pública", e);
      addLog("Erro ao processar chave de criptografia.", "error");
    }
  }

  // --- ENVIO E RECEBIMENTO DE MENSAGENS ---

  function playNotificationSound() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;

      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      // Som suave de notificação ("Ding")
      osc.type = "sine";
      osc.frequency.setValueAtTime(500, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1000, ctx.currentTime + 0.1);

      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);

      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch (e) {
      console.error("Erro de áudio:", e);
    }
  }

  // --- HISTÓRICO ---
  function getHistoryKey() {
    if (!state.currentServer || !state.myId) return null;
    const target = ui.chat.targetId.value.trim();
    if (!target) return null;
    const serverKey = `${state.currentServer.host}:${state.currentServer.port}`;
    return `chat_history_${serverKey}_${state.myId}_${target}`;
  }

  async function loadHistory() {
    const key = getHistoryKey();
    if (!key) return;
    if (key === state.lastLoadedKey) return; // Evita recarregar se for o mesmo chat
    state.lastLoadedKey = key;

    ui.chat.msgList.innerHTML = "";

    try {
      const result = await chrome.storage.local.get(key);
      const history = result[key] || [];

      if (history.length > 0) {
        const div = document.createElement("div");
        div.className = "msg system";
        div.textContent = "--- Histórico Carregado ---";
        ui.chat.msgList.appendChild(div);

        history.forEach((msg) => {
          addLog(msg.text, msg.type, msg.timestamp, false);
        });

        ui.chat.msgList.scrollTop = ui.chat.msgList.scrollHeight;
      }
    } catch (e) {
      console.error("Erro ao carregar histórico:", e);
    }
  }

  function addLog(text, type = "system", timestamp = null, save = true) {
    const div = document.createElement("div");
    div.className = `msg ${type}`;

    const contentSpan = document.createElement("span");
    contentSpan.textContent = text;
    div.appendChild(contentSpan);

    const timeStr =
      timestamp ||
      new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });

    const timeSpan = document.createElement("span");
    timeSpan.className = "msg-time";
    timeSpan.textContent = timeStr;
    div.appendChild(timeSpan);

    ui.chat.msgList.appendChild(div);
    ui.chat.msgList.scrollTop = ui.chat.msgList.scrollHeight;

    // Salvar no histórico se for mensagem de chat e flag save for true
    if (save && (type === "sent" || type === "received")) {
      const key = getHistoryKey();
      if (key) {
        chrome.storage.local.get(key, (res) => {
          const history = res[key] || [];
          history.push({ text, type, timestamp: timeStr });
          // Limite de 100 mensagens por chat para economizar storage
          if (history.length > 100) history.shift();
          chrome.storage.local.set({ [key]: history });
        });
      }
    }
  }

  async function displayReceivedMessage(data) {
    let content = data.payload;
    let from = `[${data.from.substr(0, 4)}]`;
    let logType = "received";

    // Verifica se a mensagem está criptografada
    if (typeof content === "object" && content !== null && content.encrypted) {
      if (state.keys.shared) {
        try {
          const encryptedBuffer = base64ToArrayBuffer(content.data);
          const decryptedBuffer = await CryptoHandler.decrypt(
            state.keys.shared,
            encryptedBuffer,
          );
          content = new TextDecoder().decode(decryptedBuffer);
          from = `🔒 ${from}`; // Adiciona ícone de cadeado seguro
        } catch (e) {
          console.error("Falha na descriptografia:", e);
          content = "⚠️ Falha ao descriptografar mensagem!";
          logType = "error";
        }
      } else {
        content =
          "⚠️ Mensagem criptografada recebida, mas não há chave compartilhada.";
        logType = "error";
      }
    } else {
      // Mensagem em texto plano
      from = `🔓 ${from}`; // Adiciona ícone de cadeado aberto
    }

    addLog(`${from}: ${content}`, logType);

    if (!document.hasFocus()) {
      showSystemNotification(
        `Nova mensagem de ${data.from.substr(0, 4)}`,
        content,
      );
    }
  }

  function updateTypingIndicator() {
    const users = Object.keys(state.typingUsers);
    const indicator = ui.chat.typingIndicator;

    if (users.length === 0) {
      indicator.style.opacity = 0;
      return;
    }

    indicator.style.opacity = 1;
    if (users.length === 1) {
      indicator.textContent = `${users[0].substr(0, 4)}... está digitando...`;
    } else if (users.length === 2) {
      indicator.textContent = `${users[0].substr(0, 4)} e ${users[1].substr(0, 4)} estão digitando...`;
    } else {
      indicator.textContent = "Várias pessoas estão digitando...";
    }
  }

  function showSystemNotification(title, message) {
    // Ícone genérico (azul) em base64 para garantir funcionamento imediato sem arquivos externos
    const iconUrl =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAABmJLR0QA/wD/AP+gvaeTAAAAcElEQVRoge3QwQ2AIBRE0Z+F2W0di0W5tQ0j8RElJp4zJ2TzYwIAAAAAAABgx0qS1pI070l6z3496yVpX5K27Nez3pL2JGnLfj3rJWlPkrbs17NekvYkact+PeslaU+StuzXs14AAAAAAADw5gJqCg2h211W9AAAAABJRU5ErkJggg==";

    chrome.notifications.create({
      type: "basic",
      iconUrl: iconUrl,
      title: title,
      message: message,
      priority: 2,
    });
  }

  ui.chat.btnSend.addEventListener("click", async () => {
    const target = ui.chat.targetId.value.trim();
    const text = ui.chat.msgInput.value.trim();

    if (!target || !text) return;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    let logText = `🔓 Eu: ${text}`;
    const msg = {
      type: "message",
      target: target,
      payload: text, // Padrão é texto plano
    };

    // Se tiver chave compartilhada, criptografa a mensagem
    if (state.keys.shared) {
      const encryptedBuffer = await CryptoHandler.encrypt(
        state.keys.shared,
        text,
      );
      msg.payload = {
        encrypted: true,
        data: arrayBufferToBase64(encryptedBuffer),
      };
      logText = `🔒 Eu: ${text}`;
    }

    // Para o indicador de "digitando" imediatamente ao enviar
    if (state.isTyping) {
      clearTimeout(state.typingTimeout);
      ws.send(
        JSON.stringify({ type: "typing_stop", target: target, payload: {} }),
      );
      state.isTyping = false;
    }

    ws.send(JSON.stringify(msg));
    addLog(logText, "sent");
    ui.chat.msgInput.value = "";
    chrome.storage.local.set({ lastTarget: target });
  });
});
