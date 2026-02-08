// server/test-load-ip-limit.js
const WebSocket = require("ws");

const TARGET_URL = process.argv[2] || "ws://localhost:8081";
// Tenta abrir 50 conexões (o padrão do servidor é 20 por IP)
const CONNECTION_COUNT = parseInt(process.argv[3] || "50", 10);
const DELAY_MS = 20; // Pequeno delay para não travar a rede local instantaneamente

console.log(`🚀 Iniciando teste de carga de IP em: ${TARGET_URL}`);
console.log(`🎯 Tentando abrir ${CONNECTION_COUNT} conexões simultâneas...`);
console.log("Legenda: ✅=Sucesso  ⛔=Bloqueado(IP Limit)  ❌=Erro\n");

let connected = 0;
let rejected = 0;
let errors = 0;
const clients = [];

function connect(index) {
  const ws = new WebSocket(TARGET_URL);

  ws.on("open", () => {
    connected++;
    process.stdout.write("✅");
    clients.push(ws);
  });

  ws.on("close", (code, reason) => {
    // 1008 é o código usado pelo servidor para Policy Violation (IP Limit)
    if (code === 1008) {
      rejected++;
      process.stdout.write("⛔");
    }
  });

  ws.on("error", (err) => {
    // Em alguns casos o erro vem antes do close ou como resposta HTTP 4xx
    if (err.message.includes("429") || err.message.includes("1008")) {
      rejected++;
      process.stdout.write("⛔");
    } else {
      errors++;
      // Logar o primeiro erro para ajudar no diagnóstico
      if (errors === 1) {
        console.error(`\n[ERRO DETECTADO] ${err.message}`);
      }
      process.stdout.write("❌");
    }
  });
}

let i = 0;
const interval = setInterval(() => {
  if (i >= CONNECTION_COUNT) {
    clearInterval(interval);
    console.log("\n\n⏳ Aguardando estabilização...");
    setTimeout(report, 2000);
    return;
  }
  connect(i++);
}, DELAY_MS);

function report() {
  console.log("\n📊 Relatório Final:");
  console.log("-------------------");
  console.log(`✅ Conectados: ${connected}`);
  console.log(`⛔ Bloqueados: ${rejected}`);
  console.log(`❌ Erros:      ${errors}`);
  console.log("-------------------");
  console.log(`Total Tentativas: ${CONNECTION_COUNT}`);

  if (rejected > 0) {
    console.log("\n✅ SUCESSO: O limite de conexões por IP está funcionando!");
  } else {
    console.log(
      "\n⚠️  AVISO: Nenhuma conexão foi bloqueada. Verifique se o limite (MAX_CONNS_PER_IP) está configurado corretamente.",
    );
  }

  // Limpeza
  clients.forEach((c) => c.close());
  process.exit(0);
}
