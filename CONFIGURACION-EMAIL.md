# Configuración de Email - Prestige Goal Motion

## 📧 Sistema de Notificaciones por Email

El sistema envía automáticamente emails de confirmación cuando se completa una reserva:

1. **Email a la empresa** (`prestigegoalmotion@gmail.com`) - Notificación de nueva reserva
2. **Email al cliente** - Confirmación de su reserva

## 🔧 Configuración

### Opción 1: Gmail (Recomendado para empezar)

1. **Habilitar verificación en 2 pasos** en tu cuenta de Gmail
2. **Generar una contraseña de aplicación**:
   - Ve a [Google Account Security](https://myaccount.google.com/security)
   - Activa "Verificación en 2 pasos" si no está activada
   - Ve a "Contraseñas de aplicaciones"
   - Genera una nueva contraseña para "Correo" y "Otro (personalizado)" - escribe "Prestige Goal Motion"
   - Copia la contraseña generada (16 caracteres)

3. **Configurar variables de entorno** en tu archivo `.env`:

```env
# Configuración de Email
EMAIL_SERVICE=gmail
EMAIL_USER=prestigegoalmotion@gmail.com
EMAIL_APP_PASSWORD=tu_contraseña_de_aplicación_aqui
```

### Opción 2: Otro servicio SMTP

Si prefieres usar otro proveedor de email (SendGrid, Mailgun, etc.), configura:

```env
# Configuración de Email SMTP personalizado
EMAIL_SERVICE=smtp
EMAIL_HOST=smtp.tu-proveedor.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=tu_email@ejemplo.com
EMAIL_PASSWORD=tu_contraseña
```

Y actualiza el código en `backend-example.js`:

```javascript
const emailTransporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT || 587,
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
    },
});
```

## 📋 Variables de Entorno Requeridas

Agrega estas variables a tu archivo `.env`:

```env
# Email (Gmail)
EMAIL_SERVICE=gmail
EMAIL_USER=prestigegoalmotion@gmail.com
EMAIL_APP_PASSWORD=tu_contraseña_de_aplicación

# O para SMTP personalizado
# EMAIL_HOST=smtp.tu-proveedor.com
# EMAIL_PORT=587
# EMAIL_SECURE=false
```

## ✅ Verificar la Configuración

1. Inicia el servidor: `npm start`
2. Realiza una reserva de prueba
3. Verifica que recibas:
   - Email en `prestigegoalmotion@gmail.com` con los detalles de la reserva
   - Email al cliente con la confirmación

## 🔍 Solución de Problemas

### Error: "Invalid login"
- Verifica que `EMAIL_USER` sea correcto
- Asegúrate de usar la **contraseña de aplicación** de Gmail, no tu contraseña normal
- Verifica que la verificación en 2 pasos esté activada

### Error: "Connection timeout"
- Verifica tu conexión a internet
- Si usas un firewall, permite conexiones SMTP (puerto 587 o 465)

### Los emails no se envían
- Revisa los logs del servidor para ver errores específicos
- Verifica que las variables de entorno estén configuradas correctamente
- Prueba enviar un email de prueba manualmente

## 📝 Notas Importantes

- ⚠️ **NUNCA** subas tu archivo `.env` al repositorio Git
- ⚠️ La contraseña de aplicación de Gmail es diferente a tu contraseña normal
- ✅ Los emails se envían automáticamente cuando se confirma un pago
- ✅ También se envían a través de webhooks de Stripe

## 🚀 Producción

Para producción, considera:
- Usar un servicio de email transaccional profesional (SendGrid, Mailgun, AWS SES)
- Configurar SPF y DKIM para mejorar la entrega
- Implementar cola de emails para mejor rendimiento
- Agregar logs de emails enviados

