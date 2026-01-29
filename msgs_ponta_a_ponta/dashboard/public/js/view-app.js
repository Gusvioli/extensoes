// View App - Visualização pública de servidores (sem autenticação)
// Usa config.js para URLs dinâmicas (API_BASE e WS_BASE)

let servers = [];
let currentFilter = "all";

// ===== INITIALIZATION =====
document.addEventListener("DOMContentLoaded", () => {
  loadServers();
  setupEventListeners();
  updateLastUpdate();
  setInterval(updateLastUpdate, 60000); // Atualizar a cada minuto
});

// ===== LOAD SERVERS =====
function loadServers() {
  // Solicita servidores públicos ativos (com tokens para copiar)
  const apiUrl = `${window.APP_CONFIG.API_BASE}/api/public-servers?status=active`;
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

  if (filtered.length === 0) {
    container.innerHTML = `<div class="empty-state" style="grid-column: 1/-1;">
        <p style="font-size: 2em;">📭</p>
        <h2>Nenhum servidor encontrado</h2>
        <p>Não há servidores com o filtro selecionado</p>
      </div>`;
    return;
  }

  container.innerHTML = filtered
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
          <strong>👥 Max Clientes:</strong>
          <span class="info-value">${server.maxClients}</span>
        </p>`
            : ""
        }
      </div>

      ${
        server.token
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
          : `<div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #f39c12;">
        <p style="margin: 0; font-size: 0.9em; color: #856404;">
          ⚠️ Token não configurado para este servidor
        </p>
      </div>`
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
        <button class="btn-copy btn-edit" onclick="editServer('${escapeHtml(
          server.id,
        )}')" title="Editar servidor (requer token admin)">
          ✏️ Editar
        </button>
      </div>
    </div>
  `,
    )
    .join("");
}

// ===== EDIT SERVER (via prompt + token admin) =====
function editServer(id) {
  const server = servers.find((s) => s.id === id);
  if (!server) return alert("Servidor não encontrado");

  const adminToken = prompt(
    "Token de admin para editar este servidor (cancelar para sair):",
  );
  if (!adminToken) return;

  // Solicita campos (simples, via prompt para evitar UI complexa)
  const name = prompt("Nome do servidor:", server.name) || server.name;
  const host = prompt("Host:", server.host) || server.host;
  const portRaw = prompt("Porta:", server.port);
  const port = parseInt(portRaw, 10) || server.port;
  const protocol =
    prompt("Protocolo (ws/wss):", server.protocol) || server.protocol;
  const region =
    prompt("Região (opcional):", server.region || "") || server.region;
  const maxClientsRaw = prompt(
    "Max clientes (opcional):",
    server.maxClients || "",
  );
  const maxClients = maxClientsRaw
    ? parseInt(maxClientsRaw, 10)
    : server.maxClients;
  const status =
    prompt("Status (active/inactive/standby):", server.status) || server.status;

  const updated = {
    ...server,
    name,
    host,
    port,
    protocol,
    region,
    maxClients,
    status,
  };

  if (!updated.id) return alert("Servidor sem ID, impossível editar");

  const editUrl = `${window.APP_CONFIG.API_BASE}/api/servers?token=${encodeURIComponent(adminToken)}`;
  fetch(editUrl, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updated),
  })
    .then((res) => {
      if (!res.ok) throw new Error(`Status ${res.status}`);
      return res.json();
    })
    .then((json) => {
      alert("Servidor atualizado com sucesso");
      loadServers();
    })
    .catch((err) => {
      console.error("Erro ao atualizar servidor:", err);
      alert("Falha ao atualizar servidor. Verifique token e permissões.");
    });
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
  const wsUrl = `${window.APP_CONFIG.WS_BASE}`;
  const tokenText = token ? `\n\n🔑 Token: ${token}` : "";
  alert(
    `🔗 Endereço de Conexão: ${wsUrl}${tokenText}\n\nNome do Servidor: ${serverName}\n\nCopie esse endereço e use em sua aplicação/na extensão para conectar a este servidor de sinalização.`,
  );
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
