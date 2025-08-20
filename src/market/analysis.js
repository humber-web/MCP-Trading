// src/market/analysis.js
const axios = require('axios');
const config = require('../utils/config');
const Formatter = require('../utils/formatter');

class MarketAnalysis {
  constructor(dependencies) {
    this.cache = dependencies.cache;
    this.storage = dependencies.storage;
    this.pricesManager = dependencies.pricesManager;
    this.sentimentManager = dependencies.sentimentManager;
    this.stats = dependencies.stats || { api_calls: 0 };
    
    // Configuração de análise técnica
    this.technicalConfig = {
      sma_periods: [7, 21, 50],
      rsi_period: 14,
      macd_fast: 12,
      macd_slow: 26,
      macd_signal: 9,
      bollinger_period: 20,
      bollinger_std: 2
    };
  }

  // ANÁLISE COMPLETA DE UMA CRYPTO

  async analyzeCoin(coin, days = 30) {
    const cacheKey = `full_analysis_${coin}_${days}`;
    let cached = this.cache.getAnalysis(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      console.error(`🔍 Analisando ${coin} (${days} dias)...`);
      
      // Obter dados históricos
      const priceHistory = await this.getPriceHistory(coin, days);
      const currentPrice = await this.pricesManager.getCurrentPrice(coin);
      
      // Calcular indicadores técnicos
      const technicalIndicators = this.calculateTechnicalIndicators(priceHistory.prices);
      
      // Análise de tendência
      const trendAnalysis = this.analyzeTrend(priceHistory.prices);
      
      // Análise de volume
      const volumeAnalysis = this.analyzeVolume(priceHistory.volumes);
      
      // Análise de volatilidade
      const volatilityAnalysis = this.analyzeVolatility(priceHistory.prices);
      
      // Sinais de trading
      const tradingSignals = this.generateTradingSignals(technicalIndicators, trendAnalysis);
      
      // Níveis de suporte e resistência
      const supportResistance = this.calculateSupportResistance(priceHistory.prices);
      
      // Análise de momentum
      const momentum = this.analyzeMomentum(priceHistory.prices, priceHistory.volumes);
      
      // Score geral
      const overallScore = this.calculateOverallScore(technicalIndicators, trendAnalysis, tradingSignals);
      
      const analysis = {
        coin: coin,
        coin_name: Formatter.formatCoinName(coin),
        period_days: days,
        timestamp: Formatter.getTimestamp(),
        
        current_data: {
          price: currentPrice.price,
          price_formatted: Formatter.formatPrice(currentPrice.price),
          change_24h: currentPrice.change_24h || 0,
          change_formatted: Formatter.formatPriceChange(currentPrice.change_24h || 0)
        },
        
        technical_indicators: technicalIndicators,
        trend_analysis: trendAnalysis,
        volume_analysis: volumeAnalysis,
        volatility_analysis: volatilityAnalysis,
        support_resistance: supportResistance,
        momentum_analysis: momentum,
        trading_signals: tradingSignals,
        
        overall_assessment: {
          score: overallScore,
          rating: this.scoreToRating(overallScore),
          recommendation: this.generateRecommendation(overallScore, tradingSignals),
          confidence: this.calculateConfidence(technicalIndicators, trendAnalysis)
        },
        
        risk_factors: this.identifyRiskFactors(volatilityAnalysis, technicalIndicators),
        entry_exit_points: this.suggestEntryExitPoints(currentPrice.price, supportResistance, tradingSignals)
      };

      this.cache.setAnalysis(cacheKey, analysis);
      return analysis;

    } catch (error) {
      throw new Error(`Erro na análise de ${coin}: ${error.message}`);
    }
  }

  // COMPARAÇÃO ENTRE MÚLTIPLAS CRYPTOS

  async compareCoins(coins, days = 7) {
    const cacheKey = `comparison_${coins.sort().join('_')}_${days}`;
    let cached = this.cache.getAnalysis(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      const analyses = [];
      
      for (const coin of coins) {
        try {
          const analysis = await this.analyzeCoin(coin, days);
          analyses.push({
            coin: coin,
            coin_name: analysis.coin_name,
            score: analysis.overall_assessment.score,
            rating: analysis.overall_assessment.rating,
            trend: analysis.trend_analysis.direction,
            momentum: analysis.momentum_analysis.strength,
            risk_level: analysis.volatility_analysis.risk_level,
            signals: analysis.trading_signals
          });
        } catch (error) {
          console.error(`⚠️ Erro na análise de ${coin}:`, error.message);
        }
      }

      // Ranking por score
      const ranked = analyses.sort((a, b) => b.score - a.score);
      
      // Análise comparativa
      const comparison = {
        timestamp: Formatter.getTimestamp(),
        period_days: days,
        coins_analyzed: analyses.length,
        
        ranking: ranked.map((coin, index) => ({
          rank: index + 1,
          ...coin
        })),
        
        summary: {
          best_performer: ranked[0],
          worst_performer: ranked[ranked.length - 1],
          average_score: analyses.reduce((sum, a) => sum + a.score, 0) / analyses.length,
          bullish_count: analyses.filter(a => a.trend === 'bullish').length,
          bearish_count: analyses.filter(a => a.trend === 'bearish').length,
          high_momentum: analyses.filter(a => a.momentum === 'strong').length
        },
        
        recommendations: this.generateComparativeRecommendations(analyses)
      };

      this.cache.setAnalysis(cacheKey, comparison);
      return comparison;

    } catch (error) {
      throw new Error(`Erro na comparação: ${error.message}`);
    }
  }

  // ANÁLISE DE MERCADO GERAL

  async analyzeMarket() {
    const cacheKey = 'market_analysis_full';
    let cached = this.cache.getMarket(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      // Análise das principais cryptos
      const majorCoins = ['bitcoin', 'ethereum', 'cardano', 'polkadot'];
      const coinAnalyses = await this.compareCoins(majorCoins, 7);
      
      // Sentimento do mercado
      const sentiment = await this.sentimentManager.getMarketSentiment();
      
      // Correlações
      const correlations = await this.calculateCorrelations(majorCoins);
      
      // Análise setorial
      const sectorAnalysis = this.analyzeSectors();
      
      const marketAnalysis = {
        timestamp: Formatter.getTimestamp(),
        
        overall_sentiment: sentiment.primary_indicator,
        market_phase: this.identifyMarketPhase(sentiment, coinAnalyses),
        
        leading_coins: coinAnalyses.ranking.slice(0, 3),
        lagging_coins: coinAnalyses.ranking.slice(-2),
        
        correlations: correlations,
        sector_analysis: sectorAnalysis,
        
        market_signals: {
          risk_on: this.assessRiskOnSentiment(coinAnalyses, sentiment),
          institutional_flow: this.assessInstitutionalFlow(coinAnalyses),
          retail_sentiment: sentiment.primary_indicator.classification
        },
        
        opportunities: this.identifyMarketOpportunities(coinAnalyses, sentiment),
        risks: this.identifyMarketRisks(coinAnalyses, sentiment),
        
        trading_environment: this.assessTradingEnvironment(coinAnalyses, sentiment)
      };

      this.cache.setMarket(cacheKey, marketAnalysis);
      return marketAnalysis;

    } catch (error) {
      throw new Error(`Erro na análise de mercado: ${error.message}`);
    }
  }

  // INDICADORES TÉCNICOS

  calculateTechnicalIndicators(prices) {
    const indicators = {};
    
    // Simple Moving Averages (SMA)
    indicators.sma = {};
    this.technicalConfig.sma_periods.forEach(period => {
      indicators.sma[`sma_${period}`] = this.calculateSMA(prices, period);
    });
    
    // Relative Strength Index (RSI)
    indicators.rsi = this.calculateRSI(prices, this.technicalConfig.rsi_period);
    
    // MACD
    indicators.macd = this.calculateMACD(prices);
    
    // Bollinger Bands
    indicators.bollinger = this.calculateBollingerBands(prices);
    
    // Moving Average Convergence
    indicators.ma_signals = this.analyzeMovingAverageSignals(indicators.sma);
    
    return indicators;
  }

  calculateSMA(prices, period) {
    if (prices.length < period) return null;
    
    const smaValues = [];
    for (let i = period - 1; i < prices.length; i++) {
      const sum = prices.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      smaValues.push(sum / period);
    }
    
    const current = smaValues[smaValues.length - 1];
    const previous = smaValues[smaValues.length - 2];
    
    return {
      current: current,
      previous: previous,
      trend: current > previous ? 'rising' : 'falling',
      price_position: prices[prices.length - 1] > current ? 'above' : 'below'
    };
  }

  calculateRSI(prices, period = 14) {
    if (prices.length < period + 1) return null;
    
    const changes = [];
    for (let i = 1; i < prices.length; i++) {
      changes.push(prices[i] - prices[i - 1]);
    }
    
    let avgGain = 0;
    let avgLoss = 0;
    
    // Initial averages
    for (let i = 0; i < period; i++) {
      if (changes[i] > 0) {
        avgGain += changes[i];
      } else {
        avgLoss += Math.abs(changes[i]);
      }
    }
    
    avgGain /= period;
    avgLoss /= period;
    
    // Calculate RSI for the most recent data
    const rs = avgGain / avgLoss;
    const rsi = 100 - (100 / (1 + rs));
    
    return {
      value: rsi,
      signal: rsi > 70 ? 'overbought' : rsi < 30 ? 'oversold' : 'neutral',
      strength: rsi > 80 || rsi < 20 ? 'strong' : rsi > 70 || rsi < 30 ? 'moderate' : 'weak'
    };
  }

  calculateMACD(prices, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
    if (prices.length < slowPeriod) return null;
    
    const emaFast = this.calculateEMA(prices, fastPeriod);
    const emaSlow = this.calculateEMA(prices, slowPeriod);
    
    if (!emaFast || !emaSlow) return null;
    
    const macdLine = emaFast.current - emaSlow.current;
    const macdPrevious = emaFast.previous - emaSlow.previous;
    
    return {
      macd_line: macdLine,
      signal: macdLine > macdPrevious ? 'bullish' : 'bearish',
      strength: Math.abs(macdLine - macdPrevious) > 0.1 ? 'strong' : 'weak',
      crossover: this.detectMACDCrossover(macdLine, macdPrevious)
    };
  }

  calculateEMA(prices, period) {
    if (prices.length < period) return null;
    
    const multiplier = 2 / (period + 1);
    let ema = prices.slice(0, period).reduce((a, b) => a + b) / period;
    let previousEma = ema;
    
    for (let i = period; i < prices.length; i++) {
      previousEma = ema;
      ema = (prices[i] - ema) * multiplier + ema;
    }
    
    return {
      current: ema,
      previous: previousEma
    };
  }

  calculateBollingerBands(prices, period = 20, stdDev = 2) {
    if (prices.length < period) return null;
    
    const sma = this.calculateSMA(prices, period);
    if (!sma) return null;
    
    // Calculate standard deviation
    const recentPrices = prices.slice(-period);
    const variance = recentPrices.reduce((sum, price) => {
      return sum + Math.pow(price - sma.current, 2);
    }, 0) / period;
    
    const standardDeviation = Math.sqrt(variance);
    
    const upperBand = sma.current + (standardDeviation * stdDev);
    const lowerBand = sma.current - (standardDeviation * stdDev);
    const currentPrice = prices[prices.length - 1];
    
    return {
      upper_band: upperBand,
      middle_band: sma.current,
      lower_band: lowerBand,
      bandwidth: ((upperBand - lowerBand) / sma.current) * 100,
      position: currentPrice > upperBand ? 'above_upper' : 
                currentPrice < lowerBand ? 'below_lower' : 'within_bands',
      squeeze: this.detectBollingerSqueeze(upperBand, lowerBand, sma.current)
    };
  }

  detectBollingerSqueeze(upper, lower, middle) {
    const bandwidth = ((upper - lower) / middle) * 100;
    return bandwidth < 10; // Threshold for squeeze detection
  }

  detectMACDCrossover(current, previous) {
    if (current > 0 && previous <= 0) return 'bullish_crossover';
    if (current < 0 && previous >= 0) return 'bearish_crossover';
    return 'no_crossover';
  }

  analyzeMovingAverageSignals(smaData) {
    const signals = [];
    const currentPrice = this.currentPrice; // Will be set during analysis
    
    // Golden Cross / Death Cross detection
    if (smaData.sma_7 && smaData.sma_21) {
      if (smaData.sma_7.current > smaData.sma_21.current && 
          smaData.sma_7.previous <= smaData.sma_21.previous) {
        signals.push({ type: 'golden_cross', strength: 'strong', description: 'SMA 7 crossed above SMA 21' });
      } else if (smaData.sma_7.current < smaData.sma_21.current && 
                 smaData.sma_7.previous >= smaData.sma_21.previous) {
        signals.push({ type: 'death_cross', strength: 'strong', description: 'SMA 7 crossed below SMA 21' });
      }
    }
    
    // Price vs MA signals
    Object.entries(smaData).forEach(([key, ma]) => {
      if (ma && ma.price_position === 'above' && ma.trend === 'rising') {
        signals.push({ type: 'bullish_ma', period: key, strength: 'moderate' });
      } else if (ma && ma.price_position === 'below' && ma.trend === 'falling') {
        signals.push({ type: 'bearish_ma', period: key, strength: 'moderate' });
      }
    });
    
    return signals;
  }

  // ANÁLISE DE TENDÊNCIA

  analyzeTrend(prices) {
    const shortTerm = this.calculateTrendStrength(prices.slice(-7)); // 7 days
    const mediumTerm = this.calculateTrendStrength(prices.slice(-21)); // 21 days
    const longTerm = this.calculateTrendStrength(prices.slice(-50)); // 50 days
    
    const overallTrend = this.determineOverallTrend(shortTerm, mediumTerm, longTerm);
    
    return {
      short_term: shortTerm,
      medium_term: mediumTerm,
      long_term: longTerm,
      overall: overallTrend,
      direction: overallTrend.direction,
      strength: overallTrend.strength,
      consistency: this.calculateTrendConsistency([shortTerm, mediumTerm, longTerm])
    };
  }

  calculateTrendStrength(prices) {
    if (prices.length < 3) return { direction: 'neutral', strength: 'weak' };
    
    const firstPrice = prices[0];
    const lastPrice = prices[prices.length - 1];
    const change = ((lastPrice - firstPrice) / firstPrice) * 100;
    
    let direction = 'neutral';
    if (change > 2) direction = 'bullish';
    else if (change < -2) direction = 'bearish';
    
    let strength = 'weak';
    const absChange = Math.abs(change);
    if (absChange > 15) strength = 'very_strong';
    else if (absChange > 10) strength = 'strong';
    else if (absChange > 5) strength = 'moderate';
    
    return {
      direction,
      strength,
      change_percent: change,
      duration_days: prices.length,
      volatility: this.calculateVolatility(prices).coefficient
    };
  }

  determineOverallTrend(short, medium, long) {
    const trends = [short, medium, long];
    const bullishCount = trends.filter(t => t.direction === 'bullish').length;
    const bearishCount = trends.filter(t => t.direction === 'bearish').length;
    
    let direction = 'neutral';
    let strength = 'weak';
    
    if (bullishCount >= 2) {
      direction = 'bullish';
      strength = bullishCount === 3 ? 'strong' : 'moderate';
    } else if (bearishCount >= 2) {
      direction = 'bearish';  
      strength = bearishCount === 3 ? 'strong' : 'moderate';
    }
    
    return { direction, strength };
  }

  calculateTrendConsistency(trends) {
    const directions = trends.map(t => t.direction);
    const uniqueDirections = [...new Set(directions)];
    
    if (uniqueDirections.length === 1) return 'very_consistent';
    if (uniqueDirections.length === 2) return 'moderately_consistent';
    return 'inconsistent';
  }

  // ANÁLISE DE VOLUME

  analyzeVolume(volumes) {
    if (!volumes || volumes.length < 7) {
      return { trend: 'unknown', strength: 'weak', note: 'Insufficient volume data' };
    }
    
    const recentVolume = volumes.slice(-7);
    const historicalVolume = volumes.slice(-30, -7);
    
    const avgRecent = recentVolume.reduce((a, b) => a + b, 0) / recentVolume.length;
    const avgHistorical = historicalVolume.length > 0 ? 
      historicalVolume.reduce((a, b) => a + b, 0) / historicalVolume.length : avgRecent;
    
    const volumeChange = ((avgRecent - avgHistorical) / avgHistorical) * 100;
    
    let trend = 'stable';
    let strength = 'weak';
    
    if (volumeChange > 20) {
      trend = 'increasing';
      strength = volumeChange > 50 ? 'strong' : 'moderate';
    } else if (volumeChange < -20) {
      trend = 'decreasing';
      strength = volumeChange < -50 ? 'strong' : 'moderate';
    }
    
    return {
      trend,
      strength,
      change_percent: volumeChange,
      avg_recent: avgRecent,
      avg_historical: avgHistorical,
      volume_spike: this.detectVolumeSpikes(volumes),
      formatted: {
        avg_recent: Formatter.formatNumber(avgRecent),
        avg_historical: Formatter.formatNumber(avgHistorical)
      }
    };
  }

  detectVolumeSpikes(volumes) {
    if (volumes.length < 10) return [];
    
    const avgVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length;
    const spikes = [];
    
    volumes.forEach((volume, index) => {
      if (volume > avgVolume * 2) {
        spikes.push({
          index,
          volume,
          multiplier: volume / avgVolume,
          significance: volume > avgVolume * 3 ? 'high' : 'moderate'
        });
      }
    });
    
    return spikes;
  }

  // ANÁLISE DE VOLATILIDADE

  analyzeVolatility(prices) {
    const volatility = this.calculateVolatility(prices);
    
    let riskLevel = 'low';
    if (volatility.coefficient > 15) riskLevel = 'very_high';
    else if (volatility.coefficient > 10) riskLevel = 'high';
    else if (volatility.coefficient > 5) riskLevel = 'moderate';
    
    return {
      coefficient: volatility.coefficient,
      standard_deviation: volatility.standardDeviation,
      risk_level: riskLevel,
      classification: this.classifyVolatility(volatility.coefficient),
      recent_trend: this.analyzeVolatilityTrend(prices)
    };
  }

  calculateVolatility(prices) {
    if (prices.length < 2) return { coefficient: 0, standardDeviation: 0 };
    
    const returns = [];
    for (let i = 1; i < prices.length; i++) {
      returns.push((prices[i] - prices[i-1]) / prices[i-1]);
    }
    
    const meanReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - meanReturn, 2), 0) / returns.length;
    const standardDeviation = Math.sqrt(variance);
    
    return {
      coefficient: standardDeviation * 100,
      standardDeviation: standardDeviation
    };
  }

  classifyVolatility(coefficient) {
    if (coefficient > 20) return 'extremely_volatile';
    if (coefficient > 15) return 'very_volatile';
    if (coefficient > 10) return 'volatile';
    if (coefficient > 5) return 'moderately_volatile';
    return 'stable';
  }

  analyzeVolatilityTrend(prices) {
    if (prices.length < 20) return 'insufficient_data';
    
    const recent = this.calculateVolatility(prices.slice(-10));
    const historical = this.calculateVolatility(prices.slice(-20, -10));
    
    const change = recent.coefficient - historical.coefficient;
    
    if (change > 2) return 'increasing';
    if (change < -2) return 'decreasing';
    return 'stable';
  }

  // SUPORTE E RESISTÊNCIA

  calculateSupportResistance(prices) {
    const highs = this.findLocalExtremes(prices, 'high');
    const lows = this.findLocalExtremes(prices, 'low');
    
    const supportLevels = this.identifyKeyLevels(lows, 'support');
    const resistanceLevels = this.identifyKeyLevels(highs, 'resistance');
    
    const currentPrice = prices[prices.length - 1];
    
    return {
      support_levels: supportLevels,
      resistance_levels: resistanceLevels,
      nearest_support: this.findNearestLevel(currentPrice, supportLevels, 'below'),
      nearest_resistance: this.findNearestLevel(currentPrice, resistanceLevels, 'above'),
      key_levels: this.identifyKeyPsychologicalLevels(currentPrice)
    };
  }

  findLocalExtremes(prices, type) {
    const extremes = [];
    const window = 3; // Look at 3 periods on each side
    
    for (let i = window; i < prices.length - window; i++) {
      const subset = prices.slice(i - window, i + window + 1);
      const currentPrice = prices[i];
      
      if (type === 'high' && currentPrice === Math.max(...subset)) {
        extremes.push({ price: currentPrice, index: i });
      } else if (type === 'low' && currentPrice === Math.min(...subset)) {
        extremes.push({ price: currentPrice, index: i });
      }
    }
    
    return extremes;
  }

  identifyKeyLevels(extremes, type) {
    if (extremes.length < 2) return [];
    
    // Group similar price levels
    const tolerance = 0.02; // 2% tolerance
    const groups = [];
    
    extremes.forEach(extreme => {
      let addedToGroup = false;
      
      for (let group of groups) {
        const avgPrice = group.reduce((sum, item) => sum + item.price, 0) / group.length;
        if (Math.abs(extreme.price - avgPrice) / avgPrice < tolerance) {
          group.push(extreme);
          addedToGroup = true;
          break;
        }
      }
      
      if (!addedToGroup) {
        groups.push([extreme]);
      }
    });
    
    // Return groups with 2+ touches (more significant levels)
    return groups
      .filter(group => group.length >= 2)
      .map(group => ({
        price: group.reduce((sum, item) => sum + item.price, 0) / group.length,
        touches: group.length,
        strength: group.length >= 3 ? 'strong' : 'moderate',
        type: type
      }))
      .sort((a, b) => b.touches - a.touches)
      .slice(0, 3); // Top 3 levels
  }

  findNearestLevel(currentPrice, levels, direction) {
    const filtered = levels.filter(level => 
      direction === 'above' ? level.price > currentPrice : level.price < currentPrice
    );
    
    if (filtered.length === 0) return null;
    
    return filtered.reduce((nearest, level) => {
      const currentDistance = Math.abs(level.price - currentPrice);
      const nearestDistance = Math.abs(nearest.price - currentPrice);
      return currentDistance < nearestDistance ? level : nearest;
    });
  }

  identifyKeyPsychologicalLevels(currentPrice) {
    const roundNumbers = [];
    const magnitude = Math.pow(10, Math.floor(Math.log10(currentPrice)));
    
    // Generate round numbers around current price
    for (let i = 1; i <= 10; i++) {
      const level = Math.round(currentPrice / (magnitude * i)) * magnitude * i;
      if (Math.abs(level - currentPrice) / currentPrice < 0.1) { // Within 10%
        roundNumbers.push({
          price: level,
          type: 'psychological',
          significance: i <= 5 ? 'high' : 'moderate'
        });
      }
    }
    
    return roundNumbers;
  }

  // ANÁLISE DE MOMENTUM

  analyzeMomentum(prices, volumes) {
    const priceChange = this.calculatePriceChangeAcceleration(prices);
    const volumeConfirmation = this.analyzeVolumeConfirmation(prices, volumes);
    
    let strength = 'weak';
    let direction = 'neutral';
    
    if (priceChange.acceleration > 0.1) {
      direction = 'bullish';
      strength = priceChange.acceleration > 0.3 ? 'strong' : 'moderate';
    } else if (priceChange.acceleration < -0.1) {
      direction = 'bearish';
      strength = priceChange.acceleration < -0.3 ? 'strong' : 'moderate';
    }
    
    return {
      direction,
      strength,
      price_acceleration: priceChange.acceleration,
      volume_confirmation: volumeConfirmation,
      momentum_score: this.calculateMomentumScore(priceChange, volumeConfirmation),
      divergence: this.detectMomentumDivergence(prices, volumes)
    };
  }

  calculatePriceChangeAcceleration(prices) {
    if (prices.length < 6) return { acceleration: 0, velocity: 0 };
    
    const recent = prices.slice(-3);
    const previous = prices.slice(-6, -3);
    
    const recentChange = (recent[recent.length - 1] - recent[0]) / recent[0];
    const previousChange = (previous[previous.length - 1] - previous[0]) / previous[0];
    
    return {
      acceleration: recentChange - previousChange,
      velocity: recentChange
    };
  }

  analyzeVolumeConfirmation(prices, volumes) {
    if (!volumes || volumes.length < prices.length) {
      return { confirmed: false, note: 'Volume data unavailable' };
    }
    
    const recentPrices = prices.slice(-5);
    const recentVolumes = volumes.slice(-5);
    
    let upDaysWithVolume = 0;
    let downDaysWithVolume = 0;
    let totalUpDays = 0;
    let totalDownDays = 0;
    
    for (let i = 1; i < recentPrices.length; i++) {
      const priceChange = recentPrices[i] - recentPrices[i - 1];
      const volumeRatio = recentVolumes[i] / (recentVolumes[i - 1] || 1);
      
      if (priceChange > 0) {
        totalUpDays++;
        if (volumeRatio > 1.1) upDaysWithVolume++; // 10% volume increase
      } else if (priceChange < 0) {
        totalDownDays++;
        if (volumeRatio > 1.1) downDaysWithVolume++;
      }
    }
    
    const upConfirmation = totalUpDays > 0 ? upDaysWithVolume / totalUpDays : 0;
    const downConfirmation = totalDownDays > 0 ? downDaysWithVolume / totalDownDays : 0;
    
    return {
      confirmed: Math.max(upConfirmation, downConfirmation) > 0.6,
      up_confirmation: upConfirmation,
      down_confirmation: downConfirmation,
      strength: Math.max(upConfirmation, downConfirmation) > 0.8 ? 'strong' : 'moderate'
    };
  }

  calculateMomentumScore(priceChange, volumeConfirmation) {
    let score = 50; // Base score
    
    // Price acceleration contribution
    score += priceChange.acceleration * 100;
    
    // Volume confirmation bonus
    if (volumeConfirmation.confirmed) {
      score += volumeConfirmation.strength === 'strong' ? 15 : 10;
    }
    
    return Math.max(0, Math.min(100, score));
  }

  detectMomentumDivergence(prices, volumes) {
    // Simplified divergence detection
    if (!volumes || prices.length < 10) return { detected: false };
    
    const priceDirection = prices[prices.length - 1] > prices[prices.length - 5] ? 'up' : 'down';
    const volumeDirection = volumes[volumes.length - 1] > volumes[volumes.length - 5] ? 'up' : 'down';
    
    return {
      detected: priceDirection !== volumeDirection,
      type: priceDirection === 'up' && volumeDirection === 'down' ? 'bearish_divergence' : 
            priceDirection === 'down' && volumeDirection === 'up' ? 'bullish_divergence' : 'none',
      significance: 'moderate' // Would need more sophisticated analysis for stronger signals
    };
  }

  // SINAIS DE TRADING

  generateTradingSignals(indicators, trendAnalysis) {
    const signals = [];
    
    // RSI signals
    if (indicators.rsi) {
      if (indicators.rsi.signal === 'oversold') {
        signals.push({
          type: 'buy',
          source: 'rsi',
          strength: indicators.rsi.strength,
          description: `RSI oversold at ${indicators.rsi.value.toFixed(1)}`
        });
      } else if (indicators.rsi.signal === 'overbought') {
        signals.push({
          type: 'sell',
          source: 'rsi',
          strength: indicators.rsi.strength,
          description: `RSI overbought at ${indicators.rsi.value.toFixed(1)}`
        });
      }
    }
    
    // MACD signals
    if (indicators.macd && indicators.macd.crossover !== 'no_crossover') {
      signals.push({
        type: indicators.macd.crossover === 'bullish_crossover' ? 'buy' : 'sell',
        source: 'macd',
        strength: indicators.macd.strength,
        description: `MACD ${indicators.macd.crossover.replace('_', ' ')}`
      });
    }
    
    // Bollinger Bands signals
    if (indicators.bollinger) {
      if (indicators.bollinger.position === 'below_lower') {
        signals.push({
          type: 'buy',
          source: 'bollinger',
          strength: 'moderate',
          description: 'Price below lower Bollinger Band'
        });
      } else if (indicators.bollinger.position === 'above_upper') {
        signals.push({
          type: 'sell',
          source: 'bollinger',
          strength: 'moderate',
          description: 'Price above upper Bollinger Band'
        });
      }
    }
    
    // Moving average signals
    if (indicators.ma_signals) {
      signals.push(...indicators.ma_signals.map(signal => ({
        type: signal.type.includes('bullish') || signal.type.includes('golden') ? 'buy' : 'sell',
        source: 'moving_average',
        strength: signal.strength,
        description: signal.description || signal.type
      })));
    }
    
    // Trend confirmation
    if (trendAnalysis.overall.direction !== 'neutral') {
      signals.push({
        type: trendAnalysis.overall.direction === 'bullish' ? 'buy' : 'sell',
        source: 'trend',
        strength: trendAnalysis.overall.strength,
        description: `${trendAnalysis.overall.direction} trend confirmed`
      });
    }
    
    return this.consolidateSignals(signals);
  }

  consolidateSignals(signals) {
    const buySignals = signals.filter(s => s.type === 'buy');
    const sellSignals = signals.filter(s => s.type === 'sell');
    
    const buyScore = this.calculateSignalScore(buySignals);
    const sellScore = this.calculateSignalScore(sellSignals);
    
    let overallSignal = 'hold';
    let confidence = 0;
    
    if (buyScore > sellScore && buyScore > 0.6) {
      overallSignal = 'buy';
      confidence = buyScore;
    } else if (sellScore > buyScore && sellScore > 0.6) {
      overallSignal = 'sell';
      confidence = sellScore;
    }
    
    return {
      overall: overallSignal,
      confidence: confidence,
      buy_signals: buySignals,
      sell_signals: sellSignals,
      buy_score: buyScore,
      sell_score: sellScore,
      signal_count: signals.length
    };
  }

  calculateSignalScore(signals) {
    if (signals.length === 0) return 0;
    
    const weights = {
      'weak': 0.3,
      'moderate': 0.6,
      'strong': 0.9,
      'very_strong': 1.0
    };
    
    const totalWeight = signals.reduce((sum, signal) => {
      return sum + (weights[signal.strength] || 0.5);
    }, 0);
    
    return totalWeight / signals.length;
  }

  // SCORING E RECOMENDAÇÕES

  calculateOverallScore(indicators, trendAnalysis, signals) {
    let score = 50; // Base score
    
    // Trend contribution (30% weight)
    if (trendAnalysis.overall.direction === 'bullish') {
      score += trendAnalysis.overall.strength === 'strong' ? 15 : 10;
    } else if (trendAnalysis.overall.direction === 'bearish') {
      score -= trendAnalysis.overall.strength === 'strong' ? 15 : 10;
    }
    
    // Signal contribution (40% weight)
    if (signals.overall === 'buy') {
      score += signals.confidence * 20;
    } else if (signals.overall === 'sell') {
      score -= signals.confidence * 20;
    }
    
    // Technical indicators contribution (20% weight)
    if (indicators.rsi) {
      if (indicators.rsi.signal === 'oversold') score += 5;
      else if (indicators.rsi.signal === 'overbought') score -= 5;
    }
    
    // Momentum contribution (10% weight)
    if (indicators.macd && indicators.macd.signal === 'bullish') {
      score += 5;
    } else if (indicators.macd && indicators.macd.signal === 'bearish') {
      score -= 5;
    }
    
    return Math.max(0, Math.min(100, score));
  }

  scoreToRating(score) {
    if (score >= 80) return 'Strong Buy ⭐⭐⭐⭐⭐';
    if (score >= 70) return 'Buy ⭐⭐⭐⭐';
    if (score >= 60) return 'Weak Buy ⭐⭐⭐';
    if (score >= 40) return 'Hold ⭐⭐';
    if (score >= 30) return 'Weak Sell ⭐';
    return 'Strong Sell 💀';
  }

  generateRecommendation(score, signals) {
    const recommendation = {
      action: 'HOLD',
      reasoning: [],
      timeframe: 'medium_term',
      risk_level: 'moderate'
    };
    
    if (score >= 70) {
      recommendation.action = 'BUY';
      recommendation.reasoning.push('Strong technical indicators favor upward movement');
      recommendation.risk_level = score >= 80 ? 'low' : 'moderate';
    } else if (score <= 30) {
      recommendation.action = 'SELL';
      recommendation.reasoning.push('Technical indicators suggest downward pressure');
      recommendation.risk_level = score <= 20 ? 'high' : 'moderate';
    } else {
      recommendation.reasoning.push('Mixed signals suggest waiting for clearer direction');
    }
    
    // Add specific signal reasoning
    if (signals.buy_signals.length > signals.sell_signals.length) {
      recommendation.reasoning.push(`${signals.buy_signals.length} bullish signals detected`);
    } else if (signals.sell_signals.length > signals.buy_signals.length) {
      recommendation.reasoning.push(`${signals.sell_signals.length} bearish signals detected`);
    }
    
    return recommendation;
  }

  calculateConfidence(indicators, trendAnalysis) {
    let confidence = 0.5; // Base confidence
    
    // Trend consistency boosts confidence
    if (trendAnalysis.consistency === 'very_consistent') {
      confidence += 0.3;
    } else if (trendAnalysis.consistency === 'moderately_consistent') {
      confidence += 0.2;
    }
    
    // Multiple confirming indicators boost confidence
    let confirmingIndicators = 0;
    if (indicators.rsi && indicators.rsi.strength !== 'weak') confirmingIndicators++;
    if (indicators.macd && indicators.macd.strength !== 'weak') confirmingIndicators++;
    if (indicators.bollinger && indicators.bollinger.position !== 'within_bands') confirmingIndicators++;
    
    confidence += (confirmingIndicators / 10); // Each indicator adds 10%
    
    return Math.min(1.0, confidence);
  }

  // IDENTIFICAÇÃO DE RISCOS E OPORTUNIDADES

  identifyRiskFactors(volatilityAnalysis, indicators) {
    const risks = [];
    
    if (volatilityAnalysis.risk_level === 'very_high') {
      risks.push({
        type: 'high_volatility',
        severity: 'high',
        description: 'Extremely high price volatility increases trading risk'
      });
    }
    
    if (indicators.rsi && indicators.rsi.value > 90) {
      risks.push({
        type: 'extreme_overbought',
        severity: 'high',
        description: 'RSI above 90 suggests extreme overbought conditions'
      });
    }
    
    if (indicators.bollinger && indicators.bollinger.squeeze) {
      risks.push({
        type: 'bollinger_squeeze',
        severity: 'medium',
        description: 'Bollinger Band squeeze suggests potential volatility breakout'
      });
    }
    
    return risks;
  }

  suggestEntryExitPoints(currentPrice, supportResistance, signals) {
    const suggestions = {
      entry_points: [],
      exit_points: [],
      stop_loss: null,
      take_profit: null
    };
    
    // Entry points based on support levels
    if (supportResistance.nearest_support) {
      suggestions.entry_points.push({
        price: supportResistance.nearest_support.price,
        type: 'support_bounce',
        confidence: supportResistance.nearest_support.strength === 'strong' ? 'high' : 'medium'
      });
    }
    
    // Exit points based on resistance levels
    if (supportResistance.nearest_resistance) {
      suggestions.exit_points.push({
        price: supportResistance.nearest_resistance.price,
        type: 'resistance_rejection',
        confidence: supportResistance.nearest_resistance.strength === 'strong' ? 'high' : 'medium'
      });
    }
    
    // Stop loss suggestion
    if (signals.overall === 'buy' && supportResistance.nearest_support) {
      suggestions.stop_loss = {
        price: supportResistance.nearest_support.price * 0.98, // 2% below support
        reasoning: 'Below nearest support level'
      };
    }
    
    // Take profit suggestion
    if (signals.overall === 'buy' && supportResistance.nearest_resistance) {
      suggestions.take_profit = {
        price: supportResistance.nearest_resistance.price * 0.98, // 2% below resistance
        reasoning: 'Near resistance level'
      };
    }
    
    return suggestions;
  }

  // MÉTODOS AUXILIARES

  async getPriceHistory(coin, days) {
    try {
      const response = await axios.get(`${config.apis.coingecko.base_url}/coins/${coin}/market_chart`, {
        params: {
          vs_currency: 'usd',
          days: days,
          interval: days <= 1 ? 'hourly' : days <= 90 ? 'daily' : 'weekly'
        },
        timeout: config.apis.coingecko.timeout
      });

      this.stats.api_calls++;

      return {
        prices: response.data.prices.map(p => p[1]),
        volumes: response.data.total_volumes.map(v => v[1]),
        market_caps: response.data.market_caps?.map(m => m[1]) || []
      };

    } catch (error) {
      throw new Error(`Erro ao obter dados históricos de ${coin}: ${error.message}`);
    }
  }

  async calculateCorrelations(coins) {
    try {
      const correlations = {};
      
      // Get price data for all coins
      const priceData = {};
      for (const coin of coins) {
        try {
          const history = await this.getPriceHistory(coin, 30);
          priceData[coin] = history.prices;
        } catch (error) {
          console.error(`⚠️ Erro ao obter dados de ${coin}:`, error.message);
        }
      }
      
      // Calculate correlations between each pair
      for (let i = 0; i < coins.length; i++) {
        for (let j = i + 1; j < coins.length; j++) {
          const coin1 = coins[i];
          const coin2 = coins[j];
          
          if (priceData[coin1] && priceData[coin2]) {
            const correlation = this.calculatePearsonCorrelation(
              priceData[coin1], 
              priceData[coin2]
            );
            
            correlations[`${coin1}_${coin2}`] = {
              correlation: correlation,
              strength: this.interpretCorrelation(correlation),
              coins: [coin1, coin2]
            };
          }
        }
      }
      
      return correlations;
      
    } catch (error) {
      throw new Error(`Erro no cálculo de correlações: ${error.message}`);
    }
  }

  calculatePearsonCorrelation(x, y) {
    const n = Math.min(x.length, y.length);
    if (n < 2) return 0;
    
    // Take the last n points from both arrays
    const xData = x.slice(-n);
    const yData = y.slice(-n);
    
    const sumX = xData.reduce((a, b) => a + b, 0);
    const sumY = yData.reduce((a, b) => a + b, 0);
    const sumXY = xData.reduce((sum, xi, i) => sum + xi * yData[i], 0);
    const sumXX = xData.reduce((sum, xi) => sum + xi * xi, 0);
    const sumYY = yData.reduce((sum, yi) => sum + yi * yi, 0);
    
    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY));
    
    return denominator === 0 ? 0 : numerator / denominator;
  }

  interpretCorrelation(correlation) {
    const abs = Math.abs(correlation);
    if (abs > 0.8) return 'very_strong';
    if (abs > 0.6) return 'strong';
    if (abs > 0.4) return 'moderate';
    if (abs > 0.2) return 'weak';
    return 'very_weak';
  }

  analyzeSectors() {
    // Simplified sector analysis based on coin categories
    const sectors = {
      'smart_contracts': ['ethereum', 'cardano', 'polkadot', 'avalanche-2'],
      'defi': ['uniswap', 'aave', 'chainlink'],
      'layer1': ['bitcoin', 'ethereum', 'solana', 'avalanche-2'],
      'scaling': ['polygon', 'polkadot']
    };
    
    const sectorAnalysis = {};
    
    Object.entries(sectors).forEach(([sector, coins]) => {
      sectorAnalysis[sector] = {
        coins: coins.map(coin => Formatter.formatCoinName(coin)),
        status: 'analyzing', // Would require real analysis
        note: 'Detailed sector analysis requires market data'
      };
    });
    
    return sectorAnalysis;
  }

  identifyMarketPhase(sentiment, coinAnalyses) {
    const fearGreedValue = sentiment.primary_indicator.value;
    const bullishCoins = coinAnalyses.ranking.filter(coin => coin.trend === 'bullish').length;
    const totalCoins = coinAnalyses.ranking.length;
    const bullishPercentage = (bullishCoins / totalCoins) * 100;
    
    if (fearGreedValue > 75 && bullishPercentage > 70) {
      return {
        phase: 'euphoria',
        description: 'Market in euphoric state - high risk of correction',
        characteristics: ['Extreme greed', 'Most coins bullish', 'High risk taking']
      };
    } else if (fearGreedValue < 25 && bullishPercentage < 30) {
      return {
        phase: 'capitulation',
        description: 'Market in capitulation - potential buying opportunity',
        characteristics: ['Extreme fear', 'Most coins bearish', 'Risk aversion']
      };
    } else if (fearGreedValue > 55 && bullishPercentage > 50) {
      return {
        phase: 'accumulation',
        description: 'Healthy accumulation phase',
        characteristics: ['Moderate optimism', 'Selective buying', 'Building momentum']
      };
    } else if (fearGreedValue < 45 && bullishPercentage < 50) {
      return {
        phase: 'distribution',
        description: 'Distribution phase - caution advised',
        characteristics: ['Growing concern', 'Profit taking', 'Weakening momentum']
      };
    } else {
      return {
        phase: 'consolidation',
        description: 'Market consolidating - direction unclear',
        characteristics: ['Mixed signals', 'Range bound', 'Waiting for catalysts']
      };
    }
  }

  assessRiskOnSentiment(coinAnalyses, sentiment) {
    const highMomentumCoins = coinAnalyses.ranking.filter(coin => 
      coin.momentum === 'strong' && coin.trend === 'bullish'
    ).length;
    
    const riskOnScore = (highMomentumCoins / coinAnalyses.coins_analyzed) * 100;
    
    if (riskOnScore > 70) return 'high';
    if (riskOnScore > 40) return 'moderate';
    return 'low';
  }

  assessInstitutionalFlow(coinAnalyses) {
    // Simplified assessment based on major coins performance
    const majorCoins = ['bitcoin', 'ethereum'];
    const majorCoinPerformance = coinAnalyses.ranking.filter(coin => 
      majorCoins.includes(coin.coin)
    );
    
    const avgMajorScore = majorCoinPerformance.reduce((sum, coin) => sum + coin.score, 0) / majorCoinPerformance.length;
    
    if (avgMajorScore > 70) return 'inflow';
    if (avgMajorScore < 40) return 'outflow';
    return 'neutral';
  }

  identifyMarketOpportunities(coinAnalyses, sentiment) {
    const opportunities = [];
    
    // Oversold opportunities
    const oversoldCoins = coinAnalyses.ranking.filter(coin => 
      coin.score < 40 && coin.trend !== 'bearish'
    );
    
    if (oversoldCoins.length > 0) {
      opportunities.push({
        type: 'oversold_bounce',
        coins: oversoldCoins.slice(0, 3),
        description: 'Oversold coins with potential bounce'
      });
    }
    
    // Momentum opportunities
    const momentumCoins = coinAnalyses.ranking.filter(coin => 
      coin.momentum === 'strong' && coin.score > 60
    );
    
    if (momentumCoins.length > 0) {
      opportunities.push({
        type: 'momentum_continuation',
        coins: momentumCoins.slice(0, 3),
        description: 'Strong momentum likely to continue'
      });
    }
    
    // Fear-based opportunities
    if (sentiment.primary_indicator.value < 30) {
      opportunities.push({
        type: 'fear_accumulation',
        description: 'Extreme fear presents accumulation opportunity',
        recommended_action: 'DCA into quality assets'
      });
    }
    
    return opportunities;
  }

  identifyMarketRisks(coinAnalyses, sentiment) {
    const risks = [];
    
    // Overheating risk
    if (sentiment.primary_indicator.value > 75) {
      risks.push({
        type: 'market_overheating',
        severity: 'high',
        description: 'Extreme greed suggests market overheating'
      });
    }
    
    // Concentration risk
    const topCoinScore = coinAnalyses.ranking[0]?.score || 0;
    if (topCoinScore > 85) {
      risks.push({
        type: 'concentration_risk',
        severity: 'medium',
        description: 'Over-concentration in top performers'
      });
    }
    
    // Correlation risk
    const bullishPercentage = (coinAnalyses.summary.bullish_count / coinAnalyses.coins_analyzed) * 100;
    if (bullishPercentage > 80) {
      risks.push({
        type: 'correlation_risk',
        severity: 'medium',
        description: 'High correlation increases systematic risk'
      });
    }
    
    return risks;
  }

  assessTradingEnvironment(coinAnalyses, sentiment) {
    const environment = {
      overall: 'neutral',
      volatility: 'moderate',
      opportunity: 'moderate',
      risk: 'moderate'
    };
    
    // Overall assessment
    const avgScore = coinAnalyses.summary.average_score;
    if (avgScore > 65) environment.overall = 'bullish';
    else if (avgScore < 35) environment.overall = 'bearish';
    
    // Volatility assessment
    const fearGreedValue = sentiment.primary_indicator.value;
    if (fearGreedValue > 80 || fearGreedValue < 20) {
      environment.volatility = 'high';
    }
    
    // Opportunity assessment
    if (environment.overall === 'bearish' && fearGreedValue < 30) {
      environment.opportunity = 'high';
    } else if (environment.overall === 'bullish' && fearGreedValue > 70) {
      environment.opportunity = 'low';
    }
    
    // Risk assessment
    if (fearGreedValue > 75) {
      environment.risk = 'high';
    } else if (fearGreedValue < 25) {
      environment.risk = 'low';
    }
    
    return environment;
  }

  generateComparativeRecommendations(analyses) {
    const recommendations = [];
    
    // Top performers
    const topPerformers = analyses.slice(0, 2);
    if (topPerformers.length > 0) {
      recommendations.push({
        type: 'momentum_play',
        action: 'Consider position in top performers',
        coins: topPerformers.map(coin => coin.coin_name),
        reasoning: 'Strong technical momentum'
      });
    }
    
    // Value plays
    const valueOpportunities = analyses.filter(coin => 
      coin.score < 40 && coin.trend !== 'bearish'
    );
    
    if (valueOpportunities.length > 0) {
      recommendations.push({
        type: 'value_opportunity',
        action: 'Accumulate on weakness',
        coins: valueOpportunities.slice(0, 2).map(coin => coin.coin_name),
        reasoning: 'Oversold with potential recovery'
      });
    }
    
    // Diversification
    const diversifiedPortfolio = this.suggestDiversifiedPortfolio(analyses);
    recommendations.push({
      type: 'diversification',
      action: 'Balanced portfolio allocation',
      allocation: diversifiedPortfolio,
      reasoning: 'Risk-adjusted diversification'
    });
    
    return recommendations;
  }

  suggestDiversifiedPortfolio(analyses) {
    const allocation = {};
    const totalCoins = Math.min(analyses.length, 5); // Max 5 positions
    
    // Sort by risk-adjusted score
    const sortedAnalyses = [...analyses].sort((a, b) => {
      const scoreA = a.score * (a.risk_level === 'low' ? 1.2 : a.risk_level === 'high' ? 0.8 : 1.0);
      const scoreB = b.score * (b.risk_level === 'low' ? 1.2 : b.risk_level === 'high' ? 0.8 : 1.0);
      return scoreB - scoreA;
    });
    
    // Allocate based on scores
    const topCoins = sortedAnalyses.slice(0, totalCoins);
    const totalScore = topCoins.reduce((sum, coin) => sum + coin.score, 0);
    
    topCoins.forEach(coin => {
      const baseAllocation = (coin.score / totalScore) * 80; // 80% allocated, 20% cash
      allocation[coin.coin_name] = Math.round(baseAllocation);
    });
    
    allocation['Cash'] = 20; // Always keep some cash
    
    return allocation;
  }

  // FORMATAÇÃO E HEALTH CHECK

  formatAnalysisForDisplay(analysis) {
    return {
      summary: `${analysis.coin_name}: ${analysis.overall_assessment.rating}`,
      current_price: Formatter.formatPrice(analysis.current_data.price),
      recommendation: analysis.overall_assessment.recommendation.action,
      confidence: `${(analysis.overall_assessment.confidence * 100).toFixed(0)}%`,
      key_signals: analysis.trading_signals.overall,
      risk_factors: analysis.risk_factors.length
    };
  }

  async healthCheck() {
    try {
      // Test API connectivity
      const testCoin = 'bitcoin';
      const startTime = Date.now();
      await this.getPriceHistory(testCoin, 1);
      const responseTime = Date.now() - startTime;
      
      return {
        status: 'healthy',
        api_connectivity: 'ok',
        response_time_ms: responseTime,
        cache_performance: this.cache.getStats(),
        analysis_capabilities: {
          technical_indicators: true,
          trend_analysis: true,
          support_resistance: true,
          momentum_analysis: true,
          market_comparison: true
        },
        last_check: Formatter.getTimestamp()
      };
      
    } catch (error) {
      return {
        status: 'degraded',
        error: error.message,
        fallback_available: true,
        last_check: Formatter.getTimestamp()
      };
    }
  }

  getAnalysisStats() {
    return {
      api_calls: this.stats.api_calls,
      cache_stats: this.cache.getStats(),
      supported_indicators: Object.keys(this.technicalConfig),
      analysis_types: [
        'single_coin_analysis',
        'comparative_analysis', 
        'market_overview',
        'correlation_analysis',
        'sector_analysis'
      ]
    };
  }
}

module.exports = MarketAnalysis;