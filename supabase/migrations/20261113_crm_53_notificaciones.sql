-- crm_53 · Notificaciones internas (campanita, alertas de cobro y cotización, resumen diario).
-- NO aplicar en producción sin respaldo previo de P48-CRM confirmado.
-- Requiere: pg_cron, pg_net y supabase_vault (ya instalados). La clave de Resend se guarda en Vault
-- con el nombre 'resend_alertas_api_key' (no va en este archivo). Envío apagado hasta activarlo en Preferencias.

-- 1) Preferencias de alertas por correo (fila única de configuracion_crm)
alter table public.configuracion_crm
  add column if not exists alertas_email_activo boolean not null default false,
  add column if not exists alertas_email_destino text,
  add column if not exists alertas_email_remitente text,
  add column if not exists dias_cotizacion_sin_respuesta int not null default 7
    check (dias_cotizacion_sin_respuesta between 1 and 365);

-- 2) Notificaciones por miembro. La clave evita duplicados al correr los jobs varias veces.
create table if not exists public.notificaciones (
  id uuid primary key default gen_random_uuid(),
  destinatario_id uuid not null references public.miembros(id) on delete cascade,
  tipo text not null check (tipo in ('cobro_vencido', 'cobro_por_vencer', 'cotizacion_sin_respuesta', 'resumen_diario')),
  prioridad text not null default 'normal' check (prioridad in ('alta', 'normal')),
  titulo text not null,
  detalle text,
  clave text not null,
  leida_en timestamptz,
  enviada_email_en timestamptz,
  created_at timestamptz not null default now(),
  unique (destinatario_id, clave)
);

create index if not exists notificaciones_destinatario_idx
  on public.notificaciones (destinatario_id, created_at desc);
create index if not exists notificaciones_pendientes_email_idx
  on public.notificaciones (created_at)
  where enviada_email_en is null;

-- 3) Miembro activo del usuario conectado (evita consultar miembros dentro de la política)
create or replace function public.mi_miembro_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select m.id from public.miembros m
  where m.user_id = auth.uid() and m.activo
  limit 1
$$;

revoke execute on function public.mi_miembro_id() from public, anon;
grant execute on function public.mi_miembro_id() to authenticated;

alter table public.notificaciones enable row level security;

drop policy if exists "miembro lee sus notificaciones" on public.notificaciones;
create policy "miembro lee sus notificaciones" on public.notificaciones
  for select to authenticated
  using (destinatario_id = (select public.mi_miembro_id()));

drop policy if exists "miembro marca sus notificaciones" on public.notificaciones;
create policy "miembro marca sus notificaciones" on public.notificaciones
  for update to authenticated
  using (destinatario_id = (select public.mi_miembro_id()))
  with check (destinatario_id = (select public.mi_miembro_id()));

revoke all on public.notificaciones from anon, authenticated;
grant select on public.notificaciones to authenticated;
grant update (leida_en) on public.notificaciones to authenticated;

-- 4) Generación de alertas (determinista, sin IA). Corre cada hora.
create or replace function public.generar_notificaciones()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  hoy date := (now() at time zone 'America/Santiago')::date;
  dias_sin int;
begin
  select c.dias_cotizacion_sin_respuesta into dias_sin from public.configuracion_crm c where c.id = 1;

  -- Cobros vencidos (alta prioridad: se envía por correo)
  insert into public.notificaciones (destinatario_id, tipo, prioridad, titulo, detalle, clave)
  select m.id, 'cobro_vencido', 'alta',
         'Factura vencida · ' || coalesce(e.nombre, 'sin cliente'),
         'Vencía el ' || to_char(f.fecha_vencimiento, 'DD-MM-YYYY') || ' · $' || round(coalesce(f.monto_total, 0))::bigint,
         'cobro_vencido:' || f.id
  from public.facturas f
  left join public.empresas e on e.id = f.empresa_id
  cross join public.miembros m
  where m.activo and not f.archivado and f.estado_pago = 'pendiente' and f.fecha_vencimiento < hoy
  on conflict (destinatario_id, clave) do nothing;

  -- Cobros que vencen en los próximos 3 días (solo en la campanita)
  insert into public.notificaciones (destinatario_id, tipo, prioridad, titulo, detalle, clave)
  select m.id, 'cobro_por_vencer', 'normal',
         'Factura por vencer · ' || coalesce(e.nombre, 'sin cliente'),
         'Vence el ' || to_char(f.fecha_vencimiento, 'DD-MM-YYYY') || ' · $' || round(coalesce(f.monto_total, 0))::bigint,
         'cobro_por_vencer:' || f.id
  from public.facturas f
  left join public.empresas e on e.id = f.empresa_id
  cross join public.miembros m
  where m.activo and not f.archivado and f.estado_pago = 'pendiente'
    and f.fecha_vencimiento between hoy and hoy + 3
  on conflict (destinatario_id, clave) do nothing;

  -- Cotizaciones enviadas sin respuesta hace más de N días
  insert into public.notificaciones (destinatario_id, tipo, prioridad, titulo, detalle, clave)
  select m.id, 'cotizacion_sin_respuesta', 'normal',
         'Cotización sin respuesta · ' || coalesce(e.nombre, 'sin cliente'),
         'Cotización N° ' || c.numero || ' enviada el ' || to_char(c.fecha_emision, 'DD-MM-YYYY'),
         'cotizacion_sin_respuesta:' || c.id
  from public.cotizaciones c
  left join public.empresas e on e.id = c.empresa_id
  cross join public.miembros m
  where m.activo and not c.archivado and c.estado = 'enviada'
    and c.fecha_emision < hoy - dias_sin
  on conflict (destinatario_id, clave) do nothing;
end;
$$;

-- 5) Resumen diario a las 08:00 de Santiago (el job corre cada hora y solo actúa a esa hora)
create or replace function public.generar_resumen_diario()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  ahora timestamptz := now();
  hoy date := (ahora at time zone 'America/Santiago')::date;
  dias_sin int;
  v_vencidas int;
  v_por_vencer int;
  v_cotiz int;
  v_cliente_vencida text;
  v_cliente_cotiz text;
  detalle text;
  sugerencia text;
begin
  if extract(hour from (ahora at time zone 'America/Santiago')) <> 8 then
    return;
  end if;

  select c.dias_cotizacion_sin_respuesta into dias_sin from public.configuracion_crm c where c.id = 1;

  select count(*) into v_vencidas
  from public.facturas f
  where not f.archivado and f.estado_pago = 'pendiente' and f.fecha_vencimiento < hoy;

  select count(*) into v_por_vencer
  from public.facturas f
  where not f.archivado and f.estado_pago = 'pendiente' and f.fecha_vencimiento between hoy and hoy + 3;

  select count(*) into v_cotiz
  from public.cotizaciones c
  where not c.archivado and c.estado = 'enviada' and c.fecha_emision < hoy - dias_sin;

  select coalesce(e.nombre, 'sin cliente') into v_cliente_vencida
  from public.facturas f
  left join public.empresas e on e.id = f.empresa_id
  where not f.archivado and f.estado_pago = 'pendiente' and f.fecha_vencimiento < hoy
  order by f.fecha_vencimiento
  limit 1;

  select coalesce(e.nombre, 'sin cliente') into v_cliente_cotiz
  from public.cotizaciones c
  left join public.empresas e on e.id = c.empresa_id
  where not c.archivado and c.estado = 'enviada' and c.fecha_emision < hoy - dias_sin
  order by c.fecha_emision
  limit 1;

  detalle := 'Cobros vencidos: ' || v_vencidas
    || E'\nPor vencer (3 días): ' || v_por_vencer
    || E'\nCotizaciones sin respuesta: ' || v_cotiz;

  -- La sugerencia aparece solo cuando hay alerta de cobro o de cotización
  sugerencia := case
    when v_vencidas > 0 then 'Siguiente acción: cobrar a ' || v_cliente_vencida || '.'
    when v_cotiz > 0 then 'Siguiente acción: hacer seguimiento a la cotización de ' || v_cliente_cotiz || '.'
    else null
  end;
  if sugerencia is not null then
    detalle := detalle || E'\n\n' || sugerencia;
  end if;

  insert into public.notificaciones (destinatario_id, tipo, prioridad, titulo, detalle, clave)
  select m.id, 'resumen_diario', 'normal',
         'Resumen del día · ' || to_char(hoy, 'DD-MM-YYYY'),
         detalle,
         'resumen:' || hoy
  from public.miembros m
  where m.activo
  on conflict (destinatario_id, clave) do nothing;
end;
$$;

-- 6) Envío por correo vía Resend (pg_net). Un correo por clave, aunque haya varios destinatarios.
create or replace function public.enviar_notificaciones_email()
returns integer
language plpgsql
security definer
set search_path = public, vault, net
as $$
declare
  cfg record;
  api_key text;
  r record;
  enviados integer := 0;
begin
  select c.alertas_email_activo, c.alertas_email_destino, c.alertas_email_remitente
    into cfg
  from public.configuracion_crm c
  where c.id = 1;

  if not coalesce(cfg.alertas_email_activo, false)
     or cfg.alertas_email_destino is null
     or cfg.alertas_email_remitente is null then
    return 0;
  end if;

  select ds.decrypted_secret into api_key
  from vault.decrypted_secrets ds
  where ds.name = 'resend_alertas_api_key';

  if api_key is null then
    return 0;
  end if;

  for r in
    select distinct on (n.clave) n.clave, n.titulo, coalesce(n.detalle, '') as detalle
    from public.notificaciones n
    where n.enviada_email_en is null
      and (n.prioridad = 'alta' or n.tipo = 'resumen_diario')
      and n.created_at > now() - interval '2 days'
    order by n.clave, n.created_at
    limit 20
  loop
    perform net.http_post(
      url := 'https://api.resend.com/emails',
      headers := jsonb_build_object('Authorization', 'Bearer ' || api_key, 'Content-Type', 'application/json'),
      body := jsonb_build_object(
        'from', cfg.alertas_email_remitente,
        'to', jsonb_build_array(cfg.alertas_email_destino),
        'subject', r.titulo,
        'text', r.detalle || E'\n\nCRM: https://crm.p48.cl'
      )
    );
    update public.notificaciones
       set enviada_email_en = now()
     where clave = r.clave and enviada_email_en is null;
    enviados := enviados + 1;
  end loop;

  return enviados;
end;
$$;

-- Los jobs los ejecuta pg_cron como postgres: nadie más puede invocarlos por la API.
revoke execute on function public.generar_notificaciones() from public, anon, authenticated;
revoke execute on function public.generar_resumen_diario() from public, anon, authenticated;
revoke execute on function public.enviar_notificaciones_email() from public, anon, authenticated;

-- 7) Jobs de pg_cron (reprogramables: se borran si existen)
do $$
declare
  nombre text;
begin
  foreach nombre in array array['notificaciones-generar', 'notificaciones-resumen', 'notificaciones-enviar'] loop
    if exists (select 1 from cron.job where jobname = nombre) then
      perform cron.unschedule(nombre);
    end if;
  end loop;
end;
$$;

select cron.schedule('notificaciones-generar', '5 * * * *', $$select public.generar_notificaciones();$$);
select cron.schedule('notificaciones-resumen', '0 * * * *', $$select public.generar_resumen_diario();$$);
select cron.schedule('notificaciones-enviar', '*/10 * * * *', $$select public.enviar_notificaciones_email();$$);
