// Configuração do Frontend
// Altere a URL abaixo para o IP/Domínio onde o backend_dashboard está rodando

let apiBase = window.location.origin;
const host = window.location.hostname;
const port = window.location.port;

// Correção para Dev: Se estiver no localhost mas porta errada (ex: 8080), aponta para 3000
if ((host === "localhost" || host === "127.0.0.1") && port !== "3000") {
  apiBase = `${window.location.protocol}//${host}:3000`;
  console.warn(
    `⚠️ Frontend na porta ${port}. API redirecionada para ${apiBase}`,
  );
}

window.APP_CONFIG = {
  API_BASE: apiBase || "http://localhost:3000",
  ENV: "production",
};
