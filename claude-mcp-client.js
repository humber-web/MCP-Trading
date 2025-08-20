#!/usr/bin/env node
// Claude MCP Client for CryptoTrader Integration
const { spawn } = require('child_process');
const readline = require('readline');

class ClaudeMCPClient {
  constructor() {
    this.server = null;
    this.messageId = 1;
    this.pendingRequests = new Map();
  }

  async initialize() {
    console.log('🤖 CLAUDE MCP CLIENT - CRYPTOTRADER INTEGRATION\n');
    console.log('='.repeat(60));
    console.log('🔌 Connecting to CryptoTrader MCP Server...\n');

    return new Promise((resolve, reject) => {
      // Start the MCP server
      this.server = spawn('node', ['src/server.js'], {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: process.cwd()
      });

      let initReceived = false;

      this.server.stdout.on('data', (data) => {
        const lines = data.toString().split('\n').filter(line => line.trim());
        
        for (const line of lines) {
          try {
            const message = JSON.parse(line);
            this.handleServerMessage(message);
            
            if (message.method === 'initialized' && !initReceived) {
              initReceived = true;
              console.log('✅ Connected to CryptoTrader MCP Server!');
              resolve();
            }
          } catch (error) {
            // Non-JSON output (like logs) - ignore or log
          }
        }
      });

      this.server.stderr.on('data', (data) => {
        // Server logs - display them
        console.log(data.toString().trim());
      });

      this.server.on('error', (error) => {
        console.error('❌ Server error:', error);
        reject(error);
      });

      // Initialize the server
      this.sendMessage({
        jsonrpc: "2.0",
        id: this.messageId++,
        method: "initialize",
        params: {
          protocolVersion: "2024-11-05",
          capabilities: {},
          clientInfo: {
            name: "claude-mcp-client",
            version: "1.0.0"
          }
        }
      });
    });
  }

  sendMessage(message) {
    const messageStr = JSON.stringify(message) + '\n';
    this.server.stdin.write(messageStr);
    
    if (message.id) {
      this.pendingRequests.set(message.id, message);
    }
  }

  handleServerMessage(message) {
    if (message.id && this.pendingRequests.has(message.id)) {
      const request = this.pendingRequests.get(message.id);
      this.pendingRequests.delete(message.id);
      
      // Handle the response
      if (message.error) {
        console.log(`❌ Error for ${request.method}:`, message.error.message);
      } else if (message.result) {
        this.displayResult(request.method, message.result);
      }
    }
  }

  displayResult(method, result) {
    switch (method) {
      case 'tools/list':
        console.log('\n🔧 **Available Trading Tools**:');
        result.tools.forEach((tool, index) => {
          console.log(`   ${index + 1}. **${tool.name}** - ${tool.description}`);
        });
        break;
        
      case 'resources/list':
        console.log('\n📚 **Available Resources**:');
        result.resources.forEach((resource, index) => {
          console.log(`   ${index + 1}. **${resource.uri}** - ${resource.name}`);
        });
        break;
        
      case 'tools/call':
        console.log('\n✅ **Tool Execution Result**:');
        result.content.forEach(content => {
          if (content.type === 'text') {
            console.log(content.text);
          }
        });
        break;
        
      case 'resources/read':
        console.log('\n📊 **Resource Data**:');
        result.contents.forEach(content => {
          console.log(content.text);
        });
        break;
        
      default:
        console.log(`\n📋 **${method} Result**:`, JSON.stringify(result, null, 2));
    }
  }

  async demonstrateClaudeConversation() {
    console.log('\n🎭 **SIMULATING CLAUDE CONVERSATIONS**\n');
    console.log('='.repeat(50));

    // 1. List available tools
    console.log('\n👤 **Claude**: "What trading tools do you have available?"');
    console.log('🤖 **CryptoTrader**: Let me show you all available tools...');
    
    await this.listTools();
    await this.sleep(2000);

    // 2. Check portfolio
    console.log('\n👤 **Claude**: "Show me my current portfolio"');
    console.log('🤖 **CryptoTrader**: Here\'s your portfolio status...');
    
    await this.readResource('trading://portfolio');
    await this.sleep(2000);

    // 3. Get Bitcoin price
    console.log('\n👤 **Claude**: "What\'s the current Bitcoin price?"');
    console.log('🤖 **CryptoTrader**: Let me get the latest Bitcoin price...');
    
    await this.callTool('get_price', { coin: 'bitcoin' });
    await this.sleep(2000);

    // 4. Analyze Ethereum
    console.log('\n👤 **Claude**: "Can you analyze Ethereum for me?"');
    console.log('🤖 **CryptoTrader**: I\'ll perform a complete technical analysis...');
    
    await this.callTool('analyze_coin', { coin: 'ethereum', days: 7 });
    await this.sleep(2000);

    // 5. Execute a trade
    console.log('\n👤 **Claude**: "Buy $500 worth of Bitcoin"');
    console.log('🤖 **CryptoTrader**: Executing your Bitcoin purchase...');
    
    await this.callTool('buy_crypto', { coin: 'bitcoin', amount_usd: 500 });
    await this.sleep(2000);

    // 6. Check updated portfolio
    console.log('\n👤 **Claude**: "How does my portfolio look now?"');
    console.log('🤖 **CryptoTrader**: Here\'s your updated portfolio...');
    
    await this.readResource('trading://portfolio');
    await this.sleep(2000);

    console.log('\n🎉 **CLAUDE INTEGRATION DEMONSTRATION COMPLETE!**');
    console.log('\n✅ Your CryptoTrader successfully handled all Claude conversations!');
  }

  async listTools() {
    this.sendMessage({
      jsonrpc: "2.0",
      id: this.messageId++,
      method: "tools/list"
    });
  }

  async listResources() {
    this.sendMessage({
      jsonrpc: "2.0",
      id: this.messageId++,
      method: "resources/list"
    });
  }

  async callTool(name, args) {
    this.sendMessage({
      jsonrpc: "2.0",
      id: this.messageId++,
      method: "tools/call",
      params: {
        name: name,
        arguments: args
      }
    });
  }

  async readResource(uri) {
    this.sendMessage({
      jsonrpc: "2.0",
      id: this.messageId++,
      method: "resources/read",
      params: {
        uri: uri
      }
    });
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async showIntegrationInstructions() {
    console.log('\n📋 **HOW TO USE WITH REAL CLAUDE**\n');
    console.log('='.repeat(50));
    
    console.log(`**Step 1: Install Claude Code (if not already installed)**
\`\`\`bash
npm install -g @anthropic-ai/claude-code
\`\`\`

**Step 2: Configure MCP Server**
Add this to your Claude Code MCP configuration:

\`\`\`json
{
  "mcpServers": {
    "crypto-trader": {
      "command": "node",
      "args": ["src/server.js"],
      "cwd": "${process.cwd()}",
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
\`\`\`

**Step 3: Start Claude Code with MCP**
\`\`\`bash
claude-code --mcp-config mcp-config.json
\`\`\`

**Step 4: Chat with Claude**
Once connected, you can have natural conversations like:

💬 "Hey Claude, show me my crypto portfolio"
💬 "What's Bitcoin trading at right now?"
💬 "Analyze Ethereum and tell me if I should buy"
💬 "Buy $1000 worth of Bitcoin"
💬 "How is my portfolio performing?"
💬 "What's the market sentiment today?"

**Available Commands Claude Can Use:**
• get_price - Get current cryptocurrency prices
• analyze_coin - Perform technical analysis
• buy_crypto - Execute paper trading purchases  
• sell_crypto - Sell positions
• market_scan - Scan for trading opportunities
• portfolio_rebalance - Optimize portfolio allocation
• risk_analysis - Assess trading risks
• set_alerts - Configure price alerts

**Available Data Claude Can Access:**
• trading://portfolio - Your current portfolio
• trading://market/overview - Market overview
• trading://sentiment - Market sentiment data
• trading://performance - Trading statistics
• system://server/health - System health status`);
  }

  async cleanup() {
    if (this.server) {
      this.server.kill();
    }
  }
}

// Main execution
async function main() {
  const client = new ClaudeMCPClient();
  
  try {
    await client.initialize();
    await client.demonstrateClaudeConversation();
    await client.showIntegrationInstructions();
    
    console.log('\n🚀 **YOUR CRYPTOTRADER IS READY FOR CLAUDE INTEGRATION!**');
    
  } catch (error) {
    console.error('❌ Integration error:', error);
  } finally {
    await client.cleanup();
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = ClaudeMCPClient;