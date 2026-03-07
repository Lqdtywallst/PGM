# 🔑 How to Get Your Full Stripe Keys

## ✅ Already Configured

**Publishable Key (LIVE):**
```
pk_live_51RsMXQ3DSCa2l71zZiMkmlBXXpLu1HF0Sy4N4xSsB1TvUWu6wJLlKR5z7HrCa0AIlWQjfZo4tL8d1qcxtgExNHS300EPCAtXti
```

---

## 🔐 Keys You Still Need

### 1. Secret Key (`sk_live_...`)

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Ensure **LIVE** mode
3. Developers → **API keys**
4. Reveal and copy the **Secret key**

### 2. Webhook Secret (`whsec_...`)

1. Stripe Dashboard → Developers → **Webhooks**
2. Add endpoint:
   - Production: `https://pgm-production.up.railway.app/api/webhook`
3. Description: **"Dynasty Prestige - Payment Webhooks"**
4. Events:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
5. Reveal and copy the **Signing secret**

---

## 📝 Configure in Railway

Add to Railway → Variables:

```
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```
