// View App - Visualização pública de servidores (sem autenticação)
// Usa config.js para URLs dinâmicas (API_BASE e WS_BASE)

let servers = [];
let currentFilter = "all";
let searchTerm = "";
let currentViewMode = localStorage.getItem("publicViewMode") || "grid";
let currentSort = "name";
let currentUser = null;
let latencyInterval = null;
let latencyHistory = [];
let latencyComparisonData = [];

// ===== INITIALIZATION =====
document.addEventListener("DOMContentLoaded", () => {
  checkAuth();
  loadServers();
  setupEventListeners();
  updateLastUpdate();
  setInterval(updateLastUpdate, 60000); // Atualizar a cada minuto
  setInterval(loadServers, 5000); // Atualizar lista a cada 5 segundos

  // Injetar UI necessária que pode não estar no HTML base
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

  // Injetar Modal de Conexão
  if (!document.getElementById("connect-modal")) {
    const modalHTML = `
      <div id="connect-modal" class="modal">
        <div class="modal-content">
          <div class="modal-header">
            <h2>🔗 Dados de Conexão</h2>
            <button class="close-modal-btn close-btn">&times;</button>
          </div>
          <p class="mb-4" style="font-weight: 500;">Copie os dados abaixo para usar na sua extensão ou aplicação.</p>
          
          <div class="form-group mb-4">
            <label>Nome do Servidor:</label>
            <input type="text" id="modal-server-name" readonly>
          </div>

          <div class="form-group mb-4">
            <label>URL WebSocket:</label>
            <div class="flex gap-2">
              <input type="text" id="modal-ws-url" readonly style="flex-grow: 1;">
              <button onclick="copyInput('modal-ws-url', this)" class="btn-copy-connection" style="padding: 0 15px;">Copiar</button>
            </div>
          </div>

          <div id="modal-token-group" class="form-group mb-4">
            <label>Token de Autenticação:</label>
            <div class="flex gap-2">
              <input type="text" id="modal-token" readonly style="flex-grow: 1; font-family: monospace;">
              <button onclick="copyInput('modal-token', this)" class="btn-copy" style="padding: 0 15px;">Copiar</button>
            </div>
          </div>

          <div class="modal-actions">
            <button class="close-modal-btn btn-main" style="width: 100%;">Fechar</button>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML("beforeend", modalHTML);
  }

  // Injetar Barra de Pesquisa e Ordenação se não existirem
  const filtersContainer = document.querySelector(".filters");
  if (filtersContainer && !document.getElementById("view-search")) {
    const controlsHTML = `
      <div class="filters-divider"></div>
      <div class="search-wrapper">
        <input type="text" id="view-search" class="search-input" placeholder="Buscar...">
      </div>
      <div class="sort-wrapper">
        <select id="view-sort" class="sort-select">
            <option value="name">Nome</option>
            <option value="clients">Clientes</option>
            <option value="port">Porta</option>
        </select>
      </div>
      <div class="view-toggle-wrapper" style="margin-left: 10px;">
        <button id="view-toggle-btn" class="filter-btn" title="Alternar Visualização">
          ${currentViewMode === "grid" ? "🔲 Grid" : "☰ Lista"}
        </button>
      </div>
    `;
    filtersContainer.insertAdjacentHTML("beforeend", controlsHTML);
  }

  // Event Listeners do Modal (Movido para fora para funcionar com HTML estático)
  const connectModal = document.getElementById("connect-modal");
  if (connectModal) {
    const closeBtns = connectModal.querySelectorAll(
      ".close-modal, .close-modal-btn",
    );
    closeBtns.forEach((btn) => {
      btn.addEventListener("click", () =>
        connectModal.classList.remove("show"),
      );
    });
    connectModal.addEventListener("click", (event) => {
      if (event.target === connectModal) connectModal.classList.remove("show");
    });
  }

  // Event listeners (movidos para fora para garantir que funcionem com HTML estático)
  const viewSearch = document.getElementById("view-search");
  if (viewSearch) {
    viewSearch.addEventListener("input", (e) => {
      searchTerm = e.target.value.toLowerCase();
      renderServers();
    });
  }

  const viewSort = document.getElementById("view-sort");
  if (viewSort) {
    viewSort.addEventListener("change", (e) => {
      currentSort = e.target.value;
      renderServers();
    });
  }

  const viewToggleBtn = document.getElementById("view-toggle-btn");
  if (viewToggleBtn) {
    // Definir estado inicial
    viewToggleBtn.innerHTML =
      currentViewMode === "grid" ? "🔲 Grid" : "☰ Lista";

    viewToggleBtn.addEventListener("click", () => {
      currentViewMode = currentViewMode === "grid" ? "list" : "grid";
      localStorage.setItem("publicViewMode", currentViewMode);
      viewToggleBtn.innerHTML =
        currentViewMode === "grid" ? "🔲 Grid" : "☰ Lista";
      renderServers();
    });
  }

  // --- FIX: Injetar Footer se não existir ---
  if (!document.querySelector("footer")) {
    const footerHTML = `
      <footer class="app-footer">
        <div class="footer-content">
          <div style="font-size: 1.5rem; font-weight: 900; letter-spacing: 0.1em;">P2P SECURE CHAT</div>
          <div style="display: flex; gap: 15px; font-weight: bold; font-size: 0.9rem;">
            <span>PUBLIC VIEW</span>
            <span>•</span>
            <span>MONITOR</span>
            <span>•</span>
            <span>${new Date().getFullYear()}</span>
          </div>
          <div style="font-size: 0.8rem; font-weight: bold;">
            STATUS: <span class="badge">LIVE</span>
          </div>
        </div>
      </footer>
    `;
    document.body.insertAdjacentHTML("beforeend", footerHTML);
  }

  // Listeners para Perfil e Logout
  const loginBtn = document.getElementById("login-btn");
  if (loginBtn) {
    loginBtn.addEventListener("click", () => {
      window.location.href = "/";
    });
  }

  const profileBtn = document.getElementById("profile-btn");
  if (profileBtn) {
    profileBtn.addEventListener("click", openProfileModal);
  }

  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", handleLogout);
  }

  // Profile Modal Listeners
  const profileModal = document.getElementById("profile-modal");
  if (profileModal) {
    const closeBtns = profileModal.querySelectorAll(".close-modal-btn");
    closeBtns.forEach((btn) => {
      btn.addEventListener("click", () =>
        profileModal.classList.remove("show"),
      );
    });
    profileModal.addEventListener("click", (e) => {
      if (e.target === profileModal) profileModal.classList.remove("show");
    });

    const profileForm = document.getElementById("profile-form");
    if (profileForm) {
      profileForm.addEventListener("submit", saveProfile);
    }

    const deleteAccountBtn = document.getElementById("delete-account-btn");
    if (deleteAccountBtn) {
      deleteAccountBtn.addEventListener("click", deleteMyAccount);
    }
  }

  // Listeners para o gráfico de comparação
  const refreshLatencyBtn = document.getElementById("refresh-latency-btn");
  if (refreshLatencyBtn) {
    refreshLatencyBtn.addEventListener("click", updateLatencyComparisonChart);
  }

  const latencyCompCanvas = document.getElementById("latency-comparison-chart");
  if (latencyCompCanvas) {
    latencyCompCanvas.addEventListener("mousemove", (e) => {
      const rect = latencyCompCanvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const width = latencyCompCanvas.width;
      const results = latencyComparisonData;

      if (!results || results.length === 0) return;

      const padding = 40;
      const barWidth = (width - padding * 2) / results.length - 10;

      let hoverIndex = -1;
      for (let i = 0; i < results.length; i++) {
        const barX = padding + i * (barWidth + 10);
        if (x >= barX && x <= barX + barWidth) {
          hoverIndex = i;
          break;
        }
      }
      drawLatencyComparisonChart(hoverIndex);
    });

    latencyCompCanvas.addEventListener("mouseout", () => {
      drawLatencyComparisonChart(-1);
    });
  }
  setupPasswordToggles();
});

// ===== AUTHENTICATION =====
function checkAuth() {
  fetch("/auth/verify")
    .then((res) => res.json())
    .then((data) => {
      if (data.valid) {
        currentUser = data.user;
        document.getElementById("login-btn").style.display = "none";
        document.getElementById("profile-btn").style.display = "inline-flex";
        document.getElementById("logout-btn").style.display = "inline-flex";

        // Mostrar ferramentas para usuários logados
        const latencyCard = document.getElementById("latency-comparison-card");
        if (latencyCard) latencyCard.style.display = "block";
        const loginMsg = document.getElementById("login-required-message");
        if (loginMsg) loginMsg.style.display = "none";

        updateLatencyComparisonChart();
        renderServers(); // Re-renderizar para mostrar botões de Ping
      } else {
        document.getElementById("login-btn").style.display = "inline-flex";
        document.getElementById("profile-btn").style.display = "none";
        document.getElementById("logout-btn").style.display = "none";

        // Ocultar ferramentas para visitantes
        const latencyCard = document.getElementById("latency-comparison-card");
        if (latencyCard) latencyCard.style.display = "none";
        const loginMsg = document.getElementById("login-required-message");
        if (loginMsg) loginMsg.style.display = "block";

        renderServers(); // Re-renderizar para ocultar botões de Ping
      }
    })
    .catch(() => {
      document.getElementById("login-btn").style.display = "inline-flex";
    });
}

function handleLogout() {
  fetch("/auth/logout", { method: "POST" }).then(() => {
    currentUser = null;
    window.location.reload();
  });
}

// ===== PROFILE =====
function openProfileModal() {
  if (!currentUser) return;

  document.getElementById("profile-name").value = currentUser.name;
  document.getElementById("profile-username").value = currentUser.username;
  document.getElementById("profile-password").value = "";

  document.getElementById("profile-modal").classList.add("show");
}

async function saveProfile(e) {
  e.preventDefault();

  const name = document.getElementById("profile-name").value;
  const password = document.getElementById("profile-password").value;

  const payload = {
    id: currentUser.id,
    name: name,
    username: currentUser.username,
    role: currentUser.role,
  };

  if (password) {
    if (password.length < 6) {
      showToast("A senha deve ter no mínimo 6 caracteres.", "error");
      return;
    }
    payload.password = await hashPasswordFrontend(password);
  }

  try {
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      showToast("Perfil atualizado com sucesso!");
      document.getElementById("profile-modal").classList.remove("show");
      currentUser.name = name;
    } else {
      const err = await res.json();
      showToast(err.error || "Erro ao atualizar perfil", "error");
    }
  } catch (err) {
    console.error(err);
    showToast("Erro de conexão", "error");
  }
}

function deleteMyAccount() {
  if (
    !confirm(
      "Tem certeza que deseja excluir sua conta? Esta ação é irreversível.",
    )
  ) {
    return;
  }

  fetch("/api/users", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: currentUser.id }),
  })
    .then(async (res) => {
      if (res.ok) {
        handleLogout();
      } else {
        const err = await res.json();
        showToast(err.error || "Erro ao excluir conta", "error");
      }
    })
    .catch(() => showToast("Erro de conexão", "error"));
}

// ===== LOAD SERVERS =====
function loadServers() {
  // Solicita todos os servidores públicos para calcular contadores corretamente
  const apiUrl = `${window.APP_CONFIG.API_BASE}/api/public-servers?status=all`;
  fetch(apiUrl)
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      return res.json();
    })
    .then((data) => {
      servers = data.servers || [];
      renderServers();
      updateStats();
      updateCounts();
    })
    .catch((error) => {
      console.error("Erro ao carregar servidores:", error);
      document.getElementById("servers-grid").innerHTML =
        '<div class="empty-state"><p style="font-size: 2em;">❌</p><h2>Erro ao carregar servidores</h2><p>Não foi possível conectar ao servidor.</p><button onclick="loadServers()" class="btn btn-primary" style="margin-top: 15px;">🔄 Tentar Novamente</button></div>';
    });
}

// ===== UPDATE STATS =====
function updateStats() {
  const total = servers.length;
  const active = servers.filter((s) => s.status === "active").length;
  const inactive = servers.filter((s) => s.status === "inactive").length;
  const standby = servers.filter((s) => s.status === "standby").length;

  document.getElementById("total-servers").textContent = total;
  document.getElementById("active-servers").textContent = active;
  document.getElementById("inactive-servers").textContent = inactive;
  document.getElementById("standby-servers").textContent = standby;
}

// ===== RENDER SERVERS =====
function renderServers() {
  const container = document.getElementById("servers-grid");

  const filtered = servers.filter((server) => {
    if (currentFilter === "all") return true;
    return server.status === currentFilter;
  });

  // Filtro de pesquisa
  let displayServers = filtered;
  if (searchTerm) {
    displayServers = displayServers.filter(
      (s) =>
        s.name.toLowerCase().includes(searchTerm) ||
        s.host.toLowerCase().includes(searchTerm) ||
        (s.region && s.region.toLowerCase().includes(searchTerm)),
    );
  }

  // Ordenação
  displayServers.sort((a, b) => {
    switch (currentSort) {
      case "name":
        return a.name.localeCompare(b.name);
      case "clients":
        return (b.clientsCount || 0) - (a.clientsCount || 0);
      case "port":
        return a.port - b.port;
      default:
        return 0;
    }
  });

  if (displayServers.length === 0) {
    container.innerHTML = `<div class="empty-state">
        <p style="font-size: 2em;">📭</p>
        <h2>Nenhum servidor encontrado</h2>
        <p>Não há servidores com o filtro selecionado</p>
      </div>`;
    return;
  }

  // Configurar container baseado no modo de visualização
  if (currentViewMode === "list") {
    container.className = "servers-list";
    container.style.display = "block";
  } else {
    container.className = "servers-grid";
    container.style.display = "grid";
  }

  if (currentViewMode === "list") {
    container.innerHTML = `
      <div style="overflow-x: auto;">
        <table style="width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <thead style="background: #f8f9fa; border-bottom: 2px solid #e9ecef;">
                <tr>
                    <th style="padding: 12px 15px; text-align: left; font-weight: 600; color: #495057;">Status</th>
                    <th style="padding: 12px 15px; text-align: left; font-weight: 600; color: #495057;">Nome</th>
                    <th style="padding: 12px 15px; text-align: left; font-weight: 600; color: #495057;">Host</th>
                    <th style="padding: 12px 15px; text-align: left; font-weight: 600; color: #495057;">Porta</th>
                    <th style="padding: 12px 15px; text-align: left; font-weight: 600; color: #495057;">Protocolo</th>
                    <th style="padding: 12px 15px; text-align: left; font-weight: 600; color: #495057;">Clientes</th>
                    <th style="padding: 12px 15px; text-align: left; font-weight: 600; color: #495057;">Região</th>
                    <th style="padding: 12px 15px; text-align: right; font-weight: 600; color: #495057;">Ações</th>
                </tr>
            </thead>
            <tbody>
                ${displayServers
                  .map((server) => {
                    return `
                        <tr style="border-bottom: 1px solid #e9ecef; transition: background 0.2s;">
                            <td style="padding: 12px 15px;">
                                <span class="status-badge ${server.status}" style="font-size: 0.8rem; padding: 4px 8px; border-radius: 12px;">
                                    ${getStatusEmoji(server.status)} ${getStatusLabel(server.status)}
                                </span>
                            </td>
                            <td style="padding: 12px 15px; font-weight: 500;">${escapeHtml(server.name)}</td>
                            <td style="padding: 12px 15px; font-family: 'Roboto Mono', monospace; color: #666;">${escapeHtml(server.host)}</td>
                            <td style="padding: 12px 15px;">${server.port || "N/A"}</td>
                            <td style="padding: 12px 15px;">${server.protocol}</td>
                            <td style="padding: 12px 15px;">
                                <strong>${server.clientsCount !== undefined ? server.clientsCount : 0}</strong> / ${server.maxClients}
                            </td>
                            <td style="padding: 12px 15px;">${escapeHtml(server.region || "N/A")}</td>
                            <td style="padding: 12px 15px; text-align: right;">
                                <button class="btn-icon" onclick="connectToServer('${escapeHtml(server.host)}', ${server.port}, '${server.protocol}', '${escapeHtml(server.name)}', '${escapeHtml(server.token || "")}')" title="Conectar" style="background: none; border: none; cursor: pointer; font-size: 1.2em; margin-right: 8px;">🔗</button>
                                <button class="btn-icon" onclick="copyToClipboard('${escapeHtml(server.host)}:${server.port}', this)" title="Copiar Host" style="background: none; border: none; cursor: pointer; font-size: 1.2em;">📍</button>
                            </td>
                        </tr>
                    `;
                  })
                  .join("")}
            </tbody>
        </table>
      </div>`;
    return;
  }

  container.innerHTML = displayServers
    .map((server) => {
      return `
    <div class="server-card ${server.status}">
        <span class="status-badge ${server.status}">
          ${getStatusEmoji(server.status)} ${getStatusLabel(server.status)}
        </span>

        <h3 class="server-name">${escapeHtml(server.name)}</h3>
        <p class="server-description">${escapeHtml(server.description || "Sem descrição disponível.")}</p>

        <div class="info-row">
          <span class="info-label">Host:</span>
          <span class="info-value">${escapeHtml(server.host)}</span>
        </div>

        <div class="info-row">
          <span class="info-label">Porta:</span>
          <span class="info-value">${server.port || "N/A"}</span>
        </div>

        <div class="info-row">
          <span class="info-label">Protocolo:</span>
          <span class="info-value protocol-value">${server.protocol}</span>
        </div>

        ${
          server.region
            ? `<div class="info-row">
          <span class="info-label">Região:</span>
          <span class="info-value">${escapeHtml(server.region)}</span>
        </div>`
            : ""
        }

        ${
          server.maxClients
            ? `<div class="info-row">
          <span class="info-label">Clientes:</span>
          <span class="info-value"><strong>${server.clientsCount !== undefined ? server.clientsCount : 0}</strong> / ${server.maxClients}</span>
        </div>`
            : ""
        }

        <div class="info-row">
          <span class="info-label">Autenticação:</span>
          <span class="info-value">${
            server.requiresAuth === true
              ? "🔒 Obrigatória"
              : server.requiresAuth === false
                ? "🔓 Opcional"
                : "❓ Desconhecido"
          }</span>
        </div>

      ${
        server.token &&
        server.requiresAuth !== undefined &&
        server.requiresAuth !== null
          ? `<div class="token-display mt-2">
              <div class="mb-2">${escapeHtml(server.token)}</div>
              <button class="btn-copy w-full" onclick="copyToClipboard('${escapeHtml(server.token)}', this)">📋 Copiar Token</button>
            </div>`
          : server.requiresAuth !== undefined && server.requiresAuth !== null
            ? `<div style="background: #fff; padding: 15px; margin: 15px 0; /* box-shadow: var(--shadow-md); */ border-radius: var(--radius-sm); box-shadow: var(--shadow-sm);">
        <p style="margin: 0; font-size: 0.9em; color: var(--text-main); font-weight: 600;">
          ⚠️ Token não configurado para este servidor
        </p>
      </div>`
            : ""
      }

      <div class="server-actions">
        <button class="btn-connect" onclick="connectToServer('${escapeHtml(
          server.host,
        )}', ${server.port}, '${server.protocol}', '${escapeHtml(server.name)}', '${escapeHtml(
          server.token || "",
        )}')">
          🔗 Conectar
        </button>
        ${
          currentUser
            ? `<button class="btn-edit" onclick="pingServer('${escapeHtml(server.host)}', ${server.port}, '${server.protocol}', this)" title="Testar Latência">
              ⚡ Ping
            </button>`
            : ""
        }
        <button class="btn-copy" onclick="copyToClipboard('${escapeHtml(
          server.host,
        )}:${server.port}', this)" title="Copiar host:porta">
          📍 Host
        </button>
        <button class="btn-copy btn-copy-connection" onclick="copyConnection('${escapeHtml(
          server.host,
        )}', ${server.port}, '${server.protocol}', '${escapeHtml(server.token || "")}', this)" title="Copiar ws://host:porta + token">
          🔐 Conexão
        </button>
      </div>
    </div>
  `;
    })
    .join("");
}

// ===== UPDATE COUNTS =====
function updateCounts() {
  const statuses = ["all", "active", "inactive", "standby"];

  statuses.forEach((status) => {
    let count = 0;

    if (status === "all") {
      count = servers.length;
    } else {
      count = servers.filter((s) => s.status === status).length;
    }

    const countElement = document.getElementById(`count-${status}`);
    if (countElement) {
      countElement.textContent = `(${count})`;
    }
  });
}

// ===== EVENT LISTENERS =====
function setupEventListeners() {
  document.querySelectorAll(".filter-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      document.querySelectorAll(".filter-btn").forEach((b) => {
        b.classList.remove("active");
      });

      e.target.classList.add("active");
      currentFilter = e.target.dataset.filter;
      renderServers();
    });
  });
}

// ===== CONNECT TO SERVER =====
function connectToServer(host, port, protocol, serverName, token) {
  // Constrói a URL baseada nos dados do servidor clicado
  const wsUrl = `${protocol}://${host}${port ? ":" + port : ""}`;

  document.getElementById("modal-server-name").value = serverName;
  document.getElementById("modal-ws-url").value = wsUrl;

  const tokenGroup = document.getElementById("modal-token-group");
  const tokenInput = document.getElementById("modal-token");

  if (token) {
    tokenGroup.style.display = "block";
    tokenInput.value = token;
  } else {
    tokenGroup.style.display = "none";
    tokenInput.value = "";
  }

  const modal = document.getElementById("connect-modal");
  modal.classList.add("show");

  // Lógica de exibição das ferramentas no modal
  const latencyGroup = document.getElementById("latency-history-group");
  const speedGroup = document.getElementById("speed-test-group");
  const loginAlert = document.getElementById("login-alert-modal");

  if (currentUser) {
    if (latencyGroup) latencyGroup.style.display = "block";
    if (speedGroup) speedGroup.style.display = "block";
    if (loginAlert) loginAlert.style.display = "none";

    // Iniciar monitoramento de latência
    latencyHistory = [];
    startLatencyMonitoring(host, port, protocol);

    const qualityEl = document.getElementById("connection-quality");
    if (qualityEl) {
      qualityEl.textContent = "Aguardando...";
      qualityEl.style.backgroundColor = "#e9ecef";
      qualityEl.style.color = "#6c757d";
    }

    // Resetar teste de velocidade
    document.getElementById("speed-download").textContent = "-- Mbps";
    document.getElementById("speed-upload").textContent = "-- Mbps";
    const startSpeedBtn = document.getElementById("start-speed-test-btn");
    if (startSpeedBtn) startSpeedBtn.disabled = false;
  } else {
    if (latencyGroup) latencyGroup.style.display = "none";
    if (speedGroup) speedGroup.style.display = "none";
    if (loginAlert) loginAlert.style.display = "block";
  }
}

function pingServer(host, port, protocol, btn) {
  const originalText = btn.innerHTML;
  btn.innerHTML = "⏳ ...";
  btn.style.pointerEvents = "none";

  const wsUrl = `${protocol}://${host}${port ? ":" + port : ""}`;
  const start = Date.now();

  try {
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      const latency = Date.now() - start;
      btn.innerHTML = `⚡ ${latency}ms`;
      showToast(`Latência: ${latency}ms`, "success");

      // Feedback visual baseado na latência
      if (latency < 100) btn.style.color = "var(--success)";
      else if (latency < 300) btn.style.color = "var(--warning)";
      else btn.style.color = "var(--danger)";

      ws.close();
      setTimeout(() => {
        btn.innerHTML = originalText;
        btn.style.color = ""; // Resetar cor
        btn.style.pointerEvents = "auto";
      }, 3000);
    };

    ws.onerror = () => {
      btn.innerHTML = "❌ Erro";
      showToast("Erro ao conectar ao servidor", "error");
      setTimeout(() => {
        btn.innerHTML = originalText;
        btn.style.pointerEvents = "auto";
      }, 3000);
    };
  } catch (e) {
    btn.innerHTML = "❌ Erro";
    showToast("Erro ao iniciar teste de ping", "error");
    setTimeout(() => {
      btn.innerHTML = originalText;
      btn.style.pointerEvents = "auto";
    }, 3000);
  }
}

function startLatencyMonitoring(host, port, protocol) {
  if (latencyInterval) clearInterval(latencyInterval);

  const measureLatency = () => {
    const wsUrl = `${protocol}://${host}${port ? ":" + port : ""}`;
    const start = Date.now();

    try {
      const ws = new WebSocket(wsUrl);
      ws.onopen = () => {
        const latency = Date.now() - start;
        ws.close();
        updateLatencyChart(latency);
      };
      ws.onerror = () => {
        updateLatencyChart(null); // Null indica erro/timeout
      };
    } catch (e) {
      updateLatencyChart(null);
    }
  };

  measureLatency(); // Primeira medição imediata
  latencyInterval = setInterval(measureLatency, 2000); // A cada 2 segundos
}

function updateLatencyChart(latency) {
  const maxPoints = 20;
  latencyHistory.push(latency);
  if (latencyHistory.length > maxPoints) latencyHistory.shift();
  updateConnectionQuality();

  const canvas = document.getElementById("latency-chart");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;

  // Limpar canvas
  ctx.clearRect(0, 0, width, height);

  // Configurar estilo
  ctx.strokeStyle = "#3b82f6";
  ctx.lineWidth = 2;
  ctx.fillStyle = "rgba(59, 130, 246, 0.1)";

  // Desenhar gráfico
  ctx.beginPath();
  const step = width / (maxPoints - 1);

  // Encontrar valor máximo para escala (mínimo 100ms)
  const maxVal = Math.max(100, ...latencyHistory.filter((v) => v !== null));

  latencyHistory.forEach((val, i) => {
    const x = i * step;
    // Se val for null (erro), desenha no topo ou ignora
    const y =
      val !== null ? height - (val / maxVal) * (height - 20) - 10 : height;

    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);

    // Desenhar ponto
    ctx.save();
    ctx.fillStyle =
      val !== null
        ? val < 100
          ? "#22c55e"
          : val < 300
            ? "#f59e0b"
            : "#ef4444"
        : "#ef4444";
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });

  ctx.stroke();

  // Adicionar texto do último valor
  const lastVal = latencyHistory[latencyHistory.length - 1];
  ctx.fillStyle = "#374151";
  ctx.font = "12px sans-serif";
  ctx.fillText(lastVal !== null ? `${lastVal}ms` : "Erro", width - 40, 20);
}

function updateConnectionQuality() {
  const qualityEl = document.getElementById("connection-quality");
  if (!qualityEl || latencyHistory.length === 0) return;

  // Calcular latência média (ignorando nulos/erros)
  const validLatencies = latencyHistory.filter((v) => v !== null);
  const avgLatency =
    validLatencies.length > 0
      ? validLatencies.reduce((a, b) => a + b, 0) / validLatencies.length
      : 0;

  // Calcular perda de pacotes
  const packetLossCount = latencyHistory.filter((v) => v === null).length;
  const packetLossRate = (packetLossCount / latencyHistory.length) * 100;

  let status = "Desconhecido";
  let color = "#6c757d"; // Cinza
  let bg = "#e9ecef";

  if (validLatencies.length === 0 && latencyHistory.length > 0) {
    status = "Sem Conexão";
    color = "#721c24"; // Vermelho escuro
    bg = "#f8d7da";
  } else if (avgLatency < 100 && packetLossRate < 5) {
    status = "Excelente";
    color = "#155724"; // Verde escuro
    bg = "#d4edda";
  } else if (avgLatency < 300 && packetLossRate < 15) {
    status = "Boa";
    color = "#856404"; // Amarelo escuro
    bg = "#fff3cd";
  } else {
    status = "Ruim";
    color = "#721c24"; // Vermelho escuro
    bg = "#f8d7da";
  }

  qualityEl.textContent = `${status} (${Math.round(avgLatency)}ms | ${Math.round(packetLossRate)}% perda)`;
  qualityEl.style.color = color;
  qualityEl.style.backgroundColor = bg;
}

function startSpeedTest() {
  const btn = document.getElementById("start-speed-test-btn");
  const downloadEl = document.getElementById("speed-download");
  const uploadEl = document.getElementById("speed-upload");
  const wsUrl = document.getElementById("modal-ws-url").value;
  const token = document.getElementById("modal-token").value;

  if (!wsUrl) return;

  btn.disabled = true;
  btn.textContent = "Testando...";
  downloadEl.textContent = "Testando...";
  uploadEl.textContent = "Aguardando...";

  const ws = new WebSocket(wsUrl);
  let myId = null;
  let testRunning = false;

  ws.onopen = () => {
    // Aguarda identificação
  };

  ws.onmessage = (event) => {
    let msg;
    try {
      msg = JSON.parse(event.data);
    } catch (e) {
      return;
    }

    if (msg.type === "your-id") {
      myId = msg.id;
      // Se requer autenticação, envia token antes de testar
      if (msg.requiresAuth && token) {
        ws.send(JSON.stringify({ type: "authenticate", token: token }));
      } else if (msg.requiresAuth && !token) {
        downloadEl.textContent = "Erro: Auth";
        uploadEl.textContent = "Erro: Auth";
        ws.close();
        btn.disabled = false;
        btn.textContent = "🚀 Iniciar Teste";
      } else {
        runTestSequence();
      }
    } else if (msg.type === "authenticated") {
      runTestSequence();
    } else if (msg.type === "error") {
      console.error("Speed test error:", msg);
      downloadEl.textContent = "Erro";
      uploadEl.textContent = "Erro";
      ws.close();
      btn.disabled = false;
      btn.textContent = "🚀 Iniciar Teste";
    }
  };

  async function runTestSequence() {
    if (testRunning) return;
    testRunning = true;

    try {
      // 1. Teste de Upload
      const uploadSpeed = await performUploadTest(ws, myId);
      uploadEl.textContent = `${uploadSpeed.toFixed(2)} Mbps`;
      downloadEl.textContent = "Testando...";
      
      // Pequena pausa para estabilizar
      await new Promise(r => setTimeout(r, 500));

      // 2. Teste de Download
      const downloadSpeed = await performDownloadTest(ws, myId);
      downloadEl.textContent = `${downloadSpeed.toFixed(2)} Mbps`;

    } catch (error) {
      console.error("Speed test failed:", error);
      uploadEl.textContent = "Erro";
      downloadEl.textContent = "Erro";
    } finally {
      if (ws.readyState === WebSocket.OPEN) ws.close();
      btn.disabled = false;
      btn.textContent = "🚀 Iniciar Teste";
    }
  }

  function performUploadTest(ws, targetId) {
    return new Promise((resolve, reject) => {
      const payload = 'x'.repeat(1024 * 100); // 100KB
      const message = { type: 'upload-test', target: targetId, payload };
      const msgString = JSON.stringify(message);
      const startTime = Date.now();
      ws.send(msgString);
      let timeoutId = null;

      const interval = setInterval(() => {
        if (ws.readyState !== WebSocket.OPEN) {
          clearInterval(interval);
          return reject(new Error("Conexão fechada"));
        }
        if (ws.bufferedAmount === 0) {
          clearInterval(interval);
          if (timeoutId) clearTimeout(timeoutId);
          const duration = (Date.now() - startTime) / 1000;
          const speed = (msgString.length * 8) / (1024 * 1024) / (duration || 0.001);
          resolve(speed);
        }
      }, 10);

      // Timeout de segurança para upload (10s)
      timeoutId = setTimeout(() => {
        clearInterval(interval);
        reject(new Error("Timeout no teste de upload"));
      }, 10000);
    });
  }

  function performDownloadTest(ws, targetId) {
    return new Promise((resolve, reject) => {
      const payload = 'y'.repeat(1024 * 100); // 100KB
      const message = { type: 'download-test', target: targetId, payload };
      const startTime = Date.now();
      ws.send(JSON.stringify(message));

      const tempListener = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'download-test') {
            const duration = (Date.now() - startTime) / 1000;
            const speed = (event.data.length * 8) / (1024 * 1024) / (duration || 0.001);
            ws.removeEventListener('message', tempListener);
            resolve(speed);
          } else if (msg.type === 'error') {
            ws.removeEventListener('message', tempListener);
            reject(new Error(msg.message || "Erro do servidor"));
          }
        } catch (e) {
          // Ignora mensagens que não são JSON
        }
      };

      ws.addEventListener('message', tempListener);

      setTimeout(() => {
        ws.removeEventListener('message', tempListener);
        reject(new Error("Timeout no teste de download"));
      }, 5000);
    });
  }

  ws.onerror = () => {
    btn.disabled = false;
    btn.textContent = "Erro no Teste";
    downloadEl.textContent = "Erro";
    uploadEl.textContent = "Erro";
  };
}

async function updateLatencyComparisonChart() {
  const activeServers = servers.filter((s) => s.status === "active");
  if (activeServers.length === 0) return;

  const canvas = document.getElementById("latency-comparison-chart");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  // Ajustar resolução para o tamanho de exibição
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width;
  canvas.height = rect.height;
  const width = rect.width;
  const height = rect.height;

  // Limpar canvas e mostrar loading
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#6b7280";
  ctx.font = "14px sans-serif";
  ctx.fillText("Medindo latência...", width / 2 - 50, height / 2);

  const results = [];

  // Medir latência de cada servidor
  for (const server of activeServers) {
    const wsUrl = `${server.protocol}://${server.host}${server.port ? ":" + server.port : ""}`;
    const start = Date.now();
    try {
      const ws = new WebSocket(wsUrl);
      await new Promise((resolve) => {
        ws.onopen = () => {
          const latency = Date.now() - start;
          ws.close();
          results.push({ name: server.name, latency });
          resolve();
        };
        ws.onerror = () => {
          results.push({ name: server.name, latency: null });
          resolve();
        };
        setTimeout(() => {
          if (ws.readyState !== WebSocket.CLOSED) ws.close();
          resolve(); // Timeout
        }, 2000);
      });
    } catch (e) {
      results.push({ name: server.name, latency: null });
    }
  }

  latencyComparisonData = results;
  drawLatencyComparisonChart();
}

function drawLatencyComparisonChart(hoverIndex = -1) {
  const canvas = document.getElementById("latency-comparison-chart");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  const results = latencyComparisonData;

  ctx.clearRect(0, 0, width, height);

  if (!results || results.length === 0) return;

  const padding = 40;
  const barWidth = (width - padding * 2) / results.length - 10;
  const maxLatency = Math.max(200, ...results.map((r) => r.latency || 0));

  results.forEach((res, i) => {
    const x = padding + i * (barWidth + 10);
    const barHeight = res.latency
      ? (res.latency / maxLatency) * (height - 60)
      : 0;
    const y = height - barHeight - 20;

    // Cor base
    let color = "#ef4444";
    if (res.latency) {
      if (res.latency < 100) color = "#22c55e";
      else if (res.latency < 300) color = "#f59e0b";
    }

    // Efeito de hover
    if (i === hoverIndex) {
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.8;
    } else {
      ctx.fillStyle = color;
      ctx.globalAlpha = 1.0;
    }

    ctx.fillRect(x, y, barWidth, barHeight);
    ctx.globalAlpha = 1.0;

    ctx.fillStyle = "#374151";
    ctx.font = "10px sans-serif";
    ctx.fillText(res.name.substring(0, 10), x, height - 5);
    if (res.latency) ctx.fillText(`${res.latency}ms`, x, y - 5);
  });

  // Desenhar Tooltip
  if (hoverIndex !== -1 && results[hoverIndex]) {
    const res = results[hoverIndex];
    const x = padding + hoverIndex * (barWidth + 10);
    const barHeight = res.latency ? (res.latency / maxLatency) * (height - 60) : 0;
    const y = height - barHeight - 20;

    const text = `${res.name}: ${res.latency ? res.latency + "ms" : "Erro"}`;
    ctx.font = "12px sans-serif";
    const textWidth = ctx.measureText(text).width;
    const tooltipPadding = 8;

    let tooltipX = x + barWidth / 2 - textWidth / 2 - tooltipPadding;
    let tooltipY = y - 35;

    // Limites
    if (tooltipX < 0) tooltipX = 0;
    if (tooltipX + textWidth + tooltipPadding * 2 > width) tooltipX = width - textWidth - tooltipPadding * 2;

    ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
    ctx.fillRect(tooltipX, tooltipY, textWidth + tooltipPadding * 2, 28);

    ctx.fillStyle = "#ffffff";
    ctx.fillText(text, tooltipX + tooltipPadding, tooltipY + 18);
  }
}

// ===== COPY TO CLIPBOARD =====
function copyToClipboard(text, button) {
  navigator.clipboard.writeText(text).then(() => {
    showToast("✓ Copiado para a área de transferência!");
  });
}

function copyConnection(host, port, protocol, token, button) {
  const wsUrl = `${protocol}://${host}${port ? ":" + port : ""}`;
  const payload = token ? `${wsUrl}\nToken: ${token}` : wsUrl;

  navigator.clipboard.writeText(payload).then(() => {
    showToast("✓ Dados de conexão copiados!");
  });
}

// Helper para o modal
window.copyInput = function (elementId, button) {
  const copyText = document.getElementById(elementId);
  copyText.select();
  copyText.setSelectionRange(0, 99999);
  navigator.clipboard.writeText(copyText.value).then(() => {
    showToast("✓ Copiado!");
  });
};

function showToast(message, type = "success") {
  const toastContainer = document.getElementById("toast-container");
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;

  toastContainer.appendChild(toast);

  setTimeout(() => toast.remove(), 3000);
}

// ===== UPDATE LAST UPDATE TIME =====
function updateLastUpdate() {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");

  document.getElementById("last-update").textContent =
    `${hours}:${minutes}:${seconds}`;
}

// ===== UTILITIES =====
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function getStatusLabel(status) {
  const labels = {
    active: "Ativo",
    inactive: "Inativo",
    standby: "Standby",
  };
  return labels[status] || status;
}

function getStatusEmoji(status) {
  const emojis = {
    active: "✅",
    inactive: "❌",
    standby: "⏸️",
  };
  return emojis[status] || "❓";
}

async function hashPasswordFrontend(password) {
  const msgBuffer = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function setupPasswordToggles() {
  const passwordInputs = document.querySelectorAll('input[type="password"]');
  passwordInputs.forEach(input => {
    if (input.parentNode.querySelector('.password-toggle-icon')) return;

    const parent = input.parentElement;
    if (parent) {
      if (window.getComputedStyle(parent).position === 'static') {
        parent.style.position = 'relative';
      }

      const icon = document.createElement('span');
      icon.innerText = '👁️';
      icon.className = 'password-toggle-icon';
      icon.style.cssText = 'position: absolute; right: 10px; top: 50%; transform: translateY(-50%); cursor: pointer; user-select: none; z-index: 10; font-size: 1.2em; line-height: 1;';
      icon.title = "Mostrar/Ocultar senha";

      icon.addEventListener('click', () => {
        const isPassword = input.type === 'password';
        input.type = isPassword ? 'text' : 'password';
        icon.innerText = isPassword ? '🙈' : '👁️';
      });

      parent.appendChild(icon);
    }
  });
}
