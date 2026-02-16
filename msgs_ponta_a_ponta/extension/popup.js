document.addEventListener("DOMContentLoaded", () => {
  // Configuração da API do Dashboard
  let API_BASE = "http://localhost:3000";

  // Elementos da UI
  const ui = {
    views: {
      login: document.getElementById("view-login"),
      servers: document.getElementById("view-servers"),
      chat: document.getElementById("view-chat"),
      settings: document.getElementById("view-settings"),
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
      reconnect: document.getElementById("btn-reconnect"),
      myId: document.getElementById("my-id-display"),
      targetId: document.getElementById("target-id"),
      msgList: document.getElementById("messages-list"),
      msgInput: document.getElementById("message-input"),
      btnSend: document.getElementById("btn-send"),
      btnEmoji: document.getElementById("btn-emoji"),
      emojiPicker: document.getElementById("emoji-picker"),
      btnGenKeys: document.getElementById("btn-gen-keys"),
      btnExchKeys: document.getElementById("btn-exchange-keys"),
      cryptoStatus: document.getElementById("crypto-status"),
      typingIndicator: document.getElementById("typing-indicator"),
      replyBar: document.getElementById("reply-preview-bar"),
      replySender: document.getElementById("reply-preview-sender"),
      replyText: document.getElementById("reply-preview-text"),
      replyCancel: document.getElementById("btn-cancel-reply"),
      editBar: document.getElementById("edit-preview-bar"),
      editCancel: document.getElementById("btn-cancel-edit"),
    },
    settings: {
      openBtn: document.getElementById("btn-open-settings"),
      saveBtn: document.getElementById("btn-save-settings"),
      cancelBtn: document.getElementById("btn-cancel-settings"),
      themeSelector: document.getElementById("theme-selector"),
      myNickname: document.getElementById("setting-my-nickname"),
      btnClearHistory: document.getElementById("btn-clear-history"),
      clearExitCheckbox: document.getElementById("setting-clear-exit"),
      notificationsCheckbox: document.getElementById("setting-notifications"),
      soundsCheckbox: document.getElementById("setting-sounds"),
      autoReconnectCheckbox: document.getElementById("setting-auto-reconnect"),
      useFixedIdCheckbox: document.getElementById("setting-use-fixed-id"),
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
    contacts: {}, // Mapa de ID -> Apelido
    theme: "light",
    clearHistoryOnExit: false,
    myNickname: "",
    notificationsEnabled: true,
    soundsEnabled: true,
    useFixedId: false,
    autoReconnect: true,
    reconnectAttempts: 0,
    maxReconnectAttempts: 5,
    reconnectTimer: null,
    isManualDisconnect: false,
    sessionSecret: null, // Segredo para restaurar sessão
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

  // --- HELPER DE CONTATOS ---
  function getDisplayName(id) {
    if (!id) return "Desconhecido";
    if (state.contacts[id]) return state.contacts[id];
    return id.substr(0, 5); // Fallback para os 5 primeiros caracteres
  }

  // --- INICIALIZAÇÃO ---
  // Verifica se já existe usuário logado no storage
  chrome.storage.local.get(
    [
      "user",
      "lastTarget",
      "apiBase",
      "contacts",
      "theme",
      "clearHistoryOnExit",
      "myNickname",
      "notificationsEnabled",
      "soundsEnabled",
      "useFixedId",
      "autoReconnect",
      "myId",
      "sessionSecret",
    ],
    (res) => {
      if (res.apiBase) {
        API_BASE = res.apiBase;
      }
      if (res.contacts) state.contacts = res.contacts;
      if (res.clearHistoryOnExit) {
        state.clearHistoryOnExit = res.clearHistoryOnExit;
        // Se a opção estiver ativa, limpa qualquer histórico residual ao iniciar
        chrome.storage.local.get(null, (items) => {
          const keys = Object.keys(items).filter((k) =>
            k.startsWith("chat_history_"),
          );
          if (keys.length > 0) chrome.storage.local.remove(keys);
        });
      }
      if (res.myNickname) state.myNickname = res.myNickname;
      if (res.notificationsEnabled !== undefined) {
        state.notificationsEnabled = res.notificationsEnabled;
      }
      if (res.soundsEnabled !== undefined) {
        state.soundsEnabled = res.soundsEnabled;
      }
      if (res.useFixedId !== undefined) {
        state.useFixedId = res.useFixedId;
      }
      if (res.autoReconnect !== undefined) {
        state.autoReconnect = res.autoReconnect;
      }
      if (res.theme) {
        state.theme = res.theme;
        document.documentElement.setAttribute("data-theme", res.theme);
      }
      if (res.myId) {
        state.myId = res.myId;
      }
      if (res.sessionSecret) {
        state.sessionSecret = res.sessionSecret;
      }
      if (res.user) {
        state.user = res.user;
        ui.servers.welcome.textContent = `Olá, ${state.user.name}`;
        fetchServers();
        showView("servers");
      } else {
        showView("login");
      }
      if (res.lastTarget) ui.chat.targetId.value = res.lastTarget;
    },
  );

  // --- LÓGICA DE SELEÇÃO DE TEMA ---
  const themeBtns = ui.settings.themeSelector.querySelectorAll(".theme-btn");
  themeBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      themeBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
    });
  });

  // --- CONFIGURAÇÕES ---
  ui.settings.openBtn.addEventListener("click", () => {
    const currentTheme = state.theme || "light";
    themeBtns.forEach((btn) => {
      if (btn.dataset.value === currentTheme) btn.classList.add("active");
      else btn.classList.remove("active");
    });
    ui.settings.clearExitCheckbox.checked = state.clearHistoryOnExit;
    ui.settings.myNickname.value = state.myNickname || "";
    ui.settings.notificationsCheckbox.checked = state.notificationsEnabled;
    ui.settings.soundsCheckbox.checked = state.soundsEnabled;
    if (ui.settings.autoReconnectCheckbox) {
      ui.settings.autoReconnectCheckbox.checked = state.autoReconnect;
    }
    if (ui.settings.useFixedIdCheckbox) {
      ui.settings.useFixedIdCheckbox.checked = state.useFixedId;
    }
    showView("settings");
  });

  ui.settings.cancelBtn.addEventListener("click", () => {
    if (state.user) {
      showView("servers");
    } else {
      showView("login");
    }
  });

  ui.settings.saveBtn.addEventListener("click", () => {
    const activeBtn =
      ui.settings.themeSelector.querySelector(".theme-btn.active");
    const newTheme = activeBtn ? activeBtn.dataset.value : "light";
    const clearExit = ui.settings.clearExitCheckbox.checked;
    const notifications = ui.settings.notificationsCheckbox.checked;
    const sounds = ui.settings.soundsCheckbox.checked;
    const autoReconnect = ui.settings.autoReconnectCheckbox
      ? ui.settings.autoReconnectCheckbox.checked
      : state.autoReconnect;
    const useFixedId = ui.settings.useFixedIdCheckbox
      ? ui.settings.useFixedIdCheckbox.checked
      : state.useFixedId;
    const newNickname = ui.settings.myNickname.value.trim();

    state.theme = newTheme;
    state.clearHistoryOnExit = clearExit;
    state.notificationsEnabled = notifications;
    state.soundsEnabled = sounds;
    state.autoReconnect = autoReconnect;
    state.useFixedId = useFixedId;
    state.myNickname = newNickname;
    document.documentElement.setAttribute("data-theme", newTheme);

    renderMyId();

    chrome.storage.local.set({
      theme: newTheme,
      clearHistoryOnExit: clearExit,
      notificationsEnabled: notifications,
      soundsEnabled: sounds,
      autoReconnect: autoReconnect,
      useFixedId: useFixedId,
      myNickname: newNickname,
    });

    alert("Configurações salvas!");
    if (state.user) {
      showView("servers");
    } else {
      showView("login");
    }
  });

  ui.settings.btnClearHistory.addEventListener("click", () => {
    const confirmation = confirm(
      "Tem certeza que deseja apagar TODO o histórico de conversas?\n\nEsta ação não pode ser desfeita.",
    );

    if (confirmation) {
      chrome.storage.local.get(null, (items) => {
        const historyKeys = Object.keys(items).filter((key) =>
          key.startsWith("chat_history_"),
        );

        if (historyKeys.length > 0) {
          chrome.storage.local.remove(historyKeys, () => {
            alert(
              `Histórico de ${historyKeys.length} conversa(s) foi apagado.`,
            );
          });
        } else {
          alert("Nenhum histórico de chat encontrado para apagar.");
        }
      });
    }
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
      ui.login.error.innerHTML = err.message;
      ui.login.error.style.display = "block";

      if (err.message.includes("Conta não verificada")) {
        ui.login.error.innerHTML +=
          '<div style="margin-top:5px"><a href="#" id="link-verify-now" style="color:var(--primary);font-weight:600;text-decoration:none;">Verificar agora →</a></div>';
        setTimeout(() => {
          const link = document.getElementById("link-verify-now");
          if (link) {
            link.addEventListener("click", (e) => {
              e.preventDefault();
              document.getElementById("view-login").classList.remove("active");
              document.getElementById("view-verify").classList.add("active");
              if (username.includes("@")) {
                document.getElementById("verify-email").value = username;
              }
            });
          }
        }, 0);
      }
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

      // --- BADGES DE CONFIGURAÇÃO ---
      const badgesDiv = document.createElement("div");
      badgesDiv.className = "server-badges";

      // 1. Protocolo (Segurança)
      const isSecure = server.protocol === "wss";
      const protoBadge = document.createElement("span");
      protoBadge.className = `badge ${isSecure ? "badge-secure" : "badge-insecure"}`;
      protoBadge.textContent = isSecure ? "🛡️ WSS" : "⚠️ WS";
      badgesDiv.appendChild(protoBadge);

      // 2. Autenticação (Privacidade)
      if (server.requiresAuth !== undefined) {
        const authBadge = document.createElement("span");
        authBadge.className = `badge ${server.requiresAuth ? "badge-auth" : "badge-open"}`;
        authBadge.textContent = server.requiresAuth
          ? "🔒 Privado"
          : "🔓 Público";
        badgesDiv.appendChild(authBadge);
      }

      // 3. Região (Opcional)
      if (server.region) {
        const regionBadge = document.createElement("span");
        regionBadge.className = "badge badge-info";
        regionBadge.textContent = `🌍 ${server.region}`;
        badgesDiv.appendChild(regionBadge);
      }

      div.appendChild(badgesDiv);

      div.addEventListener("click", () => connectToServer(server));
      ui.servers.list.appendChild(div);
    });
  }

  // --- WEBSOCKET & CHAT ---
  function handleConnectionLoss() {
    ui.status.className = "status-indicator status-offline";
    ui.chat.btnSend.disabled = true;
    ui.chat.btnSend.textContent = "❌";

    if (
      state.autoReconnect &&
      state.reconnectAttempts < state.maxReconnectAttempts
    ) {
      state.reconnectAttempts++;
      const delay = 3000; // 3 segundos

      ui.status.textContent = `Reconectando (${state.reconnectAttempts}/${state.maxReconnectAttempts})...`;
      addLog(
        `Conexão perdida. Tentando reconectar em ${delay / 1000}s...`,
        "system",
      );

      ui.chat.reconnect.style.display = "none";

      if (state.reconnectTimer) clearTimeout(state.reconnectTimer);
      state.reconnectTimer = setTimeout(() => {
        if (state.currentServer && !state.isManualDisconnect) {
          connectToServer(state.currentServer);
        }
      }, delay);
    } else {
      ui.status.textContent = "Falha na Conexão";
      if (state.autoReconnect) {
        addLog("Não foi possível reconectar automaticamente.", "error");
      } else {
        addLog("Conexão perdida.", "system");
      }
      ui.chat.reconnect.style.display = "block";
    }
  }

  async function connectToServer(server) {
    state.currentServer = server;
    state.isManualDisconnect = false;

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
    let wsUrl = `${server.protocol}://${server.host}${portPart}`;

    // Se o usuário estiver logado no Dashboard, usa o username como ID Fixo
    if (state.user && state.user.username && state.useFixedId) {
      const separator = wsUrl.includes("?") ? "&" : "?";
      wsUrl += `${separator}customId=${encodeURIComponent(state.user.username)}`;

      // FIX: Se tínhamos um ID salvo que é diferente do username, limpamos a sessão antiga
      // Isso impede que a extensão tente reconectar à sessão aleatória antiga
      if (state.myId && state.myId !== state.user.username) {
        state.myId = null;
        state.sessionSecret = null;
        chrome.storage.local.remove(["myId", "sessionSecret"]);
      }
    }
    // Se a opção de ID Fixo estiver DESATIVADA, mas o ID atual na memória for igual ao username,
    // significa que o usuário acabou de desativar a opção.
    // Precisamos limpar o ID para garantir que um novo aleatório seja gerado e não haja reconexão.
    else if (
      state.user &&
      state.user.username &&
      state.myId === state.user.username
    ) {
      console.log("Desativando ID Fixo: Limpando sessão antiga...");
      state.myId = null;
      state.sessionSecret = null;
      chrome.storage.local.remove(["myId", "sessionSecret"]);
    }

    console.log("🔗 Tentando conectar em:", wsUrl);

    ui.status.textContent =
      state.reconnectAttempts > 0
        ? `Reconectando (${state.reconnectAttempts}/${state.maxReconnectAttempts})...`
        : "Conectando...";
    showView("chat");
    ui.chat.btnSend.disabled = true;
    ui.chat.btnSend.textContent = "⏳";
    ui.chat.reconnect.style.display = "none";

    try {
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        ui.status.textContent = "Conectado (Autenticando...)";
        ui.status.className = "status-indicator status-online";
        ui.chat.reconnect.style.display = "none";
        ui.chat.btnSend.disabled = false;
        ui.chat.btnSend.innerHTML = `<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"></path></svg>`;

        state.reconnectAttempts = 0;
        if (state.reconnectTimer) clearTimeout(state.reconnectTimer);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleWsMessage(data);
        } catch (e) {
          console.error("Erro JSON:", e);
        }
      };

      ws.onclose = (event) => {
        // Código 1008 = Violação de Política (ex: ID em uso ou IP bloqueado)
        if (event.code === 1008) {
          state.isManualDisconnect = true; // Impede reconexão automática
          ui.status.textContent = "Erro: " + event.reason;
          ui.status.className = "status-indicator status-offline";
          addLog(`❌ Conexão recusada: ${event.reason}`, "error");
          return;
        }

        if (state.isManualDisconnect) {
          ui.status.textContent = "Desconectado";
          ui.status.className = "status-indicator status-offline";
          addLog("Desconectado manualmente.", "system");
          ui.chat.reconnect.style.display = "block";
          ui.chat.btnSend.disabled = true;
          ui.chat.btnSend.textContent = "❌";
        } else {
          handleConnectionLoss();
        }
      };

      ws.onerror = (err) => {
        console.error("WS Erro:", err);
        ui.status.textContent = "Erro de Conexão";
        // A lógica de reconexão será tratada pelo onclose
      };
    } catch (e) {
      alert("Erro ao criar WebSocket: " + e.message);
      showView("servers");
    }
  }

  ui.chat.reconnect.addEventListener("click", () => {
    if (state.currentServer) {
      state.reconnectAttempts = 0;
      state.isManualDisconnect = false;
      connectToServer(state.currentServer);
    }
  });

  ui.chat.disconnect.addEventListener("click", () => {
    state.isManualDisconnect = true;
    if (state.reconnectTimer) clearTimeout(state.reconnectTimer);
    state.reconnectAttempts = 0;
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

  ui.chat.msgInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      ui.chat.btnSend.click();
    }
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

  function renderMyId() {
    if (!state.myId) return;
    const displayNick = state.myNickname ? ` (${state.myNickname})` : "";

    // Verifica se estamos realmente usando o ID fixo (Config ligada + ID atual igual ao username)
    const isFixedActive =
      state.useFixedId && state.user && state.myId === state.user.username;

    if (isFixedActive) {
      ui.chat.myId.classList.add("fixed-id-active");
      ui.chat.myId.innerHTML = `🆔 <strong>${state.myId}</strong>${displayNick}`;
      ui.chat.myId.title = "ID Fixo Ativo (Clique para copiar)";
    } else {
      ui.chat.myId.classList.remove("fixed-id-active");
      ui.chat.myId.textContent = `Meu ID: ${state.myId}${displayNick}`;
      ui.chat.myId.title = "Clique para copiar";
    }
  }

  function handleWsMessage(data) {
    console.log("WS Recebido:", data);

    switch (data.type) {
      case "your-id":
        // Verifica se o ID recebido é o fixo esperado (caso o servidor tenha rejeitado)
        if (
          state.useFixedId &&
          state.user &&
          state.user.username &&
          data.id !== state.user.username
        ) {
          addLog(
            `⚠️ O servidor rejeitou o ID Fixo "${state.user.username}". Usando ID aleatório. (Verifique se há caracteres especiais)`,
            "error",
          );
        }

        // Se já temos um ID e Segredo, tentamos reconectar antes de aceitar o novo ID
        if (state.myId && state.sessionSecret) {
          ws.send(
            JSON.stringify({
              type: "reconnect",
              id: state.myId,
              sessionSecret: state.sessionSecret,
            }),
          );
          // Guardamos o novo ID temporariamente caso a reconexão falhe
          state.tempId = data.id;
          state.tempSecret = data.sessionSecret;
          state.tempRequiresAuth = data.requiresAuth;
        } else {
          // Fluxo normal (primeira conexão)
          state.myId = data.id;
          state.sessionSecret = data.sessionSecret;
          // Salva sessão para persistir entre recargas da extensão
          chrome.storage.local.set({
            myId: state.myId,
            sessionSecret: state.sessionSecret,
          });

          renderMyId();

          if (ui.chat.targetId.value) loadHistory();

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
        }
        break;

      case "reconnected":
        // Sucesso na restauração da sessão!
        state.myId = data.id; // Mantém o ID antigo
        state.tempId = null; // Descarta o temporário
        state.tempRequiresAuth = null;

        chrome.storage.local.set({
          myId: state.myId,
          sessionSecret: state.sessionSecret,
        });

        renderMyId();

        ui.status.textContent = "Reconectado (Sessão Restaurada)";
        ui.status.className = "status-indicator status-online";
        addLog("Sessão restaurada com sucesso.", "system");
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
          // Recebi uma oferta de chave: devo processar e responder com a minha
          handlePublicKeyReceived(
            data.from,
            data.payload.replace("KEY::", ""),
            true,
          );
        } else if (
          typeof data.payload === "string" &&
          data.payload.startsWith("KEY_REPLY::")
        ) {
          // Recebi a resposta da minha oferta: apenas processo, não respondo de novo
          handlePublicKeyReceived(
            data.from,
            data.payload.replace("KEY_REPLY::", ""),
            false,
          );
        } else if (data.type === "message_read") {
          // --- CONFIRMAÇÃO DE LEITURA RECEBIDA ---
          const readId = data.payload.messageId;

          // 1. Atualiza na interface se estiver visível
          const msgEl = ui.chat.msgList.querySelector(
            `.msg[data-id="${readId}"] .msg-status`,
          );
          if (msgEl) {
            msgEl.textContent = "✓✓";
            msgEl.classList.add("read");
          }

          // 2. Atualiza no storage (histórico)
          if (state.currentServer && state.myId) {
            const specificKey = `chat_history_${state.currentServer.host}:${state.currentServer.port}_${state.myId}_${data.from}`;
            chrome.storage.local.get(specificKey, (res) => {
              const history = res[specificKey] || [];
              const msgIndex = history.findIndex((m) => m.id === readId);
              if (msgIndex !== -1) {
                history[msgIndex].status = "read";
                chrome.storage.local.set({ [specificKey]: history });
              }
            });
          }
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

      case "reconnect_failed":
      case "error":
        if (data.type === "error") {
          const msg = data.message || "";
          if (msg.includes("não encontrado") || msg.includes("desconectado")) {
            addLog(`❌ Falha: ${msg}`, "system");
          } else {
            addLog(`Erro: ${msg}`, "system");
          }
        }
        // Se falhar ao reconectar, aceitamos o novo ID
        if (state.tempId) {
          state.myId = state.tempId;
          state.sessionSecret = state.tempSecret;
          state.tempId = null;
          chrome.storage.local.set({
            myId: state.myId,
            sessionSecret: state.sessionSecret,
          });

          renderMyId();
          addLog("Sessão anterior expirou. Novo ID gerado.", "system");

          // Recupera se precisamos autenticar com o novo ID
          const requiresAuth = state.tempRequiresAuth;
          state.tempId = null;
          state.tempSecret = null;
          state.tempRequiresAuth = null;

          if (requiresAuth) {
            if (state.currentServer.token) {
              ws.send(
                JSON.stringify({
                  type: "authenticate",
                  token: state.currentServer.token,
                }),
              );
            } else {
              ui.status.textContent = "Erro: Sem Token";
            }
          } else {
            ui.status.textContent = "Online";
            ui.status.className = "status-indicator status-online";
          }
        }
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

  // Função para enviar o perfil (Apelido) criptografado
  async function sendEncryptedProfile(targetId) {
    if (!state.keys.shared || !state.myNickname) return;

    try {
      const profileData = JSON.stringify({ nickname: state.myNickname });
      const payloadString = "PROFILE::" + profileData;

      const encryptedBuffer = await CryptoHandler.encrypt(
        state.keys.shared,
        payloadString,
      );

      const msg = {
        type: "message",
        target: targetId,
        payload: {
          encrypted: true,
          data: arrayBufferToBase64(encryptedBuffer),
        },
      };

      ws.send(JSON.stringify(msg));
      console.log("Perfil criptografado enviado para", targetId);
    } catch (e) {
      console.error("Erro ao enviar perfil:", e);
    }
  }

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

      const displayName = getDisplayName(fromId);
      ui.chat.cryptoStatus.textContent = `🔒 Canal Seguro com ${displayName}`;
      addLog(`Canal E2EE estabelecido com ${displayName}`, "system");

      // Atualiza o target ID automaticamente se estiver vazio
      if (!ui.chat.targetId.value) ui.chat.targetId.value = fromId;

      // AUTOMÁTICO: Envia meu apelido para o outro lado assim que o canal seguro é criado
      await sendEncryptedProfile(fromId);
    } catch (e) {
      console.error("Erro ao processar chave pública", e);
      addLog("Erro ao processar chave de criptografia.", "error");
    }
  }

  // --- ENVIO E RECEBIMENTO DE MENSAGENS ---

  function playNotificationSound() {
    if (!state.soundsEnabled) return;
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

  function playSentSound() {
    if (!state.soundsEnabled) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;

      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      // Som de envio (mais curto e agudo, tipo "pop")
      osc.type = "sine";
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);

      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);

      osc.start();
      osc.stop(ctx.currentTime + 0.15);
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
          addLog(
            msg.text,
            msg.type,
            msg.timestamp,
            false,
            msg.id,
            msg.status,
            msg.isHtml,
            msg.replyTo,
            msg.edited,
            msg.reactions,
          );
        });

        ui.chat.msgList.scrollTop = ui.chat.msgList.scrollHeight;
      }
    } catch (e) {
      console.error("Erro ao carregar histórico:", e);
    }
  }

  function addLog(
    text,
    type = "system",
    timestamp = null,
    save = true,
    id = null,
    status = "sent",
    isHtml = false,
    replyTo = null,
    edited = false,
    reactions = [],
  ) {
    // Evita duplicatas visuais se já existir mensagem com mesmo ID na tela
    if (id && ui.chat.msgList.querySelector(`.msg[data-id="${id}"]`)) {
      return;
    }

    // Cria o wrapper que conterá o balão e as ações
    const wrapper = document.createElement("div");
    wrapper.className = `msg-wrapper ${type}`;

    const group = document.createElement("div");
    group.className = "msg-content-group";

    const div = document.createElement("div");
    div.className = `msg ${type}`;
    if (id) div.dataset.id = id;

    // Renderiza contexto de resposta se existir
    if (replyTo) {
      const replyDiv = document.createElement("div");
      replyDiv.className = "msg-reply-context";
      replyDiv.innerHTML = `
        <div class="msg-reply-sender">${replyTo.sender}</div>
        <div class="msg-reply-text">${replyTo.text}</div>
      `;
      replyDiv.addEventListener("click", (e) => {
        e.stopPropagation();
        // Futuro: rolar até a mensagem original
      });
      div.appendChild(replyDiv);
    }

    const contentSpan = document.createElement("span");
    if (isHtml) {
      contentSpan.innerHTML = text;
    } else {
      contentSpan.textContent = text;
    }

    if (edited) {
      const editedLabel = document.createElement("span");
      editedLabel.className = "msg-edited-label";
      editedLabel.textContent = "(editado)";
      contentSpan.appendChild(editedLabel);
    }
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

    // Adiciona o balão ao wrapper
    group.appendChild(div);

    // --- REAÇÕES (Visualização) ---
    const reactionsDiv = document.createElement("div");
    reactionsDiv.className = "msg-reactions";
    renderReactions(reactionsDiv, reactions);
    group.appendChild(reactionsDiv);

    wrapper.appendChild(group);

    // Cria a barra de ações (fora do balão)
    if (type === "sent" || type === "received") {
      const actionsDiv = document.createElement("div");
      actionsDiv.className = "msg-actions";

      // Botão de Reagir
      const reactBtn = document.createElement("button");
      reactBtn.className = "btn-action";
      reactBtn.innerHTML = "😀";
      reactBtn.title = "Reagir";
      reactBtn.onclick = (e) => {
        e.stopPropagation();
        toggleReactionPicker(wrapper, id);
      };
      actionsDiv.appendChild(reactBtn);

      const replyBtn = document.createElement("button");
      replyBtn.className = "btn-action";
      replyBtn.innerHTML = "↩";
      replyBtn.title = "Responder";
      replyBtn.onclick = (e) => {
        e.stopPropagation();
        let senderName = "Desconhecido";
        let msgText = isHtml ? "📎 Arquivo/Mídia" : text;

        if (type === "sent") {
          senderName = "Você";
          // Remove prefixos comuns de log
          if (typeof msgText === "string" && msgText.includes("Eu: "))
            msgText = msgText.split("Eu: ")[1];
        } else {
          // Tenta extrair nome do remetente do texto formatado "[Nome]: Msg"
          const match =
            typeof text === "string" ? text.match(/\[(.*?)\]/) : null;
          if (match) {
            senderName = match[1];
            const parts = text.split("]: ");
            if (parts.length > 1) msgText = parts.slice(1).join("]: ");
          }
        }

        startReply({ id, text: msgText, sender: senderName });
      };
      actionsDiv.appendChild(replyBtn);

      // Botão de Editar (Edit) - Apenas para mensagens enviadas
      if (type === "sent") {
        const editBtn = document.createElement("button");
        editBtn.className = "btn-action";
        editBtn.innerHTML = "✎";
        editBtn.title = "Editar";
        editBtn.onclick = (e) => {
          e.stopPropagation();
          if (isHtml) {
            alert("Não é possível editar arquivos.");
            return;
          }
          startEdit({ id, text });
        };
        actionsDiv.appendChild(editBtn);
      }
      wrapper.appendChild(actionsDiv);
    }

    // Adiciona indicador de status para mensagens enviadas
    if (type === "sent") {
      const statusSpan = document.createElement("span");
      statusSpan.className = "msg-status";
      if (status === "read") {
        statusSpan.textContent = "✓✓";
        statusSpan.classList.add("read");
      } else {
        statusSpan.textContent = "✓";
      }
      div.appendChild(statusSpan);
    }

    ui.chat.msgList.appendChild(wrapper);
    ui.chat.msgList.scrollTop = ui.chat.msgList.scrollHeight;

    // Salvar no histórico se for mensagem de chat e flag save for true
    if (save && (type === "sent" || type === "received")) {
      const key = getHistoryKey();
      if (key) {
        chrome.storage.local.get(key, (res) => {
          const history = res[key] || [];
          // Verifica se a mensagem já existe no histórico para evitar duplicatas salvas
          const exists = id && history.some((m) => m.id === id);
          if (!exists) {
            history.push({
              text,
              type,
              timestamp: timeStr,
              id,
              status,
              isHtml,
              replyTo,
              edited,
              reactions,
            });
            // Limite de 100 mensagens por chat para economizar storage
            if (history.length > 100) history.shift();
            chrome.storage.local.set({ [key]: history });
          }
        });
      }
    }
  }

  function renderReactions(container, reactions) {
    container.innerHTML = "";
    if (!reactions || reactions.length === 0) return;

    const counts = {};
    reactions.forEach((r) => {
      counts[r.emoji] = (counts[r.emoji] || 0) + 1;
    });

    Object.entries(counts).forEach(([emoji, count]) => {
      const pill = document.createElement("div");
      pill.className = "reaction-pill";
      pill.textContent = count > 1 ? `${emoji} ${count}` : emoji;
      container.appendChild(pill);
    });
  }

  async function displayReceivedMessage(data) {
    let content = data.payload;
    let from = `[${getDisplayName(data.from)}]`;
    let logType = "received";
    let isHtml = false;
    let replyTo = null;

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

          // Verifica se é uma mensagem de sistema interna (Troca de Perfil)
          if (content.startsWith("PROFILE::")) {
            try {
              const profileData = JSON.parse(content.replace("PROFILE::", ""));
              if (profileData.nickname) {
                state.contacts[data.from] = profileData.nickname;
                // Salva o contato automaticamente
                chrome.storage.local.set({ contacts: state.contacts });
                addLog(
                  `O usuário se identificou como "${profileData.nickname}"`,
                  "system",
                );
                ui.chat.cryptoStatus.textContent = `🔒 Canal Seguro com ${profileData.nickname}`;
              }
            } catch (e) {
              console.error("Erro ao processar perfil", e);
            }
            return; // Não exibe como mensagem de chat
          }

          from = `🔒 ${from}`; // Adiciona ícone de cadeado seguro

          // Tenta detectar se é um objeto de resposta (Reply)
          try {
            const parsed = JSON.parse(content);
            if (parsed && parsed.type === "reply") {
              content = parsed.text;
              replyTo = parsed.replyTo;
            }
            // Tenta detectar se é uma edição
            else if (parsed && parsed.type === "edit") {
              handleMessageEdit(parsed, data.from);
              return; // Não adiciona nova mensagem
            }
            // Tenta detectar se é uma reação
            else if (parsed && parsed.type === "reaction") {
              handleReaction(parsed, data.from);
              return;
            }
            // Tenta detectar se é um arquivo
            else if (parsed && parsed.type === "file" && parsed.data) {
              const potentialFile = parsed;
              const blob = new Blob([base64ToArrayBuffer(potentialFile.data)], {
                type: potentialFile.mime,
              });
              const url = URL.createObjectURL(blob);

              let fileContentHtml = "";
              if (potentialFile.mime.startsWith("image/")) {
                fileContentHtml = `<br><img src="${url}" style="max-width: 200px; border-radius: 4px; margin-top: 5px;">`;
              }
              // Escape filename for safety
              const safeName = potentialFile.name.replace(/[<>&"']/g, "");
              fileContentHtml += `<br><a href="${url}" download="${safeName}" style="color: var(--text-main); text-decoration: underline;">⬇️ Baixar ${safeName}</a>`;

              content = `📎 Arquivo recebido: ${safeName}${fileContentHtml}`;
              isHtml = true;
            }
          } catch (e) {
            /* Não é JSON ou não é arquivo */
          }
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
      // Mensagem em texto plano (pode ser arquivo não criptografado)
      from = `🔓 ${from}`; // Adiciona ícone de cadeado aberto
      try {
        const parsed = JSON.parse(content);
        if (parsed && parsed.type === "reply") {
          content = parsed.text;
          replyTo = parsed.replyTo;
        } else if (parsed && parsed.type === "edit") {
          handleMessageEdit(parsed, data.from);
          return;
        } else if (parsed && parsed.type === "reaction") {
          handleReaction(parsed, data.from);
          return;
        } else if (parsed && parsed.type === "file" && parsed.data) {
          const potentialFile = parsed;
          const blob = new Blob([base64ToArrayBuffer(potentialFile.data)], {
            type: potentialFile.mime,
          });
          const url = URL.createObjectURL(blob);

          let fileContentHtml = "";
          if (potentialFile.mime.startsWith("image/")) {
            fileContentHtml = `<br><img src="${url}" style="max-width: 200px; border-radius: 4px; margin-top: 5px;">`;
          }
          const safeName = potentialFile.name.replace(/[<>&"']/g, "");
          fileContentHtml += `<br><a href="${url}" download="${safeName}" style="color: var(--text-main); text-decoration: underline;">⬇️ Baixar ${safeName}</a>`;

          content = `📎 Arquivo recebido: ${safeName}${fileContentHtml}`;
          isHtml = true;
        }
      } catch (e) {
        /* Não é JSON ou não é arquivo */
      }
    }

    addLog(
      `${from}: ${content}`,
      logType,
      null,
      true,
      data.id,
      "received",
      isHtml,
      replyTo,
      false,
      [],
    );

    // Envia confirmação de leitura (Visto) automaticamente
    if (data.id && logType !== "error") {
      ws.send(
        JSON.stringify({
          type: "message_read",
          target: data.from,
          payload: { messageId: data.id },
        }),
      );
    }

    if (!document.hasFocus()) {
      let sender = getDisplayName(data.from);
      // Se for um contato conhecido (tem apelido), adiciona o ID curto para conferência
      if (state.contacts[data.from]) {
        sender += ` (${data.from.substr(0, 5)})`;
      }

      showSystemNotification(`Nova mensagem de ${sender}`, content);
    }
  }

  function handleMessageEdit(editData, fromId) {
    const { id, text } = editData;

    // 1. Atualiza na UI
    const msgEl = ui.chat.msgList.querySelector(`.msg[data-id="${id}"]`);
    if (msgEl) {
      // O texto geralmente é o primeiro span filho, mas cuidado com reply context
      // Vamos procurar o span que não é time, status ou reply-context
      const contentSpan = Array.from(msgEl.children).find(
        (el) =>
          el.tagName === "SPAN" &&
          !el.className.includes("msg-time") &&
          !el.className.includes("msg-status"),
      );

      if (contentSpan) {
        contentSpan.textContent = text;
        const editedLabel = document.createElement("span");
        editedLabel.className = "msg-edited-label";
        editedLabel.textContent = "(editado)";
        contentSpan.appendChild(editedLabel);
      }
    }

    // 2. Atualiza no Storage
    if (state.currentServer && state.myId) {
      const target = fromId === state.myId ? ui.chat.targetId.value : fromId; // Se eu editei, target é o destinatário. Se recebi, target é quem enviou.
      // Ajuste: se recebi, a chave usa o ID do remetente.
      const key = `chat_history_${state.currentServer.host}:${state.currentServer.port}_${state.myId}_${target}`;
      chrome.storage.local.get(key, (res) => {
        const history = res[key] || [];
        const msgIndex = history.findIndex((m) => m.id === id);
        if (msgIndex !== -1) {
          history[msgIndex].text = text;
          history[msgIndex].edited = true;
          chrome.storage.local.set({ [key]: history });
        }
      });
    }
  }

  function handleReaction(data, fromId) {
    const { msgId, emoji } = data;

    // Atualiza no Storage e depois na UI
    if (state.currentServer && state.myId) {
      const target = fromId === state.myId ? ui.chat.targetId.value : fromId;
      const key = `chat_history_${state.currentServer.host}:${state.currentServer.port}_${state.myId}_${target}`;

      chrome.storage.local.get(key, (res) => {
        const history = res[key] || [];
        const msgIndex = history.findIndex((m) => m.id === msgId);
        if (msgIndex !== -1) {
          if (!history[msgIndex].reactions) history[msgIndex].reactions = [];
          history[msgIndex].reactions.push({ emoji, from: fromId });
          chrome.storage.local.set({ [key]: history });

          // Atualiza UI se a mensagem estiver visível
          const msgEl = ui.chat.msgList.querySelector(
            `.msg[data-id="${msgId}"]`,
          );
          if (msgEl) {
            const group = msgEl.parentElement;
            let reactionsDiv = group.querySelector(".msg-reactions");
            if (!reactionsDiv) {
              reactionsDiv = document.createElement("div");
              reactionsDiv.className = "msg-reactions";
              group.appendChild(reactionsDiv);
            }
            renderReactions(reactionsDiv, history[msgIndex].reactions);
          }
        }
      });
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
      indicator.textContent = `${getDisplayName(users[0])} está digitando...`;
    } else if (users.length === 2) {
      indicator.textContent = `${getDisplayName(users[0])} e ${getDisplayName(users[1])} estão digitando...`;
    } else {
      indicator.textContent = "Várias pessoas estão digitando...";
    }
  }

  function showSystemNotification(title, message) {
    if (!state.notificationsEnabled) return;

    // Ícone genérico (azul) em base64 para garantir funcionamento imediato sem arquivos externos
    const iconUrl =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAABmJLR0QA/wD/AP+gvaeTAAAAcElEQVRoge3QwQ2AIBRE0Z+F2W0di0W5tQ0j8RElJp4zJ2TzYwIAAAAAAABgx0qS1pI070l6z3496yVpX5K27Nez3pL2JGnLfj3rJWlPkrbs17NekvYkact+PeslaU+StuzXs14AAAAAAADw5gJqCg2h211W9AAAAABJRU5ErkJggg==";

    chrome.notifications.create({
      type: "basic",
      iconUrl: iconUrl,
      title: title,
      message: message,
      priority: 2,
      buttons: [{ title: "Responder" }],
      requireInteraction: true,
    });
  }

  // Listener para o botão "Responder" da notificação
  chrome.notifications.onButtonClicked.addListener(
    (notificationId, buttonIndex) => {
      if (buttonIndex === 0) {
        window.focus();
        ui.chat.msgInput.focus();
        chrome.notifications.clear(notificationId);
      }
    },
  );

  // --- REPLY LOGIC ---
  function startReply(msgData) {
    state.replyingTo = msgData;
    if (ui.chat.replyBar) {
      ui.chat.replyBar.style.display = "block";
      ui.chat.replySender.textContent = msgData.sender;
      ui.chat.replyText.textContent = msgData.text;
      ui.chat.msgInput.focus();
      ui.chat.msgInput.placeholder = `Respondendo a ${msgData.sender}...`;
      ui.chat.msgInput.classList.add("replying-active");
    }
  }

  if (ui.chat.replyCancel) {
    ui.chat.replyCancel.addEventListener("click", () => {
      state.replyingTo = null;
      ui.chat.replyBar.style.display = "none";
      ui.chat.msgInput.placeholder = "Digite sua mensagem...";
      ui.chat.msgInput.classList.remove("replying-active");
    });
  }

  // --- EDIT LOGIC ---
  function startEdit(msgData) {
    state.editingId = msgData.id;
    state.replyingTo = null; // Cancela reply se houver
    if (ui.chat.replyBar) ui.chat.replyBar.style.display = "none";

    if (ui.chat.editBar) {
      ui.chat.editBar.style.display = "block";
      ui.chat.msgInput.value = msgData.text;
      ui.chat.msgInput.focus();
      ui.chat.msgInput.classList.add("editing-active");
    }
  }

  if (ui.chat.editCancel) {
    ui.chat.editCancel.addEventListener("click", () => {
      cancelEdit();
    });
  }

  function cancelEdit() {
    state.editingId = null;
    if (ui.chat.editBar) ui.chat.editBar.style.display = "none";
    ui.chat.msgInput.value = "";
    ui.chat.msgInput.placeholder = "Digite sua mensagem...";
    ui.chat.msgInput.classList.remove("editing-active");
  }

  // --- REACTION LOGIC ---
  function toggleReactionPicker(wrapper, msgId) {
    let picker = wrapper.querySelector(".reaction-picker");
    if (picker) {
      picker.remove();
      return;
    }

    // Fecha outros pickers
    document.querySelectorAll(".reaction-picker").forEach((el) => el.remove());

    picker = document.createElement("div");
    picker.className = "reaction-picker";

    const emojis = ["👍", "❤️", "😂", "😮", "😢", "😡"];
    emojis.forEach((emoji) => {
      const span = document.createElement("span");
      span.className = "reaction-option";
      span.textContent = emoji;
      span.onclick = (e) => {
        e.stopPropagation();
        sendReaction(msgId, emoji);
        picker.remove();
      };
      picker.appendChild(span);
    });

    wrapper.appendChild(picker);

    // Fecha ao clicar fora
    const closeHandler = (e) => {
      if (!picker.contains(e.target)) {
        picker.remove();
        document.removeEventListener("click", closeHandler);
      }
    };
    setTimeout(() => document.addEventListener("click", closeHandler), 0);
  }

  async function sendReaction(msgId, emoji) {
    const target = ui.chat.targetId.value.trim();
    if (!target) return;

    const reactionPayload = JSON.stringify({ type: "reaction", msgId, emoji });
    const msg = { type: "message", target, payload: reactionPayload };

    if (state.keys.shared) {
      const encryptedBuffer = await CryptoHandler.encrypt(
        state.keys.shared,
        reactionPayload,
      );
      msg.payload = {
        encrypted: true,
        data: arrayBufferToBase64(encryptedBuffer),
      };
    }

    ws.send(JSON.stringify(msg));
    handleReaction({ msgId, emoji }, state.myId);
  }

  // --- EMOJI PICKER ---
  const emojiList = [
    "😀",
    "😃",
    "😄",
    "😁",
    "😆",
    "😅",
    "😂",
    "🤣",
    "😊",
    "😇",
    "🙂",
    "🙃",
    "😉",
    "😌",
    "😍",
    "🥰",
    "😘",
    "😗",
    "😙",
    "😚",
    "😋",
    "😛",
    "😝",
    "😜",
    "🤪",
    "🤨",
    "🧐",
    "🤓",
    "😎",
    "🤩",
    "🥳",
    "😏",
    "😒",
    "😞",
    "😔",
    "😟",
    "😕",
    "🙁",
    "☹️",
    "😣",
    "😖",
    "😫",
    "😩",
    "🥺",
    "😢",
    "😭",
    "😤",
    "😠",
    "😡",
    "🤬",
    "🤯",
    "😳",
    "🥵",
    "🥶",
    "😱",
    "😨",
    "😰",
    "😥",
    "😓",
    "🤗",
    "🤔",
    "🤭",
    "🤫",
    "🤥",
    "😶",
    "😐",
    "😑",
    "😬",
    "🙄",
    "😯",
    "😦",
    "😧",
    "😮",
    "😲",
    "🥱",
    "😴",
    "🤤",
    "😪",
    "😵",
    "🤐",
    "🥴",
    "🤢",
    "🤮",
    "🤧",
    "😷",
    "🤒",
    "🤕",
    "🤑",
    "🤠",
    "😈",
    "👿",
    "👹",
    "👺",
    "🤡",
    "💩",
    "👻",
    "💀",
    "👽",
    "👾",
    "🤖",
    "🎃",
    "😺",
    "😸",
    "😹",
    "😻",
    "😼",
    "😽",
    "🙀",
    "😿",
    "😾",
    "👍",
    "👎",
    "👌",
    "👈",
    "👉",
    "👆",
    "👇",
    "👏",
    "👐",
    "🤝",
    "🙏",
    "💪",
    "❤️",
    "💔",
    "✨",
    "⭐",
    "🔥",
    "✅",
    "❌",
  ];

  // Verifica se o picker existe e está vazio antes de popular
  if (ui.chat.emojiPicker && ui.chat.emojiPicker.children.length === 0) {
    emojiList.forEach((emoji) => {
      const span = document.createElement("span");
      span.textContent = emoji;
      span.style.cursor = "pointer";
      span.style.fontSize = "18px";
      span.style.padding = "4px";
      span.style.textAlign = "center";
      span.style.userSelect = "none";

      span.addEventListener("mouseover", () => {
        span.style.backgroundColor = "var(--hover-bg)";
        span.style.borderRadius = "4px";
      });
      span.addEventListener("mouseout", () => {
        span.style.backgroundColor = "transparent";
      });

      span.addEventListener("click", (e) => {
        e.stopPropagation(); // Impede que o clique no emoji feche o picker
        const input = ui.chat.msgInput;
        const start = input.selectionStart;
        const end = input.selectionEnd;
        const text = input.value;

        // Insere o emoji na posição do cursor
        input.value = text.substring(0, start) + emoji + text.substring(end);
        input.selectionStart = input.selectionEnd = start + emoji.length;
        input.focus();
        input.dispatchEvent(new Event("input"));
      });
      ui.chat.emojiPicker.appendChild(span);
    });
  }

  if (ui.chat.btnEmoji && ui.chat.emojiPicker) {
    ui.chat.btnEmoji.addEventListener("click", (e) => {
      e.stopPropagation();
      // Usa getComputedStyle para garantir que lemos o estado real de exibição
      const currentDisplay = window.getComputedStyle(
        ui.chat.emojiPicker,
      ).display;
      ui.chat.emojiPicker.style.display =
        currentDisplay === "none" ? "grid" : "none";
    });
  }

  document.addEventListener("click", (e) => {
    if (
      ui.chat.emojiPicker &&
      !ui.chat.emojiPicker.contains(e.target) &&
      e.target !== ui.chat.btnEmoji
    ) {
      ui.chat.emojiPicker.style.display = "none";
    }
  });

  ui.chat.btnSend.addEventListener("click", async () => {
    const target = ui.chat.targetId.value.trim();
    const text = ui.chat.msgInput.value.trim();

    if (!target || !text) return;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    // Adiciona animação de envio
    ui.chat.btnSend.classList.add("sending");
    setTimeout(() => ui.chat.btnSend.classList.remove("sending"), 600);

    // Gera um ID único para a mensagem
    const msgId =
      typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : Date.now().toString();
    let logText = `🔓 Eu: ${text}`;

    // --- LÓGICA DE EDIÇÃO ---
    if (state.editingId) {
      const editPayload = JSON.stringify({
        type: "edit",
        id: state.editingId,
        text: text,
      });

      const editMsg = {
        type: "message",
        target: target,
        payload: editPayload,
      };

      if (state.keys.shared) {
        const encryptedBuffer = await CryptoHandler.encrypt(
          state.keys.shared,
          editPayload,
        );
        editMsg.payload = {
          encrypted: true,
          data: arrayBufferToBase64(encryptedBuffer),
        };
      }

      ws.send(JSON.stringify(editMsg));

      // Atualiza localmente
      handleMessageEdit({ id: state.editingId, text: text }, state.myId);
      cancelEdit();
      return;
    }

    // Prepara o payload (pode ser string simples ou objeto JSON se for reply)
    let finalPayload = text;

    if (state.replyingTo) {
      finalPayload = JSON.stringify({
        type: "reply",
        text: text,
        replyTo: state.replyingTo,
      });
    }

    const msg = {
      type: "message",
      id: msgId,
      target: target,
      payload: finalPayload,
    };

    // Se tiver chave compartilhada, criptografa a mensagem
    if (state.keys.shared) {
      const encryptedBuffer = await CryptoHandler.encrypt(
        state.keys.shared,
        finalPayload,
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
    // Passa o objeto replyTo para o addLog para renderizar o contexto localmente
    addLog(
      logText,
      "sent",
      null,
      true,
      msgId,
      "sent",
      false,
      state.replyingTo,
      false,
      [],
    );
    playSentSound();
    ui.chat.msgInput.value = "";
    chrome.storage.local.set({ lastTarget: target });

    // Limpa o estado de resposta e esconde a barra
    state.replyingTo = null;
    if (ui.chat.replyBar) ui.chat.replyBar.style.display = "none";
    ui.chat.msgInput.placeholder = "Digite sua mensagem...";
    ui.chat.msgInput.classList.remove("replying-active");
  });
});
