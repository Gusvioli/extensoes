#!/bin/bash

# Diretórios
BASE_DIR=$(pwd)
SERVER_DIR="$BASE_DIR/server"
DASHBOARD_DIR="$BASE_DIR/dashboard"

# Cores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

function print_header() {
    echo -e "${BLUE}=========================================${NC}"
    echo -e "${BLUE}   Gerenciador P2P Secure Chat           ${NC}"
    echo -e "${BLUE}=========================================${NC}"
}

# Função para executar docker-compose (V1 ou V2)
function run_compose() {
    if command -v docker-compose &> /dev/null; then
        docker-compose "$@"
    elif docker compose version &> /dev/null; then
        docker compose "$@"
    else
        echo -e "${RED}Erro: Docker Compose não encontrado (instale docker-compose ou docker plugin).${NC}"
        return 1
    fi
}

function check_node() {
    if ! command -v node &> /dev/null; then
        echo -e "${RED}Erro: Node.js não encontrado. Instale o Node.js para continuar.${NC}"
        exit 1
    fi
}

function start_server() {
    echo -e "${GREEN}🚀 Iniciando Servidor de Sinalização...${NC}"
    cd "$SERVER_DIR" || { echo -e "${RED}Diretório 'server' não encontrado!${NC}"; exit 1; }
    
    if [ ! -d "node_modules" ]; then
        echo -e "${YELLOW}📦 Instalando dependências do servidor...${NC}"
        npm install --silent
    fi

    # Gera um token aleatório se não for fornecido (para segurança local)
    if [ -z "$AUTH_TOKEN" ]; then
        export AUTH_TOKEN=$(openssl rand -hex 16)
        echo -e "${YELLOW}🔑 Token de Autenticação gerado: ${GREEN}$AUTH_TOKEN${NC}"
    fi

    # Inicia em background
    npm start &
    SERVER_PID=$!
    echo -e "✅ Servidor rodando (PID: $SERVER_PID)"
    cd "$BASE_DIR"
}

function start_dashboard() {
    echo -e "${GREEN}📊 Iniciando Dashboard...${NC}"
    export DATABASE_URL="postgresql://gerente:admin@localhost:5432/dashboard_p2p"
    cd "$DASHBOARD_DIR" || { echo -e "${RED}Diretório 'dashboard' não encontrado!${NC}"; exit 1; }
    
    if [ ! -d "node_modules" ]; then
        echo -e "${YELLOW}📦 Instalando dependências do dashboard...${NC}"
        npm install --silent
    fi

    # Inicia em background
    npm start &
    DASH_PID=$!
    echo -e "✅ Dashboard rodando (PID: $DASH_PID)"
    cd "$BASE_DIR"
}

function stop_all() {
    echo -e "\n${RED}🛑 Parando serviços...${NC}"
    # Tenta matar os processos filhos do script
    if [ -n "$SERVER_PID" ]; then kill $SERVER_PID 2>/dev/null; fi
    if [ -n "$DASH_PID" ]; then kill $DASH_PID 2>/dev/null; fi
    
    # Limpeza forçada por nome (caso processos tenham se desvinculado)
    pkill -f "node src/server.js" 2>/dev/null
    pkill -f "node server/server.js" 2>/dev/null
    
    echo "Serviços encerrados."
}

case "$1" in
    "all")
        check_node
        print_header
        
        if [ -f "docker-compose.db.yml" ]; then
            echo -e "${YELLOW}🐳 Iniciando Banco de Dados (docker-compose.db.yml)...${NC}"
            run_compose -f docker-compose.db.yml up -d
        elif [ -f "docker-compose.yml" ]; then
            echo -e "${YELLOW}🐳 Iniciando Banco de Dados (apenas Postgres)...${NC}"
            # Inicia apenas o serviço postgres para evitar conflito com npm start
            run_compose up -d postgres
        fi

        start_server
        sleep 2 # Pausa para garantir que o servidor inicie antes do dashboard (opcional)
        start_dashboard
        
        echo -e "\n${BLUE}🌐 Aplicações disponíveis:${NC}"
        echo -e "   - Servidor WebSocket: ${YELLOW}ws://localhost:8080${NC}"
        echo -e "   - Dashboard Web:      ${YELLOW}http://localhost:3000${NC}"
        echo -e "\n${RED}Pressione Ctrl+C para parar tudo.${NC}"
        
        trap "stop_all; exit" SIGINT SIGTERM
        wait
        ;;
    "server")
        check_node
        print_header
        start_server
        trap "stop_all; exit" SIGINT SIGTERM
        wait
        ;;
    "dashboard")
        check_node
        print_header
        start_dashboard
        trap "stop_all; exit" SIGINT SIGTERM
        wait
        ;;
    "docker")
        print_header
        echo -e "${YELLOW}🐳 Iniciando via Docker...${NC}"
        
        if [ -f "docker-compose.yml" ]; then
            run_compose up --build
        else
            echo -e "${RED}Arquivo docker-compose.yml não encontrado.${NC}"
            exit 1
        fi
        ;;
    *)
        print_header
        echo "Uso: ./start-app.sh [comando]"
        echo ""
        echo -e "${GREEN}Comandos disponíveis:${NC}"
        echo "  all        - Inicia Servidor + Dashboard (Recomendado)"
        echo "  server     - Inicia apenas o Servidor WebSocket"
        echo "  dashboard  - Inicia apenas o Dashboard Web"
        echo "  docker     - Inicia a aplicação via Docker Compose"
        echo ""
        echo "Exemplo: ./start-app.sh all"
        ;;
esac