# 📧 Configure Email in Railway - Step by Step

This guide helps you configure environment variables so confirmation emails work in Railway.

---

## ✅ Prerequisites

1. A Railway project deployed
2. Access to the Gmail account: `prestigegoalmotion@gmail.com`
3. Ability to generate a Google App Password

---

## 🔑 Step 1: Generate a Gmail App Password

1. Go to: https://myaccount.google.com/apppasswords
2. Sign in with `prestigegoalmotion@gmail.com`
3. Select:
   - App: **Mail**
   - Device: **Other** → type **"Dynasty Prestige"** or **"Railway"**
4. Click **Generate**
5. Copy the 16‑character password (shown once)

---

## 🚂 Step 2: Configure Railway Variables

Railway → Project → **Variables**

Add or verify:

```
EMAIL_SERVICE=gmail
EMAIL_USER=prestigegoalmotion@gmail.com
EMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx
```

---

## ✅ Step 3: Deploy and Test

1. Trigger a new deployment
2. Use the website contact form
3. Check Railway logs to confirm email delivery
