// View App - Visualização pública de servidores (sem autenticação)
// Usa config.js para URLs dinâmicas (API_BASE e WS_BASE)

let servers = [];
let currentFilter = "all";
let searchTerm = "";
let currentViewMode = localStorage.getItem("publicViewMode") || "grid";
let currentSort = "name";

// ===== INITIALIZATION =====
document.addEventListener("DOMContentLoaded", () => {
  loadServers();
  setupEventListeners();
  updateLastUpdate();
  setInterval(updateLastUpdate, 60000); // Atualizar a cada minuto
  setInterval(loadServers, 5000); // Atualizar lista a cada 5 segundos

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

    // Event Listeners do Modal
    const modal = document.getElementById("connect-modal");
    const closeBtns = document.querySelectorAll(
      ".close-modal, .close-modal-btn",
    );

    closeBtns.forEach((btn) => {
      btn.onclick = () => modal.classList.remove("show");
    });

    window.onclick = (event) => {
      if (event.target == modal) {
        modal.classList.remove("show");
      }
    };
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

    document.getElementById("view-search").addEventListener("input", (e) => {
      searchTerm = e.target.value.toLowerCase();
      renderServers();
    });

    document.getElementById("view-sort").addEventListener("change", (e) => {
      currentSort = e.target.value;
      renderServers();
    });

    document.getElementById("view-toggle-btn").addEventListener("click", () => {
      currentViewMode = currentViewMode === "grid" ? "list" : "grid";
      localStorage.setItem("publicViewMode", currentViewMode);
      document.getElementById("view-toggle-btn").innerHTML =
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
});

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
    container.style.display = "flex";
  } else {
    container.className = "servers-grid";
    container.style.display = "grid";
  }

  container.innerHTML = displayServers
    .map((server) => {
      if (currentViewMode === "list") {
        return `
            <div class="server-list-item ${server.status}">
                <div style="display:flex; align-items:center; gap:15px;">
                    <span class="status-badge ${server.status}" style="margin:0; padding:4px 8px; font-size:0.8rem;">
                        ${getStatusEmoji(server.status)}
                    </span>
                    <div style="text-align:left;">
                        <h3 class="server-name" style="font-size:1.1rem; margin:0;">${escapeHtml(server.name)}</h3>
                        <div style="font-size:0.85rem; color:var(--text-muted); font-family:'Roboto Mono', monospace;">${escapeHtml(server.host)}${server.port ? ":" + server.port : ""}</div>
                    </div>
                </div>

                <div style="text-align:center;">
                    <span class="protocol-value" style="font-size:0.9rem;">${server.protocol}</span>
                    <div style="font-size:0.8rem; color:var(--text-muted);">${escapeHtml(server.region || "N/A")}</div>
                </div>

                <div style="text-align:center;">
                    <span class="info-value" style="font-size:0.9rem;">
                        <strong>${server.clientsCount !== undefined ? server.clientsCount : 0}</strong> / ${server.maxClients}
                    </span>
                    <div style="font-size:0.8rem; color:var(--text-muted);">Clientes</div>
                </div>

                <div class="server-actions">
                    <button class="btn-connect" onclick="connectToServer('${escapeHtml(server.host)}', ${server.port}, '${server.protocol}', '${escapeHtml(server.name)}', '${escapeHtml(server.token || "")}')" title="Conectar">🔗</button>
                    <button class="btn-copy" onclick="copyToClipboard('${escapeHtml(server.host)}:${server.port}', this)" title="Copiar Host">📍</button>
                </div>
            </div>`;
      }

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
            ? `<div style="background: #fff; padding: 15px; margin: 15px 0; border: 2px solid var(--border); border-radius: var(--radius-sm); box-shadow: var(--shadow-sm);">
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

// ===== COPY TO CLIPBOARD =====
function copyToClipboard(text, button) {
  navigator.clipboard.writeText(text).then(() => {
    const originalText = button.textContent;
    button.textContent = "✅ Copiado!";
    button.style.background = "var(--success)";

    setTimeout(() => {
      button.textContent = originalText;
      button.style.background = "";
    }, 2000);
  });
}

function copyConnection(host, port, protocol, token, button) {
  const wsUrl = `${protocol}://${host}${port ? ":" + port : ""}`;
  const payload = token ? `${wsUrl}\nToken: ${token}` : wsUrl;

  navigator.clipboard.writeText(payload).then(() => {
    const originalText = button.textContent;
    button.textContent = "✅ Copiado!";
    button.style.background = "var(--primary)";

    setTimeout(() => {
      button.textContent = originalText;
      button.style.background = "";
    }, 2000);
  });
}

// Helper para o modal
window.copyInput = function (elementId, button) {
  const copyText = document.getElementById(elementId);
  copyText.select();
  copyText.setSelectionRange(0, 99999);
  navigator.clipboard.writeText(copyText.value).then(() => {
    const originalText = button.innerText;
    button.innerText = "Copiado!";
    setTimeout(() => (button.innerText = originalText), 1500);
  });
};

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
