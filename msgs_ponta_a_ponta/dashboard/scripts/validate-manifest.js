const fs = require("fs");
const path = require("path");

const MANIFEST_PATH = path.join(__dirname, "../../extension/manifest.json");

function validateManifest() {
  console.log(`🔍 Validando manifest.json em: ${MANIFEST_PATH}`);

  if (!fs.existsSync(MANIFEST_PATH)) {
    console.error("❌ Erro: Arquivo manifest.json não encontrado.");
    process.exit(1);
  }

  let manifest;
  try {
    const content = fs.readFileSync(MANIFEST_PATH, "utf8");
    manifest = JSON.parse(content);
  } catch (e) {
    console.error("❌ Erro: Falha ao analisar JSON do manifest.", e.message);
    process.exit(1);
  }

  const errors = [];

  // 1. Versão do Manifest
  if (manifest.manifest_version !== 3) {
    errors.push(
      `'manifest_version' deve ser 3. Encontrado: ${manifest.manifest_version}`,
    );
  }

  // 2. Background Service Worker
  if (manifest.background) {
    if (manifest.background.scripts) {
      errors.push(
        "'background.scripts' não é suportado no Manifest V3. Use 'background.service_worker'.",
      );
    }
    if (manifest.background.page) {
      errors.push(
        "'background.page' não é suportado no Manifest V3. Use 'background.service_worker'.",
      );
    }
    if (!manifest.background.service_worker && !manifest.background.type) {
      errors.push("'background' definido, mas 'service_worker' está ausente.");
    }
  }

  // 3. Action API
  if (manifest.browser_action) {
    errors.push(
      "'browser_action' foi substituído por 'action' no Manifest V3.",
    );
  }
  if (manifest.page_action) {
    errors.push("'page_action' foi substituído por 'action' no Manifest V3.");
  }

  // 4. Content Security Policy
  if (manifest.content_security_policy) {
    if (typeof manifest.content_security_policy === "string") {
      errors.push(
        '\'content_security_policy\' deve ser um objeto no Manifest V3 (ex: { "extension_pages": "..." }).',
      );
    } else {
      if (manifest.content_security_policy.extension_pages) {
        if (
          manifest.content_security_policy.extension_pages.includes(
            "'unsafe-eval'",
          )
        ) {
          errors.push(
            "CSP 'extension_pages' não pode conter 'unsafe-eval' no Manifest V3.",
          );
        }
      }
    }
  }

  // 5. Host Permissions (Separação)
  if (manifest.permissions) {
    const hostRegex = /^(\*|http|https|file|ftp|urn):\/\//;
    const hostsInPermissions = manifest.permissions.filter(
      (p) => hostRegex.test(p) || p === "<all_urls>",
    );

    if (hostsInPermissions.length > 0) {
      errors.push(
        `Permissões de host (${hostsInPermissions.join(", ")}) devem estar em 'host_permissions', não em 'permissions'.`,
      );
    }
  }

  // 6. Web Accessible Resources (Estrutura)
  if (manifest.web_accessible_resources) {
    if (!Array.isArray(manifest.web_accessible_resources)) {
      errors.push("'web_accessible_resources' deve ser um array.");
    } else if (manifest.web_accessible_resources.length > 0) {
      const hasStrings = manifest.web_accessible_resources.some(
        (r) => typeof r === "string",
      );
      if (hasStrings) {
        errors.push(
          "'web_accessible_resources' deve ser um array de objetos no Manifest V3 (com 'resources' e 'matches'), não strings.",
        );
      }
    }
  }

  // Relatório Final
  if (errors.length > 0) {
    console.log("\n❌ Erros Encontrados:");
    errors.forEach((e) => console.log(`   - ${e}`));
    console.log(
      "\n💥 Validação falhou. Corrija os erros acima para conformidade com Manifest V3.",
    );
    process.exit(1);
  } else {
    console.log("\n✅ Manifest.json válido para Versão 3!");
    process.exit(0);
  }
}

validateManifest();
