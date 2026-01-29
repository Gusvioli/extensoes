#!/bin/bash

# colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔐 P2P Secure Chat - Gerenciador de Servidores${NC}\n"

# Função para verificar se uma porta está em uso
check_port() {
    lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null 2>&1 && return 0 || return 1
}

# Função para iniciar servidor
start_server() {
    echo -e "${YELLOW}Iniciando servidor...${NC}"
    if [ "$1" == "daemon" ]; then
        nohup npm start > server.log 2>&1 &
        echo "PID: $!"
    else
        npm start
    fi
}

# Função para acessar dashboard
open_dashboard() {
    local port=$1
    if check_port $port; then
        echo -e "${GREEN}✓ Dashboard acessível em: http://localhost:$port${NC}"
        # Tenta abrir no navegador (funciona em Linux, Mac)
        if command -v xdg-open &> /dev/null; then
            xdg-open "http://localhost:$port"
        elif command -v open &> /dev/null; then
            open "http://localhost:$port"
        else
            echo -e "${YELLOW}Abra manualmente: http://localhost:$port${NC}"
        fi
    else
        echo -e "${RED}✗ Dashboard não está acessível na porta $port${NC}"
    fi
}

# Função para mostrar informações
show_info() {
    local ws_port=$1
    local http_port=$((ws_port + 1000))
    local dashboard_port=$((ws_port + 2000))
    
    echo -e "${BLUE}Informações do Servidor:${NC}"
    echo -e "  Porta WebSocket: ${GREEN}$ws_port${NC}"
    echo -e "  Porta Token: ${GREEN}$http_port${NC}"
    echo -e "  Porta Dashboard: ${GREEN}$dashboard_port${NC}"
    echo ""
    
    if check_port $ws_port; then
        echo -e "  Status WebSocket: ${GREEN}✓ Rodando${NC}"
    else
        echo -e "  Status WebSocket: ${RED}✗ Parado${NC}"
    fi
    
    if check_port $dashboard_port; then
        echo -e "  Status Dashboard: ${GREEN}✓ Rodando${NC}"
    else
        echo -e "  Status Dashboard: ${RED}✗ Parado${NC}"
    fi
}

# Parse de argumentos
case "$1" in
    start)
        start_server "$2"
        ;;
    dashboard)
        port=${2:-10080}
        open_dashboard $port
        ;;
    info)
        ws_port=${2:-8080}
        show_info $ws_port
        ;;
    check-port)
        if check_port $2; then
            echo -e "${GREEN}✓ Porta $2 está em uso${NC}"
            exit 0
        else
            echo -e "${YELLOW}✗ Porta $2 está disponível${NC}"
            exit 1
        fi
        ;;
    *)
        echo -e "${BLUE}Uso:${NC}"
        echo "  $0 start [daemon]      - Inicia o servidor"
        echo "  $0 dashboard [porta]   - Abre o dashboard no navegador"
        echo "  $0 info [porta-ws]     - Mostra informações do servidor"
        echo "  $0 check-port <porta>  - Verifica se uma porta está em uso"
        echo ""
        echo -e "${YELLOW}Exemplos:${NC}"
        echo "  $0 start                # Inicia servidor em foreground"
        echo "  $0 start daemon         # Inicia servidor em background"
        echo "  $0 dashboard 10080      # Abre dashboard na porta 10080"
        echo "  $0 info 8080            # Mostra info do servidor em 8080"
        echo "  $0 check-port 8080      # Verifica se porta 8080 está em uso"
        ;;
esac
