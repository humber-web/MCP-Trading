# Local Development Setup

## Prerequisites

- Node.js >= 14.0.0 (check with `node --version`)
- npm or yarn
- Git

## Step-by-Step Setup

### 1. Pull Latest Code

```bash
cd /home/user/MCP-Trading
git pull origin claude/incomplete-query-011CUqFU9PoGSpMZFU33g4y2
```

### 2. Install Dependencies

```bash
npm install
```

This installs:
- axios (HTTP requests)
- express (web server)
- dotenv (environment variables)
- cors (CORS support)
- node-cache (caching)

### 3. Configure Environment Variables

Create a `.env` file in the project root:

```bash
# Copy the example file
cp .env.example .env

# Edit the .env file
nano .env
```

**Required Configuration:**

```bash
# Server
PORT=3000
NODE_ENV=development

# CoinGecko API (REQUIRED - Add your key here!)
COINGECKO_API_KEY=CG-your-actual-key-here

# Trading Configuration
INITIAL_BALANCE=10000
TRADING_MODE=PAPER

# AI Trading (Optional - set to false for manual testing)
AI_TRADING_ENABLED=true
AI_STRATEGY=BALANCED
AI_CHECK_INTERVAL_HOURS=6
```

**IMPORTANT**: Replace `CG-your-actual-key-here` with your actual CoinGecko API key!

### 4. Verify Environment Variables

Test that your environment is configured correctly:

```bash
npm run test-env
```

You should see:
```
✅ FOUND!
Length: 27 characters
Preview: CG-zp9...z3Ez
Starts with 'CG-': ✅ Yes
```

### 5. Run the Bot

**Option A: Start the bot normally**
```bash
npm start
```

**Option B: Development mode (with auto-restart)**
```bash
npm run dev
```

### 6. Verify It's Working

You should see output like:

```
🔍 DEBUG - Environment Variables Check:
==========================================
📋 Found environment variables:
   COINGECKO_API_KEY: CG-zp9...z3Ez

✅ COINGECKO_API_KEY: CG-zp9...z3Ez (detected)
✅ CoinGecko API Key detected - Using 12 requests/minute limit (5s intervals)

🤖 Starting AI Trading Agent
📊 Analyzing market conditions...
   😨 Fear & Greed Index: 27/100 (Fear)
   ⏳ Waiting 10 seconds before scanning opportunities...
🔍 Scanning for opportunities...
   ✅ BITCOIN: ...
   ⏳ Waiting 10 seconds before next coin analysis...
```

### 7. Access the Web Dashboard

Once running, open your browser:
- **Dashboard**: http://localhost:3000
- **API Health**: http://localhost:3000/health
- **API Stats**: http://localhost:3000/api/stats

## Common Issues

### Issue: "Cannot find module 'dotenv'"

**Solution:**
```bash
npm install dotenv
```

### Issue: "COINGECKO_API_KEY not found"

**Solution:**
1. Make sure `.env` file exists in project root
2. Check the key is uncommented (no `#` at start of line)
3. Verify format: `COINGECKO_API_KEY=CG-...` (no spaces, no quotes)
4. Restart the bot after editing `.env`

### Issue: Still getting 429 errors

**Solution:**
1. Check your CoinGecko plan limits in their dashboard
2. If on free tier, you may need to wait for rate limits to reset
3. Try reducing AI_CHECK_INTERVAL_HOURS to 12 or 24

### Issue: Port 3000 already in use

**Solution:**
```bash
# Change PORT in .env
PORT=3001

# Or kill the process using port 3000
lsof -ti:3000 | xargs kill -9
```

## Testing Without AI Agent

If you want to test without the AI trading agent running automatically:

**In `.env`:**
```bash
AI_TRADING_ENABLED=false
```

Then you can manually test API calls via the web interface or API endpoints.

## Stopping the Bot

Press `Ctrl+C` in the terminal where the bot is running.

## Viewing Logs

The bot logs to console (stderr). To save logs:

```bash
npm start 2>&1 | tee bot.log
```

## Data Files

The bot creates these files:
- `data/portfolio.json` - Your paper trading portfolio
- `data/stats.json` - Trading statistics
- `data/trades.json` - Trade history
- `data/analysis/` - Analysis history

## Next Steps

Once everything is working locally:
1. Test a few analysis cycles (wait ~2 minutes each)
2. Check for 429 errors in the logs
3. Verify the web dashboard shows correct data
4. When satisfied, push to Render for production

## Quick Test Commands

```bash
# Test environment variables
npm run test-env

# Start the bot
npm start

# In another terminal - check health
curl http://localhost:3000/health

# Check stats
curl http://localhost:3000/api/stats

# View portfolio
curl http://localhost:3000/api/portfolio
```

## Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `COINGECKO_API_KEY` | **Yes** | none | Your CoinGecko API key |
| `PORT` | No | 3000 | Server port |
| `NODE_ENV` | No | production | Environment mode |
| `AI_TRADING_ENABLED` | No | false | Enable AI trading |
| `AI_STRATEGY` | No | BALANCED | CONSERVATIVE, BALANCED, or AGGRESSIVE |
| `TRADING_MODE` | No | PAPER | PAPER or LIVE (use PAPER!) |
| `INITIAL_BALANCE` | No | 10000 | Starting balance in USD |

## Security Notes

- ✅ `.env` is already in `.gitignore` (won't be committed)
- ✅ Never commit your API keys
- ✅ Use PAPER mode for testing (never LIVE without careful setup)
- ✅ Keep your `.env` file private

## Need Help?

If you run into issues:
1. Check this guide first
2. Run `npm run test-env` to diagnose
3. Check the console logs for error messages
4. Verify your CoinGecko API key is valid and active
