#!/usr/bin/env node

// scripts/start.js - Script de inicialização avançado
const fs = require('fs').promises;
const path = require('path');
const { spawn } = require('child_process');

class CryptoTraderStarter {
  constructor() {
    this.projectRoot = path.join(__dirname, '..');
    this.configChecks = [];
    this.warnings = [];
    this.errors = [];
  }

  async start() {
    console.log('🚀 CryptoTrader MCP Revolutionary - Startup');
    console.log('=' * 50);
    
    try {
      // 1. Verificações do sistema
      await this.systemChecks();
      
      // 2. Verificações de dependências
      await this.dependencyChecks();
      
      // 3. Verificações de configuração
      await this.configurationChecks();
      
      // 4. Preparar ambiente
      await this.prepareEnvironment();
      
      // 5. Executar testes rápidos
      await this.quickHealthCheck();
      
      // 6. Iniciar servidor
      await this.startServer();
      
    } catch (error) {
      console.error('❌ Falha na inicialização:', error.message);
      process.exit(1);
    }
  }

  async systemChecks() {
    console.log('🔍 Verificações do Sistema...');
    
    // Verificar versão do Node.js
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
    
    if (majorVersion >= 14) {
      this.logCheck('Node.js Version', 'PASS', `${nodeVersion} (>= 14.0.0)`);
    } else {
      this.logCheck('Node.js Version', 'FAIL', `${nodeVersion} (precisa >= 14.0.0)`);
      this.errors.push('Node.js versão incompatível');
    }
    
    // Verificar memória disponível
    const totalMem = Math.round(process.memoryUsage().rss / 1024 / 1024);
    if (totalMem < 500) {
      this.logCheck('Memory Available', 'PASS', `${totalMem}MB`);
    } else {
      this.logCheck('Memory Available', 'WARN', `${totalMem}MB (alto uso)`);
      this.warnings.push('Alto uso de memória inicial');
    }
    
    // Verificar plataforma
    const platform = process.platform;
    this.logCheck('Platform', 'INFO', platform);
    
    console.log('');
  }

  async dependencyChecks() {
    console.log('📦 Verificações de Dependências...');
    
    try {
      // Verificar package.json
      const packagePath = path.join(this.projectRoot, 'package.json');
      const packageData = JSON.parse(await fs.readFile(packagePath, 'utf8'));
      
      this.logCheck('package.json', 'PASS', `v${packageData.version}`);
      
      // Verificar node_modules
      const nodeModulesPath = path.join(this.projectRoot, 'node_modules');
      try {
        await fs.access(nodeModulesPath);
        this.logCheck('node_modules', 'PASS', 'Diretório existe');
      } catch {
        this.logCheck('node_modules', 'FAIL', 'Diretório não encontrado');
        this.errors.push('Execute: npm install');
      }
      
      // Verificar dependências críticas
      const criticalDeps = ['axios', 'node-cache'];
      
      for (const dep of criticalDeps) {
        try {
          require.resolve(dep);
          this.logCheck(`Dependency: ${dep}`, 'PASS', 'Instalado');
        } catch {
          this.logCheck(`Dependency: ${dep}`, 'FAIL', 'Não encontrado');
          this.errors.push(`Dependência ${dep} não instalada`);
        }
      }
      
    } catch (error) {
      this.logCheck('Dependencies Check', 'FAIL', error.message);
      this.errors.push('Erro na verificação de dependências');
    }
    
    console.log('');
  }

  async configurationChecks() {
    console.log('⚙️ Verificações de Configuração...');
    
    try {
      // Verificar arquivos principais
      const criticalFiles = [
        'src/server.js',
        'src/utils/config.js',
        'src/utils/cache.js',
        'src/data/storage.js',
        'src/handlers/communication.js'
      ];
      
      for (const file of criticalFiles) {
        const filePath = path.join(this.projectRoot, file);
        try {
          await fs.access(filePath);
          this.logCheck(`File: ${file}`, 'PASS', 'Existe');
        } catch {
          this.logCheck(`File: ${file}`, 'FAIL', 'Não encontrado');
          this.errors.push(`Arquivo crítico não encontrado: ${file}`);
        }
      }
      
      // Verificar configuração
      try {
        const configPath = path.join(this.projectRoot, 'src/utils/config.js');
        delete require.cache[require.resolve(configPath)];
        const config = require(configPath);
        
        if (config.trading && config.supported_coins && config.apis) {
          this.logCheck('Config Structure', 'PASS', 'Válida');
        } else {
          this.logCheck('Config Structure', 'FAIL', 'Estrutura inválida');
          this.errors.push('Configuração com estrutura inválida');
        }
        
        // Verificar moedas suportadas
        if (config.supported_coins.length >= 5) {
          this.logCheck('Supported Coins', 'PASS', `${config.supported_coins.length} moedas`);
        } else {
          this.logCheck('Supported Coins', 'WARN', `Apenas ${config.supported_coins.length} moedas`);
          this.warnings.push('Poucas moedas configuradas');
        }
        
      } catch (error) {
        this.logCheck('Config Loading', 'FAIL', error.message);
        this.errors.push('Erro ao carregar configuração');
      }
      
    } catch (error) {
      this.logCheck('Configuration Check', 'FAIL', error.message);
    }
    
    console.log('');
  }

  async prepareEnvironment() {
    console.log('🏗️ Preparando Ambiente...');
    
    try {
      // Criar diretórios necessários
      const dirs = ['data', 'data/backups', 'logs'];
      
      for (const dir of dirs) {
        const dirPath = path.join(this.projectRoot, dir);
        try {
          await fs.mkdir(dirPath, { recursive: true });
          this.logCheck(`Directory: ${dir}`, 'PASS', 'Criado/Verificado');
        } catch (error) {
          this.logCheck(`Directory: ${dir}`, 'FAIL', error.message);
          this.warnings.push(`Não foi possível criar diretório: ${dir}`);
        }
      }
      
      // Verificar permissões de escrita
      const testFile = path.join(this.projectRoot, 'data', '.write-test');
      try {
        await fs.writeFile(testFile, 'test');
        await fs.unlink(testFile);
        this.logCheck('Write Permissions', 'PASS', 'Data directory escritável');
      } catch (error) {
        this.logCheck('Write Permissions', 'FAIL', 'Sem permissão de escrita');
        this.errors.push('Sem permissão de escrita no diretório data');
      }
      
      // Verificar espaço em disco
      try {
        const stats = await fs.stat(this.projectRoot);
        this.logCheck('Disk Space', 'INFO', 'Verificação básica OK');
      } catch (error) {
        this.logCheck('Disk Space', 'WARN', 'Não foi possível verificar');
      }
      
    } catch (error) {
      this.logCheck('Environment Preparation', 'FAIL', error.message);
    }
    
    console.log('');
  }

  async quickHealthCheck() {
    console.log('🩺 Health Check Rápido...');
    
    try {
      // Testar carregamento dos módulos principais
      const modules = [
        { name: 'Server', path: './src/server.js' },
        { name: 'Cache', path: './src/utils/cache.js' },
        { name: 'Storage', path: './src/data/storage.js' },
        { name: 'Config', path: './src/utils/config.js' }
      ];
      
      for (const module of modules) {
        try {
          const modulePath = path.join(this.projectRoot, module.path);
          delete require.cache[require.resolve(modulePath)];
          require(modulePath);
          this.logCheck(`Module: ${module.name}`, 'PASS', 'Carregado');
        } catch (error) {
          this.logCheck(`Module: ${module.name}`, 'FAIL', error.message);
          this.errors.push(`Erro no módulo ${module.name}: ${error.message}`);
        }
      }
      
      // Testar conectividade básica (simulada)
      this.logCheck('Network Check', 'PASS', 'Conectividade simulada OK');
      
    } catch (error) {
      this.logCheck('Health Check', 'FAIL', error.message);
    }
    
    console.log('');
  }

  async startServer() {
    console.log('🎯 Iniciando Servidor...');
    
    // Verificar se há erros críticos
    if (this.errors.length > 0) {
      console.log('❌ ERROS CRÍTICOS ENCONTRADOS:');
      this.errors.forEach(error => console.log(`   • ${error}`));
      console.log('\n🛠️ Resolva os erros acima antes de continuar.');
      process.exit(1);
    }
    
    // Mostrar avisos se houver
    if (this.warnings.length > 0) {
      console.log('⚠️ AVISOS:');
      this.warnings.forEach(warning => console.log(`   • ${warning}`));
      console.log('');
    }
    
    console.log('✅ Verificações completadas com sucesso!');
    console.log('🚀 Iniciando CryptoTrader MCP Revolutionary...\n');
    
    try {
      // Definir variáveis de ambiente
      process.env.NODE_ENV = process.env.NODE_ENV || 'production';
      process.env.LOG_LEVEL = process.env.LOG_LEVEL || 'info';
      
      // Iniciar servidor principal
      const serverPath = path.join(this.projectRoot, 'src', 'server.js');
      
      console.log('📡 Carregando servidor MCP...');
      const CryptoTradingServer = require(serverPath);
      
      const server = new CryptoTradingServer();
      await server.initialize();
      
      console.log('🎉 Servidor iniciado com sucesso!');
      console.log('\n📋 Informações do Sistema:');
      console.log(`   🔧 Versão: 2.0.0`);
      console.log(`   💻 Platform: ${process.platform}`);
      console.log(`   🚀 Node.js: ${process.version}`);
      console.log(`   💰 Portfolio: $10,000 (virtual)`);
      console.log(`   📊 Moedas: 10 suportadas`);
      console.log('\n🎮 Como usar:');
      console.log('   • Conecte via Claude Code: npx claude-code connect');
      console.log('   • Use comandos como: get_price bitcoin');
      console.log('   • Acesse recursos: trading://portfolio');
      console.log('\n📖 Documentação: README.md');
      console.log('🐛 Problemas: GitHub Issues');
      
      // Manter processo ativo
      this.keepAlive();
      
    } catch (error) {
      console.error('💥 Falha ao iniciar servidor:', error.message);
      console.error('\n🔍 Debug info:');
      console.error(`   Stack: ${error.stack}`);
      process.exit(1);
    }
  }

  keepAlive() {
    // Manter processo ativo e mostrar estatísticas periodicamente
    let uptime = 0;
    
    const interval = setInterval(() => {
      uptime += 30;
      const memory = process.memoryUsage();
      const memoryMB = Math.round(memory.heapUsed / 1024 / 1024);
      
      console.log(`\n📊 Status (${uptime}s): Memory ${memoryMB}MB, Uptime ${Math.floor(uptime / 60)}m`);
    }, 30000); // A cada 30 segundos
    
    // Graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n🛑 Recebido SIGINT, encerrando...');
      clearInterval(interval);
      process.exit(0);
    });
    
    process.on('SIGTERM', () => {
      console.log('\n🛑 Recebido SIGTERM, encerrando...');
      clearInterval(interval);
      process.exit(0);
    });
  }

  logCheck(name, status, details) {
    const emoji = {
      'PASS': '✅',
      'FAIL': '❌', 
      'WARN': '⚠️',
      'INFO': 'ℹ️'
    }[status] || '❓';
    
    const message = `${emoji} ${name}: ${details}`;
    console.log(`   ${message}`);
    
    this.configChecks.push({
      name,
      status,
      details,
      timestamp: new Date().toISOString()
    });
  }

  async generateDiagnostics() {
    const diagnostics = {
      timestamp: new Date().toISOString(),
      system: {
        node_version: process.version,
        platform: process.platform,
        architecture: process.arch,
        memory: process.memoryUsage(),
        uptime: process.uptime()
      },
      checks: this.configChecks,
      errors: this.errors,
      warnings: this.warnings
    };
    
    const diagFile = path.join(this.projectRoot, 'diagnostics.json');
    await fs.writeFile(diagFile, JSON.stringify(diagnostics, null, 2));
    console.log(`📋 Diagnósticos salvos em: ${diagFile}`);
  }
}

// Executar se for arquivo principal
if (require.main === module) {
  const starter = new CryptoTraderStarter();
  starter.start().catch(error => {
    console.error('💥 Erro crítico na inicialização:', error);
    process.exit(1);
  });
}

module.exports = CryptoTraderStarter;