# Tormentar - Diseño de la Aplicación Móvil

## Visión General

Aplicación de alertas de tormentas en tiempo real con notificaciones inteligentes basadas en la severidad del evento. Interfaz Material You (Material 3) con colores dinámicos que reflejan el estado del clima.

---

## Pantallas Principales

### 1. **Pantalla de Inicio (Home)**
- **Ubicación actual**: Mostrar ciudad y coordenadas con opción de cambiar ubicación
- **Estado del clima actual**: Temperatura, condiciones generales, velocidad del viento
- **Alertas activas**: Lista de alertas de tormentas en orden de severidad
- **Botón de actualización**: Refrescar datos manualmente
- **Indicador de última actualización**: Mostrar cuándo se actualizaron los datos

### 2. **Pantalla de Detalles de Alerta**
- **Información completa de la alerta**: Nombre del evento, descripción detallada
- **Severidad**: Leve, Moderada, Severa (con color y icono diferenciado)
- **Tiempo de inicio y fin**: Cuándo comienza y termina la alerta
- **Área afectada**: Descripción de la zona geográfica
- **Recomendaciones**: Consejos de seguridad según el tipo de alerta
- **Botón de compartir**: Compartir la alerta con otros

### 3. **Pantalla de Configuración**
- **Ubicación**: Cambiar ubicación manualmente o usar GPS
- **Notificaciones**: Activar/desactivar por tipo de severidad
- **Sonido de alerta**: Volumen y tipo de sonido
- **Modo No Molestar**: Respetar configuración del sistema
- **Intervalo de actualización**: Frecuencia de consulta a la API
- **Tema**: Claro/Oscuro (Material You)

### 4. **Pantalla de Historial**
- **Alertas pasadas**: Lista de alertas que ya han pasado
- **Filtrar por tipo**: Leve, Moderada, Severa
- **Detalles históricos**: Ver información de alertas anteriores

---

## Flujos de Usuario Principales

### Flujo 1: Monitoreo de Alertas
1. Usuario abre la app
2. App detecta ubicación (GPS o manual)
3. App consulta OpenWeatherMap API
4. Se muestran alertas activas en la pantalla principal
5. Si hay alerta severa → Notificación con sonido + alerta visual

### Flujo 2: Ver Detalles de Alerta
1. Usuario toca una alerta en la lista
2. Se abre pantalla de detalles
3. Muestra información completa y recomendaciones
4. Opción de compartir o marcar como leída

### Flujo 3: Cambiar Ubicación
1. Usuario toca el botón de ubicación
2. Abre modal para seleccionar nueva ubicación
3. Puede usar GPS o buscar por ciudad
4. Confirma cambio y se actualizan alertas

---

## Paleta de Colores (Material You)

| Elemento | Color | Uso |
|----------|-------|-----|
| **Alerta Leve** | Amarillo/Naranja (#FFA500) | Advertencias menores |
| **Alerta Moderada** | Naranja Oscuro (#FF6B35) | Precaución recomendada |
| **Alerta Severa** | Rojo (#EF4444) | Peligro inminente |
| **Fondo** | Blanco/Negro (según tema) | Fondo general |
| **Superficie** | Gris claro/Gris oscuro | Tarjetas y elementos |
| **Primario** | Azul (#0a7ea4) | Botones y acentos |

---

## Comportamiento de Notificaciones

### Alerta Leve
- Notificación silenciosa
- Icono en la barra de estado
- Sin sonido

### Alerta Moderada
- Notificación con vibración
- Sonido moderado (si está habilitado)
- Respeta modo No Molestar

### Alerta Severa
- **Pantalla completa** (si está en primer plano)
- Sonido de alerta fuerte (respeta No Molestar)
- Vibración intensa
- Notificación persistente
- No se puede descartar fácilmente

---

## Interacciones Clave

- **Pull-to-refresh**: Deslizar hacia abajo para actualizar
- **Tap en alerta**: Ver detalles
- **Tap en ubicación**: Cambiar ubicación
- **Tap en configuración**: Acceder a ajustes
- **Swipe en alerta**: Marcar como leída (opcional)

---

## Consideraciones Técnicas

- **Geolocalización**: Usar `expo-location` para obtener coordenadas
- **API de clima**: OpenWeatherMap One Call API 4.0
- **Notificaciones**: `expo-notifications` con soporte para sonido y pantalla completa
- **Almacenamiento local**: AsyncStorage para guardar preferencias
- **Actualizaciones periódicas**: Background task cada 10-15 minutos
- **Material You**: NativeWind (Tailwind CSS) + colores dinámicos

---

## Accesibilidad

- Contraste suficiente en todos los colores
- Textos descriptivos para iconos
- Soporte para lectores de pantalla
- Tamaños de toque mínimos (44x44 pt)
