#!/usr/bin/env node

/**
 * Script que monitora o arquivo TOKEN.txt e sincroniza automaticamente quando há mudanças
 * Útil para desenvolvimento ou para sincronizar em tempo real
 * Uso: node dashboard/scripts/watch-token.js [--interval=5000]
 */

const fs = require("fs");
const path = require("path");

const args = process.argv.slice(2);
const config = {
  interval: 5000, // 5 segundos por padrão
};

// Parse argumentos
args.forEach((arg) => {
  const [key, value] = arg.split("=");
  const cleanKey = key.replace(/^--/, "");
  if (value !== undefined) {
    config[cleanKey] = parseInt(value, 10);
  }
});

const dashboardDir = path.join(__dirname, "..");
const serverDir = path.join(dashboardDir, "../server");
const tokenFile = path.join(serverDir, "TOKEN.txt");
const configFile = path.join(dashboardDir, "data/servers-config.json");

let lastToken = null;

function colors(text, color) {
  const codes = {
    reset: "\x1b[0m",
    bright: "\x1b[1m",
    dim: "\x1b[2m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    blue: "\x1b[34m",
    red: "\x1b[31m",
    cyan: "\x1b[36m",
    gray: "\x1b[90m",
  };
  return `${codes[color] || ""}${text}${codes.reset}`;
}

function syncToken() {
  try {
    if (!fs.existsSync(tokenFile)) {
      return;
    }

    const tokenContent = fs.readFileSync(tokenFile, "utf-8");
    const tokenMatch = tokenContent.match(/Token: ([a-f0-9]+)/);

    if (!tokenMatch) {
      return;
    }

    const serverToken = tokenMatch[1].trim();

    // Se o token não mudou, não sincroniza
    if (serverToken === lastToken) {
      return;
    }

    lastToken = serverToken;

    if (!fs.existsSync(configFile)) {
      console.log(colors(`❌ Arquivo não encontrado: ${configFile}`, "red"));
      return;
    }

    let config = JSON.parse(fs.readFileSync(configFile, "utf-8"));
    const timestamp = new Date().toLocaleTimeString("pt-BR");

    let updated = 0;
    config.servers.forEach((server) => {
      if (server.status === "active" && server.token !== serverToken) {
        server.token = serverToken;
        updated++;
      }
    });

    if (updated > 0) {
      fs.writeFileSync(configFile, JSON.stringify(config, null, 2));
      console.log(
        colors(`[${timestamp}] 🔄 Token atualizado`, "blue"),
        colors(`(${updated} servidor(s))`, "cyan"),
      );
      console.log(colors(`    Novo token: ${serverToken}`, "green"));
    }
  } catch (err) {
    console.error(
      colors(`[${new Date().toLocaleTimeString("pt-BR")}] ❌ Erro:`, "red"),
      err.message,
    );
  }
}

console.log(
  colors("🔍 Monitorando token para sincronização automática...", "bright"),
);
console.log(colors(`📁 Arquivo: ${tokenFile}`, "dim"));
console.log(colors(`⏱️  Intervalo: ${config.interval}ms`, "dim"));
console.log(colors(`Pressione Ctrl+C para parar\n`, "dim"));

// Sincronizar imediatamente na primeira execução
syncToken();

// Sincronizar periodicamente
setInterval(syncToken, config.interval);

// Graceful shutdown
process.on("SIGINT", () => {
  console.log(colors("\n✅ Monitor de token encerrado", "green"));
  process.exit(0);
});
