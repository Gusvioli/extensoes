const crypto = require("crypto");
const config = require("./config");
const logger = require("./logger");

let nodemailer;
try {
  nodemailer = require("nodemailer");
} catch (e) {
  logger.warn(
    "⚠️  Módulo 'nodemailer' não encontrado. E-mails serão simulados no console.",
  );
}

function parseCookies(req) {
  const list = {};
  const cookieHeader = req.headers?.cookie;
  if (!cookieHeader) return list;

  cookieHeader.split(";").forEach(function (cookie) {
    let [name, ...rest] = cookie.split("=");
    name = name?.trim();
    if (!name) return;
    const value = rest.join("=").trim();
    if (!value) return;
    list[name] = decodeURIComponent(value);
  });
  return list;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => resolve(body));
    req.on("error", (err) => reject(err));
  });
}

function send401(res) {
  logger.debug("ℹ️  Acesso negado (401) - Sessão inválida ou expirada");
  res.setHeader(
    "Set-Cookie",
    "session_token=; HttpOnly; SameSite=Lax; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT",
  );
  res.writeHead(401, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Não autenticado" }));
}

function send403(res) {
  logger.warn("⚠️  Acesso negado (403) - Permissão insuficiente");
  res.writeHead(403, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Acesso negado: Permissão insuficiente" }));
}

function validateServerData(data, isUpdate = false) {
  const errors = [];
  if (isUpdate && (!data.id || typeof data.id !== "string"))
    errors.push("ID do servidor é inválido.");
  if (!data.name || typeof data.name !== "string" || data.name.trim() === "")
    errors.push("O nome do servidor é obrigatório.");
  if (
    !data.host ||
    typeof data.host !== "string" ||
    !/^[a-zA-Z0-9.-]+$/.test(data.host)
  )
    errors.push("O host do servidor é inválido.");

  if (
    data.port !== undefined &&
    data.port !== null &&
    String(data.port).trim() !== ""
  ) {
    const portNum = Number(data.port);
    if (
      isNaN(portNum) ||
      !Number.isInteger(portNum) ||
      portNum < 1 ||
      portNum > 65535
    ) {
      errors.push(
        "A porta do servidor deve ser um número inteiro entre 1 e 65535.",
      );
    } else {
      data.port = portNum;
    }
  } else {
    data.port = null;
  }

  if (!["ws", "wss"].includes(data.protocol))
    errors.push('O protocolo deve ser "ws" ou "wss".');
  if (!["active", "inactive", "standby"].includes(data.status))
    errors.push("O status é inválido.");
  if (
    typeof data.maxClients !== "number" ||
    !Number.isInteger(data.maxClients) ||
    data.maxClients < 0
  )
    errors.push(
      "A capacidade de clientes deve ser um número inteiro positivo.",
    );
  if (!data.token || typeof data.token !== "string" || data.token.trim() === "")
    errors.push("O token do servidor é obrigatório.");

  return errors;
}

async function sendEmail(to, subject, text, html) {
  if (!nodemailer || !config.SMTP.HOST || !config.SMTP.USER) {
    logger.info(
      `\n📧 [EMAIL MOCK] Para: ${to} | Assunto: ${subject} | Code: ${text}\n`,
    );
    return true;
  }
  const transporter = nodemailer.createTransport({
    host: config.SMTP.HOST,
    port: config.SMTP.PORT,
    secure: config.SMTP.SECURE,
    auth: { user: config.SMTP.USER, pass: config.SMTP.PASS },
    tls: { rejectUnauthorized: false },
  });
  try {
    await transporter.sendMail({
      from: config.SMTP.FROM,
      to,
      subject,
      text,
      html,
    });
    logger.info(`✅ E-mail enviado para ${to}`);
    return true;
  } catch (error) {
    logger.error("❌ Erro ao enviar e-mail:", error);
    return false;
  }
}

module.exports = {
  parseCookies,
  readBody,
  send401,
  send403,
  validateServerData,
  sendEmail,
};
