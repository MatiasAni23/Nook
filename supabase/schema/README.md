# Archivos SQL y respaldos

- `pinwi_schema_supabase.sql`: esquema inicial, exclusivamente para una base vacía o descartable; es destructivo. Las pruebas lo usan como fixture. Se conserva versionado para reproducir el proyecto.
- `inspect_schema.sql`: consulta de metadatos de sólo lectura. No contiene resultados reales, credenciales ni datos de cuentas.
- `private/`: inventarios, respaldos y resultados reales del proyecto. Toda esta carpeta está excluida de Git. Guardar aquí futuros dumps; no guardar tokens ni contraseñas en scripts.
- `../migrations/`: cambios incrementales versionados que registra la CLI. No contienen datos personales reales. Una vez aplicados, crear otra migración para cambios posteriores.

Excluir archivos nuevos no elimina copias antiguas que ya se hayan publicado. Si alguna vez se subió una credencial o datos personales, deben tratarse por separado; `.gitignore` no limpia el historial.

La carpeta privada también está excluida de subidas con la CLI de Vercel mediante `.vercelignore`, y Vite bloquea su lectura por HTTP durante el desarrollo.
