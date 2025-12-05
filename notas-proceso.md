# notas-proceso.md

En esta prueba implementé un mini-proyecto fullstack con los requisitos solicitados.

Qué partes fueron difíciles o que tomé en cuenta:
- La URL proporcionada en el enunciado contenía caracteres extraños y parecía truncada. Para evitar romper la ejecución, dejé la URL original como valor por defecto en el hook y además expuse un endpoint local `/api/asociados` en el backend que entrega un JSON de ejemplo. El frontend intenta consumir la URL pública configurada y si falla puede usarse la copia local.
- Implementar validaciones de transición de estado requiere definir reglas de negocio(se pueden ajustar fácilmente).
- La regla adicional de negocio (no avanzar a "Pendiente Jurídico" si `aporte_49900_pagado = false`) se aplica en el frontend y se devuelve un con mensaje claro.
- Para simplicidad y portabilidad usé un archivo JSON (server/db/asociados.json) como "almacén" mock que actualizo desde el endpoint `updateEstadoPipeline`. En un entorno real usaría una base de datos y control de concurrencia.
- El hook `useAsociados()` maneja carga, errores y permite recargar (refresh).
- La UI es simple y limpia, priorizando claridad y accesibilidad mínima (tabla, select, mensajes de carga/error).

Se puede, puedo:
- Ajustar la URL base por defecto si me confirmas la URL correcta.
- Cambiar persistencia a una base de datos (p. ej. MongoDB).
- Proveer pruebas unitarias para el backend y/o componentes.

Notas rápidas sobre funcionamiento:
- Frontend: client/ (Vite + React + TS)
- Backend: server/ (Express, endpoint GET /api/asociados y POST /api/updateEstadoPipeline)
- Regla de negocio adicional: si `nuevoEstado === "Pendiente Jurídico"` y `aporte_49900_pagado === false`, la actualización es rechazada.

Lo que mas me costo fue la implementacion correcta del uso json, debido a que no me permitia leer y modificar los datos del link raw decidi hacer una copia local pero que la aplicacion incialmente intente 
leer la informacion desde el link pero al marcas error termina leyendo la loca.
