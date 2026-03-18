# 🧪 Email Diagnostics

## 1) Verify Gmail App Password

1. Go to https://myaccount.google.com/apppasswords
2. App: **Mail**
3. Device: **Other** → "Dynasty Prestige"
4. Generate and copy the 16‑character password

## 2) Environment Variables

```
EMAIL_SERVICE=gmail
EMAIL_USER=prestigegoalmotion@gmail.com
EMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx
```

## 3) Verify Endpoint Calls

Check browser console after submitting the contact form:

```
[CONTACT] Sending email...
[CONTACT] Response: { success: true, ... }
```

## 4) Common Errors

- **Invalid login**: App password incorrect
- **Connection timeout**: Server cannot reach SMTP
