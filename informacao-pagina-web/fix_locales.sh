#!/bin/bash

# Define o diretório base do projeto
PROJECT_DIR="/home/gusvioli/Documentos/extencoes_especiais/informacao-pagina-web"

echo "🔧 Iniciando correção da estrutura de locales em: $PROJECT_DIR"

# Entra no diretório
cd "$PROJECT_DIR" || { echo "❌ Diretório não encontrado!"; exit 1; }

# 1. Limpeza: Remove o arquivo messages.json da raiz se existir (ele não deve estar aqui)
if [ -f "messages.json" ]; then
    echo "🗑️  Removendo messages.json da raiz (local incorreto)..."
    rm "messages.json"
fi

# 2. Criação das pastas obrigatórias
echo "wm  Criando pastas _locales/pt_BR e _locales/en..."
mkdir -p _locales/pt_BR
mkdir -p _locales/en

# 3. Criando o arquivo de tradução em Português (pt_BR)
echo "📝 Escrevendo _locales/pt_BR/messages.json..."
cat > _locales/pt_BR/messages.json << 'EOF'
{
  "appName": { "message": "Analisador de Página Web" },
  "appDesc": { "message": "Analisa a página ativa para extrair metadados, SEO, tecnologias e dados técnicos." },
  "tabMetadata": { "message": "Metadados" },
  "tabContent": { "message": "Conteúdo" },
  "tabTechnical": { "message": "Técnico" },
  "tabHidden": { "message": "Oculto" },
  "tabSeo": { "message": "SEO" },
  "btnExport": { "message": "Exportar JSON" },
  "btnReport": { "message": "Ver Relatório Completo" },
  "btnDonate": { "message": "☕ Apoiar com PayPal" },
  "donateTitle": { "message": "Apoie o desenvolvimento" },
  "donateDesc": { "message": "Sua contribuição incentiva a criação de novos recursos e ajuda a manter o projeto vivo!" },
  "donateBtnLabel": { "message": "Doar com PayPal" },
  "donateThanks": { "message": "Obrigado pelo seu apoio! ❤️" },
  "scanQr": { "message": "Escanear" },
  "analyzing": { "message": "Analisando..." },
  "desc_title": { "message": "Título principal exibido na aba do navegador." },
  "desc_description": { "message": "Resumo do conteúdo utilizado por motores de busca." },
  "desc_keywords": { "message": "Palavras-chave definidas para indexação (SEO)." },
  "desc_author": { "message": "Autor ou responsável pelo conteúdo da página." },
  "desc_loadTime": { "message": "Tempo total para carregar a página (navegação)." },
  "desc_technologies": { "message": "Bibliotecas ou frameworks detectados na página." },
  "desc_score": { "message": "Pontuação estimada de SEO baseada nos critérios abaixo (0-100)." }
}
EOF

# 4. Criando o arquivo de tradução em Inglês (en)
echo "📝 Escrevendo _locales/en/messages.json..."
cat > _locales/en/messages.json << 'EOF'
{
  "appName": { "message": "Web Page Analyzer" },
  "appDesc": { "message": "Analyzes the active page to extract metadata, SEO, technologies, and technical data." },
  "tabMetadata": { "message": "Metadata" },
  "tabContent": { "message": "Content" },
  "tabTechnical": { "message": "Technical" },
  "tabHidden": { "message": "Hidden" },
  "tabSeo": { "message": "SEO" },
  "btnExport": { "message": "Export JSON" },
  "btnReport": { "message": "View Full Report" },
  "btnDonate": { "message": "☕ Support with PayPal" },
  "donateTitle": { "message": "Support development" },
  "donateDesc": { "message": "Your contribution encourages the creation of new features and helps keep the project alive!" },
  "donateBtnLabel": { "message": "Donate with PayPal" },
  "donateThanks": { "message": "Thanks for your support! ❤️" },
  "scanQr": { "message": "Scan" },
  "analyzing": { "message": "Analyzing..." },
  "desc_title": { "message": "Main title displayed in the browser tab." },
  "desc_description": { "message": "Content summary used by search engines." },
  "desc_keywords": { "message": "Keywords defined for indexing (SEO)." },
  "desc_author": { "message": "Author or person responsible for the page content." },
  "desc_loadTime": { "message": "Total time to load the page (navigation)." },
  "desc_technologies": { "message": "Libraries or frameworks detected on the page." },
  "desc_score": { "message": "Estimated SEO score based on the criteria below (0-100)." }
}
EOF

echo "✅ Concluído! A estrutura de pastas foi corrigida."
echo "📂 Estrutura atual:"
ls -R _locales
