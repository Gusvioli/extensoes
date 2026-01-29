// server/dashboard-server.js
// Extensão do servidor principal para servir o Dashboard de Servidores

const fs = require("fs");
const path = require("path");
const http = require("http");
const url = require("url");

let serversData = [];
const configFile = path.join(__dirname, "servers-config.json");

// Carregar configuração de servidores
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

// Salvar configuração de servidores
function saveServersConfig() {
  try {
    const config = { servers: serversData };
    fs.writeFileSync(configFile, JSON.stringify(config, null, 2));
  } catch (err) {
    console.error("Erro ao salvar configuração de servidores:", err);
  }
}

// Criar servidor HTTP para dashboard
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
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    // Handle preflight
    if (req.method === "OPTIONS") {
      res.writeHead(200);
      res.end();
      return;
    }

    // Rota: Dashboard HTML
    if (pathname === "/" && req.method === "GET") {
      try {
        const dashboardPath = path.join(__dirname, "dashboard.html");
        const dashboardContent = fs.readFileSync(dashboardPath, "utf-8");
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(dashboardContent);
      } catch (err) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Dashboard não encontrado" }));
      }
      return;
    }

    // Rota: Obter todos os servidores
    if (pathname === "/api/servers" && req.method === "GET") {
      loadServersConfig();
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify(serversData));
      return;
    }

    // Rota: Adicionar/Atualizar servidor
    if (
      pathname === "/api/servers" &&
      (req.method === "POST" || req.method === "PUT")
    ) {
      let body = "";
      req.on("data", (chunk) => {
        body += chunk.toString();
      });
      req.on("end", () => {
        try {
          const serverData = JSON.parse(body);
          loadServersConfig();

          if (req.method === "PUT") {
            // Atualizar servidor existente
            const index = serversData.findIndex((s) => s.id === serverData.id);
            if (index !== -1) {
              serversData[index] = serverData;
              saveServersConfig();
              res.writeHead(200, { "Content-Type": "application/json" });
              res.end(
                JSON.stringify({
                  success: true,
                  message: "Servidor atualizado",
                }),
              );
            } else {
              res.writeHead(404, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ error: "Servidor não encontrado" }));
            }
          } else {
            // Adicionar novo servidor
            serversData.push(serverData);
            saveServersConfig();
            res.writeHead(201, { "Content-Type": "application/json" });
            res.end(
              JSON.stringify({ success: true, message: "Servidor adicionado" }),
            );
          }
        } catch (err) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Dados inválidos" }));
        }
      });
      return;
    }

    // Rota: Deletar servidor
    if (pathname === "/api/servers" && req.method === "DELETE") {
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

    // Rota padrão: 404
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Rota não encontrada" }));
  });

  return server;
}

// Inicializar dashboard
function initDashboard(dashboardPort) {
  loadServersConfig();
  const dashboardServer = createDashboardServer(dashboardPort);
  dashboardServer.listen(dashboardPort, () => {
    const timestamp = new Date().toISOString();
    console.log(
      `[${timestamp}] 📊 Dashboard de Servidores iniciado em http://localhost:${dashboardPort}`,
    );
  });
}

module.exports = {
  initDashboard,
  createDashboardServer,
  loadServersConfig,
  saveServersConfig,
};
