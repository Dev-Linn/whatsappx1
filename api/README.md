# WhatsApp Gemini Bot - API REST

API REST completa para análise e gerenciamento do chatbot WhatsApp com IA Gemini.

## 🚀 Início Rápido

### Instalação
```bash
cd api/
npm install
```

### Executar
```bash
# Desenvolvimento
npm run dev

# Produção
npm start
```

A API estará disponível em: `http://localhost:3001`

## 📊 Endpoints Principais

### 🏠 Dashboard
```http
GET /api/v1/dashboard
```
Dashboard completo com todas as métricas e estatísticas.

### 👥 Usuários
```http
GET /api/v1/users?page=1&limit=20&stage=interessado
GET /api/v1/users/123
PUT /api/v1/users/123
```

### 💬 Conversas
```http
GET /api/v1/conversations?userId=123
GET /api/v1/conversations/456/messages
```

### 💰 Custos
```http
GET /api/v1/costs/summary
GET /api/v1/costs/projections
```

## 📖 Documentação Completa

Acesse: `http://localhost:3001/api/docs`

## 🔧 Configuração

### Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto principal:

```env
# API Configuration
API_PORT=3001
NODE_ENV=development

# Database (usa o mesmo banco do projeto principal)
# O banco SQLite está em ../data/chatbot.db
```

### Estrutura da API

```
api/
├── server.js              # Servidor principal
├── database.js            # Database manager
├── package.json           # Dependências
├── README.md              # Esta documentação
├── middleware/
│   └── cors.js            # Middleware (CORS, rate limiting, etc)
└── routes/
    ├── dashboard.js       # Rotas do dashboard
    ├── users.js           # Rotas de usuários
    ├── costs.js           # Rotas de custos
    └── conversations.js   # Rotas de conversas
```

## 📈 Exemplos de Uso

### 1. Dashboard Principal
```javascript
const response = await fetch('http://localhost:3001/api/v1/dashboard');
const data = await response.json();

console.log(data.data.overview);
// {
//   totalUsers: 150,
//   totalMessages: 2500,
//   totalCosts: "45.67",
//   activeUsersToday: 12
// }
```

### 2. Buscar Usuários
```javascript
const response = await fetch('http://localhost:3001/api/v1/users?stage=interessado&sentiment=positivo');
const { data } = await response.json();

console.log(data.users[0]);
// {
//   id: 123,
//   name: "João Silva",
//   phone: "5511999999999",
//   stage: "interessado",
//   sentiment: "positivo"
// }
```

### 3. Atualizar Usuário
```javascript
const response = await fetch('http://localhost:3001/api/v1/users/123', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    stage: 'cliente',
    observations: 'Fechou negócio hoje!'
  })
});
```

### 4. Análise de Custos
```javascript
const response = await fetch('http://localhost:3001/api/v1/costs/projections');
const { data } = await response.json();

console.log(data.projections);
// {
//   monthlyProjection: "120.50",
//   yearlyProjection: "1446.00"
// }
```

## 🔍 Filtros e Parâmetros

### Paginação
```
?page=1&limit=20
```

### Filtros de Usuários
```
?stage=interessado          # lead_frio, interessado, negociando, cliente, perdido
?sentiment=positivo         # positivo, neutro, negativo
?search=joão               # Busca por nome ou telefone
?sortBy=last_contact       # Campo para ordenação
?sortOrder=DESC            # ASC ou DESC
```

### Filtros de Tempo
```
?days=30                   # Últimos X dias
?date=2024-01-15          # Data específica
```

## 📊 Formato das Respostas

### Sucesso
```json
{
  "success": true,
  "message": "Dados carregados com sucesso",
  "data": {
    // ... dados da resposta
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Erro
```json
{
  "success": false,
  "error": "Usuário não encontrado",
  "details": null,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## 🛡️ Segurança

### Rate Limiting
- **Geral**: 100 requests por 15 minutos
- **Escrita**: 20 requests por 15 minutos (PUT, POST, DELETE)

### Headers de Segurança
- Helmet.js para headers de segurança
- CORS configurado para localhost
- Compressão ativada

## 🎯 Casos de Uso

### 1. Dashboard de Vendas
```javascript
// Obter métricas de leads quentes
const hotLeads = await fetch('/api/v1/dashboard/hot-leads');
const costs = await fetch('/api/v1/costs/summary');
const activity = await fetch('/api/v1/dashboard/recent-activity');
```

### 2. CRM Simples
```javascript
// Listar prospects
const prospects = await fetch('/api/v1/users?stage=interessado');

// Atualizar status
await fetch('/api/v1/users/123', {
  method: 'PUT',
  body: JSON.stringify({ stage: 'negociando' })
});
```

### 3. Análise de Performance
```javascript
// Analytics detalhados
const analytics = await fetch('/api/v1/conversations/analytics/detailed?days=7');
const costs = await fetch('/api/v1/costs/tokens?days=7');
```

## 🔄 Integração com Frontend

### React/Next.js
```javascript
// hooks/useApi.js
export const useApi = (endpoint) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetch(`http://localhost:3001/api/v1${endpoint}`)
      .then(res => res.json())
      .then(result => {
        setData(result.data);
        setLoading(false);
      });
  }, [endpoint]);
  
  return { data, loading };
};

// Uso
const { data: dashboard } = useApi('/dashboard');
const { data: users } = useApi('/users?stage=interessado');
```

### Vue.js
```javascript
// composables/useApi.js
export const useApi = (endpoint) => {
  const data = ref(null);
  const loading = ref(true);
  
  const fetchData = async () => {
    const response = await fetch(`http://localhost:3001/api/v1${endpoint}`);
    const result = await response.json();
    data.value = result.data;
    loading.value = false;
  };
  
  onMounted(fetchData);
  return { data, loading, refetch: fetchData };
};
```

## 🐛 Debugging

### Logs
A API registra todas as requisições:
```
📡 GET /api/v1/dashboard - 200 (45ms)
📡 PUT /api/v1/users/123 - 200 (120ms)
```

### Health Check
```bash
curl http://localhost:3001/health
```

### Monitoramento
- Uptime do servidor
- Conexão com banco
- Rate limiting status

## 🚀 Deploy

### Desenvolvimento
```bash
npm run dev    # Nodemon para hot reload
```

### Produção
```bash
npm start      # Node.js direto
```

### Docker (futuro)
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3001
CMD ["npm", "start"]
```

## 📝 Changelog

### v1.0.0
- ✅ Dashboard completo
- ✅ CRUD de usuários
- ✅ Análise de custos
- ✅ Gestão de conversas
- ✅ Rate limiting
- ✅ Documentação completa

## 🤝 Contribuição

1. Fork do projeto
2. Crie sua feature branch (`git checkout -b feature/nova-feature`)
3. Commit suas mudanças (`git commit -am 'Add nova feature'`)
4. Push para a branch (`git push origin feature/nova-feature`)
5. Abra um Pull Request

## 📄 Licença

MIT License - veja o arquivo LICENSE para detalhes.

---

🔗 **Repositório**: [GitHub](https://github.com/seu-usuario/whatsapp-bot)
📧 **Contato**: your-email@example.com
📱 **WhatsApp**: +55 11 99999-9999 