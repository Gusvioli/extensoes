// backend_dashboard/server.js
// Servidor HTTP para Dashboard de Servidores P2P

const http = require("http");
const url = require("url");
const db = require("./database");
const Router = require("./router");
const controllers = require("./controllers");
const middleware = require("./middleware");
const config = require("./config");
const logger = require("./logger");
const seed = require("./seed");

const router = new Router(); // Instância do Router

// ============ DEFINIÇÃO DE ROTAS (NOVO PADRÃO) ============

// GET /api/hello
router.get("/api/hello", controllers.apiHello);

// POST /auth/login
router.post("/auth/login", controllers.authLogin);

// POST /auth/signup
router.post("/auth/signup", controllers.authSignup);

// POST /auth/resend-code
router.post("/auth/resend-code", controllers.authResendCode);

// POST /auth/forgot-password
router.post("/auth/forgot-password", controllers.authForgotPassword);

// POST /auth/reset-password
router.post("/auth/reset-password", controllers.authResetPassword);

// POST /auth/verify-code
router.post("/auth/verify-code", controllers.authVerifyCode);

/**
 * Criar servidor HTTP para dashboard
 */
function createDashboardServer(httpPort) {
  const server = http.createServer(async (req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;
    // Normalizar path (remove barra final)
    const rawPath = pathname.replace(/\/+$/, "") || "/";
    // Versão lowercase para rotas de API (case-insensitive)
    const normalizedPath = rawPath.toLowerCase();

    // === APLICAÇÃO DE MIDDLEWARES GLOBAIS ===

    middleware.applyCors(req, res);
    middleware.applySecurityHeaders(res);

    // Handle preflight
    if (req.method === "OPTIONS") {
      res.writeHead(200);
      res.end();
      return;
    }

    // === MIDDLEWARE DE AUTENTICAÇÃO ===
    // Valida JWT ou Sessão e anexa o usuário ao objeto request para uso nas rotas
    await middleware.authenticate(req);

    // === NOVO ROTEAMENTO ===
    // Tenta processar a requisição com o Router modular
    // Se encontrar uma rota, executa e retorna true. Caso contrário, continua para o código legado.
    if (await router.handle(req, res)) {
      return;
    }

    // ===== ROTAS DE AUTENTICAÇÃO (LEGADO) =====

    // POST /auth/logout → Logout
    if (normalizedPath === "/auth/logout" && req.method === "POST") {
      controllers.authLogout(req, res);
      return;
    }

    // GET /auth/verify → Verificar sessão
    if (normalizedPath === "/auth/verify" && req.method === "GET") {
      controllers.authVerify(req, res);
      return;
    }

    // GET /api/settings → Obter configurações (PROTEGIDO)
    if (normalizedPath === "/api/settings" && req.method === "GET") {
      controllers.getSettings(req, res);
      return;
    }

    // POST /api/settings → Salvar configurações (PROTEGIDO)
    if (normalizedPath === "/api/settings" && req.method === "POST") {
      controllers.updateSettings(req, res);
      return;
    }

    // ===== ROTAS API (PROTEGIDAS) =====

    // GET /api/servers → Obter todos os servidores
    if (normalizedPath === "/api/servers" && req.method === "GET") {
      controllers.getServers(req, res);
      return;
    }

    // GET /api/public-servers → Obter informações públicas dos servidores (COM TOKENS)
    if (normalizedPath === "/api/public-servers" && req.method === "GET") {
      controllers.getPublicServers(req, res, parsedUrl);
      return;
    }

    // POST /api/servers → Criar novo servidor (PROTEGIDO)
    if (normalizedPath === "/api/servers" && req.method === "POST") {
      controllers.createServer(req, res);
      return;
    }

    // PUT /api/servers → Atualizar servidor (PROTEGIDO)
    if (normalizedPath === "/api/servers" && req.method === "PUT") {
      controllers.updateServer(req, res);
      return;
    }

    // DELETE /api/servers → Deletar servidor (PROTEGIDO)
    if (normalizedPath === "/api/servers" && req.method === "DELETE") {
      controllers.deleteServer(req, res);
      return;
    }

    // GET /api/stats → Estatísticas
    if (normalizedPath === "/api/stats" && req.method === "GET") {
      controllers.getStats(req, res);
      return;
    }

    // POST /api/servers/refresh → Forçar atualização de status (PROTEGIDO)
    if (normalizedPath === "/api/servers/refresh" && req.method === "POST") {
      controllers.refreshServers(req, res);
      return;
    }

    // ===== API DE USUÁRIOS (PROTEGIDA) =====

    // GET /api/users
    if (normalizedPath === "/api/users" && req.method === "GET") {
      controllers.getUsers(req, res);
      return;
    }

    // POST /api/users (Criar/Editar)
    if (normalizedPath === "/api/users" && req.method === "POST") {
      controllers.saveUser(req, res);
      return;
    }

    // DELETE /api/users
    if (normalizedPath === "/api/users" && req.method === "DELETE") {
      controllers.deleteUser(req, res);
      return;
    }

    // GET /api/logs (PROTEGIDO - ADMIN)
    if (normalizedPath === "/api/logs" && req.method === "GET") {
      controllers.getAuditLogs(req, res);
      return;
    }

    // GET /api/logs/download (PROTEGIDO - ADMIN)
    if (normalizedPath === "/api/logs/download" && req.method === "GET") {
      controllers.downloadLogs(req, res);
      return;
    }

    // ===== 404 =====
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        error: `Rota não encontrada: ${req.method} ${pathname}`,
      }),
    );
  });

  return server;
}

/**
 * Inicializar dashboard
 */
async function initDashboard(dashboardPort) {
  try {
    await db.init();

    await seed.run();

    await controllers.initSettings();
  } catch (e) {
    logger.error("Erro ao inicializar banco de dados:", e);
  }

  const dashboardServer = createDashboardServer(dashboardPort);

  dashboardServer.on("error", (e) => {
    if (e.code === "EADDRINUSE") {
      logger.error(`\n❌ Erro: A porta ${dashboardPort} já está em uso.`);
      logger.error(
        `Provavelmente o dashboard já está rodando em outra aba ou terminal.`,
      );
      logger.error(
        `Para corrigir, feche o outro processo ou use outra porta: PORT=${Number(dashboardPort) + 1} npm start\n`,
      );
      process.exit(1);
    }
  });

  const host = config.HOST;
  dashboardServer.listen(dashboardPort, host, () => {
    const timestamp = new Date().toISOString();
    const displayHost = host === "0.0.0.0" ? "localhost" : host;
    logger.info(
      `[${timestamp}] 📊 Dashboard de Servidores iniciado em http://${displayHost}:${dashboardPort}`,
    );
  });

  return dashboardServer;
}

module.exports = {
  initDashboard,
  createDashboardServer,
};

// Se executado diretamente
if (require.main === module) {
  const PORT = config.PORT;
  initDashboard(PORT);
}
