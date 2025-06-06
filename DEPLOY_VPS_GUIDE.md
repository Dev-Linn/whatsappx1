# 🚀 Guia de Deploy VPS - WhatsApp Analytics System

## 📋 Pré-requisitos na VPS

### 1. Software Necessário
```bash
# Atualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Node.js (versão 18+)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Instalar Git
sudo apt install git -y

# Instalar PM2 (gerenciador de processos)
sudo npm install -g pm2

# Instalar Nginx (proxy reverso)
sudo apt install nginx -y

# Verificar versões
node --version
npm --version
```

### 2. Estrutura de Diretórios
```bash
# Criar diretório para aplicação
sudo mkdir -p /var/www/whatsapp-analytics
sudo chown -R $USER:$USER /var/www/whatsapp-analytics
cd /var/www/whatsapp-analytics
```

## 📦 Upload dos Arquivos

### Opção 1: Via Git (Recomendado)
```bash
# Se você tem o projeto no GitHub/GitLab
git clone [SEU_REPOSITORIO] .

# Ou copiar arquivos via SCP/FTP do seu PC
```

### Opção 2: Via SCP (do seu PC local)
```bash
# No seu PC (PowerShell/CMD)
scp -r C:\Users\mypc\Desktop\whatsappx1 usuario@SEU_IP_VPS:/var/www/whatsapp-analytics
```

## ⚙️ Configuração do Backend

### 1. Instalar Dependências
```bash
cd /var/www/whatsapp-analytics
npm install

# Instalar dependências da API
cd api
npm install

# Voltar para raiz
cd ..
```

### 2. Configurar Variáveis de Ambiente
```bash
# Criar arquivo .env na raiz do projeto
nano .env
```

**Conteúdo do .env:**
```env
# Ambiente
NODE_ENV=production
PORT=3001

# Database
DB_PATH=/var/www/whatsapp-analytics/backend/data/whatsapp.db

# JWT Secret (MUDE PARA UMA CHAVE FORTE)
JWT_SECRET=sua_chave_secreta_super_forte_aqui_123456789

# URLs
API_BASE_URL=https://seudominio.com/api/v1
FRONTEND_URL=https://seudominio.com

# WhatsApp (se usar)
WHATSAPP_TOKEN=seu_token_whatsapp

# Logs
LOG_LEVEL=info
LOG_FILE=/var/www/whatsapp-analytics/logs/app.log
```

### 3. Preparar Banco de Dados
```bash
# Criar diretório de dados se não existir
mkdir -p backend/data
mkdir -p logs

# Executar scripts de criação de tabelas
cd api
node create-tables-simple.js
node seed-test-data.js
node integration-status.js

# Verificar se tudo está OK
node check-tables.js
```

## 🌐 Configuração do Frontend

### 1. Build da Aplicação React
```bash
# Se usar React (ajustar conforme sua stack)
cd frontend
npm install
npm run build

# Mover build para diretório do Nginx
sudo cp -r build/* /var/www/html/
# ou criar um diretório específico
sudo mkdir -p /var/www/whatsapp-analytics-frontend
sudo cp -r build/* /var/www/whatsapp-analytics-frontend/
```

### 2. Configurar Nginx
```bash
# Criar configuração do site
sudo nano /etc/nginx/sites-available/whatsapp-analytics
```

**Configuração Nginx:**
```nginx
server {
    listen 80;
    server_name seudominio.com www.seudominio.com;

    # Frontend (React)
    location / {
        root /var/www/whatsapp-analytics-frontend;
        index index.html index.htm;
        try_files $uri $uri/ /index.html;
        
        # Headers para SPA
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        add_header Pragma "no-cache";
        add_header Expires "0";
    }

    # API Backend
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # CORS headers
        add_header Access-Control-Allow-Origin *;
        add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS";
        add_header Access-Control-Allow-Headers "Origin, X-Requested-With, Content-Type, Accept, Authorization";
    }

    # WebSocket support (se necessário)
    location /ws {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }

    # Logs
    access_log /var/log/nginx/whatsapp-analytics.access.log;
    error_log /var/log/nginx/whatsapp-analytics.error.log;
}
```

### 3. Ativar Site no Nginx
```bash
# Ativar o site
sudo ln -s /etc/nginx/sites-available/whatsapp-analytics /etc/nginx/sites-enabled/

# Remover site padrão (opcional)
sudo rm /etc/nginx/sites-enabled/default

# Testar configuração
sudo nginx -t

# Reiniciar Nginx
sudo systemctl restart nginx
sudo systemctl enable nginx
```

## 🔄 Configuração do PM2

### 1. Arquivo de Configuração PM2
```bash
# Criar arquivo ecosystem.config.js na raiz
nano ecosystem.config.js
```

**Conteúdo do ecosystem.config.js:**
```javascript
module.exports = {
  apps: [
    {
      name: 'whatsapp-analytics-api',
      script: './api/server.js', // ou o arquivo principal da API
      cwd: '/var/www/whatsapp-analytics',
      instances: 2, // ou 'max' para usar todos os cores
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      log_file: '/var/www/whatsapp-analytics/logs/combined.log',
      out_file: '/var/www/whatsapp-analytics/logs/out.log',
      error_file: '/var/www/whatsapp-analytics/logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm Z',
      restart_delay: 1000,
      max_restarts: 10,
      min_uptime: '10s'
    }
  ]
};
```

### 2. Iniciar com PM2
```bash
# Iniciar aplicação
pm2 start ecosystem.config.js

# Salvar configuração atual
pm2 save

# Configurar para iniciar automaticamente no boot
pm2 startup
# Execute o comando que ele mostrar (sudo env PATH=...)

# Verificar status
pm2 status
pm2 logs
```

## 🔐 SSL/HTTPS (Recomendado)

### 1. Instalar Certbot
```bash
sudo apt install certbot python3-certbot-nginx -y
```

### 2. Obter Certificado SSL
```bash
sudo certbot --nginx -d seudominio.com -d www.seudominio.com
```

### 3. Auto-renovação
```bash
# Testar renovação
sudo certbot renew --dry-run

# Configurar cron para renovação automática
sudo crontab -e
# Adicionar linha:
0 12 * * * /usr/bin/certbot renew --quiet
```

## 🔧 Scripts Úteis

### 1. Script de Deploy (deploy.sh)
```bash
nano deploy.sh
chmod +x deploy.sh
```

**Conteúdo do deploy.sh:**
```bash
#!/bin/bash
echo "🚀 Iniciando deploy..."

# Parar aplicação
pm2 stop whatsapp-analytics-api

# Atualizar código (se usar Git)
git pull origin main

# Instalar dependências
npm install
cd api && npm install && cd ..

# Build frontend (se necessário)
# cd frontend && npm run build && cd ..

# Executar migrações/scripts de DB se necessário
cd api
node integration-status.js
cd ..

# Reiniciar aplicação
pm2 restart whatsapp-analytics-api

# Verificar status
pm2 status

echo "✅ Deploy concluído!"
```

### 2. Script de Backup (backup.sh)
```bash
nano backup.sh
chmod +x backup.sh
```

**Conteúdo do backup.sh:**
```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups/whatsapp-analytics"

mkdir -p $BACKUP_DIR

# Backup do banco de dados
cp /var/www/whatsapp-analytics/backend/data/whatsapp.db $BACKUP_DIR/whatsapp_$DATE.db

# Backup dos logs
tar -czf $BACKUP_DIR/logs_$DATE.tar.gz /var/www/whatsapp-analytics/logs/

# Limpar backups antigos (manter últimos 7 dias)
find $BACKUP_DIR -name "*.db" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "✅ Backup criado: $DATE"
```

## 🔍 Monitoramento

### 1. Verificar Status
```bash
# Status da aplicação
pm2 status
pm2 logs whatsapp-analytics-api

# Status do Nginx
sudo systemctl status nginx

# Status do servidor
htop
df -h
free -h
```

### 2. Logs Importantes
```bash
# Logs da aplicação
tail -f /var/www/whatsapp-analytics/logs/combined.log

# Logs do Nginx
tail -f /var/log/nginx/whatsapp-analytics.access.log
tail -f /var/log/nginx/whatsapp-analytics.error.log

# Logs do sistema
tail -f /var/log/syslog
```

## 🎯 Checklist Final

- [ ] ✅ Node.js instalado (v18+)
- [ ] ✅ Arquivos do projeto enviados
- [ ] ✅ Dependências instaladas
- [ ] ✅ Banco de dados configurado
- [ ] ✅ Variáveis de ambiente configuradas
- [ ] ✅ PM2 configurado e rodando
- [ ] ✅ Nginx configurado
- [ ] ✅ SSL/HTTPS configurado
- [ ] ✅ Firewall configurado (portas 80, 443)
- [ ] ✅ Backup automatizado
- [ ] ✅ Monitoramento ativo

## 📞 Comandos Rápidos de Troubleshooting

```bash
# Reiniciar tudo
sudo systemctl restart nginx
pm2 restart all

# Ver logs em tempo real
pm2 logs --lines 100

# Verificar portas ocupadas
sudo netstat -tlnp | grep :3001
sudo netstat -tlnp | grep :80

# Verificar processos
ps aux | grep node
ps aux | grep nginx

# Verificar espaço em disco
df -h
du -sh /var/www/whatsapp-analytics/*

# Teste de conectividade
curl http://localhost:3001/api/v1/health
curl https://seudominio.com/api/v1/health
```

---

## 🚀 **PRÓXIMOS PASSOS:**

1. **Configure sua VPS** seguindo a seção "Pré-requisitos"
2. **Envie os arquivos** via Git ou SCP
3. **Execute os comandos** na ordem apresentada
4. **Configure seu domínio** para apontar para o IP da VPS
5. **Teste a aplicação** acessando seu domínio

**Precisa de ajuda com algum passo específico?** 🤔 