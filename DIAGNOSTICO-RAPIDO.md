# 🔍 Diagnóstico Rápido - Error en el Formulario de Contacto

## ⚡ Solución Rápida (3 pasos)

### 1️⃣ Verifica que el Backend esté Corriendo

Abre una terminal en la carpeta del proyecto y ejecuta:

```bash
npm start
```

**Deberías ver:**
```
🚀 SERVIDOR PRESTIGE GOAL MOTION
✅ Servidor corriendo en puerto 3000
```

**Si NO ves esto**, el backend no está corriendo y por eso falla el formulario.

### 2️⃣ Verifica la Configuración

Abre `config.js` y verifica que tenga:

```javascript
backendUrl: 'http://localhost:3000',
```

### 3️⃣ Abre la Consola del Navegador

1. Presiona **F12** en tu navegador
2. Ve a la pestaña **Console**
3. Intenta enviar el formulario de nuevo
4. **Copia el mensaje de error** que aparece

## 🔎 Errores Comunes y Soluciones

### ❌ Error: "Failed to fetch" o "NetworkError"

**Problema**: El backend no está corriendo o no se puede conectar.

**Solución**:
1. Abre una terminal
2. Ve a la carpeta del proyecto: `cd ruta/al/proyecto`
3. Ejecuta: `npm start`
4. Espera a ver: `✅ Servidor corriendo en puerto 3000`
5. Recarga la página y prueba de nuevo

### ❌ Error: "CORS policy"

**Problema**: El servidor no permite peticiones desde tu origen.

**Solución**: El backend ya tiene CORS configurado. Si persiste:
- Verifica que el backend esté corriendo
- Verifica que uses `http://localhost:3000` (no `https://`)

### ❌ Error: "Error 500" o "Error al enviar el mensaje"

**Problema**: El servidor está corriendo pero hay un error al enviar el email.

**Solución**:
1. Verifica que tengas un archivo `.env` con:
   ```env
   EMAIL_SERVICE=gmail
   EMAIL_USER=prestigegoalmotion@gmail.com
   EMAIL_APP_PASSWORD=tu_contraseña_de_aplicación
   ```
2. Revisa los logs del servidor (la terminal donde corre `npm start`)
3. Busca mensajes que empiecen con `❌`

### ❌ El formulario no hace nada al hacer clic

**Problema**: Error de JavaScript en la página.

**Solución**:
1. Abre la consola (F12)
2. Busca errores en rojo
3. Copia el mensaje de error completo

## 🧪 Probar la Conexión Manualmente

Abre la consola del navegador (F12) y ejecuta:

```javascript
fetch('http://localhost:3000/api/test')
  .then(r => r.json())
  .then(console.log)
  .catch(console.error);
```

**Si funciona**, deberías ver:
```json
{status: "ok", message: "Servidor funcionando correctamente", ...}
```

**Si NO funciona**, el backend no está corriendo o hay un problema de conexión.

## 📋 Checklist de Verificación

- [ ] Backend corriendo (`npm start`)
- [ ] Puerto 3000 disponible
- [ ] `config.js` tiene `backendUrl: 'http://localhost:3000'`
- [ ] Archivo `.env` configurado (para emails)
- [ ] No hay errores en la consola del navegador (F12)
- [ ] El endpoint `/api/test` responde correctamente

## 💡 Información Útil

**URL del Backend**: `http://localhost:3000`
**Endpoint de Contacto**: `http://localhost:3000/api/contact`
**Endpoint de Prueba**: `http://localhost:3000/api/test`

## 🆘 Si Nada Funciona

1. **Cierra** todas las terminales
2. **Abre** una nueva terminal
3. **Ve** a la carpeta del proyecto
4. **Ejecuta**: `npm install` (por si faltan dependencias)
5. **Ejecuta**: `npm start`
6. **Espera** a ver el mensaje de éxito
7. **Abre** `index.html` en el navegador
8. **Prueba** el formulario de nuevo

Si aún así no funciona, comparte:
- El mensaje de error exacto de la consola (F12)
- Los logs del servidor (terminal donde corre `npm start`)

