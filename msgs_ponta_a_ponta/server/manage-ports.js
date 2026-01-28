#!/usr/bin/env node

/**
 * 🔧 Gerenciador de Portas
 *
 * Script para gerenciar portas e processos do servidor
 * Uso:
 *   node manage-ports.js status    - Mostra status
 *   node manage-ports.js kill      - Mata processos na porta 8080
 *   node manage-ports.js list      - Lista processos usando portas
 *   node manage-ports.js check 8080 - Verifica porta específica
 */

const { exec, execSync } = require("child_process");
const net = require("net");

const COLORS = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
};

function log(message, type = "info") {
  const prefix =
    {
      info: "ℹ️  ",
      success: "✅ ",
      error: "❌ ",
      warn: "⚠️  ",
    }[type] || "📌 ";
  console.log(`${prefix}${message}`);
}

// Verifica se uma porta está aberta
function checkPort(port) {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.once("error", (err) => {
      if (err.code === "EADDRINUSE") {
        resolve(false);
      } else {
        resolve(false);
      }
    });

    server.once("listening", () => {
      server.close();
      resolve(true);
    });

    server.listen(port);
  });
}

// Lista processos usando uma porta
function listProcesses(port) {
  try {
    const output = execSync(
      `lsof -i :${port} 2>/dev/null || netstat -tlnp 2>/dev/null | grep ${port}`,
      {
        encoding: "utf-8",
      },
    );
    return output;
  } catch {
    return null;
  }
}

// Mata processos em uma porta
function killPort(port) {
  try {
    const output = execSync(`lsof -ti :${port} 2>/dev/null`, {
      encoding: "utf-8",
    });
    const pids = output.trim().split("\n").filter(Boolean);

    if (pids.length === 0) {
      log(`Nenhum processo encontrado na porta ${port}`, "warn");
      return false;
    }

    pids.forEach((pid) => {
      try {
        execSync(`kill -9 ${pid}`);
        log(`Processo ${pid} encerrado`, "success");
      } catch (err) {
        log(`Erro ao encerrar ${pid}: ${err.message}`, "error");
      }
    });

    return true;
  } catch (err) {
    log(`Erro ao obter PIDs: ${err.message}`, "error");
    return false;
  }
}

// Mostra status de portas comuns
async function showStatus() {
  const ports = [8080, 8081, 8082, 8083, 9090, 3000];
  log("Verificando portas comuns...", "info");
  console.log("");

  for (const port of ports) {
    const isOpen = await checkPort(port);
    const status = isOpen
      ? `${COLORS.green}DISPONÍVEL${COLORS.reset}`
      : `${COLORS.red}OCUPADA${COLORS.reset}`;
    process.stdout.write(`  Porta ${port.toString().padEnd(5)}: ${status}`);

    if (!isOpen) {
      const processes = listProcesses(port);
      if (processes) {
        const lines = processes.split("\n");
        const firstLine = lines[0] || "";
        const match = firstLine.match(/(\w+)\s+(\d+)/);
        if (match) {
          process.stdout.write(` (${match[1]} - PID: ${match[2]})`);
        }
      }
    }
    console.log("");
  }
  console.log("");
}

// Mostra ajuda
function showHelp() {
  console.log(`
${COLORS.blue}🔧 Gerenciador de Portas - Servidor P2P Secure Chat${COLORS.reset}

${COLORS.green}Uso:${COLORS.reset}
  node manage-ports.js [comando] [porta]

${COLORS.green}Comandos:${COLORS.reset}
  status       Mostra status de portas comuns
  kill         Mata processos na porta 8080 (ou porta especificada)
  list         Lista processos usando portas
  check <port> Verifica se porta específica está disponível
  help         Mostra esta mensagem

${COLORS.green}Exemplos:${COLORS.reset}
  node manage-ports.js status
  node manage-ports.js kill
  node manage-ports.js kill 8080
  node manage-ports.js check 8080
  node manage-ports.js list

${COLORS.green}Portas Testadas:${COLORS.reset}
  8080, 8081, 8082, 8083, 9090, 3000

`);
}

// Main
async function main() {
  const command = process.argv[2] || "status";
  const port = parseInt(process.argv[3] || "8080", 10);

  switch (command.toLowerCase()) {
    case "status":
      await showStatus();
      break;

    case "kill":
      log(`Encerrando processos na porta ${port}...`, "warn");
      const killed = killPort(port);
      if (killed) {
        log(`Porta ${port} liberada!`, "success");
      }
      break;

    case "list":
      await showStatus();
      break;

    case "check":
      const isOpen = await checkPort(port);
      if (isOpen) {
        log(
          `Porta ${port} está ${COLORS.green}DISPONÍVEL${COLORS.reset}`,
          "success",
        );
      } else {
        log(`Porta ${port} está ${COLORS.red}OCUPADA${COLORS.reset}`, "error");
        const processes = listProcesses(port);
        if (processes) {
          console.log(processes);
        }
      }
      break;

    case "help":
      showHelp();
      break;

    default:
      log(`Comando desconhecido: ${command}`, "error");
      showHelp();
      process.exit(1);
  }
}

main();
