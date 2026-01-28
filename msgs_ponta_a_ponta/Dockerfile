# Use Node.js 18 slim image como base
FROM node:18-alpine

# Definir diretório de trabalho
WORKDIR /app

# Copiar arquivos de dependência
COPY server/package*.json ./

# Instalar dependências
RUN npm ci --only=production

# Copiar código do servidor
COPY server/server.js ./

# Expor a porta padrão
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || 8080), {}, () => process.exit(0)).on('error', () => process.exit(1))"

# Iniciar o servidor
CMD ["node", "server.js"]
