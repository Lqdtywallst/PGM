# 🔄 Actualizar config.js para Railway

## 📝 Pasos para Configurar

### Paso 1: Obtener la URL de Railway

1. Ve a tu proyecto en [Railway](https://railway.app)
2. Ve a **Settings** → **Networking**
3. Copia la URL de tu backend (ej: `https://prestige-backend-production-xxxx.up.railway.app`)

### Paso 2: Actualizar config.js

Abre el archivo `config.js` y realiza estos cambios:

#### 2.1 Cambiar el Entorno a Producción

```javascript
// Cambia esto:
const ENVIRONMENT = 'development';

// Por esto:
const ENVIRONMENT = 'production';
```

#### 2.2 Actualizar la URL del Backend

En la sección `PROD_CONFIG`, actualiza `backendUrl`:

```javascript
const PROD_CONFIG = {
    publishableKey: 'pk_live_51RsMXQ3DSCa2l71zZiMkmlBXXpLu1HF0Sy4N4xSsB1TvUWu6wJLlKR5z7HrCa0AIlWQjfZo4tL8d1qcxtgExNHS300EPCAtXti',
    backendUrl: 'https://tu-backend.railway.app', // ⬅️ REEMPLAZA CON TU URL
    currency: 'eur',
    country: 'ES'
};
```

**Ejemplo:**
```javascript
backendUrl: 'https://prestige-backend-production-xxxx.up.railway.app',
```

#### 2.3 Verificar la Clave Pública de Stripe

Asegúrate de que `publishableKey` en `PROD_CONFIG` sea tu clave **LIVE**:

```javascript
publishableKey: 'pk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', // Clave LIVE
```

**⚠️ IMPORTANTE**: 
- En producción usa siempre `pk_live_...` (no `pk_test_...`)
- Obtén tu clave en: https://dashboard.stripe.com/apikeys (modo LIVE)

---

## ✅ Verificación

Después de actualizar `config.js`:

1. **Guarda el archivo**
2. **Haz commit y push** a GitHub (si usas despliegue automático)
3. **Prueba la conexión**:
   - Abre la consola del navegador (F12)
   - Deberías ver: `Verificando conexión con servidor: https://tu-backend.railway.app`
4. **Prueba un pago de prueba** para verificar que todo funciona

---

## 🔄 Volver a Desarrollo

Si necesitas volver a desarrollo local:

```javascript
const ENVIRONMENT = 'development'; // Cambia a 'development'
```

Y asegúrate de que tu backend local esté corriendo en `http://localhost:3000`

---

## 📋 Checklist

- [ ] URL de Railway copiada
- [ ] `ENVIRONMENT` cambiado a `'production'`
- [ ] `backendUrl` actualizado con la URL de Railway
- [ ] `publishableKey` es una clave LIVE (`pk_live_...`)
- [ ] Archivo guardado
- [ ] Cambios desplegados (commit/push si es necesario)
- [ ] Conexión verificada en la consola del navegador

