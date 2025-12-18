// Configuración de Stripe
// IMPORTANTE: Reemplaza estas claves con tus claves reales de Stripe

const STRIPE_CONFIG = {
    // Clave pública de Stripe (Publishable Key)
    // Obténla en: https://dashboard.stripe.com/apikeys
    // Para pruebas usa: pk_test_...
    // Para producción usa: pk_live_...
    publishableKey: 'pk_test_51...', // ⚠️ REEMPLAZA CON TU CLAVE PÚBLICA
    
    // URL de tu backend para procesar pagos
    // Ejemplo: 'https://api.tudominio.com'
    backendUrl: 'http://localhost:3000', // ⚠️ CONFIGURA TU URL DEL BACKEND
    
    // Moneda
    currency: 'eur',
    
    // País
    country: 'ES'
};

// Exportar configuración
if (typeof module !== 'undefined' && module.exports) {
    module.exports = STRIPE_CONFIG;
}

