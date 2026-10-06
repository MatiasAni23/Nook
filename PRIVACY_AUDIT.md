# Auditoría de Pinwi: privacidad, seguridad y preparación para diciembre

Fecha: 6 de octubre de 2026. Alcance: revisión estática del repositorio, esquema SQL y funciones Edge, auditoría de dependencias y comprobación local de los documentos legales. No se accedió a cuentas reales, datos de usuarios, contratos de proveedores ni configuración del Supabase o alojamiento desplegados. No se ejecutaron pruebas de ataque ni migraciones sobre una base real.

## Resultado y referencia normativa

**Pinwi todavía no está preparado para declarar cumplimiento ni abrir el servicio a datos personales de producción con las garantías necesarias.** Hay problemas verificables en el código y el SQL local; su presencia en producción debe comprobarse. Los términos anteriores eran un borrador genérico y no constituían evidencia de consentimiento ni de procedimientos operativos.

La Ley 21.719 reforma la Ley 19.628 y entra en vigor el **1 de diciembre de 2026**. Hasta entonces siguen aplicándose las obligaciones vigentes. La revisión usa el texto normativo, no sólo el resumen de la página, que simplifica algunas reglas de menores. Fuente: [Ley 21.719, BCN](https://www.bcn.cl/leychile/navegar?idNorma=1209272).

Prioridades: **P0** bloquea el uso de datos reales; **P1** debe resolverse antes de publicación y de diciembre; **P2** mejora operativa. Una prioridad técnica no equivale a una declaración de infracción o sanción administrativa.

## Hallazgos y acciones

### A01 · P0 · Elevación de privilegios mediante el propio perfil

Evidencia: `supabase/pinwi_schema_supabase.sql:973` concede INSERT y UPDATE de toda la tabla `users`; las políticas `users_insert_own` y `users_update_own` sólo comprueban el ID. `is_current_user_admin()` confía en `users.role`. El trigger `handle_new_auth_user`, línea 1734, y la sincronización final, línea 1792, toman el rol de metadatos modificables por el cliente. `authService.ts` también envía y actualiza el rol desde el navegador.

Consecuencia: con este esquema un usuario autenticado puede intentar asignarse `admin`, alterar estado o verificación y acceder a funciones privilegiadas. Ocultar botones en React no lo evita.

Acción: trasladar roles y campos de autorización a control del servidor; permitir sólo student/worker por un procedimiento acotado de perfil; impedir INSERT/UPDATE directo de campos protegidos y no aceptar roles privilegiados de metadatos de registro. Adaptar los upserts actuales para no romper registro e invitaciones. **No basta restringir el tipo de TypeScript.** Verificar contra una base aislada con dos usuarios y llamadas directas: autoasignarse admin/delegate debe fallar; registro, edición propia y aceptación de invitación válida deben seguir funcionando. Responsable: backend/seguridad.

### A02 · P0 · Delegados pueden modificar lugares no asignados

Evidencia: `is_current_user_place_manager()` comprueba sólo el rol admin/delegate. Las políticas INSERT/UPDATE/DELETE de `places` y políticas de amenities usan ese resultado sin exigir asignación al lugar. Otras tablas ya usan `is_current_user_delegate_for_place`, pero esa restricción no cubre todo el catálogo.

Acción: administrador global y delegado únicamente sobre sus asignaciones; creación y borrado con reglas específicas. Prueba: delegado A no puede alterar lugar de delegado B mediante API, aunque conozca su ID. Responsable: backend.

### A03 · P0 · Exposición de campos privados al dar lectura de una fila

Evidencia: `users_select_chat_participants`, línea 988, permite leer una fila completa de `users` a quien intercambia mensajes; la tabla incluye correo, teléfono y flags de cuenta. `users_select_reservation_participants_for_managed_places` presenta el mismo problema de selección de campos. El frontend suele pedir nombre y avatar, pero el GRANT permite pedir otros campos directamente. `place_reports_select_own_public_or_manager`, línea 1161, y las confirmaciones comunitarias exponen filas con identificadores y contenido, no una representación pública mínima.

Acción: separar perfil público del registro privado y exponer sólo nombre/alias, avatar y campos que la persona elija compartir. Separar descripción comunitaria de reportes del autor, notas privadas y moderación. Un chat no debe desbloquear correo/teléfono de su contraparte. Prueba: las consultas directas de un usuario a esos campos de otro deben fallar; los listados públicos deben seguir operativos. Responsable: backend/producto.

### A04 · P1 · Integridad de mensajes y reservas insuficientemente acotada

Evidencia: `messages_update_receiver_or_sender`, línea 1252, permite a ambos participantes actualizar toda la fila; un receptor puede alterar contenido recibido o participantes mientras siga cumpliendo la condición. `reservations_update_own_pending`, línea 1133, no restringe transición de estado, importes o campos de pago del nuevo registro.

Acción: operaciones separadas para marcar lectura, ocultar para un participante, editar mensajes propios y cancelar reservas; contenido y participantes inmutables para el receptor. Confirmaciones/importes/pagos decididos por servidor. Probar conservación de autoría, historial y transiciones. Responsable: backend.

### A05 · P1 · Rechazo de ubicación no respetado por el fallback

Evidencia: `src/app/features/mapa/MapView.tsx:178` invoca Google Geolocation antes de evaluar PERMISSION_DENIED; además `watchPosition` se inicia al montar la vista y el fallback usa `considerIp: true`. No se identificó historial de coordenadas persistido en Supabase, pero sí coordenadas y cámara en memoria.

Acción: no obtener ubicación automáticamente; explicarla junto al botón y solicitarla por elección. Ante rechazo, detenerse y ofrecer búsqueda manual. Si se conserva localización por IP, solicitarla separadamente y explicar Google, finalidad y duración. Probar con permiso concedido, rechazado, timeout y navegador sin geolocalización. Referencia: [artículo 16 sexies](https://www.bcn.cl/leychile/navegar?idNorma=141599&idParte=10528074&idVersion=2026-12-01).

### A06 · P1 · Métricas identificables sin fundamento ni preferencia documentados

Evidencia: `placeAnalyticsService.ts:16` escribe `user_id`, lugar, tipo y fecha en `place_analytics_events`; mapa y detalles disparan eventos al mostrarse. Los paneles muestran agregados, pero la fuente sigue siendo identificable. No hay registro de una base legal, opción de exclusión o purga.

Acción: preferir conteos anónimos con evaluación de reidentificación; si se mantiene identificación, justificar necesidad y base, límites y duración. Consentimiento previo revocable si ésa es la base elegida; interés legítimo requiere evaluación y atención de oposición, no una etiqueta en el documento. Referencias: [artículo 12](https://www.bcn.cl/leychile/navegar?idNorma=141599&idParte=10528055&idVersion=2026-12-01) y [artículo 13](https://www.bcn.cl/leychile/navegar?idNorma=141599&idParte=10528056&idVersion=2026-12-01).

### A07 · P1 · Presencia y escritura sin privacidad de canales declarada

Evidencia: `CurrentUserContext.tsx:111` crea `online-users` con UUID y hora de conexión. `chatService.ts:310` usa nombres deterministas y broadcast; ninguno declara `private: true`. No hay políticas de autorización de Realtime en el repositorio revisado. La configuración efectiva del proveedor no se inspeccionó.

Acción: canales privados autorizados sólo a participantes, evitar directorio global de conexión y permitir desactivar estado visible si no es necesario. Revisar RLS de `realtime.messages` y configuración real. Probar que una tercera cuenta y un visitante anónimo no pueden suscribirse, observar o suplantar señales de otra conversación. Responsable: backend/frontend.

### A08 · P1 · Fotografías y archivos sin ciclo de privacidad completo

Evidencia: `currentUserService.ts:272` sube fotos a `profile-images`, usa carpeta con UUID y obtiene URL pública. No se encontró definición de ese bucket ni sus políticas en el esquema local; sí existe `place-images` público. Cada foto usa timestamp y no elimina la anterior.

Acción: comprobar buckets reales, elegir audiencia y usar acceso autorizado/URLs firmadas donde corresponda; limitar tipos y tamaños, retirar metadatos de ubicación de imágenes, borrar reemplazos y archivos huérfanos. No asumir que toda foto actual es accesible: `getPublicUrl` genera el enlace, la accesibilidad depende del bucket real. Responsable: backend.

### A09 · P1 · Derechos, eliminación y conservación incompletos

Evidencia: existe edición de algunos campos del perfil y limpieza local al salir, pero no un flujo completo de acceso, portabilidad, supresión de cuenta o bloqueo del tratamiento. No se encontraron períodos de retención, jobs de purga ni coordinación con almacenamiento/proveedores. Los flags de borrado lógico y ON DELETE CASCADE no equivalen a un procedimiento de supresión.

Acción: canal operativo, acuse, verificación proporcionada de identidad, expediente, responsable y respuesta; exportación segura y eliminación que incluya Auth, tablas, fotos, proveedores y tratamiento de respaldos. El bloqueo debe detener tratamientos, no limitarse a impedir el login. Aprobar plazos por categoría y excepciones justificadas. El artículo 11 reformado contempla 30 días corridos y una prórroga de hasta 30; bloqueo fundado en dos días hábiles, con suspensión mientras se resuelve. Conservar evidencia de respuestas y comunicar cambios a destinatarios cuando corresponda. Fuente: [procedimiento en Ley 21.719](https://www.bcn.cl/leychile/navegar?i=1209272).

### A10 · P1 · Identificación, aceptación y transparencia pendientes

Confirmación del proyecto: responsable legal, RUT, domicilio y contacto de privacidad aún no definidos; sólo existe dominio. `RegisterInput` no contiene versión de términos, acción afirmativa ni evidencia de consentimientos; mostrar enlaces no acredita consentimiento. Se corrigió el texto del pie que decía que continuar implicaba aceptar privacidad.

Acción: completar identidad y contacto verificable; implementar aceptación expresa de términos con evidencia del servidor y mantener separados los consentimientos opcionales. La política de privacidad es información, no una autorización universal. Publicar fechas/versiones y registro histórico. Referencia: [información exigida por el artículo 14 ter](https://www.bcn.cl/leychile/navegar?idNorma=141599&idParte=10528059&idVersion=2026-12-01).

### A11 · P1 · Proveedores, transferencias y respuesta a incidentes sin evidencia

Evidencia: Supabase, Google Maps/Geolocation y Brevo están integrados; región de alojamiento, subencargados, contratos, retención de logs y garantías internacionales no se acreditan en el repositorio. `vercel.json` contiene sólo rewrites, no prueba por sí mismo quién aloja actualmente la app. No se encontró procedimiento de incidentes o prueba de restauración.

Acción: inventario de proveedores efectivos, contratos e instrucciones de encargo, destinos y garantías, acceso del personal, respaldos y prueba de recuperación; definir responsable de incidentes, clasificación, contención y comunicaciones. La ley exige reportar a la Agencia sin dilaciones indebidas cuando haya riesgo razonable, y avisar además a titulares en los supuestos específicos del artículo 14 sexies; **no se debe copiar un plazo universal de 72 horas del RGPD**. Las transferencias habituales necesitan un mecanismo válido; el consentimiento genérico no basta. Referencias: [Ley 21.719, arts. 14 bis–sexies y 15 bis](https://www.bcn.cl/leychile/navegar?i=1209272), [artículo 27](https://www.bcn.cl/leychile/navegar?idNorma=141599&idParte=8642708&idVersion=2026-12-01).

### A12 · P1 · Minimización y protección de menores sin resolver

Evidencia: registro exige teléfono; onboarding exige institución/carrera/ciudad o empresa/cargo/rubro para avanzar. No hay control de edad ni representación; la función de encontrar estudiantes puede afectar a menores. Biografías, mensajes y reportes admiten texto libre.

Acción: justificar cada campo obligatorio y hacer opcional lo innecesario; decidir público adulto o inclusión de menores con controles efectivos. La reforma distingue menores de 14, adolescentes y datos sensibles de adolescentes menores de 16; **no establece una regla universal de consentimiento parental para toda persona menor de 16**. Proteger exposición, contacto y ubicación por defecto. Evaluar riesgos y determinar si procede evaluación de impacto según volumen, tratamiento y uso; no se presume obligatoria para cualquier app. Fuente: [Ley 21.719, arts. 16 quáter y 15 ter](https://www.bcn.cl/leychile/navegar?i=1209272).

### A13 · P1 · Enumeración de cuentas y registros con datos personales

Evidencia: RPC `email_account_exists` permite a anon consultar si un correo tiene cuenta. La invitación Edge registra el payload completo en error (`send-delegate-invitation/index.ts:138`) y correos en una discrepancia, línea 163; el payload puede contener teléfono y enlace con token.

Acción: respuestas genéricas para autenticación/recuperación, controles de abuso y límites comprobados, eliminar datos y tokens de logs y acotar acceso/retención. La función de invitación sí verifica sesión y rol en el servidor; `verify_jwt = false` no significa por sí solo ausencia de autenticación. Recuperación verifica OTP antes de usar service role, pero su contraseña acepta puntuación >=3 incluso sin ocho caracteres: reforzar requisito mínimo explícito. Los límites y CAPTCHA efectivos de Supabase siguen pendientes de inspección.

### A14 · P1/P2 · Separación de demo, operación real y calidad técnica

Evidencia: `routes.tsx:121` permite rutas privadas cuando falta configuración Supabase; el modo demo contiene credenciales de administrador. Esto no prueba un bypass del backend configurado, pero puede publicar una demo como si fuera el servicio real. `CheckoutView.tsx:89` confirma mediante alert con lugares mock y no crea ni cobra una reserva. El esquema incluye DROP TABLE CASCADE: no es una migración apta para una base con usuarios reales.

Acción: producción debe fallar cerrada al faltar configuración y habilitar demo sólo con bandera explícita de desarrollo. Identificar simulaciones, completar reserva/pago antes de prometerlos, utilizar migraciones incrementales y probarlas en staging. Añadir verificación TypeScript y pruebas de autorización en CI. Los documentos nuevos explican la limitación del checkout.

La búsqueda de estudiantes consulta perfiles ajenos mientras `user_profiles_select_own` permite sólo el propio; la funcionalidad debe revisarse junto con un perfil público mínimo, sin resolver el problema abriendo toda la tabla. La compilación también advierte un bundle principal de aproximadamente 1,62 MB sin comprimir y una imagen de descubrir de 2,67 MB: dividir por rutas y optimizar esa imagen como mejora P2 para móvil.

## Dependencias: evidencia de npm

`npm audit --omit=dev --json`: **1 paquete alto, react-router 7.13.0**. `npm audit --json`: **8 paquetes: 1 crítico, 6 altos y 1 moderado**. Son paquetes afectados, no ocho ataques confirmados. Las alertas de SSR/RSC de React Router pueden no aplicar a esta SPA; deben verificarse las rutas y condiciones de cada aviso.

| Paquete | Severidad de npm | Alcance a revisar |
| --- | --- | --- |
| react-router | Alta | Dependencia de producción; npm propone 7.18.4. Revisar SPA frente a avisos de servidor y navegación. |
| vite | Alta | Servidor/herramientas de desarrollo, especialmente Windows; no equivale a vulnerabilidad del sitio estático publicado. |
| tar | Crítica | Cadena de herramientas de desarrollo; identificar su dependencia padre y manejo de archivos. |
| browserslist | Alta | Herramientas de compilación. |
| nanoid | Alta | Generadores utilizados por dependencias/herramientas. |
| postcss | Alta | Procesamiento CSS. |
| source-map-js | Alta | Procesamiento de mapas de código. |
| baseline-browser-mapping | Moderada | Herramientas de compatibilidad de navegadores. |

Consultar avisos del registro y mantenedores, actualizar de forma controlada y verificar build/rutas. No se ejecutó `npm audit fix --force` ni se actualizaron dependencias en este trabajo. Los conteos reflejan la consulta de esta fecha y pueden cambiar.

## Lo que ya ayuda

- El esquema Supabase usa Auth para credenciales; `password_hash` pertenece al esquema general antiguo, no a `public.users` del esquema Supabase revisado.
- Hay RLS en tablas, políticas para datos propios y participantes, y vistas con `security_invoker = true`; necesitan corregirse, pero no se parte desde ausencia total de controles.
- Recuperación comprueba OTP en servidor y solicita revocación global de sesión; la invitación valida al llamante antes de enviar correo.
- Logout limpia cachés de perfil, chat, lugares e imágenes. Esto reduce exposición local, aunque no sustituye eliminación en servidor.

## Inventario inicial de tratamientos

| Tratamiento | Datos | Destinatarios / tecnología | Pendiente indispensable |
| --- | --- | --- | --- |
| Registro y sesión | Nombre, correo, teléfono, rol, verificaciones | Supabase Auth y base de datos | Necesidad, aceptación/versiones, acceso protegido |
| Perfil y búsqueda de personas | Foto, institución/asignaturas o empresa/cargo, bio, región/ciudad | Supabase, usuarios según audiencia | Campos opcionales y perfil público mínimo |
| Mapa y cercanía | Coordenadas, IP/conexión, cámara del mapa | Navegador y Google | Elección, rechazo respetado, duración y destino |
| Favoritos y métricas | Cuenta, lugar, evento, fecha | Supabase; estadísticas administrativas | Separar servicio de analítica, fundamento y retención |
| Mensajes y presencia | Participantes, contenido, lectura, conexión, escritura | Supabase Realtime y participantes | Autorización de canales y límites de edición |
| Reservas y reportes | Cuenta, lugar, fechas, estado, contenido | Lugar/delegado, soporte autorizado | Permisos, finalidad y retención; distinguir simulación |
| Invitaciones | Nombre, correo, teléfono, token, vencimiento | Administrador, Supabase, Brevo | Fuente informada, logs mínimos y caducidad/purga |

Esta tabla es un inicio del registro de tratamientos; no sustituye su aprobación por el responsable ni los contratos reales. Para cada fila se deben añadir base, necesidad de campos, período, países, medidas, encargado interno y evidencia.

## Trabajo realizado en esta revisión

- Se reescribieron términos y privacidad en `src/app/features/auth/legalDocuments.ts`, con versión `1.0-borrador` y fecha de revisión, sin una fecha ficticia de vigencia.
- Se eliminaron aceptación por mera navegación y autorización automática de futuros usos, y se distinguieron contrato y consentimientos opcionales.
- Se describieron datos y prácticas reales, incluyendo métricas identificables, ubicación alternativa por IP, fotos públicas posibles y falta de eliminación completa, sin asegurar controles que todavía no existen.
- Se añadieron rutas públicas `/terminos` y `/privacidad`, sin exigir inicio de sesión, y enlace a la ley. El diálogo comparte la misma fuente de contenido y el pie del login sólo invita a consultar los documentos.
- Responsable, RUT, domicilio, contactos, plazos de retención y contratos permanecen pendientes por confirmación del proyecto. **El borrador no debe presentarse como documento legal definitivo.**

Los hallazgos del backend, las dependencias y los procedimientos organizativos se documentaron para ejecución posterior; no se corrigieron ni desplegaron silenciosamente. La versión definitiva debe revisarse jurídicamente contra la operación y los proveedores reales.

## Orden de ejecución propuesto

| Fecha objetivo | Entrega | Cómo comprobarla |
| --- | --- | --- |
| 6–13 octubre | A01–A04: permisos de usuarios, delegados, datos y operaciones | Pruebas directas en staging con anónimo, dos usuarios, dos delegados y administrador; ninguna lectura/edición fuera de alcance |
| 14–23 octubre | A05–A08 y A13: ubicación, métricas, canales, fotos y logs | Rechazo sin fallback, tercero excluido de canal, foto antigua eliminada, logs sin payload/tokens |
| 24 octubre–6 noviembre | A09 y A12: derechos, retención, minimización y decisión de menores | Solicitud completa de acceso/supresión/bloqueo, purga comprobada, onboarding con campos mínimos |
| 7–20 noviembre | A10–A11: identidad, contacto, contratos y preparación de incidentes | Contacto funcionando, proveedores y países documentados, simulacro de incidente y restauración |
| 21–30 noviembre | Revisión jurídica final, actualizar dependencias, QA de producción y publicar versión efectiva | Documentos coinciden con código, pruebas de autorización pasan, TypeScript y build verificados, configuración revisada |

Si la identificación legal tarda varios meses, el dominio por sí solo no permite cerrar A10: ajustar calendario de lanzamiento y recolección de datos reales a la disponibilidad del responsable y los controles. No esperar a diciembre para los problemas P0.

## Verificación y límites

- `npm.cmd run build`: correcto. Persiste advertencia por tamaño del bundle.
- TypeScript: 35 errores preexistentes, igual al conteo previo; no hubo errores en los archivos legales o rutas revisados. La app compila con Vite, pero la comprobación completa de tipos todavía no pasa.
- Navegador local: `/privacidad` y `/terminos` accesibles sin autenticación; versión y aviso de borrador correctos; logo cargado y texto con tildes. Documento móvil a 390 × 844 sin desbordamiento horizontal. Diálogo de privacidad en escritorio 1440 × 900 y móvil: 12 secciones, desplazamiento completo y enlace público correcto; sin errores registrados del navegador.
- Auditoría npm de producción y completa: resultados descritos arriba. No constituyen una prueba de explotación.
- `git diff --check`: correcto. El proyecto no dispone de un script de tests en `package.json`; no se inventó una suite de validación de permisos.

No se certifican RLS desplegadas, cifrado del proveedor, límites de abuso, permisos de Realtime, backups, eliminación efectiva ni transferencias: requieren acceso a entornos y contratos. No se verificó cumplimiento integral de otras normas, como consumo o pagos; sus condiciones deben revisarse antes de habilitar cobros.
