# Revisión remota de Supabase

Fecha: 6 de octubre de 2026. Proyecto: **NookAPP**, `igtoypxgsegeiikjlnau`, región `us-west-1`, PostgreSQL 17. La URL coincide con la configuración de la app. El nombre del proyecto en el panel todavía conserva Nook; no se cambió su identificador ni su URL.

## Acceso y alcance

La sesión de Supabase CLI ya estaba disponible en el equipo. Se vinculó el repositorio al proyecto correcto y se reemplazó una referencia local antigua a otro proyecto inactivo. Los comandos remotos usaron siempre el identificador explícito. No se modificaron GitHub, autoría de Git ni Vercel.

Se consultaron metadatos de tablas, columnas, restricciones, índices, funciones, triggers, políticas RLS, permisos, publicaciones Realtime y buckets. Para consistencia sólo se consultaron recuentos agregados, sin extraer correos, teléfonos, contenido de mensajes ni registros individuales de Auth. También se descargó la versión publicada de la función de invitaciones para comparar el código antes de reemplazarla.

Los archivos de evidencia están en `supabase/schema/private/`, excluido de Git; el estado de la CLI en `supabase/.temp/` también está excluido. `before.json` conserva las definiciones anteriores y `edge-before/` la función publicada anterior. **Esto es una copia de metadatos y código, no un respaldo completo de datos ni una prueba de restauración.**

## Resultado aplicado

- Se encontraron 24 tablas de aplicación y tres vistas en `public`; todas las tablas tienen RLS habilitado. Las vistas tienen `security_invoker=true`. No faltan tablas principales respecto al esquema inicial del repositorio. RLS habilitado por sí solo no garantiza políticas correctas.
- La migración `202610060001_delegate_integrity.sql` se ejecutó primero dentro de una transacción que terminó en `ROLLBACK`, para comprobar compatibilidad con la estructura real. Después se aplicó con `supabase db push` y quedó registrada en el historial remoto.
- Se corrigió el retorno anterior `uuid` de `claim_delegate_invitation(uuid)`: ahora devuelve `void`, con ejecución para usuarios autenticados y denegada a anónimos. Se comprobó la presencia y los permisos de las seis RPC de administración de delegados, invitaciones y transición de reservas.
- Quedaron restringidos los campos de identidad, los roles privilegiados y la asignación de permisos mediante metadatos de registro. Las escrituras de lugares, servicios, espacios e imágenes verifican las asignaciones del delegado activo.
- El proyecto tenía una política adicional `places_select_manager` que usaba `is_current_user_assigned_to_place`. Ese helper ahora comprueba también rol y estado de cuenta, igual que el resto de las políticas; no permite usar una asignación antigua desde una cuenta bloqueada o suspendida.
- `deliver_pending_place_contacts(uuid,uuid)` era una función `SECURITY DEFINER` ejecutable por clientes, que permitía elegir el destinatario de contactos pendientes. Se revocó su ejecución a `PUBLIC`, `anon` y `authenticated`; el trigger interno de asignaciones conserva su llamada con privilegios del servidor.
- Se publicó `send-delegate-invitation`, versión **10**, con control de administrador activo/verificado y textos predeterminados de Pinwi. `OPTIONS` respondió 200 y un `POST` sin sesión respondió 401 (`missing_authorization`). No se enviaron invitaciones reales. Las plantillas o nombres de remitente definidos en Brevo/variables pueden prevalecer sobre los textos predeterminados; revisar esa configuración por separado.

Los recuentos anteriores y posteriores coincidieron: 15 cuentas de aplicación, 113 lugares, un registro de delegado, dos asignaciones, 11 invitaciones, 25 mensajes y cero reservas. La migración no cambió los roles ni estados de las cuentas. El `db push --dry-run` final informó que no quedan migraciones locales pendientes.

Verificación local: **15 pruebas aprobadas**, incluyendo RLS real en PostgreSQL aislado, el retorno antiguo de la RPC, helpers heredados, restricciones de funciones internas y actualización de sesión tras aceptar una invitación. La prueba remota no sustituye el recorrido autenticado completo en el navegador.

## Corrección de los cuatro pendientes solicitados

Se aplicó también `202610060002_private_profiles_messages.sql`, tras validar su ejecución en una transacción con `ROLLBACK`. El historial remoto contiene `202610060001`, `202610060002` y `202610060003`. La tercera conserva la lectura de mensajes hist?ricos o entregados por el servidor que superan el nuevo l?mite de entrada del cliente. Los recuentos siguen en 15 cuentas, 113 lugares, 25 mensajes, cero reservas y dos asignaciones. Hay ahora **dos registros de delegado**, porque se creó el registro histórico que faltaba, en estado `pending`, sin suscripción ni lugares. No quedan roles de delegado sin registro ni registros con un rol incompatible. El administrador debe confirmar su autorización y rol anterior antes de activarlo o retirarlo.

- Las únicas políticas de SELECT de `users` y `user_profiles` permiten propietario o administrador activo. Se retiraron las lecturas generales de estudiantes y contrapartes. Chats, directorio y reservas usan `get_shared_profiles`, que devuelve una proyección limitada y verifica la relación con el solicitante; no devuelve correo, teléfono, ubicación, empresa ni flags de cuenta.
- El directorio académico es voluntario y está desactivado por defecto para todas las cuentas existentes. Se activa o revoca desde Editar perfil mediante un control independiente, sin exigir completar otros campos. Comparte nombre, foto, carrera, institución, materias y bio con cuentas activas; los chats/reservas conservan sólo la identidad necesaria cuando no hay visibilidad académica. La consulta tiene un límite de 200 perfiles; un directorio mayor necesitará paginación.
- Los mensajes no admiten cambios de contenido, autor, destinatario, adjuntos o fecha desde el cliente. Sólo el receptor marca lectura; cada participante puede cambiar únicamente su propia marca de ocultamiento. Los tiempos de lectura los fija el servidor. La interfaz actual sigue sin ofrecer un botón de ocultamiento; la restricción protege ese campo para operaciones futuras. Los mensajes nuevos tienen un límite de 4000 caracteres y sólo pueden iniciar un contacto autorizado o continuar una conversación existente. No se permite usar un envío a un UUID arbitrario para abrir un perfil privado.
- Las notificaciones están en `supabase_realtime`. Su contenido no puede falsificarse desde el navegador; cada destinatario sólo puede marcar lectura u ocultarlas. Las llamadas anónimas se comprobaron contra la API real: sin filas de cuentas/perfiles y acceso denegado a mensajes, notificaciones y la RPC compartida.
- Los cambios futuros de rol y registro de delegado se comprueban al terminar la transacción. Guardar y retirar mediante las RPC siguen funcionando; una escritura que deje otra cuenta incompleta falla y se revierte.

**Verificación actual:** 29 pruebas aprobadas; TypeScript y build aprobados. La suite original de delegados también se ejecutó con las tres migraciones. Chrome comprobó escritorio (1440×900) y móvil (390×844), con HTTP de Supabase interceptado: visibilidad y revocación, conservación de nombre sin guardar, listado académico, chat, actualización de lectura y ausencia de lecturas privadas de otras cuentas. Sin errores de ejecución del navegador. Esto valida la interfaz y las peticiones; no prueba entrega real por WebSocket entre dos sesiones autenticadas, correos ni pagos. La publicación de notificaciones y sus permisos sí se comprobaron en la base real.

Los esquemas y la consulta de inspección están en `supabase/schema/`. Los inventarios, copias reales y resultados están en `supabase/schema/private/`, ignorado por Git. Se conservan versionados el esquema base y las migraciones para ejecutar las pruebas y reproducir los cambios; no contienen resultados reales ni credenciales.

La carpeta privada está excluida también por `.vercelignore` para subidas con la CLI. Vite bloquea su lectura por HTTP; una petición de prueba al inventario real devolvió 403, sin servir su contenido. La comprobación posterior de escritorio/móvil siguió pasando con ese bloqueo.

## Hallazgos iniciales y estado actual

| Prioridad | Evidencia real | Paso siguiente |
| --- | --- | --- |
| Inmediata | La base ya usa los nuevos controles y el frontend local usa las nuevas RPC. | Publicar el frontend actualizado y probar registro, edición de perfil e invitaciones. El navegador anterior puede seguir intentando upserts o escrituras directas ahora denegadas. |
| Corregido | Las políticas anteriores exponían cuentas y perfiles completos de estudiantes y contrapartes. | Políticas privadas y RPC limitada aplicadas; frontend adaptado. Falta publicar ese frontend. |
| Corregido; revisión administrativa pendiente | Existía una cuenta con rol delegado sin registro. | Registro creado pendiente, sin asignaciones; restricciones transaccionales impiden nuevas inconsistencias. Confirmar autorización antes de activar. |
| Corregido | Los participantes podían alterar filas completas de mensajes. | Políticas duplicadas retiradas y trigger de integridad aplicado. Lectura y marcas propias acotadas. |
| Configuración corregida; prueba entre sesiones pendiente | Faltaba `notifications` en Realtime. | Publicación y permisos comprobados en remoto. Probar entrega real entre dos cuentas después del deploy. |
| P1 | No hay políticas en `realtime.messages`; el código usa presencia y broadcast sin declarar canales privados. | Diseñar canales privados y autorización por participante, y revisar la configuración de Realtime. La ausencia de políticas por sí sola no acredita el acceso efectivo de un tercero; falta una prueba de suscripción. Corresponde a A07. |
| P1 | `profile-images` y `place-images` son públicos. Aceptan JPEG/PNG/WebP/GIF, con límites de 5 MiB y 10 MiB respectivamente. Las escrituras de fotos de perfil se limitan a la carpeta del usuario. | Decidir audiencia de fotos, implementar limpieza de reemplazos/huérfanos y acceso privado cuando corresponda. Corresponde a A08. |
| P1 | El historial de migraciones no existía antes de esta aplicación; la base incluye objetos adicionales no reproducidos por el esquema inicial, como contactos pendientes y helpers. | Construir y validar una base inicial no destructiva para entornos vacíos, incorporando funciones, políticas, Storage y Realtime reales. No ejecutar el esquema destructivo actual sobre esta base. |

Siguen abiertos la validación de precios/pagos y creación de reservas en el servidor, la minimización de datos, retención y derechos, y la identificación legal del responsable. Esta revisión no declara cumplimiento de la Ley 21.719. El detalle general permanece en [PRIVACY_AUDIT.md](../PRIVACY_AUDIT.md).

No se revisaron contratos, datos de facturación de proveedores, configuración completa de Auth/SMTP/URLs de retorno, estado de despliegue del frontend ni el recorrido de entrega de correo. Los permisos administrativos existentes requieren confirmar su autorización original: la migración conserva cuentas históricas y no puede determinar quién obtuvo legítimamente su rol.

Comandos para las próximas revisiones y migraciones: [DELEGATES.md](DELEGATES.md).
