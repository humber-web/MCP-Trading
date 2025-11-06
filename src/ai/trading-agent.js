// src/ai/trading-agent.js

const axios = require('axios');

/**
 * AI Trading Agent
 * Autonomously analyzes market and executes trades based on technical analysis
 *
 * This agent:
 * - Analyzes market conditions every N hours
 * - Uses technical indicators (RSI, MACD, sentiment)
 * - Makes buy/sell decisions automatically
 * - Explains every decision in plain English
 * - Tracks performance and learning
 *
 * Perfect for beginners: Set it and forget it!
 */
class TradingAgent {
  constructor(config = {}) {
    this.pricesManager = config.pricesManager;
    this.toolsHandler = config.toolsHandler;
    this.portfolio = config.portfolio;
    this.storage = config.storage;
    this.notifier = config.notifier;

    // Trading strategy configuration
    this.strategy = config.strategy || 'BALANCED'; // CONSERVATIVE, BALANCED, AGGRESSIVE
    this.enabled = config.enabled !== false;
    this.checkInterval = config.checkInterval || 6 * 60 * 60 * 1000; // 6 hours

    // Risk management per strategy
    this.strategyConfig = {
      CONSERVATIVE: {
        maxPositionSize: 0.10,      // 10% per trade
        stopLossPercent: 0.03,      // 3% stop-loss
        takeProfitPercent: 0.08,    // 8% take-profit
        minRSI: 30,                 // Buy when oversold
        maxRSI: 65,                 // Don't buy if overbought
        fearGreedBuyMax: 40,        // Buy in fear
        fearGreedSellMin: 70,       // Sell in greed
        maxConcurrentPositions: 2,  // Max 2 cryptos
        tradingFrequency: 'low'     // Less frequent trades
      },
      BALANCED: {
        maxPositionSize: 0.15,      // 15% per trade
        stopLossPercent: 0.05,      // 5% stop-loss
        takeProfitPercent: 0.12,    // 12% take-profit
        minRSI: 35,
        maxRSI: 70,
        fearGreedBuyMax: 50,
        fearGreedSellMin: 65,
        maxConcurrentPositions: 3,
        tradingFrequency: 'medium'
      },
      AGGRESSIVE: {
        maxPositionSize: 0.20,      // 20% per trade
        stopLossPercent: 0.07,      // 7% stop-loss
        takeProfitPercent: 0.18,    // 18% take-profit
        minRSI: 40,
        maxRSI: 75,
        fearGreedBuyMax: 60,
        fearGreedSellMin: 60,
        maxConcurrentPositions: 4,
        tradingFrequency: 'high'
      }
    };

    this.currentConfig = this.strategyConfig[this.strategy];

    // Agent state
    this.isRunning = false;
    this.lastAnalysis = null;
    this.analysisHistory = [];
    this.intervalId = null;

    // Supported coins for analysis
    this.watchlist = config.watchlist || [
      'bitcoin',
      'ethereum',
      'solana',
      'cardano',
      'matic-network', // Polygon (was 'polygon', but correct ID is 'matic-network')
      'avalanche-2'
    ];
  }

  /**
   * Start the trading agent
   */
  async start() {
    if (this.isRunning) {
      console.log('⚠️  Trading Agent already running');
      return;
    }

    console.log(`\n🤖 Starting AI Trading Agent`);
    console.log(`📊 Strategy: ${this.strategy}`);
    console.log(`⏰ Check interval: ${this.checkInterval / (60 * 60 * 1000)} hours`);
    console.log(`💰 Max position size: ${(this.currentConfig.maxPositionSize * 100).toFixed(0)}%`);
    console.log(`🛡️ Stop-loss: ${(this.currentConfig.stopLossPercent * 100).toFixed(0)}%`);
    console.log(`🎯 Take-profit: ${(this.currentConfig.takeProfitPercent * 100).toFixed(0)}%\n`);

    this.isRunning = true;

    // Run initial analysis immediately
    await this.analyze();

    // Schedule periodic analysis
    this.intervalId = setInterval(() => {
      this.analyze().catch(error => {
        console.error('❌ Error in trading agent analysis:', error.message);
      });
    }, this.checkInterval);

    console.log('✅ AI Trading Agent started successfully');
  }

  /**
   * Stop the trading agent
   */
  stop() {
    if (!this.isRunning) {
      return;
    }

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.isRunning = false;
    console.log('🛑 AI Trading Agent stopped');
  }

  /**
   * Main analysis and trading logic
   */
  async analyze() {
    const analysisStart = Date.now();
    console.log(`\n\n🤖 AI Trading Agent - Starting Analysis`);
    console.log(`⏰ ${new Date().toLocaleString()}\n`);

    try {
      const analysis = {
        timestamp: new Date().toISOString(),
        marketConditions: null,
        opportunities: [],
        decisions: [],
        portfolioSnapshot: {
          balance: this.portfolio.balance_usd,
          totalValue: this.portfolio.total_value,
          positions: Object.keys(this.portfolio.positions).length
        }
      };

      // Step 1: Analyze market sentiment
      analysis.marketConditions = await this.analyzeMarketConditions();

      // Wait 10 seconds before scanning to avoid rate limits
      console.log('   ⏳ Waiting 10 seconds before scanning opportunities (rate limit protection)...\n');
      await new Promise(resolve => setTimeout(resolve, 10000));

      // Step 2: Scan for opportunities
      analysis.opportunities = await this.scanForOpportunities();

      // Step 3: Review existing positions
      await this.reviewExistingPositions(analysis);

      // Step 4: Execute new trades if opportunities found
      if (analysis.opportunities.length > 0) {
        await this.executeOpportunities(analysis);
      }

      // Step 5: Log analysis
      this.lastAnalysis = analysis;
      this.analysisHistory.push(analysis);
      await this.storage.saveAnalysis(analysis);

      // Step 6: Send notification if configured
      if (this.notifier && this.notifier.isEnabled()) {
        await this.sendAnalysisSummary(analysis);
      }

      const duration = Date.now() - analysisStart;
      console.log(`\n✅ Analysis completed in ${(duration / 1000).toFixed(1)}s`);
      console.log(`📊 Opportunities found: ${analysis.opportunities.length}`);
      console.log(`📋 Decisions made: ${analysis.decisions.length}\n`);

      return analysis;
    } catch (error) {
      console.error('❌ Error in AI analysis:', error.message);
      throw error;
    }
  }

  /**
   * Analyze overall market conditions
   */
  async analyzeMarketConditions() {
    console.log('📊 Analyzing market conditions...');

    try {
      // Get Fear & Greed Index
      const sentimentResponse = await axios.get('https://api.alternative.me/fng/', {
        timeout: 10000
      });

      const fearGreed = parseInt(sentimentResponse.data.data[0].value);
      const fearGreedClass = sentimentResponse.data.data[0].value_classification;

      console.log(`   😨 Fear & Greed Index: ${fearGreed}/100 (${fearGreedClass})`);

      // Analyze top coins for market trend
      const topCoins = ['bitcoin', 'ethereum', 'solana'];
      let avgChange24h = 0;
      let positiveCount = 0;

      for (const coin of topCoins) {
        const priceData = await this.pricesManager.getCurrentPrice(coin);
        if (priceData.price_change_24h) {
          avgChange24h += priceData.price_change_24h;
          if (priceData.price_change_24h > 0) positiveCount++;
        }
      }

      avgChange24h = avgChange24h / topCoins.length;
      const marketTrend = avgChange24h > 2 ? 'BULLISH' : avgChange24h < -2 ? 'BEARISH' : 'NEUTRAL';

      console.log(`   📈 Market 24h change: ${avgChange24h > 0 ? '+' : ''}${avgChange24h.toFixed(2)}% (${marketTrend})`);
      console.log(`   ✅ ${positiveCount}/${topCoins.length} top coins positive\n`);

      return {
        fearGreedIndex: fearGreed,
        fearGreedClass,
        marketTrend,
        avgChange24h,
        positiveCoinRatio: positiveCount / topCoins.length
      };
    } catch (error) {
      console.error('   ⚠️  Error analyzing market conditions:', error.message);
      return {
        fearGreedIndex: 50,
        fearGreedClass: 'Neutral',
        marketTrend: 'NEUTRAL',
        avgChange24h: 0,
        positiveCoinRatio: 0.5
      };
    }
  }

  /**
   * Scan watchlist for trading opportunities
   */
  async scanForOpportunities() {
    console.log('🔍 Scanning for opportunities...\n');

    const opportunities = [];
    const currentPositions = Object.keys(this.portfolio.positions).length;
    const maxPositions = this.currentConfig.maxConcurrentPositions;

    // Don't look for new positions if we're at max
    if (currentPositions >= maxPositions) {
      console.log(`   ⚠️  Already at max positions (${currentPositions}/${maxPositions})`);
      console.log(`   ⏸️  Skipping new opportunities scan\n`);
      return [];
    }

    for (const coin of this.watchlist) {
      // Skip if we already have a position
      if (this.portfolio.positions[coin]) {
        console.log(`   ⏭️  ${coin.toUpperCase()}: Already have position, skipping`);
        continue;
      }

      try {
        const analysis = await this.toolsHandler.analyzeCoin(coin, 7);

        // Validate analysis structure
        if (!analysis || !analysis.analysis || !analysis.analysis.indicators) {
          console.error(`   ⚠️  ${coin.toUpperCase()}: Invalid analysis data (missing indicators)`);
          // Add delay even on error to avoid rate limits
          await new Promise(resolve => setTimeout(resolve, 10000));
          continue;
        }

        const opportunity = this.evaluateBuyOpportunity(coin, analysis);

        if (opportunity) {
          opportunities.push(opportunity);
          console.log(`   ✅ ${coin.toUpperCase()}: BUY OPPORTUNITY FOUND`);
          console.log(`       Score: ${opportunity.score}/100`);
          console.log(`       Reason: ${opportunity.reason}\n`);
        } else {
          const rsi = analysis.analysis.indicators.rsi || 0;
          console.log(`   ❌ ${coin.toUpperCase()}: No opportunity (RSI: ${rsi.toFixed(1)})\n`);
        }

        // Add delay between coin analyses to avoid rate limits (10 seconds)
        if (this.watchlist.indexOf(coin) < this.watchlist.length - 1) {
          console.log(`   ⏳ Waiting 10 seconds before next coin analysis...\n`);
          await new Promise(resolve => setTimeout(resolve, 10000));
        }
      } catch (error) {
        console.error(`   ⚠️  Error analyzing ${coin}:`, error.message);
        // Add delay even on error to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 10000));
      }
    }

    // Sort by score
    opportunities.sort((a, b) => b.score - a.score);

    return opportunities;
  }

  /**
   * Evaluate if coin is a buy opportunity
   */
  evaluateBuyOpportunity(coin, analysis) {
    // Safety checks
    if (!analysis?.analysis?.indicators) {
      return null;
    }

    const indicators = analysis.analysis.indicators;
    const price = analysis.current_price?.price;
    const rsi = indicators.rsi;
    const macdTrend = indicators.macd_histogram > 0 ? 'BULLISH' : 'BEARISH';

    // Validate required indicators
    if (typeof rsi !== 'number' || !price) {
      console.error(`   ⚠️  ${coin.toUpperCase()}: Missing required indicators (RSI or price)`);
      return null;
    }

    let score = 50; // Base score
    const reasons = [];

    // RSI analysis
    if (rsi < this.currentConfig.minRSI) {
      return null; // Too oversold, might drop more
    } else if (rsi > this.currentConfig.maxRSI) {
      return null; // Overbought, don't buy
    } else if (rsi < 40) {
      score += 20;
      reasons.push('Oversold (good entry)');
    } else if (rsi < 50) {
      score += 10;
      reasons.push('Below neutral RSI');
    }

    // MACD analysis
    if (macdTrend === 'BULLISH') {
      score += 15;
      reasons.push('MACD bullish');
    }

    // Trend analysis
    const trend = analysis.analysis.trend_analysis?.trend;
    if (trend === 'UPTREND') {
      score += 15;
      reasons.push('In uptrend');
    } else if (trend === 'DOWNTREND') {
      score -= 10;
      reasons.push('In downtrend');
    }

    // 24h change
    if (analysis.current_price.price_change_24h < -3) {
      score += 10;
      reasons.push('Recent dip (potential bounce)');
    }

    // Minimum score to consider
    if (score < 60) {
      return null;
    }

    return {
      coin,
      action: 'BUY',
      score,
      reason: reasons.join(', '),
      price,
      indicators: {
        rsi: rsi.toFixed(1),
        macd: macdTrend,
        trend
      }
    };
  }

  /**
   * Review existing positions for sell signals
   */
  async reviewExistingPositions(analysis) {
    console.log('📊 Reviewing existing positions...\n');

    const positions = Object.entries(this.portfolio.positions);

    if (positions.length === 0) {
      console.log('   📭 No open positions\n');
      return;
    }

    for (const [coin, position] of positions) {
      try {
        const coinAnalysis = await this.toolsHandler.analyzeCoin(coin, 7);
        const sellSignal = this.evaluateSellSignal(coin, position, coinAnalysis);

        if (sellSignal) {
          console.log(`   🔴 ${coin.toUpperCase()}: SELL SIGNAL`);
          console.log(`       Reason: ${sellSignal.reason}`);
          console.log(`       Current P&L: ${sellSignal.pnl > 0 ? '+' : ''}${sellSignal.pnl.toFixed(2)}%\n`);

          analysis.decisions.push({
            type: 'SELL',
            coin,
            reason: sellSignal.reason,
            pnl: sellSignal.pnl
          });
        } else {
          const currentPrice = coinAnalysis.current_price.price;
          const pnl = ((currentPrice - position.avg_price) / position.avg_price * 100);
          console.log(`   ✅ ${coin.toUpperCase()}: Hold (P&L: ${pnl > 0 ? '+' : ''}${pnl.toFixed(2)}%)\n`);
        }
      } catch (error) {
        console.error(`   ⚠️  Error reviewing ${coin}:`, error.message);
      }
    }
  }

  /**
   * Evaluate if position should be sold
   */
  evaluateSellSignal(coin, position, analysis) {
    const currentPrice = analysis.current_price.price;
    const pnl = ((currentPrice - position.avg_price) / position.avg_price * 100);
    const rsi = analysis.analysis.indicators.rsi;

    // Check if take-profit or stop-loss already set
    if (position.take_profit || position.stop_loss) {
      return null; // OrderManager will handle these
    }

    // RSI overbought
    if (rsi > 75 && pnl > 5) {
      return {
        coin,
        reason: 'Overbought RSI + profitable',
        pnl
      };
    }

    // Trend reversal
    const trend = analysis.analysis.trend_analysis.trend;
    if (trend === 'DOWNTREND' && pnl > 3) {
      return {
        coin,
        reason: 'Downtrend detected, take profit',
        pnl
      };
    }

    // Manual trailing stop (if no automatic stop-loss)
    if (pnl < -8) {
      return {
        coin,
        reason: 'Manual stop-loss (-8%)',
        pnl
      };
    }

    return null;
  }

  /**
   * Execute buy opportunities
   */
  async executeOpportunities(analysis) {
    const maxNewTrades = this.currentConfig.maxConcurrentPositions - Object.keys(this.portfolio.positions).length;
    const tradesToExecute = analysis.opportunities.slice(0, maxNewTrades);

    console.log(`\n💰 Executing trades (${tradesToExecute.length} opportunities)...\n`);

    for (const opp of tradesToExecute) {
      try {
        const amountUsd = this.portfolio.balance_usd * this.currentConfig.maxPositionSize;

        if (amountUsd < 100) {
          console.log(`   ⚠️  Insufficient balance for ${opp.coin}`);
          continue;
        }

        // Calculate stop-loss and take-profit
        const stopLoss = opp.price * (1 - this.currentConfig.stopLossPercent);
        const takeProfit = opp.price * (1 + this.currentConfig.takeProfitPercent);

        console.log(`   🟢 BUYING ${opp.coin.toUpperCase()}`);
        console.log(`       Amount: $${amountUsd.toFixed(2)}`);
        console.log(`       Price: $${opp.price.toFixed(2)}`);
        console.log(`       Stop-Loss: $${stopLoss.toFixed(2)}`);
        console.log(`       Take-Profit: $${takeProfit.toFixed(2)}`);
        console.log(`       Reason: ${opp.reason}\n`);

        await this.toolsHandler.buyCrypto(
          opp.coin,
          amountUsd,
          stopLoss,
          takeProfit
        );

        analysis.decisions.push({
          type: 'BUY',
          coin: opp.coin,
          amount: amountUsd,
          price: opp.price,
          stopLoss,
          takeProfit,
          reason: opp.reason,
          score: opp.score
        });

        // Send notification
        if (this.notifier && this.notifier.isEnabled()) {
          const quantity = amountUsd / opp.price;
          await this.notifier.notifyBuy(
            opp.coin,
            quantity,
            opp.price,
            amountUsd,
            stopLoss,
            takeProfit
          );
        }
      } catch (error) {
        console.error(`   ❌ Error executing buy for ${opp.coin}:`, error.message);
      }
    }
  }

  /**
   * Send analysis summary via notification
   */
  async sendAnalysisSummary(analysis) {
    if (!this.notifier || !this.notifier.isEnabled()) {
      return;
    }

    const marketEmoji = analysis.marketConditions.marketTrend === 'BULLISH' ? '📈' :
                        analysis.marketConditions.marketTrend === 'BEARISH' ? '📉' : '➖';

    const message = `
🤖 *AI Trading Agent Report*

${marketEmoji} Market: ${analysis.marketConditions.marketTrend}
😨 Fear & Greed: ${analysis.marketConditions.fearGreedIndex}/100

💼 Portfolio:
  • Balance: $${analysis.portfolioSnapshot.balance.toFixed(2)}
  • Positions: ${analysis.portfolioSnapshot.positions}

📊 Analysis Results:
  • Opportunities found: ${analysis.opportunities.length}
  • Trades executed: ${analysis.decisions.filter(d => d.type === 'BUY').length}

⏰ ${new Date().toLocaleString()}
    `.trim();

    await this.notifier.sendMessage(message);
  }

  /**
   * Get agent status
   */
  getStatus() {
    return {
      enabled: this.enabled,
      running: this.isRunning,
      strategy: this.strategy,
      checkInterval: this.checkInterval,
      lastAnalysis: this.lastAnalysis?.timestamp || null,
      totalAnalyses: this.analysisHistory.length,
      config: this.currentConfig
    };
  }

  /**
   * Get performance statistics
   */
  getPerformance() {
    return {
      totalAnalyses: this.analysisHistory.length,
      totalDecisions: this.analysisHistory.reduce((sum, a) => sum + a.decisions.length, 0),
      recentAnalyses: this.analysisHistory.slice(-5).map(a => ({
        timestamp: a.timestamp,
        opportunities: a.opportunities.length,
        decisions: a.decisions.length
      }))
    };
  }
}

module.exports = TradingAgent;
