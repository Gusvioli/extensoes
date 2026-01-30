#!/bin/bash

# Script para gerenciar servidor + dashboard

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}🔐 P2P Secure Chat - Controle Total${NC}\n"

case "$1" in
    install)
        echo -e "${YELLOW}Instalando dependências...${NC}"
        echo -e "${BLUE}→ Servidor${NC}"
        cd server && npm install
        cd ..
        echo -e "${BLUE}→ Dashboard${NC}"
        cd dashboard && npm install
        cd ..
        echo -e "${GREEN}✓ Instalação concluída!${NC}"
        ;;
    
    start)
        echo -e "${YELLOW}Iniciando servidor + dashboard...${NC}"
        
        # Matar processos antigos se existirem
        pkill -f "node.*server.js" 2>/dev/null
        pkill -f "node.*dashboard" 2>/dev/null
        sleep 1
        
        # Iniciar servidor WebSocket
        echo -e "${BLUE}→ Servidor WebSocket${NC}"
        cd server
        node server.js > /tmp/server.log 2>&1 &
        SERVER_PID=$!
        echo -e "${GREEN}✓ Servidor iniciado (PID: $SERVER_PID)${NC}"
        
        sleep 2

        # Iniciar Dashboard
        echo -e "${BLUE}→ Dashboard${NC}"
        cd ../dashboard
        node src/server.js > /tmp/dashboard.log 2>&1 &
        DASHBOARD_PID=$!
        echo -e "${GREEN}✓ Dashboard iniciado (PID: $DASHBOARD_PID)${NC}"
        
        # Sincronizar token automaticamente
        echo -e "${BLUE}→ Sincronizando token${NC}"
        node scripts/sync-token.js 2>/dev/null && echo -e "${GREEN}✓ Token sincronizado${NC}" || echo -e "${YELLOW}⚠ Falha ao sincronizar token (veja logs)${NC}"
        
        echo ""
        echo -e "${GREEN}=== SERVIÇOS INICIADOS ===${NC}"
        echo -e "  WebSocket:  ${BLUE}ws://localhost:8080${NC}"
        echo -e "  Token:      ${BLUE}http://localhost:9080${NC} (ou porta_ws + 1000)"
        echo -e "  Dashboard:  ${BLUE}http://localhost:3000${NC}"
        echo ""
        echo -e "${YELLOW}Logs:${NC}"
        echo -e "  Servidor:  tail -f /tmp/server.log"
        echo -e "  Dashboard: tail -f /tmp/dashboard.log"
        echo ""
        wait
        ;;
    
    dashboard)
        echo -e "${YELLOW}Iniciando apenas dashboard...${NC}"
        cd dashboard
        node src/server.js
        ;;
    
    stop)
        echo -e "${YELLOW}Parando serviços...${NC}"
        pkill -f "node.*server.js" 2>/dev/null && echo -e "${GREEN}✓ Servidor parado${NC}" || echo -e "${YELLOW}ℹ Servidor não estava rodando${NC}"
        sleep 1
        echo -e "${GREEN}✓ Todos os serviços foram parados${NC}"
        ;;
    
    server)
        echo -e "${YELLOW}Iniciando apenas servidor...${NC}"
        cd server
        node server.js
        ;;
    
    open)
        echo -e "${BLUE}Abrindo dashboard no navegador...${NC}"
        if command -v xdg-open &> /dev/null; then
            xdg-open "http://localhost:3000"
        elif command -v open &> /dev/null; then
            open "http://localhost:3000"
        else
            echo -e "${YELLOW}Abra manualmente: http://localhost:3000${NC}"
        fi
        ;;
    
    status)
        echo -e "${BLUE}Verificando status...${NC}"
        
        if curl -s http://localhost:8080 > /dev/null 2>&1; then
            echo -e "  WebSocket:  ${GREEN}✓ Online${NC}"
        else
            echo -e "  WebSocket:  ${RED}✗ Offline${NC}"
        fi
        
        if curl -s http://localhost:3000 > /dev/null 2>&1; then
            echo -e "  Dashboard:  ${GREEN}✓ Online${NC}"
        else
            echo -e "  Dashboard:  ${RED}✗ Offline${NC}"
        fi
        ;;
    
    *)
        echo -e "${BLUE}Uso:${NC}"
        echo ""
        echo -e "  ${GREEN}./start.sh install${NC}        - Instalar dependências (uma vez)"
        echo -e "  ${GREEN}./start.sh start${NC}          - Iniciar servidor + dashboard"
        echo -e "  ${GREEN}./start.sh stop${NC}           - Parar todos os serviços iniciados com start"
        echo -e "  ${GREEN}./start.sh server${NC}         - Iniciar apenas servidor"
        echo -e "  ${GREEN}./start.sh dashboard${NC}      - Iniciar apenas dashboard"
        echo -e "  ${GREEN}./start.sh open${NC}          - Abrir dashboard no navegador"
        echo -e "  ${GREEN}./start.sh status${NC}        - Ver status dos serviços"
        echo ""
        echo -e "${YELLOW}Exemplo de uso:${NC}"
        echo -e "  1. ${GREEN}./start.sh install${NC}     (primeira vez)"
        echo -e "  2. ${GREEN}./start.sh start${NC}       (inicia tudo)"
        echo -e "  3. ${GREEN}./start.sh open${NC}        (abre no navegador)"
        ;;
esac
