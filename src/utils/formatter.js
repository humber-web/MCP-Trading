const config = require('./config');

class Formatter {
  
  // Formatação de nomes de moedas
  static formatCoinName(coinId) {
    return config.coin_names[coinId] || coinId.toUpperCase();
  }

  // Formatação de números grandes
  static formatNumber(num) {
    if (num >= 1e9) return (num / 1e9).toFixed(1) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
    return num.toFixed(2);
  }

  // Formatação de preços
  static formatPrice(price, decimals = 4) {
    return `$${parseFloat(price).toFixed(decimals)}`;
  }

  // Formatação de percentagens
  static formatPercent(percent, decimals = 2) {
    const sign = percent > 0 ? '+' : '';
    return `${sign}${parseFloat(percent).toFixed(decimals)}%`;
  }

  // Formatação de data/hora
  static formatDateTime(timestamp = null) {
    const date = timestamp ? new Date(timestamp) : new Date();
    return date.toLocaleString('pt-PT');
  }

  // Formatação de P&L com emoji
  static formatPnL(pnl, pnlPercent = null) {
    const emoji = pnl >= 0 ? '🟢' : '🔴';
    const pnlText = `$${pnl.toFixed(2)}`;
    const percentText = pnlPercent !== null ? ` (${this.formatPercent(pnlPercent)})` : '';
    return `${emoji} ${pnlText}${percentText}`;
  }

  // Formatação de mudança de preço com emoji
  static formatPriceChange(change) {
    const emoji = change >= 0 ? '🟢' : '🔴';
    return `${emoji} ${this.formatPercent(change)}`;
  }

  // Formatação de análise de trading
  static formatTradingSignal(signal, confidence) {
    let emoji = '🟡';
    if (signal === 'BUY') emoji = '🟢';
    else if (signal === 'SELL') emoji = '🔴';
    
    return `${emoji} **${signal}** (${(confidence * 100).toFixed(0)}% confiança)`;
  }

  // Formatação de tendência
  static formatTrend(trend) {
    if (trend > 0.02) return 'Bullish 🟢';
    if (trend < -0.02) return 'Bearish 🔴';
    return 'Neutro 🟡';
  }

  // Formatação de sentimento do mercado
  static formatSentiment(value) {
    if (value >= 75) return "Extreme Greed 🤑";
    if (value >= 55) return "Greed 😊";
    if (value >= 45) return "Neutro 😐";
    if (value >= 25) return "Fear 😰";
    return "Extreme Fear 😱";
  }

  // Formatação de relatório de portfolio
  static formatPortfolioSummary(portfolio) {
    let summary = `💰 **Portfolio Summary**\n\n`;
    summary += `💵 **Total Value:** ${this.formatPrice(portfolio.total_value)}\n`;
    summary += `💳 **Cash:** ${this.formatPrice(portfolio.balance_usd)}\n`;
    summary += `📊 **Total P&L:** ${this.formatPnL(portfolio.pnl)}\n`;
    summary += `📈 **ROI:** ${this.formatPercent(((portfolio.total_value - config.trading.initial_balance) / config.trading.initial_balance) * 100)}\n`;
    summary += `🔢 **Positions:** ${Object.keys(portfolio.positions).length}\n`;
    
    return summary;
  }

  // Formatação de trade executado
  static formatTradeExecution(trade, action = 'executed') {
    let text = `✅ **${trade.type} ${action.toUpperCase()}!**\n\n`;
    text += `🪙 **Moeda:** ${this.formatCoinName(trade.coin)}\n`;
    text += `💵 **Preço:** ${this.formatPrice(trade.price)}\n`;
    text += `📦 **Quantidade:** ${trade.quantity.toFixed(6)}\n`;
    text += `💰 **Valor:** ${this.formatPrice(trade.amount_usd)}\n`;
    text += `💸 **Taxa:** ${this.formatPrice(trade.fee)}\n`;
    
    if (trade.pnl !== undefined) {
      text += `\n${this.formatPnL(trade.pnl, trade.pnl_percent)}\n`;
    }
    
    text += `\n📊 **Trade ID:** ${trade.id}`;
    
    return text;
  }

  // Formatação de análise de moeda
  static formatCoinAnalysis(analysis) {
    let text = `📊 **Análise: ${this.formatCoinName(analysis.coin)}** (${analysis.days} dias)\n\n`;
    text += `💵 **Preço Atual:** ${this.formatPrice(analysis.current_price)}\n`;
    text += `📈 **Variação Período:** ${this.formatPercent(analysis.period_change)}\n`;
    text += `📊 **Volatilidade:** ${analysis.volatility.toFixed(2)}%\n\n`;
    text += `🔻 **Suporte:** ${this.formatPrice(analysis.support)}\n`;
    text += `🔺 **Resistência:** ${this.formatPrice(analysis.resistance)}\n`;
    text += `📊 **Preço Médio:** ${this.formatPrice(analysis.avg_price)}\n\n`;
    text += `🎯 **Sinal:** ${this.formatTradingSignal(analysis.signal, analysis.confidence)}\n`;
    text += `📈 **Tendência:** ${this.formatTrend(analysis.trend)}\n\n`;
    text += `🏷️ **Market Cap:** ${this.formatNumber(analysis.market_cap)}\n`;
    text += `📊 **Volume 24h:** ${this.formatNumber(analysis.volume_24h)}\n\n`;
    text += `⏰ *Análise gerada em ${this.formatDateTime()}*`;
    
    return text;
  }

  // Formatação de market scan
  static formatMarketScan(results, type, limit) {
    let text = `🔍 **Market Scan: ${type.toUpperCase()}** (Top ${limit})\n\n`;
    
    if (results.length === 0) {
      text += `❌ Nenhuma oportunidade encontrada para "${type}"`;
    } else {
      results.forEach((coin, index) => {
        text += `${index + 1}. **${coin.name}**\n`;
        text += `   💵 ${this.formatPrice(coin.price)}\n`;
        text += `   ${this.formatPriceChange(coin.change_24h)}\n`;
        text += `   📊 Vol: ${this.formatNumber(coin.volume_24h)}\n\n`;
      });
    }
    
    text += `⏰ *Scan realizado em ${this.formatDateTime()}*`;
    return text;
  }

  // Formatação de alertas
  static formatAlerts(coin, currentPrice, priceAbove, priceBelow) {
    let text = `🔔 **Alertas configurados para ${this.formatCoinName(coin)}**\n\n`;
    text += `💵 **Preço atual:** ${this.formatPrice(currentPrice)}\n\n`;
    
    if (priceAbove) {
      text += `🔺 **Alerta ACIMA:** ${this.formatPrice(priceAbove)}\n`;
    }
    
    if (priceBelow) {
      text += `🔻 **Alerta ABAIXO:** ${this.formatPrice(priceBelow)}\n`;
    }
    
    text += `\n⚠️ *Nota: Alertas são simulados nesta versão*`;
    return text;
  }

  // Formatação de relatório de rebalanceamento
  static formatRebalanceReport(portfolio, recommendations) {
    let text = `⚖️ **Análise de Rebalanceamento**\n\n`;
    text += `💰 **Valor Total:** ${this.formatPrice(portfolio.total_value)}\n`;
    
    const cashPercent = (portfolio.balance_usd / portfolio.total_value) * 100;
    text += `💵 **Cash:** ${this.formatPrice(portfolio.balance_usd)} (${cashPercent.toFixed(1)}%)\n\n`;
    
    if (Object.keys(portfolio.positions).length === 0) {
      text += `📝 **Recomendação:** Portfolio está 100% em cash. Considere diversificar em 3-5 cryptos principais.`;
      return text;
    }
    
    text += `📊 **Alocação Atual:**\n`;
    
    // Adicionar posições (será preenchido pelo módulo portfolio)
    
    text += `\n💡 **Recomendações:**\n`;
    recommendations.forEach(rec => {
      text += `• ${rec}\n`;
    });
    
    return text;
  }

  // Geração de ID único para trades
  static generateTradeId() {
    return `TRD${Date.now()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
  }

  // Geração de timestamp padronizado
  static getTimestamp() {
    return new Date().toISOString();
  }
}

module.exports = Formatter;