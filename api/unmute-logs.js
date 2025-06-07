#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Tipos de console que vamos descomentar
const consoleTypes = [
    'console.log',
    'console.error', 
    'console.warn',
    'console.info',
    'console.debug',
    'console.trace'
];

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
    'node_modules',
    '.git'
];

let totalFiles = 0;
let totalLinesUncommented = 0;

function shouldIgnoreFile(filePath) {
    return ignoreFiles.some(ignore => filePath.includes(ignore));
}

function uncommentConsoleLogs(content) {
    let modifiedContent = content;
    let linesUncommented = 0;
    
    // Para cada tipo de console
    consoleTypes.forEach(consoleType => {
        // Regex para encontrar linhas comentadas com console.log
        const regex = new RegExp(`^(\\s*)// (${consoleType.replace('.', '\\.')}.*)$`, 'gm');
        
        modifiedContent = modifiedContent.replace(regex, (match, indent, consoleLine) => {
            linesUncommented++;
            return `${indent}${consoleLine}`;
        });
    });
    
    return { content: modifiedContent, linesUncommented };
}

function processFile(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const { content: newContent, linesUncommented } = uncommentConsoleLogs(content);
        
        if (linesUncommented > 0) {
            fs.writeFileSync(filePath, newContent, 'utf8');
            console.log(`✅ ${path.relative(process.cwd(), filePath)}: ${linesUncommented} linhas descomentadas`);
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
    console.log('🔊 DESCOMENTANDO TODOS OS CONSOLE.LOG DO PROJETO...\n');
    
    searchDirs.forEach(dir => {
        const fullDir = path.resolve(dir);
        if (fs.existsSync(fullDir)) {
            console.log(`📁 Processando: ${fullDir}`);
            processDirectory(fullDir);
        } else {
            console.log(`⚠️ Diretório não encontrado: ${fullDir}`);
        }
    });
    
    console.log('\n📊 RESUMO:');
    console.log(`📝 Arquivos processados: ${totalFiles}`);
    console.log(`🔊 Linhas descomentadas: ${totalLinesUncommented}`);
    
    if (totalLinesUncommented > 0) {
        console.log('\n🎉 Logs descomentados com sucesso!');
        console.log('💡 Para comentar novamente, execute: node mute-logs.js');
    } else {
        console.log('\n✅ Nenhum log para descomentar (não havia logs comentados)');
    }
}

main(); 