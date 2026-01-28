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
  port: process.env.PORT || 8080,
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

// Servidor HTTP para servir o token (para fácil acesso)
function createTokenServer(httpPort) {
  const httpServer = http.createServer((req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Content-Type", "application/json");

    if (req.url === "/token") {
      // Endpoint para obter token (protegido em produção, aberto aqui para facilidade)
      res.writeHead(200);
      res.end(
        JSON.stringify({
          token: config.authToken,
          wsUrl: `ws://localhost:${config.port}`,
          requiresAuth: config.requireAuth,
        }),
      );
    } else if (req.url === "/") {
      // Página inicial com instruções melhorada para usuários remotos
      const hostname = req.headers.host || `localhost:${config.port + 1000}`;
      const wsUrl = `ws://${hostname.replace(/:\d+$/, "")}:${config.port}`;

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
      max-width: 700px;
      background: white; 
      padding: 40px; 
      border-radius: 12px; 
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      animation: slideIn 0.5s ease;
    }
    @keyframes slideIn {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    h1 { color: #333; margin-bottom: 10px; font-size: 32px; }
    .status { color: #28a745; font-weight: bold; margin-bottom: 20px; }
    .section { margin: 30px 0; padding-bottom: 20px; border-bottom: 1px solid #eee; }
    .section:last-child { border-bottom: none; }
    h2 { color: #667eea; font-size: 18px; margin: 15px 0; }
    .token-box { 
      background: #f8f9fa; 
      padding: 15px; 
      border-radius: 8px; 
      font-family: 'Courier New', monospace;
      word-break: break-all;
      border-left: 4px solid #667eea;
      margin: 10px 0;
      font-size: 14px;
      line-height: 1.5;
    }
    .server-info {
      background: #e7f3ff;
      padding: 15px;
      border-radius: 8px;
      margin: 10px 0;
      border-left: 4px solid #0066cc;
      font-size: 14px;
    }
    .server-info code {
      background: white;
      padding: 2px 6px;
      border-radius: 3px;
      font-weight: bold;
    }
    .button-group {
      display: flex;
      gap: 10px;
      margin: 15px 0;
      flex-wrap: wrap;
    }
    button {
      flex: 1;
      min-width: 150px;
      padding: 12px 20px;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      font-weight: bold;
      transition: all 0.3s;
    }
    .copy-btn { 
      background: #28a745; 
      color: white;
    }
    .copy-btn:hover { 
      background: #218838;
      transform: translateY(-2px);
      box-shadow: 0 5px 15px rgba(40,167,69,0.3);
    }
    .secondary-btn {
      background: #6c757d;
      color: white;
    }
    .secondary-btn:hover {
      background: #5a6268;
    }
    .instructions {
      background: #fff3cd;
      padding: 20px;
      border-radius: 8px;
      border-left: 4px solid #ffc107;
      margin: 15px 0;
    }
    .instructions ol {
      margin-left: 20px;
      line-height: 1.8;
    }
    .instructions li {
      margin-bottom: 8px;
    }
    .two-users {
      background: #f0f7ff;
      padding: 20px;
      border-radius: 8px;
      border: 2px dashed #0066cc;
      margin: 20px 0;
    }
    .user-box {
      display: inline-block;
      width: 48%;
      background: white;
      padding: 15px;
      border-radius: 6px;
      margin: 5px 1%;
      text-align: center;
      border: 2px solid #667eea;
    }
    .user-box h3 { color: #667eea; margin-bottom: 10px; }
    .step { 
      background: #f8f9fa; 
      padding: 10px; 
      border-radius: 4px;
      margin: 5px 0;
      font-size: 13px;
    }
    code {
      background: #f5f5f5;
      padding: 2px 4px;
      border-radius: 3px;
      font-family: monospace;
      font-size: 13px;
    }
    .alert {
      padding: 15px;
      border-radius: 6px;
      margin: 15px 0;
    }
    .alert-info {
      background: #cfe2ff;
      border-left: 4px solid #0066cc;
      color: #084298;
    }
    .alert-warning {
      background: #fff3cd;
      border-left: 4px solid #ffc107;
      color: #664d03;
    }
    .badge {
      display: inline-block;
      background: #667eea;
      color: white;
      padding: 3px 8px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: bold;
      margin: 5px 0;
    }
    .endpoint-table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
    }
    .endpoint-table th, .endpoint-table td {
      border: 1px solid #ddd;
      padding: 10px;
      text-align: left;
    }
    .endpoint-table th {
      background: #667eea;
      color: white;
    }
    .endpoint-table td code {
      display: block;
      background: #f8f9fa;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🔐 P2P Secure Chat</h1>
    <p class="status">✅ Servidor ativo e pronto para usar</p>
    
    <!-- ===== SEÇÃO TOKEN ===== -->
    <div class="section">
      <h2>🔑 Token de Autenticação</h2>
      <div class="token-box" id="token">${config.authToken}</div>
      <div class="button-group">
        <button class="copy-btn" onclick="copyToken()">📋 Copiar Token</button>
        <button class="secondary-btn" onclick="copyAsJSON()">📄 Copiar JSON</button>
      </div>
    </div>

    <!-- ===== INSTRUÇÕES RÁPIDAS ===== -->
    <div class="section">
      <h2>⚡ Guia Rápido (30 segundos)</h2>
      <div class="instructions">
        <ol>
          <li><strong>Alice</strong> (aqui): Copie o token acima</li>
          <li>Envie para <strong>Bob</strong> (WhatsApp, email, etc)</li>
          <li><strong>Bob</strong> instala a extensão no Chrome</li>
          <li><strong>Bob</strong> abre a extensão e vê "URL do Servidor"</li>
          <li><strong>Bob</strong> muda para: <code>ws://${hostname.replace(":" + (config.port + 1000), "")}</code></li>
          <li><strong>Bob</strong> cola o token no campo "Token de Autenticação"</li>
          <li>Clica "Autenticar" e depois "Conectar"</li>
          <li>Pronto! Vocês estão conectados 🎉</li>
        </ol>
      </div>
    </div>

    <!-- ===== CENÁRIO DOIS USUÁRIOS ===== -->
    <div class="section">
      <h2>👥 Conectando Dois Usuários</h2>
      <div class="two-users">
        <div class="user-box">
          <h3>👤 Usuário 1 (Alice)</h3>
          <p>Inicia o servidor</p>
          <div class="step">npm start</div>
          <p>Obtém token</p>
          <div class="step">${config.authToken}</div>
          <p>Envia para Bob</p>
        </div>
        <div class="user-box">
          <h3>👤 Usuário 2 (Bob)</h3>
          <p>Recebe token</p>
          <div class="step">${config.authToken}</div>
          <p>Instala extensão</p>
          <div class="step">Chrome Web Store</div>
          <p>Coloca URL + Token</p>
        </div>
      </div>
    </div>

    <!-- ===== CONFIGURAÇÃO REMOTA ===== -->
    <div class="section">
      <h2>🌐 Usando em Computadores Diferentes</h2>
      <div class="alert alert-info">
        <strong>Situação:</strong> Alice está em casa rodando servidor em seu PC. Bob quer se conectar de outro lugar.
      </div>
      
      <h3 style="margin-top: 15px; color: #333;">Passo 1: Alice (Servidor)</h3>
      <div class="step">
        <code>cd server && npm start</code><br>
        Anota o IP de sua máquina (ex: 192.168.1.100)
      </div>

      <h3 style="color: #333;">Passo 2: Bob (Cliente)</h3>
      <div class="step">
        Abre a extensão Chrome
      </div>
      <div class="step">
        Campo "URL do Servidor": <code>ws://192.168.1.100:8080</code><br>
        (substitui 192.168.1.100 pelo IP de Alice)
      </div>
      <div class="step">
        Campo "Token": <code>${config.authToken}</code>
      </div>
      <div class="step">
        Clica "Autenticar" → "Conectar"
      </div>

      <div class="alert alert-warning">
        <strong>⚠️ Importante:</strong> O servidor precisa estar acessível de fora. Se estiver atrás de firewall/NAT, pode precisar de port forwarding ou usar a nuvem.
      </div>
    </div>

    <!-- ===== ENDPOINTS ===== -->
    <div class="section">
      <h2>📡 Endpoints do Servidor</h2>
      <table class="endpoint-table">
        <tr>
          <th>Serviço</th>
          <th>URL</th>
          <th>Uso</th>
        </tr>
        <tr>
          <td><strong>WebSocket</strong></td>
          <td><code>ws://${hostname.replace(":" + (config.port + 1000), "")}</code></td>
          <td>Sinalização P2P</td>
        </tr>
        <tr>
          <td><strong>Página Token</strong></td>
          <td><code>http://${hostname}</code></td>
          <td>Esta página</td>
        </tr>
        <tr>
          <td><strong>API JSON</strong></td>
          <td><code>http://${hostname}/token</code></td>
          <td>Dados em JSON</td>
        </tr>
      </table>
    </div>

    <!-- ===== COMPARTILHAMENTO ===== -->
    <div class="section">
      <h2>🔗 Compartilhar com Outros</h2>
      <div class="alert alert-info">
        <strong>Quer enviar o token para alguém?</strong> Use um dos formatos abaixo:
      </div>
      
      <h3 style="color: #333;">Simples (recomendado)</h3>
      <div class="step" style="cursor: pointer;" onclick="copySimple()">
        <strong>Token:</strong> ${config.authToken}<br>
        <small>Clique para copiar</small>
      </div>

      <h3 style="color: #333;">Com instruções</h3>
      <div class="step" style="cursor: pointer;" onclick="copyWithInstructions()">
        <strong>Cole isso em um email/WhatsApp:</strong><br>
        <small>Clique para copiar</small>
      </div>

      <h3 style="color: #333;">Completo (URL + Token)</h3>
      <div class="step" style="cursor: pointer;" onclick="copyComplete()">
        <strong>URL do Servidor:</strong> ws://${hostname.replace(":" + (config.port + 1000), "")}<br>
        <strong>Token:</strong> ${config.authToken}<br>
        <small>Clique para copiar</small>
      </div>
    </div>

    <!-- ===== FAQ ===== -->
    <div class="section">
      <h2>❓ Perguntas Frequentes</h2>
      
      <h3 style="color: #333; margin-top: 10px;">Posso usar de casa?</h3>
      <p>Sim, mas ambos precisam estar na mesma rede WiFi ou usar o IP externo com port forwarding.</p>

      <h3 style="color: #333; margin-top: 10px;">E se estiverem em redes diferentes?</h3>
      <p>Use um servidor remoto (cloud/VPS) em vez de localhost. Deploy na nuvem!</p>

      <h3 style="color: #333; margin-top: 10px;">O token é seguro?</h3>
      <p>Sim! 128 bits de entropia. Mas não compartilhe em público (como tweets).</p>

      <h3 style="color: #333; margin-top: 10px;">Preciso renovar o token?</h3>
      <p>Novo token a cada reinicialização do servidor (automático). Para usar o mesmo, use .env</p>
    </div>

  </div>

  <script>
    const token = document.getElementById('token').innerText;
    const wsUrl = '${wsUrl}';
    const serverUrl = 'ws://${hostname.replace(":" + (config.port + 1000), "")}';

    function copyToken() {
      navigator.clipboard.writeText(token).then(() => {
        showNotification('✅ Token copiado!');
      });
    }

    function copyAsJSON() {
      const json = JSON.stringify({
        token: token,
        wsUrl: wsUrl,
        requiresAuth: true
      }, null, 2);
      navigator.clipboard.writeText(json).then(() => {
        showNotification('✅ JSON copiado!');
      });
    }

    function copySimple() {
      navigator.clipboard.writeText(token).then(() => {
        showNotification('✅ Copie e compartilhe o token!');
      });
    }

    function copyWithInstructions() {
      const text = \`🔐 P2P Secure Chat

Token de Autenticação: \${token}

URL do Servidor: \${serverUrl}

Como usar:
1. Instale a extensão Chrome
2. Coloque URL: \${serverUrl}
3. Coloque Token: \${token}
4. Clique "Autenticar" e "Conectar"

Pronto! Vocês estão conectados 🎉\`;
      navigator.clipboard.writeText(text).then(() => {
        showNotification('✅ Compartilhe no WhatsApp/Email!');
      });
    }

    function copyComplete() {
      const text = \`URL do Servidor: \${serverUrl}
Token: \${token}\`;
      navigator.clipboard.writeText(text).then(() => {
        showNotification('✅ Dados do servidor copiados!');
      });
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
        border-radius: 6px;
        animation: slideInRight 0.3s ease;
        z-index: 1000;
      \`;
      document.body.appendChild(notif);
      setTimeout(() => notif.remove(), 3000);
    }

    // Adicionar estilos para animação
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
      res.writeHead(200);
      res.end(html);
    } else {
      res.writeHead(404);
      res.end(JSON.stringify({ error: "Rota não encontrada" }));
    }
  });

  return httpServer;
}

// Inicia o servidor WebSocket com suporte a fallback de portas
let wss;
let actualPort = config.port;
const portFallbacks = [config.port, 8081, 8082, 8083, 9090, 3000];

function createServer(port) {
  return new Promise((resolve, reject) => {
    try {
      const server = new WebSocket.Server({
        port: port,
        perMessageDeflate: config.disableDeflate
          ? false // Desabilita compressão para prevenir CRIME
          : {
              serverNoContextTakeover: true,
              clientNoContextTakeover: true,
            },
      });

      server.on("listening", () => {
        actualPort = port;
        resolve(server);
      });

      server.on("error", (err) => {
        reject(err);
      });
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
      }

      // Exibe configurações de segurança
      if (config.requireAuth) {
        log(
          `⚠️  Autenticação ATIVADA. Token obrigatório: ${config.authToken}`,
          "warn",
        );
      } else {
        log("⚠️  Autenticação DESATIVADA (inseguro)", "warn");
      }

      if (!config.disableDeflate) {
        log("⚠️  Compressão ATIVADA (vulnerável a CRIME)", "warn");
      } else {
        log("✅ 🔒 Compressão DESABILITADA (proteção contra CRIME)", "info");
      }

      // Salva token em arquivo
      saveTokenToFile();

      // Inicia servidor HTTP para servir token
      const httpPort = config.port + 1000; // Usa porta HTTP diferente (9080 para 8080)
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
          `❌ Falha ao iniciar servidor em qualquer porta: ${err.message}`,
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

log(`Servidor de sinalização iniciado na porta ${config.port}`, "info");
if (config.requireAuth) {
  log(
    `⚠️  Autenticação ATIVADA. Token obrigatório: ${config.authToken.substring(0, 8)}...`,
    "warn",
  );
}
if (config.disableDeflate) {
  log(`🔒 Compressão DESABILITADA (proteção contra CRIME)`, "info");
}
log(
  `Configuração: ${JSON.stringify({ ...config, authToken: config.authToken ? "***" : undefined })}`,
  "debug",
);

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
