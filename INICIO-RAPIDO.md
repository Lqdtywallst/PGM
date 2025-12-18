# 🚀 Inicio Rápido - Prestige Goal Motion

## Configuración en 3 Pasos

### 1️⃣ Instalar Dependencias

```bash
npm install
```

### 2️⃣ Configurar Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto:

```env
# Stripe
STRIPE_SECRET_KEY=sk_test_tu_clave_secreta_aqui

# Email (OBLIGATORIO para formulario de contacto)
EMAIL_SERVICE=gmail
EMAIL_USER=prestigegoalmotion@gmail.com
EMAIL_APP_PASSWORD=tu_contraseña_de_aplicación_aqui
```

**⚠️ IMPORTANTE**: Para obtener la contraseña de aplicación de Gmail:

1. Ve a [Google Account Security](https://myaccount.google.com/security)
2. Activa "Verificación en 2 pasos" si no está activada
3. Ve a "Contraseñas de aplicaciones"
4. Genera una nueva contraseña para "Correo"
5. Copia la contraseña de 16 caracteres y úsala como `EMAIL_APP_PASSWORD`

### 3️⃣ Iniciar el Servidor

```bash
npm start
```

Deberías ver:
```
🚀 SERVIDOR PRESTIGE GOAL MOTION
✅ Servidor corriendo en puerto 3000
✅ Email configurado correctamente
```

## ✅ Verificar que Funciona

1. **Abre** `index.html` en tu navegador
2. **Ve a** la sección de contacto
3. **Llena** el formulario y envía un mensaje
4. **Verifica** que recibas el email en `prestigegoalmotion@gmail.com`

## 🔍 Solución de Problemas

### Error: "No se pudo conectar con el servidor"
- Verifica que el servidor esté corriendo: `npm start`
- Verifica que `backendUrl` en `config.js` sea `http://localhost:3000`

### Error: "Error al enviar el mensaje"
- Verifica que `EMAIL_APP_PASSWORD` esté configurado en `.env`
- Verifica que la contraseña de aplicación sea correcta
- Revisa los logs del servidor para más detalles

### El servidor no inicia
- Verifica que todas las dependencias estén instaladas: `npm install`
- Verifica que el puerto 3000 no esté en uso

## 📧 Configuración de Email

El formulario de contacto **SIEMPRE** envía emails a:
- **Destino**: `prestigegoalmotion@gmail.com`
- **Reply-To**: Email del cliente (para responder directamente)

Para más detalles, ver: `CONFIGURACION-EMAIL.md`

