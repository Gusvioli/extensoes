// backend_dashboard/router.js
const url = require("url");

class Router {
  constructor() {
    this.routes = [];
  }

  add(method, path, handler) {
    this.routes.push({
      method: method.toUpperCase(),
      path: path.toLowerCase(),
      handler,
    });
  }

  get(path, handler) {
    this.add("GET", path, handler);
  }

  post(path, handler) {
    this.add("POST", path, handler);
  }

  put(path, handler) {
    this.add("PUT", path, handler);
  }

  delete(path, handler) {
    this.add("DELETE", path, handler);
  }

  async handle(req, res) {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;
    // Normalizar path (remove barra final)
    const rawPath = pathname.replace(/\/+$/, "") || "/";
    const normalizedPath = rawPath.toLowerCase();

    const route = this.routes.find(
      (r) => r.method === req.method && r.path === normalizedPath
    );

    if (route) {
      try {
        await route.handler(req, res, parsedUrl);
      } catch (err) {
        console.error(`Erro na rota ${req.method} ${normalizedPath}:`, err);
        if (!res.headersSent) {
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Erro interno do servidor" }));
        }
      }
      return true; // Rota encontrada e processada
    }
    return false; // Rota não encontrada
  }
}

module.exports = Router;
