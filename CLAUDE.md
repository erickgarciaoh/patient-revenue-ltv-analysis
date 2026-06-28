# patient_revenue_ltv_analysis

## Objetivo
Rehacer un análisis financiero de pacientes (revenue, tipos de cita, LTV) con un approach nuevo: pipeline SQL-céntrico (raw → procesado → consumo) construido con loops agénticos, y doble capa de consumo (HTML data-story + Power BI) como pieza de portfolio.

## Plan por fases

| Fase | Descripción | Estado |
|---|---|---|
| 0 | Setup: estructura, git, CLAUDE.md con plan | Hecho |
| 1 | Ingesta: BDD del proyecto + tabla raw (NVARCHAR) + SP importador del CSV (loop: ejecutar→corregir). CSV cargado y apartado | Pendiente |
| 2 | Exploración + reporte de calidad de datos; confirmar ventana temporal; fijar reglas de limpieza y la interpretación del waterfall LTV | Pendiente |
| 3 | Transformación: SPs que limpian/castean y materializan tablas procesadas (estrella ligera) | Pendiente |
| 4 | Análisis: 4 tareas core + funnel Tipo1→Tipo2, cohortes/retención, Pareto | Pendiente |
| 5 | Diseño de delivery: qué visual cuenta cada historia, layout (anti-bloatware) | Pendiente |
| 6 | HTML data-story (front-end primario, hosteable en GitHub Pages) | Pendiente |
| 7 | Power BI: modelo + DAX + reporte + publish-to-web + capturas (fase aditiva) | Pendiente |
| 8 | Landing/repo: narrativa, README, deploy | Pendiente |

Regla de corte anti-abandono: las fases 1→6 forman una pieza de portfolio completa y publicable por sí sola. La 7 es aditiva; si baja la energía, parar en 6 con entregable terminado, no a medias.

### Tareas de análisis (Fase 4)
Core:
1. Resumen ejecutivo mensual: conteo citas Tipo 1 vs 2, pacientes únicos, revenue.
2. Waterfall para LTV + metodología. Interpretación elegida (a pinar en Fase 2): descomposición del LTV promedio = $50 intake + (revenue Tipo 2 × frecuencia media de visitas).
3. Primera fecha de servicio, Appointment UID y revenue (de esa primera cita) de pacientes 108, 224, 842, 416, 889, 1019. + cómo usar esto para mejorar LTV.
4. Proyectar citas a dic-2026 de esos pacientes vía cadencia individual (intervalo medio entre visitas). Asunciones, drivers, impacto en planificación de revenue.

Adicionales (in-scope):
- Funnel de conversión Tipo 1 ($50 intake) → Tipo 2 (tratamiento, revenue variable). Pregunta de negocio central.
- Cohortes / retención por mes de primera visita.
- Pareto 80/20 de concentración de revenue por paciente.

## Backlog (explícitamente diferido)
- Reporte de calidad de datos como entregable formal independiente (o plegado en Fase 2).
- Survival analysis formal.
- Definición de churn / paciente inactivo (sin visita en N días).
- Modelo predictivo de conversión Tipo 1 → Tipo 2.

## Stack
- Motor de datos único: SQL Server, instancia `XTREMUS\DB001` (Windows Auth).
- Consumo primario: HTML/JS (data-story, hosteable en GitHub Pages).
- Consumo aditivo: Power BI + DAX (publish-to-web + .pbix en repo + capturas).
- Versionado: git local desde Fase 0.

## Datos
- Fuente canónica (versionada en el repo): `data/raw/Data_Financial_Analyst.csv` (~17.294 filas). Copia del original en `D:\Dev\Raw-Datasets\`. El SP importador debe leer la ruta del repo, no la del disco general.
- Nota BULK INSERT/OPENROWSET: el archivo lo lee la cuenta del servicio `MSSQL$DB001`, no el usuario. Si falla con "Access denied", es permiso de esa cuenta sobre la carpeta, no error de SQL.
- Delimitador `;`. Columnas: ` Revenue ` (texto, formato europeo `$ 50,00` — prefijo $, espacios, coma decimal), `Patient ID`, `AdvancedMD Appointment UID`, `1/2` (tipo de cita), `Service Date` (formato `d/m/aaaa`).
- Estructura de negocio: Tipo 1 = 11.367 citas, todas $50 fijos (intake/consulta). Tipo 2 = 5.927 citas, revenue variable. El paso 1→2 es el motor del LTV.
- Importar TODO como NVARCHAR a la tabla raw primero; castear (quitar $, coma→punto, parsear fecha d/m/aaaa) en el SP de transformación, no en la carga.
- Modelo objetivo (Fase 3): estrella ligera — `fact_appointment` (grano cita) + `dim_patient`, `dim_date`, `dim_appointment_type`.

## Convenciones
<!-- Solo deltas respecto al CLAUDE.md global. -->
