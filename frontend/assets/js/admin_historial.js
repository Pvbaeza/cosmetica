// Vista: Historial de Clientes (selector + reservas + ver todos)
document.addEventListener('DOMContentLoaded', () => {
  const isLocal = ['localhost', '127.0.0.1'].includes(window.location.hostname);
  const API_BASE_URL = isLocal
    ? 'http://localhost:3000'
    : 'https://cosmeticabackend-dqxh.onrender.com';

  const selectCliente = document.getElementById('select-cliente');
  const panelReservas = document.getElementById('panel-reservas');
  const inputBuscar = document.getElementById('entrada-buscar');

  let clientes = [];

  // --- Cargar clientes ---
  const fetchClientes = async () => {
    const urls = [
      `${API_BASE_URL}/api/clientes`,
      `${API_BASE_URL}/api/admin/clientes`,
      `${API_BASE_URL}/api/usuarios/clientes`
    ];
    for (const url of urls) {
      try {
        const r = await fetch(url);
        if (!r.ok) continue;
        const data = await r.json();
        return Array.isArray(data) ? data : data.clientes || [];
      } catch {}
    }
    console.warn('No se pudieron cargar clientes.');
    return [];
  };

  // --- Rellenar dropdown ---
  const renderSelect = (lista) => {
    selectCliente.innerHTML = `
      <option value="" disabled selected>Selecciona un cliente...</option>
      <option value="all">👥 Ver todos los clientes</option>
    `;
    lista.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id_cliente || c.id || '';
      opt.textContent = c.nombre_cliente || c.nombre || 'Cliente sin nombre';
      selectCliente.appendChild(opt);
    });
  };

  // --- Buscar por texto (filtro dinámico del combo) ---
  const filtrarSelect = (q) => {
    const normalizar = (s) => (s || '').toString().toLowerCase().trim();
    const listaFiltrada = clientes.filter(c =>
      normalizar(c.nombre_cliente || c.nombre).includes(q) ||
      normalizar(c.telefono_cliente || c.telefono).includes(q)
    );
    renderSelect(listaFiltrada);
  };

  // --- Cargar reservas por cliente ---
  const fetchReservasCliente = async (idCliente, nombreCliente) => {
    panelReservas.innerHTML = `
      <h2>Reservas de ${nombreCliente}</h2>
      <p class="loading">Cargando reservas...</p>
    `;

    try {
      const r = await fetch(`${API_BASE_URL}/api/reservas/cliente/${idCliente}`);
      if (!r.ok) throw new Error('Error al cargar reservas');
      const reservas = await r.json();

      if (!reservas || reservas.length === 0) {
        panelReservas.innerHTML = `
          <h2>Reservas de ${nombreCliente}</h2>
          <p>Este cliente no tiene reservas registradas.</p>
        `;
        return;
      }

      const html = reservas.map(res => {
        const fecha = res.fecha_reserva
          ? new Date(res.fecha_reserva).toLocaleDateString('es-CL', {
              weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
            })
          : 'Sin fecha';
        return `
          <div class="reserva-card">
            <p><strong>Servicio:</strong> ${res.servicio_titulo || 'No especificado'}</p>
            <p><strong>Área:</strong> ${res.nombre_area || 'Sin área'}</p>
            <p><strong>Fecha:</strong> ${fecha}</p>
            <p><strong>Hora:</strong> ${res.hora_reserva || '-'}</p>
            <div class="acciones">
              <a href="admin_pagos.html?id_reserva=${res.id}" class="btn btn-secundario">
                <i class="fas fa-dollar-sign"></i> Pago
              </a>
              <a href="admin_ficha.html?id_reserva=${res.id}" class="btn btn-primario">
                <i class="fas fa-file-medical"></i> Ficha
              </a>
            </div>
          </div>
        `;
      }).join('');

      panelReservas.innerHTML = `
        <h2>Reservas de ${nombreCliente}</h2>
        ${html}
      `;
    } catch (e) {
      console.error(e);
      panelReservas.innerHTML = `
        <h2>Reservas de ${nombreCliente}</h2>
        <p>Error al cargar las reservas.</p>
      `;
    }
  };

  // --- Ver todas las reservas agrupadas por cliente ---
  const fetchReservasTodas = async () => {
    panelReservas.innerHTML = `
      <h2>Todas las reservas</h2>
      <p class="loading">Cargando...</p>
    `;

    try {
      const r = await fetch(`${API_BASE_URL}/api/admin/reservas`);
      if (!r.ok) throw new Error('Error al cargar reservas');
      const reservas = await r.json();

      if (!reservas || reservas.length === 0) {
        panelReservas.innerHTML = `<p>No hay reservas registradas.</p>`;
        return;
      }

      // Agrupar por cliente
      const agrupado = {};
      reservas.forEach(res => {
        const nombre = res.nombre_cliente || 'Cliente sin nombre';
        if (!agrupado[nombre]) agrupado[nombre] = [];
        agrupado[nombre].push(res);
      });

      let html = '';
      for (const [nombre, lista] of Object.entries(agrupado)) {
        const bloque = lista.map(res => {
          const fecha = res.fecha_reserva
            ? new Date(res.fecha_reserva).toLocaleDateString('es-CL', {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
              })
            : 'Sin fecha';
          return `
            <div class="reserva-card mini">
              <p><strong>Servicio:</strong> ${res.servicio_titulo || '-'}</p>
              <p><strong>Área:</strong> ${res.nombre_area || '-'}</p>
              <p><strong>Fecha:</strong> ${fecha}</p>
              <div class="acciones">
                <a href="admin_pagos.html?id_reserva=${res.id}" class="btn btn-secundario">
                  <i class="fas fa-dollar-sign"></i> Pago
                </a>
                <a href="admin_ficha.html?id_reserva=${res.id}" class="btn btn-primario">
                  <i class="fas fa-file-medical"></i> Ficha
                </a>
              </div>
            </div>
          `;
        }).join('');
        html += `
          <div class="bloque-cliente">
            <h3>${nombre}</h3>
            ${bloque}
          </div>
        `;
      }

      panelReservas.innerHTML = `
        <h2>Todas las reservas</h2>
        ${html}
      `;
    } catch (e) {
      console.error(e);
      panelReservas.innerHTML = `<p>Error al cargar todas las reservas.</p>`;
    }
  };

  // --- Inicializar ---
  const init = async () => {
    clientes = await fetchClientes();
    renderSelect(clientes);
  };

  // --- Eventos ---
  selectCliente.addEventListener('change', () => {
    const selectedOption = selectCliente.options[selectCliente.selectedIndex];
    if (!selectedOption?.value) return;

    if (selectedOption.value === 'all') {
      fetchReservasTodas();
    } else {
      const id = selectedOption.value;
      const nombre = selectedOption.textContent;
      fetchReservasCliente(id, nombre);
    }
  });

  inputBuscar?.addEventListener('input', (e) => {
    filtrarSelect(e.target.value);
  });

  init();
});
