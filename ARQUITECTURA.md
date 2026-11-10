# Arquitectura · CRM P48
| crm_29 | logos_empresas | `empresas.logo_path` + bucket público `logos` (PNG/JPG/WebP, máx. 512 KB). Escritura solo para miembros (`es_miembro()`) |

| crm_29 | logos_empresas | `empresas.logo_path` + bucket público `logos` (PNG/JPG/WebP, máx. 512 KB). Escritura solo para miembros (`es_miembro()`) |
Documento vivo. Describe el sistema tal como está en `main`. Cada cambio de arquitectura se anota también en `CHANGELOG.md`. Revisado contra la base el 3 de noviembre de 2026.
| crm_29 | logos_empresas | `empresas.logo_path` + bucket público `logos` (PNG/JPG/WebP, máx. 512 KB). Escritura solo para miembros (`es_miembro()`) |

| crm_29 | logos_empresas | `empresas.logo_path` + bucket público `logos` (PNG/JPG/WebP, máx. 512 KB). Escritura solo para miembros (`es_miembro()`) |
## 1. Piezas
| crm_29 | logos_empresas | `empresas.logo_path` + bucket público `logos` (PNG/JPG/WebP, máx. 512 KB). Escritura solo para miembros (`es_miembro()`) |
| Pieza | Qué hace | Dónde vive |
| crm_29 | logos_empresas | `empresas.logo_path` + bucket público `logos` (PNG/JPG/WebP, máx. 512 KB). Escritura solo para miembros (`es_miembro()`) |
|---|---|---|
| crm_29 | logos_empresas | `empresas.logo_path` + bucket público `logos` (PNG/JPG/WebP, máx. 512 KB). Escritura solo para miembros (`es_miembro()`) |
| Frontend | React + Vite + Tailwind. Toda la interfaz. | Este repo (`src/`) |
| crm_29 | logos_empresas | `empresas.logo_path` + bucket público `logos` (PNG/JPG/WebP, máx. 512 KB). Escritura solo para miembros (`es_miembro()`) |
| Base de datos | Postgres con RLS. Reglas de negocio en triggers. | Supabase, proyecto `zvhymheqtkfcvtpkooxi` |
| crm_29 | logos_empresas | `empresas.logo_path` + bucket público `logos` (PNG/JPG/WebP, máx. 512 KB). Escritura solo para miembros (`es_miembro()`) |
| Autenticación | Google OAuth. Solo Google, sin contraseña. | Supabase Auth + Google Cloud (cliente "CRM P48 web") |
| crm_29 | logos_empresas | `empresas.logo_path` + bucket público `logos` (PNG/JPG/WebP, máx. 512 KB). Escritura solo para miembros (`es_miembro()`) |
| Hosting | Despliegue automático desde `main`. | Vercel, proyecto `crm-p48` (plan Hobby, pendiente de migrar) |
| crm_29 | logos_empresas | `empresas.logo_path` + bucket público `logos` (PNG/JPG/WebP, máx. 512 KB). Escritura solo para miembros (`es_miembro()`) |
| Dominio | `crm.p48.cl` apunta a Vercel por CNAME. | Bluehost (DNS). El sitio `p48.cl` es otro servicio. |
| crm_29 | logos_empresas | `empresas.logo_path` + bucket público `logos` (PNG/JPG/WebP, máx. 512 KB). Escritura solo para miembros (`es_miembro()`) |
| Repo | Código, migraciones de referencia y datos demo. | GitHub `p48-cl/p48-crm` |
| crm_29 | logos_empresas | `empresas.logo_path` + bucket público `logos` (PNG/JPG/WebP, máx. 512 KB). Escritura solo para miembros (`es_miembro()`) |

| crm_29 | logos_empresas | `empresas.logo_path` + bucket público `logos` (PNG/JPG/WebP, máx. 512 KB). Escritura solo para miembros (`es_miembro()`) |
## 2. Flujo de acceso
| crm_29 | logos_empresas | `empresas.logo_path` + bucket público `logos` (PNG/JPG/WebP, máx. 512 KB). Escritura solo para miembros (`es_miembro()`) |
1. El usuario entra con Google.
| crm_29 | logos_empresas | `empresas.logo_path` + bucket público `logos` (PNG/JPG/WebP, máx. 512 KB). Escritura solo para miembros (`es_miembro()`) |
2. `vincular_miembro()` busca su correo entre los miembros activos (solo dominio `@p48.cl`).
| crm_29 | logos_empresas | `empresas.logo_path` + bucket público `logos` (PNG/JPG/WebP, máx. 512 KB). Escritura solo para miembros (`es_miembro()`) |
3. Si es miembro: entra al CRM interno y se carga `CRMProvider` (datos internos).
| crm_29 | logos_empresas | `empresas.logo_path` + bucket público `logos` (PNG/JPG/WebP, máx. 512 KB). Escritura solo para miembros (`es_miembro()`) |
4. Si no es miembro: `vincular_cliente()` lo vincula por correo a `cliente_usuarios`. Si queda vinculado, entra al portal (`PortalView`) y no se carga ningún dato interno.
| crm_29 | logos_empresas | `empresas.logo_path` + bucket público `logos` (PNG/JPG/WebP, máx. 512 KB). Escritura solo para miembros (`es_miembro()`) |
5. Si no es ninguno: pantalla de acceso restringido y cierre de sesión.
| crm_29 | logos_empresas | `empresas.logo_path` + bucket público `logos` (PNG/JPG/WebP, máx. 512 KB). Escritura solo para miembros (`es_miembro()`) |

| crm_29 | logos_empresas | `empresas.logo_path` + bucket público `logos` (PNG/JPG/WebP, máx. 512 KB). Escritura solo para miembros (`es_miembro()`) |
Ningún usuario recibe permisos por defecto. Las tablas tienen RLS activo y, para `anon`, sin acceso.
| crm_29 | logos_empresas | `empresas.logo_path` + bucket público `logos` (PNG/JPG/WebP, máx. 512 KB). Escritura solo para miembros (`es_miembro()`) |

| crm_29 | logos_empresas | `empresas.logo_path` + bucket público `logos` (PNG/JPG/WebP, máx. 512 KB). Escritura solo para miembros (`es_miembro()`) |
Modo demo local: solo si `VITE_MODO_DEMO=true`. En ese modo `AuthContext` y `CRMContext` usan `lib/mockData.ts` en vez de Supabase. En producción debe estar en `false`.
| crm_29 | logos_empresas | `empresas.logo_path` + bucket público `logos` (PNG/JPG/WebP, máx. 512 KB). Escritura solo para miembros (`es_miembro()`) |

| crm_29 | logos_empresas | `empresas.logo_path` + bucket público `logos` (PNG/JPG/WebP, máx. 512 KB). Escritura solo para miembros (`es_miembro()`) |
## 3. Roles y permisos
| crm_29 | logos_empresas | `empresas.logo_path` + bucket público `logos` (PNG/JPG/WebP, máx. 512 KB). Escritura solo para miembros (`es_miembro()`) |
| Rol | Dónde se define | Qué puede |
| crm_29 | logos_empresas | `empresas.logo_path` + bucket público `logos` (PNG/JPG/WebP, máx. 512 KB). Escritura solo para miembros (`es_miembro()`) |
|---|---|---|
| crm_29 | logos_empresas | `empresas.logo_path` + bucket público `logos` (PNG/JPG/WebP, máx. 512 KB). Escritura solo para miembros (`es_miembro()`) |
| Miembro (`miembros.rol = miembro`) | Tabla `miembros` | Leer y editar CRM, empresas, oportunidades, tareas, proyectos, entregables y métricas. |
| crm_29 | logos_empresas | `empresas.logo_path` + bucket público `logos` (PNG/JPG/WebP, máx. 512 KB). Escritura solo para miembros (`es_miembro()`) |
| Admin (`miembros.rol = admin`) | Tabla `miembros` | Lo de miembro, más borrar, administrar miembros, catálogos y pipeline. |
| crm_29 | logos_empresas | `empresas.logo_path` + bucket público `logos` (PNG/JPG/WebP, máx. 512 KB). Escritura solo para miembros (`es_miembro()`) |
| Cliente (`cliente_usuarios`) | Tabla `cliente_usuarios` | Solo lectura de su empresa, sus proyectos visibles, sus entregables visibles y sus reportes visibles. |
| crm_29 | logos_empresas | `empresas.logo_path` + bucket público `logos` (PNG/JPG/WebP, máx. 512 KB). Escritura solo para miembros (`es_miembro()`) |
| Anónimo | — | Nada. |
| crm_29 | logos_empresas | `empresas.logo_path` + bucket público `logos` (PNG/JPG/WebP, máx. 512 KB). Escritura solo para miembros (`es_miembro()`) |

| crm_29 | logos_empresas | `empresas.logo_path` + bucket público `logos` (PNG/JPG/WebP, máx. 512 KB). Escritura solo para miembros (`es_miembro()`) |
Funciones que sostienen las reglas (SECURITY DEFINER, necesarias para RLS): `es_miembro()`, `es_admin()`, `mi_miembro_id()`, `empresas_del_cliente()`. `desactivar_miembro()` valida `es_admin()` dentro de la función. `vincular_miembro()` y `vincular_cliente()` solo vinculan por el correo verificado de Google.
| crm_29 | logos_empresas | `empresas.logo_path` + bucket público `logos` (PNG/JPG/WebP, máx. 512 KB). Escritura solo para miembros (`es_miembro()`) |

| crm_29 | logos_empresas | `empresas.logo_path` + bucket público `logos` (PNG/JPG/WebP, máx. 512 KB). Escritura solo para miembros (`es_miembro()`) |
## 4. Modelo de datos
| crm_29 | logos_empresas | `empresas.logo_path` + bucket público `logos` (PNG/JPG/WebP, máx. 512 KB). Escritura solo para miembros (`es_miembro()`) |

| crm_29 | logos_empresas | `empresas.logo_path` + bucket público `logos` (PNG/JPG/WebP, máx. 512 KB). Escritura solo para miembros (`es_miembro()`) |
Son 29 tablas en `public`. Agrupadas por dominio:
| crm_29 | logos_empresas | `empresas.logo_path` + bucket público `logos` (PNG/JPG/WebP, máx. 512 KB). Escritura solo para miembros (`es_miembro()`) |

| crm_29 | logos_empresas | `empresas.logo_path` + bucket público `logos` (PNG/JPG/WebP, máx. 512 KB). Escritura solo para miembros (`es_miembro()`) |
- **Catálogos:** `etapas`, `fuentes`, `motivos_perdida`, `industrias`, `plantillas_calificacion`, `criterios_calificacion`.
| crm_29 | logos_empresas | `empresas.logo_path` + bucket público `logos` (PNG/JPG/WebP, máx. 512 KB). Escritura solo para miembros (`es_miembro()`) |
- **Comercial:** `empresas` (estado: prospecto, cliente, ex_cliente, descartado, proveedor, interno, archivado), `contactos`, `oportunidades`, `oportunidad_precios` (historial de precios), `evaluaciones_oportunidad`, `actividades`, `tareas`, `metas_comerciales`.
| crm_29 | logos_empresas | `empresas.logo_path` + bucket público `logos` (PNG/JPG/WebP, máx. 512 KB). Escritura solo para miembros (`es_miembro()`) |
- **Clientes:** `proyectos`, `entregables`, `entregables_internos` (notas, solo miembros), `reportes`, `cliente_usuarios`, `accesos_admin_marketing`, `cuentas_cliente`, `estrategia_cliente`.
| crm_29 | logos_empresas | `empresas.logo_path` + bucket público `logos` (PNG/JPG/WebP, máx. 512 KB). Escritura solo para miembros (`es_miembro()`) |
- **Marketing:** `metricas_campanas` (campaña por semana), `metricas_snapshot` (métrica por semana), `seo_keywords` (palabra clave por semana), `cargas_datos` (bitácora de cargas CSV, conector o manual), `analisis_solicitudes`.
| crm_29 | logos_empresas | `empresas.logo_path` + bucket público `logos` (PNG/JPG/WebP, máx. 512 KB). Escritura solo para miembros (`es_miembro()`) |
- **Equipo y sistema:** `miembros`, `audit_log`.
| crm_29 | logos_empresas | `empresas.logo_path` + bucket público `logos` (PNG/JPG/WebP, máx. 512 KB). Escritura solo para miembros (`es_miembro()`) |

| crm_29 | logos_empresas | `empresas.logo_path` + bucket público `logos` (PNG/JPG/WebP, máx. 512 KB). Escritura solo para miembros (`es_miembro()`) |
Campos de origen: `metricas_campanas`, `metricas_snapshot` y `seo_keywords` tienen `origen` (`csv`, `manual`, `conector` o `gsc`) y `cargado_por`. `metricas_campanas` y `metricas_snapshot` tienen además `es_prueba` para separar datos de prueba de los reales.
| crm_29 | logos_empresas | `empresas.logo_path` + bucket público `logos` (PNG/JPG/WebP, máx. 512 KB). Escritura solo para miembros (`es_miembro()`) |

| crm_29 | logos_empresas | `empresas.logo_path` + bucket público `logos` (PNG/JPG/WebP, máx. 512 KB). Escritura solo para miembros (`es_miembro()`) |
Llaves foráneas: 44. Al borrar una empresa, se borran en cascada sus cuentas, accesos, estrategia, métricas, palabras clave, cargas y usuarios cliente. En cambio, `contactos`, `oportunidades`, `actividades`, `tareas`, `proyectos` y `reportes` no tienen cascada: hay que borrar esos registros antes que la empresa.
| crm_29 | logos_empresas | `empresas.logo_path` + bucket público `logos` (PNG/JPG/WebP, máx. 512 KB). Escritura solo para miembros (`es_miembro()`) |

| crm_29 | logos_empresas | `empresas.logo_path` + bucket público `logos` (PNG/JPG/WebP, máx. 512 KB). Escritura solo para miembros (`es_miembro()`) |
## 5. Vistas
| crm_29 | logos_empresas | `empresas.logo_path` + bucket público `logos` (PNG/JPG/WebP, máx. 512 KB). Escritura solo para miembros (`es_miembro()`) |
Las 16 vistas tienen `security_invoker = true`, así que aplican el RLS de quien consulta.
| crm_29 | logos_empresas | `empresas.logo_path` + bucket público `logos` (PNG/JPG/WebP, máx. 512 KB). Escritura solo para miembros (`es_miembro()`) |
- **Internas:** `v_oportunidades`, `v_pipeline_por_etapa`, `v_oportunidades_por_fuente`, `v_motivos_perdida`, `v_calificacion_oportunidad`, `v_avance_mes`.
| crm_29 | logos_empresas | `empresas.logo_path` + bucket público `logos` (PNG/JPG/WebP, máx. 512 KB). Escritura solo para miembros (`es_miembro()`) |
- **Dashboard:** `v_dash_resultados`, `v_dash_embudo`, `v_dash_forecast_mensual`, `v_dash_pipeline_responsable`, `v_dash_cartera_clientes`, `v_dash_tareas_responsable`.
| crm_29 | logos_empresas | `empresas.logo_path` + bucket público `logos` (PNG/JPG/WebP, máx. 512 KB). Escritura solo para miembros (`es_miembro()`) |
- **Portal:** `portal_empresa`, `portal_proyectos`, `portal_entregables`, `portal_reportes`.
| crm_29 | logos_empresas | `empresas.logo_path` + bucket público `logos` (PNG/JPG/WebP, máx. 512 KB). Escritura solo para miembros (`es_miembro()`) |

| crm_29 | logos_empresas | `empresas.logo_path` + bucket público `logos` (PNG/JPG/WebP, máx. 512 KB). Escritura solo para miembros (`es_miembro()`) |
Funciones de cálculo: `kpis_dashboard(p_solo_mios)` devuelve pipeline ponderado CLP, oportunidades abiertas, atrasadas, tareas de hoy y MRR. `v_dash_embudo` cuenta "alcanzaron" con `orden >= etapa`, excluyendo perdidas.
| crm_29 | logos_empresas | `empresas.logo_path` + bucket público `logos` (PNG/JPG/WebP, máx. 512 KB). Escritura solo para miembros (`es_miembro()`) |

| crm_29 | logos_empresas | `empresas.logo_path` + bucket público `logos` (PNG/JPG/WebP, máx. 512 KB). Escritura solo para miembros (`es_miembro()`) |
## 6. Reglas de negocio (en la base, no en el navegador)
| crm_29 | logos_empresas | `empresas.logo_path` + bucket público `logos` (PNG/JPG/WebP, máx. 512 KB). Escritura solo para miembros (`es_miembro()`) |
- `valor_ponderado` es columna generada: `valor_neto × probabilidad / 100`.
| crm_29 | logos_empresas | `empresas.logo_path` + bucket público `logos` (PNG/JPG/WebP, máx. 512 KB). Escritura solo para miembros (`es_miembro()`) |
- Al cambiar de etapa, la probabilidad vuelve al valor por defecto de la etapa (`trg_oportunidad_reglas`).
| crm_29 | logos_empresas | `empresas.logo_path` + bucket público `logos` (PNG/JPG/WebP, máx. 512 KB). Escritura solo para miembros (`es_miembro()`) |
- Motivo de pérdida obligatorio al pasar a una etapa perdida.
| crm_29 | logos_empresas | `empresas.logo_path` + bucket público `logos` (PNG/JPG/WebP, máx. 512 KB). Escritura solo para miembros (`es_miembro()`) |
- Al pasar a una etapa ganada, la empresa pasa de prospecto o ex_cliente a `cliente`.
| crm_29 | logos_empresas | `empresas.logo_path` + bucket público `logos` (PNG/JPG/WebP, máx. 512 KB). Escritura solo para miembros (`es_miembro()`) |
- `fecha_cierre_real` se completa al cerrar y se borra al reabrir (`trg_fecha_cierre_real`).
| crm_29 | logos_empresas | `empresas.logo_path` + bucket público `logos` (PNG/JPG/WebP, máx. 512 KB). Escritura solo para miembros (`es_miembro()`) |
- `empresas.mrr_actual_clp` se calcula desde `fee_mensual_clp` solo para clientes no archivados. Cualquier otro caso da 0 (`trg_mrr_calculado`).
| crm_29 | logos_empresas | `empresas.logo_path` + bucket público `logos` (PNG/JPG/WebP, máx. 512 KB). Escritura solo para miembros (`es_miembro()`) |
- La puntuación de una evaluación se calcula en la base (`trg_evaluacion_puntaje`) y el historial de precios se registra solo (`trg_historial_precio`).
| crm_29 | logos_empresas | `empresas.logo_path` + bucket público `logos` (PNG/JPG/WebP, máx. 512 KB). Escritura solo para miembros (`es_miembro()`) |
- Tareas: `completada` y `fecha_completada` coherentes (`trg_tarea_completada`).
| crm_29 | logos_empresas | `empresas.logo_path` + bucket público `logos` (PNG/JPG/WebP, máx. 512 KB). Escritura solo para miembros (`es_miembro()`) |
- Auditoría de cambios en las tablas principales (`trg_auditoria` → `audit_log`).
| crm_29 | logos_empresas | `empresas.logo_path` + bucket público `logos` (PNG/JPG/WebP, máx. 512 KB). Escritura solo para miembros (`es_miembro()`) |

| crm_29 | logos_empresas | `empresas.logo_path` + bucket público `logos` (PNG/JPG/WebP, máx. 512 KB). Escritura solo para miembros (`es_miembro()`) |
Caso a vigilar: reabrir una oportunidad ganada no revierte la empresa a prospecto. Es intencional mientras no haya un proceso para eso.
| crm_29 | logos_empresas | `empresas.logo_path` + bucket público `logos` (PNG/JPG/WebP, máx. 512 KB). Escritura solo para miembros (`es_miembro()`) |

| crm_29 | logos_empresas | `empresas.logo_path` + bucket público `logos` (PNG/JPG/WebP, máx. 512 KB). Escritura solo para miembros (`es_miembro()`) |
## 7. Migraciones aplicadas
| crm_29 | logos_empresas | `empresas.logo_path` + bucket público `logos` (PNG/JPG/WebP, máx. 512 KB). Escritura solo para miembros (`es_miembro()`) |
| Versión | Nombre | Qué agrega |
| crm_29 | logos_empresas | `empresas.logo_path` + bucket público `logos` (PNG/JPG/WebP, máx. 512 KB). Escritura solo para miembros (`es_miembro()`) |
|---|---|---|
| crm_29 | logos_empresas | `empresas.logo_path` + bucket público `logos` (PNG/JPG/WebP, máx. 512 KB). Escritura solo para miembros (`es_miembro()`) |
| crm_01 | estructura | Tablas base |
| crm_29 | logos_empresas | `empresas.logo_path` + bucket público `logos` (PNG/JPG/WebP, máx. 512 KB). Escritura solo para miembros (`es_miembro()`) |
| crm_02 | reglas_y_seguridad | RLS y triggers de reglas |
| crm_29 | logos_empresas | `empresas.logo_path` + bucket público `logos` (PNG/JPG/WebP, máx. 512 KB). Escritura solo para miembros (`es_miembro()`) |
| crm_03 | vistas_kpis_y_datos_base | Vistas, `kpis_dashboard`, catálogos |
| crm_29 | logos_empresas | `empresas.logo_path` + bucket público `logos` (PNG/JPG/WebP, máx. 512 KB). Escritura solo para miembros (`es_miembro()`) |
| crm_04 | cerrar_funciones_internas | Revocar ejecución de funciones internas |
| crm_29 | logos_empresas | `empresas.logo_path` + bucket público `logos` (PNG/JPG/WebP, máx. 512 KB). Escritura solo para miembros (`es_miembro()`) |
| crm_05 | dashboard_y_capa_clientes | Vistas `v_dash_*` y capa de clientes |
| crm_29 | logos_empresas | `empresas.logo_path` + bucket público `logos` (PNG/JPG/WebP, máx. 512 KB). Escritura solo para miembros (`es_miembro()`) |
| crm_06 | portal_rls_clientes | Portal de clientes con RLS |
| crm_29 | logos_empresas | `empresas.logo_path` + bucket público `logos` (PNG/JPG/WebP, máx. 512 KB). Escritura solo para miembros (`es_miembro()`) |
| crm_07 | entregables_notas_internas | `entregables_internos` |
| crm_29 | logos_empresas | `empresas.logo_path` + bucket público `logos` (PNG/JPG/WebP, máx. 512 KB). Escritura solo para miembros (`es_miembro()`) |
| crm_08 | entregables_portal | Entregables visibles al cliente |
| crm_29 | logos_empresas | `empresas.logo_path` + bucket público `logos` (PNG/JPG/WebP, máx. 512 KB). Escritura solo para miembros (`es_miembro()`) |
| crm_09 | mrr_calculado | MRR calculado en la base |
| crm_29 | logos_empresas | `empresas.logo_path` + bucket público `logos` (PNG/JPG/WebP, máx. 512 KB). Escritura solo para miembros (`es_miembro()`) |
| crm_10 | cuentas_cliente | Cuentas por plataforma y cliente |
| crm_29 | logos_empresas | `empresas.logo_path` + bucket público `logos` (PNG/JPG/WebP, máx. 512 KB). Escritura solo para miembros (`es_miembro()`) |
| crm_11 | marketing_base | Base de Mkt Inteligence |
| crm_29 | logos_empresas | `empresas.logo_path` + bucket público `logos` (PNG/JPG/WebP, máx. 512 KB). Escritura solo para miembros (`es_miembro()`) |
| crm_12 | metas_comerciales | Metas mensuales por miembro |
| crm_29 | logos_empresas | `empresas.logo_path` + bucket público `logos` (PNG/JPG/WebP, máx. 512 KB). Escritura solo para miembros (`es_miembro()`) |
| crm_13 | hub_marketing_pruebas | Hub por cliente y marca de datos de prueba |
| crm_29 | logos_empresas | `empresas.logo_path` + bucket público `logos` (PNG/JPG/WebP, máx. 512 KB). Escritura solo para miembros (`es_miembro()`) |
| crm_14 | accesos_ampliados | Accesos admin ampliados |
| crm_29 | logos_empresas | `empresas.logo_path` + bucket público `logos` (PNG/JPG/WebP, máx. 512 KB). Escritura solo para miembros (`es_miembro()`) |
| crm_15 | estrategia_cliente | Estrategia por cliente |
| crm_29 | logos_empresas | `empresas.logo_path` + bucket público `logos` (PNG/JPG/WebP, máx. 512 KB). Escritura solo para miembros (`es_miembro()`) |
| crm_16 | metricas_campanas | Métricas de campañas |
| crm_29 | logos_empresas | `empresas.logo_path` + bucket público `logos` (PNG/JPG/WebP, máx. 512 KB). Escritura solo para miembros (`es_miembro()`) |
| crm_17 | historial_precios | `oportunidad_precios` y su trigger |
| crm_29 | logos_empresas | `empresas.logo_path` + bucket público `logos` (PNG/JPG/WebP, máx. 512 KB). Escritura solo para miembros (`es_miembro()`) |
| crm_18 | auditoria_indices_politicas | Índices de llaves foráneas y políticas de escritura separadas |
| crm_29 | logos_empresas | `empresas.logo_path` + bucket público `logos` (PNG/JPG/WebP, máx. 512 KB). Escritura solo para miembros (`es_miembro()`) |
| crm_19 | origen_dato_y_cargas | Origen, `cargado_por` y `cargas_datos` |
| crm_29 | logos_empresas | `empresas.logo_path` + bucket público `logos` (PNG/JPG/WebP, máx. 512 KB). Escritura solo para miembros (`es_miembro()`) |
| crm_20 | seo_keywords | Palabras clave SEO por semana |
| crm_29 | logos_empresas | `empresas.logo_path` + bucket público `logos` (PNG/JPG/WebP, máx. 512 KB). Escritura solo para miembros (`es_miembro()`) |
| crm_24 | cotizaciones_facturacion | Tablas `cotizaciones` y `cotizacion_items`, vista `v_cotizaciones` y datos de facturación en `empresas` (razón social, giro, dirección, correo, días de pago). Comisión de pauta como texto editable por cotización. Facturas: etapa 2 |
| crm_29 | logos_empresas | `empresas.logo_path` + bucket público `logos` (PNG/JPG/WebP, máx. 512 KB). Escritura solo para miembros (`es_miembro()`) |
| crm_25 | uf_diaria | Tabla `uf_diaria` (valor UF por día desde mindicador.cl, Banco Central). Funciones `uf_pedir` (diaria, 11:00 UTC) y `uf_procesar` (cada 30 min) vía pg_net/pg_cron, con validación de rango y variación < 0,5%. `cotizaciones` acepta moneda UF con snapshot `uf_valor` + `uf_fecha`. `uf_solicitudes` es interna (sin políticas, a propósito) |
| crm_29 | logos_empresas | `empresas.logo_path` + bucket público `logos` (PNG/JPG/WebP, máx. 512 KB). Escritura solo para miembros (`es_miembro()`) |
| crm_26 | correlativo_negocios | `oportunidades.numero` identidad única (NEG-0001); `v_oportunidades` lo expone. Cotizaciones ya tenían `numero` (COT-0001) |
| crm_29 | logos_empresas | `empresas.logo_path` + bucket público `logos` (PNG/JPG/WebP, máx. 512 KB). Escritura solo para miembros (`es_miembro()`) |

| crm_29 | logos_empresas | `empresas.logo_path` + bucket público `logos` (PNG/JPG/WebP, máx. 512 KB). Escritura solo para miembros (`es_miembro()`) |
## 8. Frontend: estructura
| crm_29 | logos_empresas | `empresas.logo_path` + bucket público `logos` (PNG/JPG/WebP, máx. 512 KB). Escritura solo para miembros (`es_miembro()`) |
- `src/context/AuthContext.tsx`: sesión, vinculación de miembro o cliente.
| crm_29 | logos_empresas | `empresas.logo_path` + bucket público `logos` (PNG/JPG/WebP, máx. 512 KB). Escritura solo para miembros (`es_miembro()`) |
- `src/context/CRMContext.tsx`: datos internos y mutaciones (1.321 líneas, pendiente de dividir). Nunca se monta para clientes.
| crm_29 | logos_empresas | `empresas.logo_path` + bucket público `logos` (PNG/JPG/WebP, máx. 512 KB). Escritura solo para miembros (`es_miembro()`) |
- `src/App.tsx`: `CapaRouter` decide entre CRM interno y portal.
| crm_29 | logos_empresas | `empresas.logo_path` + bucket público `logos` (PNG/JPG/WebP, máx. 512 KB). Escritura solo para miembros (`es_miembro()`) |
- `src/views/`: pantallas del CRM. `DashboardView` (Inicio por pestañas), `AdminView` (incluye editor de pipeline), `MarketingView` (Mkt Inteligence), `PortalView` (portal de clientes).
| crm_29 | logos_empresas | `empresas.logo_path` + bucket público `logos` (PNG/JPG/WebP, máx. 512 KB). Escritura solo para miembros (`es_miembro()`) |
- `src/components/dashboard/AgencyDashboard.tsx`: pestañas Resumen, Ventas, Clientes y Equipo.
| crm_29 | logos_empresas | `empresas.logo_path` + bucket público `logos` (PNG/JPG/WebP, máx. 512 KB). Escritura solo para miembros (`es_miembro()`) |
- `src/components/marketing/`: Mkt Inteligence (Dashboard, Estrategia, SEO, Orgánico, Ads, Cargar datos, Cliente). `Importador.tsx` escribe en `metricas_campanas`, `metricas_snapshot` y `seo_keywords`, y deja registro en `cargas_datos`.
| crm_29 | logos_empresas | `empresas.logo_path` + bucket público `logos` (PNG/JPG/WebP, máx. 512 KB). Escritura solo para miembros (`es_miembro()`) |
- `src/components/clientes/ClientePanel.tsx`: ficha de cliente (proyectos, entregables, reportes, accesos).
| crm_29 | logos_empresas | `empresas.logo_path` + bucket público `logos` (PNG/JPG/WebP, máx. 512 KB). Escritura solo para miembros (`es_miembro()`) |
- `src/lib/csv.ts`: parser CSV con detección de separador, números en formato chileno y agrupación por semana (lunes).
| crm_29 | logos_empresas | `empresas.logo_path` + bucket público `logos` (PNG/JPG/WebP, máx. 512 KB). Escritura solo para miembros (`es_miembro()`) |
- Reglas de seguridad en la interfaz: los enlaces externos se validan como http o https; Looker solo se incrusta desde dominios de Google.
| crm_29 | logos_empresas | `empresas.logo_path` + bucket público `logos` (PNG/JPG/WebP, máx. 512 KB). Escritura solo para miembros (`es_miembro()`) |

| crm_29 | logos_empresas | `empresas.logo_path` + bucket público `logos` (PNG/JPG/WebP, máx. 512 KB). Escritura solo para miembros (`es_miembro()`) |
## 9. Configuración
| crm_29 | logos_empresas | `empresas.logo_path` + bucket público `logos` (PNG/JPG/WebP, máx. 512 KB). Escritura solo para miembros (`es_miembro()`) |
Variables de entorno (en Vercel, nunca en el repo):
| crm_29 | logos_empresas | `empresas.logo_path` + bucket público `logos` (PNG/JPG/WebP, máx. 512 KB). Escritura solo para miembros (`es_miembro()`) |
- `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`: públicas por diseño. Seguridad real = RLS.
| crm_29 | logos_empresas | `empresas.logo_path` + bucket público `logos` (PNG/JPG/WebP, máx. 512 KB). Escritura solo para miembros (`es_miembro()`) |
- `VITE_MODO_DEMO=false` en producción.
| crm_29 | logos_empresas | `empresas.logo_path` + bucket público `logos` (PNG/JPG/WebP, máx. 512 KB). Escritura solo para miembros (`es_miembro()`) |
Nunca usar la clave `service_role` en el frontend.
| crm_29 | logos_empresas | `empresas.logo_path` + bucket público `logos` (PNG/JPG/WebP, máx. 512 KB). Escritura solo para miembros (`es_miembro()`) |

| crm_29 | logos_empresas | `empresas.logo_path` + bucket público `logos` (PNG/JPG/WebP, máx. 512 KB). Escritura solo para miembros (`es_miembro()`) |
## 10. Datos de prueba
| crm_29 | logos_empresas | `empresas.logo_path` + bucket público `logos` (PNG/JPG/WebP, máx. 512 KB). Escritura solo para miembros (`es_miembro()`) |
- `supabase/seed/demo_seed.sql`: crea 4 empresas, 4 contactos, 5 oportunidades (una por etapa relevante), un proyecto, tareas, actividades y métricas. Todo con ids que empiezan en `dede` y nombres `DEMO –`.
| crm_29 | logos_empresas | `empresas.logo_path` + bucket público `logos` (PNG/JPG/WebP, máx. 512 KB). Escritura solo para miembros (`es_miembro()`) |
- `supabase/seed/demo_cleanup.sql`: borra solo esos registros, en el orden que exige la llave foránea, y termina con una verificación que debe devolver 0.
| crm_29 | logos_empresas | `empresas.logo_path` + bucket público `logos` (PNG/JPG/WebP, máx. 512 KB). Escritura solo para miembros (`es_miembro()`) |
- Los 4 registros `PRUEBA –` de la carga inicial no son parte de esto. Se borran solo con instrucción explícita.
| crm_29 | logos_empresas | `empresas.logo_path` + bucket público `logos` (PNG/JPG/WebP, máx. 512 KB). Escritura solo para miembros (`es_miembro()`) |

| crm_29 | logos_empresas | `empresas.logo_path` + bucket público `logos` (PNG/JPG/WebP, máx. 512 KB). Escritura solo para miembros (`es_miembro()`) |
## 11. Verificación de seguridad (asesor Supabase, 3 nov 2026)
| crm_29 | logos_empresas | `empresas.logo_path` + bucket público `logos` (PNG/JPG/WebP, máx. 512 KB). Escritura solo para miembros (`es_miembro()`) |
- 7 funciones SECURITY DEFINER ejecutables por `authenticated`. Revisadas: las que escriben validan `auth.uid()` o `es_admin()`; las de lectura solo devuelven filas del propio usuario. Se mantienen, y el asesor lo sigue marcando por diseño.
| crm_29 | logos_empresas | `empresas.logo_path` + bucket público `logos` (PNG/JPG/WebP, máx. 512 KB). Escritura solo para miembros (`es_miembro()`) |
- Protección contra contraseñas filtradas: desactivada. No aplica mientras solo se use Google.
| crm_29 | logos_empresas | `empresas.logo_path` + bucket público `logos` (PNG/JPG/WebP, máx. 512 KB). Escritura solo para miembros (`es_miembro()`) |
- 4 tablas con dos políticas permisivas de SELECT (`empresas`, `entregables`, `proyectos`, `reportes`): cliente y miembros. Impacto de rendimiento bajo con el volumen actual. Pendiente de unificar.
| crm_29 | logos_empresas | `empresas.logo_path` + bucket público `logos` (PNG/JPG/WebP, máx. 512 KB). Escritura solo para miembros (`es_miembro()`) |
- 27 índices sin uso. Normal con datos de prueba. Revisar después de unas semanas de uso real antes de eliminar ninguno.
| crm_29 | logos_empresas | `empresas.logo_path` + bucket público `logos` (PNG/JPG/WebP, máx. 512 KB). Escritura solo para miembros (`es_miembro()`) |

| crm_29 | logos_empresas | `empresas.logo_path` + bucket público `logos` (PNG/JPG/WebP, máx. 512 KB). Escritura solo para miembros (`es_miembro()`) |
## 12. Riesgos conocidos
| crm_29 | logos_empresas | `empresas.logo_path` + bucket público `logos` (PNG/JPG/WebP, máx. 512 KB). Escritura solo para miembros (`es_miembro()`) |
- Repo público: el código es legible. Pendiente: repo privado.
| crm_29 | logos_empresas | `empresas.logo_path` + bucket público `logos` (PNG/JPG/WebP, máx. 512 KB). Escritura solo para miembros (`es_miembro()`) |
- Hosting en Hobby: uso no comercial. Pendiente: Cloudflare Pages (gratis y permite uso comercial) o Vercel Pro.
| crm_29 | logos_empresas | `empresas.logo_path` + bucket público `logos` (PNG/JPG/WebP, máx. 512 KB). Escritura solo para miembros (`es_miembro()`) |
- Supabase plan gratis: sin respaldos automáticos. Pendiente: exportación semanal.
| crm_29 | logos_empresas | `empresas.logo_path` + bucket público `logos` (PNG/JPG/WebP, máx. 512 KB). Escritura solo para miembros (`es_miembro()`) |
- Login de clientes externos: OAuth en modo "Interno". Pendiente: cambiar a "Externo" y probarlo con un correo no registrado.
| crm_29 | logos_empresas | `empresas.logo_path` + bucket público `logos` (PNG/JPG/WebP, máx. 512 KB). Escritura solo para miembros (`es_miembro()`) |
- Etapas `Calificado` y `Propuesta` están inactivas. Una oportunidad en esas etapas no aparece en el Kanban. Hoy no hay ninguna, pero la interfaz no lo advierte.
| crm_29 | logos_empresas | `empresas.logo_path` + bucket público `logos` (PNG/JPG/WebP, máx. 512 KB). Escritura solo para miembros (`es_miembro()`) |
- Pipeline editor: el usuario reportó que no permite editar. Sin reproducir en pantalla todavía.
| crm_29 | logos_empresas | `empresas.logo_path` + bucket público `logos` (PNG/JPG/WebP, máx. 512 KB). Escritura solo para miembros (`es_miembro()`) |

| crm_29 | logos_empresas | `empresas.logo_path` + bucket público `logos` (PNG/JPG/WebP, máx. 512 KB). Escritura solo para miembros (`es_miembro()`) |
## 13. Lo que viene (sin construir)
| crm_29 | logos_empresas | `empresas.logo_path` + bucket público `logos` (PNG/JPG/WebP, máx. 512 KB). Escritura solo para miembros (`es_miembro()`) |
- Leads del sitio con deduplicación (entrada por función firmada).
| crm_29 | logos_empresas | `empresas.logo_path` + bucket público `logos` (PNG/JPG/WebP, máx. 512 KB). Escritura solo para miembros (`es_miembro()`) |
- Cotizaciones con planes A–E, setup, comisión de pauta e IVA.
| crm_29 | logos_empresas | `empresas.logo_path` + bucket público `logos` (PNG/JPG/WebP, máx. 512 KB). Escritura solo para miembros (`es_miembro()`) |
- Finanzas: facturas registradas, cobranza, MRR y flujo de caja.
| crm_29 | logos_empresas | `empresas.logo_path` + bucket público `logos` (PNG/JPG/WebP, máx. 512 KB). Escritura solo para miembros (`es_miembro()`) |
- Agenda y tareas por persona con Google Calendar.
| crm_29 | logos_empresas | `empresas.logo_path` + bucket público `logos` (PNG/JPG/WebP, máx. 512 KB). Escritura solo para miembros (`es_miembro()`) |
- Conector de datos de marketing (P48 Marketing) solo desde el servidor.
| crm_29 | logos_empresas | `empresas.logo_path` + bucket público `logos` (PNG/JPG/WebP, máx. 512 KB). Escritura solo para miembros (`es_miembro()`) |
- Meta Ads: sincronización automática con la Marketing API. Pendiente hasta tener un cliente con Meta.
| crm_29 | logos_empresas | `empresas.logo_path` + bucket público `logos` (PNG/JPG/WebP, máx. 512 KB). Escritura solo para miembros (`es_miembro()`) |
- Servidor MCP de solo lectura sobre los datos del CRM. Pendiente de decisión.
| crm_29 | logos_empresas | `empresas.logo_path` + bucket público `logos` (PNG/JPG/WebP, máx. 512 KB). Escritura solo para miembros (`es_miembro()`) |
