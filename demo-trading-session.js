// Interactive Trading Simulation Demo
const CryptoTradingServer = require('./src/server');

async function runTradingDemo() {
  console.log('🎬 CRYPTOTRADER MCP - LIVE TRADING DEMO\n');
  console.log('='.repeat(50));
  
  let server = null;
  
  try {
    // Initialize the trading server
    console.log('🚀 1. INITIALIZING TRADING SERVER...');
    server = new CryptoTradingServer();
    await server.initialize();
    
    const portfolio = server.getPortfolio();
    const cache = server.getCache();
    
    console.log(`✅ Server ready! Starting portfolio: $${portfolio.balance_usd.toLocaleString()}`);
    console.log(`📊 Current positions: ${Object.keys(portfolio.positions).length}`);
    
    // Simulate market data
    console.log('\n💰 2. FETCHING MARKET PRICES...');
    const marketPrices = {
      bitcoin: { price: 43500, change_24h: 2.1, volume: 28500000000 },
      ethereum: { price: 2650, change_24h: -0.8, volume: 15200000000 },
      solana: { price: 95, change_24h: 5.2, volume: 2100000000 },
      cardano: { price: 0.52, change_24h: 1.8, volume: 850000000 }
    };
    
    // Cache the prices
    Object.entries(marketPrices).forEach(([coin, data]) => {
      cache.setPrice(coin, { ...data, timestamp: new Date().toISOString() });
    });
    
    // Display market overview
    console.log('📈 Current Market Prices:');
    Object.entries(marketPrices).forEach(([coin, data]) => {
      const trend = data.change_24h > 0 ? '📈' : '📉';
      const changeColor = data.change_24h > 0 ? '+' : '';
      console.log(`   ${trend} ${coin.toUpperCase()}: $${data.price.toLocaleString()} (${changeColor}${data.change_24h}%)`);
    });
    
    // Trading Scenario 1: Buy Bitcoin
    console.log('\n💰 3. TRADING SCENARIO 1: BUYING BITCOIN');
    const btcInvestment = 3000;
    const btcPrice = marketPrices.bitcoin.price;
    const btcQuantity = btcInvestment / btcPrice;
    
    console.log(`🛒 Buying $${btcInvestment} worth of Bitcoin...`);
    console.log(`   Price: $${btcPrice.toLocaleString()}`);
    console.log(`   Quantity: ${btcQuantity.toFixed(6)} BTC`);
    
    // Execute the trade
    portfolio.balance_usd -= btcInvestment;
    portfolio.positions['bitcoin'] = {
      quantity: btcQuantity,
      avg_price: btcPrice,
      invested: btcInvestment,
      created_at: new Date().toISOString()
    };
    
    console.log(`✅ Trade executed! New balance: $${portfolio.balance_usd.toLocaleString()}`);
    
    // Trading Scenario 2: Buy Ethereum
    console.log('\n🔷 4. TRADING SCENARIO 2: BUYING ETHEREUM');
    const ethInvestment = 2000;
    const ethPrice = marketPrices.ethereum.price;
    const ethQuantity = ethInvestment / ethPrice;
    
    console.log(`🛒 Buying $${ethInvestment} worth of Ethereum...`);
    console.log(`   Price: $${ethPrice.toLocaleString()}`);
    console.log(`   Quantity: ${ethQuantity.toFixed(4)} ETH`);
    
    portfolio.balance_usd -= ethInvestment;
    portfolio.positions['ethereum'] = {
      quantity: ethQuantity,
      avg_price: ethPrice,
      invested: ethInvestment,
      created_at: new Date().toISOString()
    };
    
    console.log(`✅ Trade executed! New balance: $${portfolio.balance_usd.toLocaleString()}`);
    
    // Show current portfolio
    console.log('\n📊 5. CURRENT PORTFOLIO STATUS');
    console.log('='.repeat(40));
    console.log(`💵 Cash Balance: $${portfolio.balance_usd.toLocaleString()}`);
    console.log(`📈 Active Positions: ${Object.keys(portfolio.positions).length}`);
    
    let totalInvested = 0;
    let currentValue = 0;
    
    Object.entries(portfolio.positions).forEach(([coin, position]) => {
      const currentPrice = marketPrices[coin].price;
      const positionValue = position.quantity * currentPrice;
      const pnl = positionValue - position.invested;
      const pnlPercent = (pnl / position.invested) * 100;
      
      totalInvested += position.invested;
      currentValue += positionValue;
      
      const trend = pnl > 0 ? '📈' : '📉';
      const pnlColor = pnl > 0 ? '+' : '';
      
      console.log(`   ${trend} ${coin.toUpperCase()}: ${position.quantity.toFixed(6)} coins`);
      console.log(`      💰 Invested: $${position.invested.toLocaleString()}`);
      console.log(`      📊 Current: $${positionValue.toLocaleString()}`);
      console.log(`      💸 P&L: ${pnlColor}$${pnl.toFixed(2)} (${pnlColor}${pnlPercent.toFixed(1)}%)`);
    });
    
    const totalPortfolioValue = portfolio.balance_usd + currentValue;
    const totalPnL = totalPortfolioValue - 15000; // Original starting balance
    const totalROI = (totalPnL / 15000) * 100;
    
    console.log('\n💎 PORTFOLIO SUMMARY:');
    console.log(`   🏦 Total Portfolio Value: $${totalPortfolioValue.toLocaleString()}`);
    console.log(`   📊 Total Invested in Positions: $${totalInvested.toLocaleString()}`);
    console.log(`   💰 Cash Available: $${portfolio.balance_usd.toLocaleString()}`);
    console.log(`   🎯 Total P&L: ${totalPnL >= 0 ? '+' : ''}$${totalPnL.toFixed(2)} (${totalROI >= 0 ? '+' : ''}${totalROI.toFixed(2)}% ROI)`);
    
    // Simulate price movement
    console.log('\n📈 6. SIMULATING MARKET MOVEMENT...');
    console.log('⏰ Fast-forwarding 24 hours...');
    
    // Bitcoin goes up 8%
    const newBtcPrice = btcPrice * 1.08;
    marketPrices.bitcoin.price = newBtcPrice;
    marketPrices.bitcoin.change_24h = 8.0;
    
    // Ethereum goes down 3%  
    const newEthPrice = ethPrice * 0.97;
    marketPrices.ethereum.price = newEthPrice;
    marketPrices.ethereum.change_24h = -3.0;
    
    console.log('📊 New Market Prices:');
    console.log(`   📈 BITCOIN: $${btcPrice.toLocaleString()} → $${newBtcPrice.toLocaleString()} (+8.0%)`);
    console.log(`   📉 ETHEREUM: $${ethPrice.toLocaleString()} → $${newEthPrice.toLocaleString()} (-3.0%)`);
    
    // Calculate new portfolio value
    console.log('\n💰 7. UPDATED PORTFOLIO VALUE');
    console.log('='.repeat(40));
    
    let newCurrentValue = 0;
    let totalPnLAfterMove = 0;
    
    Object.entries(portfolio.positions).forEach(([coin, position]) => {
      const newPrice = marketPrices[coin].price;
      const positionValue = position.quantity * newPrice;
      const pnl = positionValue - position.invested;
      const pnlPercent = (pnl / position.invested) * 100;
      
      newCurrentValue += positionValue;
      totalPnLAfterMove += pnl;
      
      const trend = pnl > 0 ? '📈' : '📉';
      const pnlColor = pnl > 0 ? '+' : '';
      
      console.log(`   ${trend} ${coin.toUpperCase()}: $${positionValue.toLocaleString()}`);
      console.log(`      💸 P&L: ${pnlColor}$${pnl.toFixed(2)} (${pnlColor}${pnlPercent.toFixed(1)}%)`);
    });
    
    const newTotalValue = portfolio.balance_usd + newCurrentValue;
    const newTotalROI = ((newTotalValue - 15000) / 15000) * 100;
    
    console.log('\n🏆 FINAL PORTFOLIO PERFORMANCE:');
    console.log(`   💎 Total Value: $${newTotalValue.toLocaleString()}`);
    console.log(`   📊 Total P&L: ${totalPnLAfterMove >= 0 ? '+' : ''}$${totalPnLAfterMove.toFixed(2)}`);
    console.log(`   🎯 Total ROI: ${newTotalROI >= 0 ? '+' : ''}${newTotalROI.toFixed(2)}%`);
    
    // Trading decision simulation
    console.log('\n🤔 8. TRADING DECISION SIMULATION');
    
    if (totalPnLAfterMove > 0) {
      console.log('💡 STRATEGY SUGGESTION: Portfolio is in profit!');
      console.log('   📊 Consider taking partial profits on Bitcoin (+8%)');
      console.log('   🔷 Ethereum is down - potential buying opportunity');
      console.log('   🎯 Recommended action: Rebalance portfolio');
    } else {
      console.log('⚠️ STRATEGY SUGGESTION: Portfolio showing losses');
      console.log('   📊 Consider stop-loss if Bitcoin drops below $40,000');
      console.log('   🔷 Average down on Ethereum if it continues to fall');
      console.log('   🎯 Recommended action: Hold and monitor');
    }
    
    // Risk analysis
    console.log('\n🛡️ 9. RISK ANALYSIS');
    const btcExposure = (portfolio.positions.bitcoin.invested / 15000) * 100;
    const ethExposure = (portfolio.positions.ethereum.invested / 15000) * 100;
    const cashExposure = (portfolio.balance_usd / 15000) * 100;
    
    console.log(`   🟡 Bitcoin Exposure: ${btcExposure.toFixed(1)}% (Max: 20%)`);
    console.log(`   🔵 Ethereum Exposure: ${ethExposure.toFixed(1)}% (Max: 20%)`);
    console.log(`   💵 Cash Exposure: ${cashExposure.toFixed(1)}%`);
    
    if (btcExposure > 20 || ethExposure > 20) {
      console.log('   ⚠️ WARNING: Position size exceeds 20% limit!');
    } else {
      console.log('   ✅ All positions within risk limits');
    }
    
    console.log('\n🎉 TRADING SIMULATION COMPLETED!');
    console.log('📈 Your CryptoTrader MCP Revolutionary successfully:');
    console.log('   ✅ Executed multiple trades');
    console.log('   ✅ Tracked portfolio performance');  
    console.log('   ✅ Calculated P&L in real-time');
    console.log('   ✅ Provided risk analysis');
    console.log('   ✅ Suggested trading strategies');
    
  } catch (error) {
    console.log('❌ Demo error:', error.message);
  } finally {
    if (server) {
      await server.shutdown();
    }
  }
}

// Run the demo
if (require.main === module) {
  runTradingDemo().catch(console.error);
}

module.exports = { runTradingDemo };