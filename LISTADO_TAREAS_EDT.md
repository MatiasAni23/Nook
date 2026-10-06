# 📋 EDT - Estructura de Desglose del Trabajo
## Pinwi/StudyConnect - Sistema de Gestión de Espacios

---

## 1. CONFIGURACIÓN INICIAL DEL PROYECTO

### 1.1 Infraestructura Base
- [ ] Crear proyecto en Supabase
- [ ] Configurar variables de entorno (.env)
- [ ] Configurar Supabase Client en React
- [ ] Instalar dependencias del proyecto (React Router v7, Tailwind v4, Lucide, etc.)
- [ ] Configurar Tailwind CSS v4 con tokens personalizados
- [ ] Configurar estructura de carpetas del proyecto
- [ ] Configurar ESLint y Prettier
- [ ] Inicializar repositorio Git

### 1.2 Base de Datos
- [ ] Ejecutar schema SQL en Supabase (database_schema.sql)
- [ ] Configurar Row Level Security (RLS) por tabla
- [ ] Crear políticas de seguridad por rol de usuario
- [ ] Configurar triggers automáticos (ratings, updated_at, etc.)
- [ ] Crear vistas precalculadas (places_with_stats, users_with_stats, etc.)
- [ ] Poblar datos de prueba (seed data)
- [ ] Configurar índices para optimización de queries

---

## 2. SISTEMA DE AUTENTICACIÓN

### 2.1 Registro e Inicio de Sesión
- [ ] Crear vista de Login (LoginView)
- [ ] Implementar login con email/password usando Supabase Auth
- [ ] Crear vista de Registro
- [ ] Implementar registro de usuarios en Supabase
- [ ] Validación de email y contraseña
- [ ] Envío de email de verificación
- [ ] Implementar "Olvidé mi contraseña"
- [ ] Crear página de verificación de email

### 2.2 Flujo de Onboarding
- [ ] Crear ProfileSetupView con selección de rol
- [ ] Formulario para perfil de Estudiante (universidad, carrera, materias)
- [ ] Formulario para perfil de Trabajador (empresa/independiente, rubro)
- [ ] Guardar perfil en user_profiles
- [ ] Redirección según rol completado

### 2.3 Gestión de Sesión
- [ ] Middleware de autenticación en rutas protegidas
- [ ] Manejo de tokens de Supabase
- [ ] Logout y limpieza de sesión
- [ ] Persistencia de sesión (local storage)
- [ ] Auto-refresh de tokens
- [ ] Detección de sesión expirada

---

## 3. MÓDULO DE USUARIOS - ESTUDIANTES

### 3.1 Vista de Descubrimiento (DiscoverView)
- [ ] Header con logo y notificaciones
- [ ] Barra de búsqueda de lugares
- [ ] Tabs de categorías (Cowork, Estudios, Reuniones, Parques)
- [ ] Banner featured con gradiente y texto
- [ ] Listado de lugares cercanos con cards
- [ ] Integración con geolocalización del navegador
- [ ] Cálculo de distancia con Haversine
- [ ] Badges de servicios (WiFi, Café, Sala reunión)
- [ ] Indicadores de reportes activos
- [ ] Navegación a detalle de lugar
- [ ] Sistema de notificaciones (bell icon)

### 3.2 Vista de Mapa (MapView)
- [ ] Integración con mapa (Google Maps o Mapbox)
- [ ] Renderizado de pins de lugares
- [ ] Clustering de pins cercanos
- [ ] Bottom sheet colapsable con lugares
- [ ] Drag gestures para expandir/colapsar
- [ ] Filtros de tipo de lugar
- [ ] Search box en mapa
- [ ] Click en pin para ver detalle en bottom sheet
- [ ] Botón de "Mi ubicación"
- [ ] Z-index correcto entre capas

### 3.3 Vista de Detalle de Lugar (PlaceDetails)
- [ ] Hero image con carousel de fotos
- [ ] Información básica (nombre, rating, distancia)
- [ ] Cards de horario, capacidad y valoración
- [ ] Sección de servicios incluidos con iconos
- [ ] Horarios detallados por día de la semana
- [ ] Sistema de reportes de la comunidad (tipo Waze)
- [ ] Modal para reportar problema
- [ ] Upvote de reportes existentes
- [ ] Botón de favorito (corazón)
- [ ] Integración con sistema de reseñas
- [ ] Galería de imágenes del lugar

### 3.4 Vista de Estudiantes (StudentsView)
- [ ] Listado de compañeros de estudio
- [ ] Búsqueda de estudiantes por nombre/universidad
- [ ] Filtros por universidad
- [ ] Filtros por materias en común
- [ ] Cards con perfil de estudiante
- [ ] Botón de "Conectar" / Enviar mensaje
- [ ] Vista de perfil de otro estudiante
- [ ] Sistema de match por intereses

### 3.5 Vista de Perfil (ProfileView)
- [ ] Header con avatar y nombre
- [ ] Información de carrera y universidad
- [ ] Lista de materias/intereses
- [ ] Estadísticas (lugares visitados, reseñas, etc.)
- [ ] Sección de lugares favoritos
- [ ] Botón de editar perfil
- [ ] Modal de edición de perfil
- [ ] Cambio de foto de perfil
- [ ] Configuración de notificaciones
- [ ] Cerrar sesión

### 3.6 Sistema de Chat (ChatView)
- [ ] Lista de conversaciones activas
- [ ] Vista de conversación 1 a 1
- [ ] Envío de mensajes en tiempo real
- [ ] Indicador de "escribiendo..."
- [ ] Marcado de leído/no leído
- [ ] Timestamp de mensajes
- [ ] Scroll automático a último mensaje
- [ ] Notificación de nuevos mensajes
- [ ] Búsqueda de conversaciones
- [ ] Eliminación de conversaciones

### 3.7 Sistema de Notificaciones (NotificationsPanel)
- [ ] Panel modal de notificaciones
- [ ] Listado de todas las notificaciones
- [ ] Iconos por tipo de notificación
- [ ] Indicador de no leídas
- [ ] Marcar como leída al hacer click
- [ ] Botón "Marcar todas como leídas"
- [ ] Navegación a contenido relacionado
- [ ] Tiempo relativo ("Hace 2h")
- [ ] Filtros por tipo de notificación
- [ ] Eliminación de notificaciones

---

## 4. MÓDULO DE USUARIOS - TRABAJADORES

### 4.1 Vista de Descubrimiento Trabajadores (WorkerDiscoverView)
- [ ] Header con branding "WorkSpace"
- [ ] Tabs de espacios de trabajo (Coworking, Oficinas, Salas, Premium)
- [ ] Listado de lugares con precios
- [ ] Indicadores de disponibilidad
- [ ] Botón de reservar directo desde card
- [ ] Filtros por precio
- [ ] Filtros por capacidad
- [ ] Sistema de notificaciones integrado

### 4.2 Vista de Perfil Trabajador (WorkerProfileView)
- [ ] Header con avatar y nombre
- [ ] Información de empresa o rubro (independiente)
- [ ] Estadísticas de reservas
- [ ] Historial de reservas
- [ ] Lugares favoritos
- [ ] Edición de perfil
- [ ] Gestión de métodos de pago

### 4.3 Sistema de Reservas (CheckoutView)
- [ ] Información del lugar a reservar
- [ ] Calendario de selección multi-fecha
- [ ] Navegación entre meses
- [ ] Indicadores de disponibilidad por día
- [ ] Selector de horario
- [ ] Selector de cantidad de personas
- [ ] Campo de solicitudes especiales
- [ ] Selector de método de pago (Tarjeta, Transferencia, Onepay)
- [ ] Breakdown de precios (base + servicio)
- [ ] Botón de confirmar reserva
- [ ] Validación de fechas disponibles
- [ ] Integración con pasarela de pago (Transbank/Khipu)

### 4.4 Historial de Reservas
- [ ] Listado de reservas pasadas
- [ ] Filtros por estado (confirmadas, canceladas, completadas)
- [ ] Detalle de cada reserva
- [ ] Opción de cancelar reserva
- [ ] Opción de modificar reserva
- [ ] Descarga de comprobante/factura
- [ ] Dejar reseña después de visita

---

## 5. MÓDULO ADMINISTRATIVO

### 5.1 Layout y Navegación Admin
- [ ] AdminLayout con header
- [ ] Navegación flotante circular (4 tabs)
- [ ] Actualización de colores al tema morado
- [ ] Breadcrumbs de navegación
- [ ] Indicadores de rutas activas
- [ ] Botón de cerrar sesión

### 5.2 Dashboard Principal (AdminHome)
- [ ] Resumen de estadísticas clave
- [ ] Total de usuarios por rol
- [ ] Total de lugares registrados
- [ ] Total de reservas del mes
- [ ] Gráfico de nuevos registros
- [ ] Últimos lugares agregados
- [ ] Reportes recientes destacados
- [ ] Tickets de soporte pendientes

### 5.3 Gestión de Lugares (AdminManagePlaces)
- [ ] Listado completo de lugares
- [ ] Buscador de lugares
- [ ] Filtros por categoría (Estudiantes/Trabajadores)
- [ ] Filtros por tipo de lugar
- [ ] Filtros por zona
- [ ] Vista de crear nuevo lugar (AdminAddPlace)
- [ ] Formulario con mapa interactivo
- [ ] Selección de ubicación con pin
- [ ] Campos de información básica
- [ ] Configuración de servicios (WiFi, Enchufes, etc.)
- [ ] Sliders de ambiente (silencio, iluminación)
- [ ] Vista de editar lugar (AdminEditPlace)
- [ ] Carga de múltiples imágenes
- [ ] Eliminación de lugares
- [ ] Activar/Desactivar lugares

### 5.4 Analíticas (AdminStats)
- [ ] Tabs de vistas (Por Lugar / Por Zona)
- [ ] Selector de lugar específico
- [ ] Cards con estadísticas clave
- [ ] Gráfico de barras de horas peak
- [ ] Gráfico de línea de visitas semanales
- [ ] Gráfico comparativo por zonas
- [ ] Exportación de reportes
- [ ] Filtros de rango de fechas

### 5.5 Gestión de Delegados (AdminDelegates)
- [ ] Listado de delegados
- [ ] Búsqueda de delegados
- [ ] Filtros por estado (Activo, Suspendido, Pendiente)
- [ ] Modal de crear delegado
- [ ] Formulario con datos personales
- [ ] Asignación de lugares (multi-select)
- [ ] Edición de delegados
- [ ] Cambio de estado (Activar/Suspender)
- [ ] Eliminación de delegados
- [ ] Reasignación de lugares

### 5.6 Gestión de Usuarios (AdminUsers)
- [ ] Listado completo de usuarios de app
- [ ] Búsqueda por nombre/email
- [ ] Filtros por rol (Estudiante/Trabajador)
- [ ] Filtros por estado (Activo, Verificado, Suspendido, Bloqueado)
- [ ] Vista de detalle de usuario
- [ ] Acción: Verificar usuario
- [ ] Acción: Suspender usuario
- [ ] Acción: Bloquear usuario
- [ ] Acción: Activar usuario
- [ ] Historial de actividad del usuario
- [ ] Exportación de datos de usuario

### 5.7 Sistema de Soporte (AdminSupport)
- [ ] Listado de tickets de soporte
- [ ] Búsqueda de tickets
- [ ] Filtros por estado (Pendiente, En revisión, Resuelto, Cerrado)
- [ ] Filtros por categoría (Técnico, Facturación, Reporte, Sugerencia)
- [ ] Filtros por prioridad (Baja, Media, Alta)
- [ ] Modal de detalle de ticket
- [ ] Vista de conversación (chat style)
- [ ] Textarea para responder
- [ ] Botón de enviar respuesta
- [ ] Cambio de estado del ticket
- [ ] Asignación de tickets a agentes
- [ ] Notas internas (solo staff)
- [ ] Sistema de tags para tickets
- [ ] Plantillas de respuesta predefinidas

### 5.8 Gestión de Reservas (AdminReservations)
- [ ] Listado de todas las reservas
- [ ] Búsqueda por usuario/lugar
- [ ] Filtros por estado (Pendiente, Confirmada, Rechazada, Cancelada)
- [ ] Vista detallada de reserva
- [ ] Aprobar reserva pendiente
- [ ] Rechazar reserva con motivo
- [ ] Modificar fechas de reserva
- [ ] Cancelar reserva
- [ ] Vista de calendario (próxima implementación)
- [ ] Calendario mensual con disponibilidad
- [ ] Gestión de cupos por lugar
- [ ] Bloqueo de fechas

### 5.9 Gestión de Reportes (AdminReports)
- [ ] Listado de reportes de lugares
- [ ] Búsqueda de reportes
- [ ] Filtros por estado (Pendiente, Revisando, Resuelto, Descartado)
- [ ] Filtros por tipo de problema
- [ ] Vista de reporte en mapa
- [ ] Detalle completo del reporte
- [ ] Acción: Marcar como "Revisando"
- [ ] Acción: Resolver reporte
- [ ] Acción: Descartar reporte
- [ ] Ver confirmaciones (upvotes)
- [ ] Notificar al delegado del lugar
- [ ] Historial de reportes por lugar

---

## 6. INTEGRACIONES Y SERVICIOS

### 6.1 Supabase
- [ ] Configurar autenticación con Supabase Auth
- [ ] Configurar Storage para imágenes
- [ ] Implementar políticas de Storage
- [ ] Configurar Realtime para chat
- [ ] Configurar Realtime para notificaciones
- [ ] Implementar RLS (Row Level Security) completo
- [ ] Configurar Edge Functions (si necesario)

### 6.2 Geolocalización
- [ ] Integrar Google Maps API o Mapbox
- [ ] Implementar geocoding (dirección → coordenadas)
- [ ] Implementar reverse geocoding (coordenadas → dirección)
- [ ] Cálculo de distancias con Haversine
- [ ] Detección de ubicación del usuario
- [ ] Permisos de geolocalización

### 6.3 Pasarela de Pago
- [ ] Integración con Transbank (Chile)
- [ ] Integración con Khipu (alternativa)
- [ ] Onepay para pagos móviles
- [ ] Webhook de confirmación de pago
- [ ] Generación de comprobantes
- [ ] Manejo de reembolsos

### 6.4 Notificaciones
- [ ] Configurar Firebase Cloud Messaging (FCM)
- [ ] Notificaciones push en navegador
- [ ] Emails transaccionales (SendGrid/Resend)
- [ ] Templates de emails
- [ ] Email de bienvenida
- [ ] Email de confirmación de reserva
- [ ] Email de reseteo de contraseña

### 6.5 Almacenamiento de Archivos
- [ ] Subida de imágenes de perfil
- [ ] Subida de imágenes de lugares (múltiple)
- [ ] Compresión de imágenes
- [ ] Generación de thumbnails
- [ ] Validación de tipos de archivo
- [ ] Límites de tamaño de archivo

---

## 7. FUNCIONALIDADES TRANSVERSALES

### 7.1 Sistema de Reseñas
- [ ] Formulario de crear reseña
- [ ] Rating con estrellas (1-5)
- [ ] Textarea para comentario
- [ ] Ratings específicos (WiFi, Ruido, Limpieza)
- [ ] Validación: solo usuarios que visitaron
- [ ] Edición de reseña propia
- [ ] Eliminación de reseña propia
- [ ] Listado de reseñas en detalle de lugar
- [ ] Ordenamiento (más recientes, mejor valoradas)
- [ ] Botón de "útil" en reseñas
- [ ] Respuesta del lugar a reseñas (delegados)

### 7.2 Sistema de Favoritos
- [ ] Marcar lugar como favorito (corazón)
- [ ] Desmarcar favorito
- [ ] Vista de "Mis Favoritos"
- [ ] Notificación si favorito tiene reporte
- [ ] Sincronización en tiempo real

### 7.3 Sistema de Búsqueda
- [ ] Búsqueda por nombre de lugar
- [ ] Búsqueda por zona/comuna
- [ ] Búsqueda por tipo de lugar
- [ ] Búsqueda por servicios disponibles
- [ ] Autocompletado de búsqueda
- [ ] Historial de búsquedas
- [ ] Búsqueda fuzzy (tolerante a errores)

### 7.4 Filtros Avanzados
- [ ] Filtro por distancia máxima
- [ ] Filtro por rating mínimo
- [ ] Filtro por precio (para trabajadores)
- [ ] Filtro por capacidad
- [ ] Filtro por horario de apertura
- [ ] Filtro por servicios (WiFi, Parking, etc.)
- [ ] Combinación de múltiples filtros
- [ ] Guardar configuración de filtros

---

## 8. OPTIMIZACIÓN Y PERFORMANCE

### 8.1 Performance Frontend
- [ ] Lazy loading de componentes
- [ ] Code splitting por rutas
- [ ] Optimización de imágenes (WebP, lazy load)
- [ ] Virtualización de listas largas
- [ ] Debouncing en búsquedas
- [ ] Throttling en scroll events
- [ ] Memoización de componentes pesados
- [ ] Service Worker para PWA

### 8.2 Performance Backend
- [ ] Optimización de queries SQL
- [ ] Índices en columnas frecuentes
- [ ] Paginación de resultados
- [ ] Caché de queries frecuentes
- [ ] Compresión de respuestas
- [ ] CDN para assets estáticos

### 8.3 PWA (Progressive Web App)
- [ ] Configurar manifest.json
- [ ] Configurar Service Worker
- [ ] Modo offline básico
- [ ] Caché de assets críticos
- [ ] Add to Home Screen
- [ ] Splash screen
- [ ] Iconos adaptativos

---

## 9. TESTING Y CALIDAD

### 9.1 Testing Unitario
- [ ] Setup de Jest/Vitest
- [ ] Tests de componentes React
- [ ] Tests de hooks personalizados
- [ ] Tests de utilidades (distancia, fechas, etc.)
- [ ] Coverage mínimo del 70%

### 9.2 Testing de Integración
- [ ] Tests de flujos completos
- [ ] Tests de autenticación
- [ ] Tests de reserva completa
- [ ] Tests de chat
- [ ] Tests de reportes

### 9.3 Testing E2E
- [ ] Setup de Playwright/Cypress
- [ ] Test: Registro → Onboarding → Login
- [ ] Test: Búsqueda → Detalle → Reserva
- [ ] Test: Reportar problema
- [ ] Test: Admin gestiona usuarios
- [ ] Test: Admin aprueba reserva

### 9.4 Validación y Seguridad
- [ ] Validación de inputs en frontend
- [ ] Validación de datos en backend (RLS)
- [ ] Sanitización de inputs
- [ ] Prevención de SQL injection
- [ ] Prevención de XSS
- [ ] Rate limiting en endpoints
- [ ] CORS configurado correctamente
- [ ] Headers de seguridad

---

## 10. DOCUMENTACIÓN

### 10.1 Documentación Técnica
- [ ] README.md completo
- [ ] Guía de instalación
- [ ] Variables de entorno documentadas
- [ ] Arquitectura de la aplicación
- [ ] Estructura de carpetas explicada
- [ ] Guía de contribución
- [ ] Changelog

### 10.2 Documentación de API
- [ ] Endpoints de Supabase documentados
- [ ] Esquema de base de datos (ya creado)
- [ ] Ejemplos de queries
- [ ] Políticas de RLS explicadas
- [ ] Triggers y funciones documentadas

### 10.3 Guías de Usuario
- [ ] Manual de usuario estudiante
- [ ] Manual de usuario trabajador
- [ ] Manual de usuario admin
- [ ] Manual de delegado
- [ ] FAQs
- [ ] Videos tutoriales (opcional)

---

## 11. DEPLOYMENT Y PRODUCCIÓN

### 11.1 Preparación para Producción
- [ ] Configurar variables de entorno de producción
- [ ] Optimizar build de producción
- [ ] Minificación de assets
- [ ] Configurar dominio personalizado
- [ ] Configurar SSL/TLS
- [ ] Configurar redirects y rewrites

### 11.2 Deployment
- [ ] Deploy frontend en Vercel/Netlify
- [ ] Configurar Supabase en producción
- [ ] Migrar base de datos a producción
- [ ] Configurar backups automáticos
- [ ] Configurar monitoreo (Sentry/LogRocket)
- [ ] Configurar analytics (Google Analytics/Plausible)

### 11.3 CI/CD
- [ ] Configurar GitHub Actions
- [ ] Pipeline de tests automáticos
- [ ] Deploy automático en merge a main
- [ ] Preview deployments por PR
- [ ] Rollback automático en caso de error

### 11.4 Monitoreo y Mantenimiento
- [ ] Dashboard de métricas
- [ ] Alertas de errores
- [ ] Logs centralizados
- [ ] Monitoreo de performance
- [ ] Backups periódicos
- [ ] Plan de recuperación ante desastres

---

## 12. FUNCIONALIDADES FUTURAS (POST-MVP)

### 12.1 Fase 2
- [ ] Sistema de mensajería grupal
- [ ] Eventos de estudio/networking
- [ ] Reservas recurrentes
- [ ] Sistema de puntos/gamificación
- [ ] Integración con calendarios (Google Calendar, Outlook)
- [ ] App móvil nativa (React Native)

### 12.2 Fase 3
- [ ] IA para recomendaciones personalizadas
- [ ] Chatbot de soporte con IA
- [ ] Sistema de referidos y afiliados
- [ ] Marketplace de servicios adicionales
- [ ] API pública para terceros
- [ ] Integración con universidades (SSO)

---

## 📊 RESUMEN DE MÓDULOS

| Módulo | Tareas | Estado |
|--------|--------|--------|
| 1. Configuración Inicial | 14 | ⚠️ Pendiente |
| 2. Autenticación | 18 | ⚠️ Pendiente |
| 3. Usuarios - Estudiantes | 54 | 🟡 En progreso |
| 4. Usuarios - Trabajadores | 28 | 🟡 En progreso |
| 5. Admin | 82 | ✅ Completado (Frontend) |
| 6. Integraciones | 26 | ⚠️ Pendiente |
| 7. Funcionalidades Transversales | 37 | ⚠️ Pendiente |
| 8. Optimización | 18 | ⚠️ Pendiente |
| 9. Testing | 23 | ⚠️ Pendiente |
| 10. Documentación | 17 | 🟡 Parcial |
| 11. Deployment | 20 | ⚠️ Pendiente |
| 12. Futuras | 17 | ⚠️ Roadmap |

**TOTAL: 354 tareas**

---

## 🎯 PRIORIZACIÓN SUGERIDA

### Sprint 1 - Fundación (2 semanas)
1. Configuración inicial completa
2. Base de datos en Supabase
3. Autenticación básica (login/registro)
4. Layout principal y navegación

### Sprint 2 - MVP Estudiantes (2 semanas)
1. DiscoverView completa
2. PlaceDetails completa
3. MapView básico
4. Sistema de favoritos

### Sprint 3 - MVP Trabajadores (2 semanas)
1. WorkerDiscoverView
2. Sistema de reservas (CheckoutView)
3. Integración de pagos
4. Historial de reservas

### Sprint 4 - Admin Core (2 semanas)
1. Gestión de lugares (CRUD completo)
2. Gestión de delegados
3. Gestión de usuarios
4. Dashboard de estadísticas

### Sprint 5 - Soporte y Reportes (1 semana)
1. Sistema de soporte completo
2. Gestión de reportes
3. Gestión de reservas desde admin
4. Notificaciones

### Sprint 6 - Integraciones (1 semana)
1. Geolocalización completa
2. Chat en tiempo real
3. Notificaciones push
4. Storage de imágenes

### Sprint 7 - Testing y Optimización (1 semana)
1. Tests unitarios clave
2. Tests E2E de flujos críticos
3. Optimización de performance
4. PWA básico

### Sprint 8 - Deployment (1 semana)
1. Preparación para producción
2. Deploy inicial
3. Configuración de monitoreo
4. Documentación final

**Duración total estimada: 12 semanas (3 meses)**
