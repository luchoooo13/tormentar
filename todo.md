# Tormentar - Project TODO

## Fase 1: Configuración Base
- [x] Configurar API key de OpenWeatherMap
- [x] Actualizar colores Material You en theme.config.js
- [x] Crear estructura de tipos TypeScript para alertas
- [x] Configurar permisos de ubicación en app.config.ts

## Fase 2: Funcionalidad de Ubicación
- [x] Implementar hook useLocation para obtener coordenadas
- [x] Crear pantalla de selección de ubicación
- [x] Guardar ubicación en AsyncStorage
- [ ] Permitir búsqueda de ciudades

## Fase 3: Integración de API de Clima
- [x] Crear servicio de API para OpenWeatherMap
- [x] Implementar función para obtener alertas de tormentas
- [x] Categorizar alertas por severidad (leve, moderada, severa)
- [ ] Implementar caché local de datos

## Fase 4: Sistema de Notificaciones
- [x] Configurar expo-notifications
- [x] Crear función para enviar notificaciones locales
- [x] Implementar sonido de alerta para tormentas severas
- [ ] Crear notificación de pantalla completa para alertas severas
- [x] Respetar modo No Molestar del sistema

## Fase 5: Pantalla Principal
- [x] Crear componente de tarjeta de alerta
- [x] Mostrar ubicación actual
- [x] Mostrar estado del clima
- [x] Listar alertas activas ordenadas por severidad
- [x] Implementar pull-to-refresh
- [x] Mostrar indicador de última actualización

## Fase 6: Pantalla de Mapa
- [x] Crear pantalla de mapa interactivo
- [x] Mostrar ubicación de la alerta
- [x] Resaltar área afectada por la tormenta/lluvia
- [x] Mostrar coordenadas y radio de afectación
- [x] Integrar con expo-maps (simulación visual)

## Fase 7: Pantalla de Detalles
- [x] Crear pantalla de detalles de alerta (integrada en mapa)
- [x] Mostrar información completa de la alerta
- [x] Agregar recomendaciones de seguridad
- [ ] Implementar botón de compartir
- [x] Botón para abrir mapa de la alerta

## Fase 8: Pantalla de Configuración
- [x] Crear pantalla de configuración
- [x] Opción para cambiar ubicación
- [x] Control de notificaciones por severidad
- [x] Control de volumen de sonido
- [x] Selector de tema (claro/oscuro)
- [x] Intervalo de actualización

## Fase 9: Pantalla de Historial
- [ ] Crear pantalla de historial de alertas
- [ ] Guardar alertas pasadas en base de datos local
- [ ] Filtrar por tipo de severidad
- [ ] Mostrar detalles de alertas históricas

## Fase 10: Interfaz Material You
- [ ] Aplicar colores Material You a todos los componentes
- [ ] Crear componentes reutilizables (botones, tarjetas, etc.)
- [ ] Implementar animaciones sutiles
- [ ] Asegurar consistencia visual

## Fase 11: Pruebas y Optimización
- [ ] Pruebas en dispositivo Android
- [ ] Pruebas en web (Chrome)
- [ ] Optimizar rendimiento
- [ ] Verificar consumo de batería

## Fase 12: Página Web de Descarga
- [ ] Crear página web con información de la app
- [ ] Agregar enlace de descarga del APK
- [ ] Crear instrucciones de instalación
- [ ] Agregar capturas de pantalla

## Fase 13: Compilación y Entrega
- [ ] Generar APK con Expo EAS
- [ ] Publicar página web
- [ ] Crear documentación de uso
- [ ] Entregar proyecto al usuario
