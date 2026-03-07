// ============================================
// STRIPE CONFIGURATION - FRONTEND
// ============================================
// IMPORTANT: Replace these keys with your real Stripe keys
// Get your keys at: https://dashboard.stripe.com/apikeys

// ============================================
// ENVIRONMENT CONFIGURATION
// ============================================
// Change 'development' to 'production' when deploying
const ENVIRONMENT = 'production'; // 'development' | 'production'

// ============================================
// DEVELOPMENT CONFIGURATION
// ============================================
const DEV_CONFIG = {
    publishableKey: 'pk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', // TEST key
    backendUrl: 'http://localhost:3000',
    currency: 'aed',
    country: 'AE'
};

// ============================================
// PRODUCTION CONFIGURATION (RAILWAY)
// ============================================
// ✅ Railway URL configured
const PROD_CONFIG = {
    publishableKey: 'pk_live_51RsMXQ3DSCa2l71zZiMkmlBXXpLu1HF0Sy4N4xSsB1TvUWu6wJLlKR5z7HrCa0AIlWQjfZo4tL8d1qcxtgExNHS300EPCAtXti', // LIVE key
    backendUrl: 'https://pgm-production.up.railway.app', // ✅ Railway URL configured
    currency: 'aed',
    country: 'AE'
};

// ============================================
// FINAL CONFIGURATION
// ============================================
// Automatically selected based on ENVIRONMENT
const STRIPE_CONFIG = ENVIRONMENT === 'production' ? PROD_CONFIG : DEV_CONFIG;

// Export configuration for Node.js usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = STRIPE_CONFIG;
}

// Make globally available for the browser
if (typeof window !== 'undefined') {
    window.STRIPE_CONFIG = STRIPE_CONFIG;
}
