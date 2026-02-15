const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const db = require("./database");
const url = require("url");
const https = require("https");
const http = require("http");
const utils = require("./utils");
const sessionManager = require("./sessionManager");
const config = require("./config");
const logger = require("./logger");

// ============ CONFIGURAÇÕES E ESTADO ============

const settingsData = { remoteRegistryUrl: "" };
const loginRateLimit = new Map();
const resendRateLimit = new Map();

// ============ MONITORAMENTO E BACKGROUND TASKS ============

function checkServerHealth(server) {
  return new Promise((resolve) => {
    if (!server.host) return resolve({ isOnline: false });
    const isSecure = server.protocol === "wss";
    const transport = isSecure ? https : http;
    const port = server.port || (isSecure ? 443 : 80);

    const req = transport.get(
      {
        hostname: server.host,
        port: port,
        path: "/status",
        timeout: 3000,
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
              if (json.status === "offline") resolve({ isOnline: false });
              else resolve({ isOnline: true, clientsCount: json.clientsCount });
            } catch (e) {
              resolve({ isOnline: true });
            }
          });
        } else {
          res.resume();
          resolve({ isOnline: true });
        }
      },
    );
    req.on("timeout", () => {
      req.destroy();
      resolve({ isOnline: false });
    });
    req.on("error", () => resolve({ isOnline: false }));
  });
}

async function updateServersStatusFile() {
  try {
    const servers = await db.getAllServers();
    const healthChecks = servers.map(async (server) => {
      if (!server.host || server.status === "standby")
        return { server, health: { isOnline: null } };
      try {
        const health = await checkServerHealth(server);
        return { server, health };
      } catch (e) {
        return { server, health: { isOnline: false } };
      }
    });

    const results = await Promise.all(healthChecks);
    const updatedServers = [];

    for (const { server, health } of results) {
      const { isOnline, clientsCount } = health;

      if (isOnline !== null) {
        const newStatus = isOnline ? "active" : "inactive";
        let hasChanges = false;

        if (server.status !== newStatus) {
          server.status = newStatus;
          hasChanges = true;
          logger.info(
            `[MONITOR] Status do servidor '${server.name}' alterado para: ${newStatus.toUpperCase()}`,
          );
        }

        if (clientsCount !== undefined && server.clientsCount !== clientsCount) {
          server.clientsCount = clientsCount;
          hasChanges = true;
        }

        if (hasChanges) {
          await db.saveServer(server);
        }
      }
      updatedServers.push(server);
    }

    const publicDir = config.PUBLIC_DIR;
    if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });
    const jsonPath = path.join(publicDir, "servers-status.json");
    fs.writeFileSync(
      jsonPath,
      JSON.stringify(
        { servers: updatedServers, lastUpdated: new Date().toISOString() },
        null,
        2,
      ),
    );

    // === HISTÓRICO DE CAPACIDADE (Adicionado) ===
    try {
      const historyPath = path.join(publicDir, "servers-history.json");
      let historyData = {};
      
      // Tenta carregar histórico existente
      if (fs.existsSync(historyPath)) {
        try { historyData = JSON.parse(fs.readFileSync(historyPath, "utf8")); } catch (e) {}
      }

      const now = new Date().toISOString();
      const activeIds = new Set(updatedServers.map((s) => s.id));

      // Limpar dados de servidores deletados
      Object.keys(historyData).forEach((id) => {
        if (!activeIds.has(id)) delete historyData[id];
      });

      updatedServers.forEach((server) => {
        if (!historyData[server.id]) historyData[server.id] = [];
        
        historyData[server.id].push({ t: now, c: server.clientsCount || 0 });
        
        // Manter apenas os últimos 60 registros (aprox. 30 min de histórico com updates a cada 30s)
        if (historyData[server.id].length > 60) {
          historyData[server.id] = historyData[server.id].slice(-60);
        }
      });

      fs.writeFileSync(historyPath, JSON.stringify(historyData));
    } catch (err) {
      logger.error("Erro ao salvar histórico:", err.message);
    }
    // ============================================

    return updatedServers;
  } catch (error) {
    logger.error("Erro ao atualizar JSON de status:", error.message);
    return [];
  }
}

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
            const remoteList = Array.isArray(json)
              ? json
              : Array.isArray(json.servers)
                ? json.servers
                : [json];
            const localServers = await db.getAllServers();

            for (const remote of remoteList) {
              if (!remote.host || !remote.port) continue;
              let target = localServers.find(
                (s) =>
                  (remote.id && s.id === remote.id) ||
                  (s.host === remote.host && s.port === remote.port),
              );

              if (target) {
                let changed = false;
                if (remote.token && target.token !== remote.token) {
                  target.token = remote.token;
                  changed = true;
                }
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
                  logger.info(
                    `[AUTO-SYNC] Servidor '${target.name}' atualizado.`,
                  );
                }
              } else {
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
                logger.info(
                  `[AUTO-SYNC] Novo servidor '${newServer.name}' adicionado.`,
                );
              }
            }
          } catch (e) {
            logger.error("Erro no auto-sync JSON:", e.message);
          }
        });
      });
      req.on("error", () => {});
    } catch (e) {
      logger.error("Erro no auto-sync:", e);
    }
  };
  sync();
  setInterval(sync, 30000);
}

// ============ CONTROLLERS EXPORTADOS ============

async function getAuthenticatedUser(req) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    try {
      const decoded = jwt.verify(token, config.JWT_SECRET);
      return await db.getUserByUsername(decoded.username);
    } catch (e) {}
  }
  const session = sessionManager.getValidSession(req);
  if (session) {
    const user = await db.getUserByUsername(session.username);
    if (!user) return null;
    return user;
  }
  return null;
}

async function initSettings() {
  const dbSettings = await db.getSettings();
  Object.assign(settingsData, dbSettings);
  // Iniciar tarefas de fundo
  setInterval(updateServersStatusFile, 30000);
  updateServersStatusFile();
  startAutoSync();
}

// --- Auth Controllers ---

const apiHello = (req, res) => {
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(
    JSON.stringify({
      message: "API REST funcionando (via Controller)!",
      timestamp: new Date().toISOString(),
    }),
  );
};

const authLogin = async (req, res) => {
  try {
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

    const body = await utils.readBody(req);
    const { username, password } = JSON.parse(body);
    const user = await db.authenticateUser(username, password);

    if (user) {
      loginRateLimit.delete(clientIp);
      logger.audit(user, "LOGIN", {
        ip: clientIp,
        userAgent: req.headers["user-agent"],
      });
      const jwtToken = jwt.sign(
        { id: user.id, username: user.username, role: user.role },
        config.JWT_SECRET,
        { expiresIn: `${config.SESSION_DAYS}d` },
      );
      const token = sessionManager.createSession(
        username,
        clientIp,
        req.headers["user-agent"],
      );
      const secureFlag = config.NODE_ENV === "production" ? "; Secure" : "";
      res.setHeader(
        "Set-Cookie",
        `session_token=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${config.SESSION_SEC}${secureFlag}`,
      );
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          success: true,
          token: jwtToken,
          user: { username: user.username, name: user.name, role: user.role },
        }),
      );
    } else {
      limit.count++;
      loginRateLimit.set(clientIp, limit);
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Usuário ou senha inválidos" }));
    }
  } catch (err) {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Dados inválidos" }));
  }
};

const authLogout = (req, res) => {
  const session = sessionManager.getValidSession(req);
  if (session) {
    const token = utils.parseCookies(req).session_token;
    sessionManager.destroySession(token);
  }
  res.setHeader(
    "Set-Cookie",
    "session_token=; HttpOnly; SameSite=Strict; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT",
  );
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ success: true, message: "Desconectado" }));
};

const authVerify = (req, res) => {
  if (req.user) {
    const cookies = utils.parseCookies(req);
    if (cookies.session_token) {
      sessionManager.touchSession(cookies.session_token);
    }
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        valid: true,
        user: {
          name: req.user.name,
          username: req.user.username,
          id: req.user.id,
          role: req.user.role,
        },
      }),
    );
  } else {
    res.writeHead(401, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ valid: false }));
  }
};

const authSignup = async (req, res) => {
  try {
    const body = await utils.readBody(req);
    const { username, password, name, email } = JSON.parse(body);
    if (!username || !password || !name || !email) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Todos os campos são obrigatórios" }));
      return;
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "O e-mail fornecido é inválido." }));
      return;
    }

    if (password.length < 8) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({ error: "A senha deve ter pelo menos 8 caracteres." }),
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

    const verificationCode = Math.floor(
      100000 + Math.random() * 900000,
    ).toString();
    const verificationExpires = Date.now() + 15 * 60 * 1000;

    const htmlContent = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.1); border: 1px solid #e2e8f0;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px 20px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: 700; text-shadow: 0 1px 2px rgba(0,0,0,0.1);">P2P Secure Chat</h1>
          <p style="color: #e2e8f0; margin: 5px 0 0; font-size: 14px;">Painel Administrativo</p>
        </div>
        <div style="padding: 40px 30px; text-align: center;">
          <h2 style="color: #2d3748; margin-top: 0; font-size: 22px; font-weight: 600;">Verificação de E-mail</h2>
          <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
            Obrigado por se cadastrar! Para ativar sua conta e acessar o painel, utilize o código de verificação abaixo:
          </p>
          <div style="margin: 35px 0;">
            <span style="display: inline-block; font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #5a67d8; background-color: #ebf4ff; padding: 15px 35px; border-radius: 8px; border: 2px dashed #c3dafe;">
              ${verificationCode}
            </span>
          </div>
          <p style="color: #718096; font-size: 14px; margin-bottom: 5px;">
            Este código expira em <strong>15 minutos</strong>.
          </p>
          <p style="color: #a0aec0; font-size: 13px; margin-top: 20px;">
            Se você não criou uma conta, ignore este e-mail.
          </p>
        </div>
        <div style="background-color: #f7fafc; padding: 20px; text-align: center; border-top: 1px solid #edf2f7;">
          <p style="color: #cbd5e0; font-size: 12px; margin: 0;">
            &copy; ${new Date().getFullYear()} P2P Secure Chat. Enviado automaticamente pelo sistema.
          </p>
        </div>
      </div>
    `;

    const emailSent = await utils.sendEmail(
      email,
      "✨ Verifique seu e-mail - P2P Secure Chat",
      `Seu código de verificação é: ${verificationCode}`,
      htmlContent,
    );

    if (!emailSent) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          error: "Falha ao enviar e-mail. Verifique se a Senha de App do Google está configurada corretamente no .env.",
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
    logger.audit({ username: newUser.username, role: "user" }, "SIGNUP", {
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
};

const authResendCode = async (req, res) => {
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
    logger.audit(null, "RATE_LIMIT_EXCEEDED", {
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

  try {
    const body = await utils.readBody(req);
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

    const verificationCode = Math.floor(
      100000 + Math.random() * 900000,
    ).toString();
    const verificationExpires = Date.now() + 15 * 60 * 1000;

    user.verificationCode = verificationCode;
    user.verificationExpires = verificationExpires;
    await db.saveUser(user);

    const htmlContent = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.1); border: 1px solid #e2e8f0;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px 20px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: 700; text-shadow: 0 1px 2px rgba(0,0,0,0.1);">P2P Secure Chat</h1>
          <p style="color: #e2e8f0; margin: 5px 0 0; font-size: 14px;">Painel Administrativo</p>
        </div>
        <div style="padding: 40px 30px; text-align: center;">
          <h2 style="color: #2d3748; margin-top: 0; font-size: 22px; font-weight: 600;">Novo Código de Verificação</h2>
          <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
            Você solicitou um novo código de verificação. Utilize o código abaixo para continuar:
          </p>
          <div style="margin: 35px 0;">
            <span style="display: inline-block; font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #5a67d8; background-color: #ebf4ff; padding: 15px 35px; border-radius: 8px; border: 2px dashed #c3dafe;">
              ${verificationCode}
            </span>
          </div>
          <p style="color: #718096; font-size: 14px; margin-bottom: 5px;">
            Este código expira em <strong>15 minutos</strong>.
          </p>
          <p style="color: #a0aec0; font-size: 13px; margin-top: 20px;">
            Se você não solicitou este código, ignore este e-mail.
          </p>
        </div>
        <div style="background-color: #f7fafc; padding: 20px; text-align: center; border-top: 1px solid #edf2f7;">
          <p style="color: #cbd5e0; font-size: 12px; margin: 0;">
            &copy; ${new Date().getFullYear()} P2P Secure Chat. Enviado automaticamente pelo sistema.
          </p>
        </div>
      </div>
    `;

    const emailSent = await utils.sendEmail(
      email,
      "📨 Novo código de verificação - P2P Secure Chat",
      `Seu novo código de verificação é: ${verificationCode}`,
      htmlContent,
    );

    if (!emailSent) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Falha ao enviar e-mail. Verifique as credenciais SMTP." }));
      return;
    }

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ success: true, message: "Novo código enviado." }));
  } catch (e) {
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: e.message }));
  }
};

const authForgotPassword = async (req, res) => {
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

  try {
    const body = await utils.readBody(req);
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

    const htmlContent = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.1); border: 1px solid #e2e8f0;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px 20px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: 700; text-shadow: 0 1px 2px rgba(0,0,0,0.1);">P2P Secure Chat</h1>
          <p style="color: #e2e8f0; margin: 5px 0 0; font-size: 14px;">Painel Administrativo</p>
        </div>
        <div style="padding: 40px 30px; text-align: center;">
          <h2 style="color: #2d3748; margin-top: 0; font-size: 22px; font-weight: 600;">Recuperação de Senha</h2>
          <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
            Recebemos uma solicitação para redefinir a senha da sua conta. Para continuar, utilize o código de verificação abaixo:
          </p>
          <div style="margin: 35px 0;">
            <span style="display: inline-block; font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #5a67d8; background-color: #ebf4ff; padding: 15px 35px; border-radius: 8px; border: 2px dashed #c3dafe;">
              ${verificationCode}
            </span>
          </div>
          <p style="color: #718096; font-size: 14px; margin-bottom: 5px;">
            Este código expira em <strong>15 minutos</strong>.
          </p>
          <p style="color: #a0aec0; font-size: 13px; margin-top: 20px;">
            Se você não solicitou esta alteração, ignore este e-mail. Sua conta permanece segura.
          </p>
        </div>
        <div style="background-color: #f7fafc; padding: 20px; text-align: center; border-top: 1px solid #edf2f7;">
          <p style="color: #cbd5e0; font-size: 12px; margin: 0;">
            &copy; ${new Date().getFullYear()} P2P Secure Chat. Enviado automaticamente pelo sistema.
          </p>
        </div>
      </div>
    `;

    const emailSent = await utils.sendEmail(
      email,
      "🔐 Recuperação de Senha - P2P Secure Chat",
      `Seu código de verificação é: ${verificationCode}. Válido por 15 minutos.`,
      htmlContent,
    );

    if (!emailSent) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Falha ao enviar e-mail. Verifique as credenciais SMTP." }));
      return;
    }

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ success: true }));
  } catch (e) {
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: e.message }));
  }
};

const authResetPassword = async (req, res) => {
  try {
    const body = await utils.readBody(req);
    const { email, code, newPassword } = JSON.parse(body);

    if (!email || !code || !newPassword) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Dados incompletos." }));
      return;
    }

    if (newPassword.length < 8) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({ error: "A senha deve ter no mínimo 8 caracteres." }),
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
    user.isVerified = true;

    await db.saveUser(user);
    logger.audit(
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
};

const authVerifyCode = async (req, res) => {
  try {
    const body = await utils.readBody(req);
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
};

// --- Settings Controllers ---

const getSettings = (req, res) => {
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify(settingsData));
};

const updateSettings = async (req, res) => {
  if (!req.user) return utils.send401(res);
  if (req.user.role !== "admin") return utils.send403(res);
  try {
    const body = await utils.readBody(req);
    const newSettings = JSON.parse(body);
    Object.assign(settingsData, newSettings);
    for (const [key, value] of Object.entries(settingsData)) {
      await db.saveSetting(key, value);
    }
    logger.audit(req.user, "UPDATE_SETTINGS", Object.keys(newSettings));
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ success: true }));
  } catch (err) {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Dados inválidos" }));
  }
};

// --- Server Controllers ---

const getServers = async (req, res) => {
  if (!req.user) return utils.send401(res);
  if (!["admin", "gerente"].includes(req.user.role)) return utils.send403(res);
  try {
    const serversData = await db.getAllServers();
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ servers: serversData }));
  } catch (err) {
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Erro interno" }));
  }
};

const getPublicServers = async (req, res, parsedUrl) => {
  try {
    const serversData = await db.getAllServers();
    const statusFilter = parsedUrl.query.status || "active";
    let list = serversData;
    if (statusFilter !== "all")
      list = serversData.filter((s) => s.status === statusFilter);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ servers: list }));
  } catch (err) {
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Erro interno" }));
  }
};

const createServer = async (req, res) => {
  if (!req.user) return utils.send401(res);
  if (!["admin", "gerente"].includes(req.user.role)) return utils.send403(res);
  try {
    const body = await utils.readBody(req);
    const serverData = JSON.parse(body);
    if (!serverData.id) serverData.id = `server-${Date.now()}`;

    let isManualToken = true;
    if (!serverData.token || serverData.token.trim() === "") {
      serverData.token = crypto.randomBytes(16).toString("hex");
      isManualToken = false;
    }
    serverData.requiresAuth = true;
    serverData.manualToken = isManualToken;
    serverData.createdAt = new Date().toISOString();
    serverData.status = serverData.status || "active";

    const validationErrors = utils.validateServerData(serverData);
    if (validationErrors.length > 0) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({ error: "Dados inválidos", details: validationErrors }),
      );
      return;
    }

    const allServers = await db.getAllServers();
    if (
      allServers.find(
        (s) => s.name.toLowerCase() === serverData.name.toLowerCase(),
      )
    ) {
      res.writeHead(409, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          error: `Já existe um servidor com o nome '${serverData.name}'.`,
        }),
      );
      return;
    }
    if (
      allServers.find(
        (s) => s.host === serverData.host && s.port === serverData.port,
      )
    ) {
      res.writeHead(409, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          error: `Já existe um servidor configurado com o host '${serverData.host}' e porta '${serverData.port}'.`,
        }),
      );
      return;
    }

    await db.saveServer(serverData);
    logger.audit(req.user, "CREATE_SERVER", {
      id: serverData.id,
      name: serverData.name,
    });
    res.writeHead(201, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        success: true,
        message: "Servidor criado",
        server: serverData,
      }),
    );
  } catch (err) {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Dados inválidos" }));
  }
};

const updateServer = async (req, res) => {
  if (!req.user) return utils.send401(res);
  if (!["admin", "gerente"].includes(req.user.role)) return utils.send403(res);
  try {
    const body = await utils.readBody(req);
    const serverData = JSON.parse(body);
    let isManualToken = true;
    if (!serverData.token || serverData.token.trim() === "") {
      serverData.token = crypto.randomBytes(16).toString("hex");
      isManualToken = false;
    }
    serverData.requiresAuth = true;
    serverData.manualToken = isManualToken;

    const validationErrors = utils.validateServerData(serverData, true);
    if (validationErrors.length > 0) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({ error: "Dados inválidos", details: validationErrors }),
      );
      return;
    }

    const serversData = await db.getAllServers();
    const index = serversData.findIndex((s) => s.id === serverData.id);
    if (index !== -1) {
      if (
        serversData.find(
          (s) =>
            s.id !== serverData.id &&
            s.name.toLowerCase() === serverData.name.toLowerCase(),
        )
      ) {
        res.writeHead(409, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            error: `Já existe outro servidor com o nome '${serverData.name}'.`,
          }),
        );
        return;
      }
      await db.saveServer(serverData);
      logger.audit(req.user, "UPDATE_SERVER", {
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
};

const deleteServer = async (req, res) => {
  if (!req.user) return utils.send401(res);
  if (!["admin", "gerente"].includes(req.user.role)) return utils.send403(res);
  try {
    const body = await utils.readBody(req);
    const { id } = JSON.parse(body);
    if (!id) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "ID obrigatório" }));
      return;
    }
    await db.deleteServer(id);
    logger.audit(req.user, "DELETE_SERVER", { id });
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ success: true, message: "Servidor deletado" }));
  } catch (err) {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Dados inválidos" }));
  }
};

const getStats = async (req, res) => {
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
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Erro interno" }));
  }
};

const refreshServers = async (req, res) => {
  if (!req.user) return utils.send401(res);
  try {
    const updatedServers = await updateServersStatusFile();
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        success: true,
        message: "Status atualizado",
        servers: updatedServers,
      }),
    );
  } catch (err) {
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Erro ao atualizar status" }));
  }
};

// --- User Controllers ---

const getUsers = async (req, res) => {
  if (!req.user) return utils.send401(res);
  if (!["admin", "gerente"].includes(req.user.role)) return utils.send403(res);
  try {
    const users = await db.getAllUsers();
    const safeUsers = users.map((u) => ({ ...u, password: "" }));
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(safeUsers));
  } catch (e) {
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: e.message }));
  }
};

const saveUser = async (req, res) => {
  if (!req.user) return utils.send401(res);
  try {
    const body = await utils.readBody(req);
    const userData = JSON.parse(body);
    const isAdmin = req.user.role === "admin";
    let userToSave;

    if (!userData.id) {
      // === CRIAÇÃO DE NOVO USUÁRIO ===
      if (!isAdmin) {
        logger.audit(req.user, "CREATE_USER_FORBIDDEN", {});
        return utils.send403(res);
      }

      userToSave = {
        ...userData,
        id: "user-" + Date.now(),
        createdAt: new Date().toISOString(),
        isVerified: true, // Admin cria usuários já verificados
        verificationCode: null,
        verificationExpires: null,
      };

      if (userToSave.password) {
        userToSave.password = db.hashPassword(userToSave.password);
      }
    } else {
      // === EDIÇÃO DE USUÁRIO EXISTENTE ===
      const existingUser = await db.getUserById(userData.id);
      if (!existingUser) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Usuário não encontrado" }));
        return;
      }

      const isEditingSelf = userData.id === req.user.id;
      if (!isAdmin && !isEditingSelf) {
        // Gerentes podem editar outros usuários, exceto admins
        if (req.user.role === "gerente") {
          if (existingUser.role === "admin") {
            logger.audit(req.user, "UPDATE_ADMIN_FORBIDDEN", {
              targetId: userData.id,
            });
            return utils.send403(res);
          }
        } else {
          logger.audit(req.user, "UPDATE_OTHER_USER_FORBIDDEN", {
            targetId: userData.id,
          });
          return utils.send403(res);
        }
      }

      // Proteção: Não permite mudar cargo se não for admin
      if (!isAdmin && userData.role && userData.role !== req.user.role) {
        delete userData.role;
      }

      // MERGE INTELIGENTE: Mantém dados antigos (isVerified, codes, etc) e sobrescreve com novos
      userToSave = { ...existingUser, ...userData };

      // Garante que createdAt exista (correção para usuários antigos/migrados)
      if (!userToSave.createdAt) {
        userToSave.createdAt = new Date().toISOString();
      }

      // Tratamento especial para senha (só hash se mudou)
      if (userData.password && userData.password.trim() !== "") {
        userToSave.password = db.hashPassword(userData.password);
      } else {
        userToSave.password = existingUser.password;
      }
    }

    await db.saveUser(userToSave);
    logger.audit(req.user, userToSave.id ? "UPDATE_USER" : "CREATE_USER", {
      username: userToSave.username,
    });
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ success: true }));
  } catch (e) {
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: e.message }));
  }
};

const deleteUser = async (req, res) => {
  if (!req.user) return utils.send401(res);
  if (req.user.role !== "admin") return utils.send403(res);
  try {
    const body = await utils.readBody(req);
    const { id } = JSON.parse(body);
    if (id === req.user.id) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Não pode excluir a própria conta." }));
      return;
    }
    await db.deleteUser(id);
    logger.audit(req.user, "DELETE_USER", { id });
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ success: true }));
  } catch (e) {
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: e.message }));
  }
};

const getAuditLogs = async (req, res) => {
  if (!req.user) return utils.send401(res);
  // Apenas administradores podem ver os logs de auditoria
  if (req.user.role !== "admin") return utils.send403(res);

  try {
    const parsedUrl = url.parse(req.url, true);
    const limit = parseInt(parsedUrl.query.limit) || 100;
    
    const logs = logger.getAuditLogs(limit);
    
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ success: true, logs }));
  } catch (err) {
    logger.error("Erro ao recuperar logs de auditoria:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Erro interno ao ler logs." }));
  }
};

const downloadLogs = async (req, res) => {
  if (!req.user) return utils.send401(res);
  if (req.user.role !== "admin") return utils.send403(res);

  let archiver;
  try {
    archiver = require("archiver");
  } catch (e) {
    logger.error("Módulo 'archiver' não encontrado. Instale com: npm install archiver");
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Dependência 'archiver' não instalada no servidor." }));
    return;
  }

  const logDir = path.join(__dirname, "logs");
  if (!fs.existsSync(logDir)) {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Diretório de logs não encontrado." }));
    return;
  }

  const parsedUrl = url.parse(req.url, true);
  const { startDate, endDate } = parsedUrl.query;

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `logs-${timestamp}.zip`;

  res.writeHead(200, {
    "Content-Type": "application/zip",
    "Content-Disposition": `attachment; filename="${filename}"`,
  });

  const archive = archiver("zip", {
    zlib: { level: 9 }, // Nível máximo de compressão
  });

  archive.on("error", (err) => logger.error("Erro ao compactar logs:", err));
  archive.pipe(res);

  if (startDate || endDate) {
    const start = startDate ? new Date(startDate).getTime() : 0;
    const end = endDate ? new Date(endDate).setUTCHours(23, 59, 59, 999) : Date.now();

    try {
      const files = fs.readdirSync(logDir);
      for (const file of files) {
        const filePath = path.join(logDir, file);
        if (fs.statSync(filePath).isDirectory()) continue;

        const content = fs.readFileSync(filePath, "utf8");
        const lines = content.split("\n");
        const filteredLines = lines.filter((line) => {
          if (!line.trim()) return false;
          const match = line.match(/^\[(.*?)\]/);
          if (match) {
            const logTime = new Date(match[1]).getTime();
            return logTime >= start && logTime <= end;
          }
          return false;
        });

        if (filteredLines.length > 0) {
          archive.append(filteredLines.join("\n"), { name: file });
        }
      }
    } catch (err) {
      logger.error("Erro ao filtrar logs:", err);
    }
  } else {
    archive.directory(logDir, false); // Adiciona conteúdo da pasta logs na raiz do zip
  }

  await archive.finalize();
};

module.exports = {
  getAuthenticatedUser,
  initSettings,
  // Controllers
  apiHello,
  authLogin,
  authLogout,
  authVerify,
  authSignup,
  authResendCode,
  authForgotPassword,
  authResetPassword,
  authVerifyCode,
  getSettings,
  updateSettings,
  getServers,
  getPublicServers,
  createServer,
  updateServer,
  deleteServer,
  getStats,
  refreshServers,
  getUsers,
  saveUser,
  deleteUser,
  getAuditLogs,
  downloadLogs,
};
