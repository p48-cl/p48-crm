import React, { useRef, useState } from 'react';
import { ImagePlus, Loader2 } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { useCRM } from '../../context/CRMContext';
import { parseSupabaseError } from '../../lib/errorHandler';

// URL pública del logo guardado en el bucket «logos» (null si no hay logo).
export const urlLogo = (logoPath?: string | null): string | null => {
  if (!logoPath || !supabase) return null;
  return supabase.storage.from('logos').getPublicUrl(logoPath).data.publicUrl;
};

interface LogoProps {
  nombre: string;
  logoPath?: string | null;
  size?: number; // px
  className?: string;
}

// Logo del cliente; si no hay, muestra la inicial sobre el color del módulo.
export const LogoEmpresa: React.FC<LogoProps> = ({ nombre, logoPath, size = 32, className = '' }) => {
  const [fallo, setFallo] = useState(false);
  const url = urlLogo(logoPath);
  const dim = { width: size, height: size };
  if (url && !fallo) {
    return (
      <img
        src={url}
        alt={`Logo de ${nombre}`}
        style={dim}
        onError={() => setFallo(true)}
        className={`rounded bg-white object-contain border border-[var(--c-line)] shrink-0 ${className}`}
      />
    );
  }
  return (
    <div
      style={{ ...dim, fontSize: Math.max(10, Math.round(size * 0.42)) }}
      className={`rounded bg-[var(--c-surface-3)] flex items-center justify-center font-bold text-[var(--module,var(--c-accent))] shrink-0 ${className}`}
      aria-hidden
    >
      {(nombre || '?').trim().charAt(0).toUpperCase()}
    </div>
  );
};

const MAX_LADO = 256;
const MAX_BYTES = 512 * 1024;
const TIPOS = ['image/png', 'image/jpeg', 'image/webp'];

// Reduce la imagen a MAX_LADO px y la codifica como WebP (o PNG si el navegador no lo soporta).
async function redimensionar(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const escala = Math.min(1, MAX_LADO / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * escala);
  canvas.height = Math.round(bitmap.height * escala);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No se pudo procesar la imagen');
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const webp = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/webp', 0.9));
  if (webp && webp.type === 'image/webp') return webp;
  const png = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/png'));
  if (!png) throw new Error('No se pudo codificar la imagen');
  return png;
}

interface SubirLogoProps {
  empresaId: string;
  nombre: string;
  logoPath?: string | null;
  size?: number;
}

// Logo editable: muestra el logo y permite reemplazarlo. Solo miembros (la base lo valida).
export const SubirLogo: React.FC<SubirLogoProps> = ({ empresaId, nombre, logoPath, size = 48 }) => {
  const { actualizarEmpresa } = useCRM();
  const input = useRef<HTMLInputElement>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isSupabaseConfigured || !supabase) {
    return <LogoEmpresa nombre={nombre} logoPath={logoPath} size={size} />;
  }

  const onArchivo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !supabase) return;
    setError(null);
    if (!TIPOS.includes(file.type)) return setError('Usa PNG, JPG o WebP');
    if (file.size > 5 * 1024 * 1024) return setError('La imagen original es muy pesada (máx. 5 MB)');
    setSubiendo(true);
    try {
      const blob = await redimensionar(file);
      if (blob.size > MAX_BYTES) throw new Error('La imagen sigue siendo muy pesada tras reducirla');
      const path = `${empresaId}/${Date.now()}.${blob.type === 'image/webp' ? 'webp' : 'png'}`;
      const { error: upErr } = await supabase.storage.from('logos').upload(path, blob, { contentType: blob.type, upsert: false });
      if (upErr) throw upErr;
      await actualizarEmpresa(empresaId, { logo_path: path });
      if (logoPath) await supabase.storage.from('logos').remove([logoPath]); // limpia el anterior
    } catch (err) {
      const msg = err instanceof Error ? err.message : parseSupabaseError(err as never);
      setError(msg);
    } finally {
      setSubiendo(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <LogoEmpresa nombre={nombre} logoPath={logoPath} size={size} />
      <div className="flex flex-col gap-1">
        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={subiendo}
          className="text-[11px] font-mono text-[var(--c-text-2)] hover:text-[var(--c-text)] flex items-center gap-1 disabled:opacity-50"
        >
          {subiendo ? <Loader2 className="w-3 h-3 animate-spin" /> : <ImagePlus className="w-3 h-3" />}
          {logoPath ? 'Cambiar logo' : 'Subir logo'}
        </button>
        {error && <span className="text-[10px] text-[var(--c-danger)]">{error}</span>}
        <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={onArchivo} />
      </div>
    </div>
  );
};
