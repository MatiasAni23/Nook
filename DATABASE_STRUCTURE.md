# 📊 Estructura de Base de Datos - Nook/StudyConnect

## Resumen General

Esta base de datos está diseñada para soportar una plataforma de gestión de espacios de estudio y trabajo en Chile, con capacidades de:
- Gestión de usuarios (estudiantes, trabajadores, admins, soporte, delegados)
- Catálogo de lugares con reservas
- Sistema de reseñas y reportes
- Mensajería y notificaciones
- Soporte técnico con tickets

---

## 📋 Tablas Principales

### 1. **users** (Usuarios)
Tabla central que almacena todos los usuarios del sistema.

**Campos clave:**
- `id` - UUID único
- `email` - Email único del usuario
- `password_hash` - Contraseña encriptada
- `name` - Nombre completo
- `role` - Rol: `student`, `worker`, `admin`, `support`, `delegate`
- `status` - Estado: `active`, `verified`, `suspended`, `blocked`, `pending`
- `profile_completed` - Boolean si completó perfil

**Relaciones:**
- → `user_profiles` (1:1) - Perfil extendido
- → `reservations` (1:N) - Reservas del usuario
- → `reviews` (1:N) - Reseñas escritas
- → `place_reports` (1:N) - Reportes enviados
- → `messages` (1:N) - Mensajes enviados/recibidos
- → `favorites` (1:N) - Lugares favoritos
- → `support_tickets` (1:N) - Tickets de soporte
- → `delegates` (1:1) - Perfil de delegado (si aplica)

---

### 2. **user_profiles** (Perfiles de Usuario)
Información extendida específica según el rol del usuario.

**Campos para Estudiantes:**
- `university` - Universidad
- `career` - Carrera
- `subjects` - Array de materias/intereses

**Campos para Trabajadores:**
- `company` - Empresa
- `position` - Cargo
- `is_independent` - Si es trabajador independiente
- `industry` - Rubro (para independientes)

**Campos Comunes:**
- `bio` - Biografía
- `profile_image_url` - Foto de perfil

**Relaciones:**
- ← `users` (1:1) - Usuario asociado

---

### 3. **places** (Lugares)
Catálogo de lugares de estudio y trabajo.

**Campos principales:**
- `name` - Nombre del lugar
- `type` - Tipo: `library`, `cafe`, `coworking`, `office`, `meeting_room`, `private_office`, `park`
- `category` - Categoría: `study` (estudiantes) o `work` (trabajadores)
- `latitude`, `longitude` - Coordenadas GPS
- `zone` - Zona/comuna (ej: Las Condes, Providencia)
- `rating` - Valoración promedio (0-5)
- `reviews_count` - Cantidad de reseñas
- `capacity_min`, `capacity_max` - Capacidad de personas

**Servicios:**
- `wifi`, `outlets`, `parking` - Booleans
- `quietness_level` - Nivel de silencio (1-5)
- `lighting_level` - Nivel de iluminación (1-5)

**Precios:**
- `price_per_hour` - Precio por hora (para trabajadores)
- `currency` - Moneda (default: CLP)

**Relaciones:**
- → `place_hours` (1:N) - Horarios por día
- → `place_amenities` (1:N) - Servicios detallados
- → `reservations` (1:N) - Reservas del lugar
- → `reviews` (1:N) - Reseñas recibidas
- → `place_reports` (1:N) - Reportes activos
- → `favorites` (1:N) - Marcado como favorito
- → `delegate_places` (N:M) - Delegados asignados

---

### 4. **delegates** (Delegados)
Usuarios especiales que administran lugares específicos.

**Campos:**
- `user_id` - Referencia al usuario
- `status` - Estado: `active`, `suspended`, `pending`
- `joined_date` - Fecha de alta como delegado
- `last_active` - Última actividad

**Relaciones:**
- ← `users` (1:1) - Usuario delegado
- → `delegate_places` (1:N) - Lugares asignados

---

### 5. **delegate_places** (Asignación Delegado-Lugar)
Tabla de relación N:M entre delegados y lugares.

**Campos:**
- `delegate_id` - ID del delegado
- `place_id` - ID del lugar
- `assigned_at` - Fecha de asignación

**Relaciones:**
- ← `delegates` (N:1)
- ← `places` (N:1)

---

### 6. **reservations** (Reservas)
Reservas de espacios de trabajo por usuarios.

**Campos principales:**
- `user_id` - Usuario que reserva
- `place_id` - Lugar reservado
- `reservation_dates` - Array de fechas reservadas
- `start_time`, `end_time` - Horario
- `status` - Estado: `pending`, `confirmed`, `rejected`, `cancelled`, `completed`

**Pago:**
- `total_amount` - Monto total
- `payment_method` - Método: `credit_card`, `transfer`, `onepay`
- `payment_status` - Estado del pago: `pending`, `paid`, `refunded`, `failed`

**Relaciones:**
- ← `users` (N:1) - Usuario que reserva
- ← `places` (N:1) - Lugar reservado
- → `notifications` (1:N) - Notificaciones relacionadas

---

### 7. **reviews** (Reseñas)
Valoraciones y comentarios sobre lugares.

**Campos:**
- `user_id` - Usuario que reseña
- `place_id` - Lugar reseñado
- `rating` - Valoración general (1-5)
- `comment` - Comentario texto

**Ratings específicos:**
- `wifi_rating` - Valoración del WiFi
- `noise_rating` - Valoración del ruido
- `cleanliness_rating` - Valoración de limpieza

**Metadata:**
- `helpful_count` - Veces marcada como útil
- `verified_visit` - Si se verificó la visita

**Relaciones:**
- ← `users` (N:1) - Autor de la reseña
- ← `places` (N:1) - Lugar reseñado

---

### 8. **place_reports** (Reportes de Lugares)
Reportes tipo Waze sobre problemas en lugares.

**Campos:**
- `user_id` - Usuario que reporta
- `place_id` - Lugar reportado
- `type` - Tipo: `no_wifi`, `crowded`, `noisy`, `no_outlets`, `closed`, `dirty`, `no_parking`, `other`
- `description` - Descripción del problema
- `status` - Estado: `pending`, `reviewing`, `resolved`, `dismissed`
- `upvotes_count` - Cantidad de confirmaciones

**Moderación:**
- `reviewed_by` - Admin que revisó
- `reviewed_at` - Fecha de revisión
- `admin_notes` - Notas internas

**Relaciones:**
- ← `users` (N:1) - Usuario que reporta
- ← `places` (N:1) - Lugar reportado
- ← `users` (N:1) - Admin revisor (opcional)

---

### 9. **favorites** (Favoritos)
Lugares marcados como favoritos por usuarios.

**Campos:**
- `user_id` - Usuario
- `place_id` - Lugar favorito
- `created_at` - Fecha de marcado

**Relaciones:**
- ← `users` (N:1)
- ← `places` (N:1)

---

### 10. **messages** (Mensajes)
Sistema de chat entre usuarios.

**Campos:**
- `sender_id` - Usuario que envía
- `receiver_id` - Usuario que recibe
- `message` - Contenido del mensaje
- `read` - Si fue leído
- `message_type` - Tipo: `text`, `image`, `file`, `location`
- `attachment_url` - URL del adjunto (si aplica)

**Relaciones:**
- ← `users` (N:1) - Remitente
- ← `users` (N:1) - Destinatario

---

### 11. **notifications** (Notificaciones)
Notificaciones push para usuarios.

**Campos:**
- `user_id` - Usuario destinatario
- `type` - Tipo: `issue_report`, `favorite_issue`, `reservation_confirmed`, `new_message`, `place_update`, `review_response`, `system`
- `title` - Título de la notificación
- `message` - Mensaje
- `read` - Si fue leída

**Referencias opcionales:**
- `place_id` - Lugar relacionado
- `reservation_id` - Reserva relacionada
- `message_id` - Mensaje relacionado

**Relaciones:**
- ← `users` (N:1) - Usuario destinatario
- ← `places` (N:1) - Lugar relacionado (opcional)
- ← `reservations` (N:1) - Reserva relacionada (opcional)
- ← `messages` (N:1) - Mensaje relacionado (opcional)

---

### 12. **support_tickets** (Tickets de Soporte)
Sistema de tickets para soporte técnico.

**Campos:**
- `user_id` - Usuario que crea el ticket
- `subject` - Asunto
- `category` - Categoría: `technical`, `billing`, `report`, `suggestion`, `other`
- `priority` - Prioridad: `low`, `medium`, `high`, `urgent`
- `status` - Estado: `pending`, `in_review`, `resolved`, `closed`

**Asignación:**
- `assigned_to` - Usuario de soporte asignado
- `assigned_at` - Fecha de asignación

**Metadata:**
- `tags` - Array de etiquetas
- `internal_notes` - Notas internas del equipo

**Relaciones:**
- ← `users` (N:1) - Usuario creador
- ← `users` (N:1) - Agente asignado (opcional)
- → `support_ticket_messages` (1:N) - Mensajes del ticket

---

### 13. **support_ticket_messages** (Mensajes de Tickets)
Conversación dentro de cada ticket de soporte.

**Campos:**
- `ticket_id` - Ticket asociado
- `sender_id` - Usuario que envía
- `sender_type` - Tipo: `user`, `support`, `system`
- `message` - Contenido
- `attachments` - Array de URLs de adjuntos
- `is_internal` - Si es nota interna (solo staff)

**Relaciones:**
- ← `support_tickets` (N:1) - Ticket padre
- ← `users` (N:1) - Remitente

---

### 14. **place_hours** (Horarios de Lugares)
Horarios detallados por día de la semana.

**Campos:**
- `place_id` - Lugar
- `day_of_week` - Día (0=Domingo, 6=Sábado)
- `open_time` - Hora de apertura
- `close_time` - Hora de cierre
- `is_closed` - Si está cerrado ese día

**Relaciones:**
- ← `places` (N:1)

---

### 15. **place_amenities** (Servicios de Lugares)
Servicios y comodidades detalladas de cada lugar.

**Campos:**
- `place_id` - Lugar
- `amenity_key` - Clave del servicio (ej: `meeting_room`, `coffee`, `printer`)
- `amenity_name` - Nombre del servicio
- `is_available` - Si está disponible
- `additional_info` - Información adicional

**Relaciones:**
- ← `places` (N:1)

---

## 🔗 Diagrama de Relaciones Principales

```
USERS
  ├─→ user_profiles (1:1)
  ├─→ delegates (1:1)
  ├─→ reservations (1:N)
  ├─→ reviews (1:N)
  ├─→ place_reports (1:N)
  ├─→ favorites (1:N)
  ├─→ messages (1:N as sender)
  ├─→ messages (1:N as receiver)
  ├─→ notifications (1:N)
  └─→ support_tickets (1:N)

PLACES
  ├─→ place_hours (1:N)
  ├─→ place_amenities (1:N)
  ├─→ reservations (1:N)
  ├─→ reviews (1:N)
  ├─→ place_reports (1:N)
  ├─→ favorites (1:N)
  └─→ delegate_places (N:M with delegates)

DELEGATES
  ├─→ delegate_places (1:N)
  └─← users (1:1)

RESERVATIONS
  ├─← users (N:1)
  ├─← places (N:1)
  └─→ notifications (1:N)

SUPPORT_TICKETS
  ├─← users (N:1 as creator)
  ├─← users (N:1 as assigned_to)
  └─→ support_ticket_messages (1:N)
```

---

## 🎯 Casos de Uso Principales

### 1. **Registro de Usuario**
```
users → user_profiles
```
1. Crear usuario en `users`
2. Crear perfil en `user_profiles` según rol
3. Si es delegado, crear registro en `delegates`

### 2. **Creación de Lugar**
```
places → place_hours → place_amenities
```
1. Insertar en `places`
2. Insertar horarios en `place_hours` (7 registros, uno por día)
3. Insertar servicios en `place_amenities`

### 3. **Asignar Delegado a Lugar**
```
delegates ← delegate_places → places
```
1. Obtener delegado de `delegates`
2. Crear relación en `delegate_places`

### 4. **Hacer una Reserva**
```
users → reservations ← places → notifications
```
1. Crear reserva en `reservations`
2. Crear notificación en `notifications` para el usuario
3. Si requiere aprobación, crear notificación para delegado/admin

### 5. **Reportar Problema en Lugar**
```
users → place_reports ← places → notifications
```
1. Crear reporte en `place_reports`
2. Crear notificación para usuarios que tienen el lugar en favoritos
3. Crear notificación para delegado asignado al lugar

### 6. **Sistema de Soporte**
```
users → support_tickets → support_ticket_messages ← users (support)
```
1. Usuario crea ticket en `support_tickets`
2. Usuario envía mensaje inicial en `support_ticket_messages`
3. Agente de soporte responde en `support_ticket_messages`
4. Ticket se actualiza con estado y asignación

---

## 📈 Vistas Precalculadas

### `places_with_stats`
Lugares con estadísticas agregadas:
- Total de reservas
- Cantidad de favoritos
- Reportes activos
- Rating promedio

### `users_with_stats`
Usuarios con estadísticas:
- Total de reservas
- Total de reportes enviados
- Total de reseñas escritas
- Total de favoritos

### `delegates_with_places`
Delegados con información completa:
- Datos del usuario
- Cantidad de lugares asignados
- Array de IDs de lugares

---

## 🔒 Triggers y Funcionalidades Automáticas

1. **Auto-actualización de `updated_at`**
   - Todas las tablas principales actualizan automáticamente `updated_at`

2. **Actualización de rating de lugares**
   - Al crear/actualizar una reseña, se recalcula el rating del lugar

3. **Contador de favoritos**
   - Al marcar/desmarcar favorito, se actualiza `favorites_count` en `places`

---

## 💾 Índices Importantes

- **Búsqueda de lugares**: `idx_places_location` (lat, lng)
- **Filtrado por zona**: `idx_places_zone`
- **Mensajes no leídos**: `idx_messages_unread`
- **Notificaciones no leídas**: `idx_notifications_unread`
- **Tickets por estado**: `idx_support_tickets_status`

---

## 🚀 Consideraciones para Producción

1. **Particionamiento**
   - Considerar particionar `messages` por fecha
   - Particionar `notifications` por fecha y usuario

2. **Archivado**
   - Mover reservas antiguas a tabla de archivo
   - Archivar tickets cerrados después de 6 meses

3. **Caché**
   - Cachear vistas agregadas (`places_with_stats`)
   - Cachear lugares populares

4. **Seguridad**
   - Row Level Security (RLS) en Supabase
   - Políticas por rol de usuario
   - Encriptación de datos sensibles

---

## 📝 Notas Adicionales

- Todas las tablas usan UUID como clave primaria
- Las fechas se almacenan en UTC
- Los arrays se usan para datos multi-valor (ej: fechas de reserva, imágenes)
- Las relaciones ON DELETE CASCADE están configuradas para mantener integridad
- Se incluyen campos de auditoría (`created_at`, `updated_at`)
