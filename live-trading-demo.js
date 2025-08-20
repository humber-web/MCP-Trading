// LIVE TRADING DEMO - Uses 100% Real Market Data
const CryptoTradingServer = require('./src/server');
const axios = require('axios');

async function runLiveTradingDemo() {
  console.log('🎬 CRYPTOTRADER - LIVE DATA TRADING DEMO\n');
  console.log('='.repeat(50));
  console.log('📡 Using 100% REAL market data from CoinGecko API');
  
  let server = null;
  
  try {
    // Initialize the trading server
    console.log('🚀 1. INITIALIZING TRADING SERVER...');
    server = new CryptoTradingServer();
    await server.initialize();
    
    const portfolio = server.getPortfolio();
    
    console.log(`✅ Server ready! Starting portfolio: $${portfolio.balance_usd.toLocaleString()}`);
    console.log(`📊 Current positions: ${Object.keys(portfolio.positions).length}`);
    
    // Fetch REAL market data
    console.log('\n💰 2. FETCHING LIVE MARKET PRICES...');
    console.log('📡 Connecting to CoinGecko API...');
    
    const response = await axios.get('https://api.coingecko.com/api/v3/simple/price', {
      params: {
        ids: 'bitcoin,ethereum,solana,cardano',
        vs_currencies: 'usd',
        include_24hr_change: true,
        include_24hr_vol: true,
        include_market_cap: true
      }
    });
    
    const marketPrices = response.data;
    
    // Display REAL market overview
    console.log('📈 LIVE Market Prices:');
    Object.entries(marketPrices).forEach(([coin, data]) => {
      const trend = data.usd_24h_change > 0 ? '📈' : '📉';
      const changeColor = data.usd_24h_change > 0 ? '+' : '';
      console.log(`   ${trend} ${coin.toUpperCase()}: $${data.usd.toLocaleString()} (${changeColor}${data.usd_24h_change.toFixed(2)}%)`);
      console.log(`       💰 Market Cap: $${(data.usd_market_cap / 1e9).toFixed(1)}B`);
      console.log(`       📊 Volume 24h: $${(data.usd_24h_vol / 1e9).toFixed(1)}B`);
    });
    
    // REAL Trading Scenario 1: Buy Bitcoin at LIVE price
    console.log('\n💰 3. LIVE TRADING SCENARIO 1: BUYING BITCOIN');
    const btcInvestment = 1000;
    const btcLivePrice = marketPrices.bitcoin.usd;
    const btcQuantity = btcInvestment / btcLivePrice;
    
    console.log(`🛒 Buying $${btcInvestment} worth of Bitcoin at LIVE price...`);
    console.log(`   📊 LIVE Price: $${btcLivePrice.toLocaleString()}`);
    console.log(`   📈 24h Change: ${marketPrices.bitcoin.usd_24h_change >= 0 ? '+' : ''}${marketPrices.bitcoin.usd_24h_change.toFixed(2)}%`);
    console.log(`   🪙 Quantity: ${btcQuantity.toFixed(8)} BTC`);
    
    // Execute the trade with REAL data
    portfolio.balance_usd -= btcInvestment;
    portfolio.positions['bitcoin'] = {
      quantity: btcQuantity,
      avg_price: btcLivePrice,
      invested: btcInvestment,
      created_at: new Date().toISOString(),
      market_data: {
        market_cap: marketPrices.bitcoin.usd_market_cap,
        volume_24h: marketPrices.bitcoin.usd_24h_vol,
        change_24h: marketPrices.bitcoin.usd_24h_change
      }
    };
    
    console.log(`✅ LIVE Trade executed! New balance: $${portfolio.balance_usd.toLocaleString()}`);
    
    // REAL Trading Scenario 2: Buy Ethereum at LIVE price
    console.log('\n🔷 4. LIVE TRADING SCENARIO 2: BUYING ETHEREUM');
    const ethInvestment = 800;
    const ethLivePrice = marketPrices.ethereum.usd;
    const ethQuantity = ethInvestment / ethLivePrice;
    
    console.log(`🛒 Buying $${ethInvestment} worth of Ethereum at LIVE price...`);
    console.log(`   📊 LIVE Price: $${ethLivePrice.toLocaleString()}`);
    console.log(`   📈 24h Change: ${marketPrices.ethereum.usd_24h_change >= 0 ? '+' : ''}${marketPrices.ethereum.usd_24h_change.toFixed(2)}%`);
    console.log(`   🪙 Quantity: ${ethQuantity.toFixed(6)} ETH`);
    
    portfolio.balance_usd -= ethInvestment;
    portfolio.positions['ethereum'] = {
      quantity: ethQuantity,
      avg_price: ethLivePrice,
      invested: ethInvestment,
      created_at: new Date().toISOString(),
      market_data: {
        market_cap: marketPrices.ethereum.usd_market_cap,
        volume_24h: marketPrices.ethereum.usd_24h_vol,
        change_24h: marketPrices.ethereum.usd_24h_change
      }
    };
    
    console.log(`✅ LIVE Trade executed! New balance: $${portfolio.balance_usd.toLocaleString()}`);
    
    // Show REAL portfolio with LIVE market values
    console.log('\n📊 5. LIVE PORTFOLIO STATUS');
    console.log('='.repeat(40));
    console.log(`💵 Cash Balance: $${portfolio.balance_usd.toLocaleString()}`);
    console.log(`📈 Active Positions: ${Object.keys(portfolio.positions).length}`);
    
    let totalInvested = 0;
    let currentValue = 0;
    
    console.log('\n🏆 LIVE POSITIONS:');
    Object.entries(portfolio.positions).forEach(([coin, position]) => {
      const livePrice = marketPrices[coin].usd;
      const positionValue = position.quantity * livePrice;
      const pnl = positionValue - position.invested;
      const pnlPercent = (pnl / position.invested) * 100;
      
      totalInvested += position.invested;
      currentValue += positionValue;
      
      const trend = pnl > 0 ? '📈' : '📉';
      const pnlColor = pnl > 0 ? '+' : '';
      
      console.log(`   ${trend} ${coin.toUpperCase()}: ${position.quantity.toFixed(8)} coins`);
      console.log(`      💰 Invested: $${position.invested.toLocaleString()}`);
      console.log(`      📊 LIVE Value: $${positionValue.toLocaleString()}`);
      console.log(`      💸 LIVE P&L: ${pnlColor}$${pnl.toFixed(2)} (${pnlColor}${pnlPercent.toFixed(1)}%)`);
      console.log(`      📈 24h Change: ${position.market_data.change_24h >= 0 ? '+' : ''}${position.market_data.change_24h.toFixed(2)}%`);
    });
    
    const totalPortfolioValue = portfolio.balance_usd + currentValue;
    const totalPnL = currentValue - totalInvested;
    const totalROI = (totalPnL / totalInvested) * 100;
    
    console.log('\n💎 LIVE PORTFOLIO SUMMARY:');
    console.log(`   🏦 Total Portfolio Value: $${totalPortfolioValue.toLocaleString()}`);
    console.log(`   📊 Total Invested in Positions: $${totalInvested.toLocaleString()}`);
    console.log(`   💰 Cash Available: $${portfolio.balance_usd.toLocaleString()}`);
    console.log(`   🎯 LIVE P&L: ${totalPnL >= 0 ? '+' : ''}$${totalPnL.toFixed(2)} (${totalROI >= 0 ? '+' : ''}${totalROI.toFixed(2)}% ROI)`);
    
    // LIVE market analysis
    console.log('\n📈 6. LIVE MARKET ANALYSIS');
    console.log('='.repeat(40));
    
    const totalMarketCap = Object.values(marketPrices).reduce((sum, coin) => sum + coin.usd_market_cap, 0);
    const avgChange = Object.values(marketPrices).reduce((sum, coin) => sum + coin.usd_24h_change, 0) / 4;
    
    console.log(`💰 Combined Market Cap: $${(totalMarketCap / 1e12).toFixed(2)}T`);
    console.log(`📊 Average 24h Change: ${avgChange >= 0 ? '+' : ''}${avgChange.toFixed(2)}%`);
    
    const gainers = Object.entries(marketPrices)
      .filter(([coin, data]) => data.usd_24h_change > 0)
      .sort((a, b) => b[1].usd_24h_change - a[1].usd_24h_change);
      
    const losers = Object.entries(marketPrices)
      .filter(([coin, data]) => data.usd_24h_change < 0)
      .sort((a, b) => a[1].usd_24h_change - b[1].usd_24h_change);
    
    if (gainers.length > 0) {
      console.log('\n🚀 LIVE Top Gainers:');
      gainers.forEach(([coin, data]) => {
        console.log(`   📈 ${coin.toUpperCase()}: +${data.usd_24h_change.toFixed(2)}%`);
      });
    }
    
    if (losers.length > 0) {
      console.log('\n📉 LIVE Top Losers:');
      losers.forEach(([coin, data]) => {
        console.log(`   📉 ${coin.toUpperCase()}: ${data.usd_24h_change.toFixed(2)}%`);
      });
    }
    
    // LIVE trading recommendations
    console.log('\n🤔 7. LIVE TRADING RECOMMENDATIONS');
    console.log('='.repeat(40));
    
    if (avgChange > 2) {
      console.log('💡 Market is bullish today - consider taking profits on winners');
    } else if (avgChange < -2) {
      console.log('💡 Market is bearish today - potential buying opportunities');  
    } else {
      console.log('💡 Market is neutral today - good for selective trading');
    }
    
    // Show highest volume opportunities
    const highestVolume = Object.entries(marketPrices)
      .sort((a, b) => b[1].usd_24h_vol - a[1].usd_24h_vol)[0];
      
    console.log(`🔥 Highest Volume: ${highestVolume[0].toUpperCase()} ($${(highestVolume[1].usd_24h_vol / 1e9).toFixed(1)}B)`);
    console.log('   💡 High volume = high liquidity for trading');
    
    console.log('\n🎉 LIVE TRADING DEMO COMPLETED!');
    console.log('📊 This demo used 100% REAL market data from CoinGecko API');
    console.log('✅ All prices, volumes, and market caps were live at time of execution');
    console.log(`⏰ Demo completed at: ${new Date().toLocaleString()}`);
    
  } catch (error) {
    if (error.response) {
      console.log('❌ API Error:', error.response.status, error.response.statusText);
      console.log('💡 This might be due to API rate limits or network issues');
    } else {
      console.log('❌ Demo error:', error.message);
    }
  } finally {
    if (server) {
      await server.shutdown();
    }
  }
}

// Run the LIVE demo
if (require.main === module) {
  runLiveTradingDemo().catch(console.error);
}

module.exports = { runLiveTradingDemo };