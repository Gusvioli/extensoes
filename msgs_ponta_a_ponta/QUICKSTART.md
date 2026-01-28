# 🚀 Quick Start - P2P Secure Chat

Inicie o servidor e a extensão em 5 minutos!

## 📋 Pré-requisitos

- Node.js 14+ (`node --version`)
- npm (`npm --version`)
- Chrome/Chromium/Edge

## ⚡ Setup Rápido

### 1️⃣ Terminal - Iniciar Servidor

```bash
cd server
npm install
npm start
```

**Anote o token que aparece no console!**

```
⚠️  Autenticação ATIVADA. Token obrigatório: a1b2c3d4e5f6...
```

### 2️⃣ Chrome - Carregar Extensão

1. Abra `chrome://extensions/`
2. Ative **"Modo de desenvolvedor"** (canto superior direito)
3. Clique **"Carregar extensão sem empacotamento"**
4. Selecione a pasta: `secure-p2p-chat/`

### 3️⃣ Chrome - Usar Extensão

1. Clique no ícone da extensão
2. **Aguarde conectar** (verá seu ID)
3. **Cole o token** no campo 🔐
4. Clique **"Autenticar"**
5. Copie seu ID com um clique
6. **Compartilhe com outro usuário**

### 4️⃣ Conectar com Par

1. **Outro usuário** segue os passos 1-5
2. **Você cole** o ID do outro no campo
3. Clique **"Conectar"**
4. Aguarde a conexão P2P estabelecer
5. **Comece a conversar!** 💬

## 🔗 Usar em Outro Computador

### Servidor Remoto

Se o servidor está em outro computador:

```bash
# No servidor:
PORT=8080 npm start

# Na extensão:
# URL: ws://seu-servidor.com:8080
# Token: (mesmo que acima)
```

## 🐛 Se Algo Não Funcionar

### Erro: "Não foi possível conectar"

```bash
# Verifique se o servidor está rodando
lsof -i :8080

# Se não aparecer nada, servidor não está ativo
cd server && npm start
```

### Erro: "Autenticação falhou"

```bash
# Verifique se o token está correto
# Ele aparece na inicialização do servidor
```

### Extensão não carrega

```bash
# Verifique se está em chrome://extensions/
# Modo de desenvolvedor ativado?
# Pasta correta selecionada?
```

## 📊 Testar Segurança

```bash
cd server
node test-security.js ws://localhost:8080 seu-token-aqui
```

## 🔐 Segurança Mínima

Para produção, mude o token:

```bash
AUTH_TOKEN=$(openssl rand -hex 32) npm start
```

## 🐳 Com Docker (Opcional)

```bash
# Build
docker build -t p2p-chat .

# Run com token seguro
docker run -e AUTH_TOKEN=$(openssl rand -hex 32) -p 8080:8080 p2p-chat
```

## ✨ Próximas Funcionalidades

- [ ] Suporte para múltiplas conversas
- [ ] Histórico persistente
- [ ] Compartilhamento de arquivos
- [ ] Chamada de voz/vídeo
- [ ] Temas escuros/claros
- [ ] Sincronização multi-dispositivo

## 🆘 Suporte

- 📖 [Leia a documentação completa](./GUIA_SEGURANÇA.md)
- 🐛 [Abra uma issue](../../issues)
- 💬 Pergunte no repositório

---

**Pronto? Comece agora!** 🎉

```bash
cd server && npm start
```

Então carregue a extensão e aproveite! 🔒
