const controllers = require("./controllers");
const config = require("./config");

/**
 * Aplica headers de CORS (Cross-Origin Resource Sharing)
 */
function applyCors(req, res) {
  const allowedOrigins = config.ALLOWED_ORIGINS;
  const origin = req.headers.origin;

  if (allowedOrigins.includes("*")) {
    // FIX: Com credentials=true, não podemos retornar '*'. Refletir a origem se existir.
    if (origin) {
      res.setHeader("Access-Control-Allow-Origin", origin);
    }
  } else if (origin && allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }

  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS",
  );
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

/**
 * Aplica headers de segurança (HSTS, CSP, etc.)
 */
function applySecurityHeaders(res) {
  res.setHeader(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains",
  ); // Força HTTPS
  res.setHeader("X-Content-Type-Options", "nosniff"); // Previne MIME sniffing
  res.setHeader("X-Frame-Options", "DENY"); // Previne Clickjacking
  res.setHeader("X-XSS-Protection", "1; mode=block"); // Proteção XSS legado
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin"); // Privacidade de Referrer
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' ws: wss:;",
  ); // CSP Robusto
  res.setHeader(
    "Permissions-Policy",
    "geolocation=(), microphone=(), camera=()",
  ); // Desabilita features sensíveis
}

/**
 * Middleware de autenticação: Anexa o usuário ao request se autenticado
 */
async function authenticate(req) {
  req.user = await controllers.getAuthenticatedUser(req);
}

module.exports = {
  applyCors,
  applySecurityHeaders,
  authenticate,
};
