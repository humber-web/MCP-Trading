# 🚀 Deploy to Railway (FREE - No Credit Card)

## Why Railway?
- ✅ **$5 FREE trial credit** (no credit card required)
- ✅ **Always-on** (OrderManager keeps monitoring)
- ✅ **Dead simple** deployment
- ✅ Lasts 1-2 months on free credit

---

## 📋 Step-by-Step Deployment

### 1. Create Railway Account

1. Go to **[railway.app](https://railway.app)**
2. Click **"Login"** → **"Login with GitHub"**
3. Authorize Railway
4. **Done!** No credit card needed

---

### 2. Deploy Your Bot

#### Method A: One-Click Deploy (Easiest)

1. Go to Railway dashboard
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Find: **`humber-web/MCP-Trading`**
5. Select branch: **`claude/incomplete-query-011CUqFU9PoGSpMZFU33g4y2`**
6. Click **"Deploy"**

Railway will automatically:
- ✅ Detect it's a Node.js app
- ✅ Run `npm install`
- ✅ Start with `npm start`
- ✅ Assign a public URL

---

### 3. Add Environment Variables

1. Click on your deployed service
2. Go to **"Variables"** tab
3. Click **"+ Add Variable"**
4. Add these:

```
NODE_ENV=production
PORT=3000
ENABLE_WEB=only
INITIAL_BALANCE=10000
```

5. Click **"Deploy"** to restart with new variables

---

### 4. Get Your URL

1. Go to **"Settings"** tab
2. Scroll to **"Domains"**
3. Click **"Generate Domain"**
4. You'll get: `https://your-app.up.railway.app`

---

### 5. Open Your Trading Dashboard!

```
🌐 Your Bot: https://your-app.up.railway.app
📊 Dashboard: https://your-app.up.railway.app/
🏥 Health: https://your-app.up.railway.app/health
```

---

## 💰 Free Credit Details

- **$5 credit** included (free forever)
- **Usage:** ~$0.10/day for this bot
- **Duration:** ~50 days of runtime
- **After credit:** Upgrade or redeploy elsewhere

---

## ✅ What Works on Railway

- ✅ OrderManager monitors 24/7
- ✅ Stop-loss auto-executes
- ✅ Take-profit auto-executes
- ✅ Web dashboard always accessible
- ✅ No sleeping (stays awake)
- ✅ Portfolio persists (in memory)

---

## 🎯 Quick Test

Once deployed:

1. Open your Railway URL
2. See the dashboard
3. Click "Buy Crypto"
4. Buy $500 Bitcoin with stop-loss
5. Watch OrderManager in logs (Settings → Deployments → Logs):
   ```
   ✅ Order monitoring started
   ✅ OrderManager initialized
   🛡️ Stop-Loss/Take-Profit orders: 1
   ```

---

## 📊 Monitor Usage

1. Go to Railway dashboard
2. Click your project
3. See **"Usage"** tab
4. Track remaining credit

---

## 🔄 Alternative: Render (Also FREE, No CC)

If Railway doesn't work, use Render:

1. **[render.com](https://render.com)** → Sign up with GitHub
2. **No credit card required**
3. **Free tier** (sleeps after 15min, but we prevent this)
4. Follow same steps as Railway

---

## ⚡ Which Should You Choose?

| Feature | Railway | Render |
|---------|---------|--------|
| Credit Card | ❌ Not needed | ❌ Not needed |
| Free Credit | $5 (~50 days) | Forever free |
| Sleeps? | ❌ Never | ⚠️ After 15min |
| Ease of Use | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| Recommended | ✅ **START HERE** | If Railway full |

---

## 🚀 Ready to Deploy?

**I recommend Railway** because:
1. No credit card
2. $5 free credit (lasts weeks)
3. Simplest setup
4. Stays always-on
5. 5-minute deployment

**Want me to create the Railway config files now?** Or help you through the deployment process?
