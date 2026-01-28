#!/bin/bash

# ============================================================================
# Script de Inicialização do Servidor P2P Seguro
# ============================================================================
# Este script inicia o servidor com configurações de segurança recomendadas

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}═════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}   🔐 P2P Secure Chat - Servidor de Sinalização${NC}"
echo -e "${BLUE}═════════════════════════════════════════════════════════${NC}"
echo ""

# Verifica se estamos na pasta correta
if [ ! -f "server.js" ]; then
    echo -e "${RED}❌ Erro: server.js não encontrado na pasta atual${NC}"
    echo -e "${YELLOW}Execute este script de dentro da pasta 'server/'${NC}"
    exit 1
fi

# Verifica se node_modules existe
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 Instalando dependências...${NC}"
    npm install
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Erro ao instalar dependências${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ Dependências instaladas${NC}"
fi

# Verifica e libera portas se necessário
echo -e "${YELLOW}🔍 Verificando disponibilidade de portas...${NC}"
if [ -f "manage-ports.js" ]; then
    # Tenta liberar porta 8080 se estiver ocupada
    if ! timeout 1 bash -c "echo >/dev/tcp/127.0.0.1/8080" 2>/dev/null; then
        echo -e "${GREEN}✅ Porta 8080 disponível${NC}"
    else
        echo -e "${YELLOW}⚠️  Porta 8080 ocupada. Liberando...${NC}"
        node manage-ports.js kill 8080 2>/dev/null || true
        sleep 1
    fi
fi

echo ""
echo -e "${YELLOW}⚙️  Configurações de Segurança:${NC}"
echo ""

# Valores padrão
PORT=${PORT:-8080}
AUTH_TOKEN=${AUTH_TOKEN:-$(openssl rand -hex 16)}
REQUIRE_AUTH=${REQUIRE_AUTH:-true}
DISABLE_DEFLATE=${DISABLE_DEFLATE:-true}
MAX_CLIENTS=${MAX_CLIENTS:-10000}
RATE_LIMIT_MAX=${RATE_LIMIT_MAX:-100}

echo -e "${BLUE}📍 Porta:${NC} $PORT"
echo -e "${BLUE}🔐 Autenticação:${NC} $([ "$REQUIRE_AUTH" = "true" ] && echo -e "${GREEN}ATIVADA${NC}" || echo -e "${RED}DESATIVADA${NC}")"
echo -e "${BLUE}🔑 Token:${NC} ${AUTH_TOKEN:0:8}...${AUTH_TOKEN: -4}"
echo -e "${BLUE}🛡️  Compressão Deflate:${NC} $([ "$DISABLE_DEFLATE" = "true" ] && echo -e "${GREEN}DESABILITADA${NC}" || echo -e "${RED}ATIVADA${NC}")"
echo -e "${BLUE}👥 Limite de Clientes:${NC} $MAX_CLIENTS"
echo -e "${BLUE}⏱️  Rate Limit:${NC} $RATE_LIMIT_MAX msgs/segundo"

echo ""
echo -e "${YELLOW}💡 Para as extensões clientes:${NC}"
echo -e "${GREEN}   • URL do Servidor: ws://localhost:$PORT${NC}"
echo -e "${GREEN}   • Token de Autenticação: $AUTH_TOKEN${NC}"

echo ""
echo -e "${YELLOW}⚠️  Para usar token customizado, execute:${NC}"
echo -e "   ${BLUE}AUTH_TOKEN=\"seu-token-secreto\" npm start${NC}"

echo ""
echo -e "${YELLOW}🚀 Iniciando servidor...${NC}"
echo -e "${BLUE}═════════════════════════════════════════════════════════${NC}"
echo ""

# Inicia o servidor com as variáveis de ambiente
PORT=$PORT \
AUTH_TOKEN=$AUTH_TOKEN \
REQUIRE_AUTH=$REQUIRE_AUTH \
DISABLE_DEFLATE=$DISABLE_DEFLATE \
MAX_CLIENTS=$MAX_CLIENTS \
RATE_LIMIT_MAX=$RATE_LIMIT_MAX \
npm start

# Captura o código de saída
EXIT_CODE=$?

echo ""
echo -e "${BLUE}═════════════════════════════════════════════════════════${NC}"
if [ $EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✅ Servidor encerrado com sucesso${NC}"
else
    echo -e "${RED}❌ Servidor encerrou com erro (código: $EXIT_CODE)${NC}"
fi
echo -e "${BLUE}═════════════════════════════════════════════════════════${NC}"

exit $EXIT_CODE
