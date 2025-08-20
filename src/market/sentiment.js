// src/market/sentiment.js
const axios = require('axios');
const config = require('../utils/config');
const Formatter = require('../utils/formatter');

class MarketSentiment {
  constructor(dependencies) {
    this.cache = dependencies.cache;
    this.storage = dependencies.storage;
    this.stats = dependencies.stats || { api_calls: 0 };
    
    // Sentiment data sources
    this.sources = {
      fear_greed: {
        name: 'Fear & Greed Index',
        url: config.apis.fear_greed.base_url,
        timeout: config.apis.fear_greed.timeout,
        weight: 0.6 // Primary indicator
      },
      // Future sources can be added here
      // social_sentiment: { ... },
      // news_sentiment: { ... }
    };
  }

  // MAIN SENTIMENT ANALYSIS

  async getMarketSentiment() {
    const cacheKey = 'market_sentiment_complete';
    let cached = this.cache.getMarket(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      // Get Fear & Greed Index
      const fearGreedData = await this.getFearGreedIndex();
      
      // Analyze sentiment components
      const sentimentAnalysis = this.analyzeSentimentComponents(fearGreedData);
      
      // Generate trading recommendations
      const recommendations = this.generateSentimentRecommendations(fearGreedData, sentimentAnalysis);
      
      // Historical context
      const historicalContext = await this.getHistoricalContext(fearGreedData);
      
      const sentiment = {
        primary_indicator: fearGreedData,
        sentiment_analysis: sentimentAnalysis,
        market_psychology: this.analyzeMarketPsychology(fearGreedData.value),
        trading_recommendations: recommendations,
        historical_context: historicalContext,
        risk_assessment: this.assessSentimentRisk(fearGreedData.value),
        timestamp: Formatter.getTimestamp(),
        next_update: this.calculateNextUpdate()
      };

      this.cache.setMarket(cacheKey, sentiment);
      return sentiment;

    } catch (error) {
      throw new Error(`Erro ao obter sentimento do mercado: ${error.message}`);
    }
  }

  // FEAR & GREED INDEX

  async getFearGreedIndex() {
    const cacheKey = 'fear_greed_index';
    let cached = this.cache.getMarket(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      const response = await axios.get(this.sources.fear_greed.url, {
        timeout: this.sources.fear_greed.timeout
      });
      
      this.stats.api_calls++;
      
      const data = response.data.data[0];
      const value = parseInt(data.value);
      
      const fearGreedData = {
        value: value,
        classification: this.classifySentiment(value),
        timestamp: data.timestamp,
        time_until_update: data.time_until_update || null,
        metadata: {
          source: 'Alternative.me',
          scale: '0-100 (0=Extreme Fear, 100=Extreme Greed)',
          last_updated: Formatter.formatDateTime(data.timestamp * 1000)
        },
        interpretation: this.interpretFearGreed(value),
        emoji: this.getSentimentEmoji(value),
        color: this.getSentimentColor(value)
      };

      this.cache.setMarket(cacheKey, fearGreedData);
      return fearGreedData;

    } catch (error) {
      // Return fallback data if API fails
      console.error('⚠️ Fear & Greed API indisponível, usando dados padrão');
      
      return {
        value: 50,
        classification: 'Neutral',
        timestamp: Math.floor(Date.now() / 1000),
        interpretation: 'Dados indisponíveis - usando valor neutro',
        emoji: '😐',
        color: 'yellow',
        error: 'API temporariamente indisponível',
        fallback: true
      };
    }
  }

  async getHistoricalFearGreed(days = 30) {
    try {
      const response = await axios.get(`${this.sources.fear_greed.url}?limit=${days}`, {
        timeout: this.sources.fear_greed.timeout
      });
      
      this.stats.api_calls++;
      
      const historicalData = response.data.data.map(item => ({
        value: parseInt(item.value),
        classification: this.classifySentiment(parseInt(item.value)),
        timestamp: item.timestamp,
        date: Formatter.formatDateTime(item.timestamp * 1000)
      }));

      return {
        historical_data: historicalData,
        period_days: days,
        average_sentiment: historicalData.reduce((sum, item) => sum + item.value, 0) / historicalData.length,
        volatility: this.calculateSentimentVolatility(historicalData.map(item => item.value)),
        trend: this.calculateSentimentTrend(historicalData),
        extremes: {
          highest: Math.max(...historicalData.map(item => item.value)),
          lowest: Math.min(...historicalData.map(item => item.value))
        }
      };

    } catch (error) {
      throw new Error(`Erro ao obter histórico de sentimento: ${error.message}`);
    }
  }

  // SENTIMENT ANALYSIS

  analyzeSentimentComponents(fearGreedData) {
    const value = fearGreedData.value;
    
    return {
      current_phase: this.identifyMarketPhase(value),
      psychological_state: this.analyzeMarketPsychology(value),
      crowd_behavior: this.analyzeCrowdBehavior(value),
      opportunity_assessment: this.assessOpportunity(value),
      contrarian_signals: this.getContrarianSignals(value),
      momentum_indicators: this.analyzeSentimentMomentum(value)
    };
  }

  identifyMarketPhase(value) {
    if (value >= 80) {
      return {
        phase: 'euphoria',
        description: 'Mercado em euforia extrema',
        characteristics: ['FOMO generalizado', 'Ignorância de riscos', 'Especulação desenfreada'],
        typical_duration: '2-8 semanas',
        what_usually_follows: 'Correção significativa'
      };
    } else if (value >= 65) {
      return {
        phase: 'greed',
        description: 'Mercado ganancioso',
        characteristics: ['Otimismo elevado', 'Busca por retornos maiores', 'Negligência de riscos'],
        typical_duration: '4-12 semanas',
        what_usually_follows: 'Consolidação ou correção'
      };
    } else if (value >= 45) {
      return {
        phase: 'neutral',
        description: 'Mercado equilibrado',
        characteristics: ['Racionalidade predominante', 'Análise balanceada', 'Decisões ponderadas'],
        typical_duration: 'Variável',
        what_usually_follows: 'Movimento para extremos'
      };
    } else if (value >= 25) {
      return {
        phase: 'fear',
        description: 'Mercado com medo',
        characteristics: ['Pessimismo crescente', 'Aversão ao risco', 'Foco em preservação'],
        typical_duration: '4-12 semanas',
        what_usually_follows: 'Estabilização ou pânico'
      };
    } else {
      return {
        phase: 'panic',
        description: 'Pânico no mercado',
        characteristics: ['Vendas em massa', 'Irracionalidade', 'Desespero generalizado'],
        typical_duration: '1-6 semanas',
        what_usually_follows: 'Oportunidade de compra histórica'
      };
    }
  }

  analyzeMarketPsychology(value) {
    return {
      investor_emotion: this.getInvestorEmotion(value),
      decision_quality: this.assessDecisionQuality(value),
      herd_mentality: this.assessHerdMentality(value),
      risk_perception: this.assessRiskPerception(value),
      time_horizon: this.assessTimeHorizon(value)
    };
  }

  analyzeCrowdBehavior(value) {
    if (value > 75) {
      return {
        behavior: 'euphoric',
        description: 'Multidão eufórica ignorando riscos',
        actions: ['Compras impulsivas', 'FOMO trading', 'Alavancagem excessiva'],
        contrarian_opportunity: 'ALTA - considere vender'
      };
    } else if (value < 25) {
      return {
        behavior: 'panicked',
        description: 'Multidão em pânico vendendo indiscriminadamente',
        actions: ['Vendas de pânico', 'Liquidações forçadas', 'Aversão total ao risco'],
        contrarian_opportunity: 'ALTA - considere comprar'
      };
    } else {
      return {
        behavior: 'rational',
        description: 'Comportamento relativamente racional',
        actions: ['Análise ponderada', 'Decisões calculadas', 'Gestão de risco adequada'],
        contrarian_opportunity: 'BAIXA - siga a tendência'
      };
    }
  }

  // TRADING RECOMMENDATIONS

  generateSentimentRecommendations(fearGreedData, sentimentAnalysis) {
    const recommendations = [];
    const value = fearGreedData.value;
    
    // Primary recommendation based on sentiment
    if (value >= 75) {
      recommendations.push({
        type: 'primary',
        action: 'REDUCE_POSITIONS',
        urgency: 'high',
        reason: 'Extreme greed - alto risco de correção',
        suggested_actions: [
          'Realizar lucros em posições ganhadoras',
          'Reduzir exposição total ao mercado',
          'Aumentar posição em cash',
          'Evitar novas posições de risco'
        ],
        timeframe: 'Próximas 2-4 semanas'
      });
    } else if (value <= 25) {
      recommendations.push({
        type: 'primary',
        action: 'ACCUMULATE',
        urgency: 'high',
        reason: 'Extreme fear - oportunidade histórica de compra',
        suggested_actions: [
          'Acumular posições em ativos de qualidade',
          'Dollar-cost averaging',
          'Focar em projetos fundamentalmente sólidos',
          'Preparar-se para recuperação de médio prazo'
        ],
        timeframe: 'Próximos 3-6 meses'
      });
    } else if (value >= 55 && value < 75) {
      recommendations.push({
        type: 'primary',
        action: 'PARTIAL_PROFIT_TAKING',
        urgency: 'medium',
        reason: 'Greed crescente - prudência recomendada',
        suggested_actions: [
          'Realizar lucros parciais',
          'Manter posições core',
          'Reduzir posições especulativas',
          'Monitorar de perto'
        ],
        timeframe: 'Próximas 4-8 semanas'
      });
    } else if (value > 25 && value <= 45) {
      recommendations.push({
        type: 'primary',
        action: 'SELECTIVE_BUYING',
        urgency: 'medium',
        reason: 'Fear moderado - oportunidades seletivas',
        suggested_actions: [
          'Compras seletivas em quedas',
          'Focar em ativos com desconto',
          'Manter gestão de risco rigorosa',
          'Aguardar sinais de estabilização'
        ],
        timeframe: 'Próximas 6-12 semanas'
      });
    } else {
      recommendations.push({
        type: 'primary',
        action: 'HOLD',
        urgency: 'low',
        reason: 'Sentimento neutro - mantenha curso',
        suggested_actions: [
          'Manter posições atuais',
          'Monitorar mudanças de sentimento',
          'Preparar estratégias para extremos',
          'Focar em fundamentais'
        ],
        timeframe: 'Aguardar desenvolvimento'
      });
    }

    // Risk management recommendations
    recommendations.push({
      type: 'risk_management',
      action: 'ADJUST_RISK',
      urgency: this.calculateRiskUrgency(value),
      risk_adjustments: this.generateRiskAdjustments(value),
      position_sizing: this.recommendPositionSizing(value),
      stop_loss_strategy: this.recommendStopLossStrategy(value)
    });

    // Timing recommendations
    recommendations.push({
      type: 'timing',
      action: 'MARKET_TIMING',
      entry_strategy: this.recommendEntryStrategy(value),
      exit_strategy: this.recommendExitStrategy(value),
      dca_strategy: this.recommendDCAStrategy(value)
    });

    return recommendations;
  }

  // HISTORICAL CONTEXT

  async getHistoricalContext(currentData) {
    try {
      const historical = await this.getHistoricalFearGreed(90); // 90 days
      const currentValue = currentData.value;
      
      // Calculate percentiles
      const values = historical.historical_data.map(item => item.value);
      const sortedValues = [...values].sort((a, b) => a - b);
      const currentPercentile = this.calculatePercentile(sortedValues, currentValue);
      
      // Find similar periods
      const similarPeriods = historical.historical_data.filter(item => 
        Math.abs(item.value - currentValue) <= 5
      );

      return {
        percentile: currentPercentile,
        historical_average: historical.average_sentiment,
        deviation_from_average: currentValue - historical.average_sentiment,
        similar_periods_count: similarPeriods.length,
        recent_trend: historical.trend,
        volatility_period: this.classifyVolatilityPeriod(historical.volatility),
        extremes_frequency: this.calculateExtremesFrequency(values),
        market_context: this.getMarketContext(currentPercentile, historical.trend)
      };

    } catch (error) {
      return {
        error: 'Dados históricos indisponíveis',
        note: 'Análise baseada apenas em dados atuais'
      };
    }
  }

  // RISK ASSESSMENT

  assessSentimentRisk(value) {
    let riskLevel = 'MEDIUM';
    let riskScore = 50;
    const riskFactors = [];

    if (value >= 80) {
      riskLevel = 'VERY_HIGH';
      riskScore = 90;
      riskFactors.push('Euforia extrema - risco máximo de correção');
      riskFactors.push('Comportamento irracional dominante');
    } else if (value >= 70) {
      riskLevel = 'HIGH';
      riskScore = 75;
      riskFactors.push('Greed excessivo - risco elevado');
      riskFactors.push('Possível formação de topo');
    } else if (value <= 20) {
      riskLevel = 'CONTRARIAN_OPPORTUNITY';
      riskScore = 20;
      riskFactors.push('Pânico extremo - oportunidade histórica');
      riskFactors.push('Possível formação de fundo');
    } else if (value <= 30) {
      riskLevel = 'LOW';
      riskScore = 35;
      riskFactors.push('Fear elevado - risco reduzido');
    }

    return {
      risk_level: riskLevel,
      risk_score: riskScore,
      risk_factors: riskFactors,
      recommended_exposure: this.recommendExposure(value),
      max_position_size: this.calculateMaxPositionSize(value),
      hedge_recommendations: this.generateHedgeRecommendations(value)
    };
  }

  // UTILITY METHODS

  classifySentiment(value) {
    if (value >= 75) return 'Extreme Greed';
    if (value >= 55) return 'Greed';
    if (value >= 45) return 'Neutral';
    if (value >= 25) return 'Fear';
    return 'Extreme Fear';
  }

  interpretFearGreed(value) {
    const interpretations = {
      90: 'Euforia total - mercado completamente irracional',
      80: 'Greed extremo - correção iminente muito provável',
      70: 'Greed elevado - cautela recomendada',
      60: 'Otimismo moderado - ambiente favorável mas atento',
      50: 'Neutro - mercado equilibrado',
      40: 'Pessimismo leve - oportunidades seletivas',
      30: 'Fear moderado - boas oportunidades de compra',
      20: 'Fear extremo - excelente momento para acumular',
      10: 'Pânico total - oportunidade histórica de uma década'
    };

    // Find closest interpretation
    const closest = Object.keys(interpretations)
      .map(Number)
      .reduce((prev, curr) => Math.abs(curr - value) < Math.abs(prev - value) ? curr : prev);

    return interpretations[closest];
  }

  getSentimentEmoji(value) {
    if (value >= 80) return '🤑';
    if (value >= 70) return '😊';
    if (value >= 55) return '😌';
    if (value >= 45) return '😐';
    if (value >= 30) return '😰';
    if (value >= 20) return '😱';
    return '💀';
  }

  getSentimentColor(value) {
    if (value >= 75) return 'red';
    if (value >= 55) return 'orange';
    if (value >= 45) return 'yellow';
    if (value >= 25) return 'lightblue';
    return 'green';
  }

  calculateSentimentVolatility(values) {
    if (values.length < 2) return 0;
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    
    return Math.sqrt(variance);
  }

  calculateSentimentTrend(historicalData) {
    if (historicalData.length < 5) return 'insufficient_data';
    
    const recent = historicalData.slice(0, 5);
    const older = historicalData.slice(-5);
    
    const recentAvg = recent.reduce((sum, item) => sum + item.value, 0) / recent.length;
    const olderAvg = older.reduce((sum, item) => sum + item.value, 0) / older.length;
    
    const change = recentAvg - olderAvg;
    
    if (change > 10) return 'strongly_improving';
    if (change > 5) return 'improving';
    if (change > -5) return 'stable';
    if (change > -10) return 'deteriorating';
    return 'strongly_deteriorating';
  }

  getInvestorEmotion(value) {
    if (value >= 80) return 'euphoric';
    if (value >= 65) return 'optimistic';
    if (value >= 45) return 'neutral';
    if (value >= 25) return 'pessimistic';
    return 'panicked';
  }

  assessDecisionQuality(value) {
    if (value >= 75 || value <= 25) return 'poor';
    if (value >= 65 || value <= 35) return 'questionable';
    return 'rational';
  }

  assessHerdMentality(value) {
    if (value >= 80 || value <= 20) return 'very_high';
    if (value >= 70 || value <= 30) return 'high';
    if (value >= 60 || value <= 40) return 'moderate';
    return 'low';
  }

  assessRiskPerception(value) {
    if (value >= 75) return 'severely_underestimated';
    if (value >= 55) return 'underestimated';
    if (value >= 45) return 'appropriate';
    if (value >= 25) return 'overestimated';
    return 'severely_overestimated';
  }

  assessTimeHorizon(value) {
    if (value >= 75) return 'very_short_term';
    if (value >= 55) return 'short_term';
    if (value >= 45) return 'balanced';
    if (value >= 25) return 'long_term';
    return 'very_long_term';
  }

  assessOpportunity(value) {
    if (value <= 25) return 'exceptional_buy';
    if (value <= 35) return 'good_buy';
    if (value >= 75) return 'exceptional_sell';
    if (value >= 65) return 'good_sell';
    return 'neutral';
  }

  getContrarianSignals(value) {
    const signals = [];
    
    if (value >= 80) {
      signals.push({
        signal: 'STRONG_SELL',
        confidence: 0.9,
        reason: 'Extreme greed - contrarian sell signal'
      });
    } else if (value <= 20) {
      signals.push({
        signal: 'STRONG_BUY',
        confidence: 0.9,
        reason: 'Extreme fear - contrarian buy signal'
      });
    } else if (value >= 70) {
      signals.push({
        signal: 'SELL',
        confidence: 0.7,
        reason: 'High greed - moderate sell signal'
      });
    } else if (value <= 30) {
      signals.push({
        signal: 'BUY',
        confidence: 0.7,
        reason: 'High fear - moderate buy signal'
      });
    }
    
    return signals;
  }

  analyzeSentimentMomentum(value) {
    // This would ideally compare with previous values
    // For now, return analysis based on current position
    
    return {
      momentum: value > 50 ? 'positive' : 'negative',
      acceleration: 'unknown', // Would need historical data
      reversal_probability: this.calculateReversalProbability(value)
    };
  }

  calculateReversalProbability(value) {
    if (value >= 85 || value <= 15) return 'very_high';
    if (value >= 75 || value <= 25) return 'high';
    if (value >= 65 || value <= 35) return 'moderate';
    return 'low';
  }

  calculateRiskUrgency(value) {
    if (value >= 80 || value <= 20) return 'immediate';
    if (value >= 70 || value <= 30) return 'high';
    if (value >= 60 || value <= 40) return 'medium';
    return 'low';
  }

  generateRiskAdjustments(value) {
    if (value >= 75) {
      return ['Reduzir exposição 20-40%', 'Aumentar stop-losses', 'Eliminar alavancagem'];
    } else if (value <= 25) {
      return ['Aumentar exposição gradualmente', 'Relaxar stop-losses', 'Considerar oportunidades'];
    }
    return ['Manter exposição atual', 'Monitorar mudanças'];
  }

  recommendPositionSizing(value) {
    if (value >= 80) return 'very_small';
    if (value >= 70) return 'small';
    if (value >= 55) return 'moderate';
    if (value >= 45) return 'normal';
    if (value >= 30) return 'moderate_large';
    if (value >= 20) return 'large';
    return 'very_large';
  }

  recommendExposure(value) {
    if (value >= 80) return '20-40%';
    if (value >= 70) return '40-60%';
    if (value >= 55) return '60-80%';
    if (value >= 45) return '70-90%';
    if (value >= 30) return '80-100%';
    return '90-100%';
  }

  calculateMaxPositionSize(value) {
    if (value >= 80) return '2-5%';
    if (value >= 70) return '5-10%';
    if (value >= 55) return '10-15%';
    if (value >= 45) return '15-20%';
    if (value >= 30) return '20-25%';
    return '25-30%';
  }

  calculatePercentile(sortedValues, value) {
    let count = 0;
    for (let val of sortedValues) {
      if (val <= value) count++;
    }
    return (count / sortedValues.length) * 100;
  }

  calculateNextUpdate() {
    // Fear & Greed Index typically updates daily
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(12, 0, 0, 0); // Approximate update time
    return tomorrow.toISOString();
  }

  // FORMATTING & HEALTH

  formatSentimentData(sentimentData) {
    return {
      ...sentimentData,
      formatted: {
        value: `${sentimentData.primary_indicator.value}/100`,
        classification: `${sentimentData.primary_indicator.classification} ${sentimentData.primary_indicator.emoji}`,
        risk_level: `${sentimentData.risk_assessment.risk_level} (${sentimentData.risk_assessment.risk_score}/100)`,
        primary_action: sentimentData.trading_recommendations[0]?.action || 'HOLD'
      }
    };
  }

  async healthCheck() {
    try {
      const sentiment = await this.getFearGreedIndex();
      
      return {
        status: 'healthy',
        last_update: sentiment.timestamp,
        data_sources: Object.keys(this.sources),
        api_connectivity: !sentiment.fallback,
        cache_performance: this.cache.getStats()
      };
    } catch (error) {
      return {
        status: 'degraded',
        error: error.message,
        fallback_available: true
      };
    }
  }
}

module.exports = MarketSentiment;