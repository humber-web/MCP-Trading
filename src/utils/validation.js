// src/utils/validation.js
const config = require('./config');

class ValidationError extends Error {
  constructor(message, field = null) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
  }
}

class Validator {
  // Validate coin name
  static validateCoin(coin) {
    if (!coin || typeof coin !== 'string') {
      throw new ValidationError('Coin name is required and must be a string', 'coin');
    }

    const sanitizedCoin = coin.trim().toLowerCase();

    if (sanitizedCoin.length === 0) {
      throw new ValidationError('Coin name cannot be empty', 'coin');
    }

    if (!config.supported_coins.includes(sanitizedCoin)) {
      throw new ValidationError(
        `Unsupported coin: ${sanitizedCoin}. Supported coins: ${config.supported_coins.join(', ')}`,
        'coin'
      );
    }

    return sanitizedCoin;
  }

  // Validate USD amount
  static validateAmountUSD(amount, minAmount = 10, maxAmount = null) {
    if (amount === null || amount === undefined) {
      throw new ValidationError('Amount USD is required', 'amount_usd');
    }

    if (typeof amount !== 'number') {
      throw new ValidationError('Amount USD must be a number', 'amount_usd');
    }

    if (!isFinite(amount)) {
      throw new ValidationError('Amount USD must be a finite number', 'amount_usd');
    }

    if (amount <= 0) {
      throw new ValidationError('Amount USD must be greater than zero', 'amount_usd');
    }

    if (amount < minAmount) {
      throw new ValidationError(`Amount USD must be at least $${minAmount}`, 'amount_usd');
    }

    if (maxAmount && amount > maxAmount) {
      throw new ValidationError(`Amount USD cannot exceed $${maxAmount}`, 'amount_usd');
    }

    return amount;
  }

  // Validate percentage
  static validatePercentage(percentage, min = 1, max = 100) {
    if (percentage === null || percentage === undefined) {
      return 100; // Default to 100%
    }

    if (typeof percentage !== 'number') {
      throw new ValidationError('Percentage must be a number', 'percentage');
    }

    if (!isFinite(percentage)) {
      throw new ValidationError('Percentage must be a finite number', 'percentage');
    }

    if (percentage < min || percentage > max) {
      throw new ValidationError(
        `Percentage must be between ${min} and ${max}`,
        'percentage'
      );
    }

    return percentage;
  }

  // Validate price
  static validatePrice(price, allowNull = true) {
    if (price === null || price === undefined) {
      if (allowNull) {
        return null;
      }
      throw new ValidationError('Price is required', 'price');
    }

    if (typeof price !== 'number') {
      throw new ValidationError('Price must be a number', 'price');
    }

    if (!isFinite(price)) {
      throw new ValidationError('Price must be a finite number', 'price');
    }

    if (price < 0) {
      throw new ValidationError('Price cannot be negative', 'price');
    }

    return price;
  }

  // Validate stop-loss
  static validateStopLoss(stopLoss, currentPrice = null) {
    if (stopLoss === null || stopLoss === undefined) {
      return null;
    }

    const validatedPrice = this.validatePrice(stopLoss, false);

    if (currentPrice && validatedPrice >= currentPrice) {
      throw new ValidationError(
        `Stop-loss price ($${validatedPrice}) must be below current price ($${currentPrice})`,
        'stop_loss'
      );
    }

    return validatedPrice;
  }

  // Validate take-profit
  static validateTakeProfit(takeProfit, currentPrice = null) {
    if (takeProfit === null || takeProfit === undefined) {
      return null;
    }

    const validatedPrice = this.validatePrice(takeProfit, false);

    if (currentPrice && validatedPrice <= currentPrice) {
      throw new ValidationError(
        `Take-profit price ($${validatedPrice}) must be above current price ($${currentPrice})`,
        'take_profit'
      );
    }

    return validatedPrice;
  }

  // Validate days parameter
  static validateDays(days) {
    if (days === null || days === undefined) {
      return 7; // Default to 7 days
    }

    if (typeof days !== 'number') {
      throw new ValidationError('Days must be a number', 'days');
    }

    if (!Number.isInteger(days)) {
      throw new ValidationError('Days must be an integer', 'days');
    }

    if (days < 1 || days > 365) {
      throw new ValidationError('Days must be between 1 and 365', 'days');
    }

    return days;
  }

  // Validate limit parameter
  static validateLimit(limit, defaultLimit = 5, maxLimit = 20) {
    if (limit === null || limit === undefined) {
      return defaultLimit;
    }

    if (typeof limit !== 'number') {
      throw new ValidationError('Limit must be a number', 'limit');
    }

    if (!Number.isInteger(limit)) {
      throw new ValidationError('Limit must be an integer', 'limit');
    }

    if (limit < 1 || limit > maxLimit) {
      throw new ValidationError(`Limit must be between 1 and ${maxLimit}`, 'limit');
    }

    return limit;
  }

  // Validate order type
  static validateOrderType(type, allowedTypes = ['BUY', 'SELL', 'BUY_LIMIT', 'SELL_LIMIT']) {
    if (!type || typeof type !== 'string') {
      throw new ValidationError('Order type is required and must be a string', 'type');
    }

    const sanitizedType = type.trim().toUpperCase();

    if (!allowedTypes.includes(sanitizedType)) {
      throw new ValidationError(
        `Invalid order type: ${type}. Allowed types: ${allowedTypes.join(', ')}`,
        'type'
      );
    }

    return sanitizedType;
  }

  // Validate scan type
  static validateScanType(type) {
    const allowedTypes = ['gainers', 'losers', 'high_volume', 'oversold', 'overbought'];

    if (!type) {
      return 'gainers'; // Default
    }

    if (typeof type !== 'string') {
      throw new ValidationError('Scan type must be a string', 'type');
    }

    const sanitizedType = type.trim().toLowerCase();

    if (!allowedTypes.includes(sanitizedType)) {
      throw new ValidationError(
        `Invalid scan type: ${type}. Allowed types: ${allowedTypes.join(', ')}`,
        'type'
      );
    }

    return sanitizedType;
  }

  // Validate balance sufficiency
  static validateSufficientBalance(amount, availableBalance) {
    if (amount > availableBalance) {
      throw new ValidationError(
        `Insufficient balance. Required: $${amount.toFixed(2)}, Available: $${availableBalance.toFixed(2)}`,
        'balance'
      );
    }
    return true;
  }

  // Validate position exists
  static validatePositionExists(coin, positions) {
    if (!positions || !positions[coin]) {
      throw new ValidationError(`No position found for ${coin}`, 'position');
    }
    return true;
  }

  // Validate position size limit
  static validatePositionSizeLimit(amount, portfolioValue) {
    const maxPositionSize = config.trading.max_position_size;
    const positionPercent = amount / portfolioValue;

    if (positionPercent > maxPositionSize) {
      throw new ValidationError(
        `Position size exceeds maximum allowed (${(maxPositionSize * 100).toFixed(0)}% of portfolio). ` +
        `Requested: ${(positionPercent * 100).toFixed(1)}%`,
        'position_size'
      );
    }
    return true;
  }

  // Sanitize string input
  static sanitizeString(input, maxLength = 100) {
    if (!input) return '';

    let sanitized = String(input).trim();

    // Remove any potentially dangerous characters
    sanitized = sanitized.replace(/[<>]/g, '');

    // Limit length
    if (sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength);
    }

    return sanitized;
  }

  // Validate object structure
  static validateObject(obj, requiredFields = []) {
    if (!obj || typeof obj !== 'object') {
      throw new ValidationError('Invalid input: must be an object');
    }

    for (const field of requiredFields) {
      if (!(field in obj)) {
        throw new ValidationError(`Missing required field: ${field}`, field);
      }
    }

    return true;
  }

  // Complete trade validation
  static validateBuyTrade(coin, amountUsd, balance, portfolioValue, stopLoss = null, takeProfit = null, currentPrice = null) {
    const validatedCoin = this.validateCoin(coin);
    const validatedAmount = this.validateAmountUSD(amountUsd, 10, balance);
    this.validateSufficientBalance(validatedAmount, balance);
    this.validatePositionSizeLimit(validatedAmount, portfolioValue);

    const validatedStopLoss = this.validateStopLoss(stopLoss, currentPrice);
    const validatedTakeProfit = this.validateTakeProfit(takeProfit, currentPrice);

    return {
      coin: validatedCoin,
      amount_usd: validatedAmount,
      stop_loss: validatedStopLoss,
      take_profit: validatedTakeProfit
    };
  }

  static validateSellTrade(coin, percentage, positions) {
    const validatedCoin = this.validateCoin(coin);
    const validatedPercentage = this.validatePercentage(percentage, 1, 100);
    this.validatePositionExists(validatedCoin, positions);

    return {
      coin: validatedCoin,
      percentage: validatedPercentage
    };
  }
}

module.exports = {
  Validator,
  ValidationError
};
