// backend_dashboard/server.js
// Servidor HTTP para Dashboard de Servidores P2P

const fs = require("fs");
const path = require("path");

// Carregar variáveis de ambiente (dashboard/.env)
try {
  const envPath = path.join(__dirname, "../backend_dashboard/.env");
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

let nodemailer;
try {
  nodemailer = require("nodemailer");
} catch (e) {
  console.warn(
    "⚠️  Módulo 'nodemailer' não encontrado. E-mails serão simulados no console.",
  );
}

let settingsData = { remoteRegistryUrl: "http://localhost:9080/servers.json" };
let sessionsData = {}; // Armazenar sessões ativas
let loginRateLimit = new Map(); // Rate limiting para login
let resendRateLimit = new Map(); // Rate limiting para reenvio de código
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

  if (!token) return null; // Sem cookie

  const session = sessionsData[token];
  if (!session) return null;
  if (Date.now() > session.expiresAt) return null;

  // Validação de Segurança: User-Agent deve bater (previne roubo de sessão)
  // Nota: Verificação de IP removida pois causa desconexões em redes com IP dinâmico ou dual-stack (IPv4/IPv6)
  const userAgent = req.headers["user-agent"];
  if (session.userAgent !== userAgent) {
    console.log(
      `⚠️  Sessão inválida: User-Agent alterado (User: ${session.username})`,
    );
    return null;
  }

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
 * Template de E-mail HTML
 */
function getEmailTemplate(title, message, code) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f6f9fc; color: #333; }
    .container { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 600; letter-spacing: 0.5px; }
    .content { padding: 40px 30px; text-align: center; }
    .title { font-size: 22px; color: #2d3748; margin-bottom: 15px; font-weight: 700; }
    .text { font-size: 16px; color: #718096; line-height: 1.6; margin-bottom: 25px; }
    .code-container { background: #f7fafc; border: 2px dashed #cbd5e0; border-radius: 8px; padding: 20px; margin: 20px 0; display: inline-block; }
    .code { font-family: 'Monaco', 'Consolas', monospace; font-size: 32px; font-weight: bold; color: #5a67d8; letter-spacing: 4px; }
    .footer { background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #a0aec0; border-top: 1px solid #edf2f7; }
    .footer p { margin: 5px 0; }
    @media only screen and (max-width: 600px) {
      .container { margin: 0; border-radius: 0; width: 100%; }
      .content { padding: 20px; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔐 Dashboard P2P</h1>
    </div>
    <div class="content">
      <h2 class="title">${title}</h2>
      <p class="text">${message}</p>
      
      ${
        code
          ? `
      <div class="code-container">
        <div class="code">${code}</div>
      </div>
      <p style="font-size: 13px; color: #a0aec0; margin-top: 10px;">Este código expira em 15 minutos.</p>
      `
          : ""
      }
    </div>
    <div class="footer">
      <p>Se você não solicitou este e-mail, ignore-o com segurança.</p>
      <p>&copy; ${new Date().getFullYear()} Dashboard P2P. Todos os direitos reservados.</p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Enviar E-mail (Real ou Mock)
 */
async function sendEmail(to, subject, text, html) {
  if (!nodemailer || !process.env.SMTP_HOST || !process.env.SMTP_USER) {
    console.log(`\n📧 [EMAIL MOCK] Para: ${to}`);
    console.log(`📝 Assunto: ${subject}`);
    console.log(`🔑 Conteúdo: ${text}\n`);
    return true;
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT || 587,
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || '"Dashboard P2P" <noreply@example.com>',
      to,
      subject,
      text,
      html,
    });
    console.log(`✅ E-mail enviado para ${to}`);
    return true;
  } catch (error) {
    console.error("❌ Erro ao enviar e-mail:", error);
    return false;
  }
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

    // Em produção, é crucial que a origem corresponda exatamente para credentials=true funcionar
    const isProduction = process.env.NODE_ENV === "production";

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

            const secureFlag = isProduction ? "; Secure" : "";
            // Usar HttpOnly cookie para segurança
            res.setHeader(
              "Set-Cookie",
              `session_token=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_SEC}${secureFlag}`,
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
            console.log(
              `⚠️  Falha de login para usuário '${username}' (IP: ${clientIp})`,
            );
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

          const emailSent = await sendEmail(
            email,
            "Verifique seu e-mail - Dashboard P2P",
            `Seu código de verificação é: ${verificationCode}`,
            getEmailTemplate(
              "Verifique seu E-mail",
              "Use o código abaixo para verificar sua conta e acessar o Dashboard.",
              verificationCode,
            ),
          );

          if (!emailSent) {
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(
              JSON.stringify({
                error: "Falha ao enviar e-mail. Verifique os logs do servidor.",
              }),
            );
            return;
          }

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

    // POST /auth/resend-code → Reenviar código de verificação
    if (normalizedPath === "/auth/resend-code" && req.method === "POST") {
      // Rate Limiting (Max 3 tentativas a cada 15 min por IP)
      const clientIp = req.socket.remoteAddress;
      const now = Date.now();
      const limit = resendRateLimit.get(clientIp) || {
        count: 0,
        resetTime: now + 15 * 60 * 1000,
      };

      if (now > limit.resetTime) {
        limit.count = 0;
        limit.resetTime = now + 15 * 60 * 1000;
      }

      if (limit.count >= 3) {
        logAudit(null, "RATE_LIMIT_EXCEEDED", {
          ip: clientIp,
          endpoint: "/auth/resend-code",
        });
        res.writeHead(429, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({ error: "Muitas tentativas. Aguarde 15 minutos." }),
        );
        return;
      }
      limit.count++;
      resendRateLimit.set(clientIp, limit);

      let body = "";
      req.on("data", (chunk) => (body += chunk));
      req.on("end", async () => {
        try {
          const { email } = JSON.parse(body);
          if (!email) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "E-mail é obrigatório." }));
            return;
          }

          const user = await db.getUserByEmail(email);
          if (!user) {
            res.writeHead(404, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Usuário não encontrado." }));
            return;
          }

          // Gerar novo código
          const verificationCode = Math.floor(
            100000 + Math.random() * 900000,
          ).toString();
          const verificationExpires = Date.now() + 15 * 60 * 1000; // 15 minutos

          user.verificationCode = verificationCode;
          user.verificationExpires = verificationExpires;
          await db.saveUser(user);

          const emailSent = await sendEmail(
            email,
            "Novo código de verificação - Dashboard P2P",
            `Seu novo código de verificação é: ${verificationCode}`,
            getEmailTemplate(
              "Novo Código",
              "Você solicitou um novo código de verificação. Use-o abaixo:",
              verificationCode,
            ),
          );

          if (!emailSent) {
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Falha ao enviar e-mail." }));
            return;
          }

          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({ success: true, message: "Novo código enviado." }),
          );
        } catch (e) {
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: e.message }));
        }
      });
      return;
    }

    // POST /auth/forgot-password → Solicitar redefinição de senha
    if (normalizedPath === "/auth/forgot-password" && req.method === "POST") {
      // Rate Limiting (reutilizando lógica de resend)
      const clientIp = req.socket.remoteAddress;
      const now = Date.now();
      const limit = resendRateLimit.get(clientIp) || {
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
          JSON.stringify({ error: "Muitas tentativas. Aguarde 15 minutos." }),
        );
        return;
      }
      limit.count++;
      resendRateLimit.set(clientIp, limit);

      let body = "";
      req.on("data", (chunk) => (body += chunk));
      req.on("end", async () => {
        try {
          const { email } = JSON.parse(body);
          if (!email) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "E-mail é obrigatório." }));
            return;
          }

          const user = await db.getUserByEmail(email);
          if (!user) {
            res.writeHead(404, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "E-mail não encontrado." }));
            return;
          }

          const verificationCode = Math.floor(
            100000 + Math.random() * 900000,
          ).toString();
          const verificationExpires = Date.now() + 15 * 60 * 1000;

          user.verificationCode = verificationCode;
          user.verificationExpires = verificationExpires;
          await db.saveUser(user);

          const emailSent = await sendEmail(
            email,
            "Redefinição de Senha - Dashboard P2P",
            `Seu código para redefinir a senha é: ${verificationCode}`,
            getEmailTemplate(
              "Redefinir Senha",
              "Recebemos um pedido para redefinir sua senha. Use o código abaixo:",
              verificationCode,
            ),
          );

          if (!emailSent) {
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Falha ao enviar e-mail." }));
            return;
          }

          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ success: true }));
        } catch (e) {
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: e.message }));
        }
      });
      return;
    }

    // POST /auth/reset-password → Redefinir senha com código
    if (normalizedPath === "/auth/reset-password" && req.method === "POST") {
      let body = "";
      req.on("data", (chunk) => (body += chunk));
      req.on("end", async () => {
        try {
          const { email, code, newPassword } = JSON.parse(body);

          if (!email || !code || !newPassword) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Dados incompletos." }));
            return;
          }

          if (newPassword.length < 8) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(
              JSON.stringify({
                error: "A senha deve ter no mínimo 8 caracteres.",
              }),
            );
            return;
          }

          const user = await db.getUserByEmail(email);
          if (!user) {
            res.writeHead(404, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Usuário não encontrado." }));
            return;
          }

          if (
            user.verificationCode !== code ||
            parseInt(user.verificationExpires) < Date.now()
          ) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Código inválido ou expirado." }));
            return;
          }

          user.password = db.hashPassword(newPassword);
          user.verificationCode = null;
          user.verificationExpires = null;
          user.isVerified = true; // Garante que usuário fique verificado

          await db.saveUser(user);
          logAudit(
            { username: user.username, role: user.role },
            "RESET_PASSWORD",
            {
              email,
              ip: req.socket.remoteAddress,
              userAgent: req.headers["user-agent"],
            },
          );

          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ success: true }));
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
      if (req.user.role !== "admin") return send403(res);

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
          "Cache-Control":
            "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
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
          "Cache-Control":
            "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
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
      if (!["admin", "gerente"].includes(req.user.role)) return send403(res);

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

          // Verificação de duplicidade (Host + Porta)
          const allServers = await db.getAllServers();

          // Verificação de duplicidade de Nome
          const duplicateName = allServers.find(
            (s) => s.name.toLowerCase() === serverData.name.toLowerCase(),
          );

          if (duplicateName) {
            res.writeHead(409, { "Content-Type": "application/json" });
            res.end(
              JSON.stringify({
                error: `Já existe um servidor com o nome '${serverData.name}'.`,
              }),
            );
            return;
          }

          const duplicate = allServers.find(
            (s) => s.host === serverData.host && s.port === serverData.port,
          );

          if (duplicate) {
            res.writeHead(409, { "Content-Type": "application/json" });
            res.end(
              JSON.stringify({
                error: `Já existe um servidor configurado com o host '${serverData.host}' e porta '${serverData.port}'.`,
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
      if (!["admin", "gerente"].includes(req.user.role)) return send403(res);

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
            // Verificação de duplicidade de Nome em outros servidores
            const duplicateName = serversData.find(
              (s) =>
                s.id !== serverData.id &&
                s.name.toLowerCase() === serverData.name.toLowerCase(),
            );

            if (duplicateName) {
              res.writeHead(409, { "Content-Type": "application/json" });
              res.end(
                JSON.stringify({
                  error: `Já existe outro servidor com o nome '${serverData.name}'.`,
                }),
              );
              return;
            }

            // Verificação de duplicidade (Host + Porta) em outros servidores
            const duplicate = serversData.find(
              (s) =>
                s.id !== serverData.id &&
                s.host === serverData.host &&
                s.port === serverData.port,
            );

            if (duplicate) {
              res.writeHead(409, { "Content-Type": "application/json" });
              res.end(
                JSON.stringify({
                  error: `Já existe outro servidor configurado com o host '${serverData.host}' e porta '${serverData.port}'.`,
                }),
              );
              return;
            }

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
      if (!["admin", "gerente"].includes(req.user.role)) return send403(res);

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

    // POST /api/servers/refresh → Forçar atualização de status (PROTEGIDO)
    if (normalizedPath === "/api/servers/refresh" && req.method === "POST") {
      if (!req.user) return send401(res);

      try {
        await updateServersStatusFile();
        const updatedServers = await updateServersStatusFile();
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            success: true,
            message: "Verificação de status realizada com sucesso",
            servers: updatedServers,
          }),
        );
      } catch (err) {
        console.error("Erro ao forçar atualização:", err.message);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Erro ao atualizar status" }));
      }
      return;
    }

    // ===== API DE USUÁRIOS (PROTEGIDA) =====

    // GET /api/users
    if (normalizedPath === "/api/users" && req.method === "GET") {
      if (!req.user) return send401(res);
      if (req.user.role !== "admin") return send403(res);

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
          const isAdmin = req.user.role === "admin";

          // RBAC: Se for CRIAÇÃO de usuário (sem ID), apenas admin pode fazer
          if (!userToSave.id) {
            if (!isAdmin) {
              logAudit(req.user, "CREATE_USER_FORBIDDEN", {});
              return send403(res);
            }
            userToSave.id = "user-" + Date.now();
            userToSave.createdAt = new Date().toISOString();
          }
          // RBAC: Se for EDIÇÃO de usuário
          else {
            const isEditingSelf = userToSave.id === req.user.id;
            // Se não for admin, só pode editar a si mesmo
            if (!isAdmin && !isEditingSelf) {
              logAudit(req.user, "UPDATE_OTHER_USER_FORBIDDEN", {
                targetId: userToSave.id,
              });
              return send403(res);
            }
            // Se não for admin, não pode mudar o próprio 'role'
            if (
              !isAdmin &&
              userToSave.role &&
              userToSave.role !== req.user.role
            ) {
              logAudit(req.user, "UPDATE_ROLE_FORBIDDEN", {
                attemptedRole: userToSave.role,
              });
              // Remove silenciosamente a tentativa de elevação de privilégio
              delete userToSave.role;
            }
          }

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
      if (req.user.role !== "admin") return send403(res);

      let body = "";
      req.on("data", (chunk) => (body += chunk));
      req.on("end", async () => {
        try {
          const { id } = JSON.parse(body);

          // RBAC: Admin não pode deletar a própria conta
          if (id === req.user.id) {
            logAudit(req.user, "DELETE_SELF_FORBIDDEN", { id });
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(
              JSON.stringify({
                error: "Um administrador não pode excluir a própria conta.",
              }),
            );
            return;
          }

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
  const sync = async () => {
    try {
      const registryUrl = settingsData.remoteRegistryUrl;
      if (!registryUrl) return;

      const parsedUrl = url.parse(registryUrl);
      const lib = parsedUrl.protocol === "https:" ? https : http;

      const req = lib.get(registryUrl, (res) => {
        if (res.statusCode !== 200) {
          res.resume();
          return;
        }
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", async () => {
          try {
            const json = JSON.parse(data);
            // Suporta array direto ou objeto com propriedade 'servers' ou objeto único
            const remoteList = Array.isArray(json)
              ? json
              : Array.isArray(json.servers)
                ? json.servers
                : [json];

            const localServers = await db.getAllServers();

            for (const remote of remoteList) {
              // Validação mínima
              if (!remote.host || !remote.port) continue;

              // Tenta encontrar servidor existente por ID ou Host+Port
              let target = localServers.find(
                (s) =>
                  (remote.id && s.id === remote.id) ||
                  (s.host === remote.host && s.port === remote.port),
              );

              if (target) {
                // Atualizar existente
                let changed = false;
                if (remote.token && target.token !== remote.token) {
                  target.token = remote.token;
                  changed = true;
                }
                // Atualizar outros campos se necessário
                if (remote.name && target.name !== remote.name) {
                  target.name = remote.name;
                  changed = true;
                }
                if (remote.protocol && target.protocol !== remote.protocol) {
                  target.protocol = remote.protocol;
                  changed = true;
                }

                if (changed) {
                  await db.saveServer(target);
                  console.log(
                    `[AUTO-SYNC] Servidor '${target.name}' atualizado via Registro Remoto.`,
                  );
                }
              } else {
                // Criar novo servidor
                const newServer = {
                  id:
                    remote.id ||
                    `server-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                  name: remote.name || `Servidor ${remote.host}:${remote.port}`,
                  host: remote.host,
                  port: remote.port,
                  protocol: remote.protocol || "ws",
                  token: remote.token || "",
                  status: "active",
                  region: remote.region || "Remoto",
                  maxClients: remote.maxClients || 10000,
                  createdAt: new Date().toISOString(),
                  requiresAuth: true,
                  manualToken: false,
                };
                await db.saveServer(newServer);
                console.log(
                  `[AUTO-SYNC] Novo servidor '${newServer.name}' adicionado via Registro Remoto.`,
                );
              }
            }
          } catch (e) {
            console.error(
              "Erro ao processar JSON do registro remoto:",
              e.message,
            );
          }
        });
      });

      req.on("error", (e) => {});
    } catch (e) {
      console.error("Erro no auto-sync:", e);
    }
  };

  // Executar imediatamente e agendar
  sync();
  setInterval(sync, 30000);
}

function send401(res) {
  console.log("⚠️  Acesso negado (401) - Sessão inválida ou expirada");
  res.setHeader(
    "Set-Cookie",
    "session_token=; HttpOnly; SameSite=Lax; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT",
  );
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

// ============ MONITORAMENTO DE SERVIDORES ============
function checkServerHealth(server) {
  return new Promise((resolve) => {
    if (!server.host) return resolve(false);

    const isSecure = server.protocol === "wss";
    const transport = isSecure ? https : http;
    const port = server.port || (isSecure ? 443 : 80);

    const req = transport.get(
      {
        hostname: server.host,
        port: port,
        path: "/status",
        timeout: 3000, // Aumentado para 3s para evitar falsos negativos
        rejectUnauthorized: false,
        headers: { "User-Agent": "P2P-Dashboard-Monitor" },
      },
      (res) => {
        if (res.statusCode === 200) {
          let data = "";
          res.on("data", (chunk) => (data += chunk));
          res.on("end", () => {
            try {
              const json = JSON.parse(data);
              // Se status for explicitamente offline
              if (json.status === "offline") resolve(false);
              else resolve(true);
            } catch (e) {
              resolve(true); // 200 OK mas não JSON -> Online
            }
          });
        } else {
          res.resume();
          resolve(true); // Porta aberta, respondeu HTTP -> Online
        }
      },
    );

    req.on("timeout", () => {
      req.destroy();
      // console.log(`[MONITOR] Timeout ao conectar em ${server.name}`);
      resolve(false);
    });

    req.on("error", (err) => {
      // console.log(`[MONITOR] Erro de conexão em ${server.name}: ${err.message}`);
      resolve(false);
    });
  });
}

async function updateServersStatusFile() {
  try {
    const servers = await db.getAllServers();

    // 1. Verificação em Paralelo (Muito mais rápido)
    // Dispara todas as requisições de uma vez em vez de esperar uma por uma
    const healthChecks = servers.map(async (server) => {
      // Ignora servidores sem configuração ou em standby manual
      if (!server.host || server.status === "standby") {
        return { server, isOnline: null }; // null = manter estado atual
      }

      try {
        const isOnline = await checkServerHealth(server);
        return { server, isOnline };
      } catch (e) {
        return { server, isOnline: false };
      }
    });

    // Aguarda todas as verificações terminarem (max 3s devido ao timeout)
    const results = await Promise.all(healthChecks);
    const updatedServers = [];

    // 2. Atualização Sequencial (Seguro para o Banco de Dados)
    for (const { server, isOnline } of results) {
      if (isOnline !== null) {
        const newStatus = isOnline ? "active" : "inactive";

        if (server.status !== newStatus) {
          server.status = newStatus;
          await db.saveServer(server);
          console.log(
            `[MONITOR] Status do servidor '${server.name}' alterado para: ${newStatus.toUpperCase()}`,
          );
        }
      }
      updatedServers.push(server);
    }

    const publicDir = path.join(__dirname, "../dashboard/public");
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }

    const jsonPath = path.join(publicDir, "servers-status.json");
    const jsonData = JSON.stringify(
      { servers: updatedServers, lastUpdated: new Date().toISOString() },
      null,
      2,
    );

    fs.writeFileSync(jsonPath, jsonData);
    return updatedServers;
  } catch (error) {
    console.error("Erro ao atualizar JSON de status:", error.message);
    return [];
  }
}

/**
 * Inicializar dashboard
 */
async function initDashboard(dashboardPort) {
  try {
    await db.init();
    const dbSettings = await db.getSettings();
    settingsData = { ...settingsData, ...dbSettings };

    // Iniciar monitoramento de status (a cada 30s)
    setInterval(updateServersStatusFile, 30000);
    updateServersStatusFile(); // Executar primeira vez
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

  const host = process.env.HOST || "0.0.0.0";
  dashboardServer.listen(dashboardPort, host, () => {
    const timestamp = new Date().toISOString();
    const displayHost = host === "0.0.0.0" ? "localhost" : host;
    console.log(
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
  const PORT = process.env.PORT || 3000;
  initDashboard(PORT);
}
