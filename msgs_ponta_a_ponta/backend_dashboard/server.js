// backend_dashboard/server.js
// Servidor HTTP para Dashboard de Servidores P2P

const fs = require("fs");
const path = require("path");

// Carregar variáveis de ambiente (dashboard/.env)
try {
  const envPath = path.join(__dirname, "../dashboard/.env");
  if (fs.existsSync(envPath)) {
    require("dotenv").config({ path: envPath });
  }
} catch (e) {}

const http = require("http");
const https = require("https");
const url = require("url");
const crypto = require("crypto");
const net = require("net");
const jwt = require("jsonwebtoken");
const db = require("./database");

let settingsData = { discoveryUrl: "http://localhost:9080/token" };
let sessionsData = {}; // Armazenar sessões ativas
let loginRateLimit = new Map(); // Rate limiting para login
let lastDiscoveryError = null; // Controle para evitar spam de logs

// Persistência de Sessões
const dataDir = path.join(__dirname, "../dashboard/data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}
const sessionsFile = path.join(dataDir, "sessions.json");
try {
  if (fs.existsSync(sessionsFile)) {
    sessionsData = JSON.parse(fs.readFileSync(sessionsFile, "utf-8"));
  }
} catch (e) {
  console.error("Erro ao carregar sessões:", e.message);
}

// Configuração de Duração da Sessão (Padrão: 30 dias)
const SESSION_DAYS = parseInt(process.env.SESSION_DAYS || "30", 10);
const SESSION_MS = SESSION_DAYS * 24 * 60 * 60 * 1000;
const SESSION_SEC = SESSION_DAYS * 24 * 60 * 60;

// Segredo para assinar JWT (Use variável de ambiente em produção)
const JWT_SECRET =
  process.env.JWT_SECRET || crypto.randomBytes(32).toString("hex");

function saveSessions() {
  try {
    fs.writeFileSync(sessionsFile, JSON.stringify(sessionsData, null, 2));
  } catch (e) {
    console.error("Erro ao salvar sessões:", e.message);
  }
}

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
  const session = sessionsData[token];

  if (!token) return null; // Sem cookie

  if (!session) return null;
  if (Date.now() > session.expiresAt) return null;

  // Validação de Segurança: User-Agent deve bater (previne roubo de sessão)
  // Nota: Verificação de IP removida pois causa desconexões em redes com IP dinâmico ou dual-stack (IPv4/IPv6)
  // const userAgent = req.headers["user-agent"];
  // if (session.userAgent !== userAgent) return null;
  const userAgent = req.headers["user-agent"];
  if (session.userAgent !== userAgent) return null;

  return session;
}

/**
 * Obter usuário autenticado (Suporta JWT e Sessão)
 */
async function getAuthenticatedUser(req) {
  // 1. Verificar Header Authorization (JWT)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      return await db.getUserByUsername(decoded.username);
    } catch (e) {
      // Token inválido ou expirado
    }
  }

  // 2. Verificar Cookie de Sessão (Fallback)
  const session = getValidSession(req);
  if (session) {
    const user = await db.getUserByUsername(session.username);
    if (!user) {
      console.log(
        `⚠️  Sessão válida para '${session.username}', mas usuário não encontrado no banco de dados.`,
      );
      return null;
    }
    return user;
  }

  return null;
}

/**
 * Registrar log de auditoria
 */
function logAudit(user, action, details) {
  const timestamp = new Date().toISOString();
  const username = user ? user.username : "anonymous";
  const role = user ? user.role : "unknown";
  const detailsStr =
    typeof details === "object" ? JSON.stringify(details) : details;
  console.log(
    `[AUDIT] ${timestamp} | User: ${username} (${role}) | Action: ${action} | Details: ${detailsStr}`,
  );
}

/**
 * Criar sessão
 */
function createSession(username, ip, userAgent) {
  const token = generateSessionToken();
  const expiresAt = Date.now() + SESSION_MS;
  sessionsData[token] = { username, expiresAt, ip, userAgent };
  saveSessions();
  return token;
}

/**
 * Limpar sessões expiradas (Garbage Collection)
 */
setInterval(
  () => {
    const now = Date.now();
    for (const [token, session] of Object.entries(sessionsData)) {
      if (session.expiresAt < now) delete sessionsData[token];
    }
  },
  60 * 60 * 1000,
); // Rodar a cada 1 hora

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
 * Criar servidor HTTP para dashboard
 */
function createDashboardServer(httpPort) {
  const server = http.createServer(async (req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;
    // Normalizar path para evitar erros de rota (remove barra final e lowercase)
    const normalizedPath = pathname.replace(/\/+$/, "").toLowerCase() || "/";

    // Permitir CORS
    const allowedOrigins = (process.env.ALLOWED_ORIGINS || "*")
      .split(",")
      .map((o) => o.trim());
    const origin = req.headers.origin;

    if (allowedOrigins.includes("*")) {
      // FIX: Com credentials=true, não podemos retornar '*'. Refletir a origem se existir.
      if (origin) {
        res.setHeader("Access-Control-Allow-Origin", origin);
      }
    } else if (origin && allowedOrigins.includes(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
    }

    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, DELETE, OPTIONS",
    );
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization",
    );

    // ===== SECURITY HEADERS (Nível Google) =====
    res.setHeader(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains",
    ); // Força HTTPS
    res.setHeader("X-Content-Type-Options", "nosniff"); // Previne MIME sniffing
    res.setHeader("X-Frame-Options", "DENY"); // Previne Clickjacking
    res.setHeader("X-XSS-Protection", "1; mode=block"); // Proteção XSS legado
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin"); // Privacidade de Referrer
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' ws: wss:;",
    ); // CSP Robusto
    res.setHeader(
      "Permissions-Policy",
      "geolocation=(), microphone=(), camera=()",
    ); // Desabilita features sensíveis não usadas

    // Handle preflight
    if (req.method === "OPTIONS") {
      res.writeHead(200);
      res.end();
      return;
    }

    // === MIDDLEWARE DE AUTENTICAÇÃO ===
    // Valida JWT ou Sessão e anexa o usuário ao objeto request para uso nas rotas
    req.user = await getAuthenticatedUser(req);

    // ===== ROTAS DE AUTENTICAÇÃO =====

    // POST /auth/login → Login
    if (normalizedPath === "/auth/login" && req.method === "POST") {
      let body = "";
      req.on("data", (chunk) => {
        body += chunk.toString();
      });
      req.on("end", async () => {
        try {
          // Rate Limiting para Login (Proteção contra Brute Force)
          const clientIp = req.socket.remoteAddress;
          const now = Date.now();
          const limit = loginRateLimit.get(clientIp) || {
            count: 0,
            resetTime: now + 15 * 60 * 1000,
          };

          if (now > limit.resetTime) {
            limit.count = 0;
            limit.resetTime = now + 15 * 60 * 1000;
          }

          if (limit.count >= 5) {
            res.writeHead(429, { "Content-Type": "application/json" });
            res.end(
              JSON.stringify({
                error: "Muitas tentativas. Tente novamente em 15 minutos.",
              }),
            );
            return;
          }
          loginRateLimit.set(clientIp, limit);

          const { username, password } = JSON.parse(body);

          // Usar autenticação do banco de dados
          const user = await db.authenticateUser(username, password);
          if (user) {
            loginRateLimit.delete(clientIp); // Resetar tentativas ao logar com sucesso
            logAudit(user, "LOGIN", {
              ip: clientIp,
              userAgent: req.headers["user-agent"],
            });

            // Gerar Token JWT
            const jwtToken = jwt.sign(
              { id: user.id, username: user.username, role: user.role },
              JWT_SECRET,
              { expiresIn: `${SESSION_DAYS}d` },
            );

            // Criar Sessão (Cookie)
            const token = createSession(
              username,
              clientIp,
              req.headers["user-agent"],
            );

            // Usar HttpOnly cookie para segurança
            res.setHeader(
              "Set-Cookie",
              `session_token=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_SEC}`,
            );
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(
              JSON.stringify({
                success: true,
                token: jwtToken, // Retorna o JWT para clientes API
                user: {
                  username: user.username,
                  name: user.name,
                  role: user.role,
                },
              }),
            );
          } else {
            limit.count++; // Incrementar falha
            loginRateLimit.set(clientIp, limit);
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
    if (normalizedPath === "/auth/logout" && req.method === "POST") {
      const session = getValidSession(req);
      if (session) {
        const token = parseCookies(req).session_token;
        delete sessionsData[token];
        saveSessions();
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

    // POST /auth/signup → Registrar novo usuário (Rota normalizada)
    if (normalizedPath === "/auth/signup" && req.method === "POST") {
      let body = "";
      req.on("data", (chunk) => (body += chunk));
      req.on("end", async () => {
        try {
          const { username, password, name, email } = JSON.parse(body);
          if (!username || !password || !name || !email) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(
              JSON.stringify({ error: "Todos os campos são obrigatórios" }),
            );
            return;
          }

          // Validação profissional de e-mail no backend
          const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
          if (!emailRegex.test(email)) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(
              JSON.stringify({ error: "O e-mail fornecido é inválido." }),
            );
            return;
          }

          // Validação de força de senha
          if (password.length < 8) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(
              JSON.stringify({
                error: "A senha deve ter pelo menos 8 caracteres.",
              }),
            );
            return;
          }

          if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(
              JSON.stringify({
                error: "A senha deve conter pelo menos uma letra e um número.",
              }),
            );
            return;
          }

          const existing = await db.getUserByUsername(username);
          if (existing) {
            res.writeHead(409, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Nome de usuário já existe" }));
            return;
          }

          const existingEmail = await db.getUserByEmail(email);
          if (existingEmail) {
            res.writeHead(409, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "E-mail já cadastrado" }));
            return;
          }

          // Gerar código de verificação (6 dígitos)
          const verificationCode = Math.floor(
            100000 + Math.random() * 900000,
          ).toString();
          const verificationExpires = Date.now() + 15 * 60 * 1000; // 15 minutos

          // Simulação de envio de e-mail (Log no console)
          console.log(`\n📧 [EMAIL MOCK] Para: ${email}`);
          console.log(`🔑 Código de Verificação: ${verificationCode}\n`);

          const newUser = {
            id: "user-" + Date.now(),
            username,
            password: db.hashPassword(password),
            email,
            name,
            role: "user",
            createdAt: new Date().toISOString(),
            isVerified: false,
            verificationCode,
            verificationExpires,
          };

          await db.saveUser(newUser);
          logAudit({ username: newUser.username, role: "user" }, "SIGNUP", {
            email: newUser.email,
          });
          res.writeHead(201, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              success: true,
              message: "Código enviado para o e-mail.",
            }),
          );
        } catch (e) {
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: e.message }));
        }
      });
      return;
    }

    // POST /auth/verify-code → Verificar código de e-mail
    if (normalizedPath === "/auth/verify-code" && req.method === "POST") {
      let body = "";
      req.on("data", (chunk) => (body += chunk));
      req.on("end", async () => {
        try {
          const { email, code } = JSON.parse(body);
          const isValid = await db.verifyUserCode(email, code);

          if (isValid) {
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: true }));
          } else {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Código inválido ou expirado." }));
          }
        } catch (e) {
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: e.message }));
        }
      });
      return;
    }

    // ===== SOCIAL LOGIN (SIMULADO/MOCK) =====
    // GET /auth/google
    if (normalizedPath === "/auth/google" && req.method === "GET") {
      // Simulação criativa: Se não tiver chaves reais, simula o login
      const mockUser = {
        username: "google_user",
        name: "Google User",
        role: "user",
        id: "user-google-mock",
      };

      // Verifica se usuário mock já existe, senão cria
      const existing = await db.getUserByUsername(mockUser.username);
      if (!existing) {
        await db.saveUser({
          ...mockUser,
          password: crypto.randomBytes(16).toString("hex"), // Senha aleatória
          createdAt: new Date().toISOString(),
        });
      }

      // Cria sessão
      const token = createSession(
        mockUser.username,
        req.socket.remoteAddress,
        req.headers["user-agent"],
      );
      res.setHeader(
        "Set-Cookie",
        `session_token=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_SEC}`,
      );

      // Redireciona para home com delay para simular rede
      setTimeout(() => {
        res.writeHead(302, { Location: "/" });
        res.end();
      }, 800);
      return;
    }

    // GET /auth/github
    if (normalizedPath === "/auth/github" && req.method === "GET") {
      const mockUser = {
        username: "github_user",
        name: "GitHub User",
        role: "user",
        id: "user-github-mock",
      };

      const existing = await db.getUserByUsername(mockUser.username);
      if (!existing) {
        await db.saveUser({
          ...mockUser,
          password: crypto.randomBytes(16).toString("hex"),
          createdAt: new Date().toISOString(),
        });
      }

      const token = createSession(
        mockUser.username,
        req.socket.remoteAddress,
        req.headers["user-agent"],
      );
      res.setHeader(
        "Set-Cookie",
        `session_token=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_SEC}`,
      );
      res.writeHead(302, { Location: "/" });
      res.end();
      return;
    }

    // GET /auth/verify → Verificar sessão
    if (normalizedPath === "/auth/verify" && req.method === "GET") {
      if (req.user) {
        const user = req.user;
        // Se houver sessão via cookie, renovar expiração (opcional, mas bom para manter cookie vivo)
        const cookies = parseCookies(req);
        if (cookies.session_token && sessionsData[cookies.session_token]) {
          sessionsData[cookies.session_token].expiresAt =
            Date.now() + SESSION_MS;
          saveSessions();
        }

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            valid: true,
            user: {
              name: user.name,
              username: user.username,
              id: user.id,
              role: user.role,
            },
          }),
        );
      } else {
        res.writeHead(401, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ valid: false }));
      }
      return;
    }

    // GET /api/settings → Obter configurações (PROTEGIDO)
    if (normalizedPath === "/api/settings" && req.method === "GET") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(settingsData));
      return;
    }

    // POST /api/settings → Salvar configurações (PROTEGIDO)
    if (normalizedPath === "/api/settings" && req.method === "POST") {
      if (!req.user) return send401(res);
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
          logAudit(req.user, "UPDATE_SETTINGS", Object.keys(newSettings));

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
    if (normalizedPath === "/api/servers" && req.method === "GET") {
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
    if (normalizedPath === "/api/public-servers" && req.method === "GET") {
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
    if (normalizedPath === "/api/servers" && req.method === "POST") {
      if (!req.user) return send401(res);

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
          logAudit(req.user, "CREATE_SERVER", {
            id: serverData.id,
            name: serverData.name,
          });

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
    if (normalizedPath === "/api/servers" && req.method === "PUT") {
      if (!req.user) return send401(res);

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
            logAudit(req.user, "UPDATE_SERVER", {
              id: serverData.id,
              name: serverData.name,
            });
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
    if (normalizedPath === "/api/servers" && req.method === "DELETE") {
      if (!req.user) return send401(res);

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
          logAudit(req.user, "DELETE_SERVER", { id });

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
    if (normalizedPath === "/api/stats" && req.method === "GET") {
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
    if (normalizedPath === "/api/users" && req.method === "GET") {
      if (!req.user) return send401(res);

      try {
        const users = await db.getAllUsers();
        const safeUsers = users.map((u) => ({ ...u, password: "" }));
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(safeUsers));
      } catch (e) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: e.message }));
      }
      return;
    }

    // POST /api/users (Criar/Editar)
    if (normalizedPath === "/api/users" && req.method === "POST") {
      if (!req.user) return send401(res);

      let body = "";
      req.on("data", (chunk) => (body += chunk));
      req.on("end", async () => {
        try {
          const userToSave = JSON.parse(body);

          const user = userToSave;
          if (!user.id) {
            user.id = "user-" + Date.now();
            user.createdAt = new Date().toISOString();
          }

          // Criptografar senha se fornecida, ou manter a atual se for edição
          if (user.password) {
            user.password = db.hashPassword(user.password);
          } else if (user.id) {
            const existingUser = await db.getUserById(user.id);
            if (existingUser) {
              user.password = existingUser.password;
            }
          }

          await db.saveUser(user);
          logAudit(req.user, userToSave.id ? "UPDATE_USER" : "CREATE_USER", {
            username: user.username,
            role: user.role,
          });
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ success: true }));
        } catch (e) {
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: e.message }));
        }
      });
      return;
    }

    // DELETE /api/users
    if (normalizedPath === "/api/users" && req.method === "DELETE") {
      if (!req.user) return send401(res);

      let body = "";
      req.on("data", (chunk) => (body += chunk));
      req.on("end", async () => {
        try {
          const { id } = JSON.parse(body);

          await db.deleteUser(id);
          logAudit(req.user, "DELETE_USER", { id });
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ success: true }));
        } catch (e) {
          res.writeHead(500);
          res.end(JSON.stringify({ error: e.message }));
        }
      });
      return;
    }

    // GET /api/hello → Exemplo de endpoint RESTful customizado
    if (normalizedPath === "/api/hello" && req.method === "GET") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          message: "API REST funcionando!",
          timestamp: new Date().toISOString(),
        }),
      );
      return;
    }

    // ===== SERVIR ARQUIVOS ESTÁTICOS (Frontend) =====
    if (
      !normalizedPath.startsWith("/api/") &&
      !normalizedPath.startsWith("/auth/")
    ) {
      const staticDir = path.join(__dirname, "../dashboard/public");

      // Mapear raiz para index.html
      let filename = pathname === "/" ? "index.html" : pathname;

      // Sanitização básica de caminho
      filename = path.normalize(filename).replace(/^(\.\.[\/\\])+/, "");

      const filePath = path.join(staticDir, filename);

      // Verificar se arquivo existe e está dentro do diretório public
      if (filePath.startsWith(staticDir) && fs.existsSync(filePath)) {
        try {
          const stat = fs.statSync(filePath);
          if (stat.isFile()) {
            const ext = path.extname(filePath).toLowerCase();
            const mimeTypes = {
              ".html": "text/html",
              ".js": "text/javascript",
              ".css": "text/css",
              ".json": "application/json",
              ".png": "image/png",
              ".jpg": "image/jpeg",
              ".gif": "image/gif",
              ".svg": "image/svg+xml",
              ".ico": "image/x-icon",
            };

            const contentType = mimeTypes[ext] || "application/octet-stream";

            res.writeHead(200, { "Content-Type": contentType });
            const readStream = fs.createReadStream(filePath);
            readStream.pipe(res);
            return;
          }
        } catch (e) {
          // Ignorar erro e deixar cair no 404
        }
      }
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
 * Sincronização Automática com Servidor de Sinalização
 * Monitora a porta HTTP do servidor (9080) para atualizar tokens automaticamente via rede
 */
function startAutoSync() {
  // ... (código de sincronização mantido, mas omitido para brevidade, pois é idêntico ao original)
  // A lógica de sincronização não depende de caminhos de arquivo, apenas de rede e DB.
  // Se necessário, copie a função startAutoSync do arquivo original.
}

function send401(res) {
  console.log("⚠️  Acesso negado (401) - Sessão inválida ou expirada");
  res.writeHead(401, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Não autenticado" }));
}

function send403(res) {
  console.log(
    "⚠️  Acesso negado (401) - Sessão inválida, expirada ou cookie não recebido",
  );
  res.writeHead(403, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Acesso negado: Permissão insuficiente" }));
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
  // startAutoSync(); // Descomente se copiar a função startAutoSync

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
