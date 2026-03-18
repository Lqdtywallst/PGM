# Payment Timeout Fix

If Stripe requests time out:
- Verify network connectivity
- Check backend logs
- Retry with shorter payloads
