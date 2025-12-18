# Agendamiento Horas Médicas

Aplicación mínima para controlar y agendar horas médicas por especialista.

Requisitos:
- Node.js 16+ (o compatible)

Instalación y ejecución (PowerShell o CMD):

```powershell
npm install
npm start
```

La aplicación servirá la UI en `http://localhost:3000/`.

Endpoints principales (API):
- `GET /api/specialists` — lista especialistas
- `GET /api/specialists/:id/slots?date=YYYY-MM-DD` — franjas para un especialista en una fecha
- `POST /api/appointments` — crear cita (JSON: `specialist_id`, `date`, `time`, `patient_name`, `patient_contact`)
- `GET /api/appointments` — listar citas

Notas:
- La base de datos SQLite se crea como `database.db` en la raíz del proyecto.
- Hay datos de ejemplo para especialistas si la tabla está vacía.

