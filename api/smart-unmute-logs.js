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

let totalFiles = 0;
let totalLinesUncommented = 0;

function shouldIgnoreFile(filePath) {
    return ignoreFiles.some(ignore => filePath.includes(ignore));
}

function smartUncommentLogs(content) {
    let modifiedContent = content;
    let linesUncommented = 0;
    
    // Regex para encontrar linhas comentadas com o prefixo "// DEBUG:"
    const regex = /^(\s*)\/\/ DEBUG: (console\.(log|error|warn|info|debug|trace).*)$/gm;
    
    modifiedContent = modifiedContent.replace(regex, (match, indent, consoleLine) => {
        linesUncommented++;
        return `${indent}${consoleLine}`;
    });
    
    return { content: modifiedContent, linesUncommented };
}

function processFile(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const { content: newContent, linesUncommented } = smartUncommentLogs(content);
        
        if (linesUncommented > 0) {
            fs.writeFileSync(filePath, newContent, 'utf8');
            console.log(`✅ ${path.relative(process.cwd(), filePath)}: ${linesUncommented} debug logs restaurados`);
            totalLinesUncommented += linesUncommented;
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
    console.log('🔊 RESTAURANDO APENAS DEBUG LOGS (PRESERVANDO COMENTÁRIOS NORMAIS)...\n');
    
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
    console.log(`🔊 Debug logs restaurados: ${totalLinesUncommented}`);
    
    if (totalLinesUncommented > 0) {
        console.log('\n🎉 Debug logs restaurados com sucesso!');
        console.log('🛡️ Comentários normais foram preservados!');
        console.log('💡 Para comentar novamente, execute: node smart-mute-logs.js');
    } else {
        console.log('\n✅ Nenhum debug log para restaurar (não havia logs com prefixo DEBUG:)');
    }
}

main(); 