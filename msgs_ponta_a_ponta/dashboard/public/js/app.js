// Dashboard App - Client-side JavaScript

let servers = [];
let currentFilter = "all";
let searchTerm = "";
let currentViewMode = localStorage.getItem("adminViewMode") || "grid";
let currentSort = "name";
let editingServerId = null;
let currentUser = null; // Armazenará o objeto do usuário: { name, username, role }
let loadServersInterval = null;
let refreshInterval = parseInt(
  localStorage.getItem("refresh_interval") || "30000",
);

// URL Base da API (Fallback para localhost se config.js não carregar)
const API_BASE =
  (window.APP_CONFIG && window.APP_CONFIG.API_BASE) || "http://localhost:3000";

function getAuthHeaders() {
  const headers = { "Content-Type": "application/json" };
  const token = localStorage.getItem("auth_token");
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

// ===== UTILITY FUNCTIONS =====
function generateToken() {
  // Gera um token aleatório de 32 caracteres em hexadecimal
  return Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function escapeHtml(text) {
  if (text === null || text === undefined) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

async function hashPasswordFrontend(password) {
  const msgBuffer = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function setupPasswordToggles() {
  const passwordInputs = document.querySelectorAll('input[type="password"]');
  passwordInputs.forEach((input) => {
    if (input.parentElement.classList.contains("password-input-wrapper"))
      return;
    if (input.parentNode.querySelector(".password-toggle-icon")) return;

    // Criar wrapper para isolar o input e garantir centralização correta
    const wrapper = document.createElement("div");
    wrapper.className = "password-input-wrapper";
    wrapper.style.position = "relative";
    wrapper.style.width = "100%";

    input.parentNode.insertBefore(wrapper, input);
    wrapper.appendChild(input);

    const icon = document.createElement("span");
    icon.innerText = "👁️";
    icon.className = "password-toggle-icon";
    icon.style.cssText =
      "position: absolute; right: 10px; top: 50%; transform: translateY(-50%); cursor: pointer; user-select: none; z-index: 10; font-size: 1.2em; line-height: 1;";
    icon.title = "Mostrar/Ocultar senha";

    icon.addEventListener("click", () => {
      const isPassword = input.type === "password";
      input.type = isPassword ? "text" : "password";
      icon.innerText = isPassword ? "🙈" : "👁️";
    });

    wrapper.appendChild(icon);
  });
}

function injectSignupConfirmField() {
  const passwordInput = document.getElementById("signup-password");
  // Verifica se o campo de senha existe e se o de confirmação ainda não foi criado
  if (passwordInput && !document.getElementById("signup-confirm-password")) {
    const wrapper = document.createElement("div");
    wrapper.className = "form-group";
    wrapper.style.marginTop = "15px";

    const label = document.createElement("label");
    label.textContent = "Confirmar Senha";
    label.style.display = "block";
    label.style.marginBottom = "5px";

    const input = document.createElement("input");
    input.type = "password";
    input.id = "signup-confirm-password";
    input.style.width = "100%";
    input.className = passwordInput.className; // Herda classes para manter estilo

    wrapper.appendChild(label);
    wrapper.appendChild(input);

    // Insere após o container do input de senha (assumindo que passwordInput está num wrapper ou div)
    // Se o pai for o form, insere depois. Se o pai for um wrapper (criado pelo toggle), insere depois do wrapper.
    let targetNode = passwordInput;
    if (
      passwordInput.parentElement.classList.contains("password-input-wrapper")
    ) {
      targetNode = passwordInput.parentElement.parentElement; // Sobe para o form-group
    } else if (passwordInput.parentElement.tagName === "DIV") {
      targetNode = passwordInput.parentElement;
    }

    if (targetNode && targetNode.parentNode) {
      targetNode.parentNode.insertBefore(wrapper, targetNode.nextSibling);
    }
  }
}

function injectForgotPasswordLink() {
  const loginPasswordInput = document.getElementById("login-password");
  // Verifica se o campo existe e se o link ainda não foi criado
  if (loginPasswordInput && !document.getElementById("forgot-password-link")) {
    const link = document.createElement("a");
    link.href = "#";
    link.id = "forgot-password-link";
    link.textContent = "Esqueci minha senha";
    link.style.cssText =
      "display: block; text-align: right; font-size: 0.85em; margin-top: 5px; color: #667eea; text-decoration: none; cursor: pointer;";

    link.addEventListener("click", (e) => {
      e.preventDefault();
      showToast(
        "Entre em contato com o administrador para redefinir sua senha.",
        "info",
      );
    });

    // Inserir após o campo de senha (considerando o wrapper do toggle de senha)
    let targetNode = loginPasswordInput;
    if (
      loginPasswordInput.parentElement.classList.contains(
        "password-input-wrapper",
      )
    ) {
      targetNode = loginPasswordInput.parentElement;
    }

    if (targetNode && targetNode.parentNode) {
      targetNode.parentNode.insertBefore(link, targetNode.nextSibling);
    }
  }
}

function injectSignupEmailField() {
  const nameInput = document.getElementById("signup-name");
  if (nameInput && !document.getElementById("signup-email")) {
    const wrapper = document.createElement("div");
    wrapper.className = "form-group";
    wrapper.style.marginTop = "15px";

    const label = document.createElement("label");
    label.textContent = "E-mail";
    label.style.display = "block";
    label.style.marginBottom = "5px";

    const input = document.createElement("input");
    input.type = "email";
    input.id = "signup-email";
    input.style.width = "100%";
    input.className = nameInput.className;

    wrapper.appendChild(label);
    wrapper.appendChild(input);

    if (nameInput.parentNode) {
      nameInput.parentNode.insertBefore(wrapper, nameInput.nextSibling);
    }
  }
}

function injectVerificationModal() {
  if (document.getElementById("verification-modal")) return;

  const modalHTML = `
    <div id="verification-modal" class="modal">
      <div class="modal-content" style="max-width: 400px; text-align: center;">
        <h2 style="margin-bottom: 15px;">Verifique seu E-mail 📧</h2>
        <p style="margin-bottom: 20px; color: #666;">Enviamos um código de 6 dígitos para o seu e-mail.</p>
        
        <div class="form-group">
          <input type="text" id="verify-code-input" class="form-control" placeholder="000000" maxlength="6" style="text-align: center; font-size: 1.5em; letter-spacing: 5px;">
        </div>
        
        <div id="verify-error" class="alert-box error" style="display: none; margin-top: 10px;"></div>

        <button id="verify-submit-btn" class="btn-primary" style="width: 100%; margin-top: 20px;">Verificar Código</button>
        <button id="verify-cancel-btn" class="btn-secondary" style="width: 100%; margin-top: 10px; background: transparent; color: #666;">Cancelar</button>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML("beforeend", modalHTML);

  // Event Listeners
  document.getElementById("verify-cancel-btn").addEventListener("click", () => {
    document.getElementById("verification-modal").classList.remove("show");
  });
}

function openVerificationModal(email) {
  injectVerificationModal();
  const modal = document.getElementById("verification-modal");
  const input = document.getElementById("verify-code-input");
  const btn = document.getElementById("verify-submit-btn");
  const errorBox = document.getElementById("verify-error");

  input.value = "";
  errorBox.style.display = "none";
  modal.classList.add("show");
  input.focus();

  // Remover listeners antigos clonando o botão
  const newBtn = btn.cloneNode(true);
  btn.parentNode.replaceChild(newBtn, btn);

  newBtn.addEventListener("click", () => {
    const code = input.value.trim();
    if (code.length !== 6) {
      errorBox.textContent = "O código deve ter 6 dígitos.";
      errorBox.style.display = "block";
      return;
    }

    newBtn.disabled = true;
    newBtn.textContent = "Verificando...";

    fetch("/auth/verify-code", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code }),
    })
      .then((res) => res.json())
      .then((data) => {
        newBtn.disabled = false;
        newBtn.textContent = "Verificar Código";

        if (data.success) {
          modal.classList.remove("show");
          showToast("E-mail verificado com sucesso! Faça login.", "success");

          // Ir para tela de login
          const loginContainer = document.getElementById("login-container");
          const signupContainer = document.getElementById("signup-container");
          if (signupContainer) signupContainer.style.display = "none";
          if (loginContainer) loginContainer.style.display = "block";

          // Preencher usuário no login se possível (não temos o username aqui, mas o usuário pode digitar)
          document.getElementById("login-password").focus();
        } else {
          errorBox.textContent = data.error || "Código inválido.";
          errorBox.style.display = "block";
        }
      })
      .catch(() => {
        newBtn.disabled = false;
        newBtn.textContent = "Verificar Código";
        errorBox.textContent = "Erro de conexão.";
        errorBox.style.display = "block";
      });
  });
}

function injectSignupClearButton() {
  const form = document.getElementById("signup-form");
  if (form && !document.getElementById("signup-clear-btn")) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.id = "signup-clear-btn";
    btn.textContent = "Limpar Formulário";
    btn.style.cssText =
      "width: 100%; padding: 10px; margin-top: 10px; background-color: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; transition: background 0.3s;";

    btn.onmouseover = () => (btn.style.backgroundColor = "#5a6268");
    btn.onmouseout = () => (btn.style.backgroundColor = "#6c757d");

    btn.addEventListener("click", () => {
      form.reset();
      const errorEl = document.getElementById("signup-error");
      if (errorEl) errorEl.style.display = "none";

      // Resetar visibilidade de senhas e ícones
      const passwordInputs = form.querySelectorAll("input");
      passwordInputs.forEach((input) => {
        if (input.id.includes("password")) {
          input.type = "password";
          const wrapper = input.parentElement;
          if (wrapper && wrapper.classList.contains("password-input-wrapper")) {
            const icon = wrapper.querySelector(".password-toggle-icon");
            if (icon) icon.innerText = "👁️";
          }
        }
      });

      // Resetar medidores de força
      const meters = form.querySelectorAll(".password-strength-meter");
      meters.forEach((meter) => {
        meter.style.width = "0%";
        meter.style.backgroundColor = "#e9ecef";
      });
    });

    form.appendChild(btn);
  }
}

function setupPasswordStrengthMeters() {
  const passwordInputs = document.querySelectorAll('input[type="password"]');
  passwordInputs.forEach((input) => {
    // Ignorar login e confirmação de senha
    if (input.id.includes("login") || input.id.includes("confirm")) return;
    if (input.dataset.strengthMeter) return;

    input.dataset.strengthMeter = "true";

    const meter = document.createElement("div");
    meter.className = "password-strength-meter";
    meter.style.height = "4px";
    meter.style.marginTop = "4px";
    meter.style.borderRadius = "2px";
    meter.style.transition = "width 0.3s ease-in-out, background-color 0.3s";
    meter.style.width = "0%";
    meter.style.backgroundColor = "#e9ecef";

    // Inserir após o wrapper do input (criado pelo toggle) ou após o input
    let referenceElement = input;
    if (input.parentElement.classList.contains("password-input-wrapper")) {
      referenceElement = input.parentElement;
    }

    if (referenceElement.parentNode) {
      referenceElement.parentNode.insertBefore(
        meter,
        referenceElement.nextSibling,
      );
    }

    input.addEventListener("input", () => {
      const val = input.value;
      if (!val) {
        meter.style.width = "0%";
        return;
      }

      let score = 0;
      if (val.length >= 8) score++;
      if (val.length >= 12) score++;
      if (/[A-Z]/.test(val)) score++;
      if (/[0-9]/.test(val)) score++;
      if (/[^A-Za-z0-9]/.test(val)) score++;

      let color = "#dc3545"; // Fraca (Vermelho)
      let width = "30%";

      if (score >= 4) {
        color = "#28a745"; // Forte (Verde)
        width = "100%";
      } else if (score >= 2) {
        color = "#ffc107"; // Média (Amarelo)
        width = "60%";
      }

      meter.style.backgroundColor = color;
      meter.style.width = width;
    });
  });
}

function injectToastStyles() {
  const style = document.createElement("style");
  style.textContent = `
    #toast-container {
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 10000;
      pointer-events: none;
    }
    .toast {
      background-color: #333;
      color: #fff;
      padding: 12px 20px;
      margin-bottom: 10px;
      border-radius: 4px;
      box-shadow: 0 2px 5px rgba(0,0,0,0.2);
      opacity: 0.95;
      pointer-events: auto;
      min-width: 250px;
    }
    .toast.success { background-color: #28a745; }
    .toast.error { background-color: #dc3545; }
    .toast.info { background-color: #17a2b8; }
  `;
  document.head.appendChild(style);
}

// ===== INITIALIZATION =====
document.addEventListener("DOMContentLoaded", () => {
  // Adicionar elementos de UI dinâmicos ao corpo do documento

  // Carregar CSS de componentes (substitui injeção JS)
  if (!document.querySelector('link[href="css/components.css"]')) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "css/components.css";
    document.head.appendChild(link);
  }

  injectToastStyles();
  injectSignupConfirmField();
  injectSignupEmailField();
  injectForgotPasswordLink();
  injectSignupClearButton();

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

  // Listener para toggle de visualização
  const viewToggleBtn = document.getElementById("view-toggle-btn");
  if (viewToggleBtn) {
    // Definir estado inicial
    viewToggleBtn.innerHTML =
      currentViewMode === "grid" ? "🔲 Grid" : "☰ Lista";

    viewToggleBtn.addEventListener("click", () => {
      currentViewMode = currentViewMode === "grid" ? "list" : "grid";
      localStorage.setItem("adminViewMode", currentViewMode);
      viewToggleBtn.innerHTML =
        currentViewMode === "grid" ? "🔲 Grid" : "☰ Lista";
      renderServers();
    });
  }

  // Event Delegation for Login/Signup Modal
  const loginModal = document.getElementById("login-modal");
  if (loginModal) {
    loginModal.addEventListener("click", (e) => {
      // Toggle between Login and Signup
      if (e.target.id === "show-signup") {
        e.preventDefault();
        document.getElementById("login-container").style.display = "none";
        document.getElementById("signup-container").style.display = "block";
        document.getElementById("signup-form").reset();
        document.getElementById("signup-error").style.display = "none";
      }
      if (e.target.id === "show-login") {
        e.preventDefault();
        document.getElementById("signup-container").style.display = "none";
        document.getElementById("login-container").style.display = "block";
        document.getElementById("login-form").reset();
        document.getElementById("login-error").style.display = "none";
      }
    });

    // Handle form submissions using delegation
    loginModal.addEventListener("submit", (e) => {
      if (e.target.id === "login-form") {
        handleLogin(e);
      }
      if (e.target.id === "signup-form") {
        handleSignup(e);
      }
    });
  }

  checkAuth();
  setupPasswordToggles();
  // Re-executar setupPasswordToggles após injetar o campo de confirmação
  setTimeout(setupPasswordToggles, 100);
  setTimeout(setupPasswordStrengthMeters, 100);
});

// ===== AUTENTICAÇÃO =====
function checkAuth() {
  // O cookie HttpOnly é enviado automaticamente. Apenas verificamos a sessão.
  fetch(`${API_BASE}/auth/verify`, {
    credentials: "include",
    headers: getAuthHeaders(),
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.valid) {
        currentUser = data.user;
        localStorage.setItem("user_info", JSON.stringify(currentUser));

        // Redirecionar usuários comuns para view.html se estiverem no index.html
        if (currentUser.role === "user") {
          window.location.href = "/view.html";
        } else {
          showDashboard();
          loadServers();
          setupEventListeners();
          // Atualizar lista de servidores a cada 5 segundos
          if (loadServersInterval) clearInterval(loadServersInterval);
          loadServersInterval = setInterval(loadServers, refreshInterval);
        }
      } else {
        showLogin();
      }
    })
    .catch(() => showLogin());
}

function showLogin() {
  const loginModal = document.getElementById("login-modal");
  const dashboardContainer = document.getElementById("dashboard-container");

  if (loginModal) {
    loginModal.classList.add("show");
    loginModal.style.display = ""; // Limpar estilos inline para garantir que a classe CSS funcione
  }
  if (dashboardContainer) dashboardContainer.style.display = "none";

  // Reset form states and visibility
  const loginForm = document.getElementById("login-form");
  if (loginForm) loginForm.reset();
  const signupForm = document.getElementById("signup-form");
  if (signupForm) signupForm.reset();

  const loginError = document.getElementById("login-error");
  if (loginError) loginError.style.display = "none";
  const signupError = document.getElementById("signup-error");
  if (signupError) signupError.style.display = "none";

  // Ensure login form is visible and signup is hidden
  const loginContainer = document.getElementById("login-container");
  const signupContainer = document.getElementById("signup-container");
  if (loginContainer) loginContainer.style.display = "block";
  if (signupContainer) signupContainer.style.display = "none";
}

function showDashboard() {
  document.getElementById("login-modal").classList.remove("show");
  const dashboardContainer = document.getElementById("dashboard-container");
  if (dashboardContainer) dashboardContainer.style.display = "";

  if (currentUser) {
    const userInfo = document.getElementById("user-info");
    if (userInfo) {
      userInfo.textContent = `Olá, ${currentUser.name}! 👋`;
    }

    // Show settings button if admin or gerente
    if (currentUser.role === "admin" || currentUser.role === "gerente") {
      const settingsBtn = document.getElementById("settings-btn");
      if (settingsBtn) settingsBtn.style.display = "inline-flex";

      // Injetar botão de Usuários se não existir
      if (!document.getElementById("users-btn")) {
        const usersBtn = document.createElement("a");
        usersBtn.id = "users-btn";
        usersBtn.className = "btn-secondary";
        usersBtn.innerHTML = "👥 Usuários";
        usersBtn.href = "/users.html";
        usersBtn.style.cssText =
          "margin-left: 10px; font-size: 14px; padding: 8px 12px; display: inline-flex; align-items: center; text-decoration: none; color: white;";

        const headerTitle = document.querySelector("header h1");
        if (headerTitle) headerTitle.appendChild(usersBtn);
      }
    }
  }

  const profileBtn = document.getElementById("profile-btn");
  if (profileBtn) {
    profileBtn.style.display = "inline-flex";
    profileBtn.onclick = openProfileModal;
  }

  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    logoutBtn.style.display = "inline-flex";
    // Adiciona listener (clonando para limpar anteriores)
    logoutBtn.onclick = handleLogout;
  }
}

async function handleLogin(e) {
  e.preventDefault();

  const username = document.getElementById("login-username").value;
  const passwordRaw = document.getElementById("login-password").value;
  const password = passwordRaw;

  fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.success) {
        currentUser = data.user;
        localStorage.setItem("user_info", JSON.stringify(currentUser));
        if (data.token) localStorage.setItem("auth_token", data.token);

        if (currentUser.role === "user") {
          window.location.href = "/view.html";
        } else {
          showDashboard(); // Admins/Gerentes ficam no dashboard
          loadServers();
          setupEventListeners();
          if (loadServersInterval) clearInterval(loadServersInterval);
          loadServersInterval = setInterval(loadServers, refreshInterval);
        }
      } else {
        document.getElementById("login-error").textContent = data.error;
        document.getElementById("login-error").style.display = "block";
        // A classe .alert-box já cuida do estilo
      }
    });
}

async function handleSignup(e) {
  e.preventDefault();

  const name = document.getElementById("signup-name").value;
  const email = document.getElementById("signup-email")
    ? document.getElementById("signup-email").value
    : "";
  const username = document.getElementById("signup-username").value;
  const passwordRaw = document.getElementById("signup-password").value;
  const confirmPasswordInput = document.getElementById(
    "signup-confirm-password",
  );
  const confirmPassword = confirmPasswordInput
    ? confirmPasswordInput.value
    : null;

  if (/\s/.test(username)) {
    document.getElementById("signup-error").textContent =
      "O nome de usuário não pode conter espaços.";
    document.getElementById("signup-error").style.display = "block";
    return;
  }

  // Regex profissional para validação de e-mail (suporta domínios compostos e caracteres especiais permitidos)
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!email || !emailRegex.test(email)) {
    document.getElementById("signup-error").textContent =
      "Por favor, insira um e-mail válido.";
    document.getElementById("signup-error").style.display = "block";
    return;
  }

  if (passwordRaw.length < 8) {
    document.getElementById("signup-error").textContent =
      "A senha deve ter no mínimo 8 caracteres.";
    document.getElementById("signup-error").style.display = "block";
    return;
  }

  if (!/[a-zA-Z]/.test(passwordRaw) || !/[0-9]/.test(passwordRaw)) {
    document.getElementById("signup-error").textContent =
      "A senha deve conter letras e números.";
    document.getElementById("signup-error").style.display = "block";
    return;
  }

  if (confirmPassword !== null && passwordRaw !== confirmPassword) {
    document.getElementById("signup-error").textContent =
      "As senhas não coincidem.";
    document.getElementById("signup-error").style.display = "block";
    return;
  }

  const password = passwordRaw;

  // Usar caminho relativo simples para evitar problemas de porta
  fetch(`${API_BASE}/auth/signup`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, username, password }),
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.success) {
        // Em vez de ir para login, abrir modal de verificação
        showToast("Código enviado para seu e-mail!", "info");
        openVerificationModal(email);
      } else {
        document.getElementById("signup-error").textContent = data.error;
        document.getElementById("signup-error").style.display = "block";
      }
    });
}

function handleLogout() {
  fetch(`${API_BASE}/auth/logout`, {
    method: "POST",
    credentials: "include",
  }).then(() => {
    currentUser = null;
    localStorage.removeItem("user_info");
    localStorage.removeItem("auth_token");
    if (loadServersInterval) clearInterval(loadServersInterval);
    window.location.reload();
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
  if (
    currentUser &&
    (currentUser.role === "admin" || currentUser.role === "gerente")
  ) {
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

  // Listener para botão de configurações
  const settingsBtn = document.getElementById("settings-btn");
  if (settingsBtn) {
    settingsBtn.addEventListener("click", openSettingsModal);
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

  // Listeners para Perfil
  const closeProfileBtn = document.getElementById("close-profile-btn");
  if (closeProfileBtn) {
    closeProfileBtn.addEventListener("click", () => {
      document.getElementById("profile-modal").classList.remove("show");
    });
  }

  // Fechar modal de perfil ao clicar fora
  const profileModal = document.getElementById("profile-modal");
  if (profileModal) {
    profileModal.addEventListener("click", (e) => {
      if (e.target.id === "profile-modal") {
        profileModal.classList.remove("show");
      }
    });
  }

  const profileForm = document.getElementById("profile-form");
  if (profileForm) {
    profileForm.addEventListener("submit", saveProfile);
  }

  const deleteAccountBtn = document.getElementById("delete-account-btn");
  if (deleteAccountBtn)
    deleteAccountBtn.addEventListener("click", deleteMyAccount);

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
    const response = await fetch(`${API_BASE}/api/servers`, {
      credentials: "include",
      headers: getAuthHeaders(),
    });
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
    container.style.display = "block";
  } else {
    container.className = "servers-grid";
    container.style.display = "grid";
  }

  emptyState.style.display = "none";

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
                ${filteredServers
                  .map((server) => {
                    const openUrl = getOpenUrl(server);
                    return `
                        <tr style="border-bottom: 1px solid #e9ecef; transition: background 0.2s;">
                            <td style="padding: 12px 15px;">
                                <span class="status-badge ${server.status}" style="font-size: 0.8rem; padding: 4px 8px; border-radius: 12px;">
                                    ${server.status === "active" ? "🟢" : server.status === "standby" ? "🟡" : "🔴"} ${server.status}
                                </span>
                            </td>
                            <td style="padding: 12px 15px; font-weight: 500;">${escapeHtml(server.name)}</td>
                            <td style="padding: 12px 15px; font-family: 'Roboto Mono', monospace; color: #666;">${escapeHtml(server.host)}</td>
                            <td style="padding: 12px 15px;">${server.port || "N/A"}</td>
                            <td style="padding: 12px 15px;">${escapeHtml(server.protocol)}</td>
                            <td style="padding: 12px 15px;">
                                <strong>${server.clientsCount !== undefined ? server.clientsCount : 0}</strong> / ${server.maxClients.toLocaleString()}
                            </td>
                            <td style="padding: 12px 15px;">${escapeHtml(server.region || "N/A")}</td>
                            <td style="padding: 12px 15px; text-align: right;">
                                <a href="${openUrl}" target="_blank" class="btn-icon" title="Abrir URL Token" style="text-decoration: none; margin-right: 8px; font-size: 1.2em;">🔗</a>
                                ${
                                  currentUser &&
                                  (currentUser.role === "admin" ||
                                    currentUser.role === "gerente")
                                    ? `
                                    <button class="btn-icon" onclick="editServer('${server.id}')" title="Editar" style="background: none; border: none; cursor: pointer; font-size: 1.2em; margin-right: 8px;">✏️</button>
                                `
                                    : ""
                                }
                                ${
                                  currentUser && currentUser.role === "admin"
                                    ? `<button class="btn-icon btn-delete" onclick="deleteServer('${server.id}')" title="Deletar" style="background: none; border: none; cursor: pointer; font-size: 1.2em;">🗑️</button>`
                                    : ""
                                }
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

  container.innerHTML = filteredServers
    .map((server) => {
      const openUrl = getOpenUrl(server);
      const isAdminOrManager =
        currentUser &&
        (currentUser.role === "admin" || currentUser.role === "gerente");

      return `
        <div class="server-card ${server.status}">
            <span class="status-badge ${server.status}">
                ${server.status === "active" ? "🟢 Ativo" : server.status === "standby" ? "🟡 Em Standby" : "🔴 Inativo"}
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
                <span class="info-label">URL:</span>
                <span class="info-value protocol-value">${escapeHtml(server.protocol)}://${escapeHtml(server.host)}${server.port ? ":" + server.port : ""}</span>
            </div>

            <div class="info-row">
                <span class="info-label">Região:</span>
                <span class="region-tag">${escapeHtml(server.region || "N/A")}</span>
            </div>

            ${
              isAdminOrManager
                ? `
              <div class="info-row">
                  <span class="info-label">Clientes:</span>
                  <span class="info-value">
                      <strong>${server.clientsCount !== undefined ? server.clientsCount : 0}</strong> / ${server.maxClients.toLocaleString()}
                  </span>
              </div>
            `
                : ""
            }

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

            ${
              isAdminOrManager
                ? `
              <div class="info-row">
                  <span class="info-label">Url Token:</span>
                  <span class="info-value">${escapeHtml(server.urltoken || "N/A")}</span>
              </div>
            `
                : ""
            }
            ${
              server.token &&
              server.token !== "N/A" &&
              server.requiresAuth !== undefined &&
              server.requiresAuth !== null
                ? `<div class="token-display mt-2">
                <div class="mb-2">${escapeHtml(server.token)}</div>
                <button class="btn-copy w-full" onclick="copyToken('${server.token}')">📋 Copiar Token</button>
            </div>`
                : ""
            }

            ${isAdminOrManager && server.notes ? `<div class="info-row"><span class="info-label">Notas:</span><span class="info-value">${escapeHtml(server.notes)}</span></div>` : ""}

            ${
              isAdminOrManager
                ? `
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
            `
                : ""
            }

            <div class="server-actions">
                <a href="${openUrl}" target="_blank" class="btn-main">
                    🔗 Abrir url token
                </a>
                <a href="#" onclick="pingServer('${escapeHtml(server.host)}', ${server.port}, '${server.protocol}', this); return false;" class="btn-secondary" title="Testar Latência">
                    ⚡ Ping
                </a>
                ${
                  currentUser &&
                  (currentUser.role === "admin" ||
                    currentUser.role === "gerente")
                    ? `
                <button class="btn-edit" onclick="editServer('${server.id}')">✏️ Editar</button>
                `
                    : ""
                }
                ${
                  currentUser && currentUser.role === "admin"
                    ? `<button class="btn-delete" onclick="deleteServer('${server.id}')">🗑️ Deletar</button>`
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

  const nameInput = document.getElementById("server-name");
  if (!nameInput.value.trim()) {
    showToast("O nome do servidor é obrigatório.", "error");
    nameInput.focus();
    return;
  }

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
    const response = await fetch(`${API_BASE}/api/servers`, {
      method: method,
      credentials: "include",
      headers: getAuthHeaders(),
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
  message.innerHTML = `Tem certeza que deseja deletar o servidor <strong>${escapeHtml(server.name)}</strong>? <br>Esta ação não pode ser desfeita.`;

  // Para evitar múltiplos listeners, clonamos e substituímos o botão
  const newConfirmBtn = confirmBtn.cloneNode(true);
  confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);

  newConfirmBtn.addEventListener("click", async () => {
    try {
      const response = await fetch(`${API_BASE}/api/servers`, {
        method: "DELETE",
        credentials: "include",
        headers: getAuthHeaders(),
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
    const response = await fetch(`${API_BASE}/api/settings`, {
      credentials: "include",
      headers: getAuthHeaders(),
    });
    if (response.status === 401) {
      showToast("Sessão expirada.", "error");
      showLogin();
      return;
    }
    const data = await response.json();
    document.getElementById("discovery-url").value = data.discoveryUrl || "";
    document.getElementById("refresh-interval").value = refreshInterval;
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
  const newInterval = parseInt(
    document.getElementById("refresh-interval").value,
  );

  // Salvar intervalo localmente
  localStorage.setItem("refresh_interval", newInterval);
  refreshInterval = newInterval;
  if (loadServersInterval) clearInterval(loadServersInterval);
  loadServersInterval = setInterval(loadServers, refreshInterval);

  try {
    const response = await fetch(`${API_BASE}/api/settings`, {
      method: "POST",
      credentials: "include",
      headers: getAuthHeaders(),
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
    id: currentUser.id, // O backend vai verificar se o ID bate com a sessão
    name: name,
    username: currentUser.username,
    role: currentUser.role,
  };

  if (password) {
    if (password.length < 6) {
      showToast("A senha deve ter no mínimo 6 caracteres.", "error");
      return;
    }
    payload.password = password;
  }

  try {
    const res = await fetch(`${API_BASE}/api/users`, {
      method: "POST", // Usando POST que no server.js atual lida com create/update
      credentials: "include",
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      showToast("Perfil atualizado com sucesso!");
      document.getElementById("profile-modal").classList.remove("show");
      // Atualizar info local
      currentUser.name = name;
      localStorage.setItem("user_info", JSON.stringify(currentUser));
      document.getElementById("user-info").textContent = `Olá, ${name}! 👋`;
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
  const confirmModal = document.getElementById("confirmation-modal");
  const confirmBtn = document.getElementById("confirm-btn");
  const title = document.getElementById("confirmation-title");
  const message = document.getElementById("confirmation-message");

  title.textContent = "Excluir Conta";
  message.innerHTML =
    "Tem certeza que deseja excluir sua conta? <br><strong>Esta ação é irreversível e você será desconectado.</strong>";

  document.getElementById("profile-modal").classList.remove("show");
  confirmModal.classList.add("show");

  // Clone para limpar listeners
  const newConfirmBtn = confirmBtn.cloneNode(true);
  confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);

  newConfirmBtn.addEventListener("click", async () => {
    try {
      await fetch(`${API_BASE}/api/users`, {
        method: "DELETE",
        credentials: "include",
        headers: getAuthHeaders(),
        body: JSON.stringify({ id: currentUser.id }), // Backend verifica permissão
      });
      handleLogout();
    } catch (e) {
      showToast("Erro ao excluir conta", "error");
    }
  });
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
      ws.close();
      setTimeout(() => {
        btn.innerHTML = originalText;
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

function showToast(message, type = "success") {
  const toastContainer = document.getElementById("toast-container");
  if (!toastContainer) return;

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
