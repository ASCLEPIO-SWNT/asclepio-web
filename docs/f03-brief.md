# F-03-web — Decisiones de interfaz autorizadas

El usuario aprobó por chat el plan completo «F-03-web: dashboard de enfermería y captura clínica» mediante **«PLEASE IMPLEMENT THIS PLAN»**, el 2026-10-28 (America/Bogota). Esta nota y `specs/F-03-web/` materializan ese alcance antes del código. No sustituyen ni amplían las decisiones clínicas de `../asclepio-api/docs/product/features/F-03.md` ni requieren repetir la autorización recibida.

## Alcance resuelto

- `/triage`: bandeja para `NURSE`, estado fijo `WAITING_TRIAGE`, filtro por sede y paginación de 50; `siteId` y `offset` en URL, refresco manual. No hay KPI ni contadores nuevos.
- `/triage/:id`: contexto de paciente/sede/estado/motivo original, dos formularios independientes (toma y hallazgos) e historial. Solo `NURSE` captura y solo mientras la atención esté en espera. El motivo original es inmutable; una precisión se inserta como `COMPLAINT_NOTE`.
- `/atenciones/:id`: historial clínico solo lectura para `NURSE` y `PHYSICIAN`; enlace a captura para `NURSE` en espera. `RECEPTION` y `ADMIN` conservan su detalle existente y ni siquiera solicitan `/clinical-capture`.
- Los campos, dominios, rangos, precisión y coherencia son exactamente los de OpenAPI **0.4.0** y PA-F03-1–4, con la marca **PROVISIONAL — no validado clínicamente, revisar con asesor clínico**. Oxígeno suplementario y ACVPU requieren selección explícita. Sin Glasgow, dolor ni reglas clínicas adicionales.
- Síntomas/hallazgos/notas: 1–20 filas por envío, tipo permitido y descripción de 1–500 caracteres tras quitar espacios extremos. Se añaden/quitan filas antes del envío.
- Un éxito limpia solo su formulario e invalida captura, detalle/eventos y lista; conserva el otro borrador. El historial es de inserciones, con hora del servidor en `America/Bogota` y responsable. No se ofrecen edición ni eliminación de registros guardados.
- `400/422` se asocian a campos con mensajes localizados; un error de red conserva el borrador; `409` refresca estado y bloquea nuevos envíos si dejó de estar en espera. `401/403/404` mantienen el tratamiento de sesión/permiso/no existe. Ningún POST se reintenta automáticamente ni incluye horas, actor o tenant del cliente.
- Borradores únicamente en RAM: sobreviven a cambios de idioma/tema y se reinician al cambiar de atención. No se exige guard de abandono. No se guardan valores clínicos en almacenamiento, URL, logs ni guía de voz.
- Fidelidad visual al `develop` anterior: `NurseView`, `VitalSignsForm` y `RoleDashboardShell`, con los tokens, fuentes y componentes existentes; adaptar contenido/operaciones a la arquitectura actual RHF/Zod. Mantener cinco idiomas, preferencias, teclado y anchos 375/768/1024/1440.
- La guía recibe solo instrucciones estáticas para las rutas nuevas. Al cambiar ruta, idioma o texto cancela, reinicia estado inactivo/sin error y descarta callbacks viejos; probar regreso A→B→A desde reproducción activa y desde error.

## Límites y entrega

La base web es `main` `c94aae5727da8c0e23da0fd78856aee083957963`; la API de referencia es `2f2672bbe7c2cf5c852e7295a90dd225389d27bc`, F-03-api `done`, OpenAPI 0.4.0. La implementación trabaja en `codex/clinical-capture` y cambia solo web. API, móvil, legacy, endpoints, migraciones y base de datos quedan fuera; IA, decisión, cola y reportes permanecen para sus slices.

La verificación incluye pruebas, tipos regenerados sin cambio de contrato, build, revisión independiente y evidencia visual/funcional con datos sintéticos. La API real no tiene `.env` local: su prueba queda condicionada a configuración del equipo; está autorizado concluir con fixtures conformes al contrato y registrar explícitamente la integración real pendiente. El resultado verificado se publica en `main` nuevo sin force push por el líder, conforme al plan aprobado.
