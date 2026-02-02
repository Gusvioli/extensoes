// dashboard/src/server.js
// Servidor HTTP para Dashboard de Servidores P2P

const fs = require("fs");
const path = require("path");
const http = require("http");
const https = require("https");
const url = require("url");
const crypto = require("crypto");
const net = require("net");
const db = require("./database");

let settingsData = { discoveryUrl: "http://localhost:9080/token" };
let sessionsData = {}; // Armazenar sessões ativas
let lastDiscoveryError = null; // Controle para evitar spam de logs

const publicDir = path.join(__dirname, "../public");

/**
 * Gerar token de sessão
 */
function generateSessionToken() {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Parse cookies from request
 */
function parseCookies(req) {
  const list = {};
  const cookieHeader = req.headers?.cookie;
  if (!cookieHeader) return list;

  cookieHeader.split(";").forEach(function (cookie) {
    let [name, ...rest] = cookie.split("=");
    name = name?.trim();
    if (!name) return;
    const value = rest.join("=").trim();
    if (!value) return;
    list[name] = decodeURIComponent(value);
  });
  return list;
}

/**
 * Verificar se sessão é válida
 */
function getValidSession(req) {
  const cookies = parseCookies(req);
  const token = cookies.session_token;
  return token &&
    sessionsData[token] &&
    Date.now() < sessionsData[token].expiresAt
    ? sessionsData[token]
    : null;
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
 * Validar dados do servidor
 */
function validateServerData(data, isUpdate = false) {
  const errors = [];
  if (isUpdate && (!data.id || typeof data.id !== "string")) {
    errors.push("ID do servidor é inválido.");
  }
  if (!data.name || typeof data.name !== "string" || data.name.trim() === "") {
    errors.push("O nome do servidor é obrigatório.");
  }
  // Regex simples para hostname ou IP. Pode ser melhorado.
  if (
    !data.host ||
    typeof data.host !== "string" ||
    !/^[a-zA-Z0-9.-]+$/.test(data.host)
  ) {
    errors.push("O host do servidor é inválido.");
  }
  if (
    data.port !== undefined &&
    data.port !== null &&
    String(data.port).trim() !== ""
  ) {
    const portNum = Number(data.port);
    if (
      isNaN(portNum) ||
      !Number.isInteger(portNum) ||
      portNum < 1 ||
      portNum > 65535
    ) {
      errors.push(
        "A porta do servidor deve ser um número inteiro entre 1 e 65535.",
      );
    } else {
      data.port = portNum;
    }
  } else {
    data.port = null;
  }
  if (!["ws", "wss"].includes(data.protocol)) {
    errors.push('O protocolo deve ser "ws" ou "wss".');
  }
  if (!["active", "inactive", "standby"].includes(data.status)) {
    errors.push(
      'O status é inválido (deve ser "active", "inactive" ou "standby").',
    );
  }
  if (
    typeof data.maxClients !== "number" ||
    !Number.isInteger(data.maxClients) ||
    data.maxClients < 0
  ) {
    errors.push(
      "A capacidade de clientes deve ser um número inteiro positivo.",
    );
  }
  if (
    !data.token ||
    typeof data.token !== "string" ||
    data.token.trim() === ""
  ) {
    errors.push("O token do servidor é obrigatório.");
  }

  return errors;
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
  const server = http.createServer(async (req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;

    // Permitir CORS
    // Reflete a origem da requisição para suportar credenciais futuramente, ou fallback para *
    const origin = req.headers.origin;
    res.setHeader("Access-Control-Allow-Origin", origin || "*");
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

    // GET /users.html → Página de Gerenciamento de Usuários
    if (
      (pathname === "/users.html" || pathname === "/users") &&
      req.method === "GET"
    ) {
      const usersPath = path.join(publicDir, "users.html");
      serveStaticFile(usersPath, res);
      return;
    }

    // GET /users.html → Apenas Admin
    if ((pathname === "/users.html" || pathname === "/users") && req.method === "GET") {
        // A verificação real é feita na API, mas podemos bloquear a página estática também se quisermos.
        // Por enquanto, deixamos carregar, e o JS vai falhar ao buscar dados se não for admin.
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
          
          // Usar autenticação do banco de dados
          db.authenticateUser(username, password).then(user => {
            if (user) {
              const token = createSession(username);
            // Usar HttpOnly cookie para segurança
            res.setHeader(
              "Set-Cookie",
              `session_token=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${24 * 60 * 60}`,
            ); // 24 horas
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(
              JSON.stringify({
                success: true,
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
          });
        } catch (err) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Dados inválidos" }));
        }
      });
      return;
    }

    // POST /auth/logout → Logout
    if (pathname === "/auth/logout" && req.method === "POST") {
      const session = getValidSession(req);
      if (session) {
        const token = parseCookies(req).session_token;
        delete sessionsData[token];
      }
      // Expirar o cookie
      res.setHeader(
        "Set-Cookie",
        "session_token=; HttpOnly; SameSite=Strict; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT",
      );
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: true, message: "Desconectado" }));
      return;
    }

    // GET /auth/verify → Verificar sessão
    if (pathname === "/auth/verify" && req.method === "GET") {
      const session = getValidSession(req);
      if (session) {
        // Buscar dados atualizados do usuário (para checar role, etc)
        // Como não temos getUser(username) direto, vamos assumir os dados da sessão ou buscar todos
        // Para simplificar e performance, vamos confiar na sessão por enquanto ou implementar getUser
        // Aqui vamos buscar todos para encontrar o usuário (idealmente teria um getOne)
        db.getAllUsers().then(users => {
            const user = users.find(u => u.username === session.username);
            if (user) {
                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ valid: true, user: { name: user.name, username: user.username, role: user.role } }));
            } else {
                res.writeHead(401, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ valid: false }));
            }
        });
      } else {
        res.writeHead(401, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ valid: false }));
      }
      return;
    }

    // GET /api/settings → Obter configurações (PROTEGIDO)
    if (pathname === "/api/settings" && req.method === "GET") {
      if (!getValidSession(req)) {
        res.writeHead(401, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Não autenticado" }));
        return;
      }
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(settingsData));
      return;
    }

    // POST /api/settings → Salvar configurações (PROTEGIDO)
    if (pathname === "/api/settings" && req.method === "POST") {
      if (!getValidSession(req)) {
        res.writeHead(401, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Não autenticado" }));
        return;
      }
      let body = "";
      req.on("data", (chunk) => (body += chunk));
      req.on("end", async () => {
        try {
          const newSettings = JSON.parse(body);
          settingsData = { ...settingsData, ...newSettings };

          // Salvar cada configuração no DB
          for (const [key, value] of Object.entries(settingsData)) {
            await db.saveSetting(key, value);
          }

          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ success: true }));
        } catch (err) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Dados inválidos" }));
        }
      });
      return;
    }

    // ===== ROTAS API (PROTEGIDAS) =====

    // GET /api/servers → Obter todos os servidores
    if (pathname === "/api/servers" && req.method === "GET") {
      try {
        const serversData = await db.getAllServers();
        res.writeHead(200, {
          "Content-Type": "application/json; charset=utf-8",
        });
        res.end(JSON.stringify({ servers: serversData }));
      } catch (err) {
        console.error("Erro ao obter servidores:", err.message);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Erro interno no banco de dados" }));
      }
      return;
    }

    // GET /api/public-servers → Obter informações públicas dos servidores (COM TOKENS)
    if (pathname === "/api/public-servers" && req.method === "GET") {
      try {
        const serversData = await db.getAllServers();
        const statusFilter = parsedUrl.query.status || "active"; // 'active'|'inactive'|'standby'|'all' (padrão: apenas ativos)

        let list = serversData;
        if (statusFilter !== "all") {
          list = serversData.filter((s) => s.status === statusFilter);
        }

        // Incluir tokens para que usuários possam copiar e usar na extensão
        res.writeHead(200, {
          "Content-Type": "application/json; charset=utf-8",
        });
        res.end(JSON.stringify({ servers: list }));
      } catch (err) {
        console.error("Erro ao obter servidores públicos:", err.message);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Erro interno no banco de dados" }));
      }
      return;
    }

    // POST /api/servers → Criar novo servidor (PROTEGIDO)
    if (pathname === "/api/servers" && req.method === "POST") {
      const session = getValidSession(req);
      if (!session) return send401(res);
      
      // Apenas Admin e Gerente podem criar
      const user = await getUserFromSession(session);
      if (!user || (user.role !== 'admin' && user.role !== 'gerente')) {
          return send403(res);
      }

      let body = "";
      req.on("data", (chunk) => {
        body += chunk.toString();
      });
      req.on("end", async () => {
        try {
          const serverData = JSON.parse(body);

          // Gerar ID se não existir
          if (!serverData.id) {
            serverData.id = `server-${Date.now()}`;
          }

          let isManualToken = true;

          // Gerar token automaticamente se estiver vazio
          if (
            !serverData.token ||
            typeof serverData.token !== "string" ||
            serverData.token.trim() === ""
          ) {
            serverData.token = crypto.randomBytes(16).toString("hex");
            isManualToken = false;
          }

          // Garantir que requiresAuth seja true para exibir o token no frontend
          serverData.requiresAuth = true;
          // Marcar como manual para impedir que o auto-sync sobrescreva o token
          serverData.manualToken = isManualToken;

          // Definir data de criação
          serverData.createdAt = new Date().toISOString();
          serverData.status = serverData.status || "active";

          const validationErrors = validateServerData(serverData);
          if (validationErrors.length > 0) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(
              JSON.stringify({
                error: "Dados inválidos",
                details: validationErrors,
              }),
            );
            return;
          }

          await db.saveServer(serverData);

          res.writeHead(201, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              success: true,
              message: "Servidor criado com sucesso",
              server: serverData,
            }),
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
      const session = getValidSession(req);
      if (!session) return send401(res);

      // Apenas Admin e Gerente podem editar
      const user = await getUserFromSession(session);
      if (!user || (user.role !== 'admin' && user.role !== 'gerente')) {
          return send403(res);
      }

      let body = "";
      req.on("data", (chunk) => {
        body += chunk.toString();
      });
      req.on("end", async () => {
        try {
          const serverData = JSON.parse(body);

          let isManualToken = true;

          // Gerar token automaticamente se estiver vazio
          if (
            !serverData.token ||
            typeof serverData.token !== "string" ||
            serverData.token.trim() === ""
          ) {
            serverData.token = crypto.randomBytes(16).toString("hex");
            isManualToken = false;
          }

          // Garantir que requiresAuth seja true para exibir o token no frontend
          serverData.requiresAuth = true;
          // Marcar como manual para impedir que o auto-sync sobrescreva o token
          serverData.manualToken = isManualToken;

          const validationErrors = validateServerData(serverData, true);
          if (validationErrors.length > 0) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(
              JSON.stringify({
                error: "Dados inválidos",
                details: validationErrors,
              }),
            );
            return;
          }

          // Verificar se existe
          const serversData = await db.getAllServers();
          const index = serversData.findIndex((s) => s.id === serverData.id);

          if (index !== -1) {
            await db.saveServer(serverData);
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(
              JSON.stringify({
                success: true,
                message: "Servidor atualizado",
                server: serverData,
              }),
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
      const session = getValidSession(req);
      if (!session) return send401(res);

      // Apenas Admin e Gerente podem deletar
      const user = await getUserFromSession(session);
      if (!user || (user.role !== 'admin' && user.role !== 'gerente')) {
          return send403(res);
      }

      let body = "";
      req.on("data", (chunk) => {
        body += chunk.toString();
      });
      req.on("end", async () => {
        try {
          const { id } = JSON.parse(body);
          if (!id || typeof id !== "string") {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "ID do servidor é obrigatório" }));
            return;
          }

          await db.deleteServer(id);

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
      try {
        const serversData = await db.getAllServers();
        const stats = {
          total: serversData.length,
          active: serversData.filter((s) => s.status === "active").length,
          inactive: serversData.filter((s) => s.status === "inactive").length,
          standby: serversData.filter((s) => s.status === "standby").length,
        };
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(stats));
      } catch (err) {
        console.error("Erro ao obter estatísticas:", err.message);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Erro interno no banco de dados" }));
      }
      return;
    }

    // ===== API DE USUÁRIOS (PROTEGIDA) =====

    // GET /api/users
    if (pathname === "/api/users" && req.method === "GET") {
        const session = getValidSession(req);
        if (!session) {
            res.writeHead(401, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Não autenticado" }));
            return;
        }
        
        try {
            const users = await db.getAllUsers();
            // Verificar se é admin
            const currentUser = users.find(u => u.username === session.username);
            if (!currentUser || currentUser.role !== 'admin') {
                res.writeHead(403, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ error: "Acesso negado" }));
                return;
            }

            const safeUsers = users.map(u => ({ ...u, password: '' }));
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify(safeUsers));
        } catch (e) {
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: e.message }));
        }
        return;
    }

    // POST /api/users (Criar/Editar)
    if (pathname === "/api/users" && req.method === "POST") {
        if (!getValidSession(req)) return send401(res);
        
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
            try {
                const user = JSON.parse(body);
                if (!user.id) {
                    user.id = 'user-' + Date.now();
                    user.createdAt = new Date().toISOString();
                }
                await db.saveUser(user);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true }));
            } catch (e) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: e.message }));
            }
        });
        return;
    }

    // DELETE /api/users
    if (pathname === "/api/users" && req.method === "DELETE") {
        if (!getValidSession(req)) return send401(res);
        
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
            try {
                const { id } = JSON.parse(body);
                await db.deleteUser(id);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true }));
            } catch (e) { res.writeHead(500); res.end(JSON.stringify({error: e.message})); }
        });
        return;
    }

    // ===== 404 =====
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Rota não encontrada" }));
  });

  return server;
}

/**
 * Sincronização Automática com Servidor de Sinalização
 * Monitora a porta HTTP do servidor (9080) para atualizar tokens automaticamente via rede
 */
function startAutoSync() {
  const sync = async () => {
    // 1. Sincronização Global (Discovery URL) - Apenas se configurada e válida
    if (settingsData.discoveryUrl) {
      let targetUrl;
      try {
        targetUrl = new url.URL(settingsData.discoveryUrl);
        // Se o protocolo não for http/https, assume que falta o protocolo e adiciona http://
        if (targetUrl.protocol !== "http:" && targetUrl.protocol !== "https:") {
          targetUrl = new url.URL("http://" + settingsData.discoveryUrl);
        }

        const requestModule = targetUrl.protocol === "https:" ? https : http;

        const req = requestModule.get(
          targetUrl.href,
          { timeout: 2000 },
          (res) => {
            if (res.statusCode !== 200) return;

            let data = "";
            res.on("data", (chunk) => (data += chunk));
            res.on("end", async () => {
              try {
                const info = JSON.parse(data);
                // info: { token, wsUrl, requiresAuth }

                // Extrair dados da URL do WebSocket (suporta URLs sem porta explícita)
                let protocol, host, port;
                try {
                  const parsedWs = new url.URL(info.wsUrl);
                  protocol = parsedWs.protocol.replace(":", "");
                  host = parsedWs.hostname;
                  port = parsedWs.port
                    ? parseInt(parsedWs.port, 10)
                    : protocol === "wss"
                      ? 443
                      : 80;
                } catch (e) {
                  return;
                }

                const serversData = await db.getAllServers();

                let server = serversData.find((s) => s.port === port);
                let updated = false;

                if (server) {
                  // Atualizar token se mudou ou se estava inativo
                  let shouldUpdate = false;

                  // Atualizar token APENAS se não for manual
                  if (server.token !== info.token && !server.manualToken) {
                    server.token = info.token;
                    shouldUpdate = true;
                  }

                  // Atualizar outros campos independentemente do token ser manual
                  if (server.status !== "active") {
                    server.status = "active";
                    shouldUpdate = true;
                  }
                  if (
                    info.requiresAuth !== undefined &&
                    server.requiresAuth !== info.requiresAuth
                  ) {
                    server.requiresAuth = info.requiresAuth;
                    shouldUpdate = true;
                  }
                  if (
                    info.clientsCount !== undefined &&
                    server.clientsCount !== info.clientsCount
                  ) {
                    server.clientsCount = info.clientsCount;
                    shouldUpdate = true;
                  }

                  if (shouldUpdate) {
                    updated = true;
                    server.lastSeen = new Date().toISOString();
                    const ts = new Date().toISOString();
                    console.log(
                      `[${ts}] 🔄 Auto-Sync: Servidor ${host}:${port} atualizado via Global Discovery.`,
                    );
                  }
                } else {
                  // Novo servidor detectado
                  const newServer = {
                    id: `server-${Date.now()}`,
                    name: "Servidor Local (Auto)",
                    description: "Detectado automaticamente via API HTTP",
                    host: host,
                    port: port,
                    protocol: protocol,
                    token: info.token,
                    requiresAuth: info.requiresAuth,
                    clientsCount: info.clientsCount || 0,
                    region: "Local",
                    maxClients: 10000,
                    status: "active",
                    notes: "Sincronizado automaticamente via rede",
                    lastSeen: new Date().toISOString(),
                    createdAt: new Date().toISOString(),
                  };
                  serversData.push(newServer);
                  updated = true;
                  const ts = new Date().toISOString();
                  console.log(
                    `[${ts}] ➕ Auto-Sync: Novo servidor detectado ${host}:${port}.`,
                  );
                }

                if (updated) {
                  await db.saveServer(server || newServer);
                }
              } catch (e) {
                // Ignorar erros de parse
              }
            });
          },
        );

        req.on("error", async () => {
          // Servidor offline ou porta fechada
          try {
            const serversData = await db.getAllServers();

            // Tenta inferir a porta WS (convenção: porta descoberta - 1000)
            const discoveryPort = parseInt(
              targetUrl.port || (targetUrl.protocol === "https:" ? 443 : 80),
            );
            const wsPort = discoveryPort > 1024 ? discoveryPort - 1000 : 8080;
            const host = targetUrl.hostname;

            const server = serversData.find(
              (s) =>
                (s.host === host ||
                  s.host === "127.0.0.1" ||
                  s.host === "localhost") &&
                s.port === wsPort,
            );

            if (server && server.status !== "inactive") {
              server.status = "inactive";
              await db.saveServer(server);
              const ts = new Date().toISOString();
              console.log(
                `[${ts}] 📉 Auto-Sync: Servidor ${host}:${wsPort} detectado como OFFLINE (Global Discovery).`,
              );
            }
          } catch (e) {
            // Ignorar erro de DB
          }
        });
      } catch (e) {
        // Log apenas uma vez ou use um nível de debug para não poluir o console a cada 15s
        // console.error("URL de descoberta inválida:", settingsData.discoveryUrl);
      }
    }

    // 2. Sincronização Individual (URL Token por Servidor)
    let serversData;
    try {
      serversData = await db.getAllServers();
    } catch (e) {
      return;
    }

    serversData.forEach((server) => {
      let targetUrlStr = server.urltoken;

      // Se não houver URL configurada, tenta a convenção padrão (porta + 1000)
      if (!targetUrlStr) {
        if (!server.port) return; // Se não tem porta nem URL, não há como sincronizar
        targetUrlStr = `http://${server.host}:${server.port + 1000}/token`;
      }

      let targetUrl;
      try {
        // Tenta criar URL. Se falhar, tenta adicionar http://
        try {
          targetUrl = new url.URL(targetUrlStr);
        } catch (e) {
          targetUrl = new url.URL("http://" + targetUrlStr);
        }

        // Se o protocolo não for http/https, assume que falta o protocolo e adiciona http://
        if (targetUrl.protocol !== "http:" && targetUrl.protocol !== "https:") {
          targetUrl = new url.URL("http://" + targetUrlStr);
        }
      } catch (e) {
        return;
      }

      const requestModule = targetUrl.protocol === "https:" ? https : http;

      // Helper para marcar servidor como inativo
      const markAsInactive = async (reason) => {
        const serversData = await db.getAllServers();
        const currentServer = serversData.find((s) => s.id === server.id);
        if (currentServer && currentServer.status !== "inactive") {
          currentServer.status = "inactive";
          await db.saveServer(currentServer);
          const ts = new Date().toISOString();
          console.log(
            `[${ts}] 📉 Auto-Sync: Servidor ${currentServer.name} offline (${reason}).`,
          );
        }
      };

      // Helper para verificação inteligente via TCP (Fallback)
      // Se a API HTTP falhar, verificamos se a porta principal do serviço (WebSocket) está aberta
      const checkTcpAndFallback = async (reason) => {
        if (!server.port || typeof server.port !== "number") {
          // Se não há porta definida, não marcamos como inativo automaticamente
          // pois não temos como realizar o fallback via TCP.
          return;
        }
        const socket = new net.Socket();
        socket.setTimeout(2500);

        const cleanup = () => {
          if (!socket.destroyed) socket.destroy();
        };

        socket.on("connect", async () => {
          cleanup();
          // SUCESSO TCP: O servidor está online na porta principal, mesmo que a API de token tenha falhado
          try {
            const serversData = await db.getAllServers();
            const currentServer = serversData.find((s) => s.id === server.id);
            if (currentServer) {
              let updated = false;
              if (currentServer.status !== "active") {
                currentServer.status = "active";
                updated = true;
              }
              currentServer.lastSeen = new Date().toISOString();

              if (updated) {
                await db.saveServer(currentServer);
                const ts = new Date().toISOString();
                console.log(
                  `[${ts}] ⚠️ Auto-Sync: Servidor ${currentServer.name} online via TCP (API Token falhou: ${reason}).`,
                );
              } else {
                await db.saveServer(currentServer); // Apenas atualiza lastSeen
              }
            }
          } catch (e) {
            // Ignorar erro de DB
          }
        });

        socket.on("timeout", () => {
          cleanup();
          markAsInactive(`${reason} + TCP Timeout`);
        });

        socket.on("error", (err) => {
          cleanup();
          markAsInactive(`${reason} + TCP Error`);
        });

        try {
          socket.connect(server.port, server.host);
        } catch (e) {
          markAsInactive(`${reason} + TCP Setup Error`);
        }
      };

      const req = requestModule.get(
        targetUrl.href,
        { timeout: 2000 },
        (res) => {
          if (res.statusCode !== 200) {
            checkTcpAndFallback(`HTTP ${res.statusCode}`);
            return;
          }

          let data = "";
          res.on("data", (chunk) => (data += chunk));
          res.on("end", async () => {
            try {
              const info = JSON.parse(data);

              // Validação básica
              if (!info || typeof info !== "object") {
                throw new Error("JSON inválido");
              }

              const serversData = await db.getAllServers();

              // Reencontrar servidor após reload
              const currentServer = serversData.find((s) => s.id === server.id);
              if (!currentServer) return;

              let updated = false;

              // Atualizar Token
              if (info.token) {
                if (
                  currentServer.token !== info.token &&
                  !currentServer.manualToken
                ) {
                  currentServer.token = info.token;
                  updated = true;
                }
              } else if (
                currentServer.token !== "N/A" &&
                !currentServer.manualToken
              ) {
                currentServer.token = "N/A";
                updated = true;
              }

              // Atualizar Status
              if (currentServer.status !== "active") {
                currentServer.status = "active";
                currentServer.lastSeen = new Date().toISOString();
                updated = true;
              }

              // Atualizar MaxClients se disponível
              if (info.maxClients && typeof info.maxClients === "number") {
                if (currentServer.maxClients !== info.maxClients) {
                  currentServer.maxClients = info.maxClients;
                  updated = true;
                }
              }

              // Atualizar ClientsCount se disponível
              if (
                info.clientsCount !== undefined &&
                typeof info.clientsCount === "number"
              ) {
                if (currentServer.clientsCount !== info.clientsCount) {
                  currentServer.clientsCount = info.clientsCount;
                  updated = true;
                }
              }

              // Atualizar requiresAuth
              if (
                info.requiresAuth !== undefined &&
                currentServer.requiresAuth !== info.requiresAuth
              ) {
                currentServer.requiresAuth = info.requiresAuth;
                updated = true;
              }

              // Atualizar Last Seen mesmo se nada mudou, para indicar que está vivo
              if (!updated && currentServer.status === "active") {
                currentServer.lastSeen = new Date().toISOString();
                updated = true;
              }

              if (updated) {
                await db.saveServer(currentServer);
                const ts = new Date().toISOString();
                console.log(
                  `[${ts}] 🔄 Auto-Sync: Servidor ${currentServer.name} atualizado via URL Token.`,
                );
              }
            } catch (e) {
              // Se respondeu 200 OK mas o JSON é inválido, o servidor está ONLINE (apenas a API retornou lixo)
              db.getAllServers()
                .then((serversData) => {
                  const currentServer = serversData.find(
                    (s) => s.id === server.id,
                  );
                  if (currentServer) {
                    currentServer.lastSeen = new Date().toISOString();
                    if (currentServer.status !== "active") {
                      currentServer.status = "active";
                    }
                    db.saveServer(currentServer);
                    // Não marcamos como inativo, pois a rede está funcionando
                  }
                })
                .catch(() => {});
            }
          });
        },
      );

      req.on("error", (err) => {
        checkTcpAndFallback(err.message);
      });
    });
  };

  // Executar imediatamente e a cada 15 segundos
  sync();
  setInterval(sync, 15000);
}

function send401(res) {
    res.writeHead(401, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Não autenticado" }));
}

function send403(res) {
    res.writeHead(403, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Acesso negado: Permissão insuficiente" }));
}

async function getUserFromSession(session) {
    const users = await db.getAllUsers();
    return users.find(u => u.username === session.username);
}

/**
 * Inicializar dashboard
 */
async function initDashboard(dashboardPort) {
  try {
    await db.init();
    const dbSettings = await db.getSettings();
    settingsData = { ...settingsData, ...dbSettings };
  } catch (e) {
    console.error("Erro ao inicializar banco de dados:", e);
  }

  // Iniciar sincronização automática via HTTP
  startAutoSync();

  const dashboardServer = createDashboardServer(dashboardPort);

  dashboardServer.on("error", (e) => {
    if (e.code === "EADDRINUSE") {
      console.error(`\n❌ Erro: A porta ${dashboardPort} já está em uso.`);
      console.error(
        `Provavelmente o dashboard já está rodando em outra aba ou terminal.`,
      );
      console.error(
        `Para corrigir, feche o outro processo ou use outra porta: PORT=${Number(dashboardPort) + 1} npm start\n`,
      );
      process.exit(1);
    }
  });

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
};

// Se executado diretamente
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  initDashboard(PORT);
}
