let currentUser = null;

document.addEventListener("DOMContentLoaded", () => {
  // Event Delegation para ações na tabela (editar, excluir)
  const tableBody = document.querySelector("#users-table tbody");
  if (tableBody) tableBody.addEventListener("click", handleTableActions);

  // Listeners para botões do modal de usuário
  const addUserBtn = document.getElementById("add-user-btn");
  if (addUserBtn) addUserBtn.addEventListener("click", openModal);

  const closeModalBtn = document.getElementById("close-modal-btn");
  if (closeModalBtn) closeModalBtn.addEventListener("click", closeModal);

  const cancelModalBtn = document.getElementById("cancel-modal-btn");
  if (cancelModalBtn) cancelModalBtn.addEventListener("click", closeModal);

  // Fechar modal ao clicar no overlay
  const userModal = document.getElementById("userModal");
  if (userModal) {
    userModal.addEventListener("click", (e) => {
      if (e.target === userModal) closeModal();
    });
  }

  // Listeners para o modal de confirmação
  const confirmModal = document.getElementById("confirmation-modal");
  const cancelConfirmBtn = document.getElementById("cancel-btn");

  if (cancelConfirmBtn) {
    cancelConfirmBtn.addEventListener("click", () =>
      confirmModal.classList.remove("show"),
    );
  }
  if (confirmModal) {
    confirmModal.addEventListener("click", (e) => {
      if (e.target.id === "confirmation-modal")
        confirmModal.classList.remove("show");
    });
  }

  // Verificar autenticação antes de carregar
  fetch("/auth/verify")
    .then((res) => res.json())
    .then((data) => {
      if (data.valid) {
        currentUser = data.user;
        loadUsers();
      }
    });
  setupPasswordToggles();
  injectToastStyles();
  setupPasswordStrengthMeters();
});

const modal = document.getElementById("userModal");
const form = document.getElementById("userForm");

function escapeHtml(text) {
  if (text === null || text === undefined) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
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
    if (input.parentElement.classList.contains("password-input-wrapper")) return;
    if (input.parentNode.querySelector('.password-toggle-icon')) return;

    // Criar wrapper para isolar o input e garantir centralização correta
    const wrapper = document.createElement("div");
    wrapper.className = "password-input-wrapper";
    wrapper.style.position = "relative";
    wrapper.style.width = "100%";

    input.parentNode.insertBefore(wrapper, input);
    wrapper.appendChild(input);

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

    wrapper.appendChild(icon);
  });
}

function setupPasswordStrengthMeters() {
  const passwordInputs = document.querySelectorAll('input[type="password"]');
  passwordInputs.forEach(input => {
    // Ignorar confirmação de senha
    if (input.id.includes('confirm')) return;
    if (input.dataset.strengthMeter) return;

    input.dataset.strengthMeter = "true";

    const meter = document.createElement('div');
    meter.className = 'password-strength-meter';
    meter.style.height = '4px';
    meter.style.marginTop = '4px';
    meter.style.borderRadius = '2px';
    meter.style.transition = 'width 0.3s ease-in-out, background-color 0.3s';
    meter.style.width = '0%';
    meter.style.backgroundColor = '#e9ecef';

    // Inserir após o wrapper do input (criado pelo toggle) ou após o input
    let referenceElement = input;
    if (input.parentElement.classList.contains('password-input-wrapper')) {
      referenceElement = input.parentElement;
    }
    
    if (referenceElement.parentNode) {
      referenceElement.parentNode.insertBefore(meter, referenceElement.nextSibling);
    }

    input.addEventListener('input', () => {
      const val = input.value;
      if (!val) {
        meter.style.width = '0%';
        return;
      }

      let score = 0;
      if (val.length >= 8) score++;
      if (val.length >= 12) score++;
      if (/[A-Z]/.test(val)) score++;
      if (/[0-9]/.test(val)) score++;
      if (/[^A-Za-z0-9]/.test(val)) score++;

      let color = '#dc3545'; // Fraca (Vermelho)
      let width = '30%';

      if (score >= 4) {
        color = '#28a745'; // Forte (Verde)
        width = '100%';
      } else if (score >= 2) {
        color = '#ffc107'; // Média (Amarelo)
        width = '60%';
      }

      meter.style.backgroundColor = color;
      meter.style.width = width;
    });
  });
}

function injectToastStyles() {
  const style = document.createElement('style');
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

async function loadUsers() {
  try {
    const res = await fetch("/api/users");
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const users = await res.json();

    const tbody = document.querySelector("#users-table tbody");
    tbody.innerHTML = ""; // Limpa a tabela antes de preencher

    users.forEach((user) => {
      const tr = document.createElement("tr");
      const date = new Date(user.createdAt).toLocaleDateString("pt-BR");

      let badgeClass = "badge-user";
      let roleLabel = "Usuário";
      if (user.role === "admin") {
        badgeClass = "badge-admin";
        roleLabel = "Administrador";
      } else if (user.role === "gerente") {
        badgeClass = "badge-gerente";
        roleLabel = "Gerente";
      }

      tr.innerHTML = `
        <td>
          <div class="user-info">
            <img src="https://i.pravatar.cc/40?u=${escapeHtml(user.username)}" alt="" class="avatar" />
            <span>${escapeHtml(user.name)}</span>
          </div>
        </td>
        <td>${escapeHtml(user.username)}</td>
        <td><span class="badge ${badgeClass}">${roleLabel}</span></td>
        <td>${date}</td>
        <td class="actions-cell">
          <button class="action-btn edit-user-btn" 
                  aria-label="Editar usuário ${escapeHtml(user.name)}"
                  data-user-id="${user.id}"
                  data-user-name="${escapeHtml(user.name)}"
                  data-user-username="${escapeHtml(user.username)}"
                  data-user-role="${user.role}">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path d="M5.433 13.917l1.262-3.155A4 4 0 017.58 9.42l6.92-6.918a2.121 2.121 0 013 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 01-.65-.65z" />
              <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0010 3H4.75A2.75 2.75 0 002 5.75v9.5A2.75 2.75 0 004.75 18h9.5A2.75 2.75 0 0017 15.25V10a.75.75 0 00-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5z" />
            </svg>
          </button>
          ${
            currentUser && currentUser.role === "admin"
              ? `
          <button class="action-btn delete-user-btn" 
                  aria-label="Excluir usuário ${escapeHtml(user.name)}"
                  data-user-id="${user.id}"
                  data-user-name="${escapeHtml(user.name)}">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.58.22-2.365.468a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clip-rule="evenodd" />
            </svg>
          </button>
          `
              : ""
          }
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch (error) {
    console.error("Erro ao carregar usuários:", error);
    showToast("Erro ao carregar lista de usuários.", "error");
  }
}

function handleTableActions(event) {
  const editBtn = event.target.closest(".edit-user-btn");
  if (editBtn) {
    const { userId, userName, userUsername, userRole } = editBtn.dataset;
    editUser(userId, userName, userUsername, userRole);
    return;
  }

  const deleteBtn = event.target.closest(".delete-user-btn");
  if (deleteBtn) {
    const { userId, userName } = deleteBtn.dataset;
    confirmDeleteUser(userId, userName);
    return;
  }
}

// --- Funções de Ação ---

function openModal() {
  document.getElementById("modalTitle").innerText = "Novo Usuário";
  document.getElementById("userId").value = "";
  form.reset();
  modal.classList.add("show");
}

function closeModal() {
  modal.classList.remove("show");
}

function editUser(id, name, username, role) {
  document.getElementById("modalTitle").innerText = "Editar Usuário";
  document.getElementById("userId").value = id;
  document.getElementById("userName").value = name;
  document.getElementById("userLogin").value = username;
  document.getElementById("userRole").value = role;
  document.getElementById("userPass").value = ""; // Senha não é preenchida por segurança
  if (document.getElementById("userPassConfirm")) {
    document.getElementById("userPassConfirm").value = "";
  }
  modal.classList.add("show");
}

function confirmDeleteUser(id, name) {
  const confirmModal = document.getElementById("confirmation-modal");
  const confirmBtn = document.getElementById("confirm-btn");
  const title = document.getElementById("confirmation-title");
  const message = document.getElementById("confirmation-message");

  title.textContent = `Deletar Usuário`;
  message.innerHTML = `Tem certeza que deseja deletar o usuário <strong>${name}</strong>? <br>Esta ação não pode ser desfeita.`;

  // Clonar para remover listeners antigos e evitar execuções múltiplas
  const newConfirmBtn = confirmBtn.cloneNode(true);
  confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);

  newConfirmBtn.addEventListener("click", async () => {
    try {
      const res = await fetch("/api/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      if (res.ok) {
        showToast("Usuário deletado com sucesso!");
        loadUsers();
      } else {
        const err = await res.json();
        showToast(
          `Erro ao excluir: ${err.error || "Erro desconhecido"}`,
          "error",
        );
      }
    } catch (error) {
      console.error(error);
      showToast("Erro de conexão ao deletar usuário.", "error");
    } finally {
      confirmModal.classList.remove("show");
    }
  });

  confirmModal.classList.add("show");
}

function showToast(message, type = "success") {
  const toastContainer = document.getElementById("toast-container");
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;

  toastContainer.appendChild(toast);

  setTimeout(() => toast.remove(), 3000);
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const id = document.getElementById("userId").value;
  const name = document.getElementById("userName").value;
  const username = document.getElementById("userLogin").value;
  const password = document.getElementById("userPass").value;
  const passwordConfirm = document.getElementById("userPassConfirm") ? document.getElementById("userPassConfirm").value : null;
  const role = document.getElementById("userRole").value;

  if (/\s/.test(username)) {
    showToast("O nome de usuário não pode conter espaços.", "error");
    return;
  }

  if (password && password.length < 6) {
    showToast("A senha deve ter no mínimo 6 caracteres.", "error");
    return;
  }

  if (password && passwordConfirm !== null && password !== passwordConfirm) {
    showToast("As senhas não coincidem.", "error");
    return;
  }

  const payload = { name, username, role };
  if (id) payload.id = id;
  if (password) payload.password = await hashPasswordFrontend(password);

  // Se for novo usuário, senha é obrigatória
  if (!id && !password) {
    showToast("Senha é obrigatória para novos usuários.", "error");
    return;
  }

  const res = await fetch("/api/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (res.ok) {
    closeModal();
    loadUsers();
  } else {
    const err = await res.json();
    showToast("Erro ao salvar: " + (err.error || "Erro desconhecido"), "error");
  }
});
