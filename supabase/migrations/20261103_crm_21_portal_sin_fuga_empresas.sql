-- crm_21 · Un cliente podía leer la fila completa de su empresa por REST
-- (fee, MRR, salud, responsable, RUT). El portal solo necesita 6 columnas.
-- Solución: la vista portal_empresa se ejecuta con privilegios del dueño, filtrada por
-- empresas_del_cliente(), y se quita la política directa sobre empresas.
-- Estado: PREPARADA, pendiente de aplicar tras confirmación.

drop policy if exists "cliente lee su empresa" on public.empresas;

alter view public.portal_empresa set (security_invoker = false);
revoke all on public.portal_empresa from anon;
grant select on public.portal_empresa to authenticated;

-- Verificación esperada:
--   1) Un cliente autenticado: select * from empresas → solo miembros ven filas.
--   2) select * from portal_empresa → solo su empresa, 6 columnas.
--   3) Portal: proyectos, entregables y reportes siguen funcionando (no dependen de empresas).
