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

La auditoría de privacidad y seguridad se conserva en `docs-local/PRIVACY_AUDIT.md`, si dispones de la documentación local. Los documentos públicos de desarrollo están en `/terminos` y `/privacidad`; su contenido compartido está en `src/app/features/auth/legalDocuments.ts`. Son borradores y aún requieren identidad del responsable, contacto y procedimientos operativos antes de publicar una versión definitiva.

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
