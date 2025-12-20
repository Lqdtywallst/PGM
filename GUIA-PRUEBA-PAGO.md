# 🧪 Guía para Realizar Pruebas de Pago

## ⚠️ IMPORTANTE: Modo Actual

Actualmente estás usando **claves LIVE** (`pk_live_...`). Esto significa que:
- ✅ Los pagos serán **reales** y se procesarán
- ❌ No puedes usar tarjetas de prueba de Stripe
- ⚠️ Cualquier pago exitoso será un cargo real

## 🎯 Opción 1: Prueba con Modo TEST (Recomendado)

### Paso 1: Obtener Claves de Test

1. Ve a [Stripe Dashboard](https://dashboard.stripe.com)
2. **Activa el modo TEST** (toggle en la parte superior izquierda)
3. Ve a **Developers** → **API keys**
4. Copia:
   - **Publishable key** (empieza con `pk_test_...`)
   - **Secret key** (empieza con `sk_test_...`)

### Paso 2: Cambiar Configuración a Test

**Edita `config.js`:**
```javascript
publishableKey: 'pk_test_TU_CLAVE_AQUI', // Cambia a test
```

**Edita `.env`:**
```env
STRIPE_SECRET_KEY=sk_test_TU_CLAVE_AQUI
```

### Paso 3: Reiniciar el Servidor

```powershell
# Detén el servidor (Ctrl+C) y reinícialo
& "C:\Program Files\nodejs\node.exe" backend-example.js
```

### Paso 4: Realizar Prueba de Pago

1. Abre `index.html` en tu navegador
2. Haz clic en "BOOK NOW" en cualquier vehículo
3. Completa el formulario de reserva
4. En el paso de pago, usa estas **tarjetas de prueba**:

#### ✅ Tarjeta de Prueba Exitosa
- **Número**: `4242 4242 4242 4242`
- **Fecha**: Cualquier fecha futura (ej: `12/25`)
- **CVC**: Cualquier 3 dígitos (ej: `123`)
- **Código Postal**: Cualquier código (ej: `12345`)

#### ❌ Tarjeta de Prueba Rechazada
- **Número**: `4000 0000 0000 0002`
- **Fecha**: Cualquier fecha futura
- **CVC**: Cualquier 3 dígitos

#### ⚠️ Tarjeta que Requiere Autenticación 3D Secure
- **Número**: `4000 0025 0000 3155`
- **Fecha**: Cualquier fecha futura
- **CVC**: Cualquier 3 dígitos

### Paso 5: Verificar Resultado

1. **En el navegador**: Deberías ver un mensaje de éxito
2. **En Stripe Dashboard**: Ve a [Test Payments](https://dashboard.stripe.com/test/payments)
3. **En los logs del servidor**: Deberías ver logs detallados del proceso

---

## 🎯 Opción 2: Prueba con Modo LIVE (Pago Real)

Si quieres hacer una prueba con pago real (usando tus claves live actuales):

### ⚠️ ADVERTENCIA
- Los pagos serán **reales** y se procesarán
- Se te cobrará la comisión de Stripe
- Necesitas usar una **tarjeta real** de prueba (no las de Stripe)

### Pasos:

1. **Asegúrate de que el servidor esté corriendo**
   ```powershell
   & "C:\Program Files\nodejs\node.exe" backend-example.js
   ```

2. **Abre la página de reservas**
   - Abre `index.html` en tu navegador
   - O accede a: `http://localhost:3000` (si tienes servidor web)

3. **Completa el formulario**
   - Selecciona un vehículo
   - Completa tus datos
   - Selecciona fechas

4. **Usa una tarjeta real de prueba**
   - Puedes usar una tarjeta de débito/crédito real
   - O una tarjeta de prueba de tu banco
   - **NO uses las tarjetas de prueba de Stripe** (solo funcionan en modo test)

5. **Revisa los logs**
   - En la consola del navegador (F12)
   - En la terminal del servidor

---

## 📊 Dónde Ver los Logs

### Logs del Frontend (Navegador)
1. Abre las **Herramientas de Desarrollador** (F12)
2. Ve a la pestaña **Console**
3. Busca mensajes que empiecen con:
   - `[PAYMENT]`
   - `[STRIPE INIT]`
   - `[CONNECTION CHECK]`

### Logs del Backend (Terminal)
En la terminal donde corre el servidor, verás:
- `[API] ========== NUEVA PETICIÓN DE RESERVA ==========`
- `[API] ✅ PaymentIntent creado`
- `[API] ✅ Respuesta exitosa`

### Stripe Dashboard
- **Test Mode**: https://dashboard.stripe.com/test/payments
- **Live Mode**: https://dashboard.stripe.com/payments

---

## 🔍 Solución de Problemas

### Error: "No se pudo conectar al servidor"
- ✅ Verifica que el servidor esté corriendo
- ✅ Verifica que estés usando `http://localhost:3000`
- ✅ Revisa los logs del servidor

### Error: "Invalid API Key"
- ✅ Verifica que las claves en `config.js` y `.env` coincidan
- ✅ Verifica que estés usando claves del mismo modo (test/test o live/live)

### Error: "Payment failed"
- ✅ Revisa los logs del servidor para más detalles
- ✅ Verifica que la tarjeta sea válida (en modo test, usa las tarjetas de prueba)

### El pago se procesa pero no veo confirmación
- ✅ Revisa la consola del navegador para errores
- ✅ Verifica que el email esté configurado correctamente
- ✅ Revisa los logs del servidor

---

## 📝 Checklist de Prueba

Antes de hacer una prueba, verifica:

- [ ] El servidor está corriendo (`http://localhost:3000` responde)
- [ ] Las claves de Stripe están configuradas correctamente
- [ ] El archivo `.env` tiene `STRIPE_SECRET_KEY`
- [ ] El archivo `config.js` tiene `publishableKey`
- [ ] La consola del navegador está abierta (F12)
- [ ] Los logs del servidor están visibles

---

## 🎓 Más Información

- [Documentación de Stripe - Tarjetas de Prueba](https://stripe.com/docs/testing)
- [Stripe Dashboard](https://dashboard.stripe.com)
- [Stripe Testing Cards](https://stripe.com/docs/testing#cards)

