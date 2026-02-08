// server/server.js

const fs = require("fs");
const path = require("path");

// Carregar variáveis de ambiente do arquivo .env
const envPath = path.join(__dirname, ".env");
try {
  if (fs.existsSync(envPath)) {
    require("dotenv").config({ path: envPath });
    console.log("✅ Variáveis de ambiente carregadas de .env");
  }
} catch (e) {
  console.warn(
    "\n⚠️  Aviso: Arquivo .env detectado, mas o módulo 'dotenv' não está instalado.",
  );
  console.warn(
    "👉 Execute 'npm install dotenv' na pasta server para carregar as variáveis.\n",
  );
}

const url = require("url");
const crypto = require("crypto");
const http = require("http");
let WebSocket;

try {
  WebSocket = require("ws");
} catch (e) {
  console.error("\n❌ Erro Crítico: O módulo 'ws' não foi encontrado.");
  console.error(
    "Isso indica que as dependências não foram instaladas no ambiente.",
  );
  console.error(
    "👉 NO RENDER: Vá em 'Settings' > 'Root Directory' e defina como 'server' (ou o nome da pasta onde está o package.json).",
  );
  console.error(
    "👉 LOCALMENTE: Entre na pasta do servidor e rode 'npm install'.\n",
  );
  process.exit(1);
}

// ============ CONFIGURAÇÕES VIA VARIÁVEIS DE AMBIENTE ============
const config = {
  port: parseInt(process.env.PORT || "8080", 10),
  host: process.env.HOST || "0.0.0.0",
  maxClients: parseInt(process.env.MAX_CLIENTS || "10000", 10),
  heartbeatInterval: parseInt(process.env.HEARTBEAT_INTERVAL || "30000", 10),
  heartbeatTimeout: parseInt(process.env.HEARTBEAT_TIMEOUT || "5000", 10),
  rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW || "1000", 10), // ms
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || "100", 10), // mensagens por janela
  enableMetrics: process.env.ENABLE_METRICS === "true", // DESABILITADO POR PADRÃO
  requireAuth: process.env.REQUIRE_AUTH !== "false", // ATIVADO POR PADRÃO
  authToken: process.env.AUTH_TOKEN || crypto.randomBytes(16).toString("hex"), // Token obrigatório
  disableDeflate: process.env.DISABLE_DEFLATE !== "false", // Proteção contra CRIME
};

// ============ MÉTRICAS E MONITORAMENTO ============
const metrics = {
  totalConnections: 0,
  totalMessages: 0,
  rejectedMessages: 0,
  startTime: Date.now(),
};

// Função para salvar token em arquivo
function saveTokenToFile() {
  try {
    const tokenFile = path.join(__dirname, "TOKEN.txt");
    const content = `🔐 P2P SECURE CHAT - TOKEN DE AUTENTICAÇÃO
=====================================

Token: ${config.authToken}

Instruções de Uso:
1. Abra a extensão Chrome
2. Cole este token no campo "Token de Autenticação"
3. Clique em "Autenticar"
4. Conecte-se normalmente

Gerado em: ${new Date().toISOString()}
Servidor: ws://${config.host === "0.0.0.0" ? "localhost" : config.host}:${config.port}
`;
    fs.writeFileSync(tokenFile, content);
    log(`Token salvo em: ${tokenFile}`, "info");
  } catch (err) {
    log(`Erro ao salvar token em arquivo: ${err.message}`, "warn");
  }
}

// Função para atualizar arquivo de status (Heartbeat)
function updateStatusFile() {
  try {
    const statusFile = path.join(__dirname, "status.json");
    const statusData = {
      status: "online",
      port: config.port,
      clientsCount: clients.size,
      uptime: Math.floor((Date.now() - metrics.startTime) / 1000),
      lastUpdated: new Date().toISOString(),
    };
    fs.writeFileSync(statusFile, JSON.stringify(statusData, null, 2));
  } catch (e) {
    console.error("Erro ao atualizar status.json:", e.message);
  }
}

// Função auxiliar para logs com timestamp
function log(message, level = "info") {
  const timestamp = new Date().toISOString();
  const prefix =
    {
      info: "✅",
      warn: "⚠️",
      error: "❌",
      debug: "🔍",
    }[level] || "📌";
  console.log(`[${timestamp}] ${prefix} ${message}`);
}

// Handler compartilhado para servir a página de token e API (funciona no Render e Local)
const requestHandler = (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Content-Type", "application/json");

  if (req.url === "/status") {
    try {
      const statusFile = path.join(__dirname, "status.json");
      if (fs.existsSync(statusFile)) {
        const statusData = fs.readFileSync(statusFile, "utf-8");
        res.writeHead(200);
        res.end(statusData);
        return;
      }
    } catch (e) {}
    res.writeHead(200);
    res.end(JSON.stringify({ status: "online", message: "Initializing" }));
    return;
  }

  // Rotas removidas conforme solicitado.
  res.writeHead(404);
  res.end(JSON.stringify({ error: "Not found" }));
};

// Servidor HTTP para servir o token (para fácil acesso)
function createTokenServer(httpPort) {
  return http.createServer(requestHandler);
}

// Inicia o servidor WebSocket com suporte a fallback de portas
let wss;
let actualPort = config.port;
const portFallbacks = [config.port, 8081, 8082, 8083, 9090, 3000];

function createServer(port) {
  return new Promise((resolve, reject) => {
    try {
      // Cria servidor HTTP que lida com requisições (Token) E upgrade para WebSocket
      const httpServer = http.createServer(requestHandler);

      const server = new WebSocket.Server({
        server: httpServer, // Anexa ao servidor HTTP
        perMessageDeflate: config.disableDeflate
          ? false // Desabilita compressão para prevenir CRIME
          : {
              serverNoContextTakeover: true,
              clientNoContextTakeover: true,
            },
      });

      // Adicionar listener de erro no WebSocket Server para evitar crash por evento não tratado
      server.on("error", (err) => {
        reject(err);
      });

      httpServer.on("listening", () => {
        actualPort = port;
        resolve(server);
      });

      httpServer.on("error", (err) => {
        reject(err);
      });

      httpServer.listen(port, config.host);
    } catch (err) {
      reject(err);
    }
  });
}

// Tenta conectar em portas até encontrar uma disponível
async function initServer() {
  for (const port of portFallbacks) {
    try {
      wss = await createServer(port);
      log(`Servidor de sinalização iniciado na porta ${port}`, "info");
      if (port !== config.port) {
        log(
          `⚠️  Porta ${config.port} estava ocupada, usando ${port} em seu lugar`,
          "warn",
        );
        config.port = port; // Atualiza a porta na configuração para consistência
      }

      // Exibe configurações de segurança
      if (config.requireAuth) {
        log(
          `⚠️  Autenticação ATIVADA. Token obrigatório: ${config.authToken.substring(0, 8)}...`,
          "warn",
        );
      } else {
        log("⚠️  Autenticação DESATIVADA (inseguro)", "warn");
      }

      if (!config.disableDeflate) {
        log("⚠️  Compressão ATIVADA (vulnerável a CRIME)", "warn");
      } else {
        log("🔒 Compressão DESABILITADA (proteção contra CRIME)", "info");
      }

      // Salva token em arquivo
      saveTokenToFile();

      // Inicia servidor HTTP para servir token
      const httpPort = port + 1000; // Usa a porta real que foi vinculada
      const httpServer = createTokenServer(httpPort);
      httpServer.listen(httpPort, config.host, () => {
        const displayHost =
          config.host === "0.0.0.0" ? "localhost" : config.host;
        log(
          `📱 Acesse http://${displayHost}:${httpPort} para ver seu token`,
          "info",
        );
      });

      // Setup dos handlers
      setupHandlers();
      return;
    } catch (err) {
      if (port === portFallbacks[portFallbacks.length - 1]) {
        log(
          `❌ Falha ao iniciar servidor em qualquer porta. Último erro: ${err.message}`,
          "error",
        );
        process.exit(1);
      }
    }
  }
}

function setupHandlers() {
  // Atualiza status imediatamente ao iniciar para garantir que status.json exista e esteja correto
  updateStatusFile();

  // Heartbeat: verifica se clientes estão vivos a cada intervalo
  const interval = setInterval(() => {
    // Atualiza arquivo de status local
    updateStatusFile();

    wss.clients.forEach((ws) => {
      if (ws.isAlive === false) {
        log(
          `Cliente ${ws.clientId} desconectado por timeout de heartbeat`,
          "warn",
        );
        return ws.terminate();
      }
      ws.isAlive = false;
      ws.ping();
    });
  }, config.heartbeatInterval);

  // Exibe métricas periodicamente se habilitado
  if (config.enableMetrics) {
    setInterval(() => {
      const uptime = Math.floor((Date.now() - metrics.startTime) / 1000);
      log(
        `[MÉTRICAS] Clientes: ${clients.size} | Mensagens: ${metrics.totalMessages} | Rejeitadas: ${metrics.rejectedMessages} | Uptime: ${uptime}s`,
        "debug",
      );
    }, 60000); // A cada 1 minuto
  }

  wss.on("connection", (ws, req) => {
    // Verifica limite máximo de clientes
    if (clients.size >= config.maxClients) {
      log(
        `Limite máximo de clientes (${config.maxClients}) atingido. Rejeitando conexão.`,
        "warn",
      );
      ws.close(1008, "Servidor lotado");
      return;
    }

    // ⚠️  MUDANÇA SEGURANÇA: NÃO aceita ID via query string
    // Gera um ID criptograficamente seguro
    const id = generateSecureId();

    clients.set(id, ws);
    ws.clientId = id; // Armazena ID no socket para referência rápida
    ws.authenticated = false; // Por padrão, não autenticado
    metrics.totalConnections++;

    // Heartbeat: marca como vivo quando recebe pong
    ws.isAlive = true;
    ws.on("pong", () => {
      ws.isAlive = true;
    });

    log(
      `Cliente conectado com ID: ${id} (Total: ${clients.size}/${config.maxClients})`,
      "info",
    );

    // Envia o ID gerado de volta para o cliente para que ele saiba quem é.
    ws.send(
      JSON.stringify({ type: "your-id", id, requiresAuth: config.requireAuth }),
    );

    ws.on("message", (messageAsString) => {
      let data;

      // Tenta fazer parse JSON
      try {
        data = JSON.parse(messageAsString);
      } catch (e) {
        metrics.rejectedMessages++;
        log(`Mensagem JSON inválida de ${id}: ${e.message}`, "warn");
        ws.send(
          JSON.stringify({
            type: "error",
            message: "Mensagem JSON inválida",
          }),
        );
        return;
      }

      // ⚠️  MUDANÇA SEGURANÇA: Validar autenticação primeiro
      if (!ws.authenticated && data.type !== "authenticate") {
        metrics.rejectedMessages++;
        log(`Cliente ${id} tentou enviar mensagem sem autenticação`, "warn");
        ws.send(
          JSON.stringify({
            type: "error",
            message: "Autenticação obrigatória",
          }),
        );
        return;
      }

      // ⚠️  MUDANÇA SEGURANÇA: Processar autenticação
      if (data.type === "authenticate") {
        if (!config.requireAuth) {
          ws.authenticated = true;
          authenticatedClients.add(id);
          log(
            `Cliente ${id} autenticado (autenticação desabilitada no servidor)`,
            "info",
          );
          ws.send(
            JSON.stringify({
              type: "authenticated",
              message: "Autenticação bem-sucedida",
            }),
          );
          return;
        }

        const { token } = data;
        if (validateAuthToken(token)) {
          ws.authenticated = true;
          authenticatedClients.add(id);
          log(`Cliente ${id} autenticado com sucesso`, "info");
          ws.send(
            JSON.stringify({
              type: "authenticated",
              message: "Autenticação bem-sucedida",
            }),
          );
          return;
        } else {
          metrics.rejectedMessages++;
          log(`Tentativa de autenticação FALHOU para cliente ${id}`, "warn");
          ws.send(
            JSON.stringify({
              type: "error",
              message: "Token de autenticação inválido",
            }),
          );
          return;
        }
      }

      // Valida estrutura da mensagem
      const validation = validateMessage(data);
      if (!validation.valid) {
        metrics.rejectedMessages++;
        log(
          `Mensagem inválida de ${id}: ${validation.errors.join(", ")}`,
          "warn",
        );
        ws.send(
          JSON.stringify({
            type: "error",
            message: `Mensagem inválida: ${validation.errors.join(", ")}`,
          }),
        );
        return;
      }

      // Verifica rate limit
      if (!checkRateLimit(id)) {
        metrics.rejectedMessages++;
        log(`Rate limit excedido para cliente ${id}`, "warn");
        ws.send(
          JSON.stringify({
            type: "error",
            message: "Muitas mensagens, aguarde um momento",
          }),
        );
        return;
      }

      const targetClient = clients.get(data.target);

      // ⚠️  MUDANÇA SEGURANÇA: Validar que o alvo existe E está autenticado
      if (
        !targetClient ||
        targetClient.readyState !== WebSocket.OPEN ||
        !targetClient.authenticated
      ) {
        metrics.rejectedMessages++;
        const reasons = [];
        if (!targetClient) reasons.push("não encontrado");
        else if (targetClient.readyState !== WebSocket.OPEN)
          reasons.push("desconectado");
        if (targetClient && !targetClient.authenticated)
          reasons.push("não autenticado");

        log(
          `Cliente alvo ${data.target} ${reasons.join(" e ")}. Mensagem de ${id} não entregue.`,
          "warn",
        );
        ws.send(
          JSON.stringify({
            type: "error",
            message: `Cliente alvo ${reasons.join(" e ")}`,
          }),
        );
        return;
      }

      // Adiciona o ID do remetente à mensagem para que o destinatário saiba de quem veio.
      data.from = id;
      metrics.totalMessages++;
      log(`Mensagem ${data.type} de ${id} → ${data.target}`, "debug");

      // O servidor NUNCA inspeciona o conteúdo de 'payload'.
      // Ele apenas retransmite a mensagem, garantindo a privacidade.
      targetClient.send(JSON.stringify(data));
    });

    ws.on("close", () => {
      // Quando um cliente se desconecta, remove-o do mapa e limpa rate limit.
      clients.delete(id);
      clientRateLimits.delete(id);
      authenticatedClients.delete(id);
      log(
        `Cliente ${id} desconectado (Total: ${clients.size}/${config.maxClients})`,
        "info",
      );
    });

    ws.on("error", (error) => {
      log(`Erro no WebSocket do cliente ${id}: ${error.message}`, "error");
    });
  });

  wss.on("close", () => {
    clearInterval(interval);
  });

  // ============ GRACEFUL SHUTDOWN ============
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);

  function shutdown(signal) {
    log(`Sinal ${signal} recebido. Encerrando graciosamente...`, "warn");

    // Atualiza status para offline no arquivo
    try {
      const statusFile = path.join(__dirname, "status.json");
      fs.writeFileSync(
        statusFile,
        JSON.stringify(
          { status: "offline", lastUpdated: new Date().toISOString() },
          null,
          2,
        ),
      );
    } catch (e) {}

    // Fecha todas as conexões com clientes
    wss.clients.forEach((ws) => {
      ws.close(1001, "Servidor encerrando");
    });

    wss.close(() => {
      log("Servidor WebSocket encerrado", "info");
      clearInterval(interval);
      process.exit(0);
    });

    // Força encerramento após 10 segundos se não conseguir
    setTimeout(() => {
      log("Timeout no encerramento gracioso, forçando saída", "error");
      process.exit(1);
    }, 10000);
  }
}

initServer();

// Um Map para armazenar os clientes conectados, associando um ID único a cada socket.
const clients = new Map();

// Map para rate limiting: armazena { lastMessageTime, count } por cliente
const clientRateLimits = new Map();

// Map para rastrear clientes autenticados
const authenticatedClients = new Set();

// ============ FUNÇÕES DE VALIDAÇÃO E RATE LIMITING ============

/**
 * Gera um ID criptograficamente seguro
 */
function generateSecureId() {
  // Usa 12 bytes (96 bits) de aleatoriedade criptográfica
  return crypto.randomBytes(12).toString("hex");
}

/**
 * Valida a estrutura de uma mensagem recebida
 */
function validateMessage(data) {
  const errors = [];

  if (!data || typeof data !== "object") {
    errors.push("Dados não são um objeto válido");
  } else {
    if (!data.type || typeof data.type !== "string") {
      errors.push('Campo "type" ausente ou inválido');
    }
    if (!data.target || typeof data.target !== "string") {
      errors.push('Campo "target" ausente ou inválido');
    }
    // payload pode ser qualquer coisa, não validamos seu conteúdo
    if (!("payload" in data)) {
      errors.push('Campo "payload" ausente');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Valida o token de autenticação
 */
function validateAuthToken(token) {
  if (!config.requireAuth) return true;
  return token === config.authToken;
}

/**
 * Verifica rate limit de um cliente
 */
function checkRateLimit(clientId) {
  const now = Date.now();
  let limit = clientRateLimits.get(clientId);

  // Inicializa ou reseta se passou a janela de tempo
  if (!limit || now - limit.windowStart > config.rateLimitWindow) {
    limit = {
      windowStart: now,
      count: 0,
    };
    clientRateLimits.set(clientId, limit);
  }

  limit.count++;

  if (limit.count > config.rateLimitMax) {
    return false; // Excedeu o limite
  }

  return true;
}

/**
 * Limpa rate limit antigos (a cada 5 minutos)
 */
function cleanupRateLimits() {
  const now = Date.now();
  for (const [clientId, limit] of clientRateLimits.entries()) {
    if (now - limit.windowStart > config.rateLimitWindow * 10) {
      clientRateLimits.delete(clientId);
    }
  }
}

setInterval(cleanupRateLimits, 5 * 60 * 1000);
