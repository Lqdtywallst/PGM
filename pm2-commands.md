# Comandos PM2 - Gestión del Backend

## Comandos Básicos

### Iniciar el backend
```bash
pm2 start backend-example.js --name "prestige-backend"
```

### Ver estado del backend
```bash
pm2 status
```

### Ver logs en tiempo real
```bash
pm2 logs prestige-backend
```

### Ver los últimos logs
```bash
pm2 logs prestige-backend --lines 50
```

### Reiniciar el backend
```bash
pm2 restart prestige-backend
```

### Detener el backend
```bash
pm2 stop prestige-backend
```

### Eliminar el backend de PM2
```bash
pm2 delete prestige-backend
```

### Guardar configuración actual
```bash
pm2 save
```

### Configurar inicio automático al arrancar Windows
```bash
pm2 startup
```
(Luego sigue las instrucciones que aparecen en pantalla)

## Monitoreo

### Ver uso de recursos
```bash
pm2 monit
```

### Ver información detallada
```bash
pm2 show prestige-backend
```

### Listar todos los procesos
```bash
pm2 list
```

## Configuración para Producción

Para configurar el backend para que se inicie automáticamente al arrancar Windows:

1. Ejecuta: `pm2 startup`
2. Copia el comando que aparece en pantalla
3. Ejecuta ese comando como Administrador en PowerShell/CMD
4. Guarda la configuración: `pm2 save`

Esto hará que el backend se inicie automáticamente cada vez que enciendas tu computadora.

