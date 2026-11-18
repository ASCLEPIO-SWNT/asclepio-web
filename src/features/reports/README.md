Tablero de reportes de F-07 (`/reportes`, solo ADMIN; F-07-web).

- `components/ReportsPage.tsx`: encabezado con «Actualizar», región «Periodo» (`PeriodForm`), barra «Indicadores» y los paneles «De la llegada al triage», «Triage I y II», «Concordancia IA–enfermería» y «Uso de respaldo y safety guards», más «Exportar».
- `hooks/useReportSummary.ts`: un único `GET /api/v1/reports/summary` del periodo aplicado, repetido cada ciclo de los dashboards con la pestaña visible (salvo tras 400, 403 o 422).
- `hooks/useCsvDownload.ts`: `GET /api/v1/reports/encounters.csv` del periodo aplicado; el archivo se guarda con `shared/lib/download.ts` y no entra en la caché.
- `reportsView.ts`: formateo de los valores del servidor (sin recalcularlos), periodo por defecto (los últimos siete días civiles en Bogotá) y nombre del CSV.

La web no calcula ningún indicador: los muestra tal como llegan, con «Sin datos» en los `null`. El CSV es de formato interno, no el reporte oficial de la Res. 373 / SISPRO.
