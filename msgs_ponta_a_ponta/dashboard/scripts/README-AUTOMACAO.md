# Automação de Sincronização de Token

Este documento descreve as diferentes formas de sincronizar automaticamente o token do servidor WebSocket com a configuração do Dashboard.

## ⚡ Forma Mais Rápida (Recomendada)

### Via `start.sh` (Automático)

O `start.sh` foi atualizado para sincronizar o token **automaticamente** ao iniciar:

```bash
./start.sh start
```

**Output:**
```
→ Dashboard
✓ Dashboard iniciado (PID: 41249)

→ Sincronizando token
✓ Token sincronizado
```

✅ **Pronto!** Nenhuma ação adicional necessária.

---

## 📦 Via NPM Scripts

O `package.json` foi atualizado com vários scripts úteis:

### Sincronizar uma vez (manual)
```bash
cd dashboard
npm run sync-token
```

### Listar servidores (com token sincronizado)
```bash
cd dashboard
npm run list-servers          # Tabela formatada (usuário)
npm run list-servers:admin    # Todos os detalhes (admin)
npm run list-servers:json     # JSON puro
npm run list-servers:csv      # CSV para Excel
```

### Monitorar e sincronizar em tempo real
```bash
cd dashboard
npm run watch-token
```

**Output:**
```
🔍 Monitorando token para sincronização automática...
📁 Arquivo: /path/to/server/TOKEN.txt
⏱️ Intervalo: 5000ms
Pressione Ctrl+C para parar

[12:34:56] 🔄 Token atualizado (1 servidor(s))
    Novo token: 40c1d7a873a5174f2dc11fec7bfb6bf6
```

---

## 🔄 Monitoramento Contínuo (Em Desenvolvimento)

Se você faz mudanças frequentes no servidor, use o modo watch:

```bash
cd dashboard
npm run watch-token &  # Roda em background
./start.sh start       # Inicia serviços
```

O script watch vai:
- ✅ Monitorar mudanças em `server/TOKEN.txt`
- ✅ Sincronizar automaticamente quando detectar mudança
- ✅ Rodar continuamente até ser interrompido

Parar o monitor:
```bash
pkill -f "watch-token"
```

---

## 🕐 Sincronização Automática em Intervalos (Cron Job)

Para sincronizar periodicamente (ex: a cada 5 minutos):

### Linux/Mac

Edite seu crontab:
```bash
crontab -e
```

Adicione:
```bash
# Sincronizar token a cada 5 minutos
*/5 * * * * cd /home/user/msgs_ponta_a_ponta && node dashboard/scripts/sync-token.js >> /tmp/sync-token.log 2>&1

# Ou sincronizar a cada hora
0 * * * * cd /home/user/msgs_ponta_a_ponta && npm run --prefix dashboard sync-token >> /tmp/sync-token.log 2>&1
```

Ver logs:
```bash
tail -f /tmp/sync-token.log
```

### Windows (Task Scheduler)

1. Abra `Task Scheduler`
2. Clique em `Create Basic Task`
3. Nome: `Sync P2P Token`
4. Acionador: `Daily` (ou `Repeat every 5 minutes`)
5. Ação:
   - Program: `C:\Program Files\nodejs\node.exe`
   - Arguments: `dashboard/scripts/sync-token.js`
   - Start in: `C:\path\to\msgs_ponta_a_ponta`

---

## 🚀 Automação com Systemd (Linux)

Se quiser que o serviço sincronize ao iniciar:

### 1. Criar arquivo de serviço

```bash
sudo nano /etc/systemd/system/p2p-sync-token.service
```

```ini
[Unit]
Description=P2P Chat Token Synchronizer
After=network.target
Wants=p2p-server.service

[Service]
Type=oneshot
ExecStart=/usr/bin/node /home/user/msgs_ponta_a_ponta/dashboard/scripts/sync-token.js
WorkingDirectory=/home/user/msgs_ponta_a_ponta
User=username

[Install]
WantedBy=multi-user.target
```

### 2. Ativar e testar

```bash
sudo systemctl daemon-reload
sudo systemctl enable p2p-sync-token.service
sudo systemctl start p2p-sync-token.service
sudo systemctl status p2p-sync-token.service
```

---

## 📊 Resumo de Opções

| Método | Comando | Automático | Uso |
|--------|---------|------------|-----|
| **start.sh** | `./start.sh start` | ✅ Sim | **Recomendado** - sincroniza ao iniciar |
| **NPM (uma vez)** | `npm run sync-token` | ❌ Manual | Sincronizar manualmente |
| **NPM (listar)** | `npm run list-servers` | ❌ Manual | Ver token sincronizado |
| **Watch mode** | `npm run watch-token` | ✅ Sim (contínuo) | Desenvolvimento - monitora em tempo real |
| **Cron** | Ver acima | ✅ Sim (periódico) | Servidor - sincroniza a cada X minutos |
| **Systemd** | Ver acima | ✅ Sim (event) | Servidor - sincroniza ao iniciar serviço |

---

## 🔍 Verificar Se Token Está Sincronizado

### Via CLI
```bash
# Verificar token do servidor
cat server/TOKEN.txt | grep "^Token:"

# Verificar token na config
cat dashboard/data/servers-config.json | grep '"token"'

# Usando o script list-servers
node dashboard/scripts/list-servers.js --role=user | grep "🔑 Token"
```

### Via Browser
```
http://localhost:3000/view.html
```
Procure por **"🔑 Token de Acesso"** - ele deve corresponder ao token do servidor.

### Via API
```bash
curl http://localhost:3000/api/public-servers?status=active | jq '.servers[0].token'
```

---

## ⚠️ Troubleshooting

### "Arquivo de token não encontrado"
- Certifique-se de que o servidor foi iniciado pelo menos uma vez
- Verifique se `server/TOKEN.txt` existe:
  ```bash
  ls -la server/TOKEN.txt
  ```

### Token não sincroniza
- Rode manualmente para ver erro detalhado:
  ```bash
  node dashboard/scripts/sync-token.js
  ```
- Verifique permissões:
  ```bash
  ls -la dashboard/data/servers-config.json
  chmod 644 dashboard/data/servers-config.json
  ```

### Watch mode não funciona
- Verifique se há permissão de leitura:
  ```bash
  cat server/TOKEN.txt
  ```
- Se usar systemd/cron, rodar como usuário correto

---

## 💡 Dicas

1. **Para desenvolvimento**: Use `npm run watch-token` em um terminal e `./start.sh start` em outro
2. **Para produção**: Use `start.sh start` (já sincroniza automaticamente)
3. **Para monitoramento**: Adicione cron job que roda a cada hora
4. **Para alertas**: Combine com scripts que checam saúde do servidor

---

## Próximas Etapas

Agora que o token está sincronizado:

1. ✅ Abra http://localhost:3000/view.html
2. ✅ Veja o servidor ativo com token válido
3. ✅ Copie o token e use na extensão
4. ✅ Conecte-se com sucesso! 🎉
