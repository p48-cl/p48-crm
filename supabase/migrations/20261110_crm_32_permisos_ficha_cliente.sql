-- crm_32 · Permisos de la ficha de cliente: solo admin edita; los miembros (ejecutivos) solo crean.
-- Afecta empresas (datos, plan, fee, estado, archivar, logo), cuentas/accesos y servicios (editar y borrar).
-- Los servicios se pueden crear como antes: el recálculo del MRR corre como security definer.
-- Aplicar vía SQL Editor o MCP.

drop policy if exists "miembros editan" on public.empresas;
drop policy if exists "admin edita empresas" on public.empresas;
create policy "admin edita empresas" on public.empresas
  for update to authenticated using ((select public.es_admin())) with check ((select public.es_admin()));

drop policy if exists "miembros editan" on public.accesos_admin_marketing;
drop policy if exists "admin edita accesos" on public.accesos_admin_marketing;
create policy "admin edita accesos" on public.accesos_admin_marketing
  for update to authenticated using ((select public.es_admin())) with check ((select public.es_admin()));

drop policy if exists "miembros editan servicios" on public.servicios_cliente;
drop policy if exists "admin edita servicios" on public.servicios_cliente;
create policy "admin edita servicios" on public.servicios_cliente
  for update to authenticated using ((select public.es_admin())) with check ((select public.es_admin()));

drop policy if exists "miembros borran servicios" on public.servicios_cliente;
drop policy if exists "admin borra servicios" on public.servicios_cliente;
create policy "admin borra servicios" on public.servicios_cliente
  for delete to authenticated using ((select public.es_admin()));
