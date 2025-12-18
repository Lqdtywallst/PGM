// ============================================
// CONFIGURACIÓN DE STRIPE - FRONTEND
// ============================================
// IMPORTANTE: Reemplaza estas claves con tus claves reales de Stripe
// Obtén tus claves en: https://dashboard.stripe.com/apikeys

const STRIPE_CONFIG = {
    // Clave pública de Stripe (Publishable Key)
    // Para pruebas (Test Mode): pk_test_...
    // Para producción (Live Mode): pk_live_...
    // ✅ Clave pública configurada (Modo Live/Producción)
    publishableKey: 'pk_live_51RsMXQ3DSCa2l71zZiMkmlBXXpLu1HF0Sy4N4xSsB1TvUWu6wJLlKR5z7HrCa0AIlWQjfZo4tL8d1qcxtgExNHS300EPCAtXti', 
    
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
