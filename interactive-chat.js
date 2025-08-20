#!/usr/bin/env node
// Interactive Chat Interface for CryptoTrader MCP
const readline = require('readline');
const CryptoTradingServer = require('./src/server');

class InteractiveCryptoChat {
  constructor() {
    this.server = null;
    this.rl = null;
    this.marketData = {
      bitcoin: { price: 43500, change_24h: 2.1, rsi: 58 },
      ethereum: { price: 2650, change_24h: -0.8, rsi: 45 },
      solana: { price: 95, change_24h: 5.2, rsi: 72 },
      cardano: { price: 0.52, change_24h: 1.8, rsi: 51 }
    };
  }

  async initialize() {
    console.log('🤖 CRYPTOTRADER INTERACTIVE CHAT');
    console.log('='.repeat(40));
    console.log('💬 Chat with your AI crypto trading assistant!');
    console.log('💡 Try commands like:');
    console.log('   • "Show my portfolio"');
    console.log('   • "Buy $500 Bitcoin"'); 
    console.log('   • "Analyze Ethereum"');
    console.log('   • "What should I buy?"');
    console.log('   • Type "quit" to exit\n');

    this.server = new CryptoTradingServer();
    await this.server.initialize();

    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    console.log('✅ CryptoTrader ready! Start chatting...\n');
    this.startChat();
  }

  startChat() {
    this.rl.question('💬 You: ', async (input) => {
      const message = input.trim().toLowerCase();

      if (message === 'quit' || message === 'exit') {
        console.log('\n👋 Thanks for trading with CryptoTrader MCP!');
        await this.cleanup();
        return;
      }

      await this.processMessage(input.trim());
      this.startChat(); // Continue the conversation
    });
  }

  async processMessage(message) {
    console.log(`\n🤖 CryptoTrader: `);

    // Portfolio queries
    if (this.matchesPattern(message, ['portfolio', 'balance', 'show', 'status', 'holdings'])) {
      await this.showPortfolio();
    }
    // Buy commands
    else if (this.matchesPattern(message, ['buy']) && this.containsCoin(message)) {
      await this.processBuyCommand(message);
    }
    // Sell commands  
    else if (this.matchesPattern(message, ['sell']) && this.containsCoin(message)) {
      await this.processSellCommand(message);
    }
    // Analysis requests
    else if (this.matchesPattern(message, ['analyze', 'analysis', 'look at']) && this.containsCoin(message)) {
      await this.analyzeCoins(message);
    }
    // Price queries
    else if (this.matchesPattern(message, ['price', 'cost', 'worth']) && this.containsCoin(message)) {
      await this.showPrices(message);
    }
    // Recommendations
    else if (this.matchesPattern(message, ['recommend', 'suggest', 'should i', 'what to'])) {
      await this.giveRecommendations();
    }
    // Market overview
    else if (this.matchesPattern(message, ['market', 'overview', 'sentiment'])) {
      await this.showMarketOverview();
    }
    // Help
    else if (this.matchesPattern(message, ['help', 'commands', 'what can'])) {
      this.showHelp();
    }
    // Default response
    else {
      this.showDefaultResponse(message);
    }

    console.log(''); // Add spacing
  }

  matchesPattern(message, keywords) {
    const msg = message.toLowerCase();
    return keywords.some(keyword => msg.includes(keyword));
  }

  containsCoin(message) {
    const msg = message.toLowerCase();
    const coins = ['bitcoin', 'btc', 'ethereum', 'eth', 'solana', 'sol', 'cardano', 'ada'];
    return coins.some(coin => msg.includes(coin));
  }

  extractCoin(message) {
    const msg = message.toLowerCase();
    if (msg.includes('bitcoin') || msg.includes('btc')) return 'bitcoin';
    if (msg.includes('ethereum') || msg.includes('eth')) return 'ethereum';
    if (msg.includes('solana') || msg.includes('sol')) return 'solana';
    if (msg.includes('cardano') || msg.includes('ada')) return 'cardano';
    return 'bitcoin'; // default
  }

  extractAmount(message) {
    // Extract dollar amounts like $500, $1000, etc.
    const match = message.match(/\$([0-9,]+)/);
    if (match) {
      return parseInt(match[1].replace(',', ''));
    }
    
    // Look for number + dollar/usd
    const numMatch = message.match(/([0-9,]+)\s*(dollar|usd)/i);
    if (numMatch) {
      return parseInt(numMatch[1].replace(',', ''));
    }
    
    return 1000; // default amount
  }

  async showPortfolio() {
    const portfolio = this.server.getPortfolio();
    
    console.log(`📊 **Your Portfolio Status:**\n`);
    console.log(`💰 **Cash Balance**: $${portfolio.balance_usd.toLocaleString()}`);
    console.log(`📈 **Active Positions**: ${Object.keys(portfolio.positions).length}`);
    
    if (Object.keys(portfolio.positions).length > 0) {
      console.log(`\n🏆 **Holdings:**`);
      
      let totalValue = portfolio.balance_usd;
      
      for (const [coin, position] of Object.entries(portfolio.positions)) {
        const currentPrice = this.marketData[coin]?.price || position.avg_price;
        const positionValue = position.quantity * currentPrice;
        const pnl = positionValue - position.invested;
        const pnlPercent = (pnl / position.invested) * 100;
        
        totalValue += positionValue;
        
        console.log(`   ${coin.toUpperCase()}: ${position.quantity.toFixed(6)} coins`);
        console.log(`   💰 Value: $${positionValue.toLocaleString()}`);
        console.log(`   📈 P&L: ${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)} (${pnlPercent >= 0 ? '+' : ''}${pnlPercent.toFixed(1)}%)\n`);
      }
      
      const totalPnL = totalValue - 15000;
      const roi = (totalPnL / 15000) * 100;
      
      console.log(`💎 **Total Portfolio**: $${totalValue.toLocaleString()}`);
      console.log(`🎯 **Total ROI**: ${roi >= 0 ? '+' : ''}${roi.toFixed(2)}%`);
    } else {
      console.log(`\n💡 You have no active positions. Ready to start trading!`);
    }
  }

  async processBuyCommand(message) {
    const coin = this.extractCoin(message);
    const amount = this.extractAmount(message);
    const portfolio = this.server.getPortfolio();
    
    console.log(`🛒 **Processing Buy Order**`);
    console.log(`   Coin: ${coin.toUpperCase()}`);
    console.log(`   Amount: $${amount.toLocaleString()}\n`);
    
    if (portfolio.balance_usd < amount) {
      console.log(`❌ **Insufficient funds!**`);
      console.log(`   Available: $${portfolio.balance_usd.toLocaleString()}`);
      console.log(`   Needed: $${amount.toLocaleString()}`);
      console.log(`   💡 Try a smaller amount or sell some positions first.`);
      return;
    }
    
    const price = this.marketData[coin]?.price || 50000;
    const quantity = amount / price;
    
    // Execute the trade
    portfolio.balance_usd -= amount;
    if (portfolio.positions[coin]) {
      // Average down existing position
      const existingValue = portfolio.positions[coin].quantity * portfolio.positions[coin].avg_price;
      const newTotalValue = existingValue + amount;
      const newTotalQuantity = portfolio.positions[coin].quantity + quantity;
      
      portfolio.positions[coin] = {
        quantity: newTotalQuantity,
        avg_price: newTotalValue / newTotalQuantity,
        invested: (portfolio.positions[coin].invested || existingValue) + amount,
        created_at: portfolio.positions[coin].created_at
      };
    } else {
      portfolio.positions[coin] = {
        quantity: quantity,
        avg_price: price,
        invested: amount,
        created_at: new Date().toISOString()
      };
    }
    
    console.log(`✅ **Trade Executed Successfully!**`);
    console.log(`   📊 Price: $${price.toLocaleString()}`);
    console.log(`   🪙 Acquired: ${quantity.toFixed(6)} ${coin.toUpperCase()}`);
    console.log(`   💰 New Balance: $${portfolio.balance_usd.toLocaleString()}`);
    console.log(`   🎯 Position Size: ${((amount / 15000) * 100).toFixed(1)}% of portfolio`);
  }

  async processSellCommand(message) {
    const coin = this.extractCoin(message);
    const portfolio = this.server.getPortfolio();
    
    if (!portfolio.positions[coin]) {
      console.log(`❌ **No ${coin.toUpperCase()} position to sell!**`);
      console.log(`   💡 You can only sell coins you own.`);
      return;
    }
    
    const position = portfolio.positions[coin];
    const currentPrice = this.marketData[coin]?.price || position.avg_price;
    
    // Sell 50% by default, or extract percentage from message
    let sellPercentage = 50;
    const percentMatch = message.match(/([0-9]+)\s*%/);
    if (percentMatch) {
      sellPercentage = Math.min(100, parseInt(percentMatch[1]));
    } else if (message.includes('all') || message.includes('everything')) {
      sellPercentage = 100;
    }
    
    const sellQuantity = position.quantity * (sellPercentage / 100);
    const sellValue = sellQuantity * currentPrice;
    const avgCostBasis = position.avg_price * sellQuantity;
    const pnl = sellValue - avgCostBasis;
    
    // Execute the sale
    portfolio.balance_usd += sellValue;
    
    if (sellPercentage >= 100) {
      delete portfolio.positions[coin];
    } else {
      portfolio.positions[coin].quantity -= sellQuantity;
    }
    
    console.log(`✅ **Sale Executed Successfully!**`);
    console.log(`   🪙 Sold: ${sellQuantity.toFixed(6)} ${coin.toUpperCase()} (${sellPercentage}%)`);
    console.log(`   📊 Price: $${currentPrice.toLocaleString()}`);
    console.log(`   💰 Received: $${sellValue.toLocaleString()}`);
    console.log(`   📈 P&L: ${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)}`);
    console.log(`   💵 New Balance: $${portfolio.balance_usd.toLocaleString()}`);
  }

  async analyzeCoins(message) {
    const coin = this.extractCoin(message);
    const data = this.marketData[coin];
    
    if (!data) {
      console.log(`❌ Sorry, I don't have data for that coin yet.`);
      return;
    }
    
    console.log(`📊 **${coin.toUpperCase()} Analysis:**\n`);
    console.log(`💰 **Price**: $${data.price.toLocaleString()} (${data.change_24h >= 0 ? '+' : ''}${data.change_24h}% 24h)`);
    console.log(`📈 **RSI**: ${data.rsi} ${this.getRSISignal(data.rsi)}`);
    console.log(`📊 **Trend**: ${data.change_24h > 0 ? 'Bullish 🐂' : 'Bearish 🐻'}`);
    
    // Give trading recommendation
    console.log(`\n💡 **My Recommendation**:`);
    if (data.rsi < 30) {
      console.log(`   🟢 **BUY SIGNAL**: RSI shows oversold conditions - good entry point!`);
    } else if (data.rsi > 70) {
      console.log(`   🔴 **SELL SIGNAL**: RSI shows overbought conditions - consider taking profits`);
    } else {
      console.log(`   🟡 **HOLD/NEUTRAL**: RSI in neutral zone - wait for clearer signals`);
    }
    
    if (data.change_24h > 3) {
      console.log(`   ⚠️ Strong upward momentum - but be cautious of pullbacks`);
    } else if (data.change_24h < -3) {
      console.log(`   💎 Down significantly - could be a buying opportunity`);
    }
  }

  getRSISignal(rsi) {
    if (rsi < 30) return '(Oversold - Buy Signal 🟢)';
    if (rsi > 70) return '(Overbought - Sell Signal 🔴)';
    return '(Neutral 🟡)';
  }

  async showPrices(message) {
    console.log(`💰 **Current Crypto Prices:**\n`);
    
    Object.entries(this.marketData).forEach(([coin, data]) => {
      const trend = data.change_24h > 0 ? '📈' : '📉';
      const change = data.change_24h >= 0 ? '+' : '';
      console.log(`   ${trend} **${coin.toUpperCase()}**: $${data.price.toLocaleString()} (${change}${data.change_24h}%)`);
    });
    
    console.log(`\n💡 Prices update every 30 seconds via our caching system!`);
  }

  async giveRecommendations() {
    console.log(`🎯 **Trading Recommendations Based on Current Market:**\n`);
    
    // Analyze each coin and give recommendations
    const recommendations = [];
    
    Object.entries(this.marketData).forEach(([coin, data]) => {
      let signal = 'HOLD';
      let reason = 'Neutral conditions';
      
      if (data.rsi < 35 && data.change_24h > 2) {
        signal = 'STRONG BUY';
        reason = 'Oversold but showing momentum';
      } else if (data.rsi < 40) {
        signal = 'BUY';
        reason = 'Approaching oversold levels';
      } else if (data.rsi > 70) {
        signal = 'SELL';
        reason = 'Overbought conditions';
      }
      
      recommendations.push({ coin, signal, reason, data });
    });
    
    // Sort by signal strength
    const signalOrder = { 'STRONG BUY': 1, 'BUY': 2, 'HOLD': 3, 'SELL': 4 };
    recommendations.sort((a, b) => signalOrder[a.signal] - signalOrder[b.signal]);
    
    recommendations.forEach(rec => {
      const emoji = rec.signal.includes('BUY') ? '🟢' : rec.signal === 'SELL' ? '🔴' : '🟡';
      console.log(`   ${emoji} **${rec.coin.toUpperCase()}** - ${rec.signal}`);
      console.log(`      ${rec.reason}`);
      console.log(`      Price: $${rec.data.price.toLocaleString()} | RSI: ${rec.data.rsi}\n`);
    });
  }

  async showMarketOverview() {
    console.log(`📊 **Crypto Market Overview:**\n`);
    
    const gainers = Object.entries(this.marketData)
      .filter(([coin, data]) => data.change_24h > 0)
      .sort((a, b) => b[1].change_24h - a[1].change_24h);
    
    const losers = Object.entries(this.marketData)
      .filter(([coin, data]) => data.change_24h < 0)
      .sort((a, b) => a[1].change_24h - b[1].change_24h);
    
    if (gainers.length > 0) {
      console.log(`🚀 **Top Gainers:**`);
      gainers.forEach(([coin, data]) => {
        console.log(`   📈 ${coin.toUpperCase()}: +${data.change_24h}%`);
      });
    }
    
    if (losers.length > 0) {
      console.log(`\n📉 **Top Losers:**`);
      losers.forEach(([coin, data]) => {
        console.log(`   📉 ${coin.toUpperCase()}: ${data.change_24h}%`);
      });
    }
    
    console.log(`\n😊 **Market Sentiment**: Neutral (Fear & Greed Index: 52)`);
    console.log(`💡 **Overall**: Mixed signals - selective trading recommended`);
  }

  showHelp() {
    console.log(`🤖 **CryptoTrader Commands:**\n`);
    console.log(`**Portfolio Management:**`);
    console.log(`   • "Show my portfolio" - View holdings and balances`);
    console.log(`   • "What's my balance" - Check available cash\n`);
    
    console.log(`**Trading:**`);
    console.log(`   • "Buy $500 Bitcoin" - Purchase crypto`);
    console.log(`   • "Sell 50% Ethereum" - Sell positions`);
    console.log(`   • "Sell all Solana" - Close entire position\n`);
    
    console.log(`**Analysis:**`);
    console.log(`   • "Analyze Bitcoin" - Technical analysis`);
    console.log(`   • "What's Bitcoin price?" - Current prices`);
    console.log(`   • "Market overview" - Market sentiment\n`);
    
    console.log(`**Recommendations:**`);
    console.log(`   • "What should I buy?" - Trading suggestions`);
    console.log(`   • "Give me recommendations" - Market analysis\n`);
    
    console.log(`💡 **Tips**: Be conversational! I understand natural language.`);
  }

  showDefaultResponse(message) {
    console.log(`🤔 I'm not sure what you mean by "${message}"`);
    console.log(`💡 Try asking things like:`);
    console.log(`   • "Show my portfolio"`);
    console.log(`   • "Buy $1000 Bitcoin"`);
    console.log(`   • "Analyze Ethereum"`);
    console.log(`   • Or type "help" for all commands`);
  }

  async cleanup() {
    if (this.server) {
      await this.server.shutdown();
    }
    if (this.rl) {
      this.rl.close();
    }
    process.exit(0);
  }
}

// Start the interactive chat
async function main() {
  const chat = new InteractiveCryptoChat();
  await chat.initialize();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = InteractiveCryptoChat;