const fs = require("fs");
const { execSync } = require("child_process");

const FILES_TO_ZIP = [
  "manifest.json",
  "src",
  "icons",
  "PRIVACY_POLICY.md",
  "README.md",
];

const ICON_MAPPING = {
  "autotabsflow_icon.png": "icons/icon128.png",
  "autotabsflow_icon48.png": "icons/icon48.png",
  "autotabsflow_icon16.png": "icons/icon16.png",
};

console.log("🚀 Iniciando preparação para Chrome Web Store...\n");

// 1. Processar Ícones
console.log("🎨 Verificando ícones...");
if (!fs.existsSync("icons")) fs.mkdirSync("icons");

let missingIcons = false;
for (const [downloadedName, destPath] of Object.entries(ICON_MAPPING)) {
  if (fs.existsSync(downloadedName)) {
    fs.copyFileSync(downloadedName, destPath);
    console.log(`✅ Ícone atualizado: ${destPath}`);
    // Opcional: deletar o arquivo da raiz após mover
    // fs.unlinkSync(downloadedName);
  } else if (!fs.existsSync(destPath)) {
    console.warn(
      `⚠️  Aviso: Ícone não encontrado: ${downloadedName} (e nem ${destPath} existe)`,
    );
    missingIcons = true;
  } else {
    console.log(`ℹ️  Usando ícone existente: ${destPath}`);
  }
}

// 2. Criar ZIP
const zipName = "AutoTabsFlow_Package.zip";
console.log(`\n📦 Criando arquivo: ${zipName}`);

try {
  if (fs.existsSync(zipName)) fs.unlinkSync(zipName);

  // Comando zip recursivo (-r) para Linux/Mac
  const filesStr = FILES_TO_ZIP.join(" ");
  execSync(`zip -r ${zipName} ${filesStr}`);

  console.log(`\n✅ PACOTE CRIADO COM SUCESSO!`);
  console.log(`👉 Arquivo pronto para upload: ${process.cwd()}/${zipName}`);
} catch (e) {
  console.error(
    "❌ Erro ao zipar (certifique-se que o comando 'zip' está instalado):",
    e.message,
  );
}
