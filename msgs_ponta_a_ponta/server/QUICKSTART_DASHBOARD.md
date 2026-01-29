# 🚀 Quick Start - Dashboard de Servidores

Comece em 2 minutos!

## ⚡ Início Rápido

### 1. Instale as dependências
```bash
cd server
npm install
```

### 2. Inicie o servidor
```bash
npm start
```

### 3. Abra o dashboard
Acesse em seu navegador:
```
http://localhost:10080
```

**Pronto!** 🎉 Você já pode gerenciar seus servidores!

---

## 📚 Primeiros Passos

### Ver servidores de exemplo
Copie o arquivo de exemplo:
```bash
cp servers-config.example.json servers-config.json
```

Recarregue o dashboard no navegador - você verá 11 servidores de exemplo (dev, produção, backup, etc).

### Adicionar seu primeiro servidor
1. Clique em **"+ Novo Servidor"**
2. Preencha os campos:
   - Nome: "Meu Servidor"
   - Host: "localhost"
   - Porta: "8080"
   - Protocolo: "ws"
   - Token: "meu-token-secreto"
3. Clique em **"Salvar Servidor"**

### Acessar o servidor
1. Na tela do dashboard, clique no botão **"🔗 Abrir Servidor"**
2. O servidor abre em uma nova aba!

### Copiar token
Clique em **"📋 Copiar"** dentro da caixa do token para copiar para a área de transferência.

---

## 🔌 Portas

| Serviço | Porta Padrão | Função |
|---------|--------------|--------|
| WebSocket | 8080 | Servidor de sinalização P2P |
| Token | 9080 | Visualizar token de autenticação |
| Dashboard | **10080** | Gerenciar todos os servidores |

Exemplo com porta diferente:
```bash
PORT=3000 npm start
```
Neste caso:
- WebSocket: 3000
- Token: 4000
- **Dashboard: 5000**

---

## 📊 Visualizar Informações

### Via Dashboard (recomendado)
Acesse `http://localhost:10080` - tudo visual e intuitivo!

### Via API/cURL
```bash
# Ver todos os servidores
curl http://localhost:10080/api/servers

# Ver como JSON bonito
curl http://localhost:10080/api/servers | json_pp
```

---

## 💾 Arquivo de Configuração

Os servidores são salvos automaticamente em `servers-config.json`:

```json
{
  "servers": [
    {
      "id": "server-1",
      "name": "Meu Servidor",
      "host": "localhost",
      "port": 8080,
      "protocol": "ws",
      "token": "meu-token",
      "status": "active",
      "region": "Local",
      "maxClients": 10000,
      "createdAt": "2026-01-28T12:00:00Z",
      "notes": "Minhas anotações"
    }
  ]
}
```

Você pode:
- ✅ Editar manualmente este arquivo
- ✅ Fazer backup facilmente
- ✅ Compartilhar com seu time
- ✅ Versionar no Git

---

## 🔧 Usar o Script de Gerenciamento

```bash
# Iniciar servidor
./manage-servers.sh start

# Iniciar em background
./manage-servers.sh start daemon

# Abrir dashboard automaticamente
./manage-servers.sh dashboard

# Ver informações do servidor
./manage-servers.sh info

# Verificar se uma porta está em uso
./manage-servers.sh check-port 8080
```

---

## 🎨 Recursos do Dashboard

- ✅ **Lista visual** de todos os servidores
- ✅ **Filtros** por status (Ativos, Inativos, Standby)
- ✅ **Estatísticas** (total, ativos, capacidade)
- ✅ **CRUD completo** (criar, ler, atualizar, deletar)
- ✅ **Cópia de tokens** com um clique
- ✅ **Acesso direto** aos servidores
- ✅ **Badges visuais** para status
- ✅ **Responsivo** (funciona em mobile!)
- ✅ **Animações suaves** e agradáveis

---

## 🆘 Troubleshooting

### "Dashboard não carrega"
```bash
# Verifique se o servidor está rodando
./manage-servers.sh info

# Se não estiver, inicie
npm start
```

### "Porta já em uso"
```bash
# Use outra porta
PORT=9000 npm start

# Ou verifique qual processo está usando
lsof -i :8080
```

### "Arquivo servers-config.json vazio"
- Adicione um servidor via dashboard
- Ou copie o arquivo de exemplo:
```bash
cp servers-config.example.json servers-config.json
```

### "Não consigo acessar um servidor remoto"
- Verifique se host e porta estão corretos
- Confirme firewall/acesso de rede
- Teste: `ping seu-servidor.com`

---

## 📖 Próximos Passos

1. **Explorar o código**: Veja `DASHBOARD_README.md`
2. **Entender a arquitetura**: Veja `ARQUITECTURA_EXPANSAO.md`
3. **Integração com seu APP**: Use a API `/api/servers`
4. **Adicionar mais servidores**: Clique "+ Novo Servidor"
5. **Fazer backup**: Copie `servers-config.json`

---

## 💡 Dicas

- **Naming consistente**: Use nomes descritivos (ex: "Prod - USA - Principal")
- **Anotações úteis**: Adicione datas e responsáveis nas notas
- **Tokens seguros**: Use tokens aleatórios (64+ caracteres em produção)
- **Regiões claras**: Especifique localização geográfica
- **Status correto**: Mantenha o status atualizado

---

## 🔐 Segurança Básica

- Não compartilhe tokens em texto claro
- Use HTTPS (wss) em produção
- Proteja a porta do dashboard com firewall
- Faça backup regular de `servers-config.json`
- Revise logs periodicamente

---

**Dúvidas? Veja a documentação completa em DASHBOARD_README.md** 📚

Bom gerenciamento! 🚀
