# 🔐 Como Obter e Usar o Token de Autenticação

## Problema
O servidor requer um token de autenticação, mas como o usuário sabe qual token usar?

## ✅ Solução Implementada

Agora há **4 formas** de obter o token:

---

## 1️⃣ **Via Página Web (Mais Fácil)** ⭐

Quando você inicia o servidor, ele exibe:

```
📱 Acesse http://localhost:9080 para ver seu token
```

### Passos:
1. Abra seu navegador
2. Acesse `http://localhost:9080`
3. **Copie o token** com um clique
4. Cole na extensão
5. Clique em "Autenticar"

### Vantagens:
- ✅ Botão "Copiar" automático
- ✅ Interface visual amigável
- ✅ Instruções incorporadas
- ✅ Acesso fácil de qualquer navegador

---

## 2️⃣ **Via Arquivo TOKEN.txt**

Quando o servidor inicia, cria um arquivo `TOKEN.txt` na pasta `server/`:

```bash
server/TOKEN.txt
```

### Conteúdo:
```
🔐 P2P SECURE CHAT - TOKEN DE AUTENTICAÇÃO
=====================================

Token: a27e454745e6aec7d658841f7038225e

Instruções de Uso:
1. Abra a extensão Chrome
2. Cole este token no campo "Token de Autenticação"
3. Clique em "Autenticar"
4. Conecte-se normalmente

Gerado em: 2026-01-28T01:14:51.045Z
Servidor: ws://localhost:8080
```

### Como usar:
```bash
# Abrir o arquivo
cat server/TOKEN.txt

# Ou copiar diretamente
cat server/TOKEN.txt | grep "Token:" | cut -d: -f2 | xargs
```

---

## 3️⃣ **Via Logs do Servidor**

Quando o servidor inicia, exibe o token nos logs:

```
⚠️  Autenticação ATIVADA. Token obrigatório: a27e454745e6aec7d658841f7038225e
```

### Como usar:
1. Abra o terminal onde o servidor está rodando
2. Procure pela linha com "Token obrigatório:"
3. Copie o token
4. Cole na extensão

---

## 4️⃣ **Via API JSON**

Faça uma requisição HTTP para obter o token em JSON:

```bash
# Usando curl
curl http://localhost:9080/token

# Resposta:
# {"token":"a27e454745e6aec7d658841f7038225e","wsUrl":"ws://localhost:8080","requiresAuth":true}
```

### Útil para:
- Automações
- Scripts
- Integrações
- Leitura programática

---

## 5️⃣ **Token Customizado (Opcional)**

Em vez de usar um token aleatório, você pode definir um token fixo:

### Via Variável de Ambiente:

```bash
# Linux / macOS
export AUTH_TOKEN="meu-token-seguro-aqui"
npm start

# Windows (PowerShell)
$env:AUTH_TOKEN="meu-token-seguro-aqui"
npm start

# Windows (CMD)
set AUTH_TOKEN=meu-token-seguro-aqui
npm start
```

### Via Arquivo .env:

1. Abra `server/.env.example`
2. Altere `AUTH_TOKEN=`
3. Salve como `.env`
4. Reinicie o servidor

Exemplo:
```env
AUTH_TOKEN=meu-token-super-secreto-123
PORT=8080
REQUIRE_AUTH=true
```

---

## 📱 Guia Passo a Passo

### Para o Usuário Final

1. **Inicie o servidor:**
   ```bash
   cd server
   npm start
   ```

2. **Veja a mensagem:**
   ```
   📱 Acesse http://localhost:9080 para ver seu token
   ```

3. **Abra no navegador:**
   - Clique no link ou acesse manualmente
   - Veja um página bonita com o token
   - Clique em "Copiar Token"

4. **Abra a extensão:**
   - Chrome → Extensões → P2P Secure Chat
   - Veja um campo "Token de Autenticação"
   - Cole o token
   - Clique em "Autenticar"

5. **Pronto!**
   - Mensagem de sucesso aparece
   - Você pode conectar e enviar mensagens

---

## 🔗 Tabela de URLs

| Recurso | URL | Descrição |
|---------|-----|-----------|
| **WebSocket** | `ws://localhost:8080` | Servidor de sinalização |
| **Página Token** | `http://localhost:9080` | Interface web com token |
| **API Token** | `http://localhost:9080/token` | JSON com token (CORS habilitado) |
| **Arquivo Token** | `server/TOKEN.txt` | Arquivo texto com instruções |

---

## 🔒 Segurança do Token

### Boas Práticas:
- ✅ Use um token longo (16+ caracteres)
- ✅ Mude o token regularmente
- ✅ Não compartilhe publicamente
- ✅ Use HTTPS em produção

### Tokens Gerados:
- Comprimento: 32 caracteres (16 bytes em hex)
- Entropia: ~128 bits
- Formato: Hexadecimal (0-9, a-f)
- Gerado por: `crypto.randomBytes(16)`

Exemplo de token seguro:
```
a27e454745e6aec7d658841f7038225e
```

---

## 🆘 Troubleshooting

### "Página de token não carrega (http://localhost:9080)"
```bash
# Certifique-se de que o servidor está rodando:
# Você deveria ver: "📱 Acesse http://localhost:9080"

# Se não funcionar, a porta pode estar ocupada:
node manage-ports.js check 9080

# Ou tentar outra porta:
PORT=8090 npm start
# A página seria: http://localhost:9090
```

### "TOKEN.txt não existe"
```bash
# Arquivo é criado automaticamente na pasta server/
cd server
ls -la | grep TOKEN

# Se não aparecer, o servidor pode não ter permissão de escrita
chmod 755 server/
```

### "Token muda toda vez"
Isso é **normal** e **seguro**. Um novo token aleatório é gerado a cada reinicialização.

Para usar um token fixo:
```bash
export AUTH_TOKEN="seu-token-aqui"
npm start
```

---

## 📊 Comparação de Métodos

| Método | Facilidade | Segurança | Automatização |
|--------|-----------|-----------|---------------|
| Página Web | ⭐⭐⭐⭐⭐ | ✅ | ✅ |
| Arquivo | ⭐⭐⭐ | ✅ | ✅ |
| Logs | ⭐⭐ | ✅ | ❌ |
| API JSON | ⭐⭐⭐⭐ | ✅ | ⭐⭐⭐⭐⭐ |
| Variável Env | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |

---

## 🎯 Recomendação

**Para usuários comuns:**
→ Use a **Página Web** (http://localhost:9080)

**Para desenvolvedores:**
→ Use **Variável de Ambiente** (AUTH_TOKEN)

**Para automações:**
→ Use a **API JSON** (/token)

---

## 📚 Ver Também

- [QUICKSTART.md](QUICKSTART.md) - Setup em 5 minutos
- [server/README.md](server/README.md) - Documentação do servidor
- [GUIA_SEGURANÇA.md](GUIA_SEGURANÇA.md) - Detalhes de segurança

---

**Seu token é tão único quanto você! 🔐**
