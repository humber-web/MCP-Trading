module.exports = {
  // Configurações de trading
  trading: {
    initial_balance: 10000,      // $10k virtual
    max_position_size: 0.2,      // 20% máximo por posição
    stop_loss_percent: 0.05,     // 5% stop loss
    take_profit_percent: 0.15,   // 15% take profit
    trading_fee: 0.001,          // 0.1% fee
  },

  // Cryptos suportadas
  supported_coins: [
    'bitcoin', 'ethereum', 'cardano', 'polkadot', 'chainlink',
    'solana', 'matic-network', 'avalanche-2', 'uniswap', 'aave'
  ],

  // Mapeamento de nomes
  coin_names: {
    'bitcoin': 'Bitcoin (BTC)',
    'ethereum': 'Ethereum (ETH)',
    'cardano': 'Cardano (ADA)',
    'polkadot': 'Polkadot (DOT)',
    'chainlink': 'Chainlink (LINK)',
    'solana': 'Solana (SOL)',
    'matic-network': 'Polygon (MATIC)',
    'avalanche-2': 'Avalanche (AVAX)',
    'uniswap': 'Uniswap (UNI)',
    'aave': 'Aave (AAVE)'
  },

  // Cache TTL (segundos)
  cache: {
    prices: 30,      // 30 segundos para preços
    analysis: 300,   // 5 minutos para análise
    market: 60       // 1 minuto para dados de mercado
  },

  // APIs externas
  apis: {
    coingecko: {
      base_url: process.env.COINGECKO_BASE_URL || 'https://api.coingecko.com/api/v3',
      timeout: parseInt(process.env.COINGECKO_TIMEOUT) || 10000,
      api_key: process.env.COINGECKO_API_KEY || null
    },
    fear_greed: {
      base_url: 'https://api.alternative.me/fng/',
      timeout: 5000
    }
  },

  // Configurações MCP
  mcp: {
    protocol_version: "2024-11-05",
    server_info: {
      name: "crypto-trader-mcp",
      version: "1.0.0",
      description: "Revolutionary AI-Powered Crypto Trading via MCP"
    }
  },

  // Paths do sistema
  paths: {
    data_dir: 'data',
    portfolio_file: 'portfolio.json',
    logs_dir: 'logs'
  }
};