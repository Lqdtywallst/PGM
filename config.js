// ============================================
// CONFIGURACIÓN DE STRIPE - FRONTEND
// ============================================
// IMPORTANTE: Reemplaza estas claves con tus claves reales de Stripe
// Obtén tus claves en: https://dashboard.stripe.com/apikeys

// ============================================
// CONFIGURACIÓN DE ENTORNO
// ============================================
// Cambia 'development' a 'production' cuando despliegues
const ENVIRONMENT = 'production'; // 'development' | 'production'

// ============================================
// CONFIGURACIÓN DE DESARROLLO
// ============================================
const DEV_CONFIG = {
    publishableKey: 'pk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', // Clave de PRUEBA
    backendUrl: 'http://localhost:3000',
    currency: 'eur',
    country: 'ES'
};

// ============================================
// CONFIGURACIÓN DE PRODUCCIÓN (RAILWAY)
// ============================================
// ✅ URL de Railway configurada
const PROD_CONFIG = {
    publishableKey: 'pk_live_51RsMXQ3DSCa2l71zZiMkmlBXXpLu1HF0Sy4N4xSsB1TvUWu6wJLlKR5z7HrCa0AIlWQjfZo4tL8d1qcxtgExNHS300EPCAtXti', // Clave LIVE
    backendUrl: 'https://pgm-production.up.railway.app', // ✅ URL de Railway configurada
    currency: 'eur',
    country: 'ES'
};

// ============================================
// CONFIGURACIÓN FINAL
// ============================================
// Se selecciona automáticamente según ENVIRONMENT
const STRIPE_CONFIG = ENVIRONMENT === 'production' ? PROD_CONFIG : DEV_CONFIG;

// Exportar configuración para uso en Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = STRIPE_CONFIG;
}

// Hacer disponible globalmente para el navegador
if (typeof window !== 'undefined') {
    window.STRIPE_CONFIG = STRIPE_CONFIG;
}
