#!/usr/bin/env node

/**
 * Script para sincronizar token do servidor com a configuração do dashboard
 * Lê o token do arquivo TOKEN.txt (gerado pelo servidor) e atualiza servers-config.json
 */

const fs = require("fs");
const path = require("path");

const dashboardDir = path.join(__dirname, "..");
const serverDir = path.join(dashboardDir, "../server");
const tokenFile = path.join(serverDir, "TOKEN.txt");
const configFile = path.join(dashboardDir, "data/servers-config.json");

console.log("🔄 Sincronizando token do servidor com dashboard...\n");

try {
  // Ler token do arquivo TOKEN.txt
  if (!fs.existsSync(tokenFile)) {
    console.error(`❌ Arquivo de token não encontrado: ${tokenFile}`);
    console.error(
      "Certifique-se de que o servidor foi iniciado pelo menos uma vez.",
    );
    process.exit(1);
  }

  const tokenContent = fs.readFileSync(tokenFile, "utf-8");
  const tokenMatch = tokenContent.match(/Token: ([a-f0-9]+)/);

  if (!tokenMatch) {
    console.error("❌ Token não encontrado no arquivo TOKEN.txt");
    process.exit(1);
  }

  const serverToken = tokenMatch[1].trim();
  console.log(`✓ Token do servidor: ${serverToken}`);

  // Ler configuração atual
  if (!fs.existsSync(configFile)) {
    console.error(`❌ Arquivo de configuração não encontrado: ${configFile}`);
    process.exit(1);
  }

  let config = JSON.parse(fs.readFileSync(configFile, "utf-8"));
  console.log(
    `✓ Configuração carregada com ${config.servers.length} servidor(s)`,
  );

  // Atualizar token de TODOS os servidores ativos
  let updated = 0;
  config.servers.forEach((server) => {
    if (server.status === "active") {
      if (server.token !== serverToken) {
        console.log(
          `  → Atualizando token de "${server.name}": ${server.token} → ${serverToken}`,
        );
        server.token = serverToken;
        updated++;
      } else {
        console.log(`  ✓ "${server.name}" já possui token correto`);
      }
    }
  });

  if (updated === 0 && config.servers.length > 0) {
    console.log("\n✅ Todos os servidores já possuem o token correto!");
    process.exit(0);
  }

  // Salvar configuração atualizada
  fs.writeFileSync(configFile, JSON.stringify(config, null, 2));
  console.log(
    `\n✅ Configuração atualizada! ${updated} servidor(s) sincronizado(s)`,
  );
  console.log(`📁 Arquivo: ${configFile}`);
  console.log(
    `\n🚀 Próximo passo: Recarregue http://localhost:3000/view.html no navegador`,
  );
} catch (err) {
  console.error(`\n❌ Erro ao sincronizar: ${err.message}`);
  process.exit(1);
}
