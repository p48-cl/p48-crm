# Registro de versiones · CRM P48

Formato: versión, fecha de unión a `main`, PR, qué cambia y si toca base de datos. Las migraciones de Supabase se listan aparte porque se aplican en su propio momento.

## v0.11.0 · en curso (no publicada)
Estado al 3 de noviembre de 2026. Cada entrada indica si ya está en `main`.

- **PR #12** · Identidad JAMP CRM: tema claro por defecto con tokens (`--c-*`), tipografía Inter, marca propia "JAMP CRM" separada de la agencia P48. **En `main`** (2026-11-03).
- **PR #13** · Colores residuales a roles del tema y texto claro solo sobre acento o peligro. **En `main`** (2026-11-03).
- **PR #14** · Contactos editables (fila → formulario con datos, guardar o archivar) y MRR calculado automáticamente (migración `crm_09`). **En `main`** (2026-11-03).
- **PR #15** · Registro de cuentas y permisos por cliente y plataforma (7 plataformas, ID externo, estado, quién concedió el acceso, fecha). Reemplaza el checklist. Migra los checkboxes (migración `crm_10`). **Pendiente de unir a `main`** (sin conflictos desde el rebase de 2026-11-03).
- **PR #18** · Estados visuales con tokens del tema: ámbar, cielo, esmeralda, rosa y rojo fijos pasan a `--c-warn`, `--c-info`, `--c-ok`, `--c-danger`. Corrige texto tenue en claro y fondos oscuros heredados. **Pendiente de unir a `main`.**
- **PR #16** · Salud de datos por cuenta (última lectura del conector), columnas UTM en oportunidades y tabla `metricas_snapshot` (migración `crm_11`). **Error de base:** se unió a la rama del PR #15 y no a `main`. Su código llega a `main` cuando se una el #15.

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

## Pendiente de aplicar en base
- Nada. Todas las migraciones de arriba están aplicadas en Supabase.

## Regla de documentación
Cada PR o migración agrega su línea a este archivo en el mismo PR. Si cambia la arquitectura, también se actualiza `ARQUITECTURA.md`.
