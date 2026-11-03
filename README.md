# JAMP CRM (P48)

CRM interno de P48: pipeline, empresas, contactos, tareas, Mkt Inteligence y portal de clientes.

Stack: React + Vite + TypeScript + Tailwind v4, Supabase (Postgres + Auth + RLS), Vercel.

## Correr local

1. `npm install`
2. Crear `.env.local` con `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` (clave publicable). Con `VITE_MODO_DEMO=true` corre con datos de prueba sin Supabase.
3. `npm run dev` (puerto 3000)

Verificar antes de un PR: `npm run lint` (typecheck) y `npm run build`.

Nunca poner `service_role` ni tokens en el frontend. Arquitectura en `ARQUITECTURA.md`, historial en `CHANGELOG.md`.
