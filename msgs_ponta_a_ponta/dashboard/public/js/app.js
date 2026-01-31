// Dashboard App - Client-side JavaScript

let servers = [];
let currentFilter = "all";
let searchTerm = "";
let currentViewMode = localStorage.getItem("adminViewMode") || "grid";
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
          <button id="cancel-btn" class="btn-edit">Cancelar</button>
          <button id="confirm-btn" class="btn-delete">Confirmar</button>
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
            <button class="close-btn" id="close-settings-btn">&times;</button>
        </div>
        <form id="settings-form">
            <div class="form-group">
                <label for="discovery-url">URL de Descoberta (JSON Token)</label>
                <input type="text" id="discovery-url" placeholder="http://localhost:9080/token" required>
                <small style="display: block; margin-top: 8px; font-size: 0.8em; color: var(--text-muted); font-weight: 500;">URL para sincronização automática do token do servidor.</small>
            </div>
            <div class="modal-actions">
                <button type="submit" class="btn-main">Salvar Configurações</button>
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
      <div id="login-modal" class="modal" style="z-index: 10000;">
        <div class="modal-content" style="max-width: 400px;">
          <div class="modal-header" style="justify-content: center;">
            <h2>🔐 Acesso Restrito</h2>
          </div>
          <form id="login-form" class="mt-2">
            <div class="form-group">
              <label for="login-username">Usuário</label>
              <input type="text" id="login-username" required autocomplete="username">
            </div>
            <div class="form-group mt-2">
              <label for="login-password">Senha</label>
              <input type="password" id="login-password" required autocomplete="current-password">
            </div>
            <div id="login-error" class="alert-box mt-2"></div>
            <div class="modal-actions" style="justify-content: center;">
              <button type="submit" class="btn-main" style="width: 100%; justify-content: center;">Entrar</button>
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
      <div class="view-toggle-wrapper" style="margin-left: 10px;">
        <button id="view-toggle-btn" class="filter-btn" title="Alternar Visualização">
          ${currentViewMode === "grid" ? "🔲 Grid" : "☰ Lista"}
        </button>
      </div>
    `;
    filtersContainer.insertAdjacentHTML("beforeend", searchHTML);

    // Listener para toggle de visualização
    document.getElementById("view-toggle-btn").addEventListener("click", () => {
      currentViewMode = currentViewMode === "grid" ? "list" : "grid";
      localStorage.setItem("adminViewMode", currentViewMode);
      document.getElementById("view-toggle-btn").innerHTML =
        currentViewMode === "grid" ? "🔲 Grid" : "☰ Lista";
      renderServers();
    });
  }

  // --- FIX: Injetar Botão de Logout se não existir ---
  if (!document.getElementById("logout-btn")) {
    const header = document.querySelector("header");
    if (header) {
      // Tenta inserir no header
      const logoutBtnHTML = `<button id="logout-btn" class="btn-edit" style="display: none; margin-left: 15px; font-size: 14px; padding: 8px 16px;">Sair</button>`;
      const h1 = header.querySelector("h1") || header;
      if (h1) h1.insertAdjacentHTML("afterend", logoutBtnHTML);
    }
  }

  // --- FIX: Injetar Footer se não existir ---
  if (!document.querySelector("footer")) {
    const footerHTML = `
      <footer class="app-footer">
        <div class="footer-content">
          <div style="font-size: 1.5rem; font-weight: 900; letter-spacing: 0.1em;">P2P SECURE CHAT</div>
          <div style="display: flex; gap: 15px; font-weight: bold; font-size: 0.9rem;">
            <span>DASHBOARD</span>
            <span>•</span>
            <span>ADMIN</span>
            <span>•</span>
            <span>${new Date().getFullYear()}</span>
          </div>
          <div style="font-size: 0.8rem; font-weight: bold;">
            SYSTEM: <span class="badge">ONLINE</span>
          </div>
        </div>
      </footer>
    `;
    document.body.insertAdjacentHTML("beforeend", footerHTML);
  }

  // --- FIX: Injetar Modal de Servidor se não existir ---
  if (!document.getElementById("server-modal")) {
    const serverModalHTML = `
      <div id="server-modal" class="modal">
        <div class="modal-content">
          <div class="modal-header">
            <h2 id="modal-title">Adicionar/Editar Servidor</h2>
            <button class="close-btn" id="close-server-modal-btn">&times;</button>
          </div>
          <form id="server-form">
            <div class="form-group">
              <label for="server-name">Nome do Servidor</label>
              <input type="text" id="server-name" required>
            </div>
            <div class="form-group mt-2">
              <label for="server-description">Descrição</label>
              <textarea id="server-description" rows="2"></textarea>
            </div>
            <div class="grid-cols-3">
              <div class="form-group">
                <label for="server-host">Host (IP/Domínio)</label>
                <input type="text" id="server-host" required>
              </div>
              <div class="form-group">
                <label for="server-port">Porta</label>
                <input type="number" id="server-port">
              </div>
              <div class="form-group">
                <label for="server-protocol">Protocolo</label>
                <select id="server-protocol">
                  <option value="ws">WS</option>
                  <option value="wss">WSS</option>
                </select>
              </div>
            </div>
            <div class="form-group mt-2">
              <label for="server-token">Token de Autenticação (deixe em branco para gerar automaticamente)</label>
              <div class="flex gap-2 mb-2">
                <input type="text" id="server-token" style="flex-grow: 1;" placeholder="Deixe vazio para gerar automaticamente">
                <button type="button" id="generate-token-btn" class="btn-edit" style="width: auto; padding: 0 15px; display: none;" title="Gerar Novo" disabled>🎲</button>
              </div>
            </div>
            <div class="form-group mt-2">
              <label for="server-urltoken">URL do Token (JSON)</label>
              <div class="flex gap-2 mb-2">
                <input type="text" id="server-urltoken" style="flex-grow: 1;" placeholder="http://localhost:9080/token">
                <button type="button" id="test-url-btn" class="btn-edit" style="width: auto; padding: 0 15px;" title="Testar Conexão">⚡</button>
              </div>
            </div>
            <div class="grid-cols-3" style="grid-template-columns: 1fr 1fr 1fr;">
              <div class="form-group">
                <label for="server-region">Região</label>
                <input type="text" id="server-region">
              </div>
              <div class="form-group">
                <label for="server-max-clients">Max Clientes</label>
                <input type="number" id="server-max-clients" value="10000">
              </div>
              <div class="form-group">
                <label for="server-status">Status</label>
                <select id="server-status">
                  <option value="active">Ativo</option>
                  <option value="inactive">Inativo</option>
                  <option value="standby">Standby</option>
                </select>
              </div>
            </div>
            <div class="form-group mt-2">
              <label for="server-notes">Notas Internas</label>
              <textarea id="server-notes" rows="2"></textarea>
            </div>
            <div class="modal-actions">
              <button type="button" class="btn-edit" id="cancel-server-modal-btn">Cancelar</button>
              <button type="submit" class="btn-main">Salvar Servidor</button>
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
                  <label for="server-urltoken" class="mt-2">URL do Token (JSON)</label>
                  <div class="flex gap-2 mb-2">
                    <input type="text" id="server-urltoken" style="flex-grow: 1;" placeholder="http://localhost:9080/token">
                    <button type="button" id="test-url-btn" class="btn-edit" style="width: auto; padding: 0 15px;" title="Testar Conexão">⚡</button>
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

  if (loginModal) loginModal.classList.add("show");
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
  document.getElementById("login-modal").classList.remove("show");
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
        // A classe .alert-box já cuida do estilo
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
    settingsBtn.className = "btn-edit";
    settingsBtn.innerHTML = "⚙️ Configurar";
    settingsBtn.style.cssText = // Mantendo apenas posicionamento específico do header
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

  // Configurar container baseado no modo de visualização
  if (currentViewMode === "list") {
    container.className = "servers-list";
    container.style.display = "flex";
  } else {
    container.className = "servers-grid";
    container.style.display = "grid";
  }

  emptyState.style.display = "none";

  container.innerHTML = filteredServers
    .map((server) => {
      const openUrl = getOpenUrl(server);

      if (currentViewMode === "list") {
        return `
            <div class="server-list-item ${server.status}">
                <div style="display:flex; align-items:center; gap:15px;">
                    <span class="status-badge ${server.status}" style="margin:0; padding:4px 8px; font-size:0.8rem;">
                        ${server.status === "active" ? "🟢" : server.status === "standby" ? "🟡" : "🔴"}
                    </span>
                    <div style="text-align:left;">
                        <h3 class="server-name" style="font-size:1.1rem; margin:0;">${server.name}</h3>
                        <div style="font-size:0.85rem; color:var(--text-muted); font-family:'Roboto Mono', monospace;">${server.host}${server.port ? ":" + server.port : ""}</div>
                    </div>
                </div>

                <div style="text-align:center;">
                    <span class="protocol-value" style="font-size:0.9rem;">${server.protocol}</span>
                    <div style="font-size:0.8rem; color:var(--text-muted);">${server.region || "N/A"}</div>
                </div>

                <div style="text-align:center;">
                    <span class="info-value" style="font-size:0.9rem;">
                        <strong>${server.clientsCount !== undefined ? server.clientsCount : 0}</strong> / ${server.maxClients.toLocaleString()}
                    </span>
                    <div style="font-size:0.8rem; color:var(--text-muted);">Clientes</div>
                </div>

                <div class="server-actions">
                    <a href="${openUrl}" target="_blank" class="btn-main" title="Abrir URL Token">🔗</a>
                    ${
                      currentUser && currentUser.role === "admin"
                        ? `<button class="btn-edit" onclick="editServer('${server.id}')" title="Editar">✏️</button>
                           <button class="btn-delete" onclick="deleteServer('${server.id}')" title="Deletar">🗑️</button>`
                        : ""
                    }
                </div>
            </div>`;
      }

      return `
        <div class="server-card ${server.status}">
            <span class="status-badge ${server.status}">
                ${server.status === "active" ? "🟢 Ativo" : server.status === "standby" ? "🟡 Em Standby" : "🔴 Inativo"}
            </span>

            <h3 class="server-name">${server.name}</h3>
            <p class="server-description">${server.description || "Sem descrição disponível."}</p>

            <div class="info-row">
                <span class="info-label">Host:</span>
                <span class="info-value">${server.host}</span>
            </div>

            <div class="info-row">
                <span class="info-label">Porta:</span>
                <span class="info-value">${server.port || "N/A"}</span>
            </div>

            <div class="info-row">
                <span class="info-label">URL:</span>
                <span class="info-value protocol-value">${server.protocol}://${server.host}${server.port ? ":" + server.port : ""}</span>
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
                ? `<div class="token-display mt-2">
                <div class="mb-2">${server.token}</div>
                <button class="btn-copy w-full" onclick="copyToken('${server.token}')">📋 Copiar Token</button>
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
  return `${server.protocol}://${server.host}${server.port ? ":" + server.port : ""}`;
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
      document.getElementById("server-token").value = data.token;
      showToast(
        `✅ Sucesso! Token atualizado: ${data.token.substring(0, 8)}...`,
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

  try {
    const token = document.getElementById("server-token").value;
    const urlTokenInput = document.getElementById("server-urltoken");

    let processedUrlToken = urlTokenInput ? urlTokenInput.value.trim() : "";
    processedUrlToken = processedUrlToken.replace(/\/+$/, ""); // Remove barra final antes de verificar
    if (processedUrlToken && !processedUrlToken.endsWith("/token")) {
      processedUrlToken += "/token";
    }

    const existingServer = editingServerId
      ? servers.find((s) => s.id === editingServerId)
      : null;

    const serverData = {
      id: editingServerId || `server-${Date.now()}`,
      name: document.getElementById("server-name").value,
      description: document.getElementById("server-description").value,
      host: document.getElementById("server-host").value,
      port: document.getElementById("server-port").value
        ? parseInt(document.getElementById("server-port").value, 10)
        : null,
      protocol: document.getElementById("server-protocol").value,
      token: token,
      region: document.getElementById("server-region").value,
      maxClients:
        parseInt(document.getElementById("server-max-clients").value) || 10000,
      status: document.getElementById("server-status").value,
      notes: document.getElementById("server-notes").value,
      createdAt: existingServer
        ? existingServer.createdAt
        : new Date().toISOString(),
      urltoken: processedUrlToken,
      // O backend irá definir 'requiresAuth' e outras propriedades
    };

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
      const result = await response.json();
      const savedServer = result.server;

      if (editingServerId) {
        servers = servers.map((s) =>
          s.id === editingServerId ? savedServer : s,
        );
      } else {
        servers.push(savedServer);
      }

      renderServers();
      updateStats();

      showToast("Servidor salvo com sucesso!");
      closeModal();
    } else {
      const errorData = await response.json();
      const errorMessage = errorData.details
        ? errorData.details.join(", ")
        : errorData.error;
      showToast(`Erro: ${errorMessage}`, "error");
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
