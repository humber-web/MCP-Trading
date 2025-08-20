// src/trading/risk.js
const config = require('../utils/config');
const Formatter = require('../utils/formatter');

class RiskManager {
  constructor(dependencies) {
    this.portfolioManager = dependencies.portfolioManager;
    this.pricesManager = dependencies.pricesManager;
    
    this.riskLimits = {
      max_position_size: config.trading.max_position_size,
      max_daily_loss: 0.05, // 5% daily loss limit
      max_total_exposure: 0.95, // 95% max invested
      correlation_limit: 0.7 // Max correlation between positions
    };
  }

  async validateTrade(coin, amountUsd, tradeType) {
    const validations = [];

    // Check available balance
    if (tradeType === 'BUY') {
      if (amountUsd > this.portfolioManager.portfolio.balance_usd) {
        throw new Error(`Saldo insuficiente: ${Formatter.formatPrice(this.portfolioManager.portfolio.balance_usd)} disponível`);
      }
    }

    // Check position size limit
    const positionSizeCheck = await this.checkPositionSizeLimit(coin, amountUsd, tradeType);
    if (!positionSizeCheck.valid) {
      throw new Error(positionSizeCheck.reason);
    }

    // Check total exposure
    const exposureCheck = this.checkTotalExposure(amountUsd, tradeType);
    if (!exposureCheck.valid) {
      throw new Error(exposureCheck.reason);
    }

    // Check daily loss limit
    const dailyLossCheck = this.checkDailyLossLimit();
    if (!dailyLossCheck.valid) {
      throw new Error(dailyLossCheck.reason);
    }

    return {
      valid: true,
      validations: validations,
      risk_score: this.calculateTradeRiskScore(coin, amountUsd, tradeType)
    };
  }

  async checkPositionSizeLimit(coin, amountUsd, tradeType) {
    if (tradeType !== 'BUY') return { valid: true };

    const totalValue = this.portfolioManager.portfolio.total_value;
    const maxPositionValue = totalValue * this.riskLimits.max_position_size;
    
    // Current position value
    let currentPositionValue = 0;
    if (this.portfolioManager.portfolio.positions[coin]) {
      const position = this.portfolioManager.portfolio.positions[coin];
      const currentPrice = await this.pricesManager.getCurrentPrice(coin);
      currentPositionValue = position.quantity * currentPrice.price;
    }

    const newPositionValue = currentPositionValue + amountUsd;
    
    if (newPositionValue > maxPositionValue) {
      return {
        valid: false,
        reason: `Posição excederia limite de ${(this.riskLimits.max_position_size * 100).toFixed(0)}%. Máximo: ${Formatter.formatPrice(maxPositionValue)}`
      };
    }

    return { valid: true };
  }

  checkTotalExposure(amountUsd, tradeType) {
    if (tradeType !== 'BUY') return { valid: true };

    const totalValue = this.portfolioManager.portfolio.total_value;
    const currentCash = this.portfolioManager.portfolio.balance_usd;
    const currentExposure = (totalValue - currentCash) / totalValue;
    const newExposure = (totalValue - currentCash + amountUsd) / totalValue;

    if (newExposure > this.riskLimits.max_total_exposure) {
      return {
        valid: false,
        reason: `Exposição excederia limite de ${(this.riskLimits.max_total_exposure * 100).toFixed(0)}%`
      };
    }

    return { valid: true };
  }

  checkDailyLossLimit() {
    const today = new Date().toDateString();
    const todayTrades = this.portfolioManager.portfolio.trades_history.filter(trade => {
      const tradeDate = new Date(trade.timestamp).toDateString();
      return tradeDate === today && trade.type === 'SELL' && trade.pnl < 0;
    });

    const todayLoss = todayTrades.reduce((total, trade) => total + trade.pnl, 0);
    const maxDailyLoss = this.portfolioManager.portfolio.total_value * this.riskLimits.max_daily_loss;

    if (Math.abs(todayLoss) > maxDailyLoss) {
      return {
        valid: false,
        reason: `Limite de perda diária atingido: ${Formatter.formatPrice(Math.abs(todayLoss))}`
      };
    }

    return { valid: true };
  }

  calculateTradeRiskScore(coin, amountUsd, tradeType) {
    let riskScore = 50; // Base score

    // Position size risk
    const portfolioPercent = (amountUsd / this.portfolioManager.portfolio.total_value) * 100;
    if (portfolioPercent > 15) riskScore += 20;
    else if (portfolioPercent > 10) riskScore += 10;

    // Volatility risk (simplified)
    const volatilityRisk = this.getCoinVolatilityRisk(coin);
    riskScore += volatilityRisk;

    // Concentration risk
    const positions = Object.keys(this.portfolioManager.portfolio.positions).length;
    if (positions < 3) riskScore += 15;

    return Math.min(100, Math.max(0, riskScore));
  }

  getCoinVolatilityRisk(coin) {
    // Simplified volatility risk based on coin type
    const highVolCoins = ['solana', 'avalanche-2', 'uniswap'];
    const mediumVolCoins = ['cardano', 'polkadot', 'chainlink'];
    
    if (highVolCoins.includes(coin)) return 20;
    if (mediumVolCoins.includes(coin)) return 10;
    return 5; // BTC, ETH
  }

  calculatePortfolioRisk() {
    const totalValue = this.portfolioManager.portfolio.total_value;
    const cashPercent = (this.portfolioManager.portfolio.balance_usd / totalValue) * 100;
    
    let riskScore = 0;
    const riskFactors = [];

    // Cash allocation risk
    if (cashPercent < 5) {
      riskScore += 20;
      riskFactors.push('Cash muito baixo (<5%)');
    } else if (cashPercent > 50) {
      riskScore += 10;
      riskFactors.push('Cash muito alto (>50%)');
    }

    // Concentration risk
    const positions = Object.keys(this.portfolioManager.portfolio.positions).length;
    if (positions === 1) {
      riskScore += 30;
      riskFactors.push('Portfolio concentrado em 1 posição');
    } else if (positions === 2) {
      riskScore += 15;
      riskFactors.push('Portfolio pouco diversificado');
    }

    // Position size risk
    if (this.portfolioManager.portfolio.allocation?.positions) {
      Object.entries(this.portfolioManager.portfolio.allocation.positions).forEach(([coin, allocation]) => {
        if (allocation.percentage > 40) {
          riskScore += 25;
          riskFactors.push(`${Formatter.formatCoinName(coin)} representa ${allocation.percentage.toFixed(1)}%`);
        }
      });
    }

    let riskLevel = 'LOW';
    if (riskScore > 60) riskLevel = 'HIGH';
    else if (riskScore > 30) riskLevel = 'MEDIUM';

    return {
      risk_score: riskScore,
      risk_level: riskLevel,
      risk_factors: riskFactors,
      recommendations: this.generateRiskRecommendations(riskLevel, riskFactors)
    };
  }

  generateRiskRecommendations(riskLevel, riskFactors) {
    const recommendations = [];

    if (riskLevel === 'HIGH') {
      recommendations.push('Reduza imediatamente o tamanho das posições');
      recommendations.push('Diversifique o portfolio em mais ativos');
      recommendations.push('Mantenha pelo menos 10% em cash');
      recommendations.push('Configure stop-losses apertados');
    } else if (riskLevel === 'MEDIUM') {
      recommendations.push('Considere diversificar mais o portfolio');
      recommendations.push('Monitore de perto as posições grandes');
      recommendations.push('Mantenha gestão de risco ativa');
    } else {
      recommendations.push('Portfolio com risco controlado');
      recommendations.push('Continue com a estratégia atual');
    }

    return recommendations;
  }

  suggestPositionSizing(coin, targetPercent) {
    const totalValue = this.portfolioManager.portfolio.total_value;
    const maxAllowed = totalValue * this.riskLimits.max_position_size;
    const targetAmount = totalValue * (targetPercent / 100);
    
    const recommendedAmount = Math.min(targetAmount, maxAllowed);
    const recommendedPercent = (recommendedAmount / totalValue) * 100;

    return {
      target_percent: targetPercent,
      recommended_percent: recommendedPercent,
      recommended_amount: recommendedAmount,
      max_allowed: maxAllowed,
      within_limits: recommendedAmount === targetAmount
    };
  }

  async calculateStopLoss(coin, entryPrice, riskPercent = 5) {
    const stopLossPrice = entryPrice * (1 - riskPercent / 100);
    
    return {
      stop_loss_price: stopLossPrice,
      risk_percent: riskPercent,
      risk_amount_per_unit: entryPrice - stopLossPrice,
      formatted: {
        stop_loss: Formatter.formatPrice(stopLossPrice),
        entry: Formatter.formatPrice(entryPrice),
        risk_percent: `${riskPercent}%`
      }
    };
  }

  async calculateTakeProfit(coin, entryPrice, targetPercent = 15) {
    const takeProfitPrice = entryPrice * (1 + targetPercent / 100);
    
    return {
      take_profit_price: takeProfitPrice,
      target_percent: targetPercent,
      profit_amount_per_unit: takeProfitPrice - entryPrice,
      formatted: {
        take_profit: Formatter.formatPrice(takeProfitPrice),
        entry: Formatter.formatPrice(entryPrice),
        target_percent: `${targetPercent}%`
      }
    };
  }

  getRiskLimits() {
    return {
      ...this.riskLimits,
      formatted: {
        max_position_size: `${(this.riskLimits.max_position_size * 100).toFixed(0)}%`,
        max_daily_loss: `${(this.riskLimits.max_daily_loss * 100).toFixed(0)}%`,
        max_total_exposure: `${(this.riskLimits.max_total_exposure * 100).toFixed(0)}%`
      }
    };
  }

  updateRiskLimits(newLimits) {
    this.riskLimits = { ...this.riskLimits, ...newLimits };
    return this.riskLimits;
  }
}

module.exports = RiskManager;