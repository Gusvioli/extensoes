document.addEventListener("DOMContentLoaded", () => {
  const viewLogin = document.getElementById("view-login");
  const viewSignup = document.getElementById("view-signup");
  const viewVerify = document.getElementById("view-verify");
  const linkGoSignup = document.getElementById("link-go-signup");
  const linkGoLogin = document.getElementById("link-go-login");
  const btnSignup = document.getElementById("btn-signup");
  const errorBox = document.getElementById("signup-error");
  const successBox = document.getElementById("signup-success");

  // Elementos de Verificação
  const btnVerify = document.getElementById("btn-verify");
  const verifyError = document.getElementById("verify-error");
  const verifySuccess = document.getElementById("verify-success");
  const linkBackLogin = document.getElementById("link-back-login");

  // Link dos Termos
  const termsLink = document.getElementById("link-terms");
  if (termsLink) {
    termsLink.addEventListener("click", (e) => {
      e.preventDefault();
      chrome.storage.local.get(["apiBase"], (res) => {
        const baseUrl = (res.apiBase || "http://localhost:3000").replace(
          /\/$/,
          "",
        );
        chrome.tabs.create({ url: `${baseUrl}/terms.html` });
      });
    });
  }

  // Novos elementos de UI para senha
  const signupPassInput = document.getElementById("signup-password");
  const togglePassBtn = document.getElementById("toggle-signup-pass");
  const strengthBar = document.getElementById("password-strength-bar");

  // Toggle de visibilidade da senha
  if (togglePassBtn && signupPassInput) {
    togglePassBtn.addEventListener("click", () => {
      const isPass = signupPassInput.type === "password";
      signupPassInput.type = isPass ? "text" : "password";
      togglePassBtn.textContent = isPass ? "🙈" : "👁️";
    });
  }

  // Medidor de força da senha
  if (signupPassInput && strengthBar) {
    signupPassInput.addEventListener("input", () => {
      const val = signupPassInput.value;
      let score = 0;
      if (val.length >= 8) score++;
      if (val.length >= 12) score++;
      if (/[A-Z]/.test(val)) score++;
      if (/[0-9]/.test(val)) score++;
      if (/[^A-Za-z0-9]/.test(val)) score++;

      const colors = [
        "var(--border)",
        "#ff4d4d",
        "#ff9933",
        "#ffff00",
        "#99cc33",
        "#2ecc71",
      ];
      const width = Math.min(100, (score / 5) * 100);

      strengthBar.style.width = `${width}%`;
      strengthBar.style.backgroundColor = colors[score];
    });
  }

  if (linkGoSignup) {
    linkGoSignup.addEventListener("click", (e) => {
      e.preventDefault();
      viewLogin.classList.remove("active");
      viewSignup.classList.add("active");
    });
  }

  if (linkGoLogin) {
    linkGoLogin.addEventListener("click", (e) => {
      e.preventDefault();
      viewSignup.classList.remove("active");
      viewLogin.classList.add("active");
    });
  }

  if (linkBackLogin) {
    linkBackLogin.addEventListener("click", (e) => {
      e.preventDefault();
      viewVerify.classList.remove("active");
      viewLogin.classList.add("active");
    });
  }

  if (btnSignup) {
    btnSignup.addEventListener("click", () => {
      chrome.storage.local.get(["apiBase"], async (resStorage) => {
        const name = document.getElementById("signup-name").value.trim();
        const username = document
          .getElementById("signup-username")
          .value.trim();
        const email = document.getElementById("signup-email").value.trim();
        const password = document.getElementById("signup-password").value;
        const confirmPassword = document.getElementById(
          "signup-confirm-password",
        ).value;
        const termsAccepted = document.getElementById("signup-terms").checked;

        const apiUrl = (resStorage.apiBase || "http://localhost:3000").replace(
          /\/$/,
          "",
        );

        errorBox.textContent = "";
        successBox.style.display = "none";

        if (!name || !username || !email || !password || !confirmPassword) {
          errorBox.textContent = "Preencha todos os campos.";
          return;
        }

        if (password !== confirmPassword) {
          errorBox.textContent = "As senhas não coincidem.";
          return;
        }

        if (!termsAccepted) {
          errorBox.textContent = "Você deve aceitar os Termos de Uso.";
          return;
        }

        btnSignup.disabled = true;
        btnSignup.textContent = "Cadastrando...";

        try {
          const res = await fetch(`${apiUrl}/auth/signup`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, username, email, password }),
          });

          const data = await res.json();

          if (res.ok && data.success) {
            successBox.textContent =
              "Conta criada! Enviando para verificação...";
            successBox.style.display = "block";

            // Preenche o e-mail na tela de verificação
            document.getElementById("verify-email").value = email;

            setTimeout(() => {
              viewSignup.classList.remove("active");
              viewVerify.classList.add("active");
            }, 1500);
          } else {
            errorBox.textContent = data.error || "Erro ao criar conta.";
          }
        } catch (e) {
          errorBox.textContent = "Erro de conexão: " + e.message;
        } finally {
          btnSignup.disabled = false;
          btnSignup.textContent = "Cadastrar";
        }
      });
    });
  }

  // Lógica do Botão Verificar
  if (btnVerify) {
    btnVerify.addEventListener("click", () => {
      chrome.storage.local.get(["apiBase"], async (resStorage) => {
        const email = document.getElementById("verify-email").value;
        const code = document.getElementById("verify-code").value.trim();
        const apiUrl = (resStorage.apiBase || "http://localhost:3000").replace(
          /\/$/,
          "",
        );

        verifyError.textContent = "";
        verifySuccess.style.display = "none";

        if (!code || code.length < 6) {
          verifyError.textContent = "Digite o código de 6 dígitos.";
          return;
        }

        btnVerify.disabled = true;
        btnVerify.textContent = "Verificando...";

        try {
          const res = await fetch(`${apiUrl}/auth/verify-code`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, code }),
          });
          const data = await res.json();

          if (res.ok && data.success) {
            verifySuccess.textContent = "Conta verificada! Faça login.";
            verifySuccess.style.display = "block";
            setTimeout(() => {
              viewVerify.classList.remove("active");
              viewLogin.classList.add("active");
            }, 2000);
          } else {
            verifyError.textContent = data.error || "Código inválido.";
          }
        } catch (e) {
          verifyError.textContent = "Erro de conexão.";
        } finally {
          btnVerify.disabled = false;
          btnVerify.textContent = "Verificar";
        }
      });
    });
  }
});
