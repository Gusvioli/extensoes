# Deploy Externo - Guia Passo a Passo

## 🎯 Objetivo
Você quer rodar o site/dashboard em uma máquina externa (VPS, servidor, domínio público).

## 📋 Pré-requisitos

- **VPS/Servidor** com Ubuntu 20.04+ (AWS, DigitalOcean, Linode, etc)
- **Node.js 16+** instalado
- **Nginx** instalado
- **Domínio** registrado (ex: exemplo.com)
- **SSL Certificate** (vamos gerar com Certbot - Let's Encrypt, gratuito)

## 🚀 Passo 1: Setup inicial do servidor

```bash
# SSH into server
ssh user@seu-servidor-ip

# Update e install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get update
sudo apt-get install -y nodejs nginx git certbot python3-certbot-nginx

# Verificar instalações
node --version
npm --version
nginx -v
```

## 📦 Passo 2: Clonar/copiar código

```bash
# Opção A: Git
cd ~
git clone https://seu-repo-url.git msgs_ponta_a_ponta
cd msgs_ponta_a_ponta

# Opção B: SFTP/SCP (copiar arquivos locais)
# scp -r /caminho/local/msgs_ponta_a_ponta user@servidor:~/
# ssh user@servidor "cd msgs_ponta_a_ponta"
```

## 🔧 Passo 3: Instalar dependências

```bash
# Dashboard
cd dashboard
npm install

# Servidor de sinalização
cd ../server
npm install

# Volta à raiz
cd ..
```

## 🔐 Passo 4: Configurar SSL (Let's Encrypt + Certbot)

```bash
# Substitua "seu-dominio.com" pelo seu domínio real
sudo certbot certonly --standalone -d seu-dominio.com -d www.seu-dominio.com

# Certbot vai criar:
# /etc/letsencrypt/live/seu-dominio.com/fullchain.pem (certificado)
# /etc/letsencrypt/live/seu-dominio.com/privkey.pem (chave privada)
```

## 🌐 Passo 5: Configurar Nginx

```bash
# Editar nginx-example.conf com seu domínio e caminhos
nano nginx-example.conf

# Substituir:
# - "seu-dominio.com" → seu domínio
# - "/path/to/msgs_ponta_a_ponta/dashboard/public" → /home/seu-user/msgs_ponta_a_ponta/dashboard/public

# Copiar para nginx sites-available
sudo cp nginx-example.conf /etc/nginx/sites-available/seu-dominio.com

# Criar symlink
sudo ln -s /etc/nginx/sites-available/seu-dominio.com /etc/nginx/sites-enabled/

# Remover default (se existir)
sudo rm /etc/nginx/sites-enabled/default

# Testar configuração
sudo nginx -t

# Recarregar Nginx
sudo systemctl reload nginx
sudo systemctl enable nginx  # auto-start
```

## 🔄 Passo 6: Atualizar config.js do frontend

Edite `dashboard/public/js/config.js` com seu domínio:

```javascript
window.APP_CONFIG = {
  API_BASE: 'https://seu-dominio.com',
  WS_BASE: 'wss://seu-dominio.com/ws',
  ENV: 'production',
  DEBUG: false
};
```

## 📡 Passo 7: Configurar systemd para auto-start dos serviços

```bash
# Editar paths nos arquivos .service
nano p2p-dashboard.service     # Editar WorkingDirectory se necessário
nano p2p-signaling.service     # Editar WorkingDirectory se necessário

# Copiar para systemd
sudo cp p2p-dashboard.service /etc/systemd/system/
sudo cp p2p-signaling.service /etc/systemd/system/

# Recarregar systemd
sudo systemctl daemon-reload

# Habilitar auto-start
sudo systemctl enable p2p-dashboard.service
sudo systemctl enable p2p-signaling.service

# Iniciar serviços
sudo systemctl start p2p-dashboard.service
sudo systemctl start p2p-signaling.service

# Verificar status
sudo systemctl status p2p-dashboard.service
sudo systemctl status p2p-signaling.service

# Ver logs
sudo journalctl -u p2p-dashboard.service -f
sudo journalctl -u p2p-signaling.service -f
```

## 🔒 Passo 8: Firewall (opcional mas recomendado)

```bash
# Se usar UFW
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw enable
```

## 🧪 Passo 9: Testar deployment

```bash
# Test API
curl -v https://seu-dominio.com/api/public-servers

# Test WebSocket (instalar wscat se não tiver)
npm install -g wscat
wscat -c wss://seu-dominio.com/ws

# Acessar no navegador
# https://seu-dominio.com ou https://seu-dominio.com/view.html
```

## 🔄 Renovação automática de SSL

Certbot instala um cron/timer para renovação automática. Verificar:

```bash
# Teste renovação
sudo certbot renew --dry-run

# Verificar timer
sudo systemctl status snap.certbot.renew.timer
```

## 🛠️ Troubleshooting

### Problema: "Connection refused"
```bash
# Verificar se serviços estão rodando
sudo systemctl status p2p-dashboard
sudo systemctl status p2p-signaling

# Restart
sudo systemctl restart p2p-dashboard
sudo systemctl restart p2p-signaling
```

### Problema: "SSL certificate not found"
```bash
# Regenerar SSL
sudo certbot renew --force-renewal -d seu-dominio.com

# Verificar arquivo
ls -la /etc/letsencrypt/live/seu-dominio.com/
```

### Problema: Nginx não proxya WebSocket corretamente
```bash
# Verificar sintaxe
sudo nginx -t

# Recarregar
sudo systemctl reload nginx

# Logs
sudo tail -f /var/log/nginx/seu-dominio.com-error.log
```

### Problema: Frontend não conecta à API
```bash
# Verificar config.js
cat dashboard/public/js/config.js

# Testar CORS (desde outro domínio)
curl -H "Origin: https://outro-site.com" \
     -H "Access-Control-Request-Method: GET" \
     https://seu-dominio.com/api/public-servers
```

## 📊 Monitoramento contínuo

```bash
# Ver logs em tempo real
sudo journalctl -u p2p-dashboard.service -u p2p-signaling.service -f

# Usar pm2 como alternativa a systemd (opcional)
# npm install -g pm2
# pm2 start dashboard/src/server.js --name dashboard --env production
# pm2 start server/server.js --name signaling --env production
# pm2 save
# pm2 startup
```

## 🎉 Pronto!

Seu site agora está rodando em `https://seu-dominio.com` com:
- ✅ Dashboard HTTP/HTTPS (porta 443 via Nginx)
- ✅ WebSocket seguro WSS (porta 443 via Nginx)
- ✅ Auto-restart se cair (systemd)
- ✅ SSL automático (Let's Encrypt)
- ✅ Frontend configurável para múltiplos ambientes

## 📝 Notas importantes

- **Token security**: O arquivo `server/TOKEN.txt` fica no servidor e é sincronizado para `dashboard/data/servers-config.json`. Nunca exponha esse arquivo publicamente.
- **CORS**: Se o frontend está em outro domínio, edite `dashboard/src/server.js` para adicionar seu domínio ao `Access-Control-Allow-Origin`.
- **Backup**: Periodicamente faça backup de `dashboard/data/` (banco de dados JSON).
- **Updates**: Para fazer update do código, faça git pull e reinicie os serviços.

```bash
# Update código
cd ~/msgs_ponta_a_ponta
git pull

# Reinstalar dependências se package.json mudou
cd dashboard && npm install && cd ..
cd server && npm install && cd ..

# Restart serviços
sudo systemctl restart p2p-dashboard.service
sudo systemctl restart p2p-signaling.service
```

Enjoy! 🚀
