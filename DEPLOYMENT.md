# 🚀 Deployment Guide - CryptoTrader MCP

This guide will help you deploy your trading bot to the cloud so you can access it from anywhere and test it with real-time monitoring.

---

## 📋 Prerequisites

- GitHub account (for deployment)
- Render account (FREE - sign up at [render.com](https://render.com))

---

## 🎯 Option 1: Deploy to Render (RECOMMENDED - FREE)

### Step 1: Prepare Your Repository

1. Make sure all changes are committed:
```bash
git add -A
git commit -m "feat: Add web dashboard for deployment"
git push
```

### Step 2: Deploy to Render

1. **Go to [Render Dashboard](https://dashboard.render.com)**

2. **Click "New +" → "Web Service"**

3. **Connect Your GitHub Repository:**
   - Select "Connect GitHub"
   - Find and select `MCP-Trading` repository
   - Click "Connect"

4. **Configure the Service:**
   ```
   Name: cryptotrader-mcp
   Region: Oregon (US West)
   Branch: claude/incomplete-query-011CUqFU9PoGSpMZFU33g4y2
   Runtime: Node
   Build Command: npm install
   Start Command: npm start
   Plan: Free
   ```

5. **Add Environment Variables:**
   Click "Advanced" and add:
   ```
   NODE_ENV = production
   PORT = 3000
   ENABLE_WEB = true
   INITIAL_BALANCE = 10000
   ```

6. **Click "Create Web Service"**

### Step 3: Wait for Deployment

- First deployment takes 2-5 minutes
- Render will:
  - Clone your repo
  - Install dependencies
  - Start the server
  - Assign you a URL like: `https://cryptotrader-mcp.onrender.com`

### Step 4: Access Your Trading Bot

Once deployed, you'll see:
```
✅ Live at: https://cryptotrader-mcp.onrender.com
```

Open this URL in your browser to access the trading dashboard!

---

## 🎨 What You'll See

### Dashboard Features:

1. **Portfolio Overview**
   - Total value with ROI
   - Cash balance
   - Number of positions

2. **Trading Interface**
   - Buy crypto (with stop-loss/take-profit)
   - Sell positions
   - View current positions with live P&L

3. **Order Management**
   - Active stop-loss orders
   - Take-profit orders
   - Pending limit orders

4. **Trade History**
   - Recent trades
   - P&L for each trade
   - Trade timestamps

5. **Auto-Refresh**
   - Dashboard refreshes every 15 seconds
   - See real-time price updates

---

## ⚠️ Important Notes for FREE Tier

### Free Tier Limitations:

1. **Service Sleeps After 15 Minutes of Inactivity**
   - First request after sleep takes 30-60 seconds
   - OrderManager will restart and resume monitoring

2. **No Persistent Disk (Data Resets on Restart)**
   - Portfolio resets to $10,000 on restart
   - To preserve data, upgrade to paid tier ($7/month for persistent disk)

3. **Keep It Awake (Optional)**
   - Use a service like [UptimeRobot](https://uptimerobot.com) (free)
   - Ping your `/health` endpoint every 5 minutes
   - This prevents sleeping

---

## 🔧 Configure Keep-Alive (Prevent Sleeping)

### Option A: Use UptimeRobot

1. Go to [UptimeRobot](https://uptimerobot.com)
2. Sign up (free)
3. Create new monitor:
   - Type: HTTP(s)
   - URL: `https://your-app.onrender.com/health`
   - Interval: 5 minutes
4. Save

Now your bot stays awake!

### Option B: Use Cron-Job.org

1. Go to [Cron-Job.org](https://cron-job.org)
2. Sign up (free)
3. Create new cron job:
   - URL: `https://your-app.onrender.com/health`
   - Every: 5 minutes
4. Save

---

## 💾 Enable Persistent Storage (Upgrade)

If you want to keep your portfolio data across restarts:

1. **Upgrade to Paid Plan** ($7/month)
2. **Add Persistent Disk:**
   - Go to your service settings
   - Click "Disks"
   - Add new disk: `/home/user/MCP-Trading/data`
   - Size: 1GB (more than enough)

Now your portfolio persists!

---

## 📊 Test Your Deployment

### 1. Health Check
```bash
curl https://your-app.onrender.com/health
```

Should return:
```json
{
  "status": "ok",
  "timestamp": "2025-11-05T...",
  "uptime": 123.45
}
```

### 2. Portfolio API
```bash
curl https://your-app.onrender.com/api/portfolio
```

### 3. Execute a Test Trade

Open your dashboard and:
1. Click "Buy Crypto"
2. Select Bitcoin
3. Enter $500
4. Set stop-loss: (current price - 5%)
5. Set take-profit: (current price + 10%)
6. Click "Execute Buy Order"
7. Watch it appear in "Current Positions"

---

## 🔍 Monitoring & Debugging

### View Logs

1. Go to your Render dashboard
2. Click on your service
3. Go to "Logs" tab
4. See real-time server logs:
   ```
   ✅ Order monitoring started
   ✅ OrderManager initialized
   🌐 Web dashboard: http://...
   📊 API endpoints: http://...
   ```

### Check Order Monitoring

In the dashboard, look at "Order Statistics":
- Monitoring: **ACTIVE** (green badge)
- Should show active stop-loss/take-profit orders

### Test Stop-Loss Trigger

1. Buy a small amount (e.g., $100)
2. Set stop-loss at current price + $1 (will trigger immediately when price drops)
3. Wait for price to change
4. See automatic sell in trade history

---

## 🚀 Production Checklist

Before using real money (when you integrate real exchanges):

- [ ] Test all trading operations in paper trading mode
- [ ] Verify stop-loss triggers work correctly
- [ ] Test take-profit triggers work correctly
- [ ] Monitor for 24 hours to ensure stability
- [ ] Set up UptimeRobot to keep service awake
- [ ] Enable persistent storage
- [ ] Set up email alerts for critical errors
- [ ] Review and adjust risk parameters

---

## 🐛 Troubleshooting

### Service Won't Start
**Check logs for errors:**
- Missing dependencies? Run `npm install` locally first
- Port conflict? Render uses PORT from environment

### OrderManager Not Running
**Check logs for:**
```
✅ Order monitoring started
✅ OrderManager initialized
```

If missing, check that `ENABLE_WEB=true`

### Dashboard Shows Errors
**Check browser console (F12)**
- API errors? Check `/api/portfolio` endpoint
- CORS issues? Should be enabled by default

### Orders Not Executing
**Verify in logs:**
- Price monitoring frequency (10s default)
- Current prices vs. stop-loss/take-profit levels
- Order queue status

---

## 📞 Support

If you encounter issues:

1. Check logs first
2. Verify all environment variables
3. Test locally: `npm start`
4. Check GitHub Issues

---

## 🎉 Success!

Once deployed, you have:
- ✅ Live trading dashboard accessible from anywhere
- ✅ Automatic stop-loss/take-profit execution
- ✅ Real-time portfolio monitoring
- ✅ Order management interface
- ✅ Trade history tracking

**Your bot is now running 24/7 in the cloud!** 🚀

---

## 💡 Next Steps

1. **Test thoroughly** with paper trading
2. **Monitor for a week** to ensure stability
3. **Adjust risk parameters** based on performance
4. **Add new features** (from our todo list)
5. **Integrate real exchange APIs** (when ready)

---

**Need help?** Check the logs, read the documentation, or open an issue on GitHub.

**Happy Trading!** 📈💰
