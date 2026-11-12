-- crm_39 · Quitar privilegios por defecto de anon en facturas (RLS ya lo bloquea).
revoke all on public.facturas from anon;
