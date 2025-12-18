// Configuración de Stripe
// IMPORTANTE: Reemplaza estas claves con tus claves reales de Stripe

const STRIPE_CONFIG = {
    // Clave pública de Stripe (pk_live_51RsMXQ3DSCa2l71zZiMkmlBXXpLu1HF0Sy4N4xSsB1TvUWu6wJLlKR5z7HrCa0AIlWQjfZo4tL8d1qcxtgExNHS300EPCAtXti)
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




