const fs = require("fs");
const path = require("path");

// Tenta carregar o sharp, avisa se faltar
let sharp;
try {
  sharp = require("sharp");
} catch (e) {
  console.error(
    '\n❌ Erro: A biblioteca "sharp" é necessária para gerar imagens.',
  );
  console.error("👉 Por favor, instale rodando: npm install sharp\n");
  process.exit(1);
}

const SIZES = [16, 32, 48, 128];
const INPUT_FILE = path.join(__dirname, "../../extension/icon.svg");
const OUTPUT_DIR = path.join(__dirname, "../../extension/icons");

async function generateIcons() {
  console.log(`🎨 Lendo ícone original: ${INPUT_FILE}`);

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log(`📁 Diretório criado: ${OUTPUT_DIR}`);
  }

  console.log("⚙️  Convertendo SVG para PNG...");

  for (const size of SIZES) {
    const fileName = `icon-${size}.png`;
    const outputPath = path.join(OUTPUT_DIR, fileName);

    try {
      await sharp(INPUT_FILE).resize(size, size).png().toFile(outputPath);
      console.log(`   ✅ ${fileName} (${size}x${size})`);
    } catch (err) {
      console.error(`   ❌ Erro ao gerar ${fileName}:`, err.message);
    }
  }

  console.log("\n✨ Concluído! Ícones prontos para a Chrome Web Store.");
}

generateIcons();
