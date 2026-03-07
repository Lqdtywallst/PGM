# Install Stripe CLI on Windows

1. Download from https://stripe.com/docs/stripe-cli
2. Add to PATH
3. Run:
```powershell
stripe login
stripe listen --forward-to localhost:3000/api/webhook
```
