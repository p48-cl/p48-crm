-- Contactos: teléfono fijo opcional como medio secundario. `telefono` queda como celular principal.
alter table public.contactos add column if not exists telefono_fijo text;
comment on column public.contactos.telefono is 'Celular: teléfono principal del contacto';
comment on column public.contactos.telefono_fijo is 'Teléfono fijo opcional: medio de contacto secundario';
