# Instalación de Node.js y npm

## ⚠️ Node.js no está instalado

Para instalar los paquetes de Stripe, necesitas tener Node.js y npm instalados en tu sistema.

## 📥 Paso 1: Instalar Node.js

### Opción 1: Descarga Directa (Recomendado)

1. **Ve a la página oficial de Node.js**: [https://nodejs.org/](https://nodejs.org/)
2. **Descarga la versión LTS** (Long Term Support) - Recomendada para la mayoría de usuarios
3. **Ejecuta el instalador** (.msi para Windows)
4. **Sigue el asistente de instalación** (acepta las opciones por defecto)
5. **Reinicia tu terminal/PowerShell** después de la instalación

### Opción 2: Usando Chocolatey (Si lo tienes instalado)

```powershell
choco install nodejs
```

### Opción 3: Usando Winget (Windows 10/11)

```powershell
winget install OpenJS.NodeJS.LTS
```

## ✅ Paso 2: Verificar la Instalación

Después de instalar Node.js, abre una nueva terminal y ejecuta:

```powershell
node --version
npm --version
```

Deberías ver las versiones instaladas, por ejemplo:
```
v20.10.0
10.2.3
```

## 📦 Paso 3: Instalar los Paquetes de Stripe

Una vez que Node.js esté instalado, navega al directorio del proyecto y ejecuta:

```powershell
cd "C:\Users\Administrator\Documents\Web-PRESTIGE-GOAL-MOTION"
npm install
```

O si quieres instalar específicamente los paquetes de Stripe:

```powershell
npm install stripe @stripe/stripe-js @stripe/react-stripe-js express cors dotenv
```

## 📋 Paquetes que se Instalarán

- **stripe**: SDK oficial de Stripe para Node.js (backend)
- **@stripe/stripe-js**: SDK de Stripe para JavaScript (frontend)
- **@stripe/react-stripe-js**: Componentes React para Stripe (opcional, si usas React)
- **express**: Framework web para Node.js
- **cors**: Middleware para habilitar CORS
- **dotenv**: Para manejar variables de entorno

## 🚀 Paso 4: Inicializar el Proyecto (Opcional)

Si quieres crear un proyecto Node.js completo, también puedes ejecutar:

```powershell
npm init -y
```

Pero ya hemos creado el `package.json` para ti, así que solo necesitas ejecutar `npm install`.

## ⚡ Nota Rápida

**Nota**: El proyecto actual usa Stripe.js directamente desde el CDN en el HTML, por lo que técnicamente no necesitas instalar `@stripe/stripe-js` y `@stripe/react-stripe-js` a menos que vayas a usar React o quieras importar el módulo directamente.

Los paquetes que realmente necesitas para el backend son:
- `stripe` (para el servidor)
- `express` (para el servidor)
- `cors` (para el servidor)
- `dotenv` (para el servidor)

## 🔗 Enlaces Útiles

- [Node.js Official Website](https://nodejs.org/)
- [npm Documentation](https://docs.npmjs.com/)
- [Stripe Node.js Documentation](https://stripe.com/docs/api/node)



