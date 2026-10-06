# Revision del schema para Supabase

Tu schema general esta bien encaminado para la app: cubre usuarios, perfiles, lugares, delegados, reservas, reportes, favoritos, chat, notificaciones y soporte.

## Ajustes necesarios para Supabase Auth

### 1. `users.password_hash`

Si la autenticacion sera con Supabase Auth, no debemos guardar contrasenas ni hashes en `public.users`.

Problema actual:

```sql
password_hash VARCHAR(255) NOT NULL
```

Debe eliminarse. El archivo `supabase/pinwi_schema_supabase.sql` ya delega las credenciales a Supabase Auth.

### 2. `users.id`

En Supabase Auth, el id real del usuario vive en `auth.users.id`. Para que el frontend pueda guardar perfiles con seguridad, `public.users.id` debe ser el mismo UUID.

Recomendado:

```sql
id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE
```

El archivo `supabase/pinwi_schema_supabase.sql` define esta foreign key.

### 3. Seeds de usuarios demo

Estos inserts no crean usuarios reales en Supabase Auth:

```sql
INSERT INTO users (...)
VALUES ('admin@pinwi.cl', ...);
```

Si los ejecutas asi, tendras filas en `public.users`, pero no podran iniciar sesion. Los usuarios demo deben crearse desde Supabase Auth o desde un backend con service role.

### 4. RLS

Para usar Supabase desde frontend, las tablas expuestas necesitan Row Level Security. El archivo `supabase/pinwi_schema_supabase.sql` agrega politicas base para los modulos actuales.

Mas adelante hay que refinar permisos administrativos y flujos de delegados segun las pantallas reales.

### 5. Vista `places_with_stats`

La vista hace `SELECT p.*` y tambien crea `favorites_count` calculado. Como `places` ya tiene una columna `favorites_count`, puede quedar nombre duplicado en la vista.

Recomendacion: renombrar el calculado:

```sql
COUNT(DISTINCT f.id) as computed_favorites_count
```

### 6. Drops al inicio

El schema empieza con muchos `DROP TABLE IF EXISTS ... CASCADE`. Esta bien para desarrollo local, pero es peligroso en Supabase si ya hay datos reales.

Recomendacion:

- usarlo solo en ambiente nuevo o de pruebas
- crear migraciones incrementales para produccion

## Orden sugerido para montar en Supabase

1. Crear proyecto Supabase.
2. Ejecutar `supabase/pinwi_schema_supabase.sql` en una base nueva o descartable.
3. Crear usuarios desde Supabase Auth.
4. Si ya existian usuarios Auth antes de ejecutar el schema, el mismo script los sincroniza en `public.users`.
5. Refinar permisos de admin y delegado segun los flujos finales.
