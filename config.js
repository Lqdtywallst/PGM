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
// DEVELOPMENT CONFIGURATION (per region)
// ============================================
const DEV_CONFIG_ES = {
    publishableKey: 'pk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    backendUrl: 'http://localhost:3000',
    currency: 'eur',
    country: 'ES'
};
const DEV_CONFIG_AE = {
    publishableKey: 'pk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    backendUrl: 'http://localhost:3000',
    currency: 'aed',
    country: 'AE'
};

// ============================================
// PRODUCTION CONFIGURATION (RAILWAY) - per region
// ============================================
const PROD_CONFIG_ES = {
    publishableKey: 'pk_live_51RsMXQ3DSCa2l71zZiMkmlBXXpLu1HF0Sy4N4xSsB1TvUWu6wJLlKR5z7HrCa0AIlWQjfZo4tL8d1qcxtgExNHS300EPCAtXti',
    backendUrl: 'https://pgm-production.up.railway.app',
    currency: 'eur',
    country: 'ES'
};
const PROD_CONFIG_AE = {
    publishableKey: 'pk_live_51RsMXQ3DSCa2l71zZiMkmlBXXpLu1HF0Sy4N4xSsB1TvUWu6wJLlKR5z7HrCa0AIlWQjfZo4tL8d1qcxtgExNHS300EPCAtXti',
    backendUrl: 'https://pgm-production.up.railway.app',
    currency: 'aed',
    country: 'AE'
};

// ============================================
// FINAL CONFIGURATION (by region from localStorage)
// ============================================
function getStripeConfig() {
    const region = (typeof localStorage !== 'undefined' && localStorage.getItem('pgm_region')) || 'ES';
    const dev = ENVIRONMENT !== 'production';
    if (region === 'AE') return dev ? DEV_CONFIG_AE : PROD_CONFIG_AE;
    return dev ? DEV_CONFIG_ES : PROD_CONFIG_ES;
}
const STRIPE_CONFIG = getStripeConfig();
const STRIPE_CONFIG_ES = ENVIRONMENT === 'production' ? PROD_CONFIG_ES : DEV_CONFIG_ES;
const STRIPE_CONFIG_AE = ENVIRONMENT === 'production' ? PROD_CONFIG_AE : DEV_CONFIG_AE;

// Export configuration for Node.js usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = STRIPE_CONFIG;
}

// Make globally available for the browser
if (typeof window !== 'undefined') {
    window.STRIPE_CONFIG = STRIPE_CONFIG;
    window.STRIPE_CONFIG_ES = STRIPE_CONFIG_ES;
    window.STRIPE_CONFIG_AE = STRIPE_CONFIG_AE;
}
