# 🔐 P2P Secure Chat - Servidor de Sinalização

Um servidor de sinalização WebSocket seguro para facilitar comunicação P2P criptografada de ponta a ponta (E2EE).

## ⚡ Características

- ✅ **Autenticação obrigatória** com token
- ✅ **IDs criptograficamente seguros** (96 bits de entropia)
- ✅ **Sem compressão WebSocket** (proteção contra CRIME)
- ✅ **Rate limiting** integrado
- ✅ **Heartbeat/keepalive** automático
- ✅ **Graceful shutdown** (SIGTERM, SIGINT)
- ✅ **Validação rigorosa** de mensagens
- ✅ **Métricas e logging** estruturado
- ✅ **Extremamente leve** (~2-5MB memória base)

## 📋 Pré-requisitos

- **Node.js 14+**
- **npm** ou **yarn**

## 🚀 Instalação

### 1. Clonar/Baixar o Repositório

```bash
cd server
```

### 2. Instalar Dependências

```bash
npm install
```

Apenas o módulo `ws` é necessário:

```bash
npm install ws
```

### 3. Configurar Variáveis de Ambiente

Copie o arquivo de exemplo:

```bash
cp .env.example .env
```

Edite `.env` com suas configurações:

```bash
# Gerar token seguro
AUTH_TOKEN=$(openssl rand -hex 32)

# Editar .env
nano .env
```

## 🏃 Executar o Servidor

### Opção 1: npm start (simples)

```bash
npm start
```

### Opção 2: Script de Inicialização (recomendado)

```bash
chmod +x start.sh
./start.sh
```

### Opção 3: Com Variáveis de Ambiente (flexível)

```bash
PORT=8080 \
AUTH_TOKEN="seu-token-secreto" \
REQUIRE_AUTH=true \
npm start
```

### Opção 4: Usando Docker

```bash
docker build -t p2p-secure-chat .
docker run -e AUTH_TOKEN="seu-token" -p 8080:8080 p2p-secure-chat
```

## 📊 Output Esperado

```
[2026-01-27T10:30:45.123Z] ✅ Servidor de sinalização iniciado na porta 8080
[2026-01-27T10:30:45.124Z] ⚠️  Autenticação ATIVADA. Token obrigatório: a1b2c3d4...
[2026-01-27T10:30:45.125Z] 🔒 Compressão DESABILITADA (proteção contra CRIME)
[2026-01-27T10:30:48.000Z] 🔌 Cliente conectado com ID: a1b2c3d4e5f6g7h8 (Total: 1/10000)
[2026-01-27T10:30:50.000Z] ✅ Cliente a1b2c3d4e5f6g7h8 autenticado com sucesso
[2026-01-27T10:31:00.000Z] 🔍 [MÉTRICAS] Clientes: 1 | Mensagens: 5 | Rejeitadas: 0 | Uptime: 15s
```

## 🔐 Configuração de Segurança

### Variáveis de Ambiente Importantes

| Variável | Padrão | Descrição | Recomendado |
|----------|--------|-----------|-------------|
| `PORT` | `8080` | Porta HTTP | Qualquer porta >1024 |
| `AUTH_TOKEN` | Aleatório | Token de autenticação | 32+ caracteres |
| `REQUIRE_AUTH` | `true` | Exigir autenticação | `true` |
| `DISABLE_DEFLATE` | `true` | Desabilitar compressão | `true` (segurança) |
| `MAX_CLIENTS` | `10000` | Limite de clientes | 1000-10000 |
| `RATE_LIMIT_MAX` | `100` | Msgs/segundo | 50-200 |
| `ENABLE_METRICS` | `false` | Mostrar métricas | `false` (segurança) |

### Geração de Token Seguro

```bash
# OpenSSL
openssl rand -hex 32

# Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Python
python3 -c "import secrets; print(secrets.token_hex(32))"
```

## 📱 Conectar a Extensão

1. **Abra a extensão** no navegador
2. **Configure a URL:**
   - URL: `ws://localhost:8080` (ou seu servidor)
   - Token: Cole o `AUTH_TOKEN` gerado
3. **Clique "Autenticar"**
4. **Copie seu ID** e compartilhe com outro usuário
5. **Cole o ID do outro** no campo "ID do outro usuário"
6. **Clique "Conectar"**

## 🚨 Monitoramento

### Logs Importantes

```bash
# Ver apenas erros
npm start 2>&1 | grep "❌"

# Ver apenas autenticações
npm start 2>&1 | grep "autenticad"

# Ver com timestamp completo
npm start 2>&1 | grep "MÉTRICAS"
```

### Métricas em Tempo Real

```bash
# Ativar métricas (a cada 1 minuto)
ENABLE_METRICS=true npm start
```

## 🔧 Troubleshooting

### Erro: "EADDRINUSE: address already in use :::8080"

A porta está em uso. Libere-a ou use outra:

```bash
# Encontrar processo na porta
lsof -i :8080
kill -9 <PID>

# Ou usar outra porta
PORT=8081 npm start
```

### Erro: "Cannot find module 'ws'"

Instale as dependências:

```bash
npm install
```

### Clientes não conseguem autenticar

1. Verifique se `REQUIRE_AUTH=true`
2. Confirme o token está correto
3. Veja os logs: `❌ Tentativa de autenticação FALHOU`

### Compressão ativa (inseguro)

Certifique-se que `DISABLE_DEFLATE=true`:

```bash
DISABLE_DEFLATE=true npm start
```

## 📈 Performance

- **Memória**: ~2-5MB base + ~100KB por cliente conectado
- **CPU**: Negligível (apenas retransmissão de mensagens)
- **Banda**: ~1KB/cliente/segundo (heartbeat + signaling)

### Para 10.000 clientes:
- Memória: ~1GB + 100MB para clientes
- Recomendado: Servidor com 2GB RAM, 2 vCPUs

## 🔗 Protocolo de Mensagens

### Cliente → Servidor

```javascript
// Autenticação
{ type: "authenticate", token: "seu-token" }

// Oferta de conexão
{ target: "outro-id", type: "key-exchange", payload: { publicKey: {...} } }

// Resposta de chave
{ target: "outro-id", type: "key-exchange-reply", payload: { publicKey: {...} } }

// Oferta WebRTC
{ target: "outro-id", type: "webrtc-offer", payload: {...} }

// Resposta WebRTC
{ target: "outro-id", type: "webrtc-answer", payload: {...} }

// Candidato ICE
{ target: "outro-id", type: "ice-candidate", payload: {...} }
```

### Servidor → Cliente

```javascript
// ID atribuído
{ type: "your-id", id: "a1b2c3d4e5f6g7h8", requiresAuth: true }

// Autenticação bem-sucedida
{ type: "authenticated", message: "Autenticação bem-sucedida" }

// Erro
{ type: "error", message: "Descrição do erro" }

// Mensagem de outro cliente
{ type: "key-exchange", from: "outro-id", payload: {...} }
```

## 🛡️ Boas Práticas

- ✅ Use HTTPS/WSS em produção
- ✅ Mude o token periodicamente
- ✅ Monitore logs para atividade suspeita
- ✅ Limite MAX_CLIENTS conforme capacidade
- ✅ Mantenha Node.js atualizado
- ✅ Use um load balancer para múltiplas instâncias
- ✅ Implemente SSL/TLS

## 🚀 Deploy em Produção

### Render.com

1. Conecte seu repositório Git
2. Configure:
   - Build command: `npm install`
   - Start command: `npm start`
3. Adicione variáveis de ambiente:
   - `AUTH_TOKEN` (gerado)
   - `REQUIRE_AUTH` = `true`
   - `PORT` = (automático)

### Heroku

```bash
heroku create seu-app-p2p
heroku config:set AUTH_TOKEN=$(openssl rand -hex 32)
git push heroku main
```

### VPS (Ubuntu/Debian)

```bash
# Instalar Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clonar e setup
git clone seu-repo /opt/p2p-chat
cd /opt/p2p-chat/server
npm install

# Usar systemd ou PM2
npm install -g pm2
pm2 start npm --name "p2p-chat" -- start
pm2 save
pm2 startup
```

## 📄 Licença

MIT - Veja LICENSE para detalhes

## 👥 Autor

Criado por **Gusvioli**

## 🤝 Contribuir

Sugestões de segurança? Abra uma issue ou pull request!

---

**🔒 Segurança é prioridade. Use responsavelmente.**
