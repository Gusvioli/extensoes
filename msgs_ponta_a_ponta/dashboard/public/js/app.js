// Dashboard App - Client-side JavaScript

let servers = [];
let currentFilter = "all";
let searchTerm = "";
let currentSort = "name";
let editingServerId = null;
let currentUser = null; // Armazenará o objeto do usuário: { name, username, role }
let loadServersInterval = null;

// ===== UTILITY FUNCTIONS =====
function generateToken() {
  // Gera um token aleatório de 32 caracteres em hexadecimal
  return Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

// ===== INITIALIZATION =====
document.addEventListener("DOMContentLoaded", () => {
  // Adicionar elementos de UI dinâmicos ao corpo do documento
  const toastContainer = document.createElement("div");
  toastContainer.id = "toast-container";
  toastContainer.className = "toast-container";
  document.body.appendChild(toastContainer);

  // Carregar CSS de componentes (substitui injeção JS)
  if (!document.querySelector('link[href="css/components.css"]')) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "css/components.css";
    document.head.appendChild(link);
  }

  // O HTML do modal de confirmação é adicionado aqui para não poluir o index.html
  const confirmationModalHTML = `
    <div id="confirmation-modal" class="modal">
      <div class="modal-content">
        <h2 id="confirmation-title">Confirmar Ação</h2>
        <p id="confirmation-message">Você tem certeza?</p>
        <div class="modal-actions">
          <button id="confirm-btn" class="btn btn-danger">Confirmar</button>
          <button id="cancel-btn" class="btn btn-secondary">Cancelar</button>
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML("beforeend", confirmationModalHTML);

  // Inject Settings Modal
  const settingsModalHTML = `
    <div id="settings-modal" class="modal">
      <div class="modal-content">
        <div class="modal-header">
            <h2>Configurações</h2>
            <button class="close-btn" id="close-settings-btn" style="font-size: 24px; border: none; background: none; cursor: pointer;">&times;</button>
        </div>
        <form id="settings-form">
            <div class="form-group">
                <label for="discovery-url">URL de Descoberta (JSON Token)</label>
                <input type="text" id="discovery-url" placeholder="http://localhost:9080/token" required style="width: 100%; padding: 8px; margin-top: 5px;">
                <small style="color: #666; display: block; margin-top: 5px;">URL para sincronização automática do token do servidor.</small>
            </div>
            <div class="form-actions" style="margin-top: 20px; text-align: right;">
                <button type="submit" class="btn btn-primary">Salvar Configurações</button>
            </div>
        </form>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML("beforeend", settingsModalHTML);

  // Event listeners for settings
  document
    .getElementById("close-settings-btn")
    .addEventListener("click", closeSettingsModal);
  document
    .getElementById("settings-form")
    .addEventListener("submit", saveSettings);
  document.getElementById("settings-modal").addEventListener("click", (e) => {
    if (e.target.id === "settings-modal") closeSettingsModal();
  });

  // --- FIX: Injetar Modal de Login se não existir ---
  if (!document.getElementById("login-modal")) {
    const loginModalHTML = `
      <div id="login-modal" class="modal" style="background: rgba(0,0,0,0.85); z-index: 2000;">
        <div class="modal-content" style="max-width: 350px;">
          <div class="modal-header" style="justify-content: center; border-bottom: none; padding-bottom: 0;">
            <h2 style="color: #333;">🔐 Acesso Restrito</h2>
          </div>
          <form id="login-form" style="margin-top: 20px;">
            <div class="form-group">
              <label for="login-username">Usuário</label>
              <input type="text" id="login-username" required class="form-control" autocomplete="username">
            </div>
            <div class="form-group">
              <label for="login-password">Senha</label>
              <input type="password" id="login-password" required class="form-control" autocomplete="current-password">
            </div>
            <div id="login-error" style="color: #dc3545; display: none; margin-bottom: 15px; font-size: 0.9em; text-align: center; background: #ffe6e6; padding: 8px; border-radius: 4px;"></div>
            <div class="form-actions">
              <button type="submit" class="btn btn-primary" style="width: 100%; justify-content: center;">Entrar</button>
            </div>
          </form>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML("beforeend", loginModalHTML);
  }

  // --- FIX: Garantir ID do Container Principal ---
  let dashboardContainer = document.getElementById("dashboard-container");
  if (!dashboardContainer) {
    dashboardContainer = document.querySelector(".container");
    if (dashboardContainer) {
      dashboardContainer.id = "dashboard-container";
    }
  }

  // --- FIX: Injetar Barra de Pesquisa se não existir ---
  const filtersContainer = document.querySelector(".filters");
  if (filtersContainer && !document.getElementById("server-search")) {
    const searchHTML = `
      <div class="filters-divider"></div>
      <div class="search-wrapper">
        <input type="text" id="server-search" class="search-input" placeholder="Buscar servidor...">
      </div>
      <div class="sort-wrapper">
        <select id="server-sort" class="sort-select">
            <option value="name">Nome (A-Z)</option>
            <option value="clients">Clientes (Maior)</option>
            <option value="port">Porta (Menor)</option>
            <option value="status">Status</option>
        </select>
      </div>
    `;
    filtersContainer.insertAdjacentHTML("beforeend", searchHTML);
  }

  // --- FIX: Injetar Botão de Logout se não existir ---
  if (!document.getElementById("logout-btn")) {
    const header = document.querySelector("header");
    if (header) {
      // Tenta inserir no header
      const logoutBtnHTML = `<button id="logout-btn" class="btn btn-secondary" style="display: none; margin-left: 10px; font-size: 14px; padding: 6px 12px;">Sair</button>`;
      const h1 = header.querySelector("h1");
      if (h1) h1.insertAdjacentHTML("afterend", logoutBtnHTML);
    }
  }

  // --- FIX: Injetar Modal de Servidor se não existir ---
  if (!document.getElementById("server-modal")) {
    const serverModalHTML = `
      <div id="server-modal" class="modal">
        <div class="modal-content">
          <div class="modal-header">
            <h2 id="modal-title">Adicionar/Editar Servidor</h2>
            <button class="close-btn" id="close-server-modal-btn" style="font-size: 24px; border: none; background: none; cursor: pointer;">&times;</button>
          </div>
          <form id="server-form">
            <div class="form-group">
              <label for="server-name">Nome do Servidor</label>
              <input type="text" id="server-name" required style="width: 100%; padding: 8px; margin-bottom: 10px;">
            </div>
            <div class="form-group">
              <label for="server-description">Descrição</label>
              <textarea id="server-description" style="width: 100%; padding: 8px; margin-bottom: 10px;"></textarea>
            </div>
            <div style="display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 10px; margin-bottom: 10px;">
              <div class="form-group">
                <label for="server-host">Host (IP/Domínio)</label>
                <input type="text" id="server-host" required style="width: 100%; padding: 8px;">
              </div>
              <div class="form-group">
                <label for="server-port">Porta</label>
                <input type="number" id="server-port" required style="width: 100%; padding: 8px;">
              </div>
              <div class="form-group">
                <label for="server-protocol">Protocolo</label>
                <select id="server-protocol" style="width: 100%; padding: 8px;">
                  <option value="ws">WS</option>
                  <option value="wss">WSS</option>
                </select>
              </div>
            </div>
            <div class="form-group">
              <label for="server-token">Token de Autenticação</label>
              <div style="display: flex; gap: 5px; margin-bottom: 10px;">
                <input type="text" id="server-token" style="flex-grow: 1; padding: 8px;" placeholder="Deixe vazio para gerar automaticamente">
                <button type="button" id="generate-token-btn" class="btn btn-secondary" style="width: auto; padding: 0 10px;" title="Gerar Novo">🎲</button>
              </div>
            </div>
            <div class="form-group">
              <label for="server-urltoken">URL do Token (JSON)</label>
              <div style="display: flex; gap: 5px; margin-bottom: 10px;">
                <input type="text" id="server-urltoken" style="flex-grow: 1; padding: 8px;" placeholder="http://localhost:9080/token">
                <button type="button" id="test-url-btn" class="btn btn-secondary" style="width: auto; padding: 0 10px;" title="Testar Conexão">⚡</button>
              </div>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-bottom: 10px;">
              <div class="form-group">
                <label for="server-region">Região</label>
                <input type="text" id="server-region" style="width: 100%; padding: 8px;">
              </div>
              <div class="form-group">
                <label for="server-max-clients">Max Clientes</label>
                <input type="number" id="server-max-clients" value="10000" style="width: 100%; padding: 8px;">
              </div>
              <div class="form-group">
                <label for="server-status">Status</label>
                <select id="server-status" style="width: 100%; padding: 8px;">
                  <option value="active">Ativo</option>
                  <option value="inactive">Inativo</option>
                  <option value="standby">Standby</option>
                </select>
              </div>
            </div>
            <div class="form-group">
              <label for="server-notes">Notas Internas</label>
              <textarea id="server-notes" style="width: 100%; padding: 8px; margin-bottom: 10px;"></textarea>
            </div>
            <div class="form-actions" style="display: flex; justify-content: flex-end; gap: 10px;">
              <button type="button" class="btn btn-secondary" id="cancel-server-modal-btn">Cancelar</button>
              <button type="submit" class="btn btn-primary">Salvar Servidor</button>
            </div>
          </form>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML("beforeend", serverModalHTML);
  } else {
    // FIX: Se o modal já existe (do HTML estático), verificar se tem o campo urltoken e injetar se faltar
    if (!document.getElementById("server-urltoken")) {
      const tokenInput = document.getElementById("server-token");
      if (tokenInput) {
        const tokenGroup = tokenInput.closest(".form-group");
        if (tokenGroup) {
          const urlTokenHTML = `
                <div class="form-group">
                  <label for="server-urltoken">URL do Token (JSON)</label>
                  <div style="display: flex; gap: 5px; margin-bottom: 10px;">
                    <input type="text" id="server-urltoken" style="flex-grow: 1; padding: 8px;" placeholder="http://localhost:9080/token">
                    <button type="button" id="test-url-btn" class="btn btn-secondary" style="width: auto; padding: 0 10px;" title="Testar Conexão">⚡</button>
                  </div>
                </div>`;
          tokenGroup.insertAdjacentHTML("afterend", urlTokenHTML);
        }
      }
    }
  }

  // Attach listeners for server modal elements (ensure they work even if modal existed)
  const closeServerModalBtn = document.getElementById("close-server-modal-btn");
  if (closeServerModalBtn) {
    closeServerModalBtn.onclick = closeModal; // Use onclick to prevent duplicates
  }

  const cancelServerModalBtn = document.getElementById(
    "cancel-server-modal-btn",
  );
  if (cancelServerModalBtn) {
    cancelServerModalBtn.onclick = closeModal;
  }

  const generateTokenBtn = document.getElementById("generate-token-btn");
  if (generateTokenBtn) {
    generateTokenBtn.onclick = () => {
      const tokenInput = document.getElementById("server-token");
      if (tokenInput) tokenInput.value = generateToken();
    };
  }

  const testUrlBtn = document.getElementById("test-url-btn");
  if (testUrlBtn) {
    testUrlBtn.onclick = testUrlToken;
  }

  // Listener para pesquisa
  const searchInput = document.getElementById("server-search");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      searchTerm = e.target.value.toLowerCase();
      renderServers();
    });
  }

  // Listener para ordenação
  const sortSelect = document.getElementById("server-sort");
  if (sortSelect) {
    sortSelect.addEventListener("change", (e) => {
      currentSort = e.target.value;
      renderServers();
    });
  }

  checkAuth();
});

// ===== AUTENTICAÇÃO =====
function checkAuth() {
  // O cookie HttpOnly é enviado automaticamente. Apenas verificamos a sessão.
  fetch(`/auth/verify`)
    .then((res) => res.json())
    .then((data) => {
      if (data.valid) {
        currentUser = data.user;
        localStorage.setItem("user_info", JSON.stringify(currentUser));
        showDashboard();
        loadServers();
        setupEventListeners();
        // Atualizar lista de servidores a cada 5 segundos
        if (loadServersInterval) clearInterval(loadServersInterval);
        loadServersInterval = setInterval(loadServers, 5000);
      } else {
        showLogin();
      }
    })
    .catch(() => showLogin());
}

function showLogin() {
  const loginModal = document.getElementById("login-modal");
  const dashboardContainer = document.getElementById("dashboard-container");

  if (loginModal) loginModal.style.display = "flex"; // Flex para centralizar
  if (dashboardContainer) dashboardContainer.style.display = "none";

  const loginForm = document.getElementById("login-form");
  if (loginForm) {
    // Remove listener antigo para evitar duplicidade
    const newLoginForm = loginForm.cloneNode(true);
    loginForm.parentNode.replaceChild(newLoginForm, loginForm);
    newLoginForm.addEventListener("submit", handleLogin);
  }
  // Botão de fechar removido pois login é obrigatório
}

function showDashboard() {
  document.getElementById("login-modal").style.display = "none";
  document.getElementById("dashboard-container").style.display = "block";

  if (currentUser) {
    const userInfo = document.getElementById("user-info");
    if (userInfo) {
      userInfo.textContent = `Olá, ${currentUser.name}! 👋`;
    }

    // Show settings button if admin
    if (currentUser.role === "admin") {
      const settingsBtn = document.getElementById("settings-btn");
      if (settingsBtn) settingsBtn.style.display = "inline-flex";
    }
  }

  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    logoutBtn.style.display = "inline-flex";
    // Adiciona listener (clonando para limpar anteriores)
    logoutBtn.onclick = handleLogout;
  }
}

function handleLogin(e) {
  e.preventDefault();

  const username = document.getElementById("login-username").value;
  const password = document.getElementById("login-password").value;

  fetch("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.success) {
        currentUser = data.user;
        localStorage.setItem("user_info", JSON.stringify(currentUser));

        document.getElementById("login-modal").style.display = "none";
        showDashboard();
        loadServers();
        setupEventListeners();
        // Atualizar lista de servidores a cada 5 segundos
        if (loadServersInterval) clearInterval(loadServersInterval);
        loadServersInterval = setInterval(loadServers, 5000);
      } else {
        document.getElementById("login-error").textContent = data.error;
        document.getElementById("login-error").style.display = "block";
      }
    });
}

function handleLogout() {
  fetch("/auth/logout", {
    method: "POST",
  }).then(() => {
    currentUser = null;
    localStorage.removeItem("user_info");
    if (loadServersInterval) clearInterval(loadServersInterval);
    showLogin();
  });
}

// ===== EVENT LISTENERS =====
function setupEventListeners() {
  document.querySelectorAll(".filter-btn:not(#add-new-btn)").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      document
        .querySelectorAll(".filter-btn:not(#add-new-btn)")
        .forEach((b) => b.classList.remove("active"));
      e.target.classList.add("active");
      currentFilter = e.target.dataset.filter;
      renderServers();
    });
  });

  const addNewBtn = document.getElementById("add-new-btn");
  if (currentUser && currentUser.role === "admin") {
    addNewBtn.style.display = "inline-block";

    const newAddNewBtn = addNewBtn.cloneNode(true);
    addNewBtn.parentNode.replaceChild(newAddNewBtn, addNewBtn);

    newAddNewBtn.addEventListener("click", () => {
      editingServerId = null;
      document.getElementById("server-form").reset();

      // FIX: Forçar o campo de token a ser editável
      const tokenInput = document.getElementById("server-token");
      if (tokenInput) {
        tokenInput.removeAttribute("readonly");
        tokenInput.removeAttribute("disabled");
      }

      document.getElementById("modal-title").textContent =
        "Adicionar Novo Servidor";
      document.getElementById("server-modal").classList.add("show");
    });
  } else {
    addNewBtn.style.display = "none";
  }

  // Inject Settings Button in Header if not exists
  const headerTitle = document.querySelector("header h1");
  if (headerTitle && !document.getElementById("settings-btn")) {
    const settingsBtn = document.createElement("button");
    settingsBtn.id = "settings-btn";
    settingsBtn.className = "btn btn-secondary";
    settingsBtn.innerHTML = "⚙️ Configurar";
    settingsBtn.style.cssText =
      "margin-left: auto; font-size: 14px; padding: 8px 12px; display: none; align-items: center; gap: 5px;";
    settingsBtn.onclick = openSettingsModal;
    headerTitle.appendChild(settingsBtn);
  }

  // Listener do formulário de servidor
  const serverForm = document.getElementById("server-form");
  if (serverForm) {
    serverForm.removeEventListener("submit", saveServer);
    serverForm.addEventListener("submit", saveServer);
  }

  // FIX: Garantir desbloqueio inicial do campo token se ele já existir
  const tokenInput = document.getElementById("server-token");
  if (tokenInput) {
    tokenInput.removeAttribute("readonly");
    tokenInput.removeAttribute("disabled");
  }

  // Fechar modal ao clicar fora
  const serverModal = document.getElementById("server-modal");
  if (serverModal) {
    serverModal.addEventListener("click", (e) => {
      if (e.target.id === "server-modal") {
        closeModal();
      }
    });
  }

  // Event listeners para o modal de confirmação
  const confirmModal = document.getElementById("confirmation-modal");
  document.getElementById("cancel-btn").addEventListener("click", () => {
    confirmModal.classList.remove("show");
  });
  confirmModal.addEventListener("click", (e) => {
    if (e.target.id === "confirmation-modal") {
      confirmModal.classList.remove("show");
    }
  });
}

// ===== API CALLS =====
async function loadServers() {
  try {
    const response = await fetch("/api/servers");
    const data = await response.json();
    servers = data.servers || [];
    renderServers();
    updateStats();
  } catch (error) {
    console.error("Erro ao carregar servidores:", error);
    servers = [];
  }
}

// ===== RENDER FUNCTIONS =====
function renderServers() {
  const container = document.getElementById("servers-container");
  const emptyState = document.getElementById("empty-state");

  let filteredServers = servers;
  if (currentFilter !== "all") {
    filteredServers = servers.filter((s) => s.status === currentFilter);
  }

  // Aplicar filtro de pesquisa
  if (searchTerm) {
    filteredServers = filteredServers.filter(
      (s) =>
        s.name.toLowerCase().includes(searchTerm) ||
        s.host.toLowerCase().includes(searchTerm) ||
        (s.region && s.region.toLowerCase().includes(searchTerm)),
    );
  }

  // Aplicar ordenação
  filteredServers.sort((a, b) => {
    switch (currentSort) {
      case "name":
        return a.name.localeCompare(b.name);
      case "clients":
        return (b.clientsCount || 0) - (a.clientsCount || 0);
      case "port":
        return a.port - b.port;
      case "status":
        return a.status.localeCompare(b.status);
      default:
        return 0;
    }
  });

  if (filteredServers.length === 0) {
    container.style.display = "none";
    emptyState.style.display = "block";
    return;
  }

  container.style.display = "grid";
  emptyState.style.display = "none";

  container.innerHTML = filteredServers
    .map((server) => {
      const openUrl = getOpenUrl(server);

      return `
        <div class="server-card ${server.status}">
            <div class="status-badge ${server.status}">
                ${server.status === "active" ? "🟢 Ativo" : server.status === "standby" ? "🟡 Em Standby" : "🔴 Inativo"}
            </div>

            <div class="server-name">${server.name}</div>
            <p class="server-description">${server.description || "Sem descrição"}</p>

            <div class="info-row">
                <span class="info-label">Host:</span>
                <span class="info-value">${server.host}</span>
            </div>

            <div class="info-row">
                <span class="info-label">Porta:</span>
                <span class="info-value">${server.port}</span>
            </div>

            <div class="info-row">
                <span class="info-label">URL:</span>
                <span class="info-value">${server.protocol}://${server.host}:${server.port}</span>
            </div>

            <div class="info-row">
                <span class="info-label">Região:</span>
                <span class="region-tag">${server.region || "N/A"}</span>
            </div>

            <div class="info-row">
                <span class="info-label">Clientes:</span>
                <span class="info-value">
                    <strong>${server.clientsCount !== undefined ? server.clientsCount : 0}</strong> / ${server.maxClients.toLocaleString()}
                </span>
            </div>

            <div class="info-row">
                <span class="info-label">Autenticação:</span>
                <span class="info-value">
                    ${
                      server.requiresAuth === true
                        ? "🔒 Obrigatória"
                        : server.requiresAuth === false
                          ? "🔓 Opcional"
                          : "❓ Desconhecido"
                    }
                </span>
            </div>

            <div class="info-row">
                <span class="info-label">Url Token:</span>
                <span class="info-value">${server.urltoken || "N/A"}</span>
            </div>
            ${
              server.token &&
              server.token !== "N/A" &&
              server.requiresAuth !== undefined &&
              server.requiresAuth !== null
                ? `<div class="token-display">
                ${server.token}
                <button class="btn btn-copy" onclick="copyToken('${server.token}')" style="margin-top: 8px;">📋 Copiar</button>
            </div>`
                : ""
            }

            ${server.notes ? `<div class="info-row"><span class="info-label">Notas:</span><span class="info-value">${server.notes}</span></div>` : ""}

            <div class="info-row">
                <span class="info-label">Criado em:</span>
                <span class="info-value">${new Date(server.createdAt).toLocaleDateString("pt-BR")}</span>
            </div>

            ${
              server.lastSeen
                ? `<div class="info-row"><span class="info-label">Visto por último:</span><span class="info-value" style="font-size: 0.85em; color: #666;">${new Date(
                    server.lastSeen,
                  ).toLocaleString("pt-BR")}</span></div>`
                : ""
            }

            <div class="server-actions">
                <a href="${openUrl}" target="_blank" class="btn-main">
                    🔗 Abrir url token
                </a>
                ${
                  currentUser && currentUser.role === "admin"
                    ? `
                <button class="btn-edit" onclick="editServer('${server.id}')">✏️ Editar</button>
                <button class="btn-delete" onclick="deleteServer('${server.id}')">🗑️ Deletar</button>
                `
                    : ""
                }
            </div>
        </div>
    `;
    })
    .join("");
}

// Helper para gerar URL de abertura consistente
function getOpenUrl(server) {
  let openUrl = server.urltoken;
  if (openUrl) {
    openUrl = openUrl.replace(/\/+$/, ""); // Remove barra final se existir
    if (!openUrl.endsWith("/token")) {
      openUrl += "/token";
    }
    // Adiciona protocolo se não existir para evitar URL relativa
    if (!/^https?:\/\//i.test(openUrl)) {
      openUrl = "http://" + openUrl;
    }
    return openUrl;
  }
  return `${server.protocol}://${server.host}:${server.port}`;
}

function updateStats() {
  const total = servers.length;
  const active = servers.filter((s) => s.status === "active").length;
  const inactive = servers.filter((s) => s.status === "inactive").length;
  const capacity = servers.reduce((sum, s) => sum + s.maxClients, 0);

  document.getElementById("total-servers").textContent = total;
  document.getElementById("active-servers").textContent = active;
  document.getElementById("inactive-servers").textContent = inactive;
  document.getElementById("total-capacity").textContent =
    capacity.toLocaleString();
}

// ===== CRUD OPERATIONS =====
function showToast(message, type = "success") {
  const toastContainer = document.getElementById("toast-container");
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;

  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 3000);
}

function copyToken(token) {
  navigator.clipboard.writeText(token).then(() => {
    showToast("✓ Token copiado para a área de transferência!");
  });
}

function editServer(id) {
  const server = servers.find((s) => s.id === id);
  if (!server) return;

  editingServerId = id;
  document.getElementById("server-name").value = server.name;
  document.getElementById("server-description").value = server.description;
  document.getElementById("server-host").value = server.host;
  document.getElementById("server-port").value = server.port;
  document.getElementById("server-protocol").value = server.protocol;

  const urlTokenInput = document.getElementById("server-urltoken");
  if (urlTokenInput) {
    urlTokenInput.value = server.urltoken || "";
  }

  // FIX: Forçar o campo de token a ser editável na edição
  const tokenInput = document.getElementById("server-token");
  tokenInput.value = server.token;
  tokenInput.removeAttribute("readonly");
  tokenInput.removeAttribute("disabled");

  document.getElementById("server-region").value = server.region || "";
  document.getElementById("server-max-clients").value = server.maxClients;
  document.getElementById("server-status").value = server.status;
  document.getElementById("server-notes").value = server.notes || "";

  document.getElementById("modal-title").textContent = "Editar Servidor";
  document.getElementById("server-modal").classList.add("show");
}

async function testUrlToken() {
  const urlInput = document.getElementById("server-urltoken");
  let urlVal = urlInput.value.trim();

  if (!urlVal) {
    showToast("Insira uma URL para testar", "error");
    return;
  }

  // Normalização básica para o teste
  if (!/^https?:\/\//i.test(urlVal)) {
    urlVal = "http://" + urlVal;
  }

  try {
    showToast("Testando conexão...", "info");
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(urlVal, { signal: controller.signal });
    clearTimeout(timeoutId);

    const data = await response.json();
    if (data && data.token) {
      showToast(
        `✅ Sucesso! Token encontrado: ${data.token.substring(0, 8)}...`,
      );
    } else {
      showToast("⚠️ JSON válido, mas campo 'token' não encontrado.", "error");
    }
  } catch (err) {
    console.error(err);
    showToast("❌ Falha na conexão ou JSON inválido.", "error");
  }
}

async function saveServer(event) {
  event.preventDefault();

  const submitBtn = event.target.querySelector('button[type="submit"]');
  const originalBtnText = submitBtn ? submitBtn.textContent : "Salvar Servidor";
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = "Salvando...";
  }

  const token = document.getElementById("server-token").value;
  const urlTokenInput = document.getElementById("server-urltoken");

  let processedUrlToken = urlTokenInput ? urlTokenInput.value.trim() : "";
  processedUrlToken = processedUrlToken.replace(/\/+$/, ""); // Remove barra final antes de verificar
  if (processedUrlToken && !processedUrlToken.endsWith("/token")) {
    processedUrlToken += "/token";
  }

  const serverData = {
    id: editingServerId || `server-${Date.now()}`,
    name: document.getElementById("server-name").value,
    description: document.getElementById("server-description").value,
    host: document.getElementById("server-host").value,
    port: parseInt(document.getElementById("server-port").value),
    protocol: document.getElementById("server-protocol").value,
    token: token || "N/A", // Define como N/A se vazio, não gera token automaticamente
    urltoken: processedUrlToken,
    region: document.getElementById("server-region").value,
    maxClients: parseInt(document.getElementById("server-max-clients").value),
    status: document.getElementById("server-status").value,
    notes: document.getElementById("server-notes").value,
    createdAt: editingServerId
      ? servers.find((s) => s.id === editingServerId).createdAt
      : new Date().toISOString(),
    requiresAuth: editingServerId
      ? servers.find((s) => s.id === editingServerId).requiresAuth
      : undefined,
  };

  try {
    const method = editingServerId ? "PUT" : "POST";
    const response = await fetch(`/api/servers`, {
      method: method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(serverData),
    });

    if (response.status === 401) {
      showToast("Sessão expirada. Faça login novamente.", "error");
      showLogin();
      return;
    }

    if (response.ok) {
      if (editingServerId) {
        servers = servers.map((s) =>
          s.id === editingServerId ? serverData : s,
        );
      } else {
        servers.push(serverData);
      }

      renderServers();
      updateStats();

      showToast("Servidor salvo com sucesso!");
      closeModal();
    }
  } catch (error) {
    console.error("Erro ao salvar servidor:", error);
    showToast("Erro ao salvar servidor", "error");
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = originalBtnText;
    }
  }
}

function deleteServer(id) {
  const server = servers.find((s) => s.id === id);
  if (!server) return;

  const confirmModal = document.getElementById("confirmation-modal");
  const confirmBtn = document.getElementById("confirm-btn");
  const title = document.getElementById("confirmation-title");
  const message = document.getElementById("confirmation-message");

  title.textContent = `Deletar Servidor`;
  message.innerHTML = `Tem certeza que deseja deletar o servidor <strong>${server.name}</strong>? <br>Esta ação não pode ser desfeita.`;

  // Para evitar múltiplos listeners, clonamos e substituímos o botão
  const newConfirmBtn = confirmBtn.cloneNode(true);
  confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);

  newConfirmBtn.addEventListener("click", async () => {
    try {
      const response = await fetch(`/api/servers`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      if (response.status === 401) {
        showToast("Sessão expirada. Faça login novamente.", "error");
        showLogin();
        return;
      }

      if (response.ok) {
        servers = servers.filter((s) => s.id !== id);
        renderServers();
        updateStats();
        showToast("Servidor deletado com sucesso.");
      } else {
        const errorData = await response.json();
        showToast(
          `Erro ao deletar: ${errorData.error || "Erro desconhecido"}`,
          "error",
        );
      }
    } catch (error) {
      console.error("Erro ao deletar servidor:", error);
      showToast("Erro ao deletar servidor", "error");
    } finally {
      confirmModal.classList.remove("show");
    }
  });
  confirmModal.classList.add("show");
}

// ===== MODAL =====
function closeModal() {
  document.getElementById("server-modal").classList.remove("show");
}

// ===== SETTINGS =====
async function openSettingsModal() {
  try {
    const response = await fetch("/api/settings");
    if (response.status === 401) {
      showToast("Sessão expirada.", "error");
      showLogin();
      return;
    }
    const data = await response.json();
    document.getElementById("discovery-url").value = data.discoveryUrl || "";
    document.getElementById("settings-modal").classList.add("show");
  } catch (err) {
    console.error("Erro ao carregar configurações:", err);
    showToast("Erro ao carregar configurações", "error");
  }
}

function closeSettingsModal() {
  document.getElementById("settings-modal").classList.remove("show");
}

async function saveSettings(e) {
  e.preventDefault();
  const discoveryUrl = document.getElementById("discovery-url").value;

  try {
    const response = await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ discoveryUrl }),
    });

    if (response.status === 401) {
      showToast("Sessão expirada. Faça login novamente.", "error");
      showLogin();
      return;
    }

    if (response.ok) {
      showToast("Configurações salvas com sucesso!");
      closeSettingsModal();
    } else {
      showToast("Erro ao salvar configurações", "error");
    }
  } catch (error) {
    console.error("Erro ao salvar configurações:", error);
    showToast("Erro de conexão", "error");
  }
}
