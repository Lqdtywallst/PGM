# Instrucciones para Subir a GitHub

## ✅ Estado Actual
- ✅ Repositorio Git inicializado
- ✅ Archivos añadidos y commit realizado
- ✅ Branch principal: `main`

## 📋 Pasos para Subir a GitHub

### Opción 1: Crear Repositorio desde GitHub Web

1. **Ve a GitHub.com** e inicia sesión en tu cuenta

2. **Crea un nuevo repositorio**:
   - Haz clic en el botón "+" (arriba derecha) → "New repository"
   - Nombre del repositorio: `Web-PRESTIGE-GOAL-MOTION`
   - Descripción: "Web oficial de Prestige Goal Motion - Alquiler de Coches de Lujo"
   - Visibilidad: Público o Privado (según prefieras)
   - **NO marques** "Initialize this repository with a README" (ya tenemos uno)
   - Haz clic en "Create repository"

3. **Copia la URL del repositorio** (será algo como: `https://github.com/TU-USUARIO/Web-PRESTIGE-GOAL-MOTION.git`)

4. **Ejecuta estos comandos en PowerShell** (reemplaza TU-USUARIO con tu usuario de GitHub):

```powershell
cd "C:\Users\Administrator\Documents\Web-PRESTIGE-GOAL-MOTION"
git remote set-url origin https://github.com/TU-USUARIO/Web-PRESTIGE-GOAL-MOTION.git
git push -u origin main
```

### Opción 2: Usar GitHub Desktop

1. Instala GitHub Desktop desde: https://desktop.github.com/
2. Abre GitHub Desktop
3. File → Add Local Repository
4. Selecciona: `C:\Users\Administrator\Documents\Web-PRESTIGE-GOAL-MOTION`
5. Publish repository → Elige el nombre: `Web-PRESTIGE-GOAL-MOTION`

## 🔐 Si te pide autenticación

Si GitHub te pide usuario y contraseña, usa un **Personal Access Token**:

1. Ve a GitHub.com → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Generate new token (classic)
3. Selecciona los permisos: `repo` (todos)
4. Copia el token generado
5. Úsalo como contraseña cuando git te lo pida

## ✅ Verificación

Una vez subido, verifica que todo esté correcto:
- Ve a tu repositorio en GitHub
- Deberías ver: `index.html`, `README.md` y `.gitignore`
- El README debería mostrarse automáticamente

## 📝 Notas

- El repositorio está configurado con el remote `origin`
- Si necesitas cambiar la URL del repositorio, usa:
  ```powershell
  git remote set-url origin NUEVA-URL
  ```



