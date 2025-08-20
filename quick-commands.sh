#!/bin/bash
# Quick commands for CryptoTrader

echo "🚀 CRYPTOTRADER QUICK COMMANDS"
echo "=============================="
echo ""
echo "📊 PORTFOLIO & STATUS:"
echo "  portfolio     - Show current portfolio"
echo "  prices        - Show current crypto prices"
echo "  market        - Market overview"
echo ""
echo "💰 TRADING:"
echo "  buy-btc       - Buy $500 Bitcoin"
echo "  buy-eth       - Buy $500 Ethereum" 
echo "  sell-btc      - Sell 50% Bitcoin"
echo "  analyze-btc   - Analyze Bitcoin"
echo ""
echo "🧪 DEMOS:"
echo "  demo          - Full trading demo"
echo "  test          - Run all tests"
echo "  chat          - Interactive chat mode"
echo ""
echo "🔧 SERVER:"
echo "  status        - Check MCP server status"
echo "  stop          - Stop MCP server"
echo "  logs          - View server logs"
echo ""

case "$1" in
  "portfolio")
    node -e "
    const server = require('./src/server');
    (async () => {
      const s = new server();
      await s.initialize();
      const p = s.getPortfolio();
      console.log('💰 Portfolio: \$' + p.balance_usd.toLocaleString());
      console.log('📊 Positions:', Object.keys(p.positions).length);
      console.log('💎 Total Value: \$' + p.total_value.toLocaleString());
      await s.shutdown();
    })();
    "
    ;;
  "prices")
    echo "📈 Getting live crypto prices..."
    node -e "
    const axios = require('axios');
    (async () => {
      try {
        const response = await axios.get('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana,cardano&vs_currencies=usd&include_24hr_change=true');
        Object.entries(response.data).forEach(([coin, data]) => {
          const change = data.usd_24h_change > 0 ? '+' + data.usd_24h_change.toFixed(2) : data.usd_24h_change.toFixed(2);
          const trend = data.usd_24h_change > 0 ? '📈' : '📉';
          console.log(\`\${trend} \${coin.toUpperCase()}: \$\${data.usd.toLocaleString()} (\${change}%)\`);
        });
      } catch (error) {
        console.log('❌ Error fetching prices:', error.message);
      }
    })();
    "
    ;;
  "buy-btc")
    echo "🛒 Buying $500 Bitcoin..."
    node claude-mcp-client.js
    ;;
  "demo")
    echo "🎬 Starting trading demo..."
    node demo-trading-session.js
    ;;
  "test")
    echo "🧪 Running all tests..."
    npm test
    ;;
  "chat")
    echo "💬 Starting interactive chat..."
    node interactive-chat.js
    ;;
  "status")
    if pgrep -f "node src/server.js" > /dev/null; then
      echo "✅ MCP Server is running"
      echo "📊 Process ID: $(pgrep -f 'node src/server.js')"
    else
      echo "❌ MCP Server is not running"
    fi
    ;;
  "stop")
    pkill -f "node src/server.js"
    echo "⏹️ MCP Server stopped"
    ;;
  "logs")
    tail -f server.log
    ;;
  *)
    echo "💡 Usage: ./quick-commands.sh [command]"
    echo "   Example: ./quick-commands.sh portfolio"
    ;;
esac