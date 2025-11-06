# Render Deployment Setup

## Adding CoinGecko API Key on Render

### Step 1: Get Your CoinGecko API Key
1. Go to https://www.coingecko.com/en/api/pricing
2. Sign up or log in to your account
3. Subscribe to a plan or use the free demo tier
4. Copy your API key (format: `CG-xxxxxxxxxxxx`)

### Step 2: Add Environment Variable on Render

1. **Go to your Render Dashboard**
   - Navigate to https://dashboard.render.com
   - Select your service (MCP-Trading)

2. **Open Environment Settings**
   - Click on "Environment" in the left sidebar
   - Scroll to "Environment Variables" section

3. **Add the API Key**
   - Click "Add Environment Variable"
   - **Key:** `COINGECKO_API_KEY`
   - **Value:** Your API key (e.g., `CG-abc123def456ghi789`)
   - Click "Save Changes"

4. **Redeploy (if needed)**
   - Render will automatically redeploy your service
   - Or manually click "Manual Deploy" → "Deploy latest commit"

### Step 3: Verify the Configuration

After deployment completes, check your logs for:

```
🔧 Environment Configuration:
   ✅ COINGECKO_API_KEY: CG-abc...789 (detected)
```

And in the PricesManager initialization:
```
✅ CoinGecko API Key detected - Using 30 requests/minute limit
```

### Expected Benefits

| Metric | Without API Key | With API Key |
|--------|----------------|--------------|
| Rate Limit | 10 req/min | **30 req/min** |
| Request Interval | 4 seconds | **2 seconds** |
| Analysis Time | ~50-60s | **~25-30s** |
| Success Rate | Lower | **Higher** |

## Troubleshooting

### "⚠️ No CoinGecko API Key - Using conservative 10 requests/minute limit"

**Possible causes:**
1. Environment variable name is misspelled
   - ✅ Correct: `COINGECKO_API_KEY`
   - ❌ Wrong: `COINGECKO_KEY`, `CG_API_KEY`, etc.

2. API key has extra spaces
   - Remove leading/trailing spaces from the value

3. Service didn't redeploy after adding the variable
   - Manually trigger a redeploy

4. The .env file is being used instead of Render environment
   - On Render, environment variables override .env file
   - Make sure the key is set in Render dashboard

### How to Debug

Check your Render logs for the startup message:
```bash
🔧 Environment Configuration:
   COINGECKO_API_KEY: ...
```

If it shows "not set", the environment variable isn't being loaded.

### Still Having Issues?

1. **Double-check the variable name**: `COINGECKO_API_KEY` (exact match)
2. **Check your CoinGecko key** is valid and active
3. **Verify your plan** on CoinGecko (Demo or Pro)
4. **Redeploy** the service after any environment changes
5. **Check logs** for any error messages during startup

## Additional Environment Variables

You may also want to configure:

```bash
# AI Trading Configuration
AI_TRADING_ENABLED=true          # Enable autonomous trading
AI_STRATEGY=BALANCED             # CONSERVATIVE, BALANCED, or AGGRESSIVE
AI_CHECK_INTERVAL_HOURS=6        # How often to check (1-24 hours)

# Trading Mode
TRADING_MODE=PAPER               # PAPER (safe) or LIVE (real money)

# Server Configuration
PORT=3000                        # Server port
NODE_ENV=production              # Environment
```

## Security Notes

- ✅ Environment variables are encrypted at rest on Render
- ✅ They are not exposed in logs (partially masked)
- ✅ They are not committed to your git repository
- ⚠️ Never share your API keys or commit them to version control

## Need Help?

- Render Documentation: https://render.com/docs/environment-variables
- CoinGecko API Docs: https://www.coingecko.com/en/api/documentation
- Project Issues: https://github.com/humber-web/MCP-Trading/issues
