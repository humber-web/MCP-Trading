// src/handlers/resources.js
const axios = require('axios');
const config = require('../utils/config');
const Formatter = require('../utils/formatter');

class ResourcesHandler {
  constructor(dependencies) {
    this.portfolio = dependencies.portfolio;
    this.cache = dependencies.cache;
    this.storage = dependencies.storage;
    this.stats = dependencies.stats;
    
    // Recursos MCP disponíveis
    this.resources = [
      {
        uri: "trading://portfolio",
        name: "Portfolio Atual",
        description: "Balanço, posições e P&L atual",
        mimeType: "application/json"
      },
      {
        uri: "trading://market/overview",
        name: "Visão Geral do Mercado",
        description: "Top cryptos com preços e variações",
        mimeType: "application/json"
      },
      {
        uri: "trading://sentiment",
        name: "Sentimento do Mercado", 
        description: "Fear & Greed Index e métricas de sentimento",
        mimeType: "application/json"
      },
      {
        uri: "trading://performance",
        name: "Performance Trading",
        description: "Estatísticas de trading e performance",
        mimeType: "application/json"
      },
      {
        uri: "trading://history",
        name: "Histórico de Trades",
        description: "Todas as transações realizadas",
        mimeType: "application/json"
      },
      {
        uri: "system://cache/stats",
        name: "Estatísticas do Cache",
        description: "Informações sobre uso do cache",
        mimeType: "application/json"
      },
      {
        uri: "system://server/health",
        name: "Saúde do Servidor",
        description: "Status e métricas do sistema",
        mimeType: "application/json"
      }
    ];
  }

  async listResources(params) {
    console.error('📚 Listando recursos MCP disponíveis');
    
    return {
      resources: this.resources
    };
  }

  async readResource(params) {
    const uri = params.uri;
    console.error(`📖 Lendo recurso: ${uri}`);

    try {
      let content;

      switch (uri) {
        case "trading://portfolio":
          content = await this.getPortfolioData();
          break;
          
        case "trading://market/overview":
          content = await this.getMarketOverview();
          break;
          
        case "trading://sentiment":
          content = await this.getMarketSentiment();
          break;
          
        case "trading://performance":
          content = await this.getPerformanceData();
          break;
          
        case "trading://history":
          content = await this.getTradesHistory();
          break;
          
        case "system://cache/stats":
          content = this.getCacheStats();
          break;
          
        case "system://server/health":
          content = await this.getServerHealth();
          break;
          
        default:
          throw new Error(`Recurso não encontrado: ${uri}`);
      }

      return {
        contents: [{
          uri: uri,
          mimeType: "application/json",
          text: JSON.stringify(content, null, 2)
        }]
      };

    } catch (error) {
      console.error(`❌ Erro ao ler recurso ${uri}:`, error.message);
      throw error;
    }
  }

  // IMPLEMENTAÇÃO DOS RECURSOS

  async getPortfolioData() {
    // Atualizar valor do portfolio
    await this.updatePortfolioValue();
    
    // Calcular resumo das posições
    const positionsSummary = await this.calculatePositionsSummary();
    
    return {
      portfolio: {
        balance_usd: this.portfolio.balance_usd,
        total_value: this.portfolio.total_value,
        total_pnl: this.portfolio.pnl,
        roi_percent: ((this.portfolio.total_value - config.trading.initial_balance) / config.trading.initial_balance) * 100,
        positions_count: Object.keys(this.portfolio.positions).length,
        created_at: this.portfolio.created_at,
        last_updated: Formatter.getTimestamp()
      },
      positions: positionsSummary,
      summary: {
        cash_percentage: (this.portfolio.balance_usd / this.portfolio.total_value) * 100,
        invested_percentage: ((this.portfolio.total_value - this.portfolio.balance_usd) / this.portfolio.total_value) * 100,
        total_trades: this.portfolio.trades_history.length
      }
    };
  }

  async getMarketOverview() {
    const cacheKey = 'market_overview';
    let cached = this.cache.getMarket(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      const response = await axios.get(`${config.apis.coingecko.base_url}/simple/price`, {
        params: {
          ids: config.supported_coins.join(','),
          vs_currencies: 'usd',
          include_24hr_change: true,
          include_market_cap: true,
          include_24hr_vol: true
        },
        timeout: config.apis.coingecko.timeout
      });

      this.stats.api_calls++;

      const overview = Object.entries(response.data).map(([id, data]) => ({
        coin_id: id,
        name: Formatter.formatCoinName(id),
        price: data.usd,
        change_24h: data.usd_24h_change || 0,
        market_cap: data.usd_market_cap || 0,
        volume_24h: data.usd_24h_vol || 0,
        price_formatted: Formatter.formatPrice(data.usd),
        change_formatted: Formatter.formatPriceChange(data.usd_24h_change || 0),
        market_cap_formatted: Formatter.formatNumber(data.usd_market_cap || 0)
      })).sort((a, b) => b.market_cap - a.market_cap);

      const marketData = {
        timestamp: Formatter.getTimestamp(),
        total_coins: overview.length,
        market_overview: overview,
        summary: {
          gainers: overview.filter(c => c.change_24h > 0).length,
          losers: overview.filter(c => c.change_24h < 0).length,
          stable: overview.filter(c => Math.abs(c.change_24h) < 1).length
        }
      };

      this.cache.setMarket(cacheKey, marketData);
      return marketData;

    } catch (error) {
      throw new Error(`Erro ao obter overview do mercado: ${error.message}`);
    }
  }

  async getMarketSentiment() {
    const cacheKey = 'market_sentiment';
    let cached = this.cache.getMarket(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      const response = await axios.get(config.apis.fear_greed.base_url, {
        timeout: config.apis.fear_greed.timeout
      });
      
      this.stats.api_calls++;
      
      const fgData = response.data.data[0];
      const value = parseInt(fgData.value);
      
      const sentimentData = {
        fear_greed_index: {
          value: value,
          classification: Formatter.formatSentiment(value),
          last_update: fgData.timestamp,
          timestamp: Formatter.getTimestamp()
        },
        recommendation: this.getSentimentRecommendation(value),
        market_phases: {
          extreme_fear: value <= 24,
          fear: value >= 25 && value <= 44,
          neutral: value >= 45 && value <= 54,
          greed: value >= 55 && value <= 74,
          extreme_greed: value >= 75
        },
        trading_signals: this.generateSentimentSignals(value)
      };

      this.cache.setMarket(cacheKey, sentimentData);
      return sentimentData;

    } catch (error) {
      // Retornar dados padrão se API falhar
      return {
        error: "Não foi possível obter dados de sentimento",
        fallback_data: {
          fear_greed_index: {
            value: 50,
            classification: "Neutro 😐",
            note: "Dados indisponíveis, usando valor neutro"
          }
        },
        timestamp: Formatter.getTimestamp()
      };
    }
  }

  async getPerformanceData() {
    const winRate = this.stats.total_trades > 0 ? 
      (this.stats.winning_trades / this.stats.total_trades) * 100 : 0;

    const avgTradeSize = this.portfolio.trades_history.length > 0 ?
      this.portfolio.trades_history.reduce((sum, t) => sum + t.amount_usd, 0) / this.portfolio.trades_history.length : 0;

    return {
      portfolio_performance: {
        total_value: this.portfolio.total_value,
        initial_value: config.trading.initial_balance,
        total_pnl: this.portfolio.pnl,
        roi_percent: ((this.portfolio.total_value - config.trading.initial_balance) / config.trading.initial_balance) * 100,
        performance_rating: this.calculatePerformanceRating()
      },
      trading_statistics: {
        total_trades: this.stats.total_trades,
        winning_trades: this.stats.winning_trades,
        losing_trades: this.stats.losing_trades,
        win_rate_percent: winRate,
        best_trade: this.stats.best_trade,
        worst_trade: this.stats.worst_trade,
        avg_trade_size: avgTradeSize,
        total_fees_paid: this.stats.total_fees_paid
      },
      system_performance: {
        api_calls: this.stats.api_calls,
        cache_hits: this.stats.cache_hits,
        cache_hit_rate: this.stats.api_calls > 0 ? 
          (this.stats.cache_hits / (this.stats.api_calls + this.stats.cache_hits)) * 100 : 0,
        uptime_seconds: process.uptime(),
        memory_usage: process.memoryUsage()
      },
      timestamp: Formatter.getTimestamp()
    };
  }

  async getTradesHistory() {
    const recentTrades = this.portfolio.trades_history.slice(-20); // Últimos 20 trades
    
    const tradesSummary = {
      total_trades: this.portfolio.trades_history.length,
      recent_trades: recentTrades.map(trade => ({
        ...trade,
        formatted_amount: Formatter.formatPrice(trade.amount_usd),
        formatted_price: Formatter.formatPrice(trade.price),
        formatted_pnl: trade.pnl ? Formatter.formatPnL(trade.pnl, trade.pnl_percent) : null,
        coin_name: Formatter.formatCoinName(trade.coin),
        formatted_timestamp: Formatter.formatDateTime(trade.timestamp)
      })),
      summary: this.calculateTradesSummary(),
      performance_by_coin: this.calculatePerformanceByCoin()
    };

    return tradesSummary;
  }

  getCacheStats() {
    return {
      cache_statistics: this.cache.getStats(),
      performance_impact: {
        estimated_api_calls_saved: this.stats.cache_hits,
        estimated_time_saved_ms: this.stats.cache_hits * 200, // Estimativa de 200ms por API call
        bandwidth_saved_estimate: `${(this.stats.cache_hits * 2).toFixed(1)}KB` // Estimativa
      },
      recommendations: this.generateCacheRecommendations()
    };
  }

  async getServerHealth() {
    const memUsage = process.memoryUsage();
    const uptime = process.uptime();

    return {
      status: this.calculateHealthStatus(),
      uptime: {
        seconds: uptime,
        formatted: this.formatUptime(uptime),
        started_at: new Date(Date.now() - uptime * 1000).toISOString()
      },
      memory: {
        heap_used_mb: Math.round(memUsage.heapUsed / 1024 / 1024),
        heap_total_mb: Math.round(memUsage.heapTotal / 1024 / 1024),
        external_mb: Math.round(memUsage.external / 1024 / 1024),
        rss_mb: Math.round(memUsage.rss / 1024 / 1024)
      },
      portfolio_health: await this.assessPortfolioHealth(),
      warnings: this.generateHealthWarnings(),
      recommendations: this.generateHealthRecommendations()
    };
  }

  // MÉTODOS AUXILIARES

  async updatePortfolioValue() {
    let totalValue = this.portfolio.balance_usd;
    
    for (const [coin, position] of Object.entries(this.portfolio.positions)) {
      try {
        const currentPrice = await this.getCurrentPrice(coin);
        const value = position.quantity * currentPrice;
        totalValue += value;
      } catch (error) {
        console.error(`⚠️ Erro ao atualizar preço de ${coin}:`, error.message);
      }
    }
    
    this.portfolio.total_value = totalValue;
  }

  async calculatePositionsSummary() {
    const summary = [];
    
    for (const [coin, position] of Object.entries(this.portfolio.positions)) {
      try {
        const currentPrice = await this.getCurrentPrice(coin);
        const currentValue = position.quantity * currentPrice;
        const costBasis = position.quantity * position.avg_price;
        const pnl = currentValue - costBasis;
        const pnlPercent = (pnl / costBasis) * 100;
        
        summary.push({
          coin: coin,
          coin_name: Formatter.formatCoinName(coin),
          quantity: position.quantity,
          avg_price: position.avg_price,
          current_price: currentPrice,
          current_value: currentValue,
          cost_basis: costBasis,
          pnl: pnl,
          pnl_percent: pnlPercent,
          allocation_percent: (currentValue / this.portfolio.total_value) * 100,
          formatted: {
            current_value: Formatter.formatPrice(currentValue),
            pnl: Formatter.formatPnL(pnl, pnlPercent),
            avg_price: Formatter.formatPrice(position.avg_price),
            current_price: Formatter.formatPrice(currentPrice)
          }
        });
      } catch (error) {
        console.error(`❌ Erro na posição ${coin}:`, error.message);
      }
    }
    
    return summary;
  }

  async getCurrentPrice(coin) {
    const cacheKey = `price_${coin}`;
    let cached = this.cache.getPrice(cacheKey);
    
    if (cached) {
      return cached.price;
    }

    try {
      const response = await axios.get(`${config.apis.coingecko.base_url}/simple/price`, {
        params: {
          ids: coin,
          vs_currencies: 'usd'
        },
        timeout: config.apis.coingecko.timeout
      });

      this.stats.api_calls++;
      const price = response.data[coin].usd;
      
      this.cache.setPrice(cacheKey, {
        price: price,
        timestamp: Formatter.getTimestamp()
      });

      return price;
    } catch (error) {
      throw new Error(`Erro ao obter preço de ${coin}: ${error.message}`);
    }
  }

  calculateTradesSummary() {
    if (this.portfolio.trades_history.length === 0) {
      return { message: "Nenhum trade realizado ainda" };
    }

    const trades = this.portfolio.trades_history;
    const buyTrades = trades.filter(t => t.type === 'BUY');
    const sellTrades = trades.filter(t => t.type === 'SELL');

    return {
      total_trades: trades.length,
      buy_trades: buyTrades.length,
      sell_trades: sellTrades.length,
      total_volume: trades.reduce((sum, t) => sum + t.amount_usd, 0),
      total_fees: trades.reduce((sum, t) => sum + t.fee, 0),
      realized_pnl: sellTrades.reduce((sum, t) => sum + (t.pnl || 0), 0),
      avg_trade_size: trades.length > 0 ? trades.reduce((sum, t) => sum + t.amount_usd, 0) / trades.length : 0
    };
  }

  calculatePerformanceByCoin() {
    const coinPerformance = {};
    
    this.portfolio.trades_history.forEach(trade => {
      if (!coinPerformance[trade.coin]) {
        coinPerformance[trade.coin] = {
          coin_name: Formatter.formatCoinName(trade.coin),
          total_trades: 0,
          total_volume: 0,
          realized_pnl: 0
        };
      }
      
      coinPerformance[trade.coin].total_trades++;
      coinPerformance[trade.coin].total_volume += trade.amount_usd;
      
      if (trade.pnl) {
        coinPerformance[trade.coin].realized_pnl += trade.pnl;
      }
    });
    
    return coinPerformance;
  }

  getSentimentRecommendation(fgValue) {
    if (fgValue >= 75) return "Mercado em extreme greed - cuidado com correções, considere take profits";
    if (fgValue >= 55) return "Greed no mercado - bom momento para take profits parciais";
    if (fgValue >= 45) return "Mercado equilibrado - mantenha estratégia atual";
    if (fgValue >= 25) return "Fear no mercado - oportunidades de compra podem surgir";
    return "Extreme fear - excelente momento para acumular posições de longo prazo";
  }

  generateSentimentSignals(fgValue) {
    return {
      buy_signal: fgValue <= 30,
      sell_signal: fgValue >= 70,
      hold_signal: fgValue > 30 && fgValue < 70,
      strength: fgValue <= 20 || fgValue >= 80 ? 'strong' : 'moderate'
    };
  }

  calculatePerformanceRating() {
    const roi = ((this.portfolio.total_value - config.trading.initial_balance) / config.trading.initial_balance) * 100;
    
    if (roi >= 50) return 'Excellent ⭐⭐⭐⭐⭐';
    if (roi >= 20) return 'Great ⭐⭐⭐⭐';
    if (roi >= 10) return 'Good ⭐⭐⭐';
    if (roi >= 0) return 'Fair ⭐⭐';
    if (roi >= -10) return 'Poor ⭐';
    return 'Very Poor 💀';
  }

  calculateHealthStatus() {
    const memUsage = process.memoryUsage();
    const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
    
    if (heapUsedMB > 500) return 'warning';
    if (this.stats.total_trades > 0 && this.stats.winning_trades / this.stats.total_trades < 0.3) return 'warning';
    
    return 'healthy';
  }

  async assessPortfolioHealth() {
    const roi = ((this.portfolio.total_value - config.trading.initial_balance) / config.trading.initial_balance) * 100;
    const cashPercent = (this.portfolio.balance_usd / this.portfolio.total_value) * 100;
    const positionsCount = Object.keys(this.portfolio.positions).length;
    
    let status = 'healthy';
    const issues = [];
    
    if (roi < -20) {
      status = 'critical';
      issues.push('Portfolio perdeu mais de 20%');
    } else if (roi < -10) {
      status = 'warning';
      issues.push('Portfolio com perdas significativas');
    }
    
    if (positionsCount === 1) {
      issues.push('Portfolio muito concentrado');
    }
    
    if (cashPercent < 5) {
      issues.push('Reserva de cash muito baixa');
    }
    
    return {
      status,
      roi_percent: roi,
      cash_percent: cashPercent,
      positions_count: positionsCount,
      issues
    };
  }

  generateHealthWarnings() {
    const warnings = [];
    const memUsage = process.memoryUsage();
    
    if (memUsage.heapUsed > 400 * 1024 * 1024) {
      warnings.push('Alto uso de memória');
    }
    
    if (this.stats.api_calls > 1000) {
      warnings.push('Muitas chamadas de API - considere otimizar cache');
    }
    
    return warnings;
  }

  generateHealthRecommendations() {
    const recommendations = [];
    const cacheStats = this.cache.getStats();
    
    if (cacheStats.hit_rate < 70) {
      recommendations.push('Melhorar hit rate do cache');
    }
    
    if (Object.keys(this.portfolio.positions).length > 8) {
      recommendations.push('Considere consolidar posições');
    }
    
    return recommendations;
  }

  generateCacheRecommendations() {
    const stats = this.cache.getStats();
    const recommendations = [];
    
    if (stats.hit_rate < 70) {
      recommendations.push('Aumentar TTL para melhorar hit rate');
    }
    
    if (stats.total_keys > 100) {
      recommendations.push('Implementar cleanup automático');
    }
    
    return recommendations;
  }

  formatUptime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    return `${hours}h ${minutes}m ${secs}s`;
  }
}

module.exports = ResourcesHandler;