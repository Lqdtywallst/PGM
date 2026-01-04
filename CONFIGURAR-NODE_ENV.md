# ⚙️ Configurar NODE_ENV=production en Railway

## 📋 Problema

Los logs muestran:
```
🔧 Modo: development
```

Pero debería mostrar:
```
🔧 Modo: production
```

---

## 🔧 Solución: Agregar NODE_ENV en Railway

### Paso 1: Ir a Variables de Entorno

1. Railway → Tu Servicio "PGM"
2. Ve a la pestaña **"Variables"**

### Paso 2: Agregar NODE_ENV

1. Haz clic en **"New Variable"**
2. Nombre: `NODE_ENV`
3. Valor: `production`
4. Haz clic en **"Add"**

### Paso 3: Verificar

Después de agregar la variable, Railway redesplegará automáticamente. En los logs deberías ver:

```
🔧 Modo: production
```

---

## ✅ Variables de Entorno Completas

Asegúrate de tener todas estas variables:

```env
STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
EMAIL_SERVICE=gmail
EMAIL_USER=prestigegoalmotion@gmail.com
EMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx
NODE_ENV=production
PORT=3000
```

**Nota:** `PORT` es opcional, Railway lo asigna automáticamente.

---

## 🎯 Por Qué es Importante

Aunque `NODE_ENV=production` no es estrictamente necesario para que el servidor funcione, es una buena práctica porque:

1. **Optimizaciones:** Algunas librerías se comportan diferente en producción
2. **Logs:** Puede afectar el nivel de detalle de los logs
3. **Seguridad:** Algunas configuraciones de seguridad se activan en producción

---

## ⚠️ Nota sobre EMAIL_APP_PASSWORD

Los logs muestran una advertencia sobre `EMAIL_APP_PASSWORD` no configurada. Esto **NO impide** que el servidor funcione, pero los emails no se enviarán.

Para configurarla:
1. Obtén una Contraseña de Aplicación: https://myaccount.google.com/apppasswords
2. Agrega `EMAIL_APP_PASSWORD` en Railway → Variables

