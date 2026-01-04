# 🔍 Cómo Verificar los Logs en Railway

## 📋 Pasos para Ver los Logs

### 1. Ir a Railway Dashboard

1. Ve a [railway.app](https://railway.app)
2. Inicia sesión
3. Selecciona tu proyecto

### 2. Abrir los Logs

1. Haz clic en tu servicio (el que tiene el backend)
2. Ve a la pestaña **"Deployments"** (o **"Logs"**)
3. Haz clic en el deployment más reciente
4. Verás los logs en tiempo real

---

## 🔍 Qué Buscar en los Logs

### ✅ **Si está funcionando correctamente:**

```
✅ Servidor corriendo en puerto 8080
🚀 SERVIDOR PRESTIGE GOAL MOTION
✅ Servidor listo para recibir peticiones
```

### ❌ **Si hay errores, buscarás:**

#### Error 1: STRIPE_SECRET_KEY no configurada
```
❌ ERROR: STRIPE_SECRET_KEY no está configurada en .env
```

**Solución:** Agrega `STRIPE_SECRET_KEY` en Railway → Variables

#### Error 2: Módulo no encontrado
```
Error: Cannot find module 'express'
Error: Cannot find module 'stripe'
```

**Solución:** Railway debería instalar automáticamente. Si no, haz "Redeploy"

#### Error 3: Error al iniciar servidor
```
❌ Error al iniciar el servidor: EADDRINUSE
```

**Solución:** Railway maneja el puerto automáticamente, esto no debería pasar

#### Error 4: Error no capturado
```
❌ Error no capturado: [detalles del error]
```

**Solución:** Revisa el error específico y corrígelo

#### Error 5: Promesa rechazada
```
❌ Promesa rechazada no manejada: [detalles]
```

**Solución:** Revisa el error específico y corrígelo

---

## 📝 Información Útil

### Ver Logs en Tiempo Real

Los logs se actualizan automáticamente. Si haces una petición al backend, deberías ver:

```
[2025-01-XX...] GET /api/test
[2025-01-XX...] POST /api/contact
```

### Filtrar Logs

Puedes usar `Ctrl + F` (o `Cmd + F` en Mac) para buscar palabras clave:
- `ERROR`
- `❌`
- `✅`
- `Servidor corriendo`

---

## 🆘 Si No Ves Logs

1. **Verifica que el servicio esté desplegado:**
   - Debe haber un deployment reciente
   - Debe tener un check verde ✅ o estar en progreso ⏳

2. **Verifica que el servicio esté corriendo:**
   - Si no hay logs, el servicio puede no estar iniciado
   - Haz "Redeploy" si es necesario

3. **Espera unos segundos:**
   - Los logs pueden tardar unos segundos en aparecer
   - Refresca la página si es necesario

---

## 💡 Tip: Copiar Logs

Si necesitas compartir los logs:

1. Selecciona el texto de los logs
2. Copia (`Ctrl + C` o `Cmd + C`)
3. Pega en un archivo de texto o compártelos

---

## 🎯 Qué Hacer con los Logs

1. **Si ves "Servidor corriendo":**
   - El backend está funcionando
   - Si sigue dando 502, puede ser un problema de Railway

2. **Si ves errores:**
   - Copia el error completo
   - Busca la solución en la documentación
   - O comparte el error para obtener ayuda

3. **Si no ves logs:**
   - El servicio puede no estar iniciado
   - Haz "Redeploy" y espera

