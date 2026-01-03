# ✅ Configuración de Railway Completada

## 🎉 Estado Actual

Tu aplicación está configurada para usar Railway en producción.

### Configuración Aplicada:

- ✅ **URL del Backend**: `https://pgm-production.up.railway.app`
- ✅ **Entorno**: `production`
- ✅ **Clave Stripe**: Modo LIVE (`pk_live_...`)

---

## 📋 Próximos Pasos

### 1. Verificar Variables de Entorno en Railway

Asegúrate de que en Railway → Variables estén configuradas:

```env
STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
EMAIL_SERVICE=gmail
EMAIL_USER=prestigegoalmotion@gmail.com
EMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx
PORT=3000
NODE_ENV=production
```

### 2. Verificar que el Backend esté Desplegado

1. Ve a [Railway Dashboard](https://railway.app)
2. Verifica que el servicio esté corriendo (check verde ✅)
3. Revisa los logs para asegurarte de que no hay errores

### 3. Probar la Conexión

Abre en tu navegador:
```
https://pgm-production.up.railway.app/api/test
```

Deberías ver:
```json
{
  "status": "ok",
  "message": "Servidor funcionando correctamente"
}
```

### 4. Probar el Frontend

1. Abre tu sitio web
2. Abre la consola del navegador (F12)
3. Deberías ver: `Verificando conexión con servidor: https://pgm-production.up.railway.app`
4. Intenta hacer una reserva de prueba

---

## 🔍 Verificación de Configuración

### Archivo config.js

El archivo `config.js` ahora tiene:

```javascript
const ENVIRONMENT = 'production'; // ✅ Configurado para producción

const PROD_CONFIG = {
    publishableKey: 'pk_live_51RsMXQ3DSCa2l71zZiMkmlBXXpLu1HF0Sy4N4xSsB1TvUWu6wJLlKR5z7HrCa0AIlWQjfZo4tL8d1qcxtgExNHS300EPCAtXti',
    backendUrl: 'https://pgm-production.up.railway.app', // ✅ URL de Railway
    currency: 'eur',
    country: 'ES'
};
```

---

## 🆘 Si el Backend No Responde

### Posibles Causas:

1. **Variables de entorno no configuradas:**
   - Ve a Railway → Variables
   - Asegúrate de que todas las variables estén configuradas

2. **Backend no desplegado:**
   - Ve a Railway → Deployments
   - Verifica que haya un deployment exitoso (check verde ✅)

3. **Backend con errores:**
   - Ve a Railway → Logs
   - Revisa los logs para ver errores

4. **Puerto incorrecto:**
   - El backend debe usar `process.env.PORT || 3000` (ya está así)

---

## ✅ Checklist Final

- [x] `config.js` actualizado con URL de Railway
- [x] `ENVIRONMENT` cambiado a `'production'`
- [ ] Variables de entorno configuradas en Railway
- [ ] Backend desplegado y corriendo en Railway
- [ ] Endpoint `/api/test` responde correctamente
- [ ] Frontend probado y funcionando

---

## 📝 Notas Importantes

1. **Modo LIVE de Stripe:**
   - Los pagos ahora son REALES
   - Usa tarjetas de prueba solo para testing
   - Verifica que uses claves LIVE (`sk_live_...` y `pk_live_...`)

2. **HTTPS:**
   - Railway proporciona HTTPS automáticamente
   - La URL ya incluye `https://`

3. **Actualizaciones:**
   - Cada vez que hagas `git push`, Railway desplegará automáticamente
   - Los cambios en `config.js` se aplicarán en el próximo despliegue del frontend

---

## 🎯 Siguiente Paso

**Despliega el frontend actualizado** (si aún no lo has hecho):

1. Haz commit de los cambios:
   ```bash
   git add config.js
   git commit -m "Configurar backend URL de Railway para producción"
   git push
   ```

2. Si usas Netlify/Vercel, se desplegará automáticamente
3. Si usas otro hosting, haz push manual

---

## 🎉 ¡Listo!

Tu pasarela de pagos está configurada para producción con Railway.

Si tienes problemas, revisa los logs en Railway y la consola del navegador (F12) para más detalles.

