// server/server.js

const url = require("url");
const crypto = require("crypto");
const http = require("http");
const fs = require("fs");
const path = require("path");
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
Servidor: ws://localhost:${config.port}
`;
    fs.writeFileSync(tokenFile, content);
    log(`Token salvo em: ${tokenFile}`, "info");
  } catch (err) {
    log(`Erro ao salvar token em arquivo: ${err.message}`, "warn");
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

  // Determinar URL do WebSocket dinamicamente (compatível com Render e Local)
  const isSecure = req.headers["x-forwarded-proto"] === "https";
  const protocol = isSecure ? "wss" : "ws";
  const hostHeader = req.headers.host || "localhost";
  let wsUrl;

  if (process.env.RENDER || req.socket.localPort === config.port) {
    // No Render ou porta principal: usa o host diretamente (porta 443 implícita no Render)
    wsUrl = `${protocol}://${hostHeader}`;
  } else {
    // Porta secundária local: ajusta para a porta do WS
    const hostname = hostHeader.replace(/:\d+$/, "");
    wsUrl = `${protocol}://${hostname}:${config.port}`;
  }

  if (req.url === "/token") {
    // Endpoint para obter token
    res.writeHead(200);
    res.end(
      JSON.stringify({
        token: config.authToken,
        wsUrl: wsUrl,
        requiresAuth: config.requireAuth,
        status: "online",
        clientsCount: clients.size,
        maxClients: config.maxClients,
        uptime: Math.floor((Date.now() - metrics.startTime) / 1000),
        startedAt: new Date(metrics.startTime).toISOString(),
      }),
    );
  } else if (req.url === "/") {
    // Página inicial com instruções
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>P2P Secure Chat - Token</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container { 
      max-width: 500px;
      background: white; 
      padding: 40px; 
      border-radius: 16px; 
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      animation: slideIn 0.5s ease;
      text-align: center;
    }
    @keyframes slideIn {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .emoji { font-size: 60px; margin-bottom: 20px; }
    h1 { 
      color: #333; 
      margin-bottom: 10px; 
      font-size: 32px;
      font-weight: 700;
    }
    .status { 
      color: #28a745; 
      font-weight: bold; 
      margin-bottom: 30px;
      font-size: 16px;
    }
    .section { 
      margin: 30px 0; 
      padding: 20px 0;
      border-bottom: 1px solid #eee;
    }
    .section:last-child { border-bottom: none; }
    h2 { 
      color: #667eea; 
      font-size: 18px; 
      margin: 15px 0;
      font-weight: 600;
    }
    .token-box { 
      background: linear-gradient(135deg, #667eea15 0%, #764ba215 100%);
      padding: 20px; 
      border-radius: 10px; 
      font-family: 'Courier New', monospace;
      word-break: break-all;
      border: 2px dashed #667eea;
      margin: 20px 0;
      font-size: 16px;
      line-height: 1.6;
      font-weight: bold;
      color: #333;
    }
    button {
      width: 100%;
      padding: 14px 20px;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-size: 16px;
      font-weight: bold;
      transition: all 0.3s;
      margin: 10px 0;
    }
    .copy-btn { 
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }
    .copy-btn:hover { 
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(102, 126, 234, 0.4);
    }
    .copy-btn:active {
      transform: translateY(0);
    }
    .step {
      background: #f8f9fa;
      padding: 12px;
      border-radius: 6px;
      margin: 8px 0;
      font-size: 14px;
      line-height: 1.6;
      text-align: left;
    }
    .step strong {
      color: #667eea;
    }
    .alert {
      background: #cfe2ff;
      border-left: 4px solid #0066cc;
      color: #084298;
      padding: 15px;
      border-radius: 6px;
      margin: 15px 0;
      text-align: left;
      font-size: 14px;
    }
    .faq {
      text-align: left;
      margin: 20px 0;
    }
    .faq-item {
      margin: 12px 0;
      padding: 12px;
      background: #f8f9fa;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .faq-item:hover {
      background: #e9ecef;
    }
    .faq-q {
      font-weight: bold;
      color: #333;
      font-size: 14px;
    }
    .faq-a {
      color: #666;
      font-size: 13px;
      margin-top: 8px;
      display: none;
    }
    .faq-item.open .faq-a {
      display: block;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="emoji">🔐</div>
    <h1>Chat Seguro</h1>
    <p class="status">✅ Pronto para usar!</p>
    
    <!-- TOKEN -->
    <div class="section">
      <h2>📝 Seu Código de Acesso</h2>
      <p style="color: #666; margin-bottom: 15px; font-size: 14px;">Compartilhe esse código com a pessoa que quer conversar com você:</p>
      <div class="token-box" id="token">${config.authToken}</div>
      <button class="copy-btn" onclick="copyToken()">📋 Copiar Código</button>
    </div>

    <!-- INSTRUÇÕES SIMPLES -->
    <div class="section">
      <h2>⚡ Como Usar (4 passos)</h2>
      <div class="step">
        <strong>1️⃣ Você (pessoa que começou aqui)</strong><br>
        Copie o código acima
      </div>
      <div class="step">
        <strong>2️⃣ Envie para seu amigo</strong><br>
        WhatsApp, email, telegram... como preferir
      </div>
      <div class="step">
        <strong>3️⃣ Seu amigo abre a extensão Chrome</strong><br>
        Instala a extensão "P2P Secure Chat"
      </div>
      <div class="step">
        <strong>4️⃣ Seu amigo cola o código</strong><br>
        Na extensão, coloca o código no campo "Token" e clica conectar
      </div>
    </div>

    <!-- AVISO -->
    <div class="alert">
      <strong>💡 Dica:</strong> Deixe essa página aberta enquanto estiver usando o chat!
    </div>

    <!-- FAQ SIMPLES -->
    <div class="section">
      <h2>❓ Dúvidas?</h2>
      <div class="faq">
        <div class="faq-item" onclick="toggleFaq(this)">
          <div class="faq-q">É seguro?</div>
          <div class="faq-a">Sim! Suas mensagens são criptografadas. Ninguém consegue ler.</div>
        </div>
        <div class="faq-item" onclick="toggleFaq(this)">
          <div class="faq-q">Preciso criar conta?</div>
          <div class="faq-a">Não! Instala a extensão e pronto. Sem cadastro, sem senhas.</div>
        </div>
        <div class="faq-item" onclick="toggleFaq(this)">
          <div class="faq-q">Funciona em celular?</div>
          <div class="faq-a">Só no Chrome de computador por enquanto.</div>
        </div>
        <div class="faq-item" onclick="toggleFaq(this)">
          <div class="faq-q">O que é esse código?</div>
          <div class="faq-a">É uma senha para conectar com segurança. Muda toda vez que você reinicia.</div>
        </div>
      </div>
    </div>

  </div>

  <script>
    function copyToken() {
      const token = document.getElementById('token').innerText;
      navigator.clipboard.writeText(token).then(() => {
        showNotification('✅ Código copiado!');
      });
    }

    function toggleFaq(element) {
      element.classList.toggle('open');
    }

    function showNotification(msg) {
      const notif = document.createElement('div');
      notif.innerText = msg;
      notif.style.cssText = \`
        position: fixed;
        top: 20px;
        right: 20px;
        background: #28a745;
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        animation: slideInRight 0.3s ease;
        z-index: 1000;
        font-weight: bold;
      \`;
      document.body.appendChild(notif);
      setTimeout(() => notif.remove(), 2000);
    }

    const style = document.createElement('style');
    style.textContent = \`
      @keyframes slideInRight {
        from { opacity: 0; transform: translateX(100px); }
        to { opacity: 1; transform: translateX(0); }
      }
    \`;
    document.head.appendChild(style);
  </script>
</body>
</html>
      `;
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(html);
  } else {
    res.writeHead(404);
    res.end(JSON.stringify({ error: "Rota não encontrada" }));
  }
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

      httpServer.on("listening", () => {
        actualPort = port;
        resolve(server);
      });

      httpServer.on("error", (err) => {
        reject(err);
      });

      httpServer.listen(port);
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
      httpServer.listen(httpPort, () => {
        log(
          `📱 Acesse http://localhost:${httpPort} para ver seu token`,
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
  // Heartbeat: verifica se clientes estão vivos a cada intervalo
  const interval = setInterval(() => {
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
