# 🔔 Configure Stripe Webhooks

## 1) Open Stripe Dashboard

Go to [https://dashboard.stripe.com](https://dashboard.stripe.com) and ensure the correct mode (Live or Test).

## 2) Create a Webhook Endpoint

1. Developers → **Webhooks**
2. **Add endpoint**
3. Endpoint URL:
   - Development: `http://localhost:3000/api/webhook`
   - Production: `https://your-domain.com/api/webhook`
4. Description: **"Dynasty Prestige - Payment Webhooks"**
5. Events:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.succeeded` (optional)
   - `charge.failed` (optional)

## 3) Copy the Signing Secret

Open the endpoint and copy the **Signing secret** (`whsec_...`)

Add to `.env`:

```env
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
```
