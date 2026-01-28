#!/usr/bin/env node

/**
 * 🧪 Teste de Segurança - P2P Secure Chat
 *
 * Este script valida se o servidor está implementando corretamente
 * as medidas de segurança necessárias.
 *
 * Uso: node test-security.js [url] [token]
 * Exemplo: node test-security.js ws://localhost:8080 seu-token-aqui
 */

const WebSocket = require("ws");
const readline = require("readline");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

class SecurityTester {
  constructor(url, token) {
    this.url = url;
    this.token = token;
    this.results = {
      passed: 0,
      failed: 0,
      tests: [],
    };
  }

  log(message, type = "info") {
    const icons = {
      info: "📌",
      success: "✅",
      error: "❌",
      warning: "⚠️",
    };
    console.log(`${icons[type]} ${message}`);
  }

  async test(name, fn) {
    try {
      process.stdout.write(`🔍 Testando: ${name}... `);
      await fn();
      this.log("Passou", "success");
      this.results.passed++;
      this.results.tests.push({ name, status: "passed" });
    } catch (error) {
      this.log(`Falhou: ${error.message}`, "error");
      this.results.failed++;
      this.results.tests.push({ name, status: "failed", error: error.message });
    }
  }

  async testConnectionWithoutAuth() {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(this.url);

      ws.on("open", () => {
        // Se conectar, aguarda a mensagem "your-id"
        ws.on("message", (data) => {
          const msg = JSON.parse(data);
          if (msg.type === "your-id") {
            // Tenta enviar mensagem sem autenticar
            ws.send(
              JSON.stringify({
                target: "test",
                type: "key-exchange",
                payload: { test: "data" },
              }),
            );

            let authRequired = false;
            const timeout = setTimeout(() => {
              ws.close();
              if (authRequired) {
                resolve();
              } else {
                reject(new Error("Servidor não exigiu autenticação"));
              }
            }, 1000);

            ws.on("message", (data) => {
              const msg = JSON.parse(data);
              if (
                msg.type === "error" &&
                msg.message?.includes("Autenticação")
              ) {
                authRequired = true;
              }
            });
          }
        });
      });

      ws.on("error", reject);
    });
  }

  async testAuthenticationRequired() {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(this.url);
      let receivedId = false;
      let authPrompted = false;

      ws.on("open", () => {
        ws.on("message", (data) => {
          const msg = JSON.parse(data);

          if (msg.type === "your-id") {
            receivedId = true;
            if (msg.requiresAuth === true) {
              authPrompted = true;
            }
          }
        });

        setTimeout(() => {
          ws.close();
          if (receivedId && authPrompted) {
            resolve();
          } else {
            reject(new Error("Servidor não indicou autenticação obrigatória"));
          }
        }, 500);
      });

      ws.on("error", reject);
    });
  }

  async testInvalidToken() {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(this.url);
      let authFailed = false;

      ws.on("open", () => {
        ws.send(
          JSON.stringify({
            type: "authenticate",
            token: "token-invalido-12345",
          }),
        );

        ws.on("message", (data) => {
          const msg = JSON.parse(data);
          if (msg.type === "error" && msg.message?.includes("inválido")) {
            authFailed = true;
          }
        });

        setTimeout(() => {
          ws.close();
          if (authFailed) {
            resolve();
          } else {
            reject(new Error("Servidor aceitou token inválido"));
          }
        }, 500);
      });

      ws.on("error", reject);
    });
  }

  async testValidToken() {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(this.url);
      let authSuccess = false;

      ws.on("open", () => {
        ws.send(
          JSON.stringify({
            type: "authenticate",
            token: this.token,
          }),
        );

        ws.on("message", (data) => {
          const msg = JSON.parse(data);
          if (msg.type === "authenticated") {
            authSuccess = true;
          }
        });

        setTimeout(() => {
          ws.close();
          if (authSuccess) {
            resolve();
          } else {
            reject(new Error("Token válido foi rejeitado"));
          }
        }, 500);
      });

      ws.on("error", reject);
    });
  }

  async testIDFormat() {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(this.url);
      let idFormat = null;

      ws.on("open", () => {
        ws.on("message", (data) => {
          const msg = JSON.parse(data);
          if (msg.type === "your-id") {
            idFormat = msg.id;
          }
        });

        setTimeout(() => {
          ws.close();

          // Verifica se é hexadecimal (formato seguro)
          if (idFormat && /^[a-f0-9]{24,}$/.test(idFormat)) {
            resolve();
          } else {
            reject(new Error(`ID em formato inseguro: ${idFormat}`));
          }
        }, 500);
      });

      ws.on("error", reject);
    });
  }

  async testNoQueryStringID() {
    return new Promise((resolve, reject) => {
      // Tenta conectar com ID na query string (não deve funcionar)
      const url = this.url + "?id=custom-id";
      const ws = new WebSocket(url);
      let receivedId = null;

      ws.on("open", () => {
        ws.on("message", (data) => {
          const msg = JSON.parse(data);
          if (msg.type === "your-id") {
            receivedId = msg.id;
          }
        });

        setTimeout(() => {
          ws.close();

          // ID não deve ser 'custom-id'
          if (receivedId !== "custom-id") {
            resolve();
          } else {
            reject(new Error("Servidor aceitou ID via query string"));
          }
        }, 500);
      });

      ws.on("error", reject);
    });
  }

  async runAllTests() {
    console.log("\n" + "=".repeat(60));
    console.log("🔐 Teste de Segurança - P2P Secure Chat");
    console.log("=".repeat(60) + "\n");

    console.log(`🌐 Servidor: ${this.url}`);
    console.log(
      `🔑 Token: ${this.token.substring(0, 8)}...${this.token.slice(-4)}\n`,
    );

    await this.test("Autenticação é obrigatória", () =>
      this.testAuthenticationRequired(),
    );

    await this.test("Token inválido é rejeitado", () =>
      this.testInvalidToken(),
    );

    await this.test("Token válido é aceito", () => this.testValidToken());

    await this.test("ID está em formato seguro (hexadecimal)", () =>
      this.testIDFormat(),
    );

    await this.test("ID via query string é ignorado", () =>
      this.testNoQueryStringID(),
    );

    await this.test("Mensagens sem autenticação são rejeitadas", () =>
      this.testConnectionWithoutAuth(),
    );

    console.log("\n" + "=".repeat(60));
    console.log("📊 Resultados");
    console.log("=".repeat(60));
    console.log(`✅ Passou: ${this.results.passed}`);
    console.log(`❌ Falhou: ${this.results.failed}`);
    console.log("");

    if (this.results.failed === 0) {
      this.log("Todos os testes passaram! 🎉", "success");
    } else {
      this.log(
        `${this.results.failed} teste(s) falharam. Revise a configuração.`,
        "warning",
      );
    }

    console.log("=".repeat(60) + "\n");

    rl.close();
    process.exit(this.results.failed > 0 ? 1 : 0);
  }
}

async function main() {
  let url = process.argv[2];
  let token = process.argv[3];

  if (!url) {
    url = await question("📍 URL do servidor (ex: ws://localhost:8080): ");
  }

  if (!token) {
    token = await question("🔐 Token de autenticação: ");
  }

  const tester = new SecurityTester(url, token);
  await tester.runAllTests();
}

main().catch((error) => {
  console.error("❌ Erro:", error.message);
  rl.close();
  process.exit(1);
});
