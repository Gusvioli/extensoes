// View App - Visualização pública de servidores (sem autenticação)
// Usa config.js para URLs dinâmicas (API_BASE e WS_BASE)

let servers = [];
let currentFilter = "all";
let searchTerm = "";
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
      <div id="connect-modal" class="modal" style="display: none; position: fixed; z-index: 1000; left: 0; top: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.5); align-items: center; justify-content: center;">
        <div class="modal-content" style="background-color: #fefefe; padding: 20px; border-radius: 8px; width: 90%; max-width: 500px; position: relative; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <span class="close-modal" style="position: absolute; top: 10px; right: 15px; font-size: 24px; font-weight: bold; cursor: pointer;">&times;</span>
          <h2 style="margin-top: 0; color: #2c3e50;">🔗 Dados de Conexão</h2>
          <p style="color: #666; margin-bottom: 15px;">Copie os dados abaixo para usar na sua extensão ou aplicação.</p>
          
          <div style="margin-bottom: 15px;">
            <label style="display: block; font-weight: bold; margin-bottom: 5px;">Nome do Servidor:</label>
            <input type="text" id="modal-server-name" readonly style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; background: #f9f9f9;">
          </div>

          <div style="margin-bottom: 15px;">
            <label style="display: block; font-weight: bold; margin-bottom: 5px;">URL WebSocket:</label>
            <div style="display: flex; gap: 5px;">
              <input type="text" id="modal-ws-url" readonly style="flex-grow: 1; padding: 8px; border: 1px solid #ddd; border-radius: 4px; background: #f9f9f9;">
              <button onclick="copyInput('modal-ws-url', this)" style="padding: 8px 12px; cursor: pointer; background: #3498db; color: white; border: none; border-radius: 4px;">Copiar</button>
            </div>
          </div>

          <div id="modal-token-group" style="margin-bottom: 20px;">
            <label style="display: block; font-weight: bold; margin-bottom: 5px;">Token de Autenticação:</label>
            <div style="display: flex; gap: 5px;">
              <input type="text" id="modal-token" readonly style="flex-grow: 1; padding: 8px; border: 1px solid #ddd; border-radius: 4px; background: #f9f9f9; font-family: monospace;">
              <button onclick="copyInput('modal-token', this)" style="padding: 8px 12px; cursor: pointer; background: #27ae60; color: white; border: none; border-radius: 4px;">Copiar</button>
            </div>
          </div>

          <div style="text-align: right;">
            <button class="close-modal-btn" style="padding: 8px 16px; cursor: pointer; background: #95a5a6; color: white; border: none; border-radius: 4px;">Fechar</button>
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
      btn.onclick = () => (modal.style.display = "none");
    });

    window.onclick = (event) => {
      if (event.target == modal) {
        modal.style.display = "none";
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
        '<div class="empty-state" style="grid-column: 1/-1;"><p style="font-size: 2em;">❌</p><h2>Erro ao carregar servidores</h2><p>Não foi possível conectar ao servidor. Tente novamente.</p></div>';
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
    container.innerHTML = `<div class="empty-state" style="grid-column: 1/-1;">
        <p style="font-size: 2em;">📭</p>
        <h2>Nenhum servidor encontrado</h2>
        <p>Não há servidores com o filtro selecionado</p>
      </div>`;
    return;
  }

  container.innerHTML = displayServers
    .map(
      (server) => `
    <div class="server-card ${server.status}">
      <div class="server-header">
        <div>
          <h3>${escapeHtml(server.name)}</h3>
          <p style="margin: 0; font-size: 0.85em; color: #7f8c8d;">${escapeHtml(server.description || "Sem descrição")}</p>
        </div>
        <span class="status-badge ${server.status}">
          ${getStatusEmoji(server.status)} ${getStatusLabel(server.status)}
        </span>
      </div>

      <div class="server-info">
        <p>
          <strong>📍 Host:</strong>
          <span class="info-value"><code>${escapeHtml(server.host)}</code></span>
        </p>
        <p>
          <strong>🔌 Porta:</strong>
          <span class="info-value">${server.port}</span>
        </p>
        <p>
          <strong>📡 Protocolo:</strong>
          <span class="info-value"><code>${server.protocol}</code></span>
        </p>
        ${
          server.region
            ? `<p>
          <strong>🌍 Região:</strong>
          <span class="info-value">${escapeHtml(server.region)}</span>
        </p>`
            : ""
        }
        ${
          server.maxClients
            ? `<p>
          <strong>👥 Clientes:</strong>
          <span class="info-value"><strong>${server.clientsCount !== undefined ? server.clientsCount : 0}</strong> / ${server.maxClients}</span>
        </p>`
            : ""
        }
        <p>
          <strong>🔐 Autenticação:</strong>
          <span class="info-value">${
            server.requiresAuth === true
              ? "🔒 Obrigatória"
              : server.requiresAuth === false
                ? "🔓 Opcional"
                : "❓ Desconhecido"
          }</span>
        </p>
      </div>

      ${
        server.token &&
        server.requiresAuth !== undefined &&
        server.requiresAuth !== null
          ? `<div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 15px 0;">
        <p style="margin: 0 0 8px 0; font-size: 0.9em; font-weight: bold; color: #2c3e50;">
          🔑 Token de Acesso:
        </p>
        <div class="token-display" onclick="copyToClipboard('${escapeHtml(server.token)}', this)" title="Clique para copiar o token completo" style="cursor: pointer; padding: 10px; background: white; border: 1px solid #ddd; border-radius: 4px; font-family: monospace; word-break: break-all; font-size: 0.85em;">
          <code>${escapeHtml(server.token)}</code>
        </div>
        <p style="margin: 8px 0 0 0; font-size: 0.8em; color: #7f8c8d;">
          💡 Clique acima para copiar o token e usar na extensão
        </p>
      </div>`
          : server.requiresAuth !== undefined && server.requiresAuth !== null
            ? `<div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #f39c12;">
        <p style="margin: 0; font-size: 0.9em; color: #856404;">
          ⚠️ Token não configurado para este servidor
        </p>
      </div>`
            : ""
      }

      <div class="server-actions">
        <button class="btn-connect" onclick="connectToServer('${escapeHtml(
          server.host,
        )}', ${server.port}, '${escapeHtml(server.name)}', '${escapeHtml(
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
        )}', ${server.port}, '${escapeHtml(server.token || "")}', this)" title="Copiar ws://host:porta + token">
          🔐 Conexão
        </button>
      </div>
    </div>
  `,
    )
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
      countElement.textContent = count;
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
function connectToServer(host, port, serverName, token) {
  // Usar a URL base configurada ou construir baseada no host do servidor clicado
  // Se o servidor clicado for diferente do atual, talvez devêssemos usar o host dele?
  // Por enquanto, mantendo a lógica original que usa WS_BASE global,
  // mas idealmente deveria ser `ws://${host}:${port}` se não estiver usando proxy reverso.

  const wsUrl = window.APP_CONFIG.WS_BASE;

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
  modal.style.display = "flex";
}

// ===== COPY TO CLIPBOARD =====
function copyToClipboard(text, button) {
  navigator.clipboard.writeText(text).then(() => {
    const originalText = button.textContent;
    button.textContent = "✅ Copiado!";
    button.style.background = "#27ae60";

    setTimeout(() => {
      button.textContent = originalText;
      button.style.background = "";
    }, 2000);
  });
}

function copyConnection(host, port, token, button) {
  const wsUrl = `${window.APP_CONFIG.WS_BASE}`;
  const payload = token ? `${wsUrl}\nToken: ${token}` : wsUrl;

  navigator.clipboard.writeText(payload).then(() => {
    const originalText = button.textContent;
    button.textContent = "✅ Copiado!";
    button.style.background = "#3498db";

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
