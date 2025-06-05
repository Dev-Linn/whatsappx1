# 🧠 Sistema de Análise Automática de Sentimento e Observações

## 📋 Visão Geral

Este sistema adiciona capacidades de **análise automática de sentimento** e **geração de observações** ao chatbot WhatsApp, permitindo um acompanhamento inteligente e automatizado dos leads e clientes.

## ✨ Funcionalidades Implementadas

### 🎯 Análise Automática
- **Análise de Sentimento**: Classifica automaticamente o humor do cliente (positivo, neutro, negativo)
- **Observações Inteligentes**: Gera resumos de 1 linha sobre o estado da conversa
- **Classificação de Stage**: Identifica automaticamente o estágio do lead no funil de vendas
- **Análise Contextual**: Considera todo o histórico de conversas para análises mais precisas

### 📊 Stages de Classificação
- `lead_frio`: Cliente apenas iniciou conversa, sem interesse claro
- `interessado`: Demonstrou interesse, fez perguntas sobre o produto
- `negociando`: Discutindo preço, condições, pronto para comprar
- `cliente`: Já comprou ou demonstrou intenção clara de compra
- `perdido`: Demonstrou desinteresse claro ou parou de responder

### 🔄 Funcionamento Automático
- **Trigger Inteligente**: Análise executada automaticamente a cada 5 mensagens
- **Contexto Histórico**: Analisa as últimas 20 mensagens para maior precisão
- **Atualização Contínua**: Mantém dados sempre atualizados sem intervenção manual

## 🏗️ Arquitetura do Sistema

### 📁 Arquivos Principais

#### `src/sentiment-analyzer.js`
- **Classe Principal**: `SentimentAnalyzer`
- **IA Utilizada**: Google Gemini 1.5 Flash
- **Prompt Especializado**: Otimizado para análise de conversas de vendas
- **Tratamento de Erros**: Sistema robusto com fallbacks

#### `src/database.js` (Atualizado)
- **Novos Campos**:
  - `sentiment`: Enum (positivo, neutro, negativo)
  - `observations`: Texto com resumo da conversa
  - `last_analysis_at`: Data da última análise
  - `messages_since_analysis`: Contador de mensagens desde análise

#### `src/index.js` (Integrado)
- **Integração Automática**: Análise executada durante conversas
- **Contexto Inteligente**: Usa dados de análise para personalizar respostas
- **Performance**: Não impacta velocidade de resposta do bot

### 🛠️ Scripts de Suporte

#### `migrate-database.js`
- **Migração Segura**: Adiciona novos campos sem perder dados existentes
- **Verificação Inteligente**: Só adiciona campos que não existem
- **Validação**: Testa estrutura após migração

#### `view-database.js` (Atualizado)
- **Visualização Completa**: Mostra dados de análise no histórico
- **Relatórios Detalhados**: Inclui informações de sentimento e stage
- **Interface Amigável**: Fácil de usar para acompanhar leads

#### `debug-database.js`
- **Ferramenta de Debug**: Para verificar dados e estrutura
- **Diagnóstico Completo**: Identifica problemas rapidamente

## 🚀 Como Usar

### 1. Migração do Banco (Primeira Vez)
```bash
node migrate-database.js
```

### 2. Iniciar o Chatbot
```bash
node src/index.js
```

### 3. Visualizar Análises
```bash
# Relatório geral
node view-database.js

# Histórico específico
node view-database.js history 5534988774030

# Buscar usuários
node view-database.js search maria
```

## 📈 Benefícios do Sistema

### 🎯 Para Vendas
- **Identificação Automática**: Detecta leads quentes automaticamente
- **Priorização**: Foca esforços nos leads mais promissores
- **Histórico Inteligente**: Contexto completo para cada cliente
- **Personalização**: Respostas adaptadas ao sentimento do cliente

### 📊 Para Gestão
- **Relatórios Automáticos**: Acompanhamento sem trabalho manual
- **Métricas Precisas**: Dados confiáveis sobre performance
- **Análise de Tendências**: Identifica padrões de comportamento
- **ROI Mensurável**: Controle de custos e resultados

### 🤖 Para o Bot
- **Respostas Contextuais**: Considera histórico e sentimento
- **Adaptação Automática**: Muda abordagem baseada no stage
- **Aprendizado Contínuo**: Melhora com mais dados
- **Eficiência**: Análise sem impactar performance

## 🔧 Configurações Técnicas

### 📋 Parâmetros Ajustáveis
```javascript
// Frequência de análise (mensagens)
const ANALYSIS_THRESHOLD = 5;

// Contexto para análise (mensagens)
const CONTEXT_LIMIT = 20;

// Contexto para resposta (mensagens)
const RESPONSE_CONTEXT = 10;
```

### 💰 Controle de Custos
- **Análise Eficiente**: Só executa quando necessário
- **Prompt Otimizado**: Reduz tokens utilizados
- **Fallback Inteligente**: Evita custos em caso de erro
- **Monitoramento**: Tracking completo de gastos

## 📝 Exemplo de Análise

### Input (Conversa)
```
Cliente: Oi, vi sobre o ebook de receitas
Bot: Olá! Que bom que se interessou...
Cliente: Quanto custa mesmo?
Bot: São apenas R$ 10,00...
Cliente: Hmm, vou pensar
```

### Output (Análise)
```json
{
  "sentiment": "neutro",
  "observations": "Cliente interessado no ebook, perguntou preço mas ainda hesitante",
  "stage": "interessado"
}
```

## 🔍 Monitoramento

### 📊 Métricas Disponíveis
- Total de análises realizadas
- Distribuição de sentimentos
- Conversão por stage
- Custo por análise
- Precisão das classificações

### 🎯 KPIs Importantes
- **Taxa de Conversão**: leads_frios → interessados → clientes
- **Tempo de Resposta**: Velocidade de identificação de oportunidades
- **Precisão**: Acurácia das classificações automáticas
- **ROI**: Retorno sobre investimento em análises

## 🚀 Próximos Passos

### 🔮 Melhorias Futuras
- **Machine Learning**: Treinamento com dados históricos
- **Análise de Imagens**: Processar fotos enviadas pelos clientes
- **Integração CRM**: Sincronização com sistemas externos
- **Dashboard Web**: Interface visual para acompanhamento
- **Alertas Inteligentes**: Notificações para oportunidades urgentes

### 📈 Expansões Possíveis
- **Multi-idioma**: Suporte a outros idiomas
- **Análise de Voz**: Processamento de áudios do WhatsApp
- **Integração Social**: Análise de perfis sociais
- **Previsão de Churn**: Identificar clientes em risco
- **Recomendações**: Sugestões automáticas de ações

## ✅ Status Atual

- ✅ **Sistema Base**: Implementado e funcionando
- ✅ **Migração**: Script pronto e testado
- ✅ **Integração**: Bot funcionando com análise automática
- ✅ **Visualização**: Interface completa para acompanhamento
- ✅ **Documentação**: Guias completos disponíveis

---

**🎉 O sistema está pronto para uso em produção!**

Para dúvidas ou suporte, consulte os logs do sistema ou execute os scripts de debug disponíveis. 