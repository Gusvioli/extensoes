// dashboard/src/server.js
// Servidor HTTP para Dashboard de Servidores P2P

const fs = require("fs");
const path = require("path");
const http = require("http");
const url = require("url");
const crypto = require("crypto");

let serversData = [];
let usersData = [];
let sessionsData = {}; // Armazenar sessões ativas

const configFile = path.join(__dirname, "../data/servers-config.json");
const usersFile = path.join(__dirname, "../data/users.json");
const publicDir = path.join(__dirname, "../public");

/**
 * Gerar token de sessão
 */
function generateSessionToken() {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Carregar usuários autorizados
 */
function loadUsers() {
  try {
    if (fs.existsSync(usersFile)) {
      const content = fs.readFileSync(usersFile, "utf-8");
      const data = JSON.parse(content);
      usersData = data.users || [];
    }
  } catch (err) {
    console.error("Erro ao carregar usuários:", err);
    usersData = [];
  }
}

/**
 * Verificar se sessão é válida
 */
function isValidSession(token) {
  return (
    token && sessionsData[token] && Date.now() < sessionsData[token].expiresAt
  );
}

/**
 * Criar sessão
 */
function createSession(username) {
  const token = generateSessionToken();
  const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 horas
  sessionsData[token] = { username, expiresAt };
  return token;
}

/**
 * Carregar configuração de servidores
 */
function loadServersConfig() {
  try {
    if (fs.existsSync(configFile)) {
      const content = fs.readFileSync(configFile, "utf-8");
      const config = JSON.parse(content);
      serversData = config.servers || [];
    }
  } catch (err) {
    console.error("Erro ao carregar configuração de servidores:", err);
    serversData = [];
  }
}

/**
 * Salvar configuração de servidores
 */
function saveServersConfig() {
  try {
    // Criar diretório se não existir
    const dataDir = path.dirname(configFile);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const config = { servers: serversData };
    fs.writeFileSync(configFile, JSON.stringify(config, null, 2));
  } catch (err) {
    console.error("Erro ao salvar configuração de servidores:", err);
  }
}

/**
 * Obter tipo MIME baseado na extensão
 */
function getMimeType(filename) {
  const mimeTypes = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css",
    ".js": "application/javascript",
    ".json": "application/json",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".gif": "image/gif",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
  };

  const ext = path.extname(filename).toLowerCase();
  return mimeTypes[ext] || "application/octet-stream";
}

/**
 * Servir arquivo estático
 */
function serveStaticFile(filePath, res) {
  try {
    if (!fs.existsSync(filePath)) {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Arquivo não encontrado" }));
      return;
    }

    const content = fs.readFileSync(filePath);
    const mimeType = getMimeType(filePath);

    res.writeHead(200, { "Content-Type": mimeType });
    res.end(content);
  } catch (err) {
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Erro ao servir arquivo" }));
  }
}

/**
 * Criar servidor HTTP para dashboard
 */
function createDashboardServer(httpPort) {
  const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;

    // Permitir CORS
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, DELETE, OPTIONS",
    );
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization",
    );

    // Handle preflight
    if (req.method === "OPTIONS") {
      res.writeHead(200);
      res.end();
      return;
    }

    // ===== ROTAS ESTÁTICAS =====

    // GET / → Servir index.html (Dashboard Administrativo)
    if (
      (pathname === "/" || pathname === "/index.html") &&
      req.method === "GET"
    ) {
      const indexPath = path.join(publicDir, "index.html");
      serveStaticFile(indexPath, res);
      return;
    }

    // GET /view.html → Servir view.html (Página Pública)
    if (
      (pathname === "/view.html" || pathname === "/view") &&
      req.method === "GET"
    ) {
      const viewPath = path.join(publicDir, "view.html");
      serveStaticFile(viewPath, res);
      return;
    }

    // GET /css/* → Servir CSS
    if (pathname.startsWith("/css/") && req.method === "GET") {
      const cssPath = path.join(publicDir, pathname);
      serveStaticFile(cssPath, res);
      return;
    }

    // GET /js/* → Servir JavaScript
    if (pathname.startsWith("/js/") && req.method === "GET") {
      const jsPath = path.join(publicDir, pathname);
      serveStaticFile(jsPath, res);
      return;
    }

    // GET /icons/* → Servir Ícones
    if (pathname.startsWith("/icons/") && req.method === "GET") {
      const iconPath = path.join(publicDir, pathname);
      serveStaticFile(iconPath, res);
      return;
    }

    // ===== ROTAS DE AUTENTICAÇÃO =====

    // POST /auth/login → Login
    if (pathname === "/auth/login" && req.method === "POST") {
      let body = "";
      req.on("data", (chunk) => {
        body += chunk.toString();
      });
      req.on("end", () => {
        try {
          const { username, password } = JSON.parse(body);
          const user = usersData.find(
            (u) => u.username === username && u.password === password,
          );

          if (user) {
            const token = createSession(username);
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(
              JSON.stringify({
                success: true,
                token,
                user: {
                  username: user.username,
                  name: user.name,
                  role: user.role,
                },
              }),
            );
          } else {
            res.writeHead(401, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Usuário ou senha inválidos" }));
          }
        } catch (err) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Dados inválidos" }));
        }
      });
      return;
    }

    // POST /auth/logout → Logout
    if (pathname === "/auth/logout" && req.method === "POST") {
      let body = "";
      req.on("data", (chunk) => {
        body += chunk.toString();
      });
      req.on("end", () => {
        try {
          const { token } = JSON.parse(body);
          delete sessionsData[token];
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ success: true, message: "Desconectado" }));
        } catch (err) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Dados inválidos" }));
        }
      });
      return;
    }

    // GET /auth/verify → Verificar sessão
    if (pathname === "/auth/verify" && req.method === "GET") {
      const token = parsedUrl.query.token;
      if (isValidSession(token)) {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            valid: true,
            username: sessionsData[token].username,
          }),
        );
      } else {
        res.writeHead(401, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ valid: false }));
      }
      return;
    }

    // ===== ROTAS API (PROTEGIDAS) =====

    // GET /api/servers → Obter todos os servidores
    if (pathname === "/api/servers" && req.method === "GET") {
      loadServersConfig();
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ servers: serversData }));
      return;
    }

    // GET /api/public-servers → Obter informações públicas dos servidores (COM TOKENS)
    if (pathname === "/api/public-servers" && req.method === "GET") {
      loadServersConfig();
      const statusFilter = parsedUrl.query.status || "active"; // 'active'|'inactive'|'standby'|'all' (padrão: apenas ativos)

      let list = serversData;
      if (statusFilter !== "all") {
        list = serversData.filter((s) => s.status === statusFilter);
      }

      // Incluir tokens para que usuários possam copiar e usar na extensão
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ servers: list }));
      return;
    }

    // POST /api/servers → Criar novo servidor (PROTEGIDO)
    if (pathname === "/api/servers" && req.method === "POST") {
      const token = parsedUrl.query.token;
      if (!isValidSession(token)) {
        res.writeHead(401, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Não autenticado" }));
        return;
      }

      let body = "";
      req.on("data", (chunk) => {
        body += chunk.toString();
      });
      req.on("end", () => {
        try {
          const serverData = JSON.parse(body);
          loadServersConfig();
          serversData.push(serverData);
          saveServersConfig();

          res.writeHead(201, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({ success: true, message: "Servidor adicionado" }),
          );
        } catch (err) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Dados inválidos" }));
        }
      });
      return;
    }

    // PUT /api/servers → Atualizar servidor (PROTEGIDO)
    if (pathname === "/api/servers" && req.method === "PUT") {
      const token = parsedUrl.query.token;
      if (!isValidSession(token)) {
        res.writeHead(401, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Não autenticado" }));
        return;
      }

      let body = "";
      req.on("data", (chunk) => {
        body += chunk.toString();
      });
      req.on("end", () => {
        try {
          const serverData = JSON.parse(body);
          loadServersConfig();

          const index = serversData.findIndex((s) => s.id === serverData.id);
          if (index !== -1) {
            serversData[index] = serverData;
            saveServersConfig();
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(
              JSON.stringify({ success: true, message: "Servidor atualizado" }),
            );
          } else {
            res.writeHead(404, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Servidor não encontrado" }));
          }
        } catch (err) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Dados inválidos" }));
        }
      });
      return;
    }

    // DELETE /api/servers → Deletar servidor (PROTEGIDO)
    if (pathname === "/api/servers" && req.method === "DELETE") {
      const token = parsedUrl.query.token;
      if (!isValidSession(token)) {
        res.writeHead(401, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Não autenticado" }));
        return;
      }

      let body = "";
      req.on("data", (chunk) => {
        body += chunk.toString();
      });
      req.on("end", () => {
        try {
          const { id } = JSON.parse(body);
          loadServersConfig();
          serversData = serversData.filter((s) => s.id !== id);
          saveServersConfig();

          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({ success: true, message: "Servidor deletado" }),
          );
        } catch (err) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Dados inválidos" }));
        }
      });
      return;
    }

    // GET /api/stats → Estatísticas
    if (pathname === "/api/stats" && req.method === "GET") {
      loadServersConfig();
      const stats = {
        total: serversData.length,
        active: serversData.filter((s) => s.status === "active").length,
        inactive: serversData.filter((s) => s.status === "inactive").length,
        standby: serversData.filter((s) => s.status === "standby").length,
      };
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(stats));
      return;
    }

    // ===== 404 =====
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Rota não encontrada" }));
  });

  return server;
}

/**
 * Inicializar dashboard
 */
function initDashboard(dashboardPort) {
  loadUsers();
  loadServersConfig();
  const dashboardServer = createDashboardServer(dashboardPort);

  dashboardServer.listen(dashboardPort, () => {
    const timestamp = new Date().toISOString();
    console.log(
      `[${timestamp}] 📊 Dashboard de Servidores iniciado em http://localhost:${dashboardPort}`,
    );
  });

  return dashboardServer;
}

module.exports = {
  initDashboard,
  createDashboardServer,
  loadServersConfig,
  saveServersConfig,
};

// Se executado diretamente
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  initDashboard(PORT);
}
