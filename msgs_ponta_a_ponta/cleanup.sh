#!/bin/bash

echo "🧹 Iniciando limpeza de arquivos obsoletos..."

# Remove arquivos substituídos pela nova arquitetura
rm -vf Dockerfile
rm -vf start.sh
rm -vf create-project.js
rm -vf dashboard/scripts/sync-token.js
rm -vf README_TOKEN.txt

echo "✅ Limpeza concluída!"
echo "🚀 O projeto agora está limpo. Use './start-app.sh' para gerenciar tudo."