const express = require('express');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const DB_FILE = path.join(__dirname, 'database.db');
const db = new sqlite3.Database(DB_FILE);

// --- Helpers ---
function sendError(res, status, message) {
  res.status(status).json({ error: message });
}

function timeToMinutes(t) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(m) {
  const hh = String(Math.floor(m / 60)).padStart(2, '0');
  const mm = String(m % 60).padStart(2, '0');
  return `${hh}:${mm}`;
}

// --- Database Init ---
function initDb() {
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS specialists (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      specialty TEXT NOT NULL,
      start_hour TEXT NOT NULL,
      end_hour TEXT NOT NULL,
      slot_minutes INTEGER DEFAULT 30
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS appointments (
      id INTEGER PRIMARY KEY,
      specialist_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      patient_name TEXT NOT NULL,
      patient_contact TEXT,
      reason TEXT,
      insurance TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(specialist_id) REFERENCES specialists(id)
    )`);

    // Standardize hours for everyone on init
    db.run("UPDATE specialists SET start_hour='08:00', end_hour='20:00'");

    db.get(`SELECT COUNT(*) as c FROM specialists`, (err, row) => {
      if (err) return console.error(err);
      if (row.c === 0) {
        const stmt = db.prepare(`INSERT INTO specialists (name, specialty, start_hour, end_hour, slot_minutes) VALUES (?, ?, ?, ?, ?)`);
        stmt.run('Dr. Ana Pérez', 'Cardiología', '08:00', '20:00', 30);
        stmt.run('Dr. Luis Martínez', 'Pediatría', '08:00', '20:00', 30);
        stmt.run('Dra. Carmen Silva', 'Medicina General', '08:00', '20:00', 20);
        stmt.finalize();
        console.log('Seeded specialists');
      }
    });
  });
}

// --- Routes ---

// GET /api/specialists
app.get('/api/specialists', (req, res) => {
  db.all('SELECT * FROM specialists', (err, rows) => {
    if (err) return sendError(res, 500, err.message);
    res.json(rows);
  });
});

// POST /api/specialists
app.post('/api/specialists', (req, res) => {
  const { name, specialty, start_hour, end_hour, slot_minutes } = req.body;
  if (!name || !specialty || !start_hour || !end_hour) {
    return sendError(res, 400, 'Faltan campos obligatorios (name, specialty, start_hour, end_hour)');
  }

  if (!/^\d{2}:\d{2}$/.test(start_hour) || !/^\d{2}:\d{2}$/.test(end_hour)) {
    return sendError(res, 400, 'Formato de hora inválido (HH:MM)');
  }

  // Force standardize? Or just allow what is sent? User asked to standarize "for everyone".
  // Let's assume input is still respected but defaults are 08-20 if frontend changes.

  const stmt = db.prepare('INSERT INTO specialists (name, specialty, start_hour, end_hour, slot_minutes) VALUES (?, ?, ?, ?, ?)');
  stmt.run(name, specialty, start_hour, end_hour, slot_minutes || 30, function (err) {
    if (err) return sendError(res, 500, err.message);
    res.json({ id: this.lastID, name, specialty, start_hour, end_hour, slot_minutes: slot_minutes || 30 });
  });
});

// --- Login Endpoint (Simple) ---
app.post('/api/login', (req, res) => {
  const { password } = req.body;
  if (password === 'admin') {
    res.json({ success: true });
  } else {
    sendError(res, 401, 'Contraseña incorrecta');
  }
});

// PUT /api/specialists/:id
app.put('/api/specialists/:id', (req, res) => {
  const id = Number(req.params.id);
  const { name, specialty, start_hour, end_hour, slot_minutes } = req.body;

  if (!name || !specialty || !start_hour || !end_hour) return sendError(res, 400, 'Faltan campos');

  db.run('UPDATE specialists SET name=?, specialty=?, start_hour=?, end_hour=?, slot_minutes=? WHERE id=?',
    [name, specialty, start_hour, end_hour, slot_minutes || 30, id], function (err) {
      if (err) return sendError(res, 500, err.message);
      res.json({ id, name, specialty, start_hour, end_hour, slot_minutes: slot_minutes || 30 });
    });
});
// DELETE /api/specialists/:id
app.delete('/api/specialists/:id', (req, res) => {
  const id = Number(req.params.id);
  db.run('DELETE FROM specialists WHERE id = ?', [id], function (err) {
    if (err) return sendError(res, 500, err.message);
    res.json({ deleted: id });
  });
});

// GET /api/specialists/:id/slots?date=YYYY-MM-DD
app.get('/api/specialists/:id/slots', (req, res) => {
  const specialistId = Number(req.params.id);
  const date = req.query.date;
  if (!date) return sendError(res, 400, 'Se requiere query param date=YYYY-MM-DD');

  db.get('SELECT * FROM specialists WHERE id = ?', [specialistId], (err, specialist) => {
    if (err) return sendError(res, 500, err.message);
    if (!specialist) return sendError(res, 404, 'Especialista no encontrado');

    const start = timeToMinutes(specialist.start_hour);
    const end = timeToMinutes(specialist.end_hour);
    const step = specialist.slot_minutes || 30;

    db.all('SELECT time FROM appointments WHERE specialist_id = ? AND date = ?', [specialistId, date], (err2, appointments) => {
      if (err2) return sendError(res, 500, err2.message);

      const taken = new Set((appointments || []).map(a => a.time));
      const slots = [];

      for (let t = start; t + step <= end; t += step) {
        const timeStr = minutesToTime(t);
        slots.push({ time: timeStr, available: !taken.has(timeStr) });
      }
      res.json({ date, slots });
    });
  });
});

// GET /api/appointments
// Optional query params: date (YYYY-MM-DD), specialist_id
app.get('/api/appointments', (req, res) => {
  let query = 'SELECT a.*, s.name as specialist_name, s.specialty FROM appointments a LEFT JOIN specialists s ON a.specialist_id = s.id';
  const params = [];
  const constraints = [];

  if (req.query.date) {
    constraints.push('a.date = ?');
    params.push(req.query.date);
  }
  if (req.query.specialist_id) {
    constraints.push('a.specialist_id = ?');
    params.push(req.query.specialist_id);
  }

  if (constraints.length > 0) {
    query += ' WHERE ' + constraints.join(' AND ');
  }

  query += ' ORDER BY a.date, a.time';

  db.all(query, params, (err, rows) => {
    if (err) return sendError(res, 500, err.message);
    res.json(rows);
  });
});

// POST /api/appointments
app.post('/api/appointments', (req, res) => {
  const { specialist_id, date, time, patient_name, patient_contact, reason, insurance } = req.body;

  if (!specialist_id || !date || !time || !patient_name) {
    return sendError(res, 400, 'Faltan campos: specialist_id, date, time, patient_name');
  }

  // Check overlap
  db.get('SELECT COUNT(*) as c FROM appointments WHERE specialist_id = ? AND date = ? AND time = ?', [specialist_id, date, time], (err, row) => {
    if (err) return sendError(res, 500, err.message);
    if (row.c > 0) return sendError(res, 409, 'La franja ya está ocupada');

    const stmt = db.prepare('INSERT INTO appointments (specialist_id, date, time, patient_name, patient_contact, reason, insurance) VALUES (?, ?, ?, ?, ?, ?, ?)');
    stmt.run(specialist_id, date, time, patient_name, patient_contact || '', reason || '', insurance || '', function (err2) {
      if (err2) return sendError(res, 500, err2.message);

      // WhatsApp link logic
      db.get('SELECT name FROM specialists WHERE id = ?', [specialist_id], (e, srow) => {
        const specialistName = srow ? srow.name : 'especialista';
        const msg = `Confirmo cita con ${specialistName} el ${date} a las ${time} para ${patient_name}. Motivo: ${reason || '-'}, Previsión: ${insurance || '-'}`;
        const whatsapp_url = 'https://wa.me/56920715811?text=' + encodeURIComponent(msg);
        res.json({ id: this.lastID, specialist_id, date, time, patient_name, patient_contact, reason, insurance, whatsapp_url });
      });
    });
  });
});

// PUT /api/appointments/:id
app.put('/api/appointments/:id', (req, res) => {
  const id = Number(req.params.id);
  const { specialist_id, date, time, patient_name, patient_contact, reason, insurance } = req.body;
  if (!specialist_id || !date || !time || !patient_name) return sendError(res, 400, 'Faltan campos');

  // Check overlap excluding current appointment
  db.get('SELECT COUNT(*) as c FROM appointments WHERE specialist_id = ? AND date = ? AND time = ? AND id != ?', [specialist_id, date, time, id], (err, row) => {
    if (err) return sendError(res, 500, err.message);
    if (row.c > 0) return sendError(res, 409, 'La franja ya está ocupada por otra cita');

    db.run('UPDATE appointments SET specialist_id=?, date=?, time=?, patient_name=?, patient_contact=?, reason=?, insurance=? WHERE id=?',
      [specialist_id, date, time, patient_name, patient_contact || '', reason || '', insurance || '', id], function (err2) {
        if (err2) return sendError(res, 500, err2.message);

        db.get('SELECT name FROM specialists WHERE id = ?', [specialist_id], (e, srow) => {
          const specialistName = srow ? srow.name : 'especialista';
          const msg = `Confirmo cita con ${specialistName} el ${date} a las ${time} para ${patient_name}. Motivo: ${reason || '-'}`;
          const whatsapp_url = 'https://wa.me/56920715811?text=' + encodeURIComponent(msg);
          res.json({ id: id, specialist_id, date, time, patient_name, patient_contact, reason, insurance, whatsapp_url });
        });
      });
  });
});

// DELETE /api/appointments/:id
app.delete('/api/appointments/:id', (req, res) => {
  const id = Number(req.params.id);
  db.run('DELETE FROM appointments WHERE id = ?', [id], function (err) {
    if (err) return sendError(res, 500, err.message);
    res.json({ deleted: id });
  });
});

// GET /api/export-csv (Para descargas automatizadas)
app.get('/api/export-csv', (req, res) => {
  const query = 'SELECT a.date, a.time, s.name as specialist_name, s.specialty, a.patient_name, a.insurance, a.patient_contact, a.reason FROM appointments a LEFT JOIN specialists s ON a.specialist_id = s.id ORDER BY a.date, a.time';

  db.all(query, [], (err, rows) => {
    if (err) return sendError(res, 500, err.message);

    // Header del CSV
    let csv = 'Fecha,Hora,Especialista,Especialidad,Paciente,Prevision,Contacto,Motivo\n';

    // Filas del CSV
    rows.forEach(row => {
      const line = [
        row.date,
        row.time,
        `"${row.specialist_name}"`,
        `"${row.specialty}"`,
        `"${row.patient_name}"`,
        `"${row.insurance || '-'}"`,
        `"${row.patient_contact || '-'}"`,
        `"${row.reason || '-'}"`
      ].join(',');
      csv += line + '\n';
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=Reporte_Kmina_' + new Date().toISOString().split('T')[0] + '.csv');
    res.status(200).send(csv);
  });
});

app.listen(PORT, () => {
  initDb();
  console.log(`Server listening on http://localhost:${PORT}`);
});
