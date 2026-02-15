// Dashboard App - Client-side JavaScript

let servers = [];
let currentFilter = "all";
let searchTerm = "";
let currentPrivacyFilter = "all";
let currentSort = "name";
let editingServerId = null;
let currentUser = null; // Armazenará o objeto do usuário: { name, username, role }
let loadServersInterval = null;
let refreshInterval = parseInt(
  localStorage.getItem("refresh_interval") || "30000",
);
let loginAttempts = 0;

// URL Base da API (Fallback para localhost se config.js não carregar)
const API_BASE =
  (window.APP_CONFIG && window.APP_CONFIG.API_BASE) || "http://localhost:3000";

console.log("Dashboard API_BASE:", API_BASE); // Log para debug

function getAuthHeaders() {
  const headers = { "Content-Type": "application/json" };
  return headers;
}

// ===== UTILITY FUNCTIONS =====
function generateToken() {
  // Gera um token aleatório de 32 caracteres em hexadecimal
  return Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

// ===== LOADER SYSTEM =====
function injectLoader() {
  if (document.getElementById("app-loader")) return;

  const style = document.createElement("style");
  style.textContent = `
    #app-loader {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: #f4f4f7;
      z-index: 99999;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      transition: opacity 0.4s ease, visibility 0.4s;
    }
    .spinner {
      width: 40px;
      height: 40px;
      border: 4px solid #e2e8f0;
      border-top: 4px solid #667eea;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin-bottom: 15px;
    }
    .loading-text {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      color: #667eea;
      font-size: 14px;
      font-weight: 600;
      letter-spacing: 1px;
      animation: pulse 1.5s infinite ease-in-out;
    }
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    @keyframes pulse { 0%, 100% { opacity: 0.6; } 50% { opacity: 1; } }
    .loader-hidden { opacity: 0; visibility: hidden; }

    /* Animação de Entrada do Conteúdo */
    #dashboard-container, #login-modal {
      opacity: 0;
      transform: translateY(20px);
      transition: opacity 0.8s cubic-bezier(0.2, 0.8, 0.2, 1), transform 0.8s cubic-bezier(0.2, 0.8, 0.2, 1);
    }
    body.loaded #dashboard-container, body.loaded #login-modal {
      opacity: 1;
      transform: translateY(0);
    }

    /* Highlight de Pesquisa */
    .highlight {
      background-color: #fff3cd;
      color: #856404;
      padding: 0 2px;
      border-radius: 2px;
    }
  `;
  document.head.appendChild(style);

  const loader = document.createElement("div");
  loader.id = "app-loader";
  loader.innerHTML =
    '<div class="spinner"></div><div class="loading-text">CARREGANDO...</div>';
  document.body.appendChild(loader);
}

function hideLoader() {
  const loader = document.getElementById("app-loader");
  if (loader) loader.classList.add("loader-hidden");
  document.body.classList.add("loaded");
}

function escapeHtml(text) {
  if (text === null || text === undefined) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function highlightMatch(text) {
  if (text === null || text === undefined) return "";
  const strText = String(text);
  if (!searchTerm) return escapeHtml(strText);

  const term = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = strText.split(new RegExp(`(${term})`, "gi"));
  return parts
    .map((part) =>
      part.toLowerCase() === searchTerm
        ? `<span class="highlight">${escapeHtml(part)}</span>`
        : escapeHtml(part),
    )
    .join("");
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
      openForgotPasswordModal();
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
        
        <div style="margin-top: 15px;">
          <a href="#" id="resend-code-link" style="font-size: 0.9em; color: #667eea; text-decoration: none;">Não recebeu? Reenviar código</a>
        </div>

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

function injectForgotPasswordModal() {
  if (document.getElementById("forgot-password-modal")) return;

  const modalHTML = `
    <div id="forgot-password-modal" class="modal">
      <div class="modal-content" style="max-width: 400px; padding: 0; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.2);">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 25px 20px; text-align: center;">
          <h2 style="color: white; margin: 0; font-size: 1.5rem; font-weight: 700;">Recuperação de Conta</h2>
          <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0; font-size: 0.9rem;">Redefina sua senha com segurança</p>
        </div>
        
        <div style="padding: 30px 25px; background: white;">
            <div id="forgot-step-1">
                <p style="margin-bottom: 20px; color: #4a5568; font-size: 0.95rem; line-height: 1.5; text-align: center;">
                  Digite seu e-mail cadastrado para receber o código de verificação.
                </p>
                <div class="form-group" style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 8px; color: #4a5568; font-weight: 600; font-size: 0.9rem;">E-mail</label>
                    <input type="email" id="forgot-email" class="form-control" placeholder="seu@email.com" style="width: 100%; padding: 12px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 1rem; transition: border-color 0.2s;">
                </div>
                <button id="forgot-send-btn" class="btn-primary" style="width: 100%; padding: 12px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border: none; border-radius: 8px; color: white; font-weight: 600; font-size: 1rem; cursor: pointer; transition: transform 0.1s;">Enviar Código</button>
            </div>

            <div id="forgot-step-2" style="display: none;">
                <div style="background-color: #ebf8ff; color: #2b6cb0; padding: 12px; border-radius: 8px; margin-bottom: 20px; font-size: 0.9rem; text-align: center; border: 1px solid #bee3f8;">
                    ✉️ Código enviado! Verifique seu e-mail.
                </div>
                
                <div class="form-group" style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 8px; color: #4a5568; font-weight: 600; font-size: 0.9rem;">Código de Verificação</label>
                    <input type="text" id="forgot-code" class="form-control" placeholder="000000" maxlength="6" style="width: 100%; padding: 12px; border: 1px solid #e2e8f0; border-radius: 8px; text-align: center; letter-spacing: 5px; font-size: 1.2rem; font-weight: 700; color: #4a5568;">
                </div>

                <div class="form-group" style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 8px; color: #4a5568; font-weight: 600; font-size: 0.9rem;">Nova Senha</label>
                    <input type="password" id="forgot-new-pass" class="form-control" placeholder="••••••••" style="width: 100%; padding: 12px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 1rem;">
                </div>

                <button id="forgot-reset-btn" class="btn-primary" style="width: 100%; padding: 12px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border: none; border-radius: 8px; color: white; font-weight: 600; font-size: 1rem; cursor: pointer;">Redefinir Senha</button>
            </div>

            <div id="forgot-error" class="alert-box error" style="display: none; margin-top: 15px; color: #c53030; background-color: #fff5f5; padding: 10px; border-radius: 6px; font-size: 0.9rem; text-align: center; border: 1px solid #feb2b2;"></div>
            
            <button id="forgot-cancel-btn" class="btn-secondary" style="width: 100%; margin-top: 15px; background: transparent; border: none; color: #718096; cursor: pointer; font-size: 0.9rem; font-weight: 500;">Cancelar</button>
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML("beforeend", modalHTML);

  // Listeners
  const modal = document.getElementById("forgot-password-modal");
  const cancelBtn = document.getElementById("forgot-cancel-btn");
  const sendBtn = document.getElementById("forgot-send-btn");
  const resetBtn = document.getElementById("forgot-reset-btn");
  const errorBox = document.getElementById("forgot-error");

  cancelBtn.addEventListener("click", () => {
    modal.classList.remove("show");
  });

  sendBtn.addEventListener("click", () => {
    const email = document.getElementById("forgot-email").value.trim();
    if (!email) {
      errorBox.textContent = "Digite seu e-mail.";
      errorBox.style.display = "block";
      return;
    }

    sendBtn.disabled = true;
    sendBtn.textContent = "Enviando...";
    errorBox.style.display = "none";

    fetch(`${API_BASE}/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    })
      .then((res) => res.json())
      .then((data) => {
        sendBtn.disabled = false;
        sendBtn.textContent = "Enviar Código";
        if (data.success) {
          document.getElementById("forgot-step-1").style.display = "none";
          document.getElementById("forgot-step-2").style.display = "block";
          showToast("Código enviado!", "success");
        } else {
          errorBox.textContent = data.error || "Erro ao enviar.";
          errorBox.style.display = "block";
        }
      })
      .catch((err) => {
        console.error("Erro forgot-password:", err);
        sendBtn.disabled = false;
        sendBtn.textContent = "Enviar Código";
        errorBox.textContent = "Erro de conexão.";
        errorBox.style.display = "block";
      });
  });

  resetBtn.addEventListener("click", () => {
    const email = document.getElementById("forgot-email").value.trim();
    const code = document.getElementById("forgot-code").value.trim();
    const newPassword = document.getElementById("forgot-new-pass").value;

    if (!code || !newPassword) {
      errorBox.textContent = "Preencha todos os campos.";
      errorBox.style.display = "block";
      return;
    }

    resetBtn.disabled = true;
    resetBtn.textContent = "Redefinindo...";
    errorBox.style.display = "none";

    fetch(`${API_BASE}/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code, newPassword }),
    })
      .then((res) => res.json())
      .then((data) => {
        resetBtn.disabled = false;
        resetBtn.textContent = "Redefinir Senha";
        if (data.success) {
          modal.classList.remove("show");
          showToast("Senha redefinida com sucesso! Faça login.", "success");
          // Reset modal state
          setTimeout(() => {
            document.getElementById("forgot-step-1").style.display = "block";
            document.getElementById("forgot-step-2").style.display = "none";
            document.getElementById("forgot-email").value = "";
            document.getElementById("forgot-code").value = "";
            document.getElementById("forgot-new-pass").value = "";
          }, 500);
        } else {
          errorBox.textContent = data.error || "Erro ao redefinir.";
          errorBox.style.display = "block";
        }
      })
      .catch((err) => {
        console.error("Erro reset-password:", err);
        resetBtn.disabled = false;
        resetBtn.textContent = "Redefinir Senha";
        errorBox.textContent = "Erro de conexão.";
        errorBox.style.display = "block";
      });
  });
}

function openForgotPasswordModal() {
  injectForgotPasswordModal();
  // Re-run password toggles for the new input
  setupPasswordToggles();

  const modal = document.getElementById("forgot-password-modal");
  const errorBox = document.getElementById("forgot-error");

  // Reset state
  document.getElementById("forgot-step-1").style.display = "block";
  document.getElementById("forgot-step-2").style.display = "none";
  document.getElementById("forgot-email").value = "";
  document.getElementById("forgot-code").value = "";
  document.getElementById("forgot-new-pass").value = "";
  errorBox.style.display = "none";

  modal.classList.add("show");
  document.getElementById("forgot-email").focus();
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

  // Lógica para o botão de reenvio
  const resendLink = document.getElementById("resend-code-link");
  if (resendLink) {
    const newResendLink = resendLink.cloneNode(true);
    resendLink.parentNode.replaceChild(newResendLink, resendLink);

    newResendLink.addEventListener("click", (e) => {
      e.preventDefault();
      newResendLink.textContent = "Enviando...";
      newResendLink.style.pointerEvents = "none";
      newResendLink.style.color = "#999";

      fetch(`${API_BASE}/auth/resend-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            showToast("Novo código enviado!", "success");
            newResendLink.textContent = "Código reenviado! (Aguarde 30s)";
            setTimeout(() => {
              newResendLink.textContent = "Não recebeu? Reenviar código";
              newResendLink.style.pointerEvents = "auto";
              newResendLink.style.color = "#667eea";
            }, 30000);
          } else {
            showToast(data.error || "Erro ao reenviar.", "error");
            newResendLink.textContent = "Tentar novamente";
            newResendLink.style.pointerEvents = "auto";
            newResendLink.style.color = "#667eea";
          }
        })
        .catch((err) => {
          console.error("Erro resend-code:", err);
          showToast("Erro de conexão.", "error");
          newResendLink.textContent = "Tentar novamente";
          newResendLink.style.pointerEvents = "auto";
          newResendLink.style.color = "#667eea";
        });
    });
  }

  newBtn.addEventListener("click", () => {
    const code = input.value.trim();
    if (code.length !== 6) {
      errorBox.textContent = "O código deve ter 6 dígitos.";
      errorBox.style.display = "block";
      return;
    }

    newBtn.disabled = true;
    newBtn.textContent = "Verificando...";

    fetch(`${API_BASE}/auth/verify-code`, {
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
      .catch((err) => {
        console.error("Erro verify-code:", err);
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

function injectBadgeStyles() {
  const style = document.createElement("style");
  style.textContent = `
    .server-badges { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 4px; }
    .badge { font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: 600; display: inline-flex; align-items: center; border: 1px solid transparent; letter-spacing: 0.02em; }
    .badge-secure { background: #dcfce7; color: #15803d; border-color: #bbf7d0; }
    .badge-insecure { background: #fef9c3; color: #a16207; border-color: #fde047; }
    .badge-info { background: #e0f2fe; color: #0369a1; border-color: #bae6fd; }
    .badge-success { background: #dcfce7; color: #15803d; border-color: #bbf7d0; }
    .badge-danger { background: #fee2e2; color: #b91c1c; border-color: #fecaca; }
    .badge-auth { background: #fee2e2; color: #b91c1c; border-color: #fecaca; }
    .badge-open { background: #dcfce7; color: #15803d; border-color: #bbf7d0; }
    
    /* Status Dots */
    .status-dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; position: relative; }
    .status-dot::after { content: ''; position: absolute; top: -2px; left: -2px; right: -2px; bottom: -2px; border-radius: 50%; opacity: 0.3; z-index: 0; }
    .status-dot.active { background-color: #22c55e; }
    .status-dot.active::after { background-color: #22c55e; }
    .status-dot.inactive { background-color: #ef4444; }
    .status-dot.inactive::after { background-color: #ef4444; }
    .status-dot.standby { background-color: #f59e0b; }
    .status-dot.standby::after { background-color: #f59e0b; }

    /* Action Buttons */
    .action-btn {
        width: 36px; height: 36px; border-radius: 8px; border: 1px solid #e2e8f0; 
        background: white; cursor: pointer; display: inline-flex; align-items: center; justify-content: center;
        transition: all 0.2s ease; font-size: 1.1em; color: #64748b;
    }
    .action-btn:hover { background: #f8fafc; border-color: #cbd5e1; transform: translateY(-1px); box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
    .edit-btn:hover { color: #3b82f6; border-color: #bfdbfe; background: #eff6ff; }
    .history-btn:hover { color: #8b5cf6; border-color: #ddd6fe; background: #f5f3ff; }
    .delete-btn:hover { color: #ef4444; border-color: #fecaca; background: #fef2f2; }

    /* Token Button */
    .token-btn {
        font-size: 0.75rem; color: #475569; background: #f1f5f9; border: 1px solid #e2e8f0;
        padding: 4px 8px; border-radius: 6px; cursor: pointer; transition: all 0.2s;
        display: inline-flex; align-items: center; gap: 4px; font-weight: 500;
    }
    .token-btn:hover { background: #e2e8f0; color: #1e293b; border-color: #cbd5e1; }
    .token-btn:active { transform: translateY(1px); }
  `;
  document.head.appendChild(style);
}

function injectAccessControlUI() {
  const tokenInput = document.getElementById('server-token');
  // Evita duplicidade se já foi injetado
  if (!tokenInput || document.getElementById('server-access-type')) return;

  // Encontra o container do input de token (tenta achar o grupo, senão usa o próprio input)
  const tokenGroup = tokenInput.closest('.form-group') || tokenInput;

  const wrapper = document.createElement('div');
  wrapper.className = 'form-group'; // Usa a mesma classe do formulário existente
  wrapper.style.marginBottom = '15px';

  const label = document.createElement('label');
  label.textContent = 'Tipo de Acesso';
  label.style.display = 'block';
  label.style.marginBottom = '5px';
  label.style.fontWeight = '600';
  label.style.color = '#4a5568';

  const select = document.createElement('select');
  select.id = 'server-access-type';
  select.style.width = '100%';
  select.style.padding = '10px';
  select.style.border = '1px solid #e2e8f0';
  select.style.borderRadius = '4px';
  select.style.backgroundColor = '#fff';
  select.style.fontSize = '1rem';

  select.innerHTML = `
    <option value="public">🔓 Público (Acesso Livre)</option>
    <option value="private">🔒 Privado (Requer Token)</option>
  `;

  wrapper.appendChild(label);
  wrapper.appendChild(select);

  // Insere ANTES do container do token
  if (tokenGroup.parentNode) {
    tokenGroup.parentNode.insertBefore(wrapper, tokenGroup);
  }

  // Lógica de interação
  select.addEventListener('change', () => {
    const isPrivate = select.value === 'private';
    tokenInput.placeholder = isPrivate ? "Token Obrigatório" : "Opcional (Token Admin)";
    tokenInput.style.backgroundColor = isPrivate ? '#fff' : '#f8f9fa';
    tokenInput.required = isPrivate;
  });
}

function injectChartLibrary() {
  if (document.querySelector('script[src*="chart.js"]')) return;
  const script = document.createElement('script');
  script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
  document.head.appendChild(script);
}

// ===== INITIALIZATION =====
document.addEventListener("DOMContentLoaded", () => {
  // Adicionar elementos de UI dinâmicos ao corpo do documento
  injectLoader();

  // Carregar CSS de componentes (substitui injeção JS)
  if (!document.querySelector('link[href="css/components.css"]')) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "css/components.css";
    document.head.appendChild(link);
  }

  injectToastStyles();
  injectBadgeStyles();
  injectSignupConfirmField();
  injectSignupEmailField();
  injectForgotPasswordLink();
  injectSignupClearButton();
  injectForgotPasswordModal();
  injectAccessControlUI();
  injectChartLibrary();

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
    // Injetar botão de limpar se não existir
    let clearBtn = document.getElementById("server-search-clear");
    if (!clearBtn) {
      clearBtn = document.createElement("button");
      clearBtn.id = "server-search-clear";
      clearBtn.innerHTML = "&times;";
      clearBtn.title = "Limpar";
      clearBtn.style.cssText =
        "position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: none; border: none; color: #999; font-size: 1.2em; cursor: pointer; display: none; padding: 0; line-height: 1;";

      if (searchInput.parentElement) {
        searchInput.parentElement.style.position = "relative";
        searchInput.parentElement.appendChild(clearBtn);
      }
    }

    searchInput.value = ""; // Limpar ao carregar a página
    searchTerm = "";
    searchInput.setAttribute("autocomplete", "off");
    // Hack para evitar que navegadores preencham automaticamente com o nome de usuário
    searchInput.setAttribute("readonly", "true");
    searchInput.setAttribute("name", "dashboard_search_query");
    searchInput.addEventListener("focus", () => {
      searchInput.removeAttribute("readonly");
    });

    searchInput.addEventListener("input", (e) => {
      searchTerm = e.target.value.toLowerCase();
      if (clearBtn) clearBtn.style.display = searchTerm ? "block" : "none";
      renderServers();
    });

    searchInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        searchTerm = e.target.value.toLowerCase();
        renderServers();
        searchInput.blur(); // Remove o foco para fechar teclado em mobile
      }
    });

    if (clearBtn) {
      clearBtn.addEventListener("click", () => {
        searchInput.value = "";
        searchTerm = "";
        clearBtn.style.display = "none";
        searchInput.focus();
        renderServers();
      });
    }
  }

  // Listener para ordenação
  const sortSelect = document.getElementById("server-sort");
  if (sortSelect) {
    sortSelect.addEventListener("change", (e) => {
      currentSort = e.target.value;
      renderServers();
    });

    // Injetar filtro de privacidade ao lado da ordenação
    if (!document.getElementById("server-privacy-filter")) {
      const privacySelect = document.createElement("select");
      privacySelect.id = "server-privacy-filter";
      privacySelect.className = sortSelect.className;
      privacySelect.style.cssText = sortSelect.style.cssText;
      privacySelect.style.marginLeft = "10px";
      privacySelect.innerHTML = `<option value="all">Todos (Acesso)</option><option value="public">🔓 Públicos</option><option value="private">🔒 Privados</option>`;
      
      privacySelect.addEventListener("change", (e) => {
        currentPrivacyFilter = e.target.value;
        renderServers();
      });
      sortSelect.parentNode.insertBefore(privacySelect, sortSelect.nextSibling);
    }
  }

  // Remover toggle de visualização (apenas lista agora)
  const viewToggleBtn = document.getElementById("view-toggle-btn");
  if (viewToggleBtn) {
    viewToggleBtn.style.display = "none";
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
    .then(async (data) => {
      if (data.valid) {
        currentUser = data.user;
        localStorage.setItem("user_info", JSON.stringify(currentUser));

        // Redirecionar usuários comuns para view.html se estiverem no index.html
        if (currentUser.role === "user") {
          window.location.href = "/view.html";
        } else {
          showDashboard();
          await loadServers(); // Aguarda o carregamento dos dados antes de liberar a tela
          setupEventListeners();
          // Atualizar lista de servidores a cada 5 segundos
          if (loadServersInterval) clearInterval(loadServersInterval);
          loadServersInterval = setInterval(loadServers, refreshInterval);
        }
      } else {
        showLogin();
      }
    })
    .catch(() => showLogin())
    .finally(() => hideLoader()); // Remove o loader independente do resultado
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

      // Injetar botão de Logs se não existir (apenas admin)
      if (currentUser.role === "admin" && !document.getElementById("logs-btn")) {
        const logsBtn = document.createElement("button");
        logsBtn.id = "logs-btn";
        logsBtn.className = "btn-secondary";
        logsBtn.innerHTML = "📋 Logs";
        logsBtn.title = "Visualizar logs do sistema";
        logsBtn.style.cssText =
          "margin-left: 10px; font-size: 14px; padding: 8px 12px; display: inline-flex; align-items: center; text-decoration: none; color: white; cursor: pointer; border: none;";
        
        logsBtn.onclick = () => {
            openLogsModal();
        };

        const headerTitle = document.querySelector("header h1");
        if (headerTitle) headerTitle.appendChild(logsBtn);
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

  const submitBtn = e.target.querySelector('button[type="submit"]');
  const username = document.getElementById("login-username").value;
  const passwordRaw = document.getElementById("login-password").value;
  const password = passwordRaw;

  const cleanApiBase = API_BASE.replace(/\/$/, "");

  fetch(`${cleanApiBase}/auth/login`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  })
    .then(async (res) => {
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        return res.json();
      }
      const text = await res.text();
      throw new Error(
        `Erro do servidor (${res.status}): ${text.substring(0, 100)}`,
      );
    })
    .then((data) => {
      if (data.success) {
        loginAttempts = 0;
        currentUser = data.user;
        localStorage.setItem("user_info", JSON.stringify(currentUser));
        // if (data.token) localStorage.setItem("auth_token", data.token); // Não salvar JWT no dashboard

        // Limpar campos de login para evitar cache/autofill
        document.getElementById("login-username").value = "";
        document.getElementById("login-password").value = "";

        if (currentUser.role === "user") {
          window.location.href = "/view.html";
        } else {
          showDashboard(); // Admins/Gerentes ficam no dashboard

          // Limpar pesquisa ao logar
          const searchInput = document.getElementById("server-search");
          if (searchInput) {
            searchInput.value = "";
            searchTerm = "";
            const clearBtn = document.getElementById("server-search-clear");
            if (clearBtn) clearBtn.style.display = "none";
          }

          loadServers();
          setupEventListeners();
          if (loadServersInterval) clearInterval(loadServersInterval);
          loadServersInterval = setInterval(loadServers, refreshInterval);
        }
      } else {
        loginAttempts++;
        if (loginAttempts >= 3 && submitBtn) {
          let countdown = 10;
          submitBtn.disabled = true;
          const originalText = submitBtn.textContent;
          submitBtn.textContent = `Aguarde ${countdown}s`;

          const timer = setInterval(() => {
            countdown--;
            if (countdown <= 0) {
              clearInterval(timer);
              submitBtn.disabled = false;
              submitBtn.textContent = originalText;
              loginAttempts = 0;
            } else {
              submitBtn.textContent = `Aguarde ${countdown}s`;
            }
          }, 1000);
        }
        document.getElementById("login-error").textContent = data.error;
        document.getElementById("login-error").style.display = "block";
        // A classe .alert-box já cuida do estilo
      }
    })
    .catch((err) => {
      console.error("Login error:", err);
      const errorBox = document.getElementById("login-error");
      if (errorBox) {
        errorBox.textContent =
          err.message === "Failed to fetch"
            ? "Erro de conexão: Verifique se o servidor está rodando."
            : err.message;
        errorBox.style.display = "block";
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
  })
    .catch((err) => console.error("Logout failed:", err))
    .finally(() => {
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
      e.currentTarget.classList.add("active");
      currentFilter = e.currentTarget.dataset.filter;
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
      
      // GARANTIA: Injetar UI de controle de acesso se ainda não existir
      injectAccessControlUI();
      
      // Resetar o tipo de acesso para o padrão (Público)
      const accessSelect = document.getElementById('server-access-type');
      if (accessSelect) {
        accessSelect.value = 'public';
        accessSelect.dispatchEvent(new Event('change'));
      }

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
    const cleanApiBase = API_BASE.replace(/\/$/, "");
    const response = await fetch(`${cleanApiBase}/api/servers`, {
      credentials: "include",
      headers: getAuthHeaders(),
    });

    if (response.status === 401) {
      if (loadServersInterval) clearInterval(loadServersInterval);
      showToast("Sessão expirada. Por favor, faça login novamente.", "error");
      showLogin();
      return;
    }

    const data = await response.json();
    servers = (data.servers || []).map(s => ({
      ...s,
      requiresAuth: s.requiresAuth !== undefined ? s.requiresAuth : (s.requireAuth !== undefined ? s.requireAuth : undefined)
    }));
    renderServers();
    updateStats();
  } catch (error) {
    console.error("Erro ao carregar servidores:", error);
    showToast("Erro ao atualizar lista de servidores", "error");
  }
}

function getServerBadges(server) {
  let html = '<div class="server-badges">';
  
  // Protocolo
  const isSecure = server.protocol === "wss";
  html += `<span class="badge ${isSecure ? "badge-secure" : "badge-insecure"}">${isSecure ? "🛡️ WSS" : "⚠️ WS"}</span>`;

  // Autenticação
  if (server.requiresAuth !== undefined) {
    html += `<span class="badge ${server.requiresAuth ? "badge-auth" : "badge-open"}">${server.requiresAuth ? "🔒 Privado" : "🔓 Público"}</span>`;
  }

  // Região
  if (server.region) {
    html += `<span class="badge badge-info">🌍 ${escapeHtml(server.region)}</span>`;
  }

  html += '</div>';
  return html;
}

// ===== RENDER FUNCTIONS =====
function renderServers() {
  const container = document.getElementById("servers-container");
  const emptyState = document.getElementById("empty-state");

  let filteredServers = servers;
  if (currentFilter !== "all") {
    filteredServers = servers.filter((s) => s.status === currentFilter);
  }

  // Aplicar filtro de privacidade
  if (currentPrivacyFilter !== "all") {
    filteredServers = filteredServers.filter((s) => 
      currentPrivacyFilter === "private" ? s.requiresAuth : !s.requiresAuth
    );
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

  // Forçar modo lista
  container.className = "servers-list";
  container.style.display = "block";
  emptyState.style.display = "none";

  container.innerHTML = `
      <div style="background: white; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); overflow: hidden; border: 1px solid #e2e8f0;">
        <table style="width: 100%; border-collapse: collapse; min-width: 900px;">
            <thead style="background: #f8fafc; border-bottom: 1px solid #e2e8f0;">
                <tr>
                    <th style="padding: 16px 24px; text-align: left; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b;">Status</th>
                    <th style="padding: 16px 24px; text-align: left; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b;">Servidor</th>
                    <th style="padding: 16px 24px; text-align: left; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b;">Conexão</th>
                    <th style="padding: 16px 24px; text-align: left; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b;">Capacidade</th>
                    <th style="padding: 16px 24px; text-align: left; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b;">Acesso</th>
                    <th style="padding: 16px 24px; text-align: right; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b;">Ações</th>
                </tr>
            </thead>
            <tbody style="background: white;">
                ${filteredServers
                  .map((server) => {
                    const openUrl = getOpenUrl(server);
                    const isAdminOrManager =
                      currentUser && (currentUser.role === "admin" || currentUser.role === "gerente");
                    
                    const loadPercentage = Math.min(100, ((server.clientsCount || 0) / server.maxClients) * 100);
                    let loadColor = '#22c55e'; // Green
                    if (loadPercentage > 80) loadColor = '#ef4444'; // Red
                    else if (loadPercentage > 50) loadColor = '#f59e0b'; // Yellow

                    return `
                        <tr style="border-bottom: 1px solid #f1f5f9; transition: background-color 0.15s ease;" onmouseover="this.style.backgroundColor='#f8fafc'" onmouseout="this.style.backgroundColor='transparent'">
                            <!-- Status -->
                            <td style="padding: 16px 24px; white-space: nowrap; vertical-align: middle;">
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <span class="status-dot ${server.status}"></span>
                                    <span style="font-size: 0.875rem; font-weight: 600; color: #334155; text-transform: capitalize;">${server.status}</span>
                                </div>
                            </td>
                            
                            <!-- Servidor -->
                            <td style="padding: 16px 24px; vertical-align: middle;">
                                <div style="display: flex; flex-direction: column; gap: 2px;">
                                    <span style="font-size: 0.95rem; font-weight: 600; color: #1e293b;">${highlightMatch(server.name)}</span>
                                    <span title="${escapeHtml(server.description || '')}" style="font-size: 0.8rem; color: #64748b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 200px; display: inline-block;">
                                        ${server.description || 'Sem descrição'}
                                    </span>
                                    <div style="display: flex; align-items: center; gap: 6px; margin-top: 4px;">
                                        <span style="font-size: 0.7rem; background: #f1f5f9; color: #64748b; padding: 2px 6px; border-radius: 4px;">${server.region || 'Global'}</span>
                                        <span style="font-size: 0.7rem; color: #94a3b8; font-family: monospace;">${server.id}</span>
                                    </div>
                                    ${isAdminOrManager && server.notes ? `<div title="${escapeHtml(server.notes)}" style="font-size: 0.75em; color: #d97706; margin-top: 4px; font-style: italic; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 250px; cursor: help;">📝 ${escapeHtml(server.notes)}</div>` : ''}
                                </div>
                            </td>

                            <!-- Conexão -->
                            <td style="padding: 16px 24px; vertical-align: middle;">
                                <div style="display: flex; flex-direction: column; gap: 4px;">
                                    <div style="display: flex; align-items: center; gap: 6px;">
                                        <code style="font-family: 'Menlo', monospace; font-size: 0.85rem; color: #334155; font-weight: 500;">${highlightMatch(server.host)}</code>
                                        <span style="color: #cbd5e1;">:</span>
                                        <code style="font-family: 'Menlo', monospace; font-size: 0.85rem; color: #64748b;">${server.port}</code>
                                    </div>
                                    <div>
                                        <span class="badge ${server.protocol === 'wss' ? 'badge-secure' : 'badge-insecure'}" style="font-size: 0.7rem;">${server.protocol.toUpperCase()}</span>
                                    </div>
                                </div>
                            </td>

                            <!-- Capacidade -->
                            <td style="padding: 16px 24px; vertical-align: middle; min-width: 140px;">
                                <div style="display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 0.75rem;">
                                    <span style="font-weight: 600; color: #334155;">${server.clientsCount || 0}</span>
                                    <span style="color: #94a3b8;">${server.maxClients.toLocaleString()}</span>
                                </div>
                                <div style="width: 100%; height: 6px; background: #f1f5f9; border-radius: 999px; overflow: hidden;">
                                    <div style="width: ${loadPercentage}%; background: ${loadColor}; height: 100%; border-radius: 999px; transition: width 0.5s ease;"></div>
                                </div>
                            </td>

                            <!-- Acesso -->
                            <td style="padding: 16px 24px; vertical-align: middle;">
                                <div style="display: flex; flex-direction: column; gap: 6px;">
                                    <div>
                                        ${server.requiresAuth 
                                            ? '<span style="display: inline-flex; align-items: center; padding: 2px 8px; border-radius: 9999px; font-size: 0.7rem; font-weight: 600; background: #fef2f2; color: #ef4444; border: 1px solid #fee2e2;">🔒 Privado</span>' 
                                            : '<span style="display: inline-flex; align-items: center; padding: 2px 8px; border-radius: 9999px; font-size: 0.7rem; font-weight: 600; background: #f0fdf4; color: #16a34a; border: 1px solid #dcfce7;">🔓 Público</span>'}
                                    </div>
                                    ${isAdminOrManager && server.token ? `
                                        <div style="display: flex; align-items: center; gap: 6px;">
                                            <button onclick="copyToken('${escapeHtml(server.token)}')" class="token-btn" title="Copiar Token: ${escapeHtml(server.token)}">
                                                🔑 Copiar Token
                                            </button>
                                        </div>
                                    ` : ''}
                                    ${isAdminOrManager && server.urltoken ? `
                                        <div style="font-size: 0.7rem; color: #64748b; display: flex; align-items: center; gap: 4px;">
                                            <span>🔗</span> URL Dinâmica
                                        </div>
                                    ` : ''}
                                </div>
                            </td>

                            <!-- Ações -->
                            <td style="padding: 16px 24px; text-align: right; vertical-align: middle;">
                                <div style="display: flex; justify-content: flex-end; gap: 8px;">
                                ${
                                  isAdminOrManager
                                    ? `
                                    <button onclick="editServer('${server.id}')" class="action-btn edit-btn" title="Editar Configurações">
                                        ✏️
                                    </button>
                                    <button onclick="showHistory('${server.id}')" class="action-btn history-btn" title="Ver Histórico de Uso">
                                        📈
                                    </button>
                                `
                                    : ""
                                }
                                ${
                                  currentUser && currentUser.role === "admin"
                                    ? `<button onclick="deleteServer('${server.id}')" class="action-btn delete-btn" title="Excluir Servidor">
                                        🗑️
                                    </button>`
                                    : ""
                                }
                                </div>
                            </td>
                        </tr>
                    `;
                  })
                  .join("")}
            </tbody>
        </table>
      </div>`;
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

  // GARANTIA: Injetar UI de controle de acesso se ainda não existir
  injectAccessControlUI();

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

  // Definir o tipo de acesso baseado na propriedade requiresAuth
  const accessSelect = document.getElementById('server-access-type');
  if (accessSelect) {
    // Se requiresAuth for true, é privado. Se for false ou undefined, assumimos público/misto.
    accessSelect.value = server.requiresAuth ? 'private' : 'public';
    accessSelect.dispatchEvent(new Event('change'));
  }

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

  // Validação de caracteres especiais (Permite letras, números, espaços, acentos, -, _ e .)
  if (!/^[a-zA-Z0-9\u00C0-\u00FF\s\-_.]+$/.test(nameInput.value.trim())) {
    showToast("O nome do servidor não pode conter caracteres especiais.", "error");
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
    const host = document.getElementById("server-host").value.trim();
    const port = document.getElementById("server-port").value
      ? parseInt(document.getElementById("server-port").value, 10)
      : null;

    if (port !== null && (port < 1 || port > 65535)) {
      showToast("A porta deve estar entre 1 e 65535.", "error");
      return;
    }

    // Validação de Conflito: Impede que servidores (Públicos ou Privados) compartilhem a mesma porta
    const conflict = servers.find(
      (s) => s.id !== editingServerId && s.host === host && s.port === port,
    );

    if (conflict) {
      const conflictType = conflict.requiresAuth ? "Privado" : "Público";
      showToast(`Conflito: Já existe um servidor ${conflictType} ("${conflict.name}") em ${host}:${port}.`, "error");
      return;
    }

    let processedUrlToken = urlTokenInput ? urlTokenInput.value.trim() : "";
    processedUrlToken = processedUrlToken.replace(/\/+$/, ""); // Remove barra final antes de verificar
    if (processedUrlToken && !processedUrlToken.endsWith("/token")) {
      processedUrlToken += "/token";
    }

    const existingServer = editingServerId
      ? servers.find((s) => s.id === editingServerId)
      : null;

    // Capturar configuração de acesso
    let accessSelect = document.getElementById('server-access-type');
    
    // Fallback: Se o seletor não existir (erro de injeção), tenta recriar
    if (!accessSelect) {
        console.log("Recriando UI de acesso...");
        injectAccessControlUI();
        accessSelect = document.getElementById('server-access-type');
    }

    // Determina se é privado. Se o seletor falhar, mantém o valor padrão (false) ou o valor atual se estiver editando
    let isPrivate = accessSelect ? accessSelect.value === 'private' : false;
    if ((!accessSelect || !accessSelect.value) && editingServerId) {
        const currentServer = servers.find(s => s.id === editingServerId);
        if (currentServer) isPrivate = Boolean(currentServer.requiresAuth);
        console.log(`[DEBUG] UI falhou, preservando requiresAuth original: ${isPrivate}`);
    }

    // Validação extra
    if (isPrivate && !token.trim()) {
      showToast("Servidores privados exigem um Token de Autenticação.", "error");
      return;
    }

    const serverData = {
      id: editingServerId || `server-${Date.now()}`,
      name: document.getElementById("server-name").value,
      description: document.getElementById("server-description").value,
      host: host,
      port: port,
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
      requiresAuth: isPrivate, // Define explicitamente se requer autenticação
      requireAuth: isPrivate   // Envia ambos para compatibilidade com backend
    };

    console.log(`[DEBUG] Enviando dados do servidor. Nome: ${serverData.name}, Privado (requiresAuth): ${serverData.requiresAuth}`);

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
      console.log("[DEBUG] Servidor salvo retornado pela API:", savedServer);

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

let historyChartInstance = null;

async function showHistory(serverId) {
  // Injetar modal se não existir
  if (!document.getElementById('history-modal')) {
    const modalHTML = `
      <div id="history-modal" class="modal">
        <div class="modal-content" style="max-width: 700px;">
          <div class="modal-header">
              <h2 id="history-modal-title">Histórico de Capacidade</h2>
              <button class="close-modal-btn" onclick="document.getElementById('history-modal').classList.remove('show')">&times;</button>
          </div>
          <div style="padding: 20px;">
              <canvas id="history-chart" style="max-height: 300px;"></canvas>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
  }

  const modal = document.getElementById('history-modal');
  const title = document.getElementById('history-modal-title');
  const canvas = document.getElementById('history-chart');
  const server = servers.find(s => s.id === serverId);
  
  title.textContent = `Histórico: ${server ? server.name : 'Servidor'}`;
  modal.classList.add('show');

  // Carregar dados
  try {
    const res = await fetch('/servers-history.json');
    if (!res.ok) throw new Error("Histórico vazio");
    const allHistory = await res.json();
    const data = allHistory[serverId] || [];

    if (historyChartInstance) historyChartInstance.destroy();

    const ctx = canvas.getContext('2d');
    historyChartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.map(d => new Date(d.t).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})),
        datasets: [{
          label: 'Clientes Conectados',
          data: data.map(d => d.c),
          borderColor: '#667eea',
          backgroundColor: 'rgba(102, 126, 234, 0.2)',
          fill: true,
          tension: 0.3,
          pointRadius: 2
        }]
      },
      options: {
        responsive: true,
        scales: { y: { beginAtZero: true, suggestedMax: 10 } },
        plugins: { legend: { display: true } }
      }
    });
  } catch (e) {
    console.log("Ainda não há histórico disponível para este servidor.");
  }
}

async function openLogsModal() {
  // Inject modal if not exists
  if (!document.getElementById("logs-modal")) {
    const modalHTML = `
      <div id="logs-modal" class="modal">
        <div class="modal-content" style="max-width: 900px; width: 90%; height: 80vh; display: flex; flex-direction: column;">
          <div class="modal-header">
            <h2>📜 Logs de Auditoria</h2>
            <div style="display: flex; gap: 10px;">
                <button id="download-logs-btn" class="btn-secondary" style="padding: 5px 10px; font-size: 0.9em;">📥 Baixar ZIP</button>
                <button class="close-modal-btn close-btn">&times;</button>
            </div>
          </div>
          <div style="padding: 0; overflow: auto; flex-grow: 1;">
            <table id="logs-table" style="width: 100%; border-collapse: collapse; font-size: 0.9em;">
                <thead style="position: sticky; top: 0; background: #f8f9fa; z-index: 1;">
                    <tr style="border-bottom: 2px solid #e9ecef;">
                        <th style="padding: 12px 15px; text-align: left; color: #495057;">Data/Hora</th>
                        <th style="padding: 12px 15px; text-align: left; color: #495057;">Usuário</th>
                        <th style="padding: 12px 15px; text-align: left; color: #495057;">Ação</th>
                        <th style="padding: 12px 15px; text-align: left; color: #495057;">Detalhes</th>
                    </tr>
                </thead>
                <tbody>
                    <tr><td colspan="4" style="text-align: center; padding: 20px;">Carregando...</td></tr>
                </tbody>
            </table>
          </div>
          <div class="modal-footer" style="padding: 15px 20px; border-top: 1px solid #eee; text-align: right;">
             <button class="btn-secondary close-modal-btn">Fechar</button>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML("beforeend", modalHTML);
    
    // Add listeners
    const modal = document.getElementById("logs-modal");
    modal.querySelectorAll(".close-modal-btn").forEach(btn => {
        btn.onclick = () => modal.classList.remove("show");
    });
    modal.onclick = (e) => {
        if (e.target === modal) modal.classList.remove("show");
    };
    
    document.getElementById("download-logs-btn").onclick = () => {
        const cleanApiBase = API_BASE.replace(/\/$/, "");
        window.location.href = `${cleanApiBase}/api/logs/download`;
    };
  }
  
  const modal = document.getElementById("logs-modal");
  modal.classList.add("show");
  
  // Fetch logs
  try {
      const cleanApiBase = API_BASE.replace(/\/$/, "");
      const res = await fetch(`${cleanApiBase}/api/logs?limit=100`, {
          credentials: "include",
          headers: getAuthHeaders()
      });
      const data = await res.json();
      
      const tbody = document.querySelector("#logs-table tbody");
      tbody.innerHTML = "";
      
      if (data.logs && data.logs.length > 0) {
          data.logs.forEach(log => {
              let user = "-", action = "-", details = "-";
              
              if (log.raw) {
                  const userMatch = log.raw.match(/User: (.*?) \((.*?)\)/);
                  const actionMatch = log.raw.match(/Action: (.*?) \|/);
                  const detailsMatch = log.raw.match(/Details: (.*)/);
                  
                  if (userMatch) user = `<strong>${escapeHtml(userMatch[1])}</strong> <span style="color:#666; font-size:0.85em">(${escapeHtml(userMatch[2])})</span>`;
                  if (actionMatch) {
                    const act = actionMatch[1].trim();
                    let badgeClass = "badge-info";
                    if (act.includes("DELETE") || act.includes("FORBIDDEN")) badgeClass = "badge-danger";
                    else if (act.includes("CREATE") || act.includes("UPDATE") || act.includes("LOGIN") || act.includes("SIGNUP")) badgeClass = "badge-success";
                    action = `<span class="badge ${badgeClass}">${escapeHtml(act)}</span>`;
                  }
                  if (detailsMatch) {
                    try {
                      const parsed = JSON.parse(detailsMatch[1]);
                      if (Object.keys(parsed).length > 0) {
                        details = `<div style="display: grid; grid-template-columns: auto 1fr; gap: 2px 8px; font-size: 0.85em;">`;
                        for (const [k, v] of Object.entries(parsed)) {
                          details += `<span style="font-weight:600; color:#4a5568; text-align:right;">${escapeHtml(k)}:</span> <span style="color:#2d3748; word-break: break-all;">${escapeHtml(String(v))}</span>`;
                        }
                        details += `</div>`;
                      } else {
                        details = `<span style="color:#cbd5e0; font-size:0.85em;">-</span>`;
                      }
                    } catch (e) {
                      details = `<code style="font-size:0.85em; color:#d63384; background:#f8f9fa; padding:2px 4px; border-radius:4px;">${escapeHtml(detailsMatch[1])}</code>`;
                    }
                  }
                  
                  if (user === "-" && action === "-") details = escapeHtml(log.raw);
              }
              
              const date = log.timestamp ? new Date(log.timestamp).toLocaleString() : "-";
              
              const tr = document.createElement("tr");
              tr.style.borderBottom = "1px solid #f1f5f9";
              tr.innerHTML = `
                <td style="padding: 12px 15px; white-space: nowrap; color: #666;">${date}</td>
                <td style="padding: 12px 15px;">${user}</td>
                <td style="padding: 12px 15px;">${action}</td>
                <td style="padding: 12px 15px; word-break: break-all;">${details}</td>
              `;
              tbody.appendChild(tr);
          });
      } else {
          tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 20px; color: #666;">Nenhum log encontrado.</td></tr>';
      }
  } catch (e) {
      console.error(e);
      const tbody = document.querySelector("#logs-table tbody");
      if(tbody) tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 20px; color: #dc3545;">Erro ao carregar logs. Verifique o console.</td></tr>';
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
    const discoveryInput = document.getElementById("discovery-url");
    discoveryInput.value = data.remoteRegistryUrl || "";

    // Bloquear edição para não-admins (Gerentes)
    if (currentUser && currentUser.role !== "admin") {
      discoveryInput.disabled = true;
      discoveryInput.style.backgroundColor = "#e9ecef";
      discoveryInput.style.cursor = "not-allowed";
      discoveryInput.title = "Apenas administradores podem alterar esta configuração";
    } else {
      discoveryInput.disabled = false;
      discoveryInput.style.backgroundColor = "";
      discoveryInput.style.cursor = "";
      discoveryInput.removeAttribute("title");
    }

    // Atualizar label para refletir a nova funcionalidade
    const label = document.querySelector("label[for='discovery-url']");
    if (label) label.textContent = "URL de Registro de Servidores (JSON)";

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
  const remoteRegistryUrl = document.getElementById("discovery-url").value;
  const newInterval = parseInt(
    document.getElementById("refresh-interval").value,
  );

  // Salvar intervalo localmente
  localStorage.setItem("refresh_interval", newInterval);
  refreshInterval = newInterval;
  if (loadServersInterval) clearInterval(loadServersInterval);
  loadServersInterval = setInterval(loadServers, refreshInterval);

  // Se não for admin, não tenta salvar no backend (evita erro 403)
  if (currentUser && currentUser.role !== "admin") {
    showToast("Preferências locais salvas com sucesso!");
    closeSettingsModal();
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/api/settings`, {
      method: "POST",
      credentials: "include",
      headers: getAuthHeaders(),
      body: JSON.stringify({ remoteRegistryUrl }),
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
  let ws = null;
  let timeoutId = null;

  const resetBtn = () => {
    setTimeout(() => {
      btn.innerHTML = originalText;
      btn.style.pointerEvents = "auto";
    }, 3000);
  };

  try {
    ws = new WebSocket(wsUrl);

    // Timeout de segurança (5s)
    timeoutId = setTimeout(() => {
      if (ws.readyState !== WebSocket.OPEN) {
        ws.close();
        btn.innerHTML = "❌ Timeout";
        showToast("Tempo limite excedido ao conectar", "error");
        resetBtn();
      }
    }, 5000);

    ws.onopen = () => {
      clearTimeout(timeoutId);
      const latency = Date.now() - start;
      btn.innerHTML = `⚡ ${latency}ms`;
      showToast(`Latência: ${latency}ms`, "success");
      ws.close();
      resetBtn();
    };

    ws.onerror = (err) => {
      clearTimeout(timeoutId);
      console.error("Ping Error:", err);
      btn.innerHTML = "❌ Erro";
      showToast("Erro ao conectar (verifique HTTPS/WSS)", "error");
      resetBtn();
    };
  } catch (e) {
    console.error("Ping Exception:", e);
    btn.innerHTML = "❌ Erro";
    showToast("Erro ao iniciar teste de ping", "error");
    resetBtn();
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
