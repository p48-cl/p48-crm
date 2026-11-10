-- Correlativo único por negocio (NEG-0001) y vista con el número. Aplicada vía MCP.
alter table public.oportunidades add column if not exists numero integer generated always as identity;
create unique index if not exists oportunidades_numero_key on public.oportunidades(numero);
-- v_oportunidades se recrea con `o.numero` al final (security_invoker=true).
