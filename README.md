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
2. Copia `.env.example` como `.env`.
3. Completa:

```bash
VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=TU_ANON_KEY_O_PUBLISHABLE_KEY
```

4. Ejecuta el schema completo listo para Supabase en `supabase/pinwi_schema_supabase.sql`.

La autenticacion se maneja con Supabase Auth. Los datos publicos del usuario se guardan en `public.users` y el perfil extendido en `public.user_profiles`.

No pongas la `service_role key` en el frontend. Solo se usa la anon key o publishable key.

Notas de revision del schema: `supabase/SCHEMA_REVIEW.md`.

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

La auditoría de privacidad y seguridad del 6 de octubre de 2026 está en [PRIVACY_AUDIT.md](PRIVACY_AUDIT.md). Incluye brechas verificadas en el repositorio y el orden de corrección para la entrada en vigor de la Ley 21.719. Los documentos públicos de desarrollo están en `/terminos` y `/privacidad`; su contenido compartido está en `src/app/features/auth/legalDocuments.ts`. Son borradores y aún requieren identidad del responsable, contacto y procedimientos operativos antes de publicar una versión definitiva.

Por ahora varias pantallas usan datos mock y logica demo. La idea es reemplazar eso despues por autenticacion, base de datos y servicios reales.

## Identidad visual de Pinwi

El logo original está en `assets/Logo_Pinwi.svg`. `assets/pinwi-mark.svg` y `assets/pinwi-wordmark.svg` conservan sus trazados y ajustan el encuadre para usarlos en tamaños pequeños. Si cambia el original, deben actualizarse ambas variantes. `src/app/components/BrandLogo.tsx` comparte la marca entre las pantallas de acceso, navegación y paneles.

El fondo ilustrado está en `assets/auth-chile-coworking.svg` y se muestra mediante `src/app/features/auth/AuthBackground.tsx`. Combina un degradado azul y violeta con rutas de mapa suaves y una silueta de arquitectura chilena en la franja inferior. El inicio de sesión separa los paneles con una curva suave y una sombra hacia el formulario. En escritorio, el logo completo del archivo original aparece sobre una base blanca en el panel izquierdo; en móvil, la marca se muestra sobre el formulario. El formulario adapta sus espacios a escritorio y móvil, incluye autocompletado y respeta la preferencia de movimiento reducido.
