/**
 * Configuração dinâmica do frontend
 * Permite que o site funcione em diferentes ambientes (local, produção, etc)
 *
 * Uso:
 * - Localmente: App detecta automaticamente http://localhost:3000
 * - Produção: Edite as URLs abaixo para apontar para seu domínio/IP
 *
 * Exemplos:
 * API_BASE: 'https://exemplo.com' ou 'http://192.168.1.100:3000'
 * WS_BASE: 'wss://exemplo.com' ou 'ws://192.168.1.100:8080'
 */

(function () {
  // Detectar ambiente automaticamente
  const hostname = window.location.hostname;
  const isLocalhost = hostname === "localhost" || hostname === "127.0.0.1";
  const protocol = window.location.protocol;

  // Defaults para desenvolvimento local
  if (isLocalhost) {
    window.APP_CONFIG = {
      // API do dashboard (lista de servidores, CRUD)
      API_BASE: `${protocol}//${hostname}:3000`,

      // WebSocket do servidor de sinalização
      WS_BASE: `${protocol === "https:" ? "wss" : "ws"}://${hostname}:8080`,

      // Ambiente
      ENV: "development",
      DEBUG: true,
    };
  } else {
    // Produção: EDITE AQUI com seu domínio/IP público
    window.APP_CONFIG = {
      // Substitua 'seu-dominio.com' pelo seu domínio ou IP público
      API_BASE: "https://seu-dominio.com",

      // Para WSS, use o mesmo domínio se nginx fizer proxy de /ws
      // Ou use um subdomínio: 'wss://ws.seu-dominio.com'
      WS_BASE: "wss://seu-dominio.com/ws",

      // Ambiente
      ENV: "production",
      DEBUG: false,
    };
  }

  // Log da configuração ativa (só em desenvolvimento)
  if (window.APP_CONFIG.DEBUG) {
    console.log("[APP_CONFIG]", {
      api: window.APP_CONFIG.API_BASE,
      ws: window.APP_CONFIG.WS_BASE,
      env: window.APP_CONFIG.ENV,
    });
  }
})();
