# ⚡ Início Rápido - Sincronização de Token

## O Problema
O token gerado pelo servidor WebSocket precisa ser sincronizado com a configuração do Dashboard para que os usuários possam copiar o token correto.

## A Solução
Três formas automáticas (do mais fácil ao mais avançado):

---

## 1️⃣ **MAIS FÁCIL** - Via `start.sh` (Recomendado)

Inicie os serviços normalmente. A sincronização acontece **automaticamente**:

```bash
./start.sh start
```

**Output esperado:**
```
→ Dashboard
✓ Dashboard iniciado (PID: 41249)

→ Sincronizando token
✓ Token sincronizado

=== SERVIÇOS INICIADOS ===
```

✅ **Pronto! Nada mais a fazer.**

---

## 2️⃣ **MODERADO** - Via NPM Scripts

Sincronizar manualmente quando precisar:

```bash
cd dashboard
npm run sync-token
```

Ver servidores com token atualizado:

```bash
npm run list-servers          # Tabela (usuário)
npm run list-servers:admin    # Detalhes (admin)
npm run list-servers:json     # JSON
npm run list-servers:csv      # CSV para Excel
```

---

## 3️⃣ **AVANÇADO** - Monitoramento em Tempo Real

Para desenvolvimento/sincronização contínua:

```bash
cd dashboard
npm run watch-token
```

Mantém sincronizado sempre que o servidor reinicia.

---

## ✅ Verificar Se Token Está Sincronizado

### Via Browser
```
http://localhost:3000/view.html
```
Procure por **"🔑 Token de Acesso"** - deve corresponder ao servidor.

### Via CLI
```bash
# Comparar tokens
echo "Servidor:" && cat server/TOKEN.txt | grep "^Token:"
echo "Config:" && cat dashboard/data/servers-config.json | jq '.servers[0].token'
```

### Via API
```bash
curl http://localhost:3000/api/public-servers | jq '.servers[0].token'
```

---

## 📋 Resumo

| Situação | Comando | Resultado |
|----------|---------|-----------|
| Iniciar tudo | `./start.sh start` | ✅ Sincroniza auto |
| Sincronizar só | `cd dashboard && npm run sync-token` | ✅ Sincroniza manual |
| Ver token | `cd dashboard && npm run list-servers` | ✅ Mostra com token |
| Monitorar | `cd dashboard && npm run watch-token` | ✅ Sincroniza contínuo |

---

## 🎯 Próximas Etapas

1. ✅ Execute `./start.sh start`
2. ✅ Abra http://localhost:3000/view.html
3. ✅ Copie o **Token de Acesso**
4. ✅ Cole na extensão Chrome
5. ✅ **Conecte-se!** 🚀

---

Para mais opções (cron, systemd, etc), veja [README-AUTOMACAO.md](README-AUTOMACAO.md)
