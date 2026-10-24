# Pinwi

Aplicacion web para descubrir, reservar y administrar espacios de estudio y trabajo.

Este proyecto viene de un diseno de Figma exportado como React + Vite. La primera etapa es ordenar los modulos del diseno para poder convertirlos poco a poco en una aplicacion real.

## Stack actual

- React 18: libreria para construir la interfaz.
- Vite 6: servidor de desarrollo y build de la app web.
- TypeScript: JavaScript con tipos.
- React Router: rutas internas de la app.
- Tailwind CSS 4: estilos utilitarios.
- shadcn/Radix UI: componentes base como dialogos, tabs, selects, inputs y cards.
- Lucide React: iconos.
- Recharts: graficos del panel admin.
- Supabase: autenticacion y base de datos.
- Datos mock: informacion de prueba en `src/app/data`.

## Comandos

La ruta `/` presenta una landing con tarjetas de todos los lugares activos, mostrando sólo su nombre y foto principal, y un buscador por nombre. El HTML de producción incluye las tarjetas antes de ejecutar JavaScript. Las fichas y el resto de la app requieren iniciar sesión en `/iniciar-sesion`; el modo demo también exige entrar por ese flujo. Las redes y WhatsApp del footer se gestionan en **Administración → Gestión → Sitio público**.

La conexión del catálogo público requiere `202610210001_public_place_cards.sql`, posterior a la configuración inicial del footer, como se documenta en `docs-local/supabase/PUBLIC_LANDING.md`. Aplicar la migración antes de compilar y publicar: el build consulta únicamente la RPC mínima con una clave pública y falla si no obtiene el catálogo completo. Las fichas, coordenadas y datos de cuentas no se incluyen en esa consulta. Los SQL y esa documentación están excluidos de Git; no se despliegan al compilar la aplicación.

Instalar dependencias:

```bash
npm install
```

Iniciar el proyecto en desarrollo:

```bash
npm start
```

Tambien puedes usar:

```bash
npm run dev
```

Compilar para revisar que el proyecto no tenga errores de build:

```bash
npm run build
```

## Android e iPhone

Capacitor 8 comparte la interfaz y Supabase con la web. Los proyectos nativos están en `android/` e `ios/`; el paquete móvil usa `dist-mobile/`. La compilación web y su SEO conservan `npm run build`.

Para Android, instala Android Studio 2025.2.1 o posterior, SDK 36 y un JDK 21 compatible. Configura `ANDROID_HOME` y `JAVA_HOME` si las herramientas no los detectan. En esta copia hay un JDK portátil local que el script del APK detecta sin modificar Java del sistema.

```bash
npm ci
npm run android:apk
npm run android:open
```

`android:apk` compila y deja el APK en `docs-local/mobile/apk/`, con la versión leída de Android (`Pinwi-0.2.0-debug.apk` actualmente), listo para enviar a un teléfono. Es una versión de prueba firmada con la clave debug local. Para ejecutar por USB, activa depuración USB y usa Android Studio o `npm run android:run`. Tras cambiar el frontend, vuelve a ejecutar `npm run android:sync` antes de compilar desde Android Studio. No regeneres las carpetas nativas con `cap add`: ya contienen permisos, iconos y ajustes de Pinwi.

El arranque nativo usa el pinwino de la landing, el wordmark y un fondo exclusivo para el splash. Las pantallas pesadas se cargan por separado y las fotos usan la carga nativa del navegador. Las conversaciones ocultan la navegación principal y comparten el feed de mensajes con el banner de avisos. Las comprobaciones simuladas de red y navegador no sustituyen la prueba del APK en el teléfono real.

Para iOS, copia/clona el proyecto en un Mac con Xcode 26+, ejecuta `npm ci`, `npm run ios:sync` y `npm run ios:open`. Selecciona tu equipo de firma y el iPhone en Xcode y pulsa Run. El proyecto usa Swift Package Manager. El USB sirve para instalar/depurar desde Xcode; Windows no compila iOS. Un servicio remoto con macOS puede compilar una versión firmada para TestFlight, pero no transforma Windows en Xcode ni se configuró una cuenta de distribución.

También puedes probar la web desde Safari: `npm run build` y `npm run preview:phone`, abrir la dirección de red del equipo en el iPhone conectado a la misma Wi-Fi. Para añadirla como aplicación de pantalla de inicio usa un sitio HTTPS y Safari → Compartir → Añadir a pantalla de inicio → Abrir como app web. El manifiesto y los iconos están preparados; requiere conexión, sin almacenamiento offline de datos privados.

La web solicita ubicación al abrir Mapa o Descubrir después de iniciar sesión; la portada no la pide. Los permisos nativos se solicitan desde los botones de ubicación. Ambas vistas muestran errores y permiten reintentar, sin inferir la ubicación por IP. En Safari, revisa el permiso del sitio y Localización de iOS si no aparece el aviso: una página no puede forzarlo cuando está denegado. El login mantiene contraseña y códigos OTP por correo. Los enlaces de correo/invitación apuntan a `https://www.pinwi.cl`, y los enlaces externos abren el navegador del sistema. Comprueba Maps y Turnstile con las restricciones de origen de sus claves en el teléfono antes de distribuir. El APK inicial no incluye push cuando la app está cerrada.

## Supabase

El frontend usa `@supabase/supabase-js`.

1. Crea un proyecto en Supabase.
2. Crea un archivo local `.env` (no se incluye en Git).
3. Completa:

```bash
VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=TU_ANON_KEY_O_PUBLISHABLE_KEY
```

4. Obtén los archivos SQL locales del responsable del proyecto. Los esquemas y las migraciones no se publican en este repositorio.
5. En una base nueva y vacía, prepara el esquema inicial y aplica las migraciones en orden. El esquema inicial borra tablas: **no lo ejecutes en una base existente**. Para una base existente, aplica únicamente migraciones incrementales y verifica las necesarias antes de publicar el frontend.

La autenticación se maneja con Supabase Auth. Aparecer en el directorio académico requiere activarlo desde Editar perfil. Las instrucciones operativas y las revisiones de la base de datos se conservan sólo en la documentación local.

No pongas la `service_role key` en el frontend. Solo se usa la anon key o publishable key.

## Documentación y archivos locales

Los resúmenes, auditorías y modelos de datos se guardan en `docs-local/`, conservando subcarpetas por tema. Esta carpeta está excluida de Git y de los despliegues; no aparece al clonar el repositorio. Los informes de administración y privacidad, y las guías de Supabase, están allí si dispones de la copia local.

Los SQL mantienen sus rutas locales en `supabase/schema/`, `supabase/migrations/` y la raíz para no cambiar las herramientas que los utilizan. Esas carpetas y cualquier archivo SQL también están excluidos de Git y de los despliegues. Las pruebas de base de datos necesitan esos archivos locales; las pruebas de servicios, el frontend y su compilación no los utilizan.

`README.md`, `AGENTS.md`, `CLAUDE.md`, las instrucciones de `guidelines/` y `ATTRIBUTIONS.md` permanecen en el repositorio. Los resúmenes de tareas se entregan en el chat; sólo se crea un informe local cuando es necesario.

## Estructura principal

```txt
src/
  main.tsx              Entrada de React en el navegador
  app/
    App.tsx             Monta el router
    routes.tsx          Define rutas y flujo demo de autenticacion
    data/               Datos de prueba
    components/
      ui/               Componentes visuales reutilizables
      figma/            Helpers generados por Figma
    features/
      auth/                     Login y configuracion inicial de perfil
      admin/                    Vistas del administrador
      delegado/                 Vistas del delegado
      descubrir/                Descubrimiento de espacios
      mapa/                     Mapa, detalle de lugar y checkout
      perfil/                   Perfil de estudiante/trabajador
      encontrar-estudiantes/    Vista para encontrar estudiantes
      chat/                     Chat y mensajes
      shared/                   Layout y piezas compartidas entre vistas
```

## Credenciales demo

```txt
admin@pinwi.cl / admin123
delegado@demo.cl / delegado123
trabajador@demo.cl / trabajador123
estudiante@demo.cl / estudiante123
```

## Nota

La auditoría de privacidad y seguridad se conserva en `docs-local/PRIVACY_AUDIT.md`, si dispones de la documentación local. Los documentos públicos están en `/terminos` y `/privacidad`; su contenido compartido está en `src/app/features/auth/legalDocuments.ts`, con versión y presentación independientes. Los términos tienen redacción pública y usan el contacto existente `info@pinwi.cl`; la política de privacidad conserva su estado de borrador. La revisión formal, la identificación legal del operador y la validación de los procedimientos operativos siguen pendientes antes de publicar una versión definitiva.

Por ahora varias pantallas usan datos mock y logica demo. La idea es reemplazar eso despues por autenticacion, base de datos y servicios reales.

## Panel de administración

El informe local de avances y pendientes está en `docs-local/ESTADO_ADMIN.md`, si dispones de la documentación local.

Las vistas de inicio, lugares, estadísticas y gestión comparten el estilo del perfil: tarjetas blancas, bordes suaves y un acento violeta. La navegación de escritorio permanece a la derecha; en móvil se usa una barra inferior. Sus estilos están limitados al panel en `src/app/features/admin/admin.css`.

Gestión organiza las cinco secciones en accesos con colores suaves. Usuarios y delegados se presentan en listados con identidad, perfil/asignaciones, estado y menús de acciones. Las categorías, planes y acciones de lugares usan colores discretos para distinguir su significado.

Las consultas del administrador se conservan en memoria durante cinco minutos. Al volver a una vista se muestran los datos disponibles al instante; cuando vencen, la actualización ocurre en segundo plano y conserva el contenido durante la consulta. Se deduplican las solicitudes simultáneas, los guardados invalidan las cachés relacionadas y cambiar de cuenta o cerrar sesión limpia los datos privados. `tests/admin-cache.test.mjs` cubre vencimiento, reintentos, navegación e invalidación de respuestas pendientes. Estas cachés no almacenan datos privados en `localStorage` ni sustituyen las comprobaciones de permisos del servidor.

Lugares permite buscar por nombre o ubicación, filtrar, consultar la ficha, crear, editar y retirar del catálogo. La eliminación cambia el estado a `inactive` para conservar reservas e historial. Crear y editar requiere Supabase; la vista sin conexión usa ejemplos y no simula guardados exitosos. Los formularios validan campos obligatorios, coordenadas, capacidades e imágenes, y deshabilitan controles mientras guardan.

`tests/place-crud.test.mjs` comprueba los servicios con HTTP simulado, incluidos errores, limpieza de una creación incompleta e invalidación de caché. La edición todavía realiza varias escrituras: si falla un paso posterior, informa que puede haber cambios parciales y exige revisar la ficha. Estas pruebas no sustituyen un recorrido con Auth y Storage reales. Estadísticas y gestión conservan sus integraciones existentes; soporte y reservas de gestión siguen mostrando datos de ejemplo.

## Identidad visual de Pinwi

El logo original está en `assets/Logo_Pinwi.svg`. `assets/pinwi-mark.svg` y `assets/pinwi-wordmark.svg` conservan sus trazados y ajustan el encuadre para usarlos en tamaños pequeños. Si cambia el original, deben actualizarse ambas variantes. `src/app/components/BrandLogo.tsx` comparte la marca entre las pantallas de acceso, navegación y paneles.

El fondo ilustrado está en `assets/auth-chile-coworking.svg` y se muestra mediante `src/app/features/auth/AuthBackground.tsx`. Combina un degradado azul y violeta con rutas de mapa suaves y una silueta de arquitectura chilena en la franja inferior. El inicio de sesión separa los paneles con una curva suave y una sombra hacia el formulario. En escritorio, el logo completo del archivo original aparece sobre una base blanca en el panel izquierdo; en móvil, la marca se muestra sobre el formulario. El formulario adapta sus espacios a escritorio y móvil, incluye autocompletado y respeta la preferencia de movimiento reducido.
