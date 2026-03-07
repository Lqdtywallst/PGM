# 🔐 Railway Environment Variables

This file lists the environment variables you must configure in Railway.

## 📋 Required Variables

Paste these in Railway → Variables:

```env
# ============================================
# STRIPE - PAYMENTS
# ============================================
STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# ============================================
# EMAIL - GMAIL SETTINGS
# ============================================
EMAIL_SERVICE=gmail
EMAIL_USER=prestigegoalmotion@gmail.com
EMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx

# ============================================
# SERVER
# ============================================
PORT=3000
NODE_ENV=production

# ============================================
# WEBHOOKS (Optional but Recommended)
# ============================================
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## 📝 How to Get Each Variable

### 1. STRIPE_SECRET_KEY

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Ensure **LIVE** mode is selected
3. Developers → API keys
4. Copy the **Secret key** (`sk_live_...`)

### 2. EMAIL_USER

Configured as: `prestigegoalmotion@gmail.com`

### 3. EMAIL_APP_PASSWORD

1. Go to [Google App Passwords](https://myaccount.google.com/apppasswords)
2. Sign in with `prestigegoalmotion@gmail.com`
3. App: "Mail"
4. Device: "Other" → type "Dynasty Prestige"
5. Generate and copy the 16-character password

### 4. STRIPE_WEBHOOK_SECRET (Optional)

1. Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://your-backend.railway.app/api/webhook`
3. Select events: `payment_intent.succeeded`, `payment_intent.payment_failed`
4. Copy the signing secret (`whsec_...`)

---

## ✅ Verification

After configuring variables:

1. Railway → Deployments
2. Confirm latest deployment is **Running**
