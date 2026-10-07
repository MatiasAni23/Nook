# Delegados: permisos, consistencia y activación

Cambios aplicados el 6 de octubre de 2026 al proyecto `NookAPP` (`igtoypxgsegeiikjlnau`). La CLI registró la migración `202610060001` y la función `send-delegate-invitation` quedó activa en la versión 10. La comprobación posterior conservó los recuentos de registros y los roles/estados de las cuentas. Detalle y pendientes: [REMOTE_REVIEW.md](REMOTE_REVIEW.md).

También está aplicada `202610060002`: cuentas/perfiles privados, perfiles académicos voluntarios, integridad de mensajes, notificaciones en Realtime y restricciones para impedir delegados incompletos. La cuenta histórica sin registro quedó pendiente, sin lugares ni suscripción. El frontend actualizado necesita publicarse para usar la nueva RPC de perfiles compartidos.

`202610060003` también está aplicada: mantiene las confirmaciones de lectura de mensajes históricos o entregados por servidor que exceden el nuevo límite de entrada del cliente. No modifica su contenido.

## Aplicar a un proyecto existente

1. Obtener un respaldo y revisar en staging la estructura existente contra el esquema del repositorio.
2. Revisar las cuentas con rol `admin`, `support` o `delegate`: el esquema anterior aceptaba roles de metadatos modificables por el cliente. La migración conserva las cuentas existentes; no puede decidir cuáles fueron autorizadas legítimamente.
3. Aplicar **solamente** las migraciones incrementales pendientes con la CLI, como se explica abajo. Alternativamente, ejecutar los archivos de `migrations/` en orden, completos, desde el SQL Editor con acceso administrativo. No ejecutar `schema/pinwi_schema_supabase.sql` sobre datos existentes. En `NookAPP` ya están registradas `202610060001`, `202610060002` y `202610060003`; no es necesario copiarlas otra vez. Las migraciones posteriores se registran una sola vez; no editar archivos ya aplicados.
4. Revisar los delegados anteriores: `previous_role` usa `worker` como respaldo porque el sistema anterior no conservaba ese dato. Corregirlo administrativamente a `student` cuando corresponda antes de quitarles el rol.
5. Redesplegar la función `send-delegate-invitation` para exigir también estado activo/verificado al administrador que envía invitaciones. Ya se publicó en `NookAPP`; la comprobación sin sesión devolvió HTTP 401 y no se enviaron correos de prueba.
6. Publicar el frontend actualizado después de la migración; usa nuevas RPC para administrar delegados y cambiar reservas. Recargar las sesiones abiertas y comprobar los escenarios siguientes con cuentas de prueba.

Para instalaciones vacías: ejecutar el esquema inicial y todas las migraciones en orden antes de permitir acceso. La primera cuenta administradora debe autorizarse por un operador desde el servidor/SQL Editor, nunca por metadatos de registro.

## Trabajo por consola

Se usó Supabase CLI 2.120.0 mediante npm; no requiere instalación global. El repositorio quedó vinculado al proyecto que coincide con `VITE_SUPABASE_URL`. Se reemplazó una referencia local antigua a otro proyecto inactivo. Los comandos conservan el identificador explícito para evitar confundir proyectos.

En PowerShell:

```powershell
# Sólo si no hay sesión: abre el flujo de autenticación; no pegar tokens en el repo.
npm.cmd exec --yes --package=supabase@2.120.0 -- supabase login

# Vincular o volver a vincular el repositorio.
npm.cmd exec --yes --package=supabase@2.120.0 -- supabase link --project-ref igtoypxgsegeiikjlnau

# Consultar sólo la estructura. El resultado puede contener definiciones internas;
# guardarlo en supabase/schema/private/, que está excluido de Git.
npm.cmd exec --yes --package=supabase@2.120.0 -- supabase db query --linked --project-ref igtoypxgsegeiikjlnau --file supabase/schema/inspect_schema.sql --output json

# Revisar primero la lista de migraciones y después aplicar las pendientes.
# El dry-run de push sólo muestra la lista; no valida la ejecución del SQL.
npm.cmd exec --yes --package=supabase@2.120.0 -- supabase db push --linked --project-ref igtoypxgsegeiikjlnau --skip-vault --dry-run
npm.cmd exec --yes --package=supabase@2.120.0 -- supabase db push --linked --project-ref igtoypxgsegeiikjlnau --skip-vault

# Publicar sólo la función revisada, sin Docker.
npm.cmd exec --yes --package=supabase@2.120.0 -- supabase functions deploy send-delegate-invitation --project-ref igtoypxgsegeiikjlnau --use-api
```

No editar una migración después de aplicarla: crear otro archivo con una versión posterior. El historial remoto empieza con `202610060001`; las tablas anteriores ya existían y no tienen una migración inicial registrada. El esquema inicial destructivo del repositorio no debe trasladarse a la carpeta de migraciones para intentar corregir ese historial. Preparar una base inicial reproducible para entornos nuevos es trabajo pendiente.

Consulta de diagnóstico de sólo lectura, para el SQL Editor:

```sql
SELECT u.id, u.role, u.status AS account_status,
       d.id AS delegate_id, d.status AS delegate_status,
       d.previous_role, d.subscription_active,
       count(dp.place_id) AS assigned_places
FROM public.users u
LEFT JOIN public.delegates d ON d.user_id = u.id
LEFT JOIN public.delegate_places dp ON dp.delegate_id = d.id
WHERE u.role IN ('admin', 'support', 'delegate') OR d.id IS NOT NULL
GROUP BY u.id, d.id;
```

## Reglas implementadas

- Registro: sólo estudiante o trabajador; Auth crea el perfil. El navegador no puede crear filas de identidad ni cambiar correo, verificaciones, estado o roles privilegiados. El perfil puede alternar entre estudiante y trabajador.
- Administrador activo: acceso global a lugares y administración transaccional de delegados. Las RPC validan su rol y estado en la base, sin confiar en React.
- Delegado activo: requiere `users.role = delegate`, cuenta activa/verificada y fila `delegates.status = active`. Edita sólo lugares asignados y sus servicios, espacios e imágenes. Los lugares que crea se asignan automáticamente; comienzan sin verificación y con plan básico.
- Plan, verificación, promoción y estadísticas: administrados por el servidor/administrador; no se pueden falsificar desde la cuenta de delegado. Los planes premium y el cobro requieren todavía su integración comercial.
- Invitaciones: requieren sesión con correo coincidente y confirmado por Auth, token pendiente y vigente y lugares existentes. Rechazan cuentas bloqueadas/suspendidas y roles incompatibles. Reintentar una aceptación propia es seguro; una invitación adicional conserva las asignaciones anteriores. Editar asignaciones desde administración sí reemplaza la lista, de forma atómica.
- Guardar, suspender, activar y quitar delegados sincroniza cuenta, delegado y asignaciones en una sola transacción. Un error no deja la operación a medias. Quitar el delegado conserva la cuenta y restaura su rol anterior; no levanta bloqueos o suspensiones.
- Reservas: sólo administrador o delegado asignado puede confirmar/rechazar. Las transiciones son `pending → confirmed/rejected/cancelled` y `confirmed → completed/cancelled`. El propietario puede cancelar una reserva propia pendiente. Un cambio de estado no puede alterar precio, pago, persona o fechas. La interfaz espera confirmación del servidor y recarga ante conflictos.
- Datos de lugares, reservas y suscripción de delegados se consultan sin cachés compartidas que puedan mezclar sesiones o conservar asignaciones retiradas.

## Verificación local

```bash
npm ci
npm run typecheck
npm test
npm run build
npm audit
```

`tests/delegate-permissions.test.mjs` ejecuta PostgreSQL en memoria con PGlite y el esquema y la migración reales. Define sustitutos locales para Auth y Storage, aplica las políticas RLS como rol `authenticated` y prueba los controles con identidades distintas. No necesita `.env`, red ni cuentas reales; no prueba los servicios alojados de Auth/Storage/Brevo ni la entrega de correos. PGlite ya aporta `gen_random_uuid`, por eso el fixture omite únicamente la declaración de la extensión `pgcrypto`.

`tests/delegate-session.test.mjs` carga los servicios reales con Vite e intercepta todas las peticiones de Supabase. Comprueba que aceptar una invitación invalida el perfil estudiante almacenado antes de la promoción y devuelve el nuevo rol delegado. `tests/private-data.test.mjs` prueba privacidad, mensajes, notificaciones, integridad de delegados y nombres de reservas sin acceso a cuentas privadas. `tests/shared-profiles.test.mjs` comprueba la RPC compartida sin caché de visibilidad y las respuestas de chat pendientes después de cerrar sesión. La suite completa contiene 29 pruebas aprobadas; las pruebas originales de delegados se ejecutan con las tres migraciones.

Si el SQL Editor mostró `42P13: cannot change return type of existing function`, copiar nuevamente **todo el archivo actualizado** de la migración y ejecutarlo completo. Ahora reemplaza esa función dentro de la misma transacción y restaura sus permisos. No ejecutar un `DROP FUNCTION` aislado ni agregar `CASCADE`: si aparecen dependencias inesperadas, revisar el error antes de modificar otros objetos.

Comprobar en staging: alta de cuenta y verificación de correo; invitación válida/vencida/revocada; acceso como dos delegados con lugares distintos; creación y edición de espacios con tarifas por día/semana/mes; suspensión con sesión abierta; cambio concurrente de una reserva; retirada del rol sin pérdida de cuenta. Confirmar recepción del correo y enlaces con la configuración real de Auth y Brevo.

## Trabajo que sigue pendiente

Esta migración cubre A01, A02 y la actualización de estados de reservas de A04. Su aplicación remota y sus permisos finales se comprobaron el 6 de octubre de 2026; no cierra el resto de [la auditoría](../PRIVACY_AUDIT.md). Falta comprobar el flujo completo con cuentas de prueba, el frontend publicado y los servicios reales de Auth, Storage y Brevo.

La lectura privada de cuentas/perfiles y la integridad de mensajes están corregidas mediante `202610060002`; respecto de A03 siguen pendientes los datos identificables de reportes comunitarios. También quedan retención y derechos de privacidad, canales privados de presencia/escritura, ciclo de privacidad de fotos, preferencias de notificaciones persistidas y checkout real. Crear/editar el contenido completo de un lugar todavía usa varias solicitudes para lugar, servicios, espacios y archivos: conviene convertirlo en una operación transaccional con compensación de subidas fallidas. La creación de reservas/importes y la facturación necesitan validación del servidor antes de habilitar pagos. El build continúa advirtiendo un bundle grande; corresponde dividir rutas y optimizar imágenes.
