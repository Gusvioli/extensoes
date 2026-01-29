// Dashboard App - Client-side JavaScript

let servers = [];
let currentFilter = "all";
let editingServerId = null;
let authToken = null;
let currentUser = null;

// ===== UTILITY FUNCTIONS =====
function generateToken() {
  // Gera um token aleatório de 32 caracteres em hexadecimal
  return Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

// ===== INITIALIZATION =====
document.addEventListener("DOMContentLoaded", () => {
  checkAuth();
});

// ===== AUTENTICAÇÃO =====
function checkAuth() {
  const token = localStorage.getItem("auth_token");

  if (token) {
    // Verificar se token ainda é válido
    fetch(`/auth/verify?token=${token}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.valid) {
          authToken = token;
          currentUser = localStorage.getItem("user_name");
          showDashboard();
          loadServers();
          setupEventListeners();
        } else {
          showLogin();
        }
      })
      .catch(() => showLogin());
  } else {
    showLogin();
  }
}

function showLogin() {
  document.getElementById("login-modal").style.display = "block";
  document.getElementById("dashboard-container").style.display = "none";

  document.getElementById("login-form").addEventListener("submit", handleLogin);
  document.getElementById("close-login-modal").addEventListener("click", () => {
    document.getElementById("login-modal").style.display = "none";
  });
}

function showDashboard() {
  document.getElementById("login-modal").style.display = "none";
  document.getElementById("dashboard-container").style.display = "block";

  if (currentUser) {
    document.getElementById("user-info").textContent =
      `Olá, ${currentUser}! 👋`;
  }

  document.getElementById("logout-btn").addEventListener("click", handleLogout);
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
        authToken = data.token;
        currentUser = data.user.name;
        localStorage.setItem("auth_token", authToken);
        localStorage.setItem("user_name", currentUser);

        document.getElementById("login-modal").style.display = "none";
        showDashboard();
        loadServers();
        setupEventListeners();
      } else {
        document.getElementById("login-error").textContent = data.error;
        document.getElementById("login-error").style.display = "block";
      }
    });
}

function handleLogout() {
  fetch("/auth/logout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: authToken }),
  }).then(() => {
    authToken = null;
    currentUser = null;
    localStorage.removeItem("auth_token");
    localStorage.removeItem("user_name");
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

  document.getElementById("add-new-btn").addEventListener("click", () => {
    editingServerId = null;
    document.getElementById("server-form").reset();
    document.getElementById("modal-title").textContent =
      "Adicionar Novo Servidor";
    document.getElementById("server-modal").classList.add("show");
  });

  // Fechar modal ao clicar fora
  document.getElementById("server-modal").addEventListener("click", (e) => {
    if (e.target.id === "server-modal") {
      closeModal();
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

  if (filteredServers.length === 0) {
    container.style.display = "none";
    emptyState.style.display = "block";
    return;
  }

  container.style.display = "grid";
  emptyState.style.display = "none";

  container.innerHTML = filteredServers
    .map(
      (server) => `
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
                <span class="info-label">Capacidade:</span>
                <span class="info-value">${server.maxClients.toLocaleString()} clientes</span>
            </div>

            <div class="info-row">
                <span class="info-label">Token:</span>
            </div>
            <div class="token-display">
                ${server.token}
                <button class="btn btn-copy" onclick="copyToken('${server.token}')" style="margin-top: 8px;">📋 Copiar</button>
            </div>

            ${server.notes ? `<div class="info-row"><span class="info-label">Notas:</span><span class="info-value">${server.notes}</span></div>` : ""}

            <div class="info-row">
                <span class="info-label">Criado em:</span>
                <span class="info-value">${new Date(server.createdAt).toLocaleDateString("pt-BR")}</span>
            </div>

            <div class="actions">
                <a href="${server.protocol}://${server.host}:${server.port}" target="_blank" class="btn btn-primary">
                    🔗 Abrir Servidor
                </a>
                <button class="btn btn-secondary" onclick="editServer('${server.id}')">✏️ Editar</button>
                <button class="btn btn-secondary" onclick="deleteServer('${server.id}')">🗑️ Deletar</button>
            </div>
        </div>
    `,
    )
    .join("");
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
function copyToken(token) {
  navigator.clipboard.writeText(token).then(() => {
    alert("✓ Token copiado para a área de transferência!");
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
  document.getElementById("server-token").value = server.token;
  document.getElementById("server-region").value = server.region || "";
  document.getElementById("server-max-clients").value = server.maxClients;
  document.getElementById("server-status").value = server.status;
  document.getElementById("server-notes").value = server.notes || "";

  document.getElementById("modal-title").textContent = "Editar Servidor";
  document.getElementById("server-modal").classList.add("show");
}

async function saveServer(event) {
  event.preventDefault();

  const token = document.getElementById("server-token").value;
  const serverData = {
    id: editingServerId || `server-${Date.now()}`,
    name: document.getElementById("server-name").value,
    description: document.getElementById("server-description").value,
    host: document.getElementById("server-host").value,
    port: parseInt(document.getElementById("server-port").value),
    protocol: document.getElementById("server-protocol").value,
    token: token || generateToken(), // Gera token automaticamente se vazio
    region: document.getElementById("server-region").value,
    maxClients: parseInt(document.getElementById("server-max-clients").value),
    status: document.getElementById("server-status").value,
    notes: document.getElementById("server-notes").value,
    createdAt: editingServerId
      ? servers.find((s) => s.id === editingServerId).createdAt
      : new Date().toISOString(),
  };

  try {
    const method = editingServerId ? "PUT" : "POST";
    const response = await fetch(`/api/servers?token=${authToken}`, {
      method: method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(serverData),
    });

    if (response.status === 401) {
      alert("Sessão expirada. Faça login novamente.");
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

      const msg = document.getElementById("success-msg");
      msg.classList.add("show");
      setTimeout(() => {
        msg.classList.remove("show");
        closeModal();
      }, 1500);
    }
  } catch (error) {
    console.error("Erro ao salvar servidor:", error);
    alert("Erro ao salvar servidor");
  }
}

async function deleteServer(id) {
  if (!confirm("Tem certeza que deseja deletar este servidor?")) return;

  try {
    const response = await fetch(`/api/servers?token=${authToken}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });

    if (response.status === 401) {
      alert("Sessão expirada. Faça login novamente.");
      showLogin();
      return;
    }

    if (response.ok) {
      servers = servers.filter((s) => s.id !== id);
      renderServers();
      updateStats();
    }
  } catch (error) {
    console.error("Erro ao deletar servidor:", error);
    alert("Erro ao deletar servidor");
  }
}

// ===== MODAL =====
function closeModal() {
  document.getElementById("server-modal").classList.remove("show");
}
