// src/notifications/telegram-notifier.js

const axios = require('axios');

/**
 * Telegram Notifier
 * Sends mobile push notifications via Telegram bot
 *
 * Setup:
 * 1. Create bot with @BotFather on Telegram
 * 2. Get your chat ID from @userinfobot
 * 3. Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in .env
 */
class TelegramNotifier {
  constructor(config = {}) {
    this.botToken = config.botToken || process.env.TELEGRAM_BOT_TOKEN;
    this.chatId = config.chatId || process.env.TELEGRAM_CHAT_ID;
    this.enabled = !!this.botToken && !!this.chatId;

    // Notification preferences
    this.preferences = {
      trades: config.notifyTrades !== false,           // Notify on buy/sell
      stopLoss: config.notifyStopLoss !== false,       // Notify on stop-loss trigger
      takeProfit: config.notifyTakeProfit !== false,   // Notify on take-profit trigger
      errors: config.notifyErrors !== false,           // Notify on errors
      dailySummary: config.notifyDailySummary !== false // Daily portfolio summary
    };

    if (!this.enabled) {
      console.log('ℹ️  Telegram notifications disabled (missing bot token or chat ID)');
    } else {
      console.log('✅ Telegram notifications enabled');
    }
  }

  /**
   * Send a message via Telegram
   */
  async sendMessage(message, options = {}) {
    if (!this.enabled) {
      return false;
    }

    try {
      const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;

      const response = await axios.post(url, {
        chat_id: this.chatId,
        text: message,
        parse_mode: options.parseMode || 'Markdown',
        disable_notification: options.silent || false
      }, {
        timeout: 5000
      });

      return response.data.ok;
    } catch (error) {
      console.error('Failed to send Telegram notification:', error.message);
      return false;
    }
  }

  /**
   * Notify on buy trade
   */
  async notifyBuy(coin, quantity, pricePerUnit, totalCost, stopLoss = null, takeProfit = null) {
    if (!this.preferences.trades) {
      return false;
    }

    const message = `
🟢 *BUY ORDER EXECUTED*

💎 Coin: \`${coin.toUpperCase()}\`
📊 Quantity: \`${quantity.toFixed(8)}\`
💵 Price: \`$${pricePerUnit.toFixed(2)}\`
💰 Total Cost: \`$${totalCost.toFixed(2)}\`
${stopLoss ? `🛡️ Stop-Loss: \`$${stopLoss.toFixed(2)}\`` : ''}
${takeProfit ? `🎯 Take-Profit: \`$${takeProfit.toFixed(2)}\`` : ''}

⏰ ${new Date().toLocaleString()}
    `.trim();

    return await this.sendMessage(message);
  }

  /**
   * Notify on sell trade
   */
  async notifySell(coin, quantity, pricePerUnit, totalValue, profit = null) {
    if (!this.preferences.trades) {
      return false;
    }

    const profitEmoji = profit && profit > 0 ? '📈' : profit && profit < 0 ? '📉' : '➖';
    const profitText = profit
      ? `\n${profitEmoji} P&L: \`$${profit > 0 ? '+' : ''}${profit.toFixed(2)}\``
      : '';

    const message = `
🔴 *SELL ORDER EXECUTED*

💎 Coin: \`${coin.toUpperCase()}\`
📊 Quantity: \`${quantity.toFixed(8)}\`
💵 Price: \`$${pricePerUnit.toFixed(2)}\`
💰 Total Value: \`$${totalValue.toFixed(2)}\`${profitText}

⏰ ${new Date().toLocaleString()}
    `.trim();

    return await this.sendMessage(message);
  }

  /**
   * Notify on stop-loss trigger
   */
  async notifyStopLoss(coin, quantity, triggerPrice, totalValue, loss) {
    if (!this.preferences.stopLoss) {
      return false;
    }

    const message = `
🛑 *STOP-LOSS TRIGGERED*

⚠️ Your stop-loss was triggered to prevent further losses

💎 Coin: \`${coin.toUpperCase()}\`
📊 Quantity: \`${quantity.toFixed(8)}\`
💵 Trigger Price: \`$${triggerPrice.toFixed(2)}\`
💰 Total Value: \`$${totalValue.toFixed(2)}\`
📉 Loss: \`$${loss.toFixed(2)}\`

⏰ ${new Date().toLocaleString()}
    `.trim();

    return await this.sendMessage(message);
  }

  /**
   * Notify on take-profit trigger
   */
  async notifyTakeProfit(coin, quantity, triggerPrice, totalValue, profit) {
    if (!this.preferences.takeProfit) {
      return false;
    }

    const message = `
🎯 *TAKE-PROFIT TRIGGERED*

🎉 Your take-profit target was reached!

💎 Coin: \`${coin.toUpperCase()}\`
📊 Quantity: \`${quantity.toFixed(8)}\`
💵 Trigger Price: \`$${triggerPrice.toFixed(2)}\`
💰 Total Value: \`$${totalValue.toFixed(2)}\`
📈 Profit: \`$+${profit.toFixed(2)}\`

⏰ ${new Date().toLocaleString()}
    `.trim();

    return await this.sendMessage(message);
  }

  /**
   * Notify on limit order fill
   */
  async notifyLimitOrderFilled(type, coin, quantity, limitPrice, totalValue) {
    if (!this.preferences.trades) {
      return false;
    }

    const emoji = type === 'BUY' ? '🟢' : '🔴';
    const message = `
${emoji} *LIMIT ORDER FILLED*

📋 Type: \`${type}\`
💎 Coin: \`${coin.toUpperCase()}\`
📊 Quantity: \`${quantity.toFixed(8)}\`
💵 Limit Price: \`$${limitPrice.toFixed(2)}\`
💰 Total Value: \`$${totalValue.toFixed(2)}\`

⏰ ${new Date().toLocaleString()}
    `.trim();

    return await this.sendMessage(message);
  }

  /**
   * Notify on error
   */
  async notifyError(errorType, errorMessage, context = {}) {
    if (!this.preferences.errors) {
      return false;
    }

    const contextText = Object.keys(context).length > 0
      ? '\n\n*Context:*\n' + Object.entries(context).map(([k, v]) => `${k}: \`${v}\``).join('\n')
      : '';

    const message = `
❌ *ERROR OCCURRED*

🔴 Type: \`${errorType}\`
📝 Message: \`${errorMessage}\`${contextText}

⏰ ${new Date().toLocaleString()}
    `.trim();

    return await this.sendMessage(message);
  }

  /**
   * Send daily portfolio summary
   */
  async sendDailySummary(portfolio, stats) {
    if (!this.preferences.dailySummary) {
      return false;
    }

    const totalValue = portfolio.balance_usd +
      Object.values(portfolio.positions).reduce((sum, p) => sum + (p.quantity * p.current_price || 0), 0);

    const roi = ((totalValue - 10000) / 10000 * 100).toFixed(2);
    const roiEmoji = roi > 0 ? '📈' : roi < 0 ? '📉' : '➖';

    const positionsList = Object.entries(portfolio.positions)
      .map(([coin, pos]) => {
        const value = pos.quantity * (pos.current_price || pos.avg_price);
        return `  • ${coin.toUpperCase()}: $${value.toFixed(2)}`;
      })
      .join('\n') || '  None';

    const message = `
📊 *DAILY PORTFOLIO SUMMARY*

💰 Total Value: \`$${totalValue.toFixed(2)}\`
💵 Cash: \`$${portfolio.balance_usd.toFixed(2)}\`
${roiEmoji} ROI: \`${roi > 0 ? '+' : ''}${roi}%\`

📈 Positions:
${positionsList}

📋 Today's Stats:
  • Trades: \`${stats.total_trades || 0}\`
  • Win Rate: \`${stats.win_rate || 0}%\`
  • Best Trade: \`$${stats.best_trade || 0}\`

⏰ ${new Date().toLocaleDateString()}
    `.trim();

    return await this.sendMessage(message);
  }

  /**
   * Test notification
   */
  async sendTest() {
    const message = `
🤖 *Telegram Notifications Test*

✅ Your CryptoTrader bot is connected!

You will receive notifications for:
${this.preferences.trades ? '✅' : '❌'} Buy/Sell trades
${this.preferences.stopLoss ? '✅' : '❌'} Stop-loss triggers
${this.preferences.takeProfit ? '✅' : '❌'} Take-profit triggers
${this.preferences.errors ? '✅' : '❌'} Errors and warnings
${this.preferences.dailySummary ? '✅' : '❌'} Daily portfolio summaries

⏰ ${new Date().toLocaleString()}
    `.trim();

    return await this.sendMessage(message);
  }

  /**
   * Update notification preferences
   */
  updatePreferences(newPreferences) {
    this.preferences = {
      ...this.preferences,
      ...newPreferences
    };
  }

  /**
   * Check if notifications are enabled
   */
  isEnabled() {
    return this.enabled;
  }

  /**
   * Get current configuration
   */
  getConfig() {
    return {
      enabled: this.enabled,
      hasToken: !!this.botToken,
      hasChatId: !!this.chatId,
      preferences: this.preferences
    };
  }
}

module.exports = TelegramNotifier;
