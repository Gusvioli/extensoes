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
      } else {
        document.getElementById("login-btn").style.display = "inline-flex";
        document.getElementById("profile-btn").style.display = "none";
        document.getElementById("logout-btn").style.display = "none";
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
    payload.password = password;
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
    .then((res) => res.json())
    .then((data) => {
      servers = data.servers || [];
      renderServers();
      updateStats();
      updateCounts();
    })
    .catch((error) => {
      console.error("Erro ao carregar servidores:", error);
      document.getElementById("servers-grid").innerHTML =
        '<div class="empty-state"><p style="font-size: 2em;">❌</p><h2>Erro ao carregar servidores</h2><p>Não foi possível conectar ao servidor. Tente novamente.</p></div>';
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
  let startTime = 0;
  // Payload de 100KB para teste
  const payloadSize = 1024 * 100;
  const dataPayload = "x".repeat(payloadSize);
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
        runTest();
      }
    } else if (msg.type === "authenticated") {
      runTest();
    } else if (msg.type === "speed-test") {
      // Download completo (recebemos o eco da nossa própria mensagem)
      const endTime = Date.now();
      const totalTime = (endTime - startTime) / 1000; // segundos

      if (totalTime > 0) {
        const sizeBits = event.data.length * 8;
        // Velocidade estimada baseada no tempo total de ida e volta
        const speedMbps = (sizeBits / (1024 * 1024) / totalTime).toFixed(2);
        downloadEl.textContent = `${speedMbps} Mbps`;
      }

      ws.close();
      btn.disabled = false;
      btn.textContent = "🚀 Iniciar Teste";
    } else if (msg.type === "error") {
      console.error("Speed test error:", msg);
      downloadEl.textContent = "Erro";
      uploadEl.textContent = "Erro";
      ws.close();
      btn.disabled = false;
      btn.textContent = "🚀 Iniciar Teste";
    }
  };

  function runTest() {
    if (testRunning) return;
    testRunning = true;

    const message = {
      type: "speed-test",
      target: myId, // Envia para si mesmo (loopback)
      payload: dataPayload,
    };

    const msgString = JSON.stringify(message);
    startTime = Date.now();
    ws.send(msgString);

    // Medir Upload (tempo para limpar buffer de saída do navegador)
    const checkBuffer = setInterval(() => {
      if (ws.readyState !== WebSocket.OPEN) {
        clearInterval(checkBuffer);
        return;
      }
      if (ws.bufferedAmount === 0) {
        clearInterval(checkBuffer);
        const uploadEndTime = Date.now();
        let duration = (uploadEndTime - startTime) / 1000;
        if (duration <= 0.001) duration = 0.001; // Evitar divisão por zero

        const sizeBits = msgString.length * 8;
        const speedMbps = (sizeBits / (1024 * 1024) / duration).toFixed(2);

        uploadEl.textContent = `${speedMbps} Mbps`;
        downloadEl.textContent = "Testando...";
      }
    }, 5);
  }

  ws.onerror = () => {
    btn.disabled = false;
    btn.textContent = "Erro no Teste";
    downloadEl.textContent = "Erro";
    uploadEl.textContent = "Erro";
  };
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
