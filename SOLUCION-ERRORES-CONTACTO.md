# Solución de Errores - Formulario de Contacto

## 🔍 Diagnóstico de Problemas

Si el formulario de contacto muestra un error, sigue estos pasos:

### 1. Verificar que el Backend esté Corriendo

Abre una terminal y ejecuta:

```bash
npm start
```

O:

```bash
node backend-example.js
```

Deberías ver:
```
Servidor corriendo en puerto 3000
Modo: development
```

### 2. Verificar la URL del Backend

Abre `config.js` y verifica que `backendUrl` esté configurado:

```javascript
backendUrl: 'http://localhost:3000', // Para desarrollo local
// O
backendUrl: 'https://tu-dominio.com', // Para producción
```

### 3. Probar la Conexión

Abre la consola del navegador (F12) y ejecuta:

```javascript
fetch('http://localhost:3000/api/test')
  .then(r => r.json())
  .then(console.log)
  .catch(console.error);
```

Si funciona, deberías ver: `{status: 'ok', message: 'Servidor funcionando correctamente', ...}`

### 4. Verificar Errores en la Consola

Abre las herramientas de desarrollador (F12) y revisa:
- **Console**: Busca errores en rojo
- **Network**: Verifica que la petición a `/api/contact` se esté haciendo

### 5. Errores Comunes

#### Error: "Failed to fetch" o "NetworkError"
**Causa**: El backend no está corriendo o la URL es incorrecta.

**Solución**:
1. Inicia el backend: `npm start`
2. Verifica que esté en el puerto 3000
3. Verifica que `backendUrl` en `config.js` sea correcto

#### Error: "CORS policy"
**Causa**: El servidor no permite peticiones desde tu dominio.

**Solución**: El backend ya tiene CORS configurado. Si persiste:
- Verifica que el backend esté corriendo
- Asegúrate de usar la URL correcta

#### Error: "Error 500" o "Error al enviar el mensaje"
**Causa**: Problema con la configuración de email.

**Solución**:
1. Verifica que las variables de entorno estén configuradas en `.env`:
   ```env
   EMAIL_SERVICE=gmail
   EMAIL_USER=prestigegoalmotion@gmail.com
   EMAIL_APP_PASSWORD=tu_contraseña_de_aplicación
   ```
2. Revisa los logs del servidor para ver el error específico

#### Error: "Error 400" o "Faltan campos obligatorios"
**Causa**: El formulario no está enviando todos los datos requeridos.

**Solución**: Asegúrate de completar todos los campos marcados con *

### 6. Verificar Logs del Servidor

Cuando envíes un mensaje, revisa la terminal donde corre el backend. Deberías ver:

```
✅ Email de contacto enviado correctamente
```

Si hay un error, aparecerá:
```
❌ Error al enviar email de contacto: [detalles del error]
```

### 7. Probar Manualmente el Endpoint

Puedes probar el endpoint directamente con curl:

```bash
curl -X POST http://localhost:3000/api/contact \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test",
    "email": "test@example.com",
    "subject": "otro",
    "message": "Mensaje de prueba"
  }'
```

### 8. Verificar Configuración de Email

Si el servidor responde pero no se envía el email:

1. Verifica que `EMAIL_APP_PASSWORD` esté configurado en `.env`
2. Asegúrate de haber generado una contraseña de aplicación de Gmail
3. Revisa `CONFIGURACION-EMAIL.md` para más detalles

## 🛠️ Solución Rápida

1. **Inicia el backend**:
   ```bash
   npm start
   ```

2. **Verifica la configuración** en `config.js`:
   ```javascript
   backendUrl: 'http://localhost:3000'
   ```

3. **Configura las variables de entorno** en `.env`:
   ```env
   EMAIL_SERVICE=gmail
   EMAIL_USER=prestigegoalmotion@gmail.com
   EMAIL_APP_PASSWORD=tu_contraseña
   ```

4. **Recarga la página** y prueba de nuevo

## 📞 Si el Problema Persiste

1. Abre la consola del navegador (F12)
2. Copia el mensaje de error completo
3. Revisa los logs del servidor backend
4. Verifica que todos los pasos anteriores estén completados

