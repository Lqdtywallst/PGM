# 🍎 Configurar Apple Pay con Stripe

## ✅ Estado Actual

Apple Pay ya está implementado en el código y funcionará automáticamente cuando:
1. El dominio esté verificado en Stripe
2. El sitio use HTTPS (requerido para producción)
3. El usuario esté en un dispositivo Apple compatible

## 📋 Requisitos para Apple Pay

### 1. Dominio Verificado en Stripe

1. Ve a [Stripe Dashboard - Settings - Payment methods](https://dashboard.stripe.com/settings/payment_methods)
2. Busca la sección **Apple Pay**
3. Haz clic en **"Add domain"** o **"Manage domains"**
4. Agrega tu dominio de producción (ej: `prestigegoalmotion.com`)
5. Descarga el archivo de verificación que Stripe te proporciona
6. Sube el archivo a tu servidor en: `https://tu-dominio.com/.well-known/apple-developer-merchantid-domain-association`
7. Espera a que Stripe verifique el dominio (puede tardar unos minutos)

### 2. HTTPS Requerido

⚠️ **IMPORTANTE**: Apple Pay **solo funciona con HTTPS** en producción.

- Desarrollo local: Funciona con `http://localhost`
- Producción: **Debe usar HTTPS**

### 3. Dispositivos Compatibles

Apple Pay funciona en:
- **iPhone** (iOS 10.1+)
- **iPad** (iOS 10.1+)
- **Mac** (macOS Sierra+ con Touch ID o Apple Watch)
- **Safari** (versiones compatibles)
- **Chrome** en iOS (limitado)

## 🔧 Configuración Actual en el Código

### Frontend (index.html)

El código ya está configurado correctamente:

```javascript
const paymentRequest = stripe.paymentRequest({
    country: 'ES',
    currency: 'eur',
    total: {
        label: `Reservation ${currentSelectedCar} (${days} days)`,
        amount: totalCents,
    },
    requestPayerName: true,
    requestPayerEmail: true,
    requestPayerPhone: true,
});
```

### Backend (backend-example.js)

El backend ya está configurado para aceptar pagos de Apple Pay a través de PaymentIntents.

## 🚀 Pasos para Activar Apple Pay

### Paso 1: Verificar Dominio en Stripe Dashboard

1. Inicia sesión en [Stripe Dashboard](https://dashboard.stripe.com)
2. Ve a **Settings** → **Payment methods**
3. Busca **Apple Pay** y haz clic en **"Manage domains"**
4. Agrega tu dominio de producción
5. Descarga el archivo de verificación
6. Sube el archivo a tu servidor

### Paso 2: Configurar HTTPS

Si aún no tienes HTTPS:
- Usa un servicio como Let's Encrypt (gratis)
- O usa un servicio de hosting que incluya SSL (Cloudflare, etc.)

### Paso 3: Actualizar URL del Backend

Si tu backend está en producción, actualiza `config.js`:

```javascript
backendUrl: 'https://api.tudominio.com', // Cambiar de localhost a tu URL de producción
```

### Paso 4: Probar Apple Pay

1. Abre tu sitio en un dispositivo Apple (iPhone, iPad, Mac)
2. Usa Safari o un navegador compatible
3. Haz una reserva
4. Selecciona Apple Pay
5. Completa el pago con Face ID, Touch ID o contraseña

## 🧪 Probar en Desarrollo Local

Para probar Apple Pay en desarrollo local:

1. Asegúrate de estar usando `http://localhost` (funciona sin HTTPS)
2. Abre el sitio en un dispositivo Apple
3. El botón de Apple Pay debería aparecer automáticamente si:
   - Estás en un dispositivo Apple compatible
   - Tienes una tarjeta configurada en Apple Wallet
   - El navegador es compatible

## ⚠️ Notas Importantes

1. **Dominio Verificado**: Apple Pay solo funcionará en dominios verificados en Stripe
2. **HTTPS Obligatorio**: En producción, HTTPS es obligatorio
3. **Dispositivos Apple**: Solo funciona en dispositivos Apple
4. **Navegadores**: Funciona mejor en Safari, limitado en otros navegadores

## 🔍 Verificar que Funciona

### En el Código

El código verifica automáticamente si Apple Pay está disponible:

```javascript
const canMakePayment = await paymentRequest.canMakePayment();
if (canMakePayment && canMakePayment.applePay) {
    // Apple Pay está disponible
}
```

### En el Dashboard de Stripe

1. Ve a [Stripe Dashboard - Payments](https://dashboard.stripe.com/payments)
2. Busca pagos realizados con Apple Pay
3. Verifica que aparezcan como "Apple Pay" en el método de pago

## 📚 Recursos

- [Documentación de Apple Pay con Stripe](https://stripe.com/docs/apple-pay)
- [Guía de verificación de dominio](https://stripe.com/docs/apple-pay/web)
- [Stripe Dashboard - Payment Methods](https://dashboard.stripe.com/settings/payment_methods)

## ✅ Checklist

- [ ] Dominio verificado en Stripe Dashboard
- [ ] Archivo de verificación subido al servidor
- [ ] HTTPS configurado (para producción)
- [ ] URL del backend actualizada en `config.js` (si es producción)
- [ ] Probado en dispositivo Apple
- [ ] Pagos de prueba realizados con éxito

¡Listo! Apple Pay debería funcionar automáticamente una vez que el dominio esté verificado. 🎉

