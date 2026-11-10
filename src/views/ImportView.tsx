import React, { useState } from 'react';
import {
  UploadCloud,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Database,
  Building2,
  Users,
} from 'lucide-react';
import { useCRM } from '../context/CRMContext';

export const ImportView: React.FC = () => {
  const { empresas, contactos, importarCSVRelacional } = useCRM();

  const [step, setStep] = useState<'upload' | 'mapping' | 'preview' | 'completed'>('upload');
  const [, setCsvContent] = useState<string>('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);

  // Mapeo de columnas
  const [mapping, setMapping] = useState({
    nombreEmpresa: '',
    rut: '',
    dominioWeb: '',
    tamano: '',
    nombreContacto: '',
    apellidoContacto: '',
    emailContacto: '',
    cargoContacto: '',
    telefonoContacto: '',
  });

  const [resultadoImportacion, setResultadoImportacion] = useState<{
    empresasCreadas: number;
    contactosCreados: number;
    duplicadosSaltados: number;
    erroresPorFila: Array<{ fila: number; error: string }>;
  } | null>(null);

  // Manejar subida de archivo CSV
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      procesarCSV(text);
    };
    reader.readAsText(file);
  };

  const handleCargarEjemplo = () => {
    const ejemploCSV = `Empresa,RUT,Dominio,Contacto,Apellido,Email,Cargo,Telefono
Inversiones del Maule SpA,76.444.111-2,inversionesmaule.cl,Patricio,Munoz,pmunoz@inversionesmaule.cl,Gerente de Finanzas,+56 9 9123 4567
FinTech Andes SpA,768421902,fintechandes.cl,Felipe,Contreras,felipe@fintechandes.cl,Head of Growth,+56 9 8877 6655
Clinica Dental Santiago,77.890.123-4,dentalsantiago.cl,Valeria,Acuña,valeria@dentalsantiago.cl,Directora Ejecutiva,+56 9 8234 5678
Transportes del Norte,96.111.222-3,transnorte.cl,Carlos,Fuentes,cfuentes@transnorte.cl,Jefe de Logistica,+56 9 7345 6789`;
    procesarCSV(ejemploCSV);
  };

  const procesarCSV = (text: string) => {
    setCsvContent(text);
    const lineas = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    if (lineas.length < 2) return;

    // Detectar separador (coma o punto y coma)
    const sep = lineas[0].includes(';') ? ';' : ',';
    const hdrs = lineas[0].split(sep).map((h) => h.trim().replace(/^["']|["']$/g, ''));
    const dataRows = lineas.slice(1).map((l) =>
      l.split(sep).map((col) => col.trim().replace(/^["']|["']$/g, ''))
    );

    setHeaders(hdrs);
    setRows(dataRows);

    // Auto-mapeo inteligente
    const autoMap: typeof mapping = {
      nombreEmpresa: hdrs.find((h) => /empresa|company|razon/i.test(h)) || '',
      rut: hdrs.find((h) => /rut|ident/i.test(h)) || '',
      dominioWeb: hdrs.find((h) => /dominio|web|sitio|url/i.test(h)) || '',
      tamano: hdrs.find((h) => /tamano|tam|empleados/i.test(h)) || '',
      nombreContacto: hdrs.find((h) => /contacto|nombre/i.test(h)) || '',
      apellidoContacto: hdrs.find((h) => /apellido/i.test(h)) || '',
      emailContacto: hdrs.find((h) => /email|correo/i.test(h)) || '',
      cargoContacto: hdrs.find((h) => /cargo|puesto|rol/i.test(h)) || '',
      telefonoContacto: hdrs.find((h) => /telefono|celular|fono/i.test(h)) || '',
    };

    setMapping(autoMap);
    setStep('mapping');
  };

  // Convertir filas mapeadas
  const registrosMapeados = React.useMemo(() => {
    if (step !== 'preview' && step !== 'completed') return [];

    const getVal = (row: string[], colName: string) => {
      const idx = headers.indexOf(colName);
      return idx >= 0 ? row[idx] || '' : '';
    };

    return rows.map((row) => {
      const nomEmp = getVal(row, mapping.nombreEmpresa);
      const rutEmp = getVal(row, mapping.rut);
      const domEmp = getVal(row, mapping.dominioWeb);
      const nomCon = getVal(row, mapping.nombreContacto);
      const apeCon = getVal(row, mapping.apellidoContacto);
      const emailCon = getVal(row, mapping.emailContacto);
      const carCon = getVal(row, mapping.cargoContacto);
      const telCon = getVal(row, mapping.telefonoContacto);

      // Verificación de duplicados antes de confirmar
      const esDuplicadoEmpresa = empresas.some(
        (e) =>
          (domEmp && e.dominio_web?.toLowerCase() === domEmp.toLowerCase()) ||
          (nomEmp && e.nombre.toLowerCase() === nomEmp.toLowerCase())
      );

      const esDuplicadoContacto = emailCon
        ? contactos.some((c) => c.email.toLowerCase() === emailCon.toLowerCase())
        : false;

      return {
        empresa: {
          nombre: nomEmp,
          rut: rutEmp,
          dominio_web: domEmp,
        },
        contacto: {
          nombre: nomCon,
          apellido: apeCon,
          email: emailCon,
          cargo: carCon,
          telefono: telCon,
        },
        esDuplicado: esDuplicadoEmpresa || esDuplicadoContacto,
        motivoDuplicado: esDuplicadoEmpresa
          ? 'Cliente ya existe por nombre o dominio'
          : esDuplicadoContacto
          ? 'Contacto ya existe por correo'
          : '',
      };
    });
  }, [rows, headers, mapping, step, empresas, contactos]);

  const handleConfirmarImportacion = async () => {
    const payload = rows
      .map((row) => {
        const getVal = (colName: string) => {
          const idx = headers.indexOf(colName);
          return idx >= 0 ? row[idx] || '' : '';
        };
        return {
          nombreEmpresa: getVal(mapping.nombreEmpresa),
          rutEmpresa: getVal(mapping.rut),
          dominioWeb: getVal(mapping.dominioWeb),
          nombreContacto: getVal(mapping.nombreContacto),
          apellidoContacto: getVal(mapping.apellidoContacto),
          emailContacto: getVal(mapping.emailContacto),
          cargoContacto: getVal(mapping.cargoContacto),
          telefonoContacto: getVal(mapping.telefonoContacto),
        };
      })
      .filter((r) => r.nombreEmpresa.trim());

    const resultado = await importarCSVRelacional(payload);
    setResultadoImportacion(resultado);
    setStep('completed');
  };

  const duplicadosTotales = registrosMapeados.filter((r) => r.esDuplicado).length;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold font-sans text-[var(--c-text)]">
            Importador de Clientes y Contactos
          </h1>
          <p className="text-xs text-[var(--c-muted)] mt-0.5">
            Carga masiva vía CSV con detección de duplicados y mapeo relacional
          </p>
        </div>
      </div>

      {/* Indicador de pasos */}
      <div className="flex items-center gap-3 p-3 bg-[var(--c-surface)] rounded-lg border border-[var(--c-line)] text-xs font-mono">
        <span className={step === 'upload' ? 'text-[var(--c-accent)] font-bold' : 'text-[var(--c-muted-2)]'}>
          1. Subir CSV
        </span>
        <ArrowRight className="w-3.5 h-3.5 text-[var(--c-muted-2)]" />
        <span className={step === 'mapping' ? 'text-[var(--c-accent)] font-bold' : 'text-[var(--c-muted-2)]'}>
          2. Mapear Columnas
        </span>
        <ArrowRight className="w-3.5 h-3.5 text-[var(--c-muted-2)]" />
        <span className={step === 'preview' ? 'text-[var(--c-accent)] font-bold' : 'text-[var(--c-muted-2)]'}>
          3. Previsualizar & Duplicados
        </span>
        <ArrowRight className="w-3.5 h-3.5 text-[var(--c-muted-2)]" />
        <span className={step === 'completed' ? 'text-[var(--c-accent)] font-bold' : 'text-[var(--c-muted-2)]'}>
          4. Confirmación
        </span>
      </div>

      {/* PASO 1: SUBIR CSV */}
      {step === 'upload' && (
        <div className="p-8 bg-[var(--c-surface)] rounded-xl border border-[var(--c-line)] text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-[var(--c-surface-2)] border border-[var(--c-line)] flex items-center justify-center mx-auto text-[var(--c-accent)]">
            <UploadCloud className="w-7 h-7" />
          </div>

          <div>
            <h3 className="text-sm font-semibold text-[var(--c-text)]">Selecciona un archivo CSV</h3>
            <p className="text-xs text-[var(--c-muted)] max-w-md mx-auto mt-1">
              Exportaciones de bases de datos B2B, LinkedIn Sales Navigator o planillas internas con datos de empresas y personas.
            </p>
          </div>

          <div className="flex justify-center gap-3 pt-2">
            <label className="bg-[var(--c-accent)] hover:bg-[var(--c-accent-hover)] text-[var(--c-on-accent)] font-semibold text-xs py-2.5 px-4 rounded cursor-pointer transition-colors">
              <span>Examinar archivo CSV...</span>
              <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
            </label>

            <button
              onClick={handleCargarEjemplo}
              className="bg-[var(--c-surface-2)] hover:bg-[var(--c-line)] text-[var(--c-line)] text-xs py-2.5 px-4 rounded border border-[var(--c-line)] transition-colors"
            >
              Cargar CSV de prueba (Demo)
            </button>
          </div>
        </div>
      )}

      {/* PASO 2: MAPEO DE COLUMNAS */}
      {step === 'mapping' && (
        <div className="p-6 bg-[var(--c-surface)] rounded-xl border border-[var(--c-line)] space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-[var(--c-text)]">Mapeo de Columnas</h3>
              <p className="text-xs text-[var(--c-muted)]">
                Asocia las columnas de tu CSV con los campos de la base de datos de P48.
              </p>
            </div>
            <span className="font-mono text-xs text-[var(--c-accent)]">{rows.length} filas detectadas</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* Campos Empresa */}
            <div className="p-4 bg-[var(--c-surface)] rounded border border-[var(--c-line)] space-y-3">
              <h4 className="font-semibold text-[var(--c-accent)] flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5" />
                <span>Datos del cliente</span>
              </h4>

              <div>
                <label className="block text-[11px] text-[var(--c-text-2)] mb-1">
                  Nombre del cliente <span className="text-[var(--c-accent)]">*</span>
                </label>
                <select
                  value={mapping.nombreEmpresa}
                  onChange={(e) => setMapping({ ...mapping, nombreEmpresa: e.target.value })}
                  className="w-full bg-[var(--c-surface-2)] border border-[var(--c-line)] rounded px-2.5 py-1.5 text-xs text-[var(--c-text)]"
                >
                  <option value="">Selecciona columna...</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-[var(--c-text-2)] mb-1">RUT</label>
                <select
                  value={mapping.rut}
                  onChange={(e) => setMapping({ ...mapping, rut: e.target.value })}
                  className="w-full bg-[var(--c-surface-2)] border border-[var(--c-line)] rounded px-2.5 py-1.5 text-xs text-[var(--c-text)]"
                >
                  <option value="">(Opcional) Columna...</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-[var(--c-text-2)] mb-1">Dominio Web</label>
                <select
                  value={mapping.dominioWeb}
                  onChange={(e) => setMapping({ ...mapping, dominioWeb: e.target.value })}
                  className="w-full bg-[var(--c-surface-2)] border border-[var(--c-line)] rounded px-2.5 py-1.5 text-xs text-[var(--c-text)]"
                >
                  <option value="">(Opcional) Columna...</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Campos Contacto */}
            <div className="p-4 bg-[var(--c-surface)] rounded border border-[var(--c-line)] space-y-3">
              <h4 className="font-semibold text-[var(--c-info)] flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                <span>Contacto Asociado (Opcional)</span>
              </h4>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] text-[var(--c-text-2)] mb-1">Nombre</label>
                  <select
                    value={mapping.nombreContacto}
                    onChange={(e) => setMapping({ ...mapping, nombreContacto: e.target.value })}
                    className="w-full bg-[var(--c-surface-2)] border border-[var(--c-line)] rounded px-2.5 py-1.5 text-xs text-[var(--c-text)]"
                  >
                    <option value="">Columna...</option>
                    {headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-[var(--c-text-2)] mb-1">Apellido</label>
                  <select
                    value={mapping.apellidoContacto}
                    onChange={(e) => setMapping({ ...mapping, apellidoContacto: e.target.value })}
                    className="w-full bg-[var(--c-surface-2)] border border-[var(--c-line)] rounded px-2.5 py-1.5 text-xs text-[var(--c-text)]"
                  >
                    <option value="">Columna...</option>
                    {headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-[var(--c-text-2)] mb-1">Email</label>
                <select
                  value={mapping.emailContacto}
                  onChange={(e) => setMapping({ ...mapping, emailContacto: e.target.value })}
                  className="w-full bg-[var(--c-surface-2)] border border-[var(--c-line)] rounded px-2.5 py-1.5 text-xs text-[var(--c-text)]"
                >
                  <option value="">Columna...</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] text-[var(--c-text-2)] mb-1">Cargo</label>
                  <select
                    value={mapping.cargoContacto}
                    onChange={(e) => setMapping({ ...mapping, cargoContacto: e.target.value })}
                    className="w-full bg-[var(--c-surface-2)] border border-[var(--c-line)] rounded px-2.5 py-1.5 text-xs text-[var(--c-text)]"
                  >
                    <option value="">Columna...</option>
                    {headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-[var(--c-text-2)] mb-1">Teléfono</label>
                  <select
                    value={mapping.telefonoContacto}
                    onChange={(e) => setMapping({ ...mapping, telefonoContacto: e.target.value })}
                    className="w-full bg-[var(--c-surface-2)] border border-[var(--c-line)] rounded px-2.5 py-1.5 text-xs text-[var(--c-text)]"
                  >
                    <option value="">Columna...</option>
                    {headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center pt-3 border-t border-[var(--c-line)]">
            <button
              onClick={() => setStep('upload')}
              className="text-xs text-[var(--c-muted)] hover:text-[var(--c-text)]"
            >
              ← Volver
            </button>
            <button
              disabled={!mapping.nombreEmpresa}
              onClick={() => setStep('preview')}
              className="bg-[var(--c-accent)] hover:bg-[var(--c-accent-hover)] disabled:opacity-40 text-[var(--c-on-accent)] font-semibold text-xs py-2 px-4 rounded flex items-center gap-1.5 transition-colors"
            >
              <span>Continuar a Previsualización</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* PASO 3: PREVISUALIZACIÓN Y DETECCIÓN DE DUPLICADOS */}
      {step === 'preview' && (
        <div className="p-6 bg-[var(--c-surface)] rounded-xl border border-[var(--c-line)] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-[var(--c-text)]">
                Previsualización y Control de Duplicados
              </h3>
              <p className="text-xs text-[var(--c-muted)]">
                Verifica antes de escribir en la base de datos de Supabase
              </p>
            </div>

            {duplicadosTotales > 0 && (
              <div className="flex items-center gap-1.5 text-xs font-mono text-[var(--c-danger)] bg-[var(--c-surface-2)] px-2.5 py-1 rounded border border-[var(--c-danger)]/30">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>{duplicadosTotales} duplicados detectados (se omitirán)</span>
              </div>
            )}
          </div>

          {/* Tabla de Previsualización */}
          <div className="border border-[var(--c-line)] rounded-lg overflow-x-auto max-h-72">
            <table className="w-full text-left text-xs">
              <thead className="bg-[var(--c-surface-2)] border-b border-[var(--c-line)] text-[var(--c-muted)] font-mono text-[10px] uppercase">
                <tr>
                  <th className="py-2 px-3">Estado</th>
                  <th className="py-2 px-3">Cliente</th>
                  <th className="py-2 px-3">RUT</th>
                  <th className="py-2 px-3">Dominio</th>
                  <th className="py-2 px-3">Contacto</th>
                  <th className="py-2 px-3">Email</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--c-line)]">
                {registrosMapeados.map((r, i) => (
                  <tr
                    key={i}
                    className={r.esDuplicado ? 'bg-[var(--c-surface-2)]/50' : 'hover:bg-[var(--c-surface-2)]'}
                  >
                    <td className="py-2 px-3 font-mono text-[11px]">
                      {r.esDuplicado ? (
                        <span className="text-[var(--c-danger)] flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          <span>Duplicado</span>
                        </span>
                      ) : (
                        <span className="text-[var(--c-accent)] flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Nuevo</span>
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3 font-medium text-[var(--c-text)]">{r.empresa.nombre}</td>
                    <td className="py-2 px-3 font-mono text-[var(--c-text-2)]">{r.empresa.rut || '—'}</td>
                    <td className="py-2 px-3 font-mono text-[var(--c-text-2)]">{r.empresa.dominio_web || '—'}</td>
                    <td className="py-2 px-3 text-[var(--c-line)]">
                      {r.contacto.nombre} {r.contacto.apellido}
                    </td>
                    <td className="py-2 px-3 font-mono text-[var(--c-text-2)]">{r.contacto.email || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between items-center pt-3 border-t border-[var(--c-line)]">
            <button
              onClick={() => setStep('mapping')}
              className="text-xs text-[var(--c-muted)] hover:text-[var(--c-text)]"
            >
              ← Modificar Mapeo
            </button>

            <button
              onClick={handleConfirmarImportacion}
              className="bg-[var(--c-accent)] hover:bg-[var(--c-accent-hover)] text-[var(--c-on-accent)] font-semibold text-xs py-2 px-4 rounded flex items-center gap-1.5 transition-colors"
            >
              <Database className="w-3.5 h-3.5" />
              <span>Confirmar e Importar {registrosMapeados.length - duplicadosTotales} Registros</span>
            </button>
          </div>
        </div>
      )}

      {/* PASO 4: IMPORTACIÓN COMPLETADA */}
      {step === 'completed' && resultadoImportacion && (
        <div className="p-8 bg-[var(--c-surface)] rounded-xl border border-[var(--c-line)] text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-[var(--c-accent)]/15 text-[var(--c-accent)] flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-7 h-7" />
          </div>

          <div>
            <h3 className="text-base font-bold text-[var(--c-text)]">¡Importación Completada!</h3>
            <p className="text-xs text-[var(--c-muted)] mt-1">
              Los registros fueron incorporados correctamente al CRM.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 max-w-md mx-auto pt-2 text-xs">
            <div className="p-3 bg-[var(--c-surface-2)] rounded border border-[var(--c-line)]">
              <p className="font-mono text-lg font-bold text-[var(--c-accent)]">
                {resultadoImportacion.empresasCreadas}
              </p>
              <p className="text-[10px] text-[var(--c-muted)]">Clientes creados</p>
            </div>
            <div className="p-3 bg-[var(--c-surface-2)] rounded border border-[var(--c-line)]">
              <p className="font-mono text-lg font-bold text-[var(--c-info)]">
                {resultadoImportacion.contactosCreados}
              </p>
              <p className="text-[10px] text-[var(--c-muted)]">Contactos Creados</p>
            </div>
            <div className="p-3 bg-[var(--c-surface-2)] rounded border border-[var(--c-line)]">
              <p className="font-mono text-lg font-bold text-[var(--c-text-2)]">
                {resultadoImportacion.duplicadosSaltados}
              </p>
              <p className="text-[10px] text-[var(--c-muted)]">Duplicados Omitidos</p>
            </div>
          </div>

          {resultadoImportacion.erroresPorFila && resultadoImportacion.erroresPorFila.length > 0 && (
            <div className="mt-4 p-4 bg-[var(--c-surface-2)] rounded-lg border border-[var(--c-line)] text-left max-w-lg mx-auto">
              <div className="flex items-center gap-2 mb-2 text-[var(--c-danger)]">
                <AlertTriangle className="w-4 h-4" />
                <h4 className="text-xs font-semibold">Filas no procesadas ({resultadoImportacion.erroresPorFila.length})</h4>
              </div>
              <div className="max-h-40 overflow-y-auto space-y-1.5 text-xs">
                {resultadoImportacion.erroresPorFila.map((err, i) => (
                  <div key={i} className="flex items-start gap-2 text-[11px] p-2 bg-[var(--c-surface)] rounded border border-[var(--c-line)]">
                    <span className="font-mono font-bold text-[var(--c-danger)]">Fila {err.fila}:</span>
                    <span className="text-[var(--c-text-2)]">{err.error}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="pt-4">
            <button
              onClick={() => {
                setStep('upload');
                setCsvContent('');
              }}
              className="bg-[var(--c-surface-2)] hover:bg-[var(--c-surface-3)] text-[var(--c-text)] text-xs py-2 px-4 rounded transition-colors"
            >
              Cargar Otro Archivo
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
