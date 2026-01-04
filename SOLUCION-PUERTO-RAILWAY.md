# ✅ SOLUCIÓN: Configurar Puerto Correcto en Railway

## 🔍 Problema Identificado

El error 502 se debe a que:
- ✅ Tu aplicación está escuchando en el puerto **8080** (correcto)
- ❌ Pero Railway está configurado para enrutar el tráfico al puerto **3000** (incorrecto)

---

## 🛠️ Solución: Cambiar Puerto en Railway

### Paso 1: Ir a Configuración de Networking

1. Ve a [Railway Dashboard](https://railway.app)
2. Selecciona tu proyecto "PGM"
3. Haz clic en tu servicio (el que muestra "Online")
4. Ve a la pestaña **"Settings"** (Configuración)
5. Scroll hasta la sección **"Networking"** (Red)

### Paso 2: Configurar el Puerto Correcto

En la sección **"Public Networking"**:

1. Verás tu dominio: `pgm-production.up.railway.app`
2. Verás que dice: `→ Port 3000` (o similar)
3. Haz clic en el dropdown **"Custom port"**
4. Railway debería detectar automáticamente: `8080 (caddy)` o `8080`
5. **Selecciona el puerto 8080**
6. O si no aparece, escribe manualmente: `8080`

### Paso 3: Guardar y Esperar

1. Railway guardará automáticamente
2. Espera 1-2 minutos para que se aplique el cambio
3. Railway puede redesplegar automáticamente

---

## ✅ Verificación

Después de cambiar el puerto:

1. Espera 1-2 minutos
2. Prueba: `https://pgm-production.up.railway.app/api/test`
3. Deberías ver JSON con `"status": "ok"` en lugar de 502

---

## 📋 Resumen

**Antes:**
- Dominio público → Puerto 3000 ❌
- Aplicación escuchando → Puerto 8080 ✅
- Resultado: 502 Bad Gateway

**Después:**
- Dominio público → Puerto 8080 ✅
- Aplicación escuchando → Puerto 8080 ✅
- Resultado: ✅ Funciona correctamente

---

## 🎯 Nota Importante

Railway asigna el puerto automáticamente a través de la variable `PORT`. Tu código ya está correcto:

```javascript
const PORT = process.env.PORT || 3000;
```

El problema era solo la configuración del dominio público en Railway, no el código.

---

## ✅ Después de Configurar

Una vez configurado el puerto correcto:
- ✅ El servidor debería responder correctamente
- ✅ Los endpoints funcionarán
- ✅ La pasarela de pagos funcionará
- ✅ El formulario de contacto funcionará

¡Eso debería resolver el problema del 502!

