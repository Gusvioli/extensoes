#!/usr/bin/env node

/**
 * Script para listar servidores ativos
 * Suporta modo interno (arquivo local) e externo (via API)
 * Uso: node list-servers.js [--mode=internal|external|all] [--format=table|json|csv] [--role=user|admin] [--host=localhost] [--port=3000]
 */

const fs = require("fs");
const path = require("path");
const http = require("http");
const url = require("url");

// Cores para terminal
const colors = {
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

// Parse argumentos
const args = process.argv.slice(2);
const config = {
  mode: "all", // internal|external|all
  format: "table", // table|json|csv
  role: "user", // user|admin
  host: "localhost",
  port: 3000,
  apiPath: "/api/public-servers",
  configPath: path.join(__dirname, "../data/servers-config.json"),
};

// Processar argumentos
args.forEach((arg) => {
  const [key, value] = arg.split("=");
  const cleanKey = key.replace(/^--/, "");
  if (value !== undefined) {
    config[cleanKey] = value;
  }
});

// Funções para fetch externo
function fetchExternalServers() {
  return new Promise((resolve, reject) => {
    const apiUrl = `http://${config.host}:${config.port}${config.apiPath}?status=active`;

    const options = new url.URL(apiUrl);
    const request = http.get(
      {
        hostname: options.hostname,
        port: options.port,
        path: options.pathname + options.search,
        method: "GET",
        timeout: 5000,
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            const parsed = JSON.parse(data);
            resolve(parsed.servers || []);
          } catch (e) {
            reject(new Error(`Erro ao fazer parse da resposta: ${e.message}`));
          }
        });
      },
    );

    request.on("error", (err) => {
      reject(new Error(`Erro ao conectar em ${apiUrl}: ${err.message}`));
    });

    request.on("timeout", () => {
      request.destroy();
      reject(new Error(`Timeout ao conectar em ${apiUrl}`));
    });
  });
}

// Funções para leitura interna
function readInternalServers() {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(config.configPath)) {
      reject(new Error(`Arquivo não encontrado: ${config.configPath}`));
      return;
    }

    try {
      const content = fs.readFileSync(config.configPath, "utf-8");
      const data = JSON.parse(content);
      const activeServers = (data.servers || []).filter(
        (s) => s.status === "active",
      );
      resolve(activeServers);
    } catch (e) {
      reject(new Error(`Erro ao ler config: ${e.message}`));
    }
  });
}

// Funções de formatação
function formatTable(servers) {
  if (servers.length === 0) {
    console.log(
      `${colors.yellow}❌ Nenhum servidor ativo encontrado${colors.reset}`,
    );
    return;
  }

  console.log(
    `\n${colors.bright}${colors.cyan}📊 SERVIDORES ATIVOS${colors.reset}\n`,
  );

  const columns = ["Nome", "Host", "Porta", "Protocolo", "Status"];
  if (config.role === "admin") {
    columns.push("Token", "Clientes", "Região");
  } else {
    columns.push("Região", "Clientes");
  }

  // Calcular larguras das colunas
  const widths = columns.map((col) => col.length);
  servers.forEach((server) => {
    widths[0] = Math.max(widths[0], (server.name || "").length);
    widths[1] = Math.max(widths[1], (server.host || "").length);
    widths[2] = Math.max(widths[2], String(server.port).length);
    widths[3] = Math.max(widths[3], (server.protocol || "").length);
    widths[4] = Math.max(widths[4], (server.status || "").length);
    if (config.role === "admin") {
      widths[5] = Math.max(
        widths[5],
        (server.token || "").substring(0, 12).length,
      );
      widths[6] = Math.max(
        widths[6],
        String(server.maxClients || "N/A").length,
      );
      widths[7] = Math.max(widths[7], (server.region || "N/A").length);
    } else {
      widths[5] = Math.max(widths[5], (server.region || "N/A").length);
      widths[6] = Math.max(
        widths[6],
        String(server.maxClients || "N/A").length,
      );
    }
  });

  // Cabeçalho
  const header = columns.map((col, i) => col.padEnd(widths[i])).join(" | ");
  console.log(`${colors.bright}${header}${colors.reset}`);
  console.log(
    colors.gray +
      columns.map((col, i) => "-".repeat(widths[i])).join("-+-") +
      colors.reset,
  );

  // Linhas
  servers.forEach((server) => {
    const statusColor =
      server.status === "active"
        ? colors.green
        : server.status === "inactive"
          ? colors.red
          : colors.yellow;
    const row = [
      server.name?.padEnd(widths[0]) || "".padEnd(widths[0]),
      server.host?.padEnd(widths[1]) || "".padEnd(widths[1]),
      String(server.port).padEnd(widths[2]),
      (server.protocol || "").padEnd(widths[3]),
      `${statusColor}${(server.status || "").padEnd(widths[4])}${colors.reset}`,
    ];

    if (config.role === "admin") {
      row.push((server.token || "").substring(0, 12).padEnd(widths[5]));
      row.push(String(server.maxClients || "N/A").padEnd(widths[6]));
      row.push((server.region || "N/A").padEnd(widths[7]));
    } else {
      row.push((server.region || "N/A").padEnd(widths[5]));
      row.push(String(server.maxClients || "N/A").padEnd(widths[6]));
    }

    console.log(row.join(" | "));
  });

  console.log("");

  // Detalhes expandidos para usuários
  if (config.role === "user") {
    console.log(
      `${colors.bright}${colors.blue}🔑 INSTRUÇÕES PARA CONECTAR:${colors.reset}\n`,
    );
    servers.forEach((server, idx) => {
      console.log(`${colors.bright}${idx + 1}. ${server.name}${colors.reset}`);
      console.log(
        `   📍 Host:     ${colors.cyan}${server.host}${colors.reset}`,
      );
      console.log(
        `   🔌 Porta:    ${colors.cyan}${server.port}${colors.reset}`,
      );
      console.log(`   🔗 WebSocket: ws://${server.host}:${server.port}`);
      if (server.token) {
        console.log(
          `   🔑 Token:    ${colors.yellow}${server.token}${colors.reset}`,
        );
        console.log(
          `   ${colors.dim}↳ Cole este token na extensão para autenticar${colors.reset}`,
        );
      }
      if (server.description) {
        console.log(`   📝 Info:     ${server.description}`);
      }
      console.log("");
    });
  }

  // Detalhes para admin
  if (config.role === "admin") {
    console.log(
      `${colors.bright}${colors.blue}⚙️ DETALHES ADMINISTRATIVOS:${colors.reset}\n`,
    );
    servers.forEach((server, idx) => {
      console.log(`${colors.bright}${idx + 1}. ${server.name}${colors.reset}`);
      console.log(`   ID:          ${colors.dim}${server.id}${colors.reset}`);
      console.log(`   Status:      ${server.status}`);
      console.log(
        `   Token:       ${colors.yellow}${server.token}${colors.reset}`,
      );
      console.log(`   Max Clientes: ${server.maxClients}`);
      console.log(`   Região:      ${server.region || "N/A"}`);
      console.log(`   Criado em:   ${server.createdAt || "N/A"}`);
      if (server.notes) {
        console.log(
          `   Notas:       ${colors.dim}${server.notes}${colors.reset}`,
        );
      }
      console.log("");
    });
  }
}

function formatJson(servers) {
  console.log(JSON.stringify(servers, null, 2));
}

function formatCsv(servers) {
  if (servers.length === 0) {
    console.log("Nome,Host,Porta,Protocolo,Status,Região,MaxClientes");
    return;
  }

  const columns = [
    "name",
    "host",
    "port",
    "protocol",
    "status",
    "region",
    "maxClients",
  ];
  if (config.role === "admin") {
    columns.push("token", "id");
  }

  // Cabeçalho
  console.log(columns.join(","));

  // Dados
  servers.forEach((server) => {
    const row = columns.map((col) => {
      const value = server[col] || "";
      // Escapar aspas e envolver em aspas se contém vírgula
      const escaped = String(value).replace(/"/g, '""');
      return escaped.includes(",") ? `"${escaped}"` : escaped;
    });
    console.log(row.join(","));
  });
}

// Função principal
async function main() {
  try {
    let allServers = [];

    console.log(
      `${colors.bright}${colors.cyan}🔄 Buscando servidores...${colors.reset}\n`,
    );

    if (config.mode === "internal" || config.mode === "all") {
      try {
        console.log(
          `${colors.dim}→ Lendo configuração local...${colors.reset}`,
        );
        const internal = await readInternalServers();
        allServers = [...allServers, ...internal];
        console.log(
          `${colors.green}✓ ${internal.length} servidor(s) encontrado(s) localmente${colors.reset}`,
        );
      } catch (err) {
        console.error(
          `${colors.red}✗ Erro ao ler servidores internos: ${err.message}${colors.reset}`,
        );
        if (config.mode === "internal") process.exit(1);
      }
    }

    if (config.mode === "external" || config.mode === "all") {
      try {
        console.log(
          `${colors.dim}→ Buscando via API (${config.host}:${config.port})...${colors.reset}`,
        );
        const external = await fetchExternalServers();
        if (config.mode === "all") {
          // Evitar duplicatas
          allServers = [
            ...allServers,
            ...external.filter((e) => !allServers.find((i) => i.id === e.id)),
          ];
        } else {
          allServers = external;
        }
        console.log(
          `${colors.green}✓ ${external.length} servidor(s) encontrado(s) externamente${colors.reset}`,
        );
      } catch (err) {
        console.error(
          `${colors.red}✗ Erro ao buscar servidores externos: ${err.message}${colors.reset}`,
        );
        if (config.mode === "external") process.exit(1);
      }
    }

    console.log("");

    // Formatar saída
    switch (config.format) {
      case "json":
        formatJson(allServers);
        break;
      case "csv":
        formatCsv(allServers);
        break;
      case "table":
      default:
        formatTable(allServers);
    }

    // Resumo final
    console.log(
      `${colors.dim}Total: ${allServers.length} servidor(s) ativo(s)${colors.reset}`,
    );
  } catch (err) {
    console.error(`${colors.red}❌ Erro: ${err.message}${colors.reset}`);
    process.exit(1);
  }
}

main();
