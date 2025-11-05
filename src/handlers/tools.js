// src/handlers/tools.js
const axios = require('axios');
const config = require('../utils/config');
const Formatter = require('../utils/formatter');
const { Validator, ValidationError } = require('../utils/validation');

class ToolsHandler {
  constructor(dependencies) {
    this.portfolio = dependencies.portfolio;
    this.cache = dependencies.cache;
    this.storage = dependencies.storage;
    this.stats = dependencies.stats;
    this.onPortfolioUpdate = dependencies.onPortfolioUpdate;
    this.onStatsUpdate = dependencies.onStatsUpdate;
    
    // Ferramentas MCP disponíveis
    this.tools = [
      {
        name: "get_price",
        description: "Obter preço atual de uma crypto",
        inputSchema: {
          type: "object",
          properties: {
            coin: { 
              type: "string", 
              description: "Nome da crypto (ex: bitcoin, ethereum)",
              enum: config.supported_coins
            }
          },
          required: ["coin"]
        }
      },
      {
        name: "analyze_coin",
        description: "Análise completa de uma crypto com indicadores técnicos",
        inputSchema: {
          type: "object",
          properties: {
            coin: { 
              type: "string", 
              description: "Nome da crypto",
              enum: config.supported_coins
            },
            days: { 
              type: "number", 
              description: "Período para análise (1-365 dias)",
              default: 7,
              minimum: 1,
              maximum: 365
            }
          },
          required: ["coin"]
        }
      },
      {
        name: "buy_crypto",
        description: "Comprar crypto (paper trading)",
        inputSchema: {
          type: "object",
          properties: {
            coin: { 
              type: "string", 
              enum: config.supported_coins 
            },
            amount_usd: { 
              type: "number", 
              description: "Valor em USD para comprar",
              minimum: 10
            },
            stop_loss: {
              type: "number",
              description: "Preço de stop loss (opcional)",
              minimum: 0
            },
            take_profit: {
              type: "number", 
              description: "Preço de take profit (opcional)",
              minimum: 0
            }
          },
          required: ["coin", "amount_usd"]
        }
      },
      {
        name: "sell_crypto", 
        description: "Vender crypto (paper trading)",
        inputSchema: {
          type: "object",
          properties: {
            coin: { 
              type: "string",
              enum: config.supported_coins
            },
            percentage: {
              type: "number",
              description: "Percentagem da posição a vender (1-100)",
              minimum: 1,
              maximum: 100,
              default: 100
            }
          },
          required: ["coin"]
        }
      },
      {
        name: "market_scan",
        description: "Scan do mercado por oportunidades de trading",
        inputSchema: {
          type: "object",
          properties: {
            type: {
              type: "string",
              enum: ["gainers", "losers", "high_volume", "oversold", "overbought"],
              default: "gainers",
              description: "Tipo de scan a realizar"
            },
            limit: { 
              type: "number", 
              default: 5, 
              maximum: 20,
              description: "Número máximo de resultados"
            }
          }
        }
      },
      {
        name: "set_alerts",
        description: "Configurar alertas de preço para uma crypto",
        inputSchema: {
          type: "object", 
          properties: {
            coin: { 
              type: "string", 
              enum: config.supported_coins,
              description: "Crypto para configurar alertas"
            },
            price_above: { 
              type: "number", 
              description: "Alertar se preço subir acima deste valor"
            },
            price_below: { 
              type: "number", 
              description: "Alertar se preço descer abaixo deste valor"
            }
          },
          required: ["coin"]
        }
      },
      {
        name: "portfolio_rebalance",
        description: "Analisar e sugerir rebalanceamento do portfolio",
        inputSchema: {
          type: "object",
          properties: {
            target_allocation: {
              type: "object",
              description: "Alocação desejada por crypto (percentagens)",
              additionalProperties: {
                type: "number",
                minimum: 0,
                maximum: 100
              }
            }
          }
        }
      },
      {
        name: "risk_analysis",
        description: "Análise de risco de uma posição antes de executar",
        inputSchema: {
          type: "object",
          properties: {
            coin: {
              type: "string",
              enum: config.supported_coins
            },
            amount_usd: {
              type: "number",
              minimum: 10
            },
            action: {
              type: "string",
              enum: ["buy", "sell"],
              description: "Ação pretendida"
            }
          },
          required: ["coin", "amount_usd", "action"]
        }
      }
    ];
  }

  async listTools(params) {
    console.error('🔧 Listando ferramentas MCP disponíveis');
    
    return {
      tools: this.tools
    };
  }

  async callTool(params) {
    const { name, arguments: args } = params;
    console.error(`⚙️ Executando ferramenta: ${name}`);

    try {
      let result;

      switch (name) {
        case "get_price":
          result = await this.getPrice(args.coin);
          break;
        case "analyze_coin":
          result = await this.analyzeCoin(args.coin, args.days || 7);
          break;
        case "buy_crypto":
          result = await this.buyCrypto(args.coin, args.amount_usd, args.stop_loss, args.take_profit);
          break;
        case "sell_crypto":
          result = await this.sellCrypto(args.coin, args.percentage || 100);
          break;
        case "market_scan":
          result = await this.marketScan(args.type || "gainers", args.limit || 5);
          break;
        case "set_alerts":
          result = await this.setAlerts(args.coin, args.price_above, args.price_below);
          break;
        case "portfolio_rebalance":
          result = await this.portfolioRebalance(args.target_allocation);
          break;
        case "risk_analysis":
          result = await this.riskAnalysis(args.coin, args.amount_usd, args.action);
          break;
        default:
          throw new Error(`Ferramenta não encontrada: ${name}`);
      }

      return {
        content: [{
          type: "text",
          text: result
        }]
      };

    } catch (error) {
      console.error(`❌ Erro na ferramenta ${name}:`, error.message);
      await this.storage.logError(error, `tool_${name}`);

      // Handle validation errors specially
      if (error instanceof ValidationError) {
        const errorMsg = `❌ **Validation Error**\n\n${error.message}` +
          (error.field ? `\n\n**Field:** ${error.field}` : '');

        return {
          content: [{
            type: "text",
            text: errorMsg
          }],
          isError: true
        };
      }

      throw error;
    }
  }

  // IMPLEMENTAÇÃO DAS FERRAMENTAS

  async getPrice(coin) {
    // Validate coin input
    coin = Validator.validateCoin(coin);

    const cacheKey = `price_${coin}`;
    let cached = this.cache.getPrice(cacheKey);
    
    if (cached) {
      return `💰 **${Formatter.formatCoinName(coin)}**\n\n` +
             `💵 Preço: ${Formatter.formatPrice(cached.price)}\n` +
             `📈 24h: ${Formatter.formatPriceChange(cached.change_24h || 0)}\n` +
             `🕐 ${Formatter.formatDateTime(cached.last_updated)}\n\n` +
             `⚡ *Dados do cache*`;
    }

    try {
      const response = await axios.get(`${config.apis.coingecko.base_url}/simple/price`, {
        params: {
          ids: coin,
          vs_currencies: 'usd',
          include_24hr_change: true,
          include_last_updated_at: true
        },
        timeout: config.apis.coingecko.timeout
      });

      this.stats.api_calls++;
      this.onStatsUpdate(this.stats);
      
      const data = response.data[coin];
      const priceData = {
        price: data.usd,
        change_24h: data.usd_24h_change || 0,
        last_updated: Formatter.formatDateTime()
      };

      this.cache.setPrice(cacheKey, priceData);

      return `💰 **${Formatter.formatCoinName(coin)}**\n\n` +
             `💵 Preço: ${Formatter.formatPrice(priceData.price)}\n` +
             `📈 24h: ${Formatter.formatPriceChange(priceData.change_24h)}\n` +
             `🕐 ${priceData.last_updated}\n\n` +
             `🌐 *Dados da API*`;
      
    } catch (error) {
      throw new Error(`Erro ao obter preço de ${coin}: ${error.message}`);
    }
  }

  async analyzeCoin(coin, days = 7) {
    // Validate inputs
    coin = Validator.validateCoin(coin);
    days = Validator.validateDays(days);

    const cacheKey = `analysis_${coin}_${days}`;
    let cached = this.cache.getAnalysis(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      // Dados históricos de preço
      const historyResponse = await axios.get(`${config.apis.coingecko.base_url}/coins/${coin}/market_chart`, {
        params: {
          vs_currency: 'usd',
          days: days,
          interval: days <= 1 ? 'hourly' : 'daily'
        },
        timeout: config.apis.coingecko.timeout
      });

      // Dados básicos da moeda
      const coinResponse = await axios.get(`${config.apis.coingecko.base_url}/coins/${coin}`, {
        timeout: config.apis.coingecko.timeout
      });
      
      this.stats.api_calls += 2;
      this.onStatsUpdate(this.stats);

      const prices = historyResponse.data.prices.map(p => p[1]);
      const volumes = historyResponse.data.total_volumes.map(v => v[1]);
      
      const analysis = this.calculateTechnicalAnalysis(prices, volumes);
      analysis.coin = coin;
      analysis.days = days;
      analysis.market_data = coinResponse.data.market_data;
      
      const formattedAnalysis = Formatter.formatCoinAnalysis({
        coin: coin,
        days: days,
        current_price: analysis.current_price,
        period_change: analysis.period_change,
        volatility: analysis.volatility,
        support: analysis.support,
        resistance: analysis.resistance,
        avg_price: analysis.avg_price,
        signal: analysis.signal,
        confidence: analysis.confidence,
        trend: analysis.trend,
        market_cap: coinResponse.data.market_data.market_cap?.usd || 0,
        volume_24h: coinResponse.data.market_data.total_volume?.usd || 0
      });

      this.cache.setAnalysis(cacheKey, formattedAnalysis);
      return formattedAnalysis;

    } catch (error) {
      throw new Error(`Erro na análise de ${coin}: ${error.message}`);
    }
  }

  async buyCrypto(coin, amountUsd, stopLoss = null, takeProfit = null) {
    try {
      // Get current price first for validation
      const priceData = await this.getCurrentPriceData(coin);
      const price = priceData.usd;

      // Comprehensive input validation
      const validated = Validator.validateBuyTrade(
        coin,
        amountUsd,
        this.portfolio.balance_usd,
        this.portfolio.total_value,
        stopLoss,
        takeProfit,
        price
      );

      // Use validated values
      coin = validated.coin;
      amountUsd = validated.amount_usd;
      stopLoss = validated.stop_loss;
      takeProfit = validated.take_profit;

      // Verificações de risco antes da compra
      await this.validateTradeRisk(coin, amountUsd, 'buy');
      const fee = amountUsd * config.trading.trading_fee;
      const amountAfterFee = amountUsd - fee;
      const quantity = amountAfterFee / price;

      // Criar trade
      const trade = {
        id: Formatter.generateTradeId(),
        type: 'BUY',
        coin: coin,
        quantity: quantity,
        price: price,
        amount_usd: amountUsd,
        fee: fee,
        timestamp: Formatter.getTimestamp(),
        stop_loss: stopLoss,
        take_profit: takeProfit
      };

      // Atualizar portfolio
      this.portfolio.balance_usd -= amountUsd;
      
      if (this.portfolio.positions[coin]) {
        // Posição existente - calcular preço médio
        const existingPosition = this.portfolio.positions[coin];
        const existingValue = existingPosition.quantity * existingPosition.avg_price;
        const newTotalValue = existingValue + amountAfterFee;
        const newTotalQuantity = existingPosition.quantity + quantity;

        // Preserve stop_loss and take_profit from existing position
        // Only update if new values are provided
        const preservedStopLoss = stopLoss !== null ? stopLoss : existingPosition.stop_loss;
        const preservedTakeProfit = takeProfit !== null ? takeProfit : existingPosition.take_profit;

        this.portfolio.positions[coin] = {
          ...existingPosition,
          quantity: newTotalQuantity,
          avg_price: newTotalValue / newTotalQuantity,
          stop_loss: preservedStopLoss,
          take_profit: preservedTakeProfit,
          last_updated: trade.timestamp
        };
      } else {
        // Nova posição
        this.portfolio.positions[coin] = {
          quantity: quantity,
          avg_price: price,
          stop_loss: stopLoss,
          take_profit: takeProfit,
          created_at: trade.timestamp,
          last_updated: trade.timestamp
        };
      }

      // Atualizar histórico e stats
      this.portfolio.trades_history.push(trade);
      this.stats.total_trades++;
      this.stats.total_fees_paid += fee;

      // Salvar alterações
      await this.onPortfolioUpdate(this.portfolio);
      await this.onStatsUpdate(this.stats);
      await this.storage.logTrade(trade);

      return Formatter.formatTradeExecution(trade, 'executed') + 
             `\n💳 **Saldo restante:** ${Formatter.formatPrice(this.portfolio.balance_usd)}`;

    } catch (error) {
      throw new Error(`Erro na compra: ${error.message}`);
    }
  }

  async sellCrypto(coin, percentage = 100) {
    try {
      // Comprehensive input validation
      const validated = Validator.validateSellTrade(
        coin,
        percentage,
        this.portfolio.positions
      );

      // Use validated values
      coin = validated.coin;
      percentage = validated.percentage;

      const position = this.portfolio.positions[coin];
      const quantityToSell = position.quantity * (percentage / 100);
      
      // Obter preço atual
      const priceData = await this.getCurrentPriceData(coin);
      const currentPrice = priceData.usd;
      const amountUsd = quantityToSell * currentPrice;
      const fee = amountUsd * config.trading.trading_fee;
      const amountAfterFee = amountUsd - fee;

      // Calcular P&L
      const costBasis = quantityToSell * position.avg_price;
      const pnl = amountAfterFee - costBasis;
      const pnlPercent = (pnl / costBasis) * 100;

      // Criar trade
      const trade = {
        id: Formatter.generateTradeId(),
        type: 'SELL',
        coin: coin,
        quantity: quantityToSell,
        price: currentPrice,
        amount_usd: amountUsd,
        fee: fee,
        pnl: pnl,
        pnl_percent: pnlPercent,
        timestamp: Formatter.getTimestamp()
      };

      // Atualizar portfolio
      this.portfolio.balance_usd += amountAfterFee;
      
      if (percentage >= 100) {
        // Vender tudo - remover posição
        delete this.portfolio.positions[coin];
      } else {
        // Venda parcial - atualizar quantidade
        this.portfolio.positions[coin].quantity -= quantityToSell;
        this.portfolio.positions[coin].last_updated = trade.timestamp;
      }

      // Atualizar stats
      this.portfolio.trades_history.push(trade);
      this.portfolio.pnl += pnl;
      this.stats.total_trades++;
      this.stats.total_fees_paid += fee;
      
      if (pnl > 0) {
        this.stats.winning_trades++;
        if (pnl > this.stats.best_trade) this.stats.best_trade = pnl;
      } else {
        this.stats.losing_trades++;
        if (pnl < this.stats.worst_trade) this.stats.worst_trade = pnl;
      }

      // Salvar alterações
      await this.onPortfolioUpdate(this.portfolio);
      await this.onStatsUpdate(this.stats);
      await this.storage.logTrade(trade);

      return Formatter.formatTradeExecution(trade, 'executed') + 
             `\n💳 **Novo saldo:** ${Formatter.formatPrice(this.portfolio.balance_usd)}`;

    } catch (error) {
      throw new Error(`Erro na venda: ${error.message}`);
    }
  }

  async marketScan(type = "gainers", limit = 5) {
    try {
      // Validate inputs
      type = Validator.validateScanType(type);
      limit = Validator.validateLimit(limit, 5, 20);

      const cacheKey = `scan_${type}_${limit}`;
      let cached = this.cache.getMarket(cacheKey);
      
      if (cached) {
        return cached;
      }

      const coinsParam = config.supported_coins.join(',');
      const response = await axios.get(`${config.apis.coingecko.base_url}/simple/price`, {
        params: {
          ids: coinsParam,
          vs_currencies: 'usd',
          include_24hr_change: true,
          include_24hr_vol: true
        },
        timeout: config.apis.coingecko.timeout
      });

      this.stats.api_calls++;
      this.onStatsUpdate(this.stats);

      const coins = Object.entries(response.data).map(([id, data]) => ({
        id,
        name: Formatter.formatCoinName(id),
        price: data.usd,
        change_24h: data.usd_24h_change || 0,
        volume_24h: data.usd_24h_vol || 0
      }));

      let filtered = this.applyScanFilter(coins, type);
      const results = filtered.slice(0, limit);
      
      const scanResult = Formatter.formatMarketScan(results, type, limit);
      
      this.cache.setMarket(cacheKey, scanResult);
      return scanResult;

    } catch (error) {
      throw new Error(`Erro no market scan: ${error.message}`);
    }
  }

  async setAlerts(coin, priceAbove = null, priceBelow = null) {
    try {
      const currentPrice = await this.getCurrentPriceData(coin);
      
      return Formatter.formatAlerts(
        coin, 
        currentPrice.usd, 
        priceAbove, 
        priceBelow
      );
    } catch (error) {
      throw new Error(`Erro ao configurar alertas: ${error.message}`);
    }
  }

  async portfolioRebalance(targetAllocation = null) {
    try {
      // Atualizar valor total do portfolio
      await this.updatePortfolioValue();
      
      const recommendations = [];
      const positions = Object.entries(this.portfolio.positions);
      const cashPercent = (this.portfolio.balance_usd / this.portfolio.total_value) * 100;
      
      // Análise de concentração
      if (positions.length === 1) {
        recommendations.push('Portfolio muito concentrado - diversifique em mais cryptos');
      } else if (positions.length > 7) {
        recommendations.push('Portfolio muito fragmentado - considere consolidar posições');
      }
      
      // Análise de cash
      if (cashPercent < 5) {
        recommendations.push('Cash muito baixo - mantenha pelo menos 5-10% em reserva');
      } else if (cashPercent > 30) {
        recommendations.push('Muito cash parado - considere investir parte');
      }
      
      // Verificar posições muito grandes
      for (const [coin, position] of positions) {
        const currentPrice = await this.getCurrentPriceData(coin);
        const value = position.quantity * currentPrice.usd;
        const percentage = (value / this.portfolio.total_value) * 100;
        
        if (percentage > 40) {
          recommendations.push(`${Formatter.formatCoinName(coin)} representa ${percentage.toFixed(1)}% - considere reduzir posição`);
        }
      }
      
      return Formatter.formatRebalanceReport(this.portfolio, recommendations);
      
    } catch (error) {
      throw new Error(`Erro no rebalanceamento: ${error.message}`);
    }
  }

  async riskAnalysis(coin, amountUsd, action) {
    try {
      const analysis = {
        coin: Formatter.formatCoinName(coin),
        action: action.toUpperCase(),
        amount: Formatter.formatPrice(amountUsd),
        risk_factors: [],
        recommendations: [],
        risk_score: 0 // 0-100
      };

      // Análise de concentração
      const portfolioValue = this.portfolio.total_value;
      const positionPercent = (amountUsd / portfolioValue) * 100;
      
      if (positionPercent > 20) {
        analysis.risk_factors.push(`Posição representa ${positionPercent.toFixed(1)}% do portfolio`);
        analysis.risk_score += 30;
      }

      // Análise de liquidez
      if (action === 'buy' && amountUsd > this.portfolio.balance_usd) {
        analysis.risk_factors.push('Saldo insuficiente para esta operação');
        analysis.risk_score += 50;
      }

      // Análise de posição existente
      if (this.portfolio.positions[coin]) {
        const currentPosition = this.portfolio.positions[coin];
        const currentValue = currentPosition.quantity * (await this.getCurrentPriceData(coin)).usd;
        
        if (action === 'buy') {
          const newTotalPercent = ((currentValue + amountUsd) / portfolioValue) * 100;
          if (newTotalPercent > 30) {
            analysis.risk_factors.push(`Posição total ficaria ${newTotalPercent.toFixed(1)}% do portfolio`);
            analysis.risk_score += 25;
          }
        }
      }

      // Análise de volatilidade (simulada)
      const volatilityRisk = this.estimateVolatilityRisk(coin);
      analysis.risk_score += volatilityRisk;
      
      if (volatilityRisk > 20) {
        analysis.risk_factors.push('Alta volatilidade histórica');
      }

      // Recomendações baseadas no score
      if (analysis.risk_score > 70) {
        analysis.recommendations.push('❌ Operação de alto risco - reconsidere');
        analysis.recommendations.push('Reduza o valor da operação');
      } else if (analysis.risk_score > 40) {
        analysis.recommendations.push('⚠️ Risco moderado - proceda com cautela');
        analysis.recommendations.push('Considere definir stop-loss');
      } else {
        analysis.recommendations.push('✅ Risco baixo - operação aceitável');
      }

      let result = `🛡️ **Análise de Risco**\n\n`;
      result += `🪙 **Crypto:** ${analysis.coin}\n`;
      result += `⚡ **Ação:** ${analysis.action}\n`;
      result += `💰 **Valor:** ${analysis.amount}\n`;
      result += `📊 **Score de Risco:** ${analysis.risk_score}/100\n\n`;
      
      if (analysis.risk_factors.length > 0) {
        result += `⚠️ **Fatores de Risco:**\n`;
        analysis.risk_factors.forEach(factor => {
          result += `• ${factor}\n`;
        });
        result += '\n';
      }
      
      result += `💡 **Recomendações:**\n`;
      analysis.recommendations.forEach(rec => {
        result += `• ${rec}\n`;
      });

      return result;

    } catch (error) {
      throw new Error(`Erro na análise de risco: ${error.message}`);
    }
  }

  // MÉTODOS AUXILIARES

  async getCurrentPriceData(coin) {
    const response = await axios.get(`${config.apis.coingecko.base_url}/simple/price`, {
      params: {
        ids: coin,
        vs_currencies: 'usd'
      },
      timeout: config.apis.coingecko.timeout
    });
    this.stats.api_calls++;
    this.onStatsUpdate(this.stats);
    return response.data[coin];
  }

  async validateTradeRisk(coin, amountUsd, action) {
    // Verificar saldo suficiente
    if (action === 'buy' && amountUsd > this.portfolio.balance_usd) {
      throw new Error(`Saldo insuficiente. Disponível: ${Formatter.formatPrice(this.portfolio.balance_usd)}`);
    }

    // Verificar limite de posição
    const maxPosition = this.portfolio.total_value * config.trading.max_position_size;
    if (action === 'buy' && amountUsd > maxPosition) {
      throw new Error(`Posição excede limite de ${(config.trading.max_position_size * 100).toFixed(0)}%. Máximo: ${Formatter.formatPrice(maxPosition)}`);
    }
  }

  calculateTechnicalAnalysis(prices, volumes) {
    const currentPrice = prices[prices.length - 1];
    const startPrice = prices[0];
    const change = ((currentPrice - startPrice) / startPrice) * 100;
    
    // Cálculos básicos
    const maxPrice = Math.max(...prices);
    const minPrice = Math.min(...prices);
    const avgPrice = prices.reduce((a, b) => a + b) / prices.length;
    const volatility = this.calculateVolatility(prices);
    const trend = this.calculateTrend(prices);
    
    // Suporte e resistência
    const support = minPrice * 1.02;
    const resistance = maxPrice * 0.98;
    
    // Determinar sinal
    let signal = "HOLD";
    let confidence = 0.5;
    
    if (currentPrice < avgPrice * 0.95 && trend > 0) {
      signal = "BUY";
      confidence = 0.75;
    } else if (currentPrice > avgPrice * 1.05 && trend < 0) {
      signal = "SELL";
      confidence = 0.75;
    }

    return {
      current_price: currentPrice,
      period_change: change,
      max_price: maxPrice,
      min_price: minPrice,
      avg_price: avgPrice,
      volatility: volatility,
      trend: trend,
      support: support,
      resistance: resistance,
      signal: signal,
      confidence: confidence
    };
  }

  calculateVolatility(prices) {
    if (prices.length < 2) return 0;
    
    const returns = [];
    for (let i = 1; i < prices.length; i++) {
      returns.push((prices[i] - prices[i-1]) / prices[i-1]);
    }
    
    const avgReturn = returns.reduce((a, b) => a + b) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / returns.length;
    
    return Math.sqrt(variance) * 100;
  }

  calculateTrend(prices) {
    if (prices.length < 2) return 0;
    
    const recentPrices = prices.slice(-5);
    const firstPrice = recentPrices[0];
    const lastPrice = recentPrices[recentPrices.length - 1];
    
    return (lastPrice - firstPrice) / firstPrice;
  }

  applyScanFilter(coins, type) {
    switch (type) {
      case "gainers":
        return coins.filter(c => c.change_24h > 0).sort((a, b) => b.change_24h - a.change_24h);
      case "losers":
        return coins.filter(c => c.change_24h < 0).sort((a, b) => a.change_24h - b.change_24h);
      case "high_volume":
        return coins.sort((a, b) => b.volume_24h - a.volume_24h);
      case "oversold":
        return coins.filter(c => c.change_24h < -10).sort((a, b) => a.change_24h - b.change_24h);
      case "overbought":
        return coins.filter(c => c.change_24h > 15).sort((a, b) => b.change_24h - a.change_24h);
      default:
        return coins;
    }
  }

  estimateVolatilityRisk(coin) {
    // Simulação simples de risco de volatilidade
    const lowVolCoins = ['bitcoin', 'ethereum']; // Menos voláteis
    const mediumVolCoins = ['cardano', 'polkadot', 'chainlink'];
    const highVolCoins = ['solana', 'avalanche-2', 'uniswap']; // Mais voláteis
    
    if (lowVolCoins.includes(coin)) return 10;
    if (mediumVolCoins.includes(coin)) return 15;
    if (highVolCoins.includes(coin)) return 30;
    return 20; // Default
  }

  async updatePortfolioValue() {
    let totalValue = this.portfolio.balance_usd;
    
    for (const [coin, position] of Object.entries(this.portfolio.positions)) {
      try {
        const currentPrice = await this.getCurrentPriceData(coin);
        const value = position.quantity * currentPrice.usd;
        totalValue += value;
      } catch (error) {
        console.error(`⚠️ Erro ao atualizar preço de ${coin}:`, error.message);
      }
    }
    
    this.portfolio.total_value = totalValue;
  }
}

module.exports = ToolsHandler;