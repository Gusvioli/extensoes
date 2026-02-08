// server/test-health.js
const http = require("http");

// URL padrão aponta para a porta padrão do servidor (8080)
const TARGET_URL = process.argv[2] || "http://localhost:8081/health";

console.log(`🏥 Iniciando teste de health check em: ${TARGET_URL}`);

const req = http.get(TARGET_URL, (res) => {
  let data = "";

  res.on("data", (chunk) => {
    data += chunk;
  });

  res.on("end", () => {
    console.log(`📥 Status Code: ${res.statusCode}`);

    if (res.statusCode !== 200) {
      console.error(`❌ ERRO: Esperado 200, recebido ${res.statusCode}`);
      process.exit(1);
    }

    try {
      const json = JSON.parse(data);
      console.log("📄 Resposta:", JSON.stringify(json, null, 2));

      if (json.status === "ok") {
        console.log(
          "\n✅ SUCESSO: O endpoint /health está respondendo corretamente!",
        );
        process.exit(0);
      } else {
        console.error("\n❌ ERRO: A resposta JSON não contém { status: 'ok' }");
        process.exit(1);
      }
    } catch (e) {
      console.error(`\n❌ ERRO: Falha ao processar JSON: ${e.message}`);
      console.error("Conteúdo recebido:", data);
      process.exit(1);
    }
  });
});

req.on("error", (err) => {
  console.error(`\n❌ ERRO DE CONEXÃO: ${err.message}`);
  console.error("Dica: Verifique se o servidor está rodando (npm start).");
  process.exit(1);
});

req.setTimeout(5000, () => {
  console.error(
    "\n❌ ERRO: Timeout (5s) - O servidor demorou muito para responder.",
  );
  req.destroy();
  process.exit(1);
});
