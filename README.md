# Dynasty Prestige - Official Website

Professional website for Dynasty Prestige - Luxury Car Rental

## 🚗 Features

- **Professional Design**: Elegant interface with black, gold, and silver palette
- **Reservation System**: Interactive calendar with vehicle availability
- **Payment Gateway**: Full Stripe integration (Apple Pay, Google Pay, Cards, Stripe Link)
- **Contact Form**: Full contact system with validation
- **Responsive Design**: Adapted for all devices

## 🚙 Vehicle Fleet

- Mercedes GLE 53 AMG
- Mercedes GLE Coupe 400 D
- Mercedes GLE 400D
- Lamborghini Huracán

## 📋 Technologies Used

- HTML5
- CSS3
- JavaScript (Vanilla)
- Stripe.js
- Node.js / Express (Backend)
- Font Awesome

## 🔧 Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Configure environment variables in `.env`:
   - `STRIPE_SECRET_KEY` - Stripe secret key
   - `STRIPE_WEBHOOK_SECRET` - Webhook secret (optional)
4. Configure `config.js` with your Stripe publishable key
5. Start the backend server: `npm start`
6. Open `index.html` in a browser

## 💳 Stripe Payments Integration

Stripe payments are fully implemented. See `STRIPE-IMPLEMENTACION.md` for full details.

### Available payment methods:
- ✅ Credit/Debit cards (Stripe Elements)
- ✅ Apple Pay
- ✅ Google Pay
- ✅ Stripe Link

## 📞 Contact

- **Address**: Palm Jumeirah, Dubai, UAE
- **Phone**: +971 586122568
- **Email**: prestigegoalmotion@gmail.com
- **Instagram**: @prestigegoalmotion
- **Hours**: 24/7, Monday to Monday

## 📝 Notes

- The payment system requires backend configuration with Stripe
- Images use external URLs (consider hosting your own for production)
- Availability calendar is simulated (connect to a real database)

## 📄 License

© 2025 Dynasty Prestige. All rights reserved.
