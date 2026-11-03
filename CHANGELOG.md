# Registro de versiones · CRM P48

Formato: versión, fecha de unión a `main`, PR, qué cambia y si toca base de datos. Las migraciones de Supabase se listan aparte porque se aplican en su propio momento.

## v0.10.0 · pendiente de unir
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

## Pendiente de aplicar en base
- Nada. Todo lo de arriba está aplicado.
