// Archivo: assets/js/admin_historial.js
// Vista: Historial de Clientes

document.addEventListener('DOMContentLoaded', () => {
  const isLocal = ['localhost', '127.0.0.1'].includes(window.location.hostname);
  const API_BASE_URL = isLocal
    ? 'http://localhost:3000'
    : 'https://cosmeticabackend-dqxh.onrender.com';

  // ----------- DOM principal -----------
  const selectCliente = document.getElementById('select-cliente');
  const panelReservas = document.getElementById('panel-reservas');
  const inputBuscar   = document.getElementById('entrada-buscar');

  // Filtros
  const filtroArea  = document.getElementById('filtro-area');
  const filtroFecha = document.getElementById('filtro-fecha');
  const filtroOrden = document.getElementById('filtro-orden');
  const btnLimpiar  = document.getElementById('btn-limpiar-filtros');

  // Estado global
  let clientes = [];
  let reservasAll = [];           
  let reservasClienteActual = []; 
  let nombreClienteActual = '';

  // ==========================
  // Helpers generales
  // ==========================
  const formatDateCL = (dateStr, hourRange = '') => {
    if (!dateStr) return 'Sin fecha';
    try {
        // Asumiendo fechas UTC o ISO
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        
        const fechaBonita = d.toLocaleDateString('es-CL', {
            timeZone: 'UTC', // Ajuste importante si la BD guarda en UTC
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        const cap = fechaBonita.charAt(0).toUpperCase() + fechaBonita.slice(1);
        return cap + (hourRange ? ` (${hourRange.replace('-', ' - ').trim()})` : '');
    } catch (e) { return dateStr; }
  };

  const norm = (s) => String(s ?? '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();

  // Helpers para obtener IDs y Nombres seguros
  const getAreaId = (r) => r?.id_area ?? r?.area_id ?? r?.servicio?.id_area ?? null;
  const getAreaNombre = (r) => r?.nombre_area ?? r?.area ?? r?.servicio?.area ?? '';

  // ==========================
  // 1. Select de clientes
  // ==========================
  const fetchClientes = async () => {
    const urls = [
      `${API_BASE_URL}/api/clientes`,
      `${API_BASE_URL}/api/admin/clientes`
    ];
    for (const url of urls) {
      try {
        const r = await fetch(url);
        if (!r.ok) continue;
        const data = await r.json();
        return Array.isArray(data) ? data : (data.clientes || []);
      } catch {}
    }
    return [];
  };

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

  const filtrarSelect = (q) => {
    const listaFiltrada = clientes.filter(c =>
      norm(c.nombre_cliente || c.nombre).includes(norm(q)) ||
      norm(c.telefono_cliente || c.telefono).includes(norm(q))
    );
    renderSelect(listaFiltrada);
  };

  inputBuscar?.addEventListener('input', (e) => {
      const valor = e.target.value;
      filtrarSelect(valor);
      handleFiltroChange(); 
  });

  // ==========================
  // 2. Filtros
  // ==========================
  const loadAreasIntoFiltro = async () => {
    try {
      const r = await fetch(`${API_BASE_URL}/api/areas`);
      if (!r.ok) return;
      const areas = await r.json();
      filtroArea.innerHTML = `<option value="all" selected>Todas</option>`;
      areas.forEach(a => {
          const opt = document.createElement('option');
          opt.value = String(a.id_area);
          opt.textContent = a.nombre_area;
          filtroArea.appendChild(opt);
      });
    } catch (e) { console.warn(e); }
  };

  // --- LÓGICA DE FILTRADO Y ORDENAMIENTO ---
  const aplicarFiltros = (lista) => {
    let out = Array.isArray(lista) ? [...lista] : [];

    // A. Filtro de Texto (Buscador)
    const textoBusqueda = inputBuscar?.value ? norm(inputBuscar.value) : '';
    if (textoBusqueda) {
        out = out.filter(r => {
            const nombre = norm(r.nombre_cliente || '');
            const telefono = norm(r.telefono_cliente || '');
            return nombre.includes(textoBusqueda) || telefono.includes(textoBusqueda);
        });
    }

    // B. Área
    const areaVal = filtroArea?.value || 'all';
    if (areaVal !== 'all') {
      out = out.filter(r => {
        const rid = getAreaId(r);
        return rid != null && String(rid) === String(areaVal);
      });
    }

    // C. Fecha Exacta
    const selDate = filtroFecha?.value; 
    if (selDate) {
      out = out.filter(r => {
          const fechaReservaStr = r.fecha_reserva ? r.fecha_reserva.substring(0, 10) : '';
          return fechaReservaStr === selDate;
      });
    }

    // D. Orden (CORREGIDO Y REFORZADO)
    const ord = filtroOrden?.value || 'desc';
    
    out.sort((a, b) => {
        // Función para obtener timestamp numérico seguro
        const getTs = (reserva) => {
            if (!reserva.fecha_reserva) return 0;
            // Extraer solo la fecha YYYY-MM-DD
            const datePart = reserva.fecha_reserva.substring(0, 10);
            // Extraer hora HH:mm
            let timePart = "00:00";
            if (reserva.hora_reserva) {
                timePart = reserva.hora_reserva.split('-')[0].trim();
                if (timePart.length === 4) timePart = "0" + timePart;
            }
            return new Date(`${datePart}T${timePart}:00`).getTime();
        };

        const timeA = getTs(a);
        const timeB = getTs(b);

        // Comparación numérica simple
        return ord === 'asc' ? (timeA - timeB) : (timeB - timeA);
    });
    
    return out;
  };

  // ==========================
  // 3. Renderizado (CORREGIDO: LISTA PLANA)
  // ==========================
  
  // Función auxiliar para crear la tarjeta HTML
  // showClientName: true si queremos mostrar el nombre del cliente dentro de la tarjeta
  const crearTarjetaHTML = (res, showClientName = false) => {
      const fechaTexto = formatDateCL(res.fecha_reserva, res.hora_reserva || '');
      
      const estadoPago = res.estado_pago || 'Pendiente';
      let estadoClass = '';
      if (estadoPago.toLowerCase() === 'abonado') estadoClass = 'pago-tipo-abono';
      else if (estadoPago.toLowerCase() === 'pago final') estadoClass = 'pago-tipo-pago-final';
      
      // Si necesitamos mostrar el cliente, agregamos la línea
      const clienteHTML = showClientName 
        ? `<p><strong>Cliente:</strong> ${res.nombre_cliente || 'N/A'}</p>` 
        : '';

      return `
        <div class="reserva-card">
          ${clienteHTML}
          <p><strong>Servicio:</strong> ${res.servicio_titulo || '-'}</p>
          <p><strong>Área:</strong> ${getAreaNombre(res) || '-'}</p>
          <p><strong>Fecha:</strong> ${fechaTexto}</p>
          <p><strong>Estado Pago:</strong> <span class="${estadoClass}">${estadoPago}</span></p>
          <div class="acciones">
            <a href="admin_pagos.html?id_reserva=${res.id}" class="btn btn-secundario">
              <i class="fas fa-dollar-sign"></i> Pago
            </a>
            <a href="admin_ficha.html?id_reserva=${res.id}" class="btn btn-primario">
              <i class="fas fa-file-medical"></i> Ficha
            </a>
          </div>
        </div>`;
  };

  // Renderizar TODOS (Lista plana para respetar el orden de fecha)
  const renderAllFiltered = () => {
    const filtradas = aplicarFiltros(reservasAll);
    
    if (filtradas.length === 0) {
      panelReservas.innerHTML = `<h2>Todas las reservas</h2><p>No hay resultados con los filtros aplicados.</p>`;
      return;
    }

    // Generamos una lista única de tarjetas, respetando el orden del array filtradas
    const tarjetasHTML = filtradas.map(res => crearTarjetaHTML(res, true)).join('');
    
    panelReservas.innerHTML = `<h2>Todas las reservas (${filtradas.length})</h2>${tarjetasHTML}`;
  };

  // Renderizar Cliente Específico
  const renderClienteFiltered = () => {
    const lista = aplicarFiltros(reservasClienteActual);
    if (!lista.length) {
      panelReservas.innerHTML = `<h2>Reservas de ${nombreClienteActual}</h2><p>No hay resultados.</p>`;
      return;
    }
    // Aquí no hace falta mostrar el nombre del cliente en cada tarjeta
    const tarjetasHTML = lista.map(res => crearTarjetaHTML(res, false)).join('');
    
    panelReservas.innerHTML = `<h2>Reservas de ${nombreClienteActual} (${lista.length})</h2>${tarjetasHTML}`;
  };

  const handleFiltroChange = () => {
    const val = selectCliente?.value;
    // Si no hay selección o es "Ver todos"
    if (!val || val === 'all') {
        renderAllFiltered();
    } else {
        renderClienteFiltered();
    }
  };

  // Listeners de filtros
  [filtroArea, filtroFecha, filtroOrden].forEach(el => {
    el?.addEventListener('change', handleFiltroChange);
  });

  btnLimpiar?.addEventListener('click', () => {
    if (filtroArea)  filtroArea.value = 'all';
    if (filtroFecha) filtroFecha.value = '';
    if (filtroOrden) filtroOrden.value = 'desc';
    if (inputBuscar) {
        inputBuscar.value = '';
        filtrarSelect(''); 
    }
    handleFiltroChange();
  });

  // ==========================
  // 4. Fetch Data
  // ==========================
  const fetchReservasCliente = async (idCliente, nombreCliente) => {
    panelReservas.innerHTML = `<p class="loading">Cargando reservas de ${nombreCliente}...</p>`;
    try {
      const r = await fetch(`${API_BASE_URL}/api/reservas/cliente/${idCliente}`);
      if (!r.ok) throw new Error('Error al cargar');
      const reservas = await r.json();
      reservasClienteActual = Array.isArray(reservas) ? reservas : [];
      nombreClienteActual = nombreCliente;
      renderClienteFiltered();
    } catch (e) {
      panelReservas.innerHTML = `<p>Error al cargar las reservas.</p>`;
    }
  };

  const fetchReservasTodas = async () => {
    panelReservas.innerHTML = `<p class="loading">Cargando todas las reservas...</p>`;
    try {
      const r = await fetch(`${API_BASE_URL}/api/admin/reservas`);
      if (!r.ok) throw new Error('Error al cargar');
      const reservas = await r.json();
      reservasAll = Array.isArray(reservas) ? reservas : [];
      renderAllFiltered();
    } catch (e) {
      panelReservas.innerHTML = `<p>Error al cargar el historial completo.</p>`;
    }
  };

  // ==========================
  // 5. Inicialización
  // ==========================
  const init = async () => {
    await loadAreasIntoFiltro();
    clientes = await fetchClientes();
    renderSelect(clientes);

    await fetchReservasTodas();
    selectCliente.value = 'all';
  };

  selectCliente.addEventListener('change', () => {
    const val = selectCliente.value;
    if (val === 'all') {
      fetchReservasTodas();
    } else if (val) {
      const nombre = selectCliente.options[selectCliente.selectedIndex].textContent;
      fetchReservasCliente(val, nombre);
    }
  });

  init();

  // (Botón volver arriba - Opcional)
  const btnScroll = document.getElementById("btnScrollTop");
  if (btnScroll) {
      window.addEventListener("scroll", function() {
        if (document.body.scrollTop > 300 || document.documentElement.scrollTop > 300) {
          btnScroll.style.display = "flex";
        } else {
          btnScroll.style.display = "none";
        }
      });
      btnScroll.addEventListener("click", function() {
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
  }

});