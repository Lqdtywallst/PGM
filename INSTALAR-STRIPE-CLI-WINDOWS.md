# 📥 Instalar Stripe CLI en Windows

## Opción 1: Descargar Ejecutable Directo (Recomendado)

### Paso 1: Descargar Stripe CLI

1. Ve a la página oficial de releases de Stripe CLI:
   **https://github.com/stripe/stripe-cli/releases/latest**

2. Busca el archivo para Windows:
   - `stripe_X.X.X_windows_x86_64.zip` (para Windows 64-bit)
   - O `stripe_X.X.X_windows_i386.zip` (para Windows 32-bit)

3. Descarga el archivo `.zip`

### Paso 2: Extraer y Configurar

1. **Extrae el archivo ZIP** en una carpeta, por ejemplo:
   ```
   C:\Program Files\Stripe\
   ```

2. **Agrega Stripe CLI al PATH**:
   
   **Método A: Desde PowerShell (como Administrador)**
   ```powershell
   # Agregar al PATH del sistema
   [Environment]::SetEnvironmentVariable(
       "Path",
       [Environment]::GetEnvironmentVariable("Path", "Machine") + ";C:\Program Files\Stripe",
       "Machine"
   )
   ```
   
   **Método B: Manualmente**
   1. Presiona `Win + R`, escribe `sysdm.cpl` y presiona Enter
   2. Ve a la pestaña "Opciones avanzadas"
   3. Haz clic en "Variables de entorno"
   4. En "Variables del sistema", selecciona "Path" y haz clic en "Editar"
   5. Haz clic en "Nuevo" y agrega: `C:\Program Files\Stripe`
   6. Haz clic en "Aceptar" en todas las ventanas

3. **Cierra y vuelve a abrir PowerShell/Terminal**

4. **Verifica la instalación**:
   ```powershell
   stripe --version
   ```

## Opción 2: Usar Scoop (Gestor de Paquetes)

Si tienes Scoop instalado:

```powershell
scoop install stripe
```

## Opción 3: Descargar desde la Página Oficial

1. Ve a: **https://stripe.com/docs/stripe-cli**
2. Haz clic en "Download Stripe CLI"
3. Selecciona Windows
4. Descarga e instala

## ✅ Verificar Instalación

Después de instalar, verifica que funciona:

```powershell
stripe --version
```

Deberías ver algo como: `stripe version 1.34.0`

## 🔐 Autenticarse con Stripe

Una vez instalado, autentícate:

```powershell
stripe login
```

Esto abrirá tu navegador para autenticarte.

## 🎯 Obtener Webhook Secret

Para desarrollo local:

```powershell
stripe listen --forward-to localhost:3000/api/webhook
```

Esto te dará un webhook secret que empieza con `whsec_...`

## 📝 Nota

- **No necesitas Stripe CLI para producción** - Solo para desarrollo local
- Para producción, configura el webhook directamente en el Dashboard de Stripe
- El webhook secret de desarrollo local cambia cada vez que reinicias `stripe listen`

