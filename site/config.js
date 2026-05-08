// ============================================
// STRIPE CONFIGURATION - FRONTEND (Dubai only)
// ============================================
// IMPORTANT: Replace these keys with your real Stripe keys.
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
// STAGING CONFIGURATION (Dubai only)
// ============================================
// Safe default for Vercel preview/preprod URLs. Replace these values once the
// Railway staging backend and Stripe test publishable key are confirmed.
const STAGING_CONFIG_DUBAI = {
    publishableKey: 'pk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    backendUrl: 'https://pgm-staging.up.railway.app',
    currency: 'aed',
    country: 'AE'
};

// ============================================
// PRODUCTION CONFIGURATION (Dubai only)
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
// Vercel preview URLs and staging/preprod hostnames use staging by default.
// Public custom domains use production.
// Any mode can be forced with window.__APP_ENV__ or APP_ENV/NODE_ENV.
function normalizeEnvironment(value) {
    if (typeof value !== 'string') {
        return '';
    }

    const normalized = value.trim().toLowerCase();

    if (normalized === 'development' || normalized === 'dev' || normalized === 'local') {
        return 'development';
    }

    if (normalized === 'staging' || normalized === 'stage' || normalized === 'preview' || normalized === 'preprod' || normalized === 'preproduction') {
        return 'staging';
    }

    return normalized === 'production' || normalized === 'prod' ? 'production' : '';
}

function normalizeHostname(hostname) {
    return String(hostname || '').trim().toLowerCase();
}

function isLocalHostname(hostname) {
    const normalizedHostname = normalizeHostname(hostname);
    return normalizedHostname === 'localhost' ||
        normalizedHostname === '127.0.0.1' ||
        normalizedHostname === '[::1]' ||
        normalizedHostname.endsWith('.local');
}

function isProductionHostname(hostname) {
    const normalizedHostname = normalizeHostname(hostname);
    return normalizedHostname === 'prestigegoalmotion.com' ||
        normalizedHostname === 'www.prestigegoalmotion.com' ||
        normalizedHostname === 'dynastyprestigecarrental.com' ||
        normalizedHostname === 'www.dynastyprestigecarrental.com';
}

function isStagingHostname(hostname) {
    const normalizedHostname = normalizeHostname(hostname);
    return normalizedHostname.endsWith('.vercel.app') ||
        normalizedHostname.includes('staging') ||
        normalizedHostname.includes('preprod') ||
        normalizedHostname.includes('preview');
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

            if (isStagingHostname(window.location.hostname)) {
                return 'staging';
            }

            if (isProductionHostname(window.location.hostname)) {
                return 'production';
            }

            return 'staging';
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
    if (ENVIRONMENT === 'production') {
        return PROD_CONFIG_DUBAI;
    }

    if (ENVIRONMENT === 'staging') {
        return STAGING_CONFIG_DUBAI;
    }

    return DEV_CONFIG_DUBAI;
}

function getRuntimeConfig() {
    if (typeof window === 'undefined') {
        return {};
    }

    return window.PGM_RUNTIME_CONFIG && typeof window.PGM_RUNTIME_CONFIG === 'object'
        ? window.PGM_RUNTIME_CONFIG
        : {};
}

function getPublishableKey() {
    const runtimeConfig = getRuntimeConfig();
    const runtimePublishableKey = runtimeConfig.publishableKey || runtimeConfig.stripePublishableKey;
    if (runtimePublishableKey) {
        return String(runtimePublishableKey).trim();
    }

    const config = getStripeConfig();
    return config.publishableKey || '';
}

function getConfiguredBackendUrl() {
    if (typeof window !== 'undefined' && typeof window.BACKEND_URL === 'string' && window.BACKEND_URL.trim()) {
        return window.BACKEND_URL.trim();
    }

    const runtimeConfig = getRuntimeConfig();
    const runtimeBackendUrl = runtimeConfig.backendUrl || runtimeConfig.apiBaseUrl;
    if (runtimeBackendUrl) {
        return String(runtimeBackendUrl).trim();
    }

    const config = getStripeConfig();
    return config.backendUrl || '';
}

const STRIPE_CONFIG = {
    ...getStripeConfig(),
    publishableKey: getPublishableKey(),
    backendUrl: getConfiguredBackendUrl(),
    environment: ENVIRONMENT,
    isDevelopment: ENVIRONMENT !== 'production',
    isStaging: ENVIRONMENT === 'staging',
    isProduction: ENVIRONMENT === 'production'
};

// Export configuration for Node.js usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        ENVIRONMENT,
        STRIPE_CONFIG,
        DEV_CONFIG_DUBAI,
        STAGING_CONFIG_DUBAI,
        PROD_CONFIG_DUBAI,
        getStripeConfig,
        getPublishableKey,
        getConfiguredBackendUrl,
        normalizeEnvironment,
        isStagingHostname,
        isProductionHostname
    };
}

// Make globally available for the browser
if (typeof window !== 'undefined') {
    window.STRIPE_CONFIG = STRIPE_CONFIG;
    window.APP_ENVIRONMENT = ENVIRONMENT;
    window.getStripePublishableKey = getPublishableKey;
    window.getBackendUrl = getConfiguredBackendUrl;
    window.getConfiguredBackendUrl = getConfiguredBackendUrl;
}
