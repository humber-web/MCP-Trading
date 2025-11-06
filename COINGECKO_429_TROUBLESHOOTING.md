# CoinGecko API Key Troubleshooting Guide

## ✅ Your API Key IS Being Detected!

Great news - your environment variable is working correctly:
```
✅ COINGECKO_API_KEY: CG-zp9...z3Ez (detected)
✅ CoinGecko API Key detected - Using 30 requests/minute limit
```

## ❌ But You're Still Getting 429 Errors

### Why This Happens

Even with an API key, you can still get rate limited if:

1. **Demo API Keys Have Lower Limits Than Expected**
   - CoinGecko's "Demo" plan might actually be limited to 10-15 req/min
   - NOT the 30 req/min we optimized for

2. **Request Bursts Are Too Aggressive**
   - Your bot makes 3 requests for market analysis
   - Then immediately makes 6 coin analyses (2-3 requests each)
   - That's ~20 requests in 30 seconds = 40 req/min burst rate

3. **Failed Requests Count Against Your Limit**
   - If a request gets 429, it still counts
   - Retries also count against your quota

## 🔍 Check Your CoinGecko Plan

### Step 1: Log into CoinGecko
1. Go to https://www.coingecko.com/en/developers/dashboard
2. Log in with your account
3. Check your "API Plan" section

### Step 2: Identify Your Plan

| Plan | Rate Limit | Header | Cost |
|------|-----------|--------|------|
| **Free** | 10-30 req/min | None | Free |
| **Demo** | 30 req/min* | `x-cg-demo-api-key` | $0/month |
| **Analyst** | 500 req/min | `x-cg-pro-api-key` | $129/month |
| **Pro** | 500 req/min | `x-cg-pro-api-key` | $499/month |

*Note: Demo limits vary and might be lower

### Step 3: Check Your Current Usage
In your CoinGecko dashboard:
- Look for "API Calls Today" or "Current Usage"
- Check if you're close to your monthly limit
- See if there's a "Rate Limit" display

## 🔑 Verify Your API Key Type

Your key starts with `CG-zp9...z3Ez` (27 characters).

**Check in CoinGecko Dashboard:**
1. Is this a "Demo API" key or "Pro API" key?
2. Is the key active and not expired?
3. What's the exact rate limit shown?

## 🛠️ Solutions

### Solution 1: If You Have Demo Plan (30 req/min)

The bot needs slower requests. Add this to your Render environment variables:

```
AI_CHECK_INTERVAL_HOURS=12
```

This reduces how often the bot analyzes (twice per day instead of 4x).

### Solution 2: If You Have Lower Limits (10-15 req/min)

We need to drastically slow down the requests. The current settings are:
- 2 second delay between requests
- 30 requests/minute expected

This is TOO FAST for lower-tier keys.

### Solution 3: Upgrade to Analyst Plan

If you're serious about trading:
- Analyst plan: $129/month
- 500 requests/minute (50x more!)
- No rate limit issues
- Worth it if you're trading significant amounts

### Solution 4: Reduce Watchlist Size

Edit your environment to analyze fewer coins:

Currently analyzing: 6 coins (bitcoin, ethereum, solana, cardano, polygon, avalanche)
Each coin = 3 API calls = 18 calls per analysis cycle

Reducing to 3 coins would cut API usage in half.

## 📊 Current Request Pattern

Your bot makes requests in this pattern:

1. **Market Analysis** (3 requests in ~4 seconds)
   - Bitcoin price
   - Ethereum price
   - Solana price

2. **Opportunity Scan** (18 requests in ~36 seconds)
   - 6 coins × 3 requests each
   - Happens immediately after market analysis

**Total: 21 requests in 40 seconds = 31.5 req/min effective rate**

This exceeds even the 30 req/min limit when considering overhead!

## ✅ Recommended Actions

### Immediate (Do This Now):

1. **Check your CoinGecko plan** in the dashboard
2. **Share your plan details** so I can optimize the settings
3. **Look for daily/monthly limits** - you might have hit them

### Short Term:

1. **Reduce analysis frequency**: Set `AI_CHECK_INTERVAL_HOURS=12`
2. **Reduce watchlist**: Analyze only top 3 coins
3. **Increase delays**: Change code to use 5-10 second delays

### Long Term:

1. **Upgrade to Analyst plan** if trading seriously ($129/month)
2. **Use multiple API keys** with rotation (advanced)
3. **Implement smarter caching** to reduce API calls

## 🆘 Need Help?

Share with me:
1. What plan do you see in your CoinGecko dashboard?
2. What's the rate limit shown?
3. Are you close to any monthly limits?

Then I can configure your bot perfectly for your plan!

## 📝 Quick Reference

**Your Current Settings:**
- API Key: Detected ✅
- Rate Limit: 30 req/min (configured)
- Actual Limit: Unknown (check dashboard)
- Delay: 2 seconds between requests
- Watchlist: 6 coins
- Analysis Frequency: Every 6 hours

**Optimal Settings for Demo Plan:**
- Delay: 5-10 seconds
- Watchlist: 3-4 coins max
- Analysis Frequency: Every 12 hours
