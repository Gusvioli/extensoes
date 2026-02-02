document.addEventListener("DOMContentLoaded", loadUsers);

const modal = document.getElementById("userModal");
const form = document.getElementById("userForm");

async function loadUsers() {
  try {
    const res = await fetch("/api/users");
    const users = await res.json();

    const tbody = document.querySelector("#users-table tbody");
    tbody.innerHTML = "";

    users.forEach((user) => {
      const tr = document.createElement("tr");
      const date = new Date(user.createdAt).toLocaleDateString();
      const roleClass = user.role === "admin" ? "role-admin" : "role-user";
      const roleLabel = user.role === "admin" ? "Administrador" : "Usuário";

      tr.innerHTML = `
                <td>${user.name}</td>
                <td>${user.username}</td>
                <td><span class="user-role-badge ${roleClass}">${roleLabel}</span></td>
                <td>${date}</td>
                <td>
                    <button onclick="editUser('${user.id}', '${user.name}', '${user.username}', '${user.role}')" class="btn-icon">✏️</button>
                    <button onclick="deleteUser('${user.id}')" class="btn-icon btn-delete">🗑️</button>
                </td>
            `;
      tbody.appendChild(tr);
    });
  } catch (error) {
    console.error("Erro ao carregar usuários:", error);
    alert("Erro ao carregar lista de usuários.");
  }
}

function openModal() {
  document.getElementById("modalTitle").innerText = "Novo Usuário";
  document.getElementById("userId").value = "";
  form.reset();
  modal.style.display = "flex";
}

function closeModal() {
  modal.style.display = "none";
}

window.editUser = function (id, name, username, role) {
  document.getElementById("modalTitle").innerText = "Editar Usuário";
  document.getElementById("userId").value = id;
  document.getElementById("userName").value = name;
  document.getElementById("userLogin").value = username;
  document.getElementById("userRole").value = role;
  document.getElementById("userPass").value = ""; // Senha não é preenchida por segurança
  modal.style.display = "flex";
};

window.deleteUser = async function (id) {
  if (!confirm("Tem certeza que deseja excluir este usuário?")) return;

  try {
    const res = await fetch("/api/users", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });

    if (res.ok) {
      loadUsers();
    } else {
      alert("Erro ao excluir usuário.");
    }
  } catch (error) {
    console.error(error);
  }
};

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const id = document.getElementById("userId").value;
  const name = document.getElementById("userName").value;
  const username = document.getElementById("userLogin").value;
  const password = document.getElementById("userPass").value;
  const role = document.getElementById("userRole").value;

  const payload = { name, username, role };
  if (id) payload.id = id;
  if (password) payload.password = password;

  // Se for novo usuário, senha é obrigatória
  if (!id && !password) {
    alert("Senha é obrigatória para novos usuários.");
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
    alert("Erro ao salvar: " + (err.error || "Erro desconhecido"));
  }
});
