# Configurar Inicio Automático del Backend en Windows

Hay varias formas de hacer que el backend se inicie automáticamente al arrancar Windows:

## Opción 1: Carpeta de Inicio (Más Simple)

1. Presiona `Win + R`
2. Escribe: `shell:startup` y presiona Enter
3. Crea un archivo nuevo llamado `start-backend.bat`
4. Agrega este contenido:
```batch
@echo off
cd /d "C:\Users\Administrator\Documents\Web-PRESTIGE-GOAL-MOTION"
pm2 resurrect
```

**Reemplaza la ruta** con la ruta real de tu proyecto.

Cada vez que inicies sesión en Windows, el backend se iniciará automáticamente.

## Opción 2: Programador de Tareas (Más Robusto)

1. Presiona `Win + R`
2. Escribe: `taskschd.msc` y presiona Enter
3. En el panel derecho, haz clic en "Crear tarea básica"
4. Nombre: "Prestige Backend PM2"
5. Descripción: "Iniciar backend de Prestige Goal Motion"
6. Desencadenador: "Cuando se inicia el equipo"
7. Acción: "Iniciar un programa"
8. Programa/script: `pm2`
9. Agregar argumentos: `resurrect`
10. Iniciar en: `C:\Users\Administrator\Documents\Web-PRESTIGE-GOAL-MOTION`

O ejecuta este comando como Administrador en CMD:
```batch
schtasks /create /tn "Prestige Backend PM2" /tr "pm2 resurrect" /sc onboot /rl highest /f
```

## Opción 3: Servicio de Windows con NSSM (Más Profesional)

1. Descarga NSSM desde: https://nssm.cc/download
2. Extrae nssm.exe
3. Ejecuta como Administrador:
```batch
nssm install PrestigeBackend
```
4. En la ventana que aparece:
   - Path: `C:\Program Files\nodejs\node.exe`
   - Startup directory: `C:\Users\Administrator\Documents\Web-PRESTIGE-GOAL-MOTION`
   - Arguments: `backend-example.js`
5. Haz clic en "Install service"

## Comandos Útiles PM2

### Ver estado
```bash
pm2 status
```

### Ver logs
```bash
pm2 logs prestige-backend
```

### Reiniciar
```bash
pm2 restart prestige-backend
```

### Guardar configuración actual
```bash
pm2 save
```

### Restaurar procesos guardados (al reiniciar)
```bash
pm2 resurrect
```

## Verificar que está funcionando

1. Reinicia tu computadora
2. Abre una terminal
3. Ejecuta: `pm2 status`
4. Deberías ver `prestige-backend` con status `online`






