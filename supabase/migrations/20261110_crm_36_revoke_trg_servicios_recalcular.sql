-- crm_36: quitar EXECUTE de trg_servicios_recalcular a anon/authenticated.
-- Es una función trigger: el disparo del trigger no requiere EXECUTE para el rol que hace DML.
-- Aplicada en Supabase (zvhymheqtkfcvtpkooxi) como crm_36_revoke_trg_servicios_recalcular.
revoke execute on function public.trg_servicios_recalcular() from anon, authenticated, public;
