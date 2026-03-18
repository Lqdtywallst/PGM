// ============================================
// STRIPE CONFIGURATION - FRONTEND (Dubai only)
// ============================================
// IMPORTANT: Replace these keys with your real Stripe keys
// Get your keys at: https://dashboard.stripe.com/apikeys

// ============================================
// ENVIRONMENT CONFIGURATION
// ============================================
// Change 'development' to 'production' when deploying
const ENVIRONMENT = 'production'; // 'development' | 'production'

// ============================================
// DEVELOPMENT CONFIGURATION (Dubai only)
// ============================================
const DEV_CONFIG_DUBAI = {
    publishableKey: 'pk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    backendUrl: 'http://localhost:3000',
    currency: 'aed',
    country: 'AE'
};

// ============================================
// PRODUCTION CONFIGURATION (Railway – Dubai)
// ============================================
const PROD_CONFIG_DUBAI = {
    publishableKey: 'pk_live_51RsMXQ3DSCa2l71zZiMkmlBXXpLu1HF0Sy4N4xSsB1TvUWu6wJLlKR5z7HrCa0AIlWQjfZo4tL8d1qcxtgExNHS300EPCAtXti',
    backendUrl: 'https://pgm-production.up.railway.app',
    currency: 'aed',
    country: 'AE'
};

// ============================================
// FINAL CONFIGURATION (Dubai only)
// ============================================
function getStripeConfig() {
    const dev = ENVIRONMENT !== 'production';
    return dev ? DEV_CONFIG_DUBAI : PROD_CONFIG_DUBAI;
}

const STRIPE_CONFIG = getStripeConfig();

// Export configuration for Node.js usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = STRIPE_CONFIG;
}

// Make globally available for the browser
if (typeof window !== 'undefined') {
    window.STRIPE_CONFIG = STRIPE_CONFIG;
}

