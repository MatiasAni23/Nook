# AGENTS.md — Instrucciones para trabajar en Pinwi

Este archivo orienta a los asistentes de programación que trabajan en este repositorio. Contiene contexto, convenciones y comprobaciones del proyecto; no es código ejecutable ni sustituye la documentación técnica. Mantenerlo actualizado cuando cambien la arquitectura, los comandos o las reglas del negocio.

## Contexto y tecnologías

- Pinwi es una aplicación web para descubrir y gestionar espacios de estudio y trabajo, con perfiles, chat y paneles de administración y delegados. El nombre de la carpeta local es Nook.
- El proyecto proviene de una exportación de Figma y combina funcionalidades conectadas a Supabase con datos y recorridos demo. Verificar la implementación de cada pantalla antes de asumir que una funcionalidad está completa.
- Stack actual: React 18, TypeScript 5 en modo estricto, Vite 6, React Router 7 y Tailwind CSS 4. La interfaz reutiliza componentes shadcn/Radix, Lucide y Recharts. Google Maps usa `@vis.gl/react-google-maps`.
- Backend: Supabase Auth, PostgreSQL con RLS, Storage, Realtime y funciones Edge en Deno. Las invitaciones por correo integran Brevo desde el servidor.
- Usar `package.json`, `package-lock.json`, la configuración y el código como referencia del estado local. Algunos textos de `README.md` y los informes locales de `docs-local/` describen etapas anteriores o trabajo pendiente.

## Documentación y Expo

- Consultar documentación oficial compatible con las versiones instaladas al introducir una API o resolver dudas. TypeScript es el lenguaje principal; React, Vite y Expo son herramientas del ecosistema, no lenguajes.
- Este repositorio actualmente no declara `expo` ni `react-native`, y usa Vite y componentes del navegador. Los recursos móviles y las exclusiones de Expo en `.gitignore` no cambian ese stack.
- Se conserva la referencia original de Expo SDK 56: https://docs.expo.dev/versions/v56.0.0/. Si una tarea incorpora Expo o trabaja sobre código Expo, leer esa documentación versionada antes de escribir código y comprobar la versión objetivo. No aplicar instrucciones de Expo Router, Metro o componentes nativos al frontend Vite.
- No migrar el proyecto a Expo, actualizar versiones mayores ni cambiar el gestor de paquetes como parte de una tarea que no lo requiera.

## Mapa del repositorio

| Ubicación | Responsabilidad |
| --- | --- |
| `src/main.tsx` | Entrada de React e importación de estilos. |
| `src/app/App.tsx` | Montaje del proveedor de usuario y del router. |
| `src/app/routes.tsx` | Rutas, acceso por rol y flujo de autenticación/demo. |
| `src/app/features/` | Pantallas por dominio: `auth`, `admin`, `delegado`, `descubrir`, `mapa`, `perfil`, `encontrar-estudiantes` y `chat`. |
| `src/app/features/shared/` | Layouts, modales y piezas compartidas entre pantallas. |
| `src/app/components/ui/` | Componentes visuales reutilizables; `utils.ts` exporta `cn` para combinar clases. |
| `src/app/components/BrandLogo.tsx` | Componente compartido de la marca Pinwi. |
| `src/app/context/CurrentUserContext.tsx` | Usuario actual, actualización de perfil y presencia. |
| `src/app/services/` | Consultas, operaciones de negocio y cachés del frontend. |
| `src/app/lib/supabase.ts` | Cliente Supabase y detección de configuración. |
| `src/app/data/` | Datos mock/demo; algunos servicios también reutilizan sus tipos. |
| `src/styles/` y `assets/` | Estilos globales, tokens, fuentes e imágenes de marca. |
| `supabase/migrations/` | Cambios SQL incrementales con fecha; sólo locales, excluidos de Git. |
| `supabase/functions/` | Funciones Edge de invitaciones y recuperación de contraseña. |
| `supabase/schema/` | Esquema inicial y consultas de inspección; sólo locales, excluidos de Git. |
| `docs-local/` | Resúmenes, auditorías y documentación de modelos de datos; excluidos de Git y de despliegues. |
| `tests/*.test.mjs` | Pruebas de permisos, privacidad y servicios. |

## Comandos y configuración local

Usar npm y conservar `package-lock.json`. Existe configuración de pnpm, pero el lockfile y los comandos documentados actuales son de npm. En PowerShell, usar `npm.cmd` si la política de ejecución bloquea `npm.ps1`.

| Comando | Uso |
| --- | --- |
| `npm ci` | Instalar las dependencias del lockfile cuando sea necesario. |
| `npm run dev` o `npm start` | Iniciar el servidor Vite. |
| `npm run typecheck` | Comprobar tipos con `tsc --noEmit`. |
| `npm test` | Ejecutar la suite con el runner de Node. |
| `npm run build` | Compilar la aplicación web en `dist/`. |
| `git diff --check` | Revisar errores de espacios en los cambios. |

- No hay un script de lint configurado. No afirmar que se ejecutó uno ni instalar herramientas sólo para simular esa comprobación.
- Variables del frontend: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` o `VITE_SUPABASE_ANON_KEY`, y `VITE_GOOGLE_MAPS_API_KEY`. La clave publishable tiene prioridad sobre la anon.
- No hay `.env.example`: crear `.env` sólo con la configuración local autorizada. No generar ejemplos a partir de credenciales reales.
- Sin configuración Supabase, varias rutas y pantallas permiten modo demo. Ese comportamiento no acredita autenticación ni autorización de producción. No convertir errores del backend configurado en éxitos simulados.
- `CheckoutView.tsx` usa datos mock y una alerta; todavía no crea ni cobra una reserva real. No presentar ese recorrido como integración de pagos terminada.

## Convenciones de implementación

- Leer primero los archivos de la funcionalidad y sus servicios. Realizar cambios centrados en la solicitud, respetar cambios locales existentes y evitar refactorizaciones ajenas al objetivo.
- Mantener las pantallas en su carpeta de `features`; compartir componentes sólo cuando exista reutilización. Centralizar nuevas consultas y operaciones de negocio en `services` y reutilizar el cliente Supabase existente.
- Seguir el estilo de los archivos editados: componentes funcionales, hooks y tipos explícitos. Evitar introducir `any` o desactivar comprobaciones para ocultar errores.
- El alias `@/` apunta a `src/`; también existen imports relativos. Mantener coherencia con el módulo que se modifica.
- La navegación web usa React Router y se define en `routes.tsx`. Conservar los flujos de estudiante/trabajador, administrador y delegado, y el acceso público a `/terminos` y `/privacidad`.
- Gestionar carga, error, vacío y éxito en operaciones asíncronas. Mostrar éxito sólo después de la confirmación del servidor; limpiar suscripciones Realtime, observadores de ubicación y efectos al desmontar.
- Al modificar sesión, roles o datos almacenados, revisar `CurrentUserContext`, `currentUserService` y `appCacheService`. Evitar que una respuesta pendiente o caché de una cuenta termine mostrando datos en otra sesión.
- Al volver a una vista de administración, mostrar primero su caché en memoria y reutilizar las consultas recientes durante cinco minutos. Actualizar datos vencidos en segundo plano sin ocultar el contenido; reservar `forceRefresh` para una actualización explícita. Invalidar cachés relacionadas al guardar cambios y limpiar datos privados al cambiar de cuenta o cerrar sesión. No usar la caché como comprobación de permisos ni persistir estos datos privados en `localStorage`.
- No editar `dist/` ni `node_modules/` como código fuente. Conservar los plugins React/Tailwind, el resolver de recursos Figma y las restricciones de archivos privados de `vite.config.ts`.

## Interfaz y marca

- Mantener los textos de la interfaz y las explicaciones al usuario en español, con tildes y archivos UTF-8. Conservar los identificadores técnicos según las convenciones existentes.
- Reutilizar `components/ui`, `cn` y los estilos/tokens existentes antes de agregar dependencias o crear componentes equivalentes. Tailwind es versión 4: no aplicar configuraciones de Tailwind 3 sin comprobar compatibilidad.
- Respetar la identidad de Pinwi y usar `BrandLogo`. El original es `assets/Logo_Pinwi.svg`; si cambia, revisar también `pinwi-mark.svg` y `pinwi-wordmark.svg`.
- Verificar diseños en móvil y escritorio, sin desbordamientos, con etiquetas de formulario, foco visible, navegación por teclado y respeto a movimiento reducido.
- Para precios en pesos chilenos, seguir el formato `es-CL` y `CLP` usado en la aplicación.

## Supabase, permisos y datos privados

- Antes de modificar permisos o SQL, consultar, si están disponibles, `docs-local/supabase/DELEGATES.md`, `docs-local/supabase/schema/README.md`, `docs-local/PRIVACY_AUDIT.md` y `docs-local/supabase/REMOTE_REVIEW.md`. Son documentos locales que no se incluyen al clonar el repositorio; sus fechas no prueban el estado remoto actual. Si faltan, revisar la implementación y solicitar los SQL locales necesarios antes de cambiar la base de datos.
- La autorización debe validarse en RLS, RPC o funciones del servidor. Las rutas privadas y los controles visuales no bastan. No confiar en metadatos de registro o estado del navegador para otorgar roles privilegiados.
- Mantener privadas las cuentas de `public.users` y los perfiles de `public.user_profiles`. Para identidades de otras personas, reutilizar `sharedProfileService` y la RPC `get_shared_profiles`; no abrir tablas privadas para solucionar una pantalla. El directorio académico es voluntario y revocable.
- Un delegado necesita cuenta y registro de delegado activos y sólo puede gestionar lugares de su alcance. Mantener las operaciones de roles/asignaciones atómicas y los cambios de estado de reservas restringidos en el servidor.
- Al modificar mensajes o notificaciones, conservar el acceso por participantes/destinatario y la integridad del contenido. Las confirmaciones de lectura no deben permitir reescribir mensajes, incluidos los históricos.
- Todo valor `VITE_*` llega al navegador. Nunca colocar allí claves `service_role`, tokens administrativos, claves de Brevo ni contraseñas. No imprimir `.env`, enlaces con tokens ni datos personales en logs, respuestas o documentación.
- Conservar las exclusiones de `docs-local/`, `supabase/schema/`, `supabase/migrations/`, todos los archivos SQL, el estado de la CLI y los respaldos. No agregarlos a Git, ni con `git add -f`, ni incluirlos en despliegues. Los modelos, diagramas y documentación de la base de datos deben permanecer en `docs-local/`, aunque tengan otra extensión.
- `supabase/schema/pinwi_schema_supabase.sql` contiene borrados destructivos: usarlo sólo para bases vacías o descartables, como los fixtures locales de pruebas. No ejecutarlo sobre una base con datos existentes.
- Para cambios de esquema, crear una migración incremental nueva con versión posterior; no reescribir migraciones aplicadas. Si cambian permisos o funciones usadas por el frontend, documentar el orden de despliegue.
- Preparar y validar los cambios localmente. Aplicar migraciones remotas, publicar funciones/frontend o enviar invitaciones sólo dentro de una solicitud que autorice esas acciones; modificar código local no implica desplegarlo.
- Los documentos legales comparten contenido en `src/app/features/auth/legalDocuments.ts` y siguen siendo borradores. No inventar identidad legal, contactos, garantías de privacidad ni afirmar cumplimiento a partir de pruebas técnicas.

## Verificación y entrega

- No crear archivos Markdown de resumen por rutina: entregar el resumen en el chat. Cuando una tarea requiera un informe, guardarlo en `docs-local/`, conservando subcarpetas por tema. Mantener `README.md`, `AGENTS.md`, `CLAUDE.md`, las instrucciones de `guidelines/` y `ATTRIBUTIONS.md` en sus ubicaciones; son documentación esencial, instrucciones y atribuciones del repositorio.
- Para cambios de TypeScript/React, ejecutar `npm run typecheck` y `npm run build`. Si cambia lógica de servicios, sesión, permisos, mensajes o SQL, ejecutar también `npm test` y ampliar las pruebas de regresión cuando corresponda.
- La suite usa PGlite para probar SQL y RLS con identidades distintas, y Vite con HTTP simulado para probar servicios. Las pruebas SQL necesitan los archivos locales de `supabase/schema/` y `supabase/migrations/`; un clon nuevo no los incluye. No requiere cuentas reales y no demuestra el funcionamiento de Supabase Auth, Storage, Realtime o Brevo desplegados. Las funciones Deno no están incluidas en el `typecheck` del frontend.
- Para cambios visuales, comprobar el recorrido afectado en navegador móvil y escritorio si hay herramientas disponibles. Informar qué se comprobó y si se usó modo demo, servicios simulados o backend real.
- Para cambios únicamente de documentación, revisar contenido, rutas y `git diff --check`; no es necesario recompilar la app.
- Al terminar, explicar brevemente qué cambió, cómo se verificó y qué limitaciones quedan. Distinguir fallos previos de regresiones y no declarar pruebas o despliegues que no se realizaron.
