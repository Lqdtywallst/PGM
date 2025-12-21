# 🚀 Guía para Iniciar los Servidores

## Inicio Rápido

### Opción 1: Scripts Automáticos

**Windows (CMD):**
```bash
start-servers.bat
```

**Windows (PowerShell):**
```powershell
.\start-servers.ps1
```

### Opción 2: Manual

**Terminal 1 - Backend (puerto 3000):**
```bash
npm start
```
o
```bash
node backend-example.js
```

**Terminal 2 - Web (puerto 8080):**
```bash
npm run http
```
o
```bash
node server-http.js
```

## URLs de Acceso

- **Backend API**: http://localhost:3000
- **Web Principal**: http://localhost:8080
- **Página de Reservas**: http://localhost:8080/app/reserve/page.html

## Verificar que Funcionan

1. **Backend**: Abre http://localhost:3000 en el navegador
   - Deberías ver un JSON con información de la API

2. **Web**: Abre http://localhost:8080
   - Deberías ver la página principal

## Solución de Problemas

### Error: "STRIPE_SECRET_KEY no está configurada"
- Verifica que el archivo `.env` existe en la raíz del proyecto
- Asegúrate de que `STRIPE_SECRET_KEY` esté configurada correctamente

### Error: "Puerto 3000 ya en uso"
- Cierra otros procesos que usen el puerto 3000
- O cambia el puerto en el archivo `.env`: `PORT=3001`

### Error: "Cannot find module"
- Ejecuta: `npm install` para instalar las dependencias

### El servidor no responde
- Verifica que Node.js esté instalado: `node --version`
- Verifica que no haya errores en la consola del servidor
- Revisa el firewall de Windows

## Estructura de Archivos

```
.
├── backend-example.js    # Servidor backend (API Stripe)
├── server-http.js        # Servidor web (archivos estáticos)
├── .env                  # Configuración (Stripe, Email)
├── config.js             # Configuración frontend
└── index.html            # Página principal
```


