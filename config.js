// ============================================
// CONFIGURACIÓN DE STRIPE - FRONTEND
// ============================================
// IMPORTANTE: Reemplaza estas claves con tus claves reales de Stripe
// Obtén tus claves en: https://dashboard.stripe.com/apikeys

const STRIPE_CONFIG = {
    // Clave pública de Stripe (Publishable Key)
    // Para pruebas (Test Mode): pk_test_...
    // Para producción (Live Mode): pk_live_...
    // ⚠️ REEMPLAZA CON TU CLAVE PÚBLICA REAL
    publishableKey: 'pk_test_51...', 
    
    // URL de tu backend para procesar pagos
    // Desarrollo local: 'http://localhost:3000'
    // Producción: 'https://api.tudominio.com'
    // ⚠️ CONFIGURA LA URL CORRECTA DE TU BACKEND
    backendUrl: 'http://localhost:3000',
    
    // Moneda para los pagos
    currency: 'eur',
    
    // País por defecto
    country: 'ES'
};

// Exportar configuración para uso en Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = STRIPE_CONFIG;
}

// Hacer disponible globalmente para el navegador
if (typeof window !== 'undefined') {
    window.STRIPE_CONFIG = STRIPE_CONFIG;
}
