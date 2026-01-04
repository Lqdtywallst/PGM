# 🔍 Diagnóstico de Emails de Confirmación

## Problema
Los emails de confirmación no se están enviando ni al cliente ni a la empresa después de una reserva exitosa.

## Pasos para Diagnosticar

### 1. Verificar Logs del Backend

Después de hacer una reserva, revisa la consola del backend donde está corriendo `node backend-example.js`. Deberías ver logs como:

```
[API CONFIRM] ========== CONFIRMACIÓN DE RESERVA ==========
[EMAIL] ========== INICIANDO ENVÍO DE EMAILS ==========
[EMAIL] Configuración: { from: '...', service: 'gmail', hasPassword: true }
[EMAIL] Enviando email a la empresa: prestigegoalmotion@gmail.com
[EMAIL] ✅ Email a empresa enviado: { messageId: '...', accepted: [...], rejected: [] }
[EMAIL] Enviando email al cliente: cliente@email.com
[EMAIL] ✅ Email al cliente enviado: { messageId: '...', accepted: [...], rejected: [] }
```

### 2. Verificar Configuración en `.env`

Asegúrate de que tu archivo `.env` tenga:

```env
EMAIL_USER=prestigegoalmotion@gmail.com
EMAIL_PASSWORD=tu_contraseña_de_aplicación_gmail
EMAIL_SERVICE=gmail
```

**⚠️ IMPORTANTE**: Para Gmail, necesitas usar una **Contraseña de Aplicación**, no tu contraseña normal.

#### Cómo obtener una Contraseña de Aplicación de Gmail:

1. Ve a: https://myaccount.google.com/apppasswords
2. Inicia sesión con tu cuenta de Gmail
3. Selecciona "Aplicación": "Correo"
4. Selecciona "Dispositivo": "Otro (nombre personalizado)" y escribe "Prestige Goal Motion"
5. Haz clic en "Generar"
6. Copia la contraseña de 16 caracteres (sin espacios)
7. Úsala en tu `.env` como `EMAIL_PASSWORD`

### 3. Verificar que el Endpoint se Llame

En la consola del navegador (F12), después de completar el pago, deberías ver:

```
[PAYMENT] Confirmando reserva en el backend...
[PAYMENT] Respuesta de confirmación: { success: true, emailSent: true, ... }
```

### 4. Errores Comunes

#### Error: "Invalid login"
- **Causa**: Contraseña incorrecta o no es una contraseña de aplicación
- **Solución**: Genera una nueva contraseña de aplicación en Gmail

#### Error: "Connection timeout"
- **Causa**: Problemas de red o firewall
- **Solución**: Verifica tu conexión a internet y firewall

#### Error: "Email not sent" pero sin error específico
- **Causa**: El emailTransporter no está configurado correctamente
- **Solución**: Verifica que `EMAIL_CONFIG` tenga los valores correctos

### 5. Verificar en los Logs del Backend

Busca estos mensajes específicos:

✅ **Si ves esto, los emails se están enviando:**
```
[EMAIL] ✅ Email a empresa enviado: { messageId: '...', accepted: ['prestigegoalmotion@gmail.com'] }
[EMAIL] ✅ Email al cliente enviado: { messageId: '...', accepted: ['cliente@email.com'] }
```

❌ **Si ves esto, hay un error:**
```
[EMAIL] ❌ ERROR ENVIANDO EMAILS: ...
[EMAIL] Error details: { message: '...', code: '...' }
```

### 6. Probar el Envío de Email Manualmente

Puedes probar si el email funciona creando un archivo de prueba:

```javascript
// test-email.js
require('dotenv').config();
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
    },
});

transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: 'prestigegoalmotion@gmail.com',
    subject: 'Test Email',
    text: 'Este es un email de prueba',
}, (error, info) => {
    if (error) {
        console.error('❌ Error:', error);
    } else {
        console.log('✅ Email enviado:', info.messageId);
    }
});
```

Ejecuta: `node test-email.js`

### 7. Verificar que el Frontend Llame al Endpoint

En la consola del navegador, después del pago exitoso, verifica:

1. Abre la pestaña "Network" (Red) en las herramientas de desarrollador
2. Busca la petición a `/api/reserve/confirm`
3. Verifica que:
   - El status sea `200`
   - La respuesta contenga `emailSent: true`

## Solución Rápida

Si los emails no se envían, verifica en este orden:

1. ✅ `.env` tiene `EMAIL_USER` y `EMAIL_PASSWORD` correctos
2. ✅ `EMAIL_PASSWORD` es una contraseña de aplicación de Gmail (16 caracteres)
3. ✅ El backend está corriendo y muestra logs de email
4. ✅ El frontend está llamando a `/api/reserve/confirm` después del pago
5. ✅ No hay errores en la consola del backend

## Contacto

Si después de verificar todo lo anterior los emails aún no se envían, comparte:
- Los logs completos del backend después de una reserva
- El contenido de `.env` (sin la contraseña, solo los nombres de variables)
- Los errores que aparecen en la consola del navegador








