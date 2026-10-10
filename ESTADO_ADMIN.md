# Estado del panel de administración

Revisión local: 10 de octubre de 2026. Este documento distingue la base implementada del trabajo pendiente. No acredita el estado del alojamiento ni de Supabase desplegado.

## Base actual

| Sección | Estado |
| --- | --- |
| Inicio | Resumen de lugares y reportes, enlaces al catálogo y a gestión. |
| Lugares | Consulta, búsqueda, filtros, creación, edición y retirada del catálogo conectadas a Supabase. El borrado conserva historial. |
| Delegados | Listado, asignaciones, cambios de estado/suscripción, edición e invitaciones mediante los servicios y RPC existentes. |
| Usuarios | Listado, filtros y cambios de estado; el servidor debe confirmar la fila modificada. |
| Reportes | Consulta, filtros, contacto del delegado y cambios de estado existentes. |
| Estadísticas | Lectura de datos existentes y gráficos; no es un reporte de pagos. |
| Soporte y reservas en gestión | Demostración local. Sus acciones no envían mensajes, notificaciones ni cambios al backend. |

Las vistas reales mantienen caché en memoria por cinco minutos y actualizan datos vencidos en segundo plano. Guardar cambios invalida las cachés relacionadas. Cambiar de cuenta limpia datos y reinicia los formularios del panel.

## Fallos corregidos en esta revisión

- Un cambio de estado de usuario podía parecer exitoso sin afectar una fila; ahora se exige el retorno confirmado del servidor.
- Usuarios y delegados cambiaban de estado antes de confirmar la operación. El rollback de una lista completa podía sobrescribir otra operación. Ahora la interfaz espera confirmación y bloquea acciones simultáneas.
- Una consulta secundaria fallida podía convertirse en contadores ficticios de cero; ahora la carga informa el error y ofrece reintentar.
- Gestión no tenía reintento visible ante fallos de carga. Las actualizaciones conservan los datos disponibles sin cubrir el listado con un estado de carga.
- Respuestas pendientes y estado local podían sobrevivir a un cambio de cuenta; se limpian las colecciones y se reinician las vistas al cambiar de identidad.
- El formulario nuevo de invitaciones mostraba estado/suscripción que no se enviaban. Esas opciones aparecen sólo al editar un delegado. El diálogo admite teclado, bloquea campos durante el guardado y confirma la copia del enlace.
- El gráfico de 90 días sólo agrupaba 42 días y dejaba huecos entre semanas. Ahora agrupa todo el período sin contar un evento dos veces ni incluir fechas futuras.
- Una ficha de lugar podía usar caché vencida indefinidamente o recuperar datos después de invalidarlos. Ahora comprueba vigencia y excluye lugares inactivos.
- Las demos de reservas afirmaban enviar notificaciones reales. Los mensajes actuales indican el alcance de la simulación. Soporte sincroniza el estado de la conversación al responder y permite abrir/cerrar consultas con teclado.
- Las búsquedas de gestión toleran espacios y diferencias de tildes. Las búsquedas sin resultados tienen un mensaje visible.

## Trabajo pendiente para una etapa posterior

1. Probar el recorrido autenticado con cuentas de prueba en un entorno de Supabase, incluida la entrega y aceptación de invitaciones. Las comprobaciones locales usan HTTP simulado y PostgreSQL aislado.
2. Conectar soporte y reservas de gestión a servicios reales, con transiciones autorizadas y notificaciones verificables.
3. Hacer atómica la edición completa de lugares. Actualmente actualiza la ficha, comodidades y espacios en varias escrituras; informa si una falla deja cambios parciales.
4. Definir qué indicadores comerciales se necesitan antes de agregar nuevas estadísticas. Los montos de reservas no acreditan cobros.
5. Revisar paginación del servidor y carga por rutas cuando crezca el volumen. La compilación conserva la advertencia de tamaño de bundle.

## Verificación

- `npm run typecheck` y `npm run build`.
- `npm test`: permisos SQL/RLS, privacidad, sesión, caché, CRUD, confirmación de cambios de estado y cobertura temporal de gráficos.
- Navegador local: vistas principales, cinco secciones de gestión, búsqueda, estados de error y diálogos en escritorio y móvil, con datos simulados.
