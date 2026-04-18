// ============================================
// STRIPE CONFIGURATION - FRONTEND (Dubai only)
// ============================================
// IMPORTANT: Replace these keys with your real Stripe keys
// Get your keys at: https://dashboard.stripe.com/apikeys

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
// ENVIRONMENT CONFIGURATION
// ============================================
// Local file/localhost uses development by default.
// Remote deployed domains use production by default.
// Staging can force an explicit mode with window.__APP_ENV__ or APP_ENV/NODE_ENV.
function normalizeEnvironment(value) {
    if (typeof value !== 'string') {
        return '';
    }

    const normalized = value.trim().toLowerCase();
    return normalized === 'development' || normalized === 'production' ? normalized : '';
}

function isLocalHostname(hostname) {
    return hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname === '[::1]' ||
        (typeof hostname === 'string' && hostname.endsWith('.local'));
}

function detectEnvironment() {
    if (typeof window !== 'undefined') {
        const browserOverride = normalizeEnvironment(window.__APP_ENV__);
        if (browserOverride) {
            return browserOverride;
        }

        if (window.location) {
            if (window.location.protocol === 'file:' || isLocalHostname(window.location.hostname)) {
                return 'development';
            }

            return 'production';
        }
    }

    if (typeof process !== 'undefined' && process.env) {
        const processOverride = normalizeEnvironment(process.env.APP_ENV || process.env.NODE_ENV);
        if (processOverride) {
            return processOverride;
        }
    }

    return 'development';
}

const ENVIRONMENT = detectEnvironment();

// ============================================
// FINAL CONFIGURATION (Dubai only)
// ============================================
function getStripeConfig() {
    return ENVIRONMENT === 'production' ? PROD_CONFIG_DUBAI : DEV_CONFIG_DUBAI;
}

function getPublishableKey() {
    const config = getStripeConfig();
    return config.publishableKey || '';
}

function getConfiguredBackendUrl() {
    if (typeof window !== 'undefined' && typeof window.BACKEND_URL === 'string' && window.BACKEND_URL.trim()) {
        return window.BACKEND_URL.trim();
    }

    const config = getStripeConfig();
    return config.backendUrl || '';
}

const STRIPE_CONFIG = {
    ...getStripeConfig(),
    environment: ENVIRONMENT,
    isDevelopment: ENVIRONMENT !== 'production'
};

// Export configuration for Node.js usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        ENVIRONMENT,
        STRIPE_CONFIG,
        DEV_CONFIG_DUBAI,
        PROD_CONFIG_DUBAI,
        getStripeConfig,
        getPublishableKey,
        getConfiguredBackendUrl
    };
}

// Make globally available for the browser
if (typeof window !== 'undefined') {
    window.STRIPE_CONFIG = STRIPE_CONFIG;
    window.APP_ENVIRONMENT = ENVIRONMENT;
    window.getStripePublishableKey = getPublishableKey;
    window.getBackendUrl = getConfiguredBackendUrl;
}

