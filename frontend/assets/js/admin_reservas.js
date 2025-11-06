// assets/js/admin_reservas.js

// --- LÓGICA DE ENTORNO AUTOMÁTICO ---
const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const API_BASE_URL = isLocal
  ? 'http://localhost:3000'
  : 'https://cosmeticabackend-dqxh.onrender.com';

document.addEventListener('DOMContentLoaded', () => {
  // --- DOM ---
  const modalOverlay = document.querySelector('.modal-overlay');
  const modalTitle   = document.querySelector('.modal-content h2');
  const openModalBtn = document.querySelector('.btn-open-modal');
  const closeModalBtn= document.querySelector('.modal-close');
  const bookingListContainer = document.querySelector('.booking-list');
  const bookingForm  = document.querySelector('.booking-form');

  const areaFilter   = document.getElementById('area-filter');
  const dateFilter   = document.getElementById('fecha-filter');
  const orderSelect  = document.getElementById('orden-filter');
  const clearBtn     = document.getElementById('limpiar-filtros');

  // Inputs modal
  const nameInput    = document.getElementById('nombre_cliente');
  const rutInput     = document.getElementById('rut_cliente');
  const phoneInput   = document.getElementById('telefono_cliente');
  const serviceSelect= document.getElementById('tipo_servicio');
  const dateInput    = document.getElementById('fecha_reserva');
  const timeSelect   = document.getElementById('hora_reserva');

  let editingBookingId = null;
  let allBookings = []; // fuente de verdad para filtros locales

  // --- Modal ---
  const openModal = () => modalOverlay.classList.add('active');
  const closeModal = () => {
    modalOverlay.classList.remove('active');
    bookingForm.reset();
    editingBookingId = null;
    Array.from(timeSelect.options).forEach(opt => {
      opt.disabled = false; opt.style.color = '';
      if (opt.value) opt.textContent = opt.value.replace('-', ' a ');
    });
  };

  // --- Utilidades ---
  const getSortKey = (b) => {
    const fecha = (b.fecha_reserva || '').slice(0,10);
    let inicio = '00:00';
    if (b.hora_reserva) {
      const m = String(b.hora_reserva).match(/^(\d{2}:\d{2})/);
      if (m) inicio = m[1];
    }
    return `${fecha} ${inicio}`; // lexicográficamente ordenable
  };

  // --- Áreas en filtro ---
  const loadAreasIntoFilter = async () => {
    try {
      const r = await fetch(`${API_BASE_URL}/api/areas`);
      if (!r.ok) throw new Error('No se pudieron cargar las áreas.');
      const areas = await r.json();
      areaFilter.innerHTML = '<option value="todos">Todas las Áreas</option>';
      areas.forEach(a => {
        const opt = document.createElement('option');
        opt.value = a.id_area;
        opt.textContent = a.nombre_area;
        areaFilter.appendChild(opt);
      });
    } catch (e) { console.error(e); }
  };

  // --- Obtener reservas (por área en servidor; resto client-side) ---
  const fetchBookings = async () => {
    const selectedArea = areaFilter.value;
    const url = selectedArea === 'todos'
      ? `${API_BASE_URL}/api/admin/reservas`
      : `${API_BASE_URL}/api/admin/reservas?id_area=${selectedArea}`;

    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error('No se pudieron obtener las reservas.');
      allBookings = await r.json();
      applyAndRender();
    } catch (e) {
      console.error(e);
      bookingListContainer.innerHTML = '<h2>Error</h2><p>No se pudieron cargar las reservas.</p>';
    }
  };

  // --- Aplicar filtros locales + ordenar + render ---
  const applyAndRender = () => {
    const areaVal  = areaFilter.value;
    const fechaVal = (dateFilter.value || '').trim(); // YYYY-MM-DD
    const ordenVal = orderSelect.value; // 'recientes' | 'antiguas'

    let filtered = allBookings.slice();

    // Seguridad: si por alguna razón el backend devolvió varias áreas y hay filtro activo
    if (areaVal !== 'todos') {
      filtered = filtered.filter(b => String(b.id_area) === String(areaVal));
    }

    // Filtro por fecha exacta (día)
    if (fechaVal) {
      filtered = filtered.filter(b => (b.fecha_reserva || '').slice(0,10) === fechaVal);
    }

    // Orden
    filtered.sort((a,b) => {
      const ka = getSortKey(a), kb = getSortKey(b);
      return (ordenVal === 'antiguas') ? ka.localeCompare(kb) : kb.localeCompare(ka);
    });

    renderBookings(filtered);
  };

  // --- Pintar tarjetas ---
  const renderBookings = (bookings) => {
    bookingListContainer.innerHTML = '<h2>Reservas Programadas</h2>';
    if (!bookings || bookings.length === 0) {
      bookingListContainer.innerHTML += '<p>No hay reservas para los filtros aplicados.</p>';
      return;
    }

    bookings.forEach(booking => {
      const card = document.createElement('div');
      card.className = 'booking-card';
      card.dataset.booking = JSON.stringify(booking);

      const fechaBonita = new Date(booking.fecha_reserva)
        .toLocaleDateString('es-CL', {weekday:'long', year:'numeric', month:'long', day:'numeric', timeZone:'UTC'});
      const creadaBonita = new Date(booking.fecha_creacion).toLocaleDateString('es-CL');

      const estadoPago = (booking.estado_pago || 'Pendiente').toLowerCase();
      const idReserva  = booking.id;

      let pagoHTML = '';
      if (estadoPago === 'abonado') {
        pagoHTML = `
          <span class="btn-icon btn-chip btn-abonado" title="Abono ya registrado">
            <i class="fas fa-check"></i> Abonado
          </span>
          <a href="registrar_pago.html?id_reserva=${idReserva}" class="btn-icon btn-pay" title="Registrar Pago Final">
            <i class="fas fa-dollar-sign"></i>
          </a>`;
      } else if (estadoPago === 'pago final' || estadoPago === 'pagado') {
        pagoHTML = `<span class="btn-icon btn-chip btn-pagado" title="Pago completado">
            <i class="fas fa-check-circle"></i> Pagado
          </span>`;
      } else {
        pagoHTML = `<a href="admin_pagos.html?id_reserva=${idReserva}" class="btn-icon btn-pay" title="Registrar Pago/Abono">
            <i class="fas fa-dollar-sign"></i>
          </a>`;
      }

      const fichaHTML = `
        <a href="admin_ficha.html?id_reserva=${idReserva}" class="btn-icon btn-ficha" title="Ver/Añadir Ficha Clínica">
          <i class="fas fa-file-medical"></i>
        </a>
      `;

      card.innerHTML = `
        <div class="booking-header">
          <h3 class="client-name">${booking.nombre_cliente}</h3>
          <div class="booking-actions">
            ${pagoHTML}
            ${fichaHTML}
            <button class="btn-icon btn-edit" title="Editar"><i class="fas fa-pencil-alt"></i></button>
            <button class="btn-icon btn-delete" title="Eliminar"><i class="fas fa-trash-alt"></i></button>
          </div>
        </div>
        <div class="booking-body">
          <p><strong>Servicio:</strong> ${booking.servicio_titulo || 'Servicio eliminado'}</p>
          <p><strong>Área:</strong> ${booking.nombre_area || 'Área no especificada'}</p>
          <p><strong>Fecha:</strong> ${fechaBonita}</p>
          <p><strong>Hora:</strong> ${String(booking.hora_reserva).replace('-', ' a ')}</p>
        </div>
        <div class="booking-footer">
          <div class="client-contact">
            <p><i class="fas fa-id-card"></i> ${booking.rut_cliente || 'No ingresado'}</p>
            <p><i class="fas fa-phone"></i> ${booking.telefono_cliente}</p>
          </div>
          <small class="creation-date">Creado: ${creadaBonita}</small>
        </div>
      `;
      bookingListContainer.appendChild(card);
    });
  };

  // --- Servicios en modal ---
  const loadServicesIntoSelect = async () => {
    try {
      const r = await fetch(`${API_BASE_URL}/api/servicios`);
      if (!r.ok) throw new Error('No se pudieron cargar los servicios.');
      const services = await r.json();
      serviceSelect.innerHTML = '<option value="" disabled selected>Selecciona un servicio...</option>';
      services.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s.id_servicio;
        opt.textContent = s.titulo;
        opt.dataset.area = s.id_area;
        serviceSelect.appendChild(opt);
      });
    } catch (e) {
      console.error(e);
      serviceSelect.innerHTML = '<option value="">Error al cargar</option>';
    }
  };

  // --- Disponibilidad en modal ---
  const checkAvailability = async () => {
    const date = dateInput.value;
    const selectedOpt = serviceSelect.options[serviceSelect.selectedIndex];
    const area = selectedOpt ? selectedOpt.dataset.area : null;

    if (!date || !area) {
      Array.from(timeSelect.options).forEach(opt => {
        if (opt.value) opt.disabled = true;
        else opt.textContent = "Selecciona servicio y fecha";
      });
      return;
    }

    Array.from(timeSelect.options).forEach(opt => {
      if (opt.value) { opt.disabled = true; opt.textContent = 'Cargando...'; }
    });

    try {
      const r = await fetch(`${API_BASE_URL}/api/horarios-ocupados?fecha=${date}&id_area=${area}`);
      if (!r.ok) throw new Error('Error al consultar disponibilidad.');
      const occupied = await r.json();

      Array.from(timeSelect.options).forEach(opt => {
        if (!opt.value) return;
        opt.textContent = opt.value.replace('-', ' a ');
        const isCurrent = editingBookingId && timeSelect.dataset.originalTime === opt.value;
        const isOccupied = occupied.includes(opt.value);
        if (isOccupied && !isCurrent) {
          opt.disabled = true; opt.style.color = '#aaa'; opt.textContent += ' (Reservado)';
        } else {
          opt.disabled = false; opt.style.color = '';
        }
      });
    } catch (e) {
      console.error(e);
      Array.from(timeSelect.options).forEach(opt => { if (opt.value) opt.textContent = 'Error al verificar'; });
    }
  };

  // --- Eventos de filtros ---
  areaFilter.addEventListener('change', fetchBookings);
  dateFilter.addEventListener('change', applyAndRender);
  orderSelect.addEventListener('change', applyAndRender);
  clearBtn.addEventListener('click', () => {
    areaFilter.value = 'todos';
    dateFilter.value = '';
    orderSelect.value = 'recientes';
    fetchBookings();
  });

  // --- Eventos modal ---
  dateInput.addEventListener('change', checkAvailability);
  serviceSelect.addEventListener('change', checkAvailability);

  openModalBtn.addEventListener('click', () => {
    modalTitle.textContent = 'Añadir Nueva Reserva';
    openModal();
  });
  closeModalBtn.addEventListener('click', closeModal);
  modalOverlay.addEventListener('click', e => (e.target === modalOverlay) && closeModal());

  // Submit modal
  bookingForm.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const selectedOpt = serviceSelect.options[serviceSelect.selectedIndex];
    const bookingData = {
      nombre_cliente: nameInput.value,
      rut_cliente: rutInput.value,
      telefono_cliente: phoneInput.value,
      fecha_reserva: dateInput.value,
      hora_reserva: timeSelect.value,
      id_servicio: serviceSelect.value,
      id_area: selectedOpt ? selectedOpt.dataset.area : ''
    };

    const method = editingBookingId ? 'PUT' : 'POST';
    const url = editingBookingId
      ? `${API_BASE_URL}/api/admin/reservas/${editingBookingId}`
      : `${API_BASE_URL}/api/admin/reservas`;

    try {
      const r = await fetch(url, {
        method, headers: {'Content-Type':'application/json'},
        body: JSON.stringify(bookingData)
      });
      if (!r.ok) {
        const err = await r.json().catch(()=>({message:'Error inesperado'}));
        throw new Error(err.message);
      }
      closeModal();
      fetchBookings();
    } catch (e) { alert(`Error: ${e.message}`); }
  });

  // Editar / Eliminar desde tarjetas
  bookingListContainer.addEventListener('click', (ev) => {
    const editBtn = ev.target.closest('.btn-edit');
    const delBtn  = ev.target.closest('.btn-delete');
    if (ev.target.closest('.btn-pay')) return; // no interferir

    if (editBtn) {
      const card = editBtn.closest('.booking-card');
      const booking = JSON.parse(card.dataset.booking);
      modalTitle.textContent = 'Editar Reserva';
      editingBookingId = booking.id;

      nameInput.value = booking.nombre_cliente;
      rutInput.value  = booking.rut_cliente || '';
      phoneInput.value= booking.telefono_cliente;
      const fechaISO = new Date(booking.fecha_reserva).toISOString().split('T')[0];
      dateInput.value = fechaISO;

      setTimeout(() => {
        serviceSelect.value = booking.id_servicio;
        timeSelect.dataset.originalTime = booking.hora_reserva;
        checkAvailability().then(() => { timeSelect.value = booking.hora_reserva; });
        openModal();
      }, 100);
    }

    if (delBtn) {
      const card = delBtn.closest('.booking-card');
      const booking = JSON.parse(card.dataset.booking);
      if (confirm(`¿Seguro que quieres eliminar la reserva de ${booking.nombre_cliente}?`)) {
        fetch(`${API_BASE_URL}/api/admin/reservas/${booking.id}`, { method: 'DELETE' })
          .then(res => {
            if (res.status !== 204 && !res.ok) {
              return res.json().then(err => { throw new Error(err.message || 'Error desconocido'); });
            }
            fetchBookings();
          })
          .catch(err => alert(`Error al eliminar: ${err.message}`));
      }
    }
  });

  // --- Carga inicial ---
  loadServicesIntoSelect();
  loadAreasIntoFilter().then(fetchBookings);
});
