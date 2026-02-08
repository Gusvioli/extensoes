// Configuração do Frontend
// Altere a URL abaixo para o IP/Domínio onde o backend_dashboard está rodando

let apiBase = window.location.origin;
const host = window.location.hostname;
const port = window.location.port;

// Correção para Dev: Se estiver em ambiente local/dev mas porta errada (ex: 8080), aponta para 3000
const isLocal =
  host === "localhost" ||
  host === "127.0.0.1" ||
  host.startsWith("192.168.") ||
  host.startsWith("10.");

if (isLocal && port !== "3000") {
  apiBase = `${window.location.protocol}//${host}:3000`;
  console.warn(
    `⚠️ Frontend na porta ${port}. API redirecionada para ${apiBase}`,
  );
}

window.APP_CONFIG = {
  API_BASE: apiBase || "http://localhost:3000",
  ENV: "production",
};
