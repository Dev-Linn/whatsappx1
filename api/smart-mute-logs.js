#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Diretórios para procurar
const searchDirs = [
    '../api',
    '../backend/src',
    '.'
];

// Arquivos para ignorar
const ignoreFiles = [
    'mute-logs.js',
    'unmute-logs.js', 
    'smart-mute-logs.js',
    'smart-unmute-logs.js',
    'node_modules',
    '.git'
];

// LOGS IMPORTANTES QUE NUNCA DEVEM SER COMENTADOS
const importantLogPatterns = [
    /console\.(error|warn)\s*\(/,           // Sempre preservar erros e warnings
    /console\.log\s*\([^)]*'❌/,           // Emojis de erro
    /console\.log\s*\([^)]*'⚠️/,          // Emojis de warning  
    /console\.log\s*\([^)]*'✅.*conectad/i, // Logs de conexão bem-sucedida
    /console\.log\s*\([^)]*'✅.*iniciad/i,  // Logs de inicialização
    /console\.log\s*\([^)]*'🚀/,           // Logs de startup
    /console\.log\s*\([^)]*'📡.*servidor/i, // Logs de servidor
    /console\.log\s*\([^)]*'📡.*rodando/i,  // Logs de servidor rodando
    /console\.log\s*\([^)]*'🎉.*sucesso/i,  // Logs de sucesso importantes
    /console\.log\s*\([^)]*PORT\)/,         // Logs com porta
    /console\.log\s*\([^)]*error\)/i,       // Logs que mencionam error
    /console\.log\s*\([^)]*failed\)/i,      // Logs que mencionam failed
    /console\.log\s*\([^)]*'Erro/,          // Logs de erro em português
    /console\.log\s*\([^)]*iniciand/i,      // Logs de inicialização
    /console\.log\s*\([^)]*conectand/i,     // Logs de conexão
];

// LOGS DE DEBUG QUE PODEM SER COMENTADOS
const debugLogPatterns = [
    /console\.log\s*\([^)]*'🔍.*DEBUG/,     // Logs de debug explícitos
    /console\.log\s*\([^)]*'📊.*DADOS/,     // Logs de dados/estatísticas
    /console\.log\s*\([^)]*'📋.*registros/, // Logs de contagem de registros
    /console\.log\s*\([^)]*'🔢.*TOTAL/,     // Logs de totais
    /console\.log\s*\([^)]*decoded/i,       // Logs de tokens decodificados
    /console\.log\s*\([^)]*Headers/,        // Logs de headers HTTP
    /console\.log\s*\([^)]*req\./,          // Logs de request
    /console\.log\s*\([^)]*'🔍.*AUTH/,      // Logs de debug de auth
    /console\.log\s*\([^)]*tenant.*info/i,  // Logs de info de tenant
    /console\.log\s*\([^)]*'👥.*LINK/,      // Logs de debug de links
    /console\.log\s*\([^)]*'🧪.*TEST/,      // Logs de teste
    /console\.log\s*\([^)]*verificand/i,    // Logs de verificação
    /console\.log\s*\([^)]*buscand/i,       // Logs de busca
    /console\.log\s*\([^)]*ENCONTRAD/,      // Logs de itens encontrados
];

let totalFiles = 0;
let totalLinesCommented = 0;
let preservedImportantLogs = 0;

function shouldIgnoreFile(filePath) {
    return ignoreFiles.some(ignore => filePath.includes(ignore));
}

function isImportantLog(line) {
    return importantLogPatterns.some(pattern => pattern.test(line));
}

function isDebugLog(line) {
    return debugLogPatterns.some(pattern => pattern.test(line));
}

function smartCommentLogs(content) {
    let modifiedContent = content;
    let linesCommented = 0;
    let preservedLines = 0;
    
    // Quebrar em linhas para analisar uma por uma
    const lines = content.split('\n');
    const processedLines = lines.map(line => {
        // Verificar se a linha contém console.log/error/warn etc
        if (/console\.(log|error|warn|info|debug|trace)\s*\(/.test(line)) {
            // Se já está comentada, deixar como está
            if (line.trim().startsWith('//')) {
                return line;
            }
            
            // Se é um log importante, preservar
            if (isImportantLog(line)) {
                preservedLines++;
                return line;
            }
            
            // Se é claramente um log de debug, comentar
            if (isDebugLog(line)) {
                linesCommented++;
                const match = line.match(/^(\s*)(.*)/);
                return `${match[1]}// DEBUG: ${match[2]}`;
            }
            
            // Para logs neutros, usar heurísticas adicionais
            const lineContent = line.toLowerCase();
            
            // Preservar se contém palavras-chave importantes
            if (lineContent.includes('servidor') || 
                lineContent.includes('porta') ||
                lineContent.includes('listen') ||
                lineContent.includes('start') ||
                lineContent.includes('init') ||
                lineContent.includes('connect') ||
                lineContent.includes('ready') ||
                lineContent.includes('erro') ||
                lineContent.includes('error') ||
                lineContent.includes('failed') ||
                lineContent.includes('sucesso')) {
                preservedLines++;
                return line;
            }
            
            // Se chegou até aqui, provavelmente é debug - comentar
            linesCommented++;
            const match = line.match(/^(\s*)(.*)/);
            return `${match[1]}// DEBUG: ${match[2]}`;
        }
        
        return line;
    });
    
    return { 
        content: processedLines.join('\n'), 
        linesCommented, 
        preservedLines 
    };
}

function processFile(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const { content: newContent, linesCommented, preservedLines } = smartCommentLogs(content);
        
        if (linesCommented > 0 || preservedLines > 0) {
            if (linesCommented > 0) {
                fs.writeFileSync(filePath, newContent, 'utf8');
            }
            
            const relativePath = path.relative(process.cwd(), filePath);
            if (linesCommented > 0 && preservedLines > 0) {
                console.log(`✅ ${relativePath}: ${linesCommented} debug logs comentados, ${preservedLines} importantes preservados`);
            } else if (linesCommented > 0) {
                console.log(`✅ ${relativePath}: ${linesCommented} debug logs comentados`);
            } else if (preservedLines > 0) {
                console.log(`🛡️ ${relativePath}: ${preservedLines} logs importantes preservados`);
            }
            
            totalLinesCommented += linesCommented;
            preservedImportantLogs += preservedLines;
        }
        
        totalFiles++;
    } catch (error) {
        console.log(`❌ Erro ao processar ${filePath}: ${error.message}`);
    }
}

function processDirectory(dirPath) {
    try {
        const items = fs.readdirSync(dirPath);
        
        items.forEach(item => {
            const fullPath = path.join(dirPath, item);
            
            if (shouldIgnoreFile(fullPath)) {
                return;
            }
            
            const stat = fs.statSync(fullPath);
            
            if (stat.isDirectory()) {
                processDirectory(fullPath);
            } else if (stat.isFile() && fullPath.endsWith('.js')) {
                processFile(fullPath);
            }
        });
    } catch (error) {
        console.log(`⚠️ Erro ao acessar diretório ${dirPath}: ${error.message}`);
    }
}

function main() {
    console.log('🧠 COMENTANDO APENAS LOGS DE DEBUG (PRESERVANDO IMPORTANTES)...\n');
    
    searchDirs.forEach(dir => {
        const fullDir = path.resolve(dir);
        if (fs.existsSync(fullDir)) {
            console.log(`📁 Processando: ${fullDir}`);
            processDirectory(fullDir);
        } else {
            console.log(`⚠️ Diretório não encontrado: ${fullDir}`);
        }
    });
    
    console.log('\n📊 RESUMO INTELIGENTE:');
    console.log(`📝 Arquivos processados: ${totalFiles}`);
    console.log(`🔇 Debug logs comentados: ${totalLinesCommented}`);
    console.log(`🛡️ Logs importantes preservados: ${preservedImportantLogs}`);
    
    if (totalLinesCommented > 0) {
        console.log('\n🎉 Debug logs comentados com sucesso!');
        console.log('🛡️ Logs importantes (erros, inicialização, etc) foram preservados!');
        console.log('💡 Para reverter, execute: node smart-unmute-logs.js');
    } else {
        console.log('\n✅ Nenhum debug log para comentar');
    }
}

main(); 