# Registro de versiones · CRM P48

Formato: versión, fecha de unión a `main`, PR, qué cambia y si toca base de datos. Las migraciones de Supabase se listan aparte porque se aplican en su propio momento.

## v0.11.0 · en curso (no publicada)
Estado al 9 de noviembre de 2026. Cada entrada indica si ya está en `main`.

- **PR #69** · Kanban: tarjetas de negocio rediseñadas (cabecera con cliente y correlativo, valor neto con ponderado y probabilidad, calificación con barra y aviso de criterio eliminatorio, chip de seguimiento, días para el cierre, fuente y bloque de siguiente movimiento). Solo visual y de lectura de datos ya existentes: sin cambios de lógica, permisos ni migraciones.
- **PR #72b** · Móvil y tablet: el shell usa altura dinámica (dvh) y un solo contenedor con scroll, así la barra inferior queda visible al desplazarse en Pipeline. Ficha de cliente: cabecera, franja y pestañas fijas; solo scrollea el contenido (antes la cabecera quedaba cortada en tablet). Sin cambios de lógica ni migraciones.
- **PR #72** · Tablet (768–1023 px): la barra lateral y el encabezado de escritorio pasan a aparecer desde 1024 px; en tablet se usa la navegación inferior y el contenido ocupa todo el ancho (antes la barra de 220 px dejaba ~550 px y rompía tablero, tarjetas y KPIs). Kanban a 4 columnas en 1024 px y 5 desde 1280; KPIs de Pipeline y Resumen a 3 columnas en 1024 px. Tareas: chip «Atrasada». Sin cambios de lógica ni migraciones.
- **PR #71** · Limpieza y responsivo. Se eliminan ~160 clases `dark:`/`light:` sin efecto; componentes compartidos `FranjaDecision` (ficha de cliente y de negocio) y `ChipSenal` (Kanban y ficha de negocio). Móvil y tablet: formularios de modales pasan a una columna bajo 640 px, modales de actividad, tarea y negocio con scroll interno, ficha de negocio a pantalla completa en móvil, pestañas de la ficha de cliente con scroll horizontal en vez de varias filas. Sin cambios de lógica, permisos ni migraciones.
- **PR #70** · Ficha de negocio: encabezado con etapa y cliente, franja de decisión (valor neto con ponderado, cierre estimado con días, próxima acción y responsable), señales (acción atrasada, sin calificar, sin actividad, origen) y bloque «Siguiente movimiento». Corrige el texto de próxima acción que se veía casi invisible. Solo visual: sin cambios de lógica, permisos ni migraciones.
- **PR #66** · Ficha de cliente según especificación JAMP: franja de decisión fija bajo el encabezado (salud en texto, MRR en CLP, renovación con alerta a 60 días y responsable). Pestañas en el nuevo orden: Resumen (nueva, por defecto, con prioridades abiertas, riesgos y oportunidades derivados de datos reales, perfil comercial y enlaces Looker y Drive), Contactos, Negocios, Actividad, Tareas (contador de pendientes; las atrasadas se marcan), Cotizaciones, Marketing, Contrato y datos y Portal y activos. Acción principal del encabezado según pestaña. Sin cambios de datos ni migraciones. Apilado sobre #65.
- **PR #68** · Administración > Preferencias: valores por defecto del equipo (tema oscuro o claro, vista de Clientes en tabla o tarjetas, días de alerta de renovación y días sin actividad). Las alertas de la ficha usan estos días. Requiere migración `crm_30` (tabla `configuracion_crm`, fila única, escritura solo admin), pendiente de aplicar.
- **PR #65** · Ficha de cliente: contraste entre fondo y tarjetas (tarjetas más claras que el fondo en oscuro y en claro, campos dentro de la tarjeta más oscuros) y reordenamiento de Datos & Accesos: resumen de MRR, fee, renovación (con alerta a 30 días) y negocios abiertos; encabezado con estado, plan y salud; datos legales a la izquierda y enlaces y cuentas a la derecha. Solo visual: sin cambios de lógica ni de datos. Apilado sobre #64.
- **PR #63** · Logo por cliente y vista de tarjetas (apilado sobre #62). Subir o cambiar el logo desde la ficha (PNG/JPG/WebP, se reduce a 256 px y máx. 512 KB). El logo aparece en la ficha, la tabla, las tarjetas del Kanban y el PDF de cotización; sin logo, la inicial del cliente. Clientes: conmutador Tabla / Tarjetas. Base: crm_29 (columna `empresas.logo_path`, bucket público `logos`, escritura solo para miembros).
- **PR #62** · Moneda UF en negocios y cotizaciones (apilado sobre #61). Cotizaciones: CLP, UF o USD; con UF, los precios de lista en CLP se convierten con el último valor de `uf_diaria` (no posterior a hoy) y el valor queda congelado en la cotización (`uf_valor`, `uf_fecha`). Negocios: UF disponible; se marca «No suma a CLP». Base: crm_27 (oportunidades acepta UF) y crm_28 (`v_cotizaciones` expone el snapshot UF).
- **PR #61** · Ficha del negocio en dos paneles: izquierda los datos (nombre, valor, setup, probabilidad, plan, fuente de origen, responsable, cierre, contacto principal, cliente con razón social/RUT/giro/dirección/email y sus contactos), todo editable; derecha la gestión comercial (etapa, próxima acción, cotizaciones del negocio con «Nueva cotización», calificación, tareas, actividades). Correlativos únicos: cotizaciones `COT-0001` y negocios `NEG-0001` (también en Kanban). Base: crm_26.
- **PR #60** · Estética JAMP CRM: nuevo sistema visual (isotipo, wordmark, favicon, paleta oscura azul-marino, colores por módulo Ventas/Media/Orgánico), barra lateral reagrupada con leyenda de agentes, cabecera, login y portal con la marca. Solo diseño: sin cambios de lógica, datos ni permisos.
- **PR #57** · Contactos: al crear un contacto se elige o crea el cliente con el mismo selector (búsqueda y alta en línea) en vez de un desplegable.
- **PR #59** · Selector de cliente sobre los modales (capa 60): antes quedaba debajo del formulario de contacto y no se podía elegir.
- **PR #56** · Selector de cliente reutilizable: busca, elige o crea un cliente sin salir del flujo (usado en Cotizaciones). Una cotización no se puede marcar «enviada» ni «aceptada» si al cliente le faltan razón social, RUT, giro o dirección; el editor avisa qué falta. Apilado sobre #55.
- **PR #55** · Cotizaciones con el mismo diseño que Clientes: título y contador, búsqueda y filtro de estado en tarjeta, tabla densa (N°, cotización, cliente, estado, fechas, mensual y único con IVA) y «Nueva cotización» con selector de cliente. Apilado sobre #54.
- **PR #54** · Cotizaciones: el encabezado ya no se corta en escritorio, el botón dice «Nueva cotización» y abre directamente el formulario del cliente elegido (antes solo abría la ficha). Apilado sobre #51.
- **PR #51** · Etiquetas: «Empresa» pasa a «Cliente» en toda la interfaz (menú, directorio, fichas, formularios, importador, búsqueda). Solo textos visibles; el código y la base de datos no cambian.
- **PR #50** · Responsivo: grids de la ficha y de datos tributarios apilados en móvil, fila de líneas de cotización adaptada a pantallas pequeñas, botones de cotizaciones a ancho completo en móvil y encabezado de la ficha ajustado.
- **PR #49** · Ficha de cliente como ventana centrada (ancho completo, pestañas visibles sin desplazar), datos legales y tributarios (razón social, RUT, giro, dirección) dentro de «Datos & Accesos» con aviso si faltan, y módulo «Cotizaciones» en el menú lateral con listado global por estado. Apilado sobre #47, sin migración. **Pendiente de unir a `main`.**
- **PR #46** · Tareas editables: se abren desde el título (lista de Tareas y pestaña Tareas de la ficha) y permiten cambiar título, vínculos, responsable, vencimiento, prioridad y notas. Corrige además que el modal de tarea no tomaba la empresa o negocio inicial al reabrirlo. Sin migraciones.
- **PR #47** · Cotizaciones: pestaña «Cotizaciones» en la ficha con datos de facturación (razón social, RUT, giro, dirección, correo, días de pago), listado y editor de cotizaciones con líneas (mensual o único), IVA, comisión de pauta y condiciones comerciales editables, y vista imprimible. Migración `crm_24` ya aplicada. **Pendiente de unir a `main`.**
- **PR #45** · Ficha de cliente: plan «Personalizado» (precio a medida), tipo de renovación (manual o automática), enlaces Looker y Drive editables (solo https), y tareas completables desde la pestaña Tareas. Migración `crm_23` preparada, pendiente de aplicar. **Pendiente de unir a `main`.**
- **PR #44** · Móvil y contraste: texto inactivo del menú «Más secciones» legible; barra del Kanban compacta ("Tablero", "Tabla", "+ Nueva"); filtros del Kanban en dos columnas; título y pestañas de Inicio en una fila con desplazamiento; separador de tareas solo en escritorio. Sin migraciones.
- **PR #43** · Seguridad: un cliente ya no puede leer la fila completa de su empresa por REST (fee, MRR, salud, responsable). `portal_empresa` pasa a ejecutarse con privilegios del dueño y filtrado por `empresas_del_cliente()`. Migración `crm_21` preparada en `supabase/migrations/`, pendiente de aplicar. **Pendiente de unir a `main`.**
- **PR #42** · Documentación y datos de prueba: `ARQUITECTURA.md` puesto al día con el esquema real (29 tablas, 16 vistas, 44 llaves foráneas, migraciones crm_01 a crm_20, verificación del asesor de seguridad). Nuevo `supabase/seed/demo_seed.sql` y `demo_cleanup.sql` con datos `DEMO –` (ids `dede…`) que se borran con un solo script. Sin cambios de interfaz ni migraciones.
- **PR #41** · Inicio > Clientes: tarjeta «Pauta del mes por cliente» con inversión, conversiones y ROAS de `metricas_campanas` (semanas que empiezan en el mes en curso). Sin migraciones. **Pendiente de unir a `main`.**
- **PR #40** · Mkt Inteligence > Orgánico: métricas de redes sin pauta (Instagram, Facebook, TikTok, LinkedIn, YouTube, otra) por cliente, con última lectura y variación. Lee `metricas_snapshot` y se carga con la plantilla «Métricas semanales». Sin migraciones. **Pendiente de unir a `main`.**
- **PR #39** · Mkt Inteligence > Ads: filtro por plataforma (Google, Meta, TikTok, LinkedIn) para ver Meta Ads por separado. Usa `metricas_campanas` y las plantillas de carga de #33; sin migraciones. **Pendiente de unir a `main`.**
- **PR #38** · Mkt Inteligence > SEO: palabras clave por semana (posición, cambio vs semana anterior, volumen, dificultad, URL) con KPIs de top 3, top 10 y posición media. Carga por CSV con plantilla «SEO · palabras clave», que reconoce encabezados de Semrush en español e inglés; como los exports no traen fecha, se indica la semana del archivo. Migración `crm_20`: tabla `seo_keywords` con políticas de miembros. Incluye también el cambio de #36 (grupos en datos comerciales), que no llegó a `main` porque se unió a una rama ya fusionada. **Pendiente de unir a `main`.**
- **PR #37** · Admin > Pipeline: editor de etapas (antes no había forma de editarlas desde la app). Permite renombrar, cambiar color y probabilidad del forecast, marcar cada etapa como en curso, ganada o perdida (solo una de cada una), activar o desactivar y reordenar, y crear etapas. No se desactiva una etapa con negocios abiertos. El tablero y «Nuevo negocio» muestran solo etapas activas. Sin migraciones: usa `etapas` y su política de admin existente. Pipelines múltiples quedan para después. **Pendiente de unir a `main`.**
- **PR #36** · Ficha de empresa, Datos y acceso: el bloque comercial pasa a una tarjeta con tres grupos etiquetados (Estado, Económico, Responsable) separados por líneas, en lugar de un bloque continuo. Sin cambios de datos ni migraciones. Va encima de #35. **Pendiente de unir a `main`.**
- **PR #35** · Limpieza: 39 imports, variables y estados sin uso eliminados (incluido un estado de búsqueda en GlobalSearchModal que se escribía y nunca se leía). Cuentas y permisos: ya no lista las 14 plataformas; muestra solo las registradas agrupadas en Publicidad, Analítica y web, y Negocio y redes, con chips de «Sin registrar» para agregar. Sin cambios de datos ni migraciones. **Pendiente de unir a `main`.**
- **PR #34** · Ficha de empresa, pestaña Datos y acceso: los parámetros comerciales y de contrato (estado, plan, salud, fee, setup, renovación, responsable, MRR) pasan arriba, antes de los enlaces y las cuentas. Sin cambios de datos ni migraciones. El rediseño de accesos queda para más adelante. **Pendiente de unir a `main`.**
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
- **PR #31** · Mkt Inteligence > Estrategia rediseñada: encabezado con avance del cliente y tres bloques (Negocio, Mercado, Marca y creativos) con tarjetas de lectura que se editan al hacer clic; los campos vacíos muestran la guía. Mismo guardado automático y botón de brief. Sin migraciones. **Pendiente de unir a `main`.**
- **PR #32** · Ficha de cliente unificada: en Mkt Inteligence > Cliente el botón «Abrir ficha» abre la misma ficha de Empresa, directo en la pestaña nueva **Marketing** (solo clientes) con métricas de la última semana y variación, campañas de la última semana con ROAS y la estrategia definida. Sin migraciones. **Pendiente de unir a `main`.**
- **PR #33** · Mkt Inteligence > Cargar datos: importador CSV con vista previa, plantillas (métricas semanales genéricas, campañas de pauta genéricas y export de Meta Ads en español/inglés), CSV de ejemplo descargable, reconocimiento de encabezados y formatos de número y fecha chilenos, fechas agrupadas al lunes y filas repetidas sumadas o actualizadas. Migración `crm_19`: columnas `origen` (conector/csv/manual) y `cargado_por` en `metricas_snapshot` y `metricas_campanas`, nuevas plataformas orgánicas (Instagram, Facebook, TikTok, LinkedIn, YouTube), cualquier miembro puede cargar campañas y bitácora `cargas_datos`. **Pendiente de unir a `main`.**
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
