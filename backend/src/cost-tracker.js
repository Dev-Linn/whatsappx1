// Sistema de Monitoramento de Custos da API Gemini
const fs = require('fs');
const path = require('path');

class GeminiCostTracker {
    constructor() {
        this.costsFile = path.join(__dirname, '../data/gemini-costs.json');
        this.initializeCostLog();
        
        // Preços do Gemini 1.5 Flash (por 1M tokens)
        this.pricing = {
            input: 0.075 / 1000000,  // $0.075 por 1M tokens de entrada
            output: 0.30 / 1000000   // $0.30 por 1M tokens de saída
        };
        
        // Taxa de conversão USD para BRL (aproximada)
        this.usdToBrl = 5.50;
    }

    loadCosts() {
        try {
            if (fs.existsSync(this.costsFile)) {
                return JSON.parse(fs.readFileSync(this.costsFile, 'utf8'));
            }
        } catch (error) {
            console.error('❌ Erro ao carregar custos:', error);
        }
        return {
            totalCost: 0,
            totalRequests: 0,
            dailyCosts: {},
            monthlyCosts: {},
            requests: []
        };
    }

    initializeCostLog() {
        if (!fs.existsSync(this.costsFile)) {
            const initialData = {
                totalCost: 0,
                totalRequests: 0,
                dailyCosts: {},
                monthlyCosts: {},
                requests: []
            };
            
            // Criar diretório se não existir
            const dir = path.dirname(this.costsFile);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            
            fs.writeFileSync(this.costsFile, JSON.stringify(initialData, null, 2));
        }
    }

    // Estima tokens baseado no texto (aproximação)
    estimateTokens(text) {
        // Aproximação: 1 token ≈ 4 caracteres para português
        return Math.ceil(text.length / 4);
    }

    // Registra uma requisição e calcula o custo
    logRequest(inputText, outputText) {
        const inputTokens = this.estimateTokens(inputText);
        const outputTokens = this.estimateTokens(outputText);
        
        const inputCostUSD = inputTokens * this.pricing.input;
        const outputCostUSD = outputTokens * this.pricing.output;
        const totalCostUSD = inputCostUSD + outputCostUSD;
        const totalCostBRL = totalCostUSD * this.usdToBrl;

        const requestData = {
            timestamp: new Date().toISOString(),
            date: new Date().toLocaleDateString('pt-BR'),
            time: new Date().toLocaleTimeString('pt-BR'),
            inputTokens,
            outputTokens,
            totalTokens: inputTokens + outputTokens,
            costUSD: totalCostUSD,
            costBRL: totalCostBRL,
            inputLength: inputText.length,
            outputLength: outputText.length
        };

        this.saveCostData(requestData);
        return requestData;
    }

    saveCostData(requestData) {
        const data = JSON.parse(fs.readFileSync(this.costsFile, 'utf8'));
        
        // Atualiza totais
        data.totalCost += requestData.costBRL;
        data.totalRequests += 1;
        
        // Atualiza custos diários
        const date = requestData.date;
        if (!data.dailyCosts[date]) {
            data.dailyCosts[date] = { cost: 0, requests: 0 };
        }
        data.dailyCosts[date].cost += requestData.costBRL;
        data.dailyCosts[date].requests += 1;
        
        // Atualiza custos mensais
        const month = date.substring(3); // MM/YYYY
        if (!data.monthlyCosts[month]) {
            data.monthlyCosts[month] = { cost: 0, requests: 0 };
        }
        data.monthlyCosts[month].cost += requestData.costBRL;
        data.monthlyCosts[month].requests += 1;
        
        // Adiciona requisição ao histórico (mantém apenas últimas 1000)
        data.requests.push(requestData);
        if (data.requests.length > 1000) {
            data.requests = data.requests.slice(-1000);
        }
        
        fs.writeFileSync(this.costsFile, JSON.stringify(data, null, 2));
    }

    // Gera relatório de custos
    generateReport() {
        const data = JSON.parse(fs.readFileSync(this.costsFile, 'utf8'));
        
        console.log('\n💰 ===== RELATÓRIO DE CUSTOS GEMINI API =====');
        console.log(`📊 Total de Requisições: ${data.totalRequests}`);
        console.log(`💵 Custo Total: R$ ${data.totalCost.toFixed(4)}`);
        console.log(`💵 Custo Total: US$ ${(data.totalCost / this.usdToBrl).toFixed(4)}`);
        
        if (data.totalRequests > 0) {
            console.log(`📈 Custo Médio por Requisição: R$ ${(data.totalCost / data.totalRequests).toFixed(4)}`);
        }
        
        // Custos dos últimos 7 dias
        console.log('\n📅 CUSTOS DOS ÚLTIMOS 7 DIAS:');
        const last7Days = this.getLast7Days();
        let weekTotal = 0;
        
        last7Days.forEach(date => {
            const dayData = data.dailyCosts[date] || { cost: 0, requests: 0 };
            weekTotal += dayData.cost;
            console.log(`${date}: R$ ${dayData.cost.toFixed(4)} (${dayData.requests} req)`);
        });
        
        console.log(`📊 Total da Semana: R$ ${weekTotal.toFixed(4)}`);
        
        // Custo do mês atual
        const currentMonth = new Date().toLocaleDateString('pt-BR').substring(3);
        const monthData = data.monthlyCosts[currentMonth] || { cost: 0, requests: 0 };
        console.log(`\n📅 CUSTO DO MÊS ATUAL (${currentMonth}):`);
        console.log(`💵 Total: R$ ${monthData.cost.toFixed(4)} (${monthData.requests} requisições)`);
        
        // Últimas 5 requisições
        console.log('\n🕐 ÚLTIMAS 5 REQUISIÇÕES:');
        const lastRequests = data.requests.slice(-5);
        lastRequests.forEach((req, index) => {
            console.log(`${index + 1}. ${req.time} - R$ ${req.costBRL.toFixed(4)} (${req.totalTokens} tokens)`);
        });
        
        console.log('\n===============================================\n');
        
        return data;
    }

    getLast7Days() {
        const days = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            days.push(date.toLocaleDateString('pt-BR'));
        }
        return days;
    }

    // Exporta dados para análise
    exportData() {
        const data = JSON.parse(fs.readFileSync(this.costsFile, 'utf8'));
        const exportFile = `gemini-costs-export-${new Date().toISOString().split('T')[0]}.json`;
        fs.writeFileSync(exportFile, JSON.stringify(data, null, 2));
        console.log(`📁 Dados exportados para: ${exportFile}`);
        return exportFile;
    }

    // Reseta dados (cuidado!)
    resetData() {
        const confirmReset = Math.random().toString(36).substring(7);
        console.log(`⚠️  Para confirmar o reset, execute: tracker.confirmReset('${confirmReset}')`);
        this.resetCode = confirmReset;
    }

    confirmReset(code) {
        if (code === this.resetCode) {
            this.initializeCostLog();
            console.log('✅ Dados de custo resetados!');
        } else {
            console.log('❌ Código incorreto. Reset cancelado.');
        }
    }
}

module.exports = GeminiCostTracker; 