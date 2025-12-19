// --- Utils ---
async function fetchJSON(url, opts) {
  try {
    const res = await fetch(url, opts);
    if (!res.ok) {
      const text = await res.text();
      let msg = text;
      try { msg = JSON.parse(text).error; } catch (e) { }
      throw new Error(msg || res.statusText);
    }
    return res.json();
  } catch (err) {
    if (err.message.includes('Failed to fetch')) {
      throw new Error('No se pudo conectar con el servidor. Asegúrese de que "node server.js" esté corriendo.');
    }
    throw err;
  }
}

function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

// --- Navigation ---
const navRequestBtn = document.getElementById('navRequestBtn');
const navAdminBtn = document.getElementById('navAdminBtn');
const sectionClient = document.getElementById('sectionClient');
const sectionAdmin = document.getElementById('sectionAdmin');

function switchTab(tab) {
  if (tab === 'client') {
    sectionClient.hidden = false;
    sectionAdmin.hidden = true;
    navRequestBtn.classList.add('active');
    if (navAdminBtn) navAdminBtn.classList.remove('active');

    // Auto-scroll to booking section for better UX
    const target = document.getElementById('bookingScrollTarget');
    if (target) target.scrollIntoView({ behavior: 'smooth' });
  } else {
    sectionClient.hidden = true;
    sectionAdmin.hidden = false;
    navRequestBtn.classList.remove('active');
    if (navAdminBtn) navAdminBtn.classList.add('active');
    loadAppointments(); // Refresh admin data
  }
}

navRequestBtn.addEventListener('click', () => switchTab('client'));

// Handle other nav links (Inicio, Especialidades, Nosotros)
document.querySelectorAll('.nav-link[href^="#"]').forEach(link => {
  link.addEventListener('click', (e) => {
    // If we are in Admin section, switch back to Client first
    if (!sectionAdmin.hidden) {
      switchTab('client');
    }
  });
});

if (navAdminBtn) {
  navAdminBtn.addEventListener('click', () => {
    // Show login modal instead of switching immediately
    document.getElementById('loginModal').hidden = false;
    document.getElementById('adminPassword').value = '';
    document.getElementById('adminPassword').focus();
  });
}

// Login Logic
const loginModal = document.getElementById('loginModal');
document.getElementById('closeLoginModal').addEventListener('click', () => loginModal.hidden = true);

document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const password = document.getElementById('adminPassword').value;

  try {
    const res = await fetchJSON('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });

    if (res.success) {
      showToast('Acceso concedido');
      loginModal.hidden = true;
      switchTab('admin');
    }
  } catch (err) {
    showToast('Acceso denegado: ' + err.message, 'error');
  }
});

// --- Client Logic ---
let allSpecialists = [];

async function loadSpecialists() {
  try {
    allSpecialists = await fetchJSON('/api/specialists');

    // Populate Specialties Dropdown (Unique)
    const specialtySet = new Set(allSpecialists.map(s => s.specialty));
    const specialtySel = document.getElementById('specialtyFilter');
    specialtySel.innerHTML = '<option value="" disabled selected>Seleccione Especialidad...</option>';

    specialtySet.forEach(sp => {
      const opt = document.createElement('option');
      opt.value = sp;
      opt.textContent = sp;
      specialtySel.appendChild(opt);
    });

    // Reset Specialist Dropdown
    const specialistSel = document.getElementById('specialist');
    specialistSel.innerHTML = '<option value="" disabled selected>Primero seleccione especialidad...</option>';
    specialistSel.disabled = true;

  } catch (err) {
    showToast('Error cargando datos: ' + err.message, 'error');
  }
}

// Filter Logic
document.getElementById('specialtyFilter').addEventListener('change', (e) => {
  const selectedSpecialty = e.target.value;
  const specialistSel = document.getElementById('specialist');

  // Filter specialists
  const filtered = allSpecialists.filter(s => s.specialty === selectedSpecialty);

  specialistSel.innerHTML = '<option value="" disabled selected>Seleccione un especialista...</option>';
  filtered.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s.id;
    opt.textContent = s.name;
    specialistSel.appendChild(opt);
  });

  specialistSel.disabled = false;
});

document.getElementById('checkSlots').addEventListener('click', async () => {
  const specialistId = document.getElementById('specialist').value;
  const date = document.getElementById('date').value;
  const list = document.getElementById('slotList');
  const container = document.getElementById('slotsContainer');

  if (!specialistId || !date) return showToast('Seleccione especialista y fecha', 'error');

  try {
    list.innerHTML = '<p>Cargando...</p>';
    container.hidden = false;
    const res = await fetchJSON(`/api/specialists/${specialistId}/slots?date=${date}`);
    list.innerHTML = '';

    if (res.slots.length === 0) {
      list.innerHTML = '<p>No hay horarios disponibles.</p>';
      return;
    }

    res.slots.forEach(s => {
      if (!s.available) return; // Optional: hide taken slots or style them differently
      const btn = document.createElement('div');
      btn.className = 'slot-btn';
      btn.textContent = s.time;
      btn.addEventListener('click', () => openBookingModal(s.time));
      list.appendChild(btn);
    });

    if (list.children.length === 0) {
      list.innerHTML = '<p>No hay cupos disponibles para este día.</p>';
    }
  } catch (err) {
    showToast('Error: ' + err.message, 'error');
  }
});

// Modal
const modal = document.getElementById('bookForm');
document.getElementById('closeBookForm').addEventListener('click', () => modal.hidden = true);
let currentBookingData = {};

function openBookingModal(time) {
  const sel = document.getElementById('specialist');
  const specialistText = sel.options[sel.selectedIndex].text; // .text gives the visible text
  const date = document.getElementById('date').value;

  currentBookingData = {
    specialist_id: Number(sel.value),
    date,
    time
  };

  document.getElementById('selectedSpecialist').textContent = specialistText;
  document.getElementById('selectedDate').textContent = date;
  document.getElementById('selectedTime').textContent = time;
  modal.hidden = false;
}

document.getElementById('appointmentForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const patient_name = document.getElementById('patientName').value.trim();
  const patient_contact = document.getElementById('patientContact').value.trim();
  const reason = document.getElementById('patientReason').value.trim();
  const insurance = document.getElementById('patientInsurance').value;

  try {
    const res = await fetchJSON('/api/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...currentBookingData, patient_name, patient_contact, reason, insurance })
    });

    showToast('Reserva confirmada con éxito');
    modal.hidden = true;
    document.getElementById('appointmentForm').reset();
    document.getElementById('slotsContainer').hidden = true; // Reset search

    if (res.whatsapp_url) {
      // Small delay to let toast show
      setTimeout(() => window.open(res.whatsapp_url, '_blank'), 1000);
    }
  } catch (err) {
    showToast('Error al reservar: ' + err.message, 'error');
  }
});

// --- Admin Logic ---
let currentAppointments = [];

async function loadAppointments() {
  const tbody = document.getElementById('appointmentsList');
  tbody.innerHTML = '<tr><td colspan="6">Cargando...</td></tr>';
  try {
    currentAppointments = await fetchJSON('/api/appointments');
    loadDashboard(); // Update stats whenever appts load

    tbody.innerHTML = '';
    if (currentAppointments.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6">No hay citas registradas.</td></tr>';
      return;
    }
    currentAppointments.forEach(a => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${a.date}</td>
        <td>${a.time}</td>
        <td>${a.specialist_name} <br> <small class="text-light">${a.specialty}</small></td>
        <td>
           ${a.patient_name} <br> 
           <small>Prev: ${a.insurance || '-'}</small>
        </td>
        <td>${a.patient_contact || '-'}</td>
        <td>
          <button class="btn btn-sm btn-outline" style="color:red; border-color:red" onclick="deleteAppointment(${a.id})">Eliminar</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    showToast('Error cargando citas: ' + err.message, 'error');
  }
}

// Chart instances (global to allow updates)
let chartSpecialists = null;
let chartWeekly = null;

function loadDashboard() {
  if (currentAppointments.length === 0) {
    // Reset KPIs
    document.getElementById('kpiTotalCitas').textContent = '0';
    document.getElementById('kpiTotalPacientes').textContent = '0';
    document.getElementById('kpiEspecialistas').textContent = allSpecialists.length || '0';
    document.getElementById('kpiHoy').textContent = '0';
    return;
  }

  // Calculate KPIs
  const totalCitas = currentAppointments.length;
  const uniquePatients = new Set(currentAppointments.map(a => a.patient_name.toLowerCase())).size;
  const today = new Date().toISOString().split('T')[0];
  const citasHoy = currentAppointments.filter(a => a.date === today).length;

  // Update KPI Cards
  document.getElementById('kpiTotalCitas').textContent = totalCitas;
  document.getElementById('kpiTotalPacientes').textContent = uniquePatients;
  document.getElementById('kpiEspecialistas').textContent = allSpecialists.length || '0';
  document.getElementById('kpiHoy').textContent = citasHoy;

  // Prepare data for charts
  updateCharts();
}

function updateCharts() {
  // Chart 1: Citas por Especialista (Bar Chart)
  const specialistCounts = {};
  currentAppointments.forEach(a => {
    const name = a.specialist_name || 'Sin asignar';
    specialistCounts[name] = (specialistCounts[name] || 0) + 1;
  });

  const specialistLabels = Object.keys(specialistCounts);
  const specialistData = Object.values(specialistCounts);

  const ctxSpecialists = document.getElementById('chartSpecialists');
  if (chartSpecialists) {
    chartSpecialists.destroy();
  }

  chartSpecialists = new Chart(ctxSpecialists, {
    type: 'bar',
    data: {
      labels: specialistLabels,
      datasets: [{
        label: 'Número de Citas',
        data: specialistData,
        backgroundColor: 'rgba(216, 27, 96, 0.7)',
        borderColor: 'rgba(216, 27, 96, 1)',
        borderWidth: 2,
        borderRadius: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          display: false
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 1
          }
        }
      }
    }
  });

  // Chart 2: Tendencia Semanal (Line Chart)
  const dateCounts = {};
  currentAppointments.forEach(a => {
    dateCounts[a.date] = (dateCounts[a.date] || 0) + 1;
  });

  // Sort dates and get last 7 days or available dates
  const sortedDates = Object.keys(dateCounts).sort();
  const last7Dates = sortedDates.slice(-7);
  const weeklyData = last7Dates.map(date => dateCounts[date]);

  const ctxWeekly = document.getElementById('chartWeekly');
  if (chartWeekly) {
    chartWeekly.destroy();
  }

  chartWeekly = new Chart(ctxWeekly, {
    type: 'line',
    data: {
      labels: last7Dates,
      datasets: [{
        label: 'Citas por Día',
        data: weeklyData,
        backgroundColor: 'rgba(236, 64, 122, 0.2)',
        borderColor: 'rgba(236, 64, 122, 1)',
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: 'rgba(216, 27, 96, 1)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 7
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          display: false
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 1
          }
        }
      }
    }
  });
}

document.getElementById('exportExcel').addEventListener('click', () => {
  if (currentAppointments.length === 0) return showToast('No hay datos para exportar', 'error');

  if (typeof XLSX === 'undefined') return showToast('Error: Librería Excel no cargada. Recargue la página.', 'error');

  const wb = XLSX.utils.book_new();
  const today = new Date().toISOString().split('T')[0];

  // ===== SHEET 1: KPIs y Resumen Ejecutivo =====
  const totalCitas = currentAppointments.length;
  const uniquePatients = new Set(currentAppointments.map(a => a.patient_name.toLowerCase())).size;
  const citasHoy = currentAppointments.filter(a => a.date === today).length;
  const totalEspecialistas = allSpecialists.length || 0;

  const kpiData = [
    ['REPORTE KMINA SALUD - DASHBOARD EJECUTIVO'],
    ['Generado:', new Date().toLocaleString('es-CL')],
    [''],
    ['INDICADORES CLAVE (KPIs)'],
    ['Métrica', 'Valor'],
    ['📅 Total Citas', totalCitas],
    ['👥 Pacientes Únicos', uniquePatients],
    ['🩺 Especialistas Activos', totalEspecialistas],
    ['📊 Citas Hoy', citasHoy],
    [''],
    ['CITAS POR ESPECIALISTA'],
    ['Especialista', 'Total Citas']
  ];

  // Agregar conteo por especialista
  const specialistCounts = {};
  currentAppointments.forEach(a => {
    const name = a.specialist_name || 'Sin asignar';
    specialistCounts[name] = (specialistCounts[name] || 0) + 1;
  });

  Object.entries(specialistCounts).sort((a, b) => b[1] - a[1]).forEach(([name, count]) => {
    kpiData.push([name, count]);
  });

  kpiData.push(['']);
  kpiData.push(['TENDENCIA ÚLTIMOS 7 DÍAS']);
  kpiData.push(['Fecha', 'Citas']);

  // Agregar tendencia de últimos 7 días
  const dateCounts = {};
  currentAppointments.forEach(a => {
    dateCounts[a.date] = (dateCounts[a.date] || 0) + 1;
  });

  const sortedDates = Object.keys(dateCounts).sort();
  const last7Dates = sortedDates.slice(-7);
  last7Dates.forEach(date => {
    kpiData.push([date, dateCounts[date]]);
  });

  const wsKPI = XLSX.utils.aoa_to_sheet(kpiData);

  // Estilos para la hoja de KPIs
  wsKPI['!cols'] = [{ wch: 30 }, { wch: 15 }];

  XLSX.utils.book_append_sheet(wb, wsKPI, "Dashboard");

  // ===== SHEET 2: Resumen por Especialista y Fecha =====
  const counts = {};
  currentAppointments.forEach(a => {
    const key = `${a.specialist_name}||${a.date}`;
    counts[key] = (counts[key] || 0) + 1;
  });

  const summaryData = Object.entries(counts).map(([key, count]) => {
    const [name, date] = key.split('||');
    return {
      Especialista: name,
      Fecha: date,
      'Citas Agendadas': count
    };
  }).sort((a, b) => {
    if (a.Especialista < b.Especialista) return -1;
    if (a.Especialista > b.Especialista) return 1;
    if (a.Fecha < b.Fecha) return -1;
    if (a.Fecha > b.Fecha) return 1;
    return 0;
  });

  const wsSummary = XLSX.utils.json_to_sheet(summaryData);
  wsSummary['!cols'] = [{ wch: 25 }, { wch: 12 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, "Resumen por Fecha");

  // ===== SHEET 3: Detalle Completo de Citas =====
  const detailData = currentAppointments.map(a => ({
    Fecha: a.date,
    Hora: a.time,
    Especialista: a.specialist_name,
    Especialidad: a.specialty,
    Paciente: a.patient_name,
    'Previsión': a.insurance || '-',
    Contacto: a.patient_contact || '-',
    'Motivo Consulta': a.reason || '-'
  }));

  const wsDetail = XLSX.utils.json_to_sheet(detailData);
  wsDetail['!cols'] = [
    { wch: 12 }, // Fecha
    { wch: 8 },  // Hora
    { wch: 22 }, // Especialista
    { wch: 20 }, // Especialidad
    { wch: 22 }, // Paciente
    { wch: 12 }, // Previsión
    { wch: 15 }, // Contacto
    { wch: 35 }  // Motivo
  ];
  XLSX.utils.book_append_sheet(wb, wsDetail, "Detalle Completo");

  // ===== SHEET 4: Estadísticas por Previsión =====
  const insuranceCounts = {};
  currentAppointments.forEach(a => {
    const insurance = a.insurance || 'Sin especificar';
    insuranceCounts[insurance] = (insuranceCounts[insurance] || 0) + 1;
  });

  const insuranceData = Object.entries(insuranceCounts).map(([insurance, count]) => ({
    'Tipo Previsión': insurance,
    'Cantidad': count,
    'Porcentaje': ((count / totalCitas) * 100).toFixed(1) + '%'
  })).sort((a, b) => b.Cantidad - a.Cantidad);

  const wsInsurance = XLSX.utils.json_to_sheet(insuranceData);
  wsInsurance['!cols'] = [{ wch: 20 }, { wch: 12 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, wsInsurance, "Por Previsión");

  // Descargar archivo
  const fileName = `Reporte_Kmina_${today}.xlsx`;
  XLSX.writeFile(wb, fileName);

  showToast('Excel exportado exitosamente', 'success');
});

window.deleteAppointment = async (id) => {
  if (!confirm('¿Seguro que desea eliminar esta cita?')) return;
  try {
    await fetchJSON(`/api/appointments/${id}`, { method: 'DELETE' });
    showToast('Cita eliminada');
    await loadAppointments();
  } catch (err) {
    showToast('Error: ' + err.message, 'error');
  }
};

async function loadAdminSpecialists() {
  const listEl = document.getElementById('specialistsList');
  listEl.innerHTML = '<p>Cargando...</p>';
  try {
    const list = await fetchJSON('/api/specialists');
    listEl.innerHTML = '';
    if (list.length === 0) {
      listEl.innerHTML = '<p>No hay especialistas.</p>';
      return;
    }
    list.forEach(s => {
      const li = document.createElement('li');
      li.className = 'list-item';
      li.innerHTML = `
        <div class="info">
          <strong>${s.name}</strong>
          <small>${s.specialty}</small>
        </div>
        <button class="btn btn-sm btn-outline danger" onclick="deleteSpecialist(${s.id})">&times;</button>
      `;
      listEl.appendChild(li);
    });
  } catch (err) {
    showToast('Error cargando especialistas: ' + err.message, 'error');
  }
}

window.deleteSpecialist = async (id) => {
  if (!confirm('¿Seguro que desea eliminar a este especialista? Esto no borrará sus citas pasadas pero afectará las futuras.')) return;
  try {
    await fetchJSON(`/api/specialists/${id}`, { method: 'DELETE' });
    showToast('Especialista eliminado');
    await loadAdminSpecialists();
    await loadSpecialists(); // Refresh client dropdown
  } catch (err) {
    showToast('Error: ' + err.message, 'error');
  }
};

document.getElementById('refreshAppts').addEventListener('click', loadAppointments);
document.getElementById('refreshSpecs').addEventListener('click', loadAdminSpecialists);

document.getElementById('specialistForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('spName').value.trim();
  const specialty = document.getElementById('spSpecialty').value.trim();
  const start_hour = document.getElementById('spStart').value.trim();
  const end_hour = document.getElementById('spEnd').value.trim();
  const slot_minutes = Number(document.getElementById('spSlot').value) || 30;

  try {
    await fetchJSON('/api/specialists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, specialty, start_hour, end_hour, slot_minutes })
    });
    showToast('Especialista creado correctamente');
    document.getElementById('specialistForm').reset();
    loadAdminSpecialists();
    loadSpecialists();
  } catch (err) {
    showToast('Error al crear: ' + err.message, 'error');
  }
});

// --- Init ---
window.addEventListener('load', () => {
  loadSpecialists();
  // Check hash to see if we should start in admin, mostly for dev convenience
  if (window.location.hash === '#admin') switchTab('admin');

  // Initial admin load (lazy load would be better but this is fine)
  loadAdminSpecialists();
  loadAppointments();

  // --- Image Preview Logic ---
  const imgModal = document.getElementById('imageModal');
  const previewImg = document.getElementById('previewImage');
  const closeImgModal = document.getElementById('closeImageModal');

  function openPreview(src) {
    previewImg.src = src;
    imgModal.hidden = false;
  }

  closeImgModal.addEventListener('click', () => {
    imgModal.hidden = true;
  });

  // Attach to all images in wrapper and rounded-img
  document.querySelectorAll('.img-wrapper img, .rounded-img').forEach(img => {
    img.addEventListener('click', () => openPreview(img.src));
  });

  // Close modal when clicking outside the content
  imgModal.addEventListener('click', (e) => {
    if (e.target === imgModal) imgModal.hidden = true;
  });
});
