# Prestige Goal Motion - Web Oficial

Sitio web profesional para Prestige Goal Motion - Alquiler de Coches de Lujo

## 🚗 Características

- **Diseño Profesional**: Interfaz elegante con paleta de colores negra, dorada y plateada
- **Sistema de Reservas**: Calendario interactivo con disponibilidad de vehículos
- **Pasarela de Pago**: Integración completa con Stripe (Apple Pay, Google Pay, Tarjetas, Stripe Link)
- **Formulario de Contacto**: Sistema completo de contacto con validación
- **Responsive Design**: Adaptado para todos los dispositivos

## 🚙 Flota de Vehículos

- Mercedes GLE 53 AMG
- Mercedes GLE Coupe 400 D
- Mercedes GLE 400D
- Lamborghini Huracán

## 📋 Tecnologías Utilizadas

- HTML5
- CSS3
- JavaScript (Vanilla)
- Stripe.js
- Node.js / Express (Backend)
- Font Awesome

## 🔧 Configuración

1. Clonar el repositorio
2. Instalar dependencias: `npm install`
3. Configurar variables de entorno en `.env`:
   - `STRIPE_SECRET_KEY` - Clave secreta de Stripe
   - `STRIPE_WEBHOOK_SECRET` - Secreto del webhook (opcional)
4. Configurar `config.js` con tu clave pública de Stripe
5. Iniciar el servidor backend: `npm start`
6. Abrir `index.html` en un navegador

## 💳 Integración de Pagos Stripe

La pasarela de pagos Stripe está completamente implementada. Ver `STRIPE-IMPLEMENTACION.md` para detalles completos.

### Métodos de pago disponibles:
- ✅ Tarjetas de crédito/débito (Stripe Elements)
- ✅ Apple Pay
- ✅ Google Pay
- ✅ Stripe Link

## 📞 Contacto

- **Dirección**: Calle Cicón, 27
- **Teléfono**: +34 680 162 813
- **Email**: prestigegoalmotion@gmail.com
- **Instagram**: @prestigegoalmotion
- **Horario**: 24 horas, Lunes a Lunes

## 📝 Notas

- El sistema de pagos requiere configuración del backend con Stripe
- Las imágenes utilizan URLs externas (considerar hosting propio para producción)
- El calendario de disponibilidad está simulado (conectar con base de datos real)

## 📄 Licencia

© 2025 Prestige Goal Motion. Todos los derechos reservados.
