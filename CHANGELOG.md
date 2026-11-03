# Registro de versiones · CRM P48

Formato: versión, fecha de unión a `main`, PR, qué cambia y si toca base de datos. Las migraciones de Supabase se listan aparte porque se aplican en su propio momento.

## v0.11.0 · en curso (no publicada)
Estado al 3 de noviembre de 2026. Cada entrada indica si ya está en `main`.

- **PR #12** · Identidad JAMP CRM: tema claro por defecto con tokens (`--c-*`), tipografía Inter, marca propia "JAMP CRM" separada de la agencia P48. **En `main`** (2026-11-03).
- **PR #13** · Colores residuales a roles del tema y texto claro solo sobre acento o peligro. **En `main`** (2026-11-03).
- **PR #14** · Contactos editables (fila → formulario con datos, guardar o archivar) y MRR calculado automáticamente (migración `crm_09`). **En `main`** (2026-11-03).
- **PR #15** · Registro de cuentas y permisos por cliente y plataforma (7 plataformas, ID externo, estado, quién concedió el acceso, fecha). Reemplaza el checklist. Migra los checkboxes (migración `crm_10`). **En `main`** (2026-11-03).
- **PR #18** · Estados visuales con tokens del tema: ámbar, cielo, esmeralda, rosa y rojo fijos pasan a `--c-warn`, `--c-info`, `--c-ok`, `--c-danger`. Corrige texto tenue en claro y fondos oscuros heredados. **En `main`** (2026-11-03).
- **PR #20** · "Lo urgente hoy" en el resumen del dashboard: seguimientos atrasados, cuentas de conector sin lectura en más de 7 días y tareas de hoy. Sin migraciones. **Pendiente de unir a `main`.**
- **PR #21** · Metas del mes en el resumen del dashboard (leads, reuniones, cierres; global del equipo y avance por persona). Metas iniciales del modelo financiero: 20, 6 y 2. Solo admin las edita. Migración `crm_12`. **En `main`** (2026-11-03).
- **PR #22** · Pestaña Marketing como hub por cliente: selector de cliente, seis métricas con variación, gráfico de tendencia y botón "Ejecutar análisis" (crea una solicitud). Migración `crm_13`: columna `es_prueba` en `metricas_snapshot`, tabla `analisis_solicitudes` y datos de prueba para el cliente demo. **Pendiente de unir a `main`.**
- **PR #23** · Hub Marketing por cliente: selector de cliente, seis métricas con variación, gráfico de tendencia SVG y botón "Ejecutar análisis" (crea una solicitud). Migración `crm_13`: columna `es_prueba` en `metricas_snapshot`, tabla `analisis_solicitudes`, datos de prueba del cliente demo. **Pendiente de unir a `main`.**
- **PR #24** · Accesos ampliados: Instagram, Facebook, TikTok, LinkedIn, sitio web, landing pages y otros activos, con agregado manual por nombre. Migración `crm_14`. Carga inicial de Hotel Cabo de Hornos (Google Ads y GA4 concedidos, Search Console pendiente de verificar) con métricas reales de cuatro semanas. **Pendiente de unir a `main`.**
- **PR #25** · Mkt Inteligence con secciones: Dashboard de cartera (KPIs semanales, gráficos de inversión y sesiones, tabla por cliente, alertas, filtros de cliente y rango, opción de incluir datos de prueba) y Cliente (hub individual). Sin migraciones. Estrategia, SEO y Ads quedan para entregas siguientes. **Pendiente de unir a `main`.**
- **PR #26** · Mkt Inteligence > Estrategia: ficha editable por cliente (objetivos de ventas y marketing, posicionamiento, mercado, storytelling, canal prioritario, tono, competidores, notas para creativos) con guardado automático y botón para copiar el brief. Migración `crm_15`. **Pendiente de unir a `main`.**
- **PR #27** · Mkt Inteligence > Ads: campañas por semana con inversión, ejecución del presupuesto, CTR, CPA y ROAS; KPIs con variación; alertas de pauta (sin consumo, sobre techo, gasto sin conversiones). Migración `crm_16` (`metricas_campanas`) y carga de las tres campañas de HCH de cuatro semanas. **Pendiente de unir a `main`.**
- **PR #28** · Nueva oportunidad: alta rápida de empresa desde el modal, plan que sugiere su precio de lista (A $550k, B $1,55MM, C $2,25MM, D $3,05MM, E $2,5MM) y setup de $650k, valor editable con aviso si difiere del precio de lista, responsable por defecto el usuario que crea, y campos UTM opcionales. Se quita el valor fijo de $15MM. Migración `crm_17`: historial de precios de cada oportunidad (plan, moneda, valor, setup, quién y cuándo). **Pendiente de unir a `main`.**
- **PR #29** · CRM > Pipeline: tarjetas KPI sobre el tablero (valor del pipeline abierto, forecast ponderado con trimestre dinámico, tasa de cierre real = ganadas/(ganadas+perdidas), MRR clientes activos, seguimientos atrasados). Sin cotizaciones ni facturación todavía (módulos pendientes de Etapa 1/2). **En `main`.**
- **PR #30** · Auditoría: se quitan 8 dependencias sin uso (`@google/genai`, `dotenv`, `express`, `motion`, `autoprefixer`, `esbuild`, `tsx`, `@types/express`), se reescribe el README (era el de AI Studio) y se eliminan 3 casts `as any` en `useAuth()`. Migración `crm_18`: 16 índices en llaves foráneas y políticas de admin separadas (insert/update/delete) en `metas_comerciales` y `metricas_campanas` para evitar políticas SELECT duplicadas. Revisado sin cambios: RLS activa en las 27 tablas, sin políticas abiertas ni acceso `anon`; las funciones `es_admin`, `es_miembro`, `mi_miembro_id` y `empresas_del_cliente` deben seguir ejecutables por `authenticated` porque las usan las políticas. **Pendiente de unir a `main`.**
- **PR #16** · Salud de datos por cuenta (última lectura del conector), columnas UTM en oportunidades y tabla `metricas_snapshot` (migración `crm_11`). **En `main`** (2026-11-03), a través del PR #15. Error de base: se unió a la rama del #15 y no directamente a `main`.

## v0.10.0 · 2026-11-03
- **PR #9** · Inicio por pestañas: Resumen, Ventas, Clientes y Equipo.
- Solo presentación. Sin cambios de datos ni de base.

## v0.9.0 · 2026-11-03
- **PR #8** · Notas internas de entregables en tabla propia (`entregables_internos`), solo miembros.
- Base: migraciones `crm_07` y `crm_08` (ver tabla de migraciones).

## v0.8.0 · 2026-11-03
- **PR #7** · Diseño refinado: escala tipográfica móvil (texto mínimo 12 px), superficies con elevación única, barra inferior con material translúcido, áreas táctiles de 44 px, movimiento reducido respetado.
- Sin cambios de base.

## v0.7.0 · 2026-11-02
- **PR #6** · Navegación móvil: barra inferior con Inicio, Negocios, Tareas y "Más" (Empresas, Contactos, Actividades, Importar, Administración). Mover etapa desde la tarjeta sin arrastrar. Áreas táctiles de 44 px.
- Sin cambios de base.

## v0.6.0 · 2026-11-02
- **PR #5** · Portal de clientes de solo lectura y separación de capas por rol. Tras el login: miembro entra al CRM; cliente vinculado entra al portal; si no es ninguno, "sin acceso". El CRM interno no se carga para clientes.
- Base: políticas de cliente y vistas `portal_*` ver `crm_06`.

## v0.5.0 · 2026-11-02
- **PR #4** · Ficha de cliente: pestaña "Cliente y portal" con proyectos, entregables, reportes y personas con acceso al portal.
- Sin cambios de base (usa tablas de `crm_05`).

## v0.4.0 · 2026-11-02
- **PR #3** · Dashboard de agencia: resultados, embudo, forecast, pipeline por responsable, tareas por responsable y cartera de clientes.
- Base: vistas `v_dash_*` y tablas de capa de clientes (`crm_05`).

## v0.3.0 · 2026-11-02
- **PR #2** · Responsive: buscador del encabezado colapsa a ícono, gráfico de pipeline legible, kanban deslizable por columnas.

## v0.2.0 · 2026-11-02
- **PR #1** · Corrección de KPIs: `kpis_dashboard` devuelve un arreglo; se toma la primera fila.

## v0.1.0 · 2026-11-02
- Versión inicial generada en AI Studio (`c9b956c`). Incluye CRM base: kanban, empresas, contactos, tareas, actividades, importación CSV y administración.

---

## Migraciones de base (Supabase, proyecto `P48-CRM`)

| Versión | Nombre | Qué hace |
|---|---|---|
| 20261102164455 | crm_01_estructura | Tablas base: miembros, empresas, contactos, oportunidades, catálogos, calificación, actividades, tareas, auditoría. |
| 20261102164516 | crm_02_reglas_y_seguridad | Triggers de reglas de negocio, RLS cerrada por defecto, vincular y desactivar miembros. |
| 20261102164532 | crm_03_vistas_kpis_y_datos_base | Vistas de pipeline, KPIs (`kpis_dashboard`) y datos base. |
| 20261102164542 | crm_04_cerrar_funciones_internas | Revoca ejecución de funciones trigger a roles públicos. |
| 20261102191644 | crm_05_dashboard_y_capa_clientes | Vistas `v_dash_*`, `fecha_cierre_real`, tablas proyectos, entregables, reportes y cliente_usuarios, funciones de vinculación de cliente y vistas `portal_*`. |
| 20261103171821 | crm_06_portal_rls_clientes | Políticas de cliente en empresas, proyectos y reportes; vistas `portal_*` con `security_invoker`. |
| 20261103173107 | crm_07_entregables_notas_internas | Tabla `entregables_internos` con RLS solo para miembros; copia de notas existentes. |
| 20261103174025 | crm_08_entregables_portal | Borra `notas_internas` de entregables y agrega política de lectura de entregables para clientes. |
| 20261103184016 | crm_09_mrr_calculado | MRR de cada empresa calculado desde `fee_mensual_clp` si es cliente activo; 0 en otro caso. |
| 20261103184211 | crm_10_cuentas_cliente | Tabla `cuentas_cliente` (plataforma, ID externo, estado, concedido por, fecha) con RLS para miembros. Copia los checkboxes de `accesos_admin_marketing`. |
| 20261103184757 | crm_11_marketing_base | Columnas `utm_fuente`, `utm_campana`, `utm_medio` en `oportunidades`; `ultima_lectura` en `cuentas_cliente`; tabla `metricas_snapshot` con RLS para miembros. |
| (aplicada 2026-11-03) | crm_13_hub_marketing_pruebas | `es_prueba` en `metricas_snapshot`; tabla `analisis_solicitudes` con RLS; datos de prueba del cliente demo (4 lunes de octubre). |
| (aplicada 2026-11-03) | crm_14_accesos_ampliados | `cuentas_cliente`: nuevas plataformas (IG, Facebook, TikTok, LinkedIn, sitio web, landing, otro), columnas `etiqueta` y `url`, índice único por etiqueta. |
| (aplicada 2026-11-03) | crm_17_historial_precios | Tabla `oportunidad_precios` y trigger que registra cada cambio de plan, moneda, valor o setup con el miembro que lo hizo. Solo lectura para miembros. |
| (aplicada 2026-11-03) | crm_18_auditoria_indices_politicas | 16 índices de cobertura en llaves foráneas y políticas de escritura de admin separadas por operación en `metas_comerciales` y `metricas_campanas`. |
| (aplicada 2026-11-03) | crm_15_estrategia_cliente | Tabla `estrategia_cliente` (una fila por cliente) con RLS para miembros. |
| (aplicada 2026-11-03) | crm_16_metricas_campanas | Tabla `metricas_campanas` (campaña por semana, con presupuesto diario, costo, clics, conversiones y valor) con RLS. Carga inicial de HCH. |
| (aplicada 2026-11-03) | crm_13_hub_marketing_pruebas | `es_prueba` en `metricas_snapshot`; tabla `analisis_solicitudes` con RLS; datos de prueba del cliente demo (4 lunes de octubre). |
| (aplicada 2026-11-03) | crm_12_metas_comerciales | Tabla `metas_comerciales` (global y por persona) con RLS, meta global inicial 20/6/2, y vista `v_avance_mes` (leads, reuniones, cierres del mes en hora de Chile). |

## Pendiente de aplicar en base
- Nada. Todas las migraciones de arriba están aplicadas en Supabase.

## Regla de documentación
Cada PR o migración agrega su línea a este archivo en el mismo PR. Si cambia la arquitectura, también se actualiza `ARQUITECTURA.md`.
