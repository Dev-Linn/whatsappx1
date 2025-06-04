// Sistema de Análise Automática de Sentimento e Observações
const { GoogleGenerativeAI } = require('@google/generative-ai');

class SentimentAnalyzer {
    constructor(apiKey) {
        this.genAI = new GoogleGenerativeAI(apiKey);
        // Mudar para gemini-1.5-flash que tem limites maiores
        this.model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        
        // Prompt otimizado e mais conciso
        this.analysisPrompt = `Analise esta conversa de vendas e retorne APENAS um JSON válido:

{
  "sentiment": "positivo|neutro|negativo",
  "observations": "Resumo em 1 linha (máx 80 chars)",
  "stage": "lead_frio|interessado|negociando|cliente|perdido"
}

REGRAS:
- sentiment: "positivo" se interessado/satisfeito, "negativo" se desinteressado, "neutro" se indefinido
- observations: Frase curta do estado atual (ex: "Cliente perguntou sobre preço")
- stage: 
  * lead_frio: Apenas iniciou conversa
  * interessado: Demonstrou interesse claro
  * negociando: Discutindo preço/condições
  * cliente: Comprou ou vai comprar
  * perdido: Desinteressado

CONVERSA:
`;
    }

    // Analisar conversa e retornar sentimento, observações e stage
    async analyzeConversation(messages, userName) {
        try {
            if (!messages || messages.length === 0) {
                return {
                    sentiment: 'neutro',
                    observations: 'Conversa sem mensagens suficientes',
                    stage: 'lead_frio'
                };
            }

            // Formatar mensagens de forma mais concisa (últimas 20 apenas)
            const recentMessages = messages.slice(-20);
            let conversationText = `\nCONVERSA COM ${userName}:\n`;
            
            recentMessages.forEach((msg, index) => {
                const sender = msg.is_bot ? "Bot" : userName;
                // Limitar tamanho da mensagem para economizar tokens
                const content = msg.content.length > 100 ? 
                    msg.content.substring(0, 100) + '...' : 
                    msg.content;
                conversationText += `${index + 1}. ${sender}: ${content}\n`;
            });

            // Montar prompt completo (mais conciso)
            const fullPrompt = this.analysisPrompt + conversationText;

            console.log('🧠 Analisando conversa com IA...');
            console.log(`📏 Tamanho do prompt: ${fullPrompt.length} caracteres`);
            
            // Fazer requisição para Gemini
            const result = await this.model.generateContent(fullPrompt);
            const response = await result.response;
            const text = response.text().trim();

            console.log('📊 Resposta da análise:', text);

            // Tentar fazer parse do JSON
            let analysis;
            try {
                // Limpar possíveis caracteres extras
                const cleanText = text.replace(/```json|```/g, '').trim();
                analysis = JSON.parse(cleanText);
            } catch (parseError) {
                console.error('❌ Erro ao fazer parse da análise, usando fallback:', parseError.message);
                
                // Fallback: tentar extrair informações básicas
                analysis = this.extractFallbackAnalysis(text, messages);
            }

            // Validar campos obrigatórios
            analysis = this.validateAnalysis(analysis);

            console.log('✅ Análise concluída:', analysis);
            return analysis;

        } catch (error) {
            console.error('❌ Erro na análise de sentimento:', error);
            
            // Diferentes tipos de erro
            if (error.message && error.message.includes('429')) {
                console.error('🚫 Quota da API excedida');
            } else if (error.message && error.message.includes('quota')) {
                console.error('🚫 Limite de quota atingido');
            }
            
            // Retornar análise padrão em caso de erro
            return {
                sentiment: 'neutro',
                observations: 'Erro na análise automática - necessita revisão manual',
                stage: 'lead_frio'
            };
        }
    }

    // Extrair análise básica quando JSON parsing falha
    extractFallbackAnalysis(text, messages) {
        const lowerText = text.toLowerCase();
        
        // Detectar sentimento básico
        let sentiment = 'neutro';
        if (lowerText.includes('positivo') || lowerText.includes('interessado') || lowerText.includes('satisfeito')) {
            sentiment = 'positivo';
        } else if (lowerText.includes('negativo') || lowerText.includes('desinteressado') || lowerText.includes('insatisfeito')) {
            sentiment = 'negativo';
        }

        // Detectar stage básico
        let stage = 'lead_frio';
        if (lowerText.includes('interessado')) {
            stage = 'interessado';
        } else if (lowerText.includes('negociando') || lowerText.includes('preço')) {
            stage = 'negociando';
        } else if (lowerText.includes('cliente') || lowerText.includes('comprou')) {
            stage = 'cliente';
        } else if (lowerText.includes('perdido') || lowerText.includes('desistiu')) {
            stage = 'perdido';
        }

        // Gerar observação básica
        const lastUserMessage = messages.filter(m => !m.is_bot).slice(-1)[0];
        const observations = lastUserMessage ? 
            `Última msg: ${lastUserMessage.content.substring(0, 50)}...` : 
            'Conversa em andamento';

        return { sentiment, observations, stage };
    }

    // Validar e corrigir análise
    validateAnalysis(analysis) {
        const validSentiments = ['positivo', 'neutro', 'negativo'];
        const validStages = ['lead_frio', 'interessado', 'negociando', 'cliente', 'perdido'];

        // Validar sentiment
        if (!analysis.sentiment || !validSentiments.includes(analysis.sentiment)) {
            analysis.sentiment = 'neutro';
        }

        // Validar stage
        if (!analysis.stage || !validStages.includes(analysis.stage)) {
            analysis.stage = 'lead_frio';
        }

        // Validar observations
        if (!analysis.observations || typeof analysis.observations !== 'string') {
            analysis.observations = 'Análise automática - aguardando mais interações';
        } else {
            // Limitar tamanho das observações
            analysis.observations = analysis.observations.substring(0, 80);
        }

        return analysis;
    }

    // Verificar se análise é necessária baseada em mudanças na conversa
    shouldAnalyze(messages, lastAnalysisDate, threshold = 5) {
        if (!lastAnalysisDate) return true; // Primeira análise
        
        // Contar mensagens após última análise
        const messagesAfterAnalysis = messages.filter(msg => 
            new Date(msg.timestamp) > new Date(lastAnalysisDate)
        );

        return messagesAfterAnalysis.length >= threshold;
    }

    // Estimar custo da análise (para controle)
    estimateAnalysisCost(messages) {
        const totalChars = messages.reduce((sum, msg) => sum + msg.content.length, 0);
        const estimatedTokens = Math.ceil((totalChars + this.analysisPrompt.length) / 4);
        
        // Preços aproximados do Gemini (input + output)
        const inputCost = estimatedTokens * 0.00000015; // $0.00015 per 1K tokens
        const outputCost = 100 * 0.0000006; // ~100 tokens output * $0.0006 per 1K tokens
        
        return {
            estimatedTokens,
            estimatedCostUSD: inputCost + outputCost,
            estimatedCostBRL: (inputCost + outputCost) * 5.5 // Aproximação USD->BRL
        };
    }
}

module.exports = SentimentAnalyzer; 