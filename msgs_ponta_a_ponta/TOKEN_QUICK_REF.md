# 🎯 Quick Reference - Token

## Para Usuários Finais

### O que fazer?

```
1. Inicie o servidor
   $ cd server && npm start

2. Veja a mensagem
   📱 Acesse http://localhost:9080 para ver seu token

3. Abra no navegador
   http://localhost:9080

4. Copie o token (clique no botão)

5. Abra a extensão Chrome

6. Cole o token

7. Clique em "Autenticar"

8. Conecte!
```

---

## 5 Formas Rápidas

### 1. Página Web (Fácil) ⭐
```
http://localhost:9080
```

### 2. Arquivo
```bash
cat server/TOKEN.txt
```

### 3. Logs
```
[LOG] Token: a27e454745...
```

### 4. API JSON
```bash
curl http://localhost:9080/token
```

### 5. Variável de Ambiente
```bash
export AUTH_TOKEN="seu-token"
npm start
```

---

## Endpoints

| URL | Retorna |
|-----|---------|
| `http://localhost:9080/` | Página HTML |
| `http://localhost:9080/token` | JSON |
| `ws://localhost:8080` | WebSocket |

---

## Troubleshooting Rápido

### Porta 9080 não carrega?
```bash
# Certifique-se que servidor está rodando:
ps aux | grep "node server.js"

# Se não estiver:
cd server && npm start
```

### TOKEN.txt não existe?
```bash
# Será criado quando servidor iniciar
cd server
npm start
# Verifique:
ls -la | grep TOKEN
```

### Token é diferente toda vez?
```bash
# Normal! Novo token aleatório a cada inicialização.
# Para usar o mesmo:
export AUTH_TOKEN="seu-token-fixo"
npm start
```

---

## Portas em Uso

| Porta | Serviço | URL |
|-------|---------|-----|
| 8080 | WebSocket | ws://localhost:8080 |
| 9080 | HTTP Token | http://localhost:9080 |

---

## Exemplo Prático

```bash
# Terminal 1: Iniciar servidor
cd /home/gusvioli/Documentos/extencoes_especiais/msgs_ponta_a_ponta/server
npm start

# Verá:
# 📱 Acesse http://localhost:9080 para ver seu token

# Terminal 2 ou Navegador:
# Abra http://localhost:9080
# Copie o token
# Cole na extensão
# Pronto!
```

---

## Token Seguro?

```
Comprimento: 32 caracteres
Entropia: 128 bits
Algoritmo: crypto.randomBytes(16)
Formato: Hexadecimal

Exemplo:
a27e454745e6aec7d658841f7038225e
│││││││││││││││││││││││││││││││││
32 caracteres aleatórios
```

---

## Customizar

### Se quiser um token fixo:

```bash
# Opção 1: Variável de Ambiente
export AUTH_TOKEN="meu-token-seguro"
npm start

# Opção 2: Arquivo .env
echo "AUTH_TOKEN=meu-token-seguro" > server/.env
npm start

# Opção 3: Package.json script
# Edite o script start em package.json
```

---

## Verificar Tudo

```bash
# 1. Servidor rodando?
curl http://localhost:8080
# Deveria retornar erro (esperado, é WebSocket)

# 2. HTTP funcionando?
curl http://localhost:9080/
# Deveria retornar HTML

# 3. Token disponível?
curl http://localhost:9080/token
# {
#   "token": "a27e454745...",
#   "wsUrl": "ws://localhost:8080",
#   "requiresAuth": true
# }

# 4. Arquivo criado?
cat server/TOKEN.txt
# 🔐 P2P SECURE CHAT - TOKEN
# Token: a27e454745...
```

---

## Fluxo em 1 Minuto

```
npm start
    ↓
Vê mensagem "Acesse http://localhost:9080"
    ↓
Abre navegador
    ↓
Copia token (botão copiar)
    ↓
Abre extensão
    ↓
Cola token
    ↓
Clica "Autenticar"
    ↓
✅ Conecta!
```

---

**Simples, rápido e seguro!** 🚀
