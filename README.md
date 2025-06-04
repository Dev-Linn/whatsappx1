# 🤖 WhatsApp Gemini Chatbot com Sistema de Banco de Dados

Um chatbot inteligente para WhatsApp que utiliza a API do Google Gemini e possui um sistema completo de banco de dados SQLite para gerenciamento de conversas e análise de custos.

## ✨ Funcionalidades

### 🧠 Sistema de IA
- **Google Gemini 1.5 Flash**: IA conversacional avançada
- **Memória Conversacional**: Lembra de conversas anteriores
- **Contexto Inteligente**: Respostas baseadas no histórico do usuário
- **Simulação de Digitação**: Comportamento humano realista

### 📊 Sistema de Banco de Dados
- **SQLite**: Banco de dados local eficiente
- **Gestão de Usuários**: Perfis completos com histórico
- **Análise de Conversas**: Métricas detalhadas de engajamento
- **Controle de Custos**: Monitoramento da API Gemini
- **Relatórios Avançados**: Insights sobre uso e performance

### 🔧 Recursos Técnicos
- **Estrutura Modular**: Código organizado e escalável
- **Sistema de Migração**: Transição automática de JSON para SQLite
- **Scripts de Gerenciamento**: Comandos para análise e manutenção
- **Tratamento de Erros**: Sistema robusto de recuperação

## 📁 Estrutura do Projeto

```
whatsapp-gemini-chatbot/
├── src/                    # Código fonte principal
│   ├── index.js           # Aplicação principal
│   ├── database.js        # Sistema de banco de dados
│   ├── cost-tracker.js    # Monitoramento de custos
│   ├── sentiment-analyzer.js # Análise de sentimento
│   └── prompts.js         # Prompts da IA
├── scripts/               # Scripts de gerenciamento
│   ├── view-database.js   # Visualização e análise do banco
│   ├── view-conversations.js # Visualização de conversas
│   └── migrate-to-database.js # Migração de dados
├── data/                  # Dados e banco
│   ├── chatbot.db        # Banco SQLite principal
│   └── gemini-costs.json # Backup de custos (legacy)
├── package.json          # Dependências e scripts
├── reset-database.js     # Reset do banco (desenvolvimento)
├── .env                  # Configurações (API keys)
└── README.md            # Documentação
```

## 🚀 Instalação e Configuração

### 1. Clone o repositório
```bash
git clone <seu-repositorio>
cd whatsapp-gemini-chatbot
```

### 2. Instale as dependências
```bash
npm install
```

### 3. Configure as variáveis de ambiente
Crie um arquivo `.env` na raiz do projeto:
```env
GEMINI_API_KEY=sua_chave_api_aqui
```

### 4. Execute a migração (se necessário)
```bash
npm run migrate
```

### 5. Inicie o chatbot
```bash
npm start
```

## 📋 Comandos Disponíveis

### 🤖 Execução
- `npm start` - Inicia o chatbot
- `npm run dev` - Modo desenvolvimento (com nodemon)

### 📊 Banco de Dados
- `npm run db` - Relatório geral do banco
- `npm run db:search <termo>` - Buscar usuários
- `npm run db:history <telefone>` - Histórico completo de um usuário
- `npm run db:costs` - Análise detalhada de custos
- `npm run db:export` - Exportar dados do banco
- `npm run db:clean [dias]` - Limpar dados antigos

### 💬 Conversas
- `npm run conversations` - Relatório de conversas
- `npm run conversations:search <termo>` - Buscar conversas
- `npm run conversations:export` - Exportar conversas
- `npm run conversations:clean [dias]` - Limpar conversas antigas

### 🔄 Migração e Reset
- `npm run migrate` - Migrar dados JSON para SQLite
- `npm run reset` - Resetar banco de dados (desenvolvimento)

## 📊 Estrutura do Banco de Dados

### Tabelas Principais

#### 👥 Users (Usuários)
- Informações básicas do usuário
- Estatísticas de engajamento
- Classificação de leads (stage)
- Análise de sentimento automática
- Observações geradas pela IA

#### 💬 Conversations (Conversas)
- Sessões de conversa organizadas
- Contador de mensagens por sessão
- Data e identificação de sessão

#### 📝 Messages (Mensagens)
- Histórico completo de mensagens
- Identificação bot vs usuário
- Timestamps precisos
- Tamanho das mensagens

#### 💰 API Costs (Custos)
- Monitoramento de tokens (input/output)
- Custos por requisição (USD/BRL)
- Análise temporal
- Otimização de gastos

## 🔍 Exemplos de Uso

### Buscar um usuário específico
```bash
npm run db:search "Maria"
```

### Ver histórico completo de conversas
```bash
npm run db:history 5534988528
```

### Análise de custos dos últimos 7 dias
```bash
npm run db:costs
```

### Exportar todos os dados
```bash
npm run db:export
```

### Limpar dados antigos (30+ dias)
```bash
npm run db:clean 30
```

## 📈 Métricas e Relatórios

O sistema fornece métricas detalhadas sobre:

- **Usuários Ativos**: Engajamento diário/semanal/mensal
- **Conversas**: Volume, duração e qualidade
- **Custos**: Monitoramento em tempo real da API
- **Performance**: Tempos de resposta e eficiência
- **Leads**: Classificação e conversão

## 🛠️ Tecnologias Utilizadas

- **Node.js**: Runtime JavaScript
- **WhatsApp Web.js**: Integração com WhatsApp
- **Google Gemini API**: Inteligência artificial
- **SQLite**: Banco de dados local
- **Sequelize**: ORM para banco de dados
- **QRCode Terminal**: Autenticação WhatsApp

## 🔒 Segurança e Privacidade

- Dados armazenados localmente
- Criptografia de sessões WhatsApp
- Backup automático de dados
- Logs de auditoria completos

## 🚀 Próximos Passos

- [ ] Interface web para gerenciamento
- [ ] Análise de sentimento avançada
- [ ] Integração com CRM
- [ ] Relatórios em PDF
- [ ] API REST para integração
- [ ] Dashboard em tempo real

## 📞 Suporte

Para dúvidas ou problemas:
1. Verifique os logs do sistema
2. Execute `npm run db` para diagnóstico
3. Consulte a documentação das APIs
4. Abra uma issue no repositório

---

**Desenvolvido com ❤️ para automatizar e otimizar atendimentos via WhatsApp** 