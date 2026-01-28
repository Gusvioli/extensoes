# 🚀 Quick Start - Nome de Exibição

## Para Usuários (5 minutos)

### 1. Abra a extensão
Clique no ícone 🔐

### 2. Veja seu ID
```
Seu ID: a5123b48e8c10919... ✏️
```

### 3. Clique no ✏️
Modal abre

### 4. Digite seu nome
```
Nome de Exibição: Alice
```

### 5. Clique [Salvar]
✅ Pronto!

---

## Seu nome aparece em:

- ✅ Header: `Seu ID: a5... (Alice) ✏️`
- ✅ Mensagens: `📤 Você (Alice) Oi!`
- ✅ Imagens: `📤 Você (Alice) [imagem]`

---

## Exemplos de Nomes

```
"Alice"
"Bob"
"Avó"
"Neto 🚀"
"Casa"
"Trabalho"
"Frontend"
```

---

## FAQ

**P: Posso mudar?**  
R: Clique em ✏️ novamente

**P: Se deixar em branco?**  
R: Mostra primeiros 8 caracteres

**P: Outra pessoa vê?**  
R: Sim, é assim que funciona

**P: É seguro?**  
R: Sim, criptografia não afeta

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
