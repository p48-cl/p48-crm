# Arquitectura · CRM P48

Documento vivo. Describe el sistema tal como está en `main`. Cada cambio de arquitectura se anota también en `CHANGELOG.md`.

## 1. Piezas
| Pieza | Qué hace | Dónde vive |
|---|---|---|
| Frontend | React + Vite + Tailwind. Toda la interfaz. | Este repo (`src/`) |
| Base de datos | Postgres con RLS. Reglas de negocio en triggers. | Supabase, proyecto `zvhymheqtkfcvtpkooxi` |
| Autenticación | Google OAuth. Solo Google, sin contraseña. | Supabase Auth + Google Cloud (cliente "CRM P48 web") |
| Hosting | Despliegue automático desde `main`. | Vercel, proyecto `crm-p48` (plan Hobby, pendiente de migrar) |
| Dominio | `crm.p48.cl` apunta a Vercel por CNAME. | Bluehost (DNS). El sitio `p48.cl` es otro servicio. |
| Repo | Código y migraciones de referencia. | GitHub `p48-cl/p48-crm` |

## 2. Flujo de acceso
1. El usuario entra con Google.
2. `vincular_miembro()` busca su correo entre los miembros activos.
3. Si es miembro: entra al CRM interno y se carga `CRMProvider` (datos internos).
4. Si no es miembro: `vincular_cliente()` lo vincula por correo a `cliente_usuarios`. Si queda vinculado, entra al portal (`PortalView`) y no se carga ningún dato interno.
5. Si no es ninguno: pantalla de acceso restringido y cierre de sesión.

Ningún usuario recibe permisos por defecto. Las tablas tienen RLS activo y, para `anon`, sin acceso.

## 3. Roles y permisos
| Rol | Dónde se define | Qué puede |
|---|---|---|
| Miembro (`miembros.rol = miembro`) | Tabla `miembros` | Leer y editar CRM, empresas, oportunidades, tareas, proyectos y entregables. |
| Admin (`miembros.rol = admin`) | Tabla `miembros` | Lo de miembro, más borrar y administrar miembros y catálogos. |
| Cliente (`cliente_usuarios`) | Tabla `cliente_usuarios` | Solo lectura de su empresa, sus proyectos visibles, sus entregables visibles y sus reportes visibles. |
| Anónimo | — | Nada. |

Funciones que sostienen las reglas (SECURITY DEFINER, necesarias para RLS): `es_miembro()`, `es_admin()`, `mi_miembro_id()`, `empresas_del_cliente()`. Las funciones de vinculación y desactivación validan quién las llama.

## 4. Modelo de datos (resumen)
- **Comercial:** `empresas`, `contactos`, `oportunidades` (con `valor_ponderado` calculado y `fecha_cierre_real`), `etapas`, `motivos_perdida`, `fuentes`, `industrias`, `actividades`, `tareas`.
- **Calificación:** `plantillas_calificacion`, `criterios_calificacion`, `evaluaciones_oportunidad`, vista `v_calificacion_oportunidad`.
- **Clientes:** `proyectos`, `entregables`, `entregables_internos` (notas, solo miembros), `reportes`, `cliente_usuarios`, `accesos_admin_marketing`.
- **Auditoría:** `audit_log`.

## 5. Vistas
- **Internas:** `v_oportunidades`, `v_pipeline_por_etapa`, `v_oportunidades_por_fuente`, `v_motivos_perdida`, `v_dash_*` (resultados, embudo, forecast, pipeline por responsable, cartera, tareas por responsable). Todas con `security_invoker`.
- **Portal:** `portal_empresa`, `portal_proyectos`, `portal_entregables`, `portal_reportes`. Con `security_invoker`, filtran por la empresa del cliente vinculado.

## 6. Reglas de negocio (en la base, no en el navegador)
- Probabilidad por etapa al cambiar de etapa.
- Motivo de pérdida obligatorio al pasar a perdida.
- Al ganar: la empresa pasa a `cliente`.
- Al cerrar una oportunidad: se registra `fecha_cierre_real`.
- Tareas: `completada` y `fecha_completada` coherentes.
- Auditoría de cambios en las tablas principales.

## 7. Frontend: estructura
- `src/context/AuthContext.tsx`: sesión, vinculación de miembro o cliente.
- `src/context/CRMContext.tsx`: datos internos y mutaciones. Nunca se monta para clientes.
- `src/App.tsx`: `CapaRouter` decide entre CRM interno y portal.
- `src/views/`: pantallas del CRM. `src/views/PortalView.tsx`: portal de clientes.
- `src/components/dashboard/AgencyDashboard.tsx`: dashboard por pestañas.
- `src/components/clientes/ClientePanel.tsx`: ficha de cliente (proyectos, entregables, reportes, accesos).
- Reglas de seguridad en la interfaz: los enlaces externos se validan como http o https; Looker solo se incrusta desde dominios de Google.

## 8. Configuración
Variables de entorno (en Vercel, nunca en el repo):
- `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`: públicas por diseño. Seguridad real = RLS.
- `VITE_MODO_DEMO=false` en producción.
Nunca usar la clave `service_role` en el frontend.

## 9. Riesgos conocidos
- Repo público: el código es legible. Pendiente: repo privado.
- Hosting en Hobby: uso no comercial. Pendiente: Cloudflare Pages (gratis y permite uso comercial) o Vercel Pro.
- Supabase plan gratis: sin respaldos automáticos. Pendiente: exportación semanal.
- Login de clientes externos: OAuth en modo "Interno". Pendiente: cambiar a "Externo" y probarlo con un correo no registrado.
- Funciones SECURITY DEFINER marcadas por el asesor de Supabase: intencionales, pero revisar cada una al agregar funciones nuevas.

## 10. Lo que viene (sin construir)
- Leads del sitio con deduplicación (entrada por función firmada).
- Cotizaciones con planes A–E, setup, comisión de pauta e IVA.
- Finanzas: facturas registradas, cobranza, MRR y flujo de caja.
- Agenda y tareas por persona con Google Calendar.
- Conector de datos de marketing (P48 Marketing) solo desde el servidor.
