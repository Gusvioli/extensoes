const fs = require("fs");
const path = require("path");

// Tenta carregar o sharp
let sharp;
try {
  sharp = require("sharp");
} catch (e) {
  console.error('\n❌ Erro: A biblioteca "sharp" é necessária.');
  console.error("👉 Por favor, instale rodando: npm install sharp\n");
  process.exit(1);
}

const INPUT_FILE = path.join(__dirname, "../../extension/icon.svg");
const OUTPUT_DIR = path.join(__dirname, "../public");

async function generateFavicon() {
  console.log(`🎨 Lendo ícone original: ${INPUT_FILE}`);

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  try {
    // Gera favicon.ico (Redimensionado para 32x32)
    // Nota: Salvamos como PNG com extensão .ico para compatibilidade web moderna sem dependências extras
    await sharp(INPUT_FILE)
      .resize(32, 32)
      .png()
      .toFile(path.join(OUTPUT_DIR, "favicon.ico"));
    console.log("✅ dashboard/public/favicon.ico gerado com sucesso!");
  } catch (err) {
    console.error("❌ Erro ao gerar favicon:", err.message);
  }
}

generateFavicon();
