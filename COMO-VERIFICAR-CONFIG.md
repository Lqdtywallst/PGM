# 🔍 Cómo Verificar que la Configuración Funciona

## 📋 Pasos Rápidos

### 1️⃣ Abrir la Consola del Navegador

**Método 1: Teclado**
- Presiona `F12` en tu teclado

**Método 2: Menú**
- Clic derecho en la página → **"Inspeccionar"** o **"Inspect"**
- Se abrirá una ventana en la parte inferior o lateral

**Método 3: Atajo de teclado**
- Windows/Linux: `Ctrl + Shift + I`
- Mac: `Cmd + Option + I`

---

### 2️⃣ Ir a la Pestaña "Console"

Una vez abierta la consola, verás varias pestañas:
- **Console** ← Ve aquí
- Elements
- Network
- etc.

---

### 3️⃣ Recargar la Página SIN Caché

**Método 1: Teclado**
- Presiona `Ctrl + Shift + R` (Windows/Linux)
- O `Cmd + Shift + R` (Mac)

**Método 2: Desde la Consola**
1. Abre la consola (F12)
2. Ve a la pestaña **Network**
3. Marca la casilla **"Disable cache"** (arriba)
4. Presiona `F5` para recargar

---

### 4️⃣ Verificar los Mensajes en la Consola

Después de recargar, busca estos mensajes en la consola:

#### ✅ **Si está bien configurado:**
```
🔧 Backend URL configurada: https://pgm-production.up.railway.app
✅ Backend conectado correctamente: https://pgm-production.up.railway.app
```

#### ❌ **Si NO está bien configurado:**
```
🔧 Backend URL configurada: http://localhost:3000
⚠️ No se pudo conectar con el backend en http://localhost:3000
```

#### ⚠️ **Si config.js no se carga:**
```
⚠️ Esperando a que config.js se cargue...
⚠️ Esperando a que config.js se cargue...
⚠️ Esperando a que config.js se cargue...
```

---

### 5️⃣ Verificar que config.js se Cargó

En la consola, escribe esto y presiona Enter:

```javascript
STRIPE_CONFIG
```

**Si funciona, verás:**
```javascript
{
  publishableKey: "pk_live_51RsMXQ3DSCa2l71zZiMkmlBXXpLu1HF0Sy4N4xSsB1TvUWu6wJLlKR5z7HrCa0AIlWQjfZo4tL8d1qcxtgExNHS300EPCAtXti",
  backendUrl: "https://pgm-production.up.railway.app",
  currency: "eur",
  country: "ES"
}
```

**Si NO funciona, verás:**
```
undefined
```

---

### 6️⃣ Verificar que window.BACKEND_URL Existe

En la consola, escribe:

```javascript
window.BACKEND_URL
```

**Si funciona, verás:**
```
"https://pgm-production.up.railway.app"
```

**Si NO funciona, verás:**
```
undefined
```

---

## 🔍 Verificar Errores de Carga

### Paso 1: Abrir la Pestaña Network

1. Abre la consola (F12)
2. Ve a la pestaña **Network** (o **Red** en español)
3. Recarga la página (`F5`)

### Paso 2: Buscar config.js

1. En la lista de archivos, busca `config.js`
2. Haz clic en él para ver los detalles

### Paso 3: Verificar el Estado

- **✅ Verde (200)**: El archivo se cargó correctamente
- **❌ Rojo (404)**: El archivo no se encuentra
- **⚠️ Amarillo (otros)**: Hay un problema con el archivo

---

## 🆘 Soluciones a Problemas Comunes

### Problema 1: config.js no se carga (404)

**Síntoma:** En Network, `config.js` aparece en rojo con error 404

**Solución:**
1. Verifica que el archivo `config.js` esté en el mismo directorio que `index.html`
2. Si usas un servidor web, verifica que esté sirviendo archivos `.js`
3. Verifica que el archivo se llame exactamente `config.js` (no `Config.js` o `CONFIG.JS`)

### Problema 2: STRIPE_CONFIG es undefined

**Síntoma:** En la consola, `STRIPE_CONFIG` muestra `undefined`

**Solución:**
1. Verifica que `config.js` se esté cargando (pestaña Network)
2. Verifica que el contenido de `config.js` sea correcto
3. Verifica que `ENVIRONMENT = 'production'` en `config.js`

### Problema 3: Backend URL sigue siendo localhost

**Síntoma:** La consola muestra `Backend URL: http://localhost:3000`

**Solución:**
1. Verifica que `ENVIRONMENT = 'production'` en `config.js`
2. Verifica que `PROD_CONFIG.backendUrl` tenga la URL de Railway
3. Recarga la página SIN caché (`Ctrl + Shift + R`)

---

## 📝 Resumen de Comandos en la Consola

Copia y pega estos comandos en la consola para verificar:

```javascript
// Verificar config.js
STRIPE_CONFIG

// Verificar backend URL
window.BACKEND_URL

// Verificar entorno
STRIPE_CONFIG ? 'Config cargado ✅' : 'Config NO cargado ❌'

// Verificar URL del backend
window.BACKEND_URL || (STRIPE_CONFIG && STRIPE_CONFIG.backendUrl) || 'No configurado'
```

---

## ✅ Checklist de Verificación

- [ ] Consola abierta (F12)
- [ ] Página recargada sin caché (Ctrl + Shift + R)
- [ ] Mensaje en consola: `🔧 Backend URL configurada: https://pgm-production.up.railway.app`
- [ ] `STRIPE_CONFIG` muestra el objeto con la configuración
- [ ] `window.BACKEND_URL` muestra la URL de Railway
- [ ] No hay errores en rojo en la consola

---

## 🎯 Si Todo Está Bien

Si ves estos mensajes en la consola:
```
🔧 Backend URL configurada: https://pgm-production.up.railway.app
✅ Backend conectado correctamente: https://pgm-production.up.railway.app
```

**¡Perfecto!** La configuración está funcionando correctamente.

---

## 🆘 Si Sigue Fallando

1. **Comparte una captura de pantalla** de la consola
2. **Comparte los errores** que ves en rojo
3. **Verifica** que `config.js` esté en el mismo directorio que `index.html`

