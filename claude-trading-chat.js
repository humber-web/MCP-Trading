// Claude-compatible trading chat interface
const CryptoTradingServer = require('./src/server');

class ClaudeTradingChat {
  constructor() {
    this.server = null;
    this.conversationHistory = [];
  }

  async initialize() {
    console.log('🤖 CLAUDE INTEGRATION - CONVERSATIONAL CRYPTO TRADING\n');
    console.log('='.repeat(60));
    
    this.server = new CryptoTradingServer();
    await this.server.initialize();
    
    console.log('✅ CryptoTrader MCP server ready for Claude integration!');
    console.log('💬 You can now have conversations about trading...\n');
  }

  async simulateClaudeConversation() {
    console.log('🎭 SIMULATING CLAUDE CONVERSATION\n');
    console.log('=' .repeat(50));
    
    // Simulate typical Claude trading conversations
    const conversations = [
      {
        human: "Hey Claude, what's my current portfolio status?",
        action: "check_portfolio"
      },
      {
        human: "Analyze Bitcoin and tell me if I should buy some",
        action: "analyze_bitcoin"
      },
      {
        human: "Buy $1000 worth of Bitcoin for me",
        action: "buy_bitcoin"
      },
      {
        human: "How is my portfolio performing now?",
        action: "portfolio_performance"
      },
      {
        human: "What's the market sentiment today?",
        action: "market_sentiment"
      }
    ];

    for (const [index, conv] of conversations.entries()) {
      console.log(`\n💬 Conversation ${index + 1}:`);
      console.log(`👤 Human: "${conv.human}"`);
      console.log(`🤖 Claude: Let me help you with that...`);
      
      await this.handleClaudeRequest(conv.action);
      
      // Simulate thinking time
      await this.sleep(1000);
    }
  }

  async handleClaudeRequest(action) {
    const portfolio = this.server.getPortfolio();
    const cache = this.server.getCache();
    
    switch (action) {
      case 'check_portfolio':
        await this.checkPortfolioForClaude();
        break;
        
      case 'analyze_bitcoin':
        await this.analyzeBitcoinForClaude();
        break;
        
      case 'buy_bitcoin':
        await this.executeBitcoinPurchase();
        break;
        
      case 'portfolio_performance':
        await this.showPortfolioPerformance();
        break;
        
      case 'market_sentiment':
        await this.showMarketSentiment();
        break;
    }
  }

  async checkPortfolioForClaude() {
    const portfolio = this.server.getPortfolio();
    
    console.log(`📊 Here's your current portfolio status:
    
💰 **Portfolio Overview**
• Cash Balance: $${portfolio.balance_usd.toLocaleString()}
• Active Positions: ${Object.keys(portfolio.positions).length}
• Total Portfolio Value: $${portfolio.total_value.toLocaleString()}

📈 **Performance**
• Total P&L: ${portfolio.pnl >= 0 ? '+' : ''}$${portfolio.pnl}
• ROI: ${((portfolio.total_value - 15000) / 15000 * 100).toFixed(2)}%

Your portfolio is looking good! You have a healthy cash balance for new opportunities.`);
  }

  async analyzeBitcoinForClaude() {
    // Simulate real market data
    const btcData = {
      price: 43500,
      change_24h: 2.1,
      rsi: 58,
      macd: 'bullish',
      volume: 28500000000,
      support: 42000,
      resistance: 46000
    };
    
    console.log(`📊 **Bitcoin Analysis (BTC/USD)**

💰 **Current Price**: $${btcData.price.toLocaleString()} (+${btcData.change_24h}% 24h)

🔍 **Technical Analysis**:
• RSI: ${btcData.rsi} (Neutral - not overbought)
• MACD: ${btcData.macd} signal
• Support Level: $${btcData.support.toLocaleString()}  
• Resistance Level: $${btcData.resistance.toLocaleString()}

💡 **My Recommendation**:
Given the current technical setup, Bitcoin looks relatively healthy at these levels. The RSI shows room for upward movement, and we're seeing bullish MACD signals. 

✅ **Suggested Action**: Consider a moderate position (10-15% of portfolio)
⚠️ **Risk Management**: Set stop-loss at $${btcData.support.toLocaleString()}
🎯 **Target**: $${btcData.resistance.toLocaleString()} for initial profit-taking

Would you like me to execute a Bitcoin purchase?`);
  }

  async executeBitcoinPurchase() {
    const portfolio = this.server.getPortfolio();
    const purchaseAmount = 1000;
    const btcPrice = 43500;
    const btcQuantity = purchaseAmount / btcPrice;
    
    if (portfolio.balance_usd >= purchaseAmount) {
      // Execute the purchase
      portfolio.balance_usd -= purchaseAmount;
      portfolio.positions['bitcoin'] = {
        quantity: btcQuantity,
        avg_price: btcPrice,
        invested: purchaseAmount,
        created_at: new Date().toISOString()
      };
      
      console.log(`✅ **Bitcoin Purchase Executed Successfully!**

🛒 **Transaction Details**:
• Amount Invested: $${purchaseAmount.toLocaleString()}
• BTC Price: $${btcPrice.toLocaleString()}
• BTC Acquired: ${btcQuantity.toFixed(6)} BTC
• Transaction Time: ${new Date().toLocaleString()}

💰 **Updated Portfolio**:
• New Cash Balance: $${portfolio.balance_usd.toLocaleString()}
• Bitcoin Position: ${btcQuantity.toFixed(6)} BTC ($${purchaseAmount.toLocaleString()})

🎯 **Next Steps**: I'll monitor this position and alert you if it hits our target ($46,000) or stop-loss ($42,000) levels.`);
    } else {
      console.log(`❌ **Insufficient Funds**
      
Sorry, you don't have enough cash balance for this $${purchaseAmount} Bitcoin purchase. 
Current balance: $${portfolio.balance_usd.toLocaleString()}

💡 **Suggestions**:
• Consider a smaller amount (max $${portfolio.balance_usd.toFixed(0)})
• Sell some existing positions to free up cash
• Wait for additional funding`);
    }
  }

  async showPortfolioPerformance() {
    const portfolio = this.server.getPortfolio();
    
    // Simulate current market prices
    const currentPrices = {
      bitcoin: 44500 // 2.3% gain from purchase price
    };
    
    let totalCurrentValue = portfolio.balance_usd;
    let totalPnL = 0;
    
    console.log(`📈 **Portfolio Performance Update**

💎 **Current Holdings**:`);

    if (portfolio.positions.bitcoin) {
      const position = portfolio.positions.bitcoin;
      const currentPrice = currentPrices.bitcoin;
      const positionValue = position.quantity * currentPrice;
      const pnl = positionValue - position.invested;
      const pnlPercent = (pnl / position.invested) * 100;
      
      totalCurrentValue += positionValue;
      totalPnL += pnl;
      
      console.log(`
🟡 **Bitcoin (BTC)**
• Quantity: ${position.quantity.toFixed(6)} BTC
• Avg Price: $${position.avg_price.toLocaleString()}
• Current Price: $${currentPrice.toLocaleString()}
• Position Value: $${positionValue.toLocaleString()}
• P&L: ${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)} (${pnlPercent >= 0 ? '+' : ''}${pnlPercent.toFixed(1)}%)`);
    }

    const totalROI = ((totalCurrentValue - 15000) / 15000) * 100;
    
    console.log(`
🏆 **Portfolio Summary**:
• Total Value: $${totalCurrentValue.toLocaleString()}
• Cash: $${portfolio.balance_usd.toLocaleString()}
• Total P&L: ${totalPnL >= 0 ? '+' : ''}$${totalPnL.toFixed(2)}
• ROI: ${totalROI >= 0 ? '+' : ''}${totalROI.toFixed(2)}%

${totalPnL > 0 ? '🎉 Great job! Your portfolio is in profit!' : '💪 Stay patient - markets fluctuate!'}`);
  }

  async showMarketSentiment() {
    const sentimentData = {
      fearGreedIndex: 52,
      trend: 'Neutral',
      topGainers: ['Solana (+5.2%)', 'Cardano (+1.8%)', 'Bitcoin (+2.1%)'],
      topLosers: ['Ethereum (-0.8%)', 'Polygon (-1.2%)'],
      marketCap: 1750000000000,
      volume24h: 89000000000
    };
    
    console.log(`😊 **Market Sentiment Analysis**

📊 **Fear & Greed Index**: ${sentimentData.fearGreedIndex}/100 (${sentimentData.trend})
${sentimentData.fearGreedIndex < 25 ? '😨 Extreme Fear - Great buying opportunity!' : 
  sentimentData.fearGreedIndex > 75 ? '🤑 Extreme Greed - Consider taking profits!' : 
  '😐 Neutral sentiment - Market is balanced'}

🚀 **Top Gainers (24h)**:
${sentimentData.topGainers.map(coin => `• ${coin}`).join('\n')}

📉 **Top Losers (24h)**:
${sentimentData.topLosers.map(coin => `• ${coin}`).join('\n')}

💰 **Market Overview**:
• Total Market Cap: $${(sentimentData.marketCap / 1e12).toFixed(2)}T
• 24h Volume: $${(sentimentData.volume24h / 1e9).toFixed(1)}B

💡 **Trading Insight**: The neutral sentiment suggests the market is in a consolidation phase. This could be a good time for selective buying of quality assets that show technical strength.`);
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async showIntegrationInstructions() {
    console.log('\n🔗 **CLAUDE INTEGRATION METHODS**\n');
    console.log('='.repeat(50));
    
    console.log(`**Method 1: MCP Server Connection**
Your CryptoTrader is an MCP-compliant server. Claude can connect to it using:

\`\`\`bash
# Start your server
npm start

# In another terminal, connect Claude
npx claude-code connect crypto-trader-mcp
\`\`\`

**Method 2: Custom Integration**
You can also build custom integrations using the server's API:

\`\`\`javascript
const server = new CryptoTradingServer();
await server.initialize();

// Available tools
const tools = await server.toolsHandler.listTools();
const result = await server.toolsHandler.callTool({
  name: 'get_price', 
  arguments: { coin: 'bitcoin' }
});
\`\`\`

**Method 3: Direct MCP Protocol**
Send JSON-RPC 2.0 messages directly:

\`\`\`json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "buy_crypto",
    "arguments": {
      "coin": "bitcoin",
      "amount_usd": 1000
    }
  }
}
\`\`\``);

    console.log('\n💡 **Available for Claude Conversations**:');
    const availableCommands = [
      'get_price - Get current crypto prices',
      'buy_crypto - Execute paper trades', 
      'sell_crypto - Sell positions',
      'analyze_coin - Technical analysis',
      'market_scan - Find opportunities',
      'portfolio_rebalance - Portfolio optimization',
      'risk_analysis - Risk assessment',
      'set_alerts - Price alerts'
    ];
    
    availableCommands.forEach(cmd => console.log(`   • ${cmd}`));
  }

  async shutdown() {
    if (this.server) {
      await this.server.shutdown();
    }
  }
}

// Demo the Claude integration
async function main() {
  const claudeChat = new ClaudeTradingChat();
  
  try {
    await claudeChat.initialize();
    await claudeChat.simulateClaudeConversation();
    await claudeChat.showIntegrationInstructions();
  } catch (error) {
    console.error('Demo error:', error);
  } finally {
    await claudeChat.shutdown();
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = ClaudeTradingChat;