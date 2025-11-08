// Vista: Historial de Clientes (selector + reservas + ver todos) + MODAL FICHA
document.addEventListener('DOMContentLoaded', () => {
  const isLocal = ['localhost', '127.0.0.1'].includes(window.location.hostname);
  const API_BASE_URL = isLocal
    ? 'http://localhost:3000'
    : 'https://cosmeticabackend-dqxh.onrender.com';

  const selectCliente = document.getElementById('select-cliente');
  const panelReservas = document.getElementById('panel-reservas');
  const inputBuscar = document.getElementById('entrada-buscar');

  let clientes = [];

  // ==========================
  //   MODAL FICHA — refs/estado
  // ==========================
  const modal = document.getElementById('modal-ficha');
  const overlay = modal?.querySelector('.modal-ficha__overlay');
  const btnCloseX = document.getElementById('modal-ficha-close');

  const mfLoading = document.getElementById('mf-loading');
  const mfDetails = document.getElementById('mf-details');
  const mfCliente = document.getElementById('mf-cliente');
  const mfServicio = document.getElementById('mf-servicio');
  const mfFecha = document.getElementById('mf-fecha');
  const mfArea = document.getElementById('mf-area');

  const mfForm = document.getElementById('mf-form');
  const mfTextarea = document.getElementById('mf-detalle');
  const mfRead = document.getElementById('mf-read');
  const mfReadTxt = document.getElementById('mf-detalle-read');

  const mfBtnEditar = document.getElementById('mf-btn-editar');
  const mfBtnGuardar = document.getElementById('mf-btn-guardar');
  const mfBtnCerrar = document.getElementById('mf-btn-cerrar');

  let mfReservaId = null;
  let mfFichaId = null;
  let mfLastSaved = '';

  const normalizar = (s) => (s || '').toString().toLowerCase().trim();

  const resolveRegistradoPor = () => {
    const nombre = localStorage.getItem('nombre_completo');
    if (nombre && nombre.trim()) return nombre.trim();

    const user = localStorage.getItem('username');
    if (user && user.trim()) return user.trim();

    const t = localStorage.getItem('token') || localStorage.getItem('authToken');
    if (t) {
      try {
        const payload = JSON.parse(atob((t.split('.')[1] || '').replace(/-/g, '+').replace(/_/g, '/')));
        if (payload?.username) return String(payload.username);
      } catch { }
    }
    return null;
  };

  const formatearFechaBonita = (fechaISO, horaStr = '') => {
    try {
      if (!fechaISO) return 'Sin fecha';

      // Asegurar formato ISO
      const fechaLimpia = fechaISO.replace(/\//g, '-').trim();

      // Si la hora es un rango, tomamos solo la primera parte (para no romper el Date)
      let horaInicio = horaStr;
      if (horaStr.includes('-')) {
        horaInicio = horaStr.split('-')[0].trim();
      }

      // Crear objeto Date válido
      const fechaObj = new Date(`${fechaLimpia}T${horaInicio || '00:00'}:00`);

      // Si aún no es válida, mostrar crudo
      if (isNaN(fechaObj)) {
        return `${fechaLimpia}${horaStr ? ` (${horaStr})` : ''}`;
      }

      // Formatear con día de semana, mes y año
      const fechaBonita = fechaObj.toLocaleDateString('es-CL', {
        timeZone: 'America/Santiago',
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      // Capitalizar la primera letra (opcional)
      const fechaCapitalizada = fechaBonita.charAt(0).toUpperCase() + fechaBonita.slice(1);

      // Retornar fecha con hora
      return `${fechaCapitalizada}${horaStr ? ` (${horaStr})` : ''}`;
    } catch {
      return `${fechaISO}${horaStr ? ` (${horaStr})` : ''}`;
    }
  };



  // ----- abrir/cerrar -----
  const mfOpen = () => { if (modal) { modal.setAttribute('aria-hidden', 'false'); document.body.classList.add('mf-open'); } };
  const mfClose = () => {
    if (!modal) return;
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('mf-open');
    // limpia estado
    mfReservaId = null; mfFichaId = null; mfLastSaved = '';
    if (mfTextarea) mfTextarea.value = '';
    if (mfReadTxt) mfReadTxt.textContent = '';
    if (mfDetails) mfDetails.style.display = 'none';
    if (mfForm) mfForm.style.display = 'none';
    if (mfRead) mfRead.style.display = 'none';
    if (mfLoading) mfLoading.style.display = 'block';
  };
  const mfHasChanges = () => (mfForm?.style.display !== 'none' && (mfTextarea?.value || '').trim() !== mfLastSaved.trim());

  const mfHandleClose = async () => {
    try {
      if (mfHasChanges()) await mfSave(false);
    } finally { mfClose(); }
  };

  // ----- carga de datos -----
  const mfLoadReserva = async (idReserva) => {
    mfLoading.style.display = 'block';
    mfDetails.style.display = 'none';
    try {
      const r = await fetch(`${API_BASE_URL}/api/admin/reservas/${idReserva}`);
      if (!r.ok) throw new Error('No se pudo obtener la reserva.');
      const reserva = await r.json();
      mfCliente.textContent = reserva.nombre_cliente || 'N/A';
      mfServicio.textContent = reserva.servicio_titulo || 'N/A';
      mfFecha.textContent = formatearFechaBonita(reserva.fecha_reserva, reserva.hora_reserva || '');
      mfArea.textContent = reserva.nombre_area || 'N/A';
      mfLoading.style.display = 'none';
      mfDetails.style.display = 'block';
    } catch (e) {
      mfLoading.innerHTML = `<p style="color:#b94848;">${e.message}</p>`;
    }
  };

  const mfLoadFicha = async (idReserva) => {
    try {
      const f = await fetch(`${API_BASE_URL}/api/fichas?id_reserva=${idReserva}`);
      if (f.status === 200) {
        const ficha = await f.json();
        mfFichaId = ficha.id ?? ficha.id_ficha ?? null;
        mfLastSaved = ficha.detalle || '';
        const firmado = ficha.registrado_por ? `\n\n— Registrado por ${ficha.registrado_por}` : '';
        mfReadTxt.textContent = `${mfLastSaved}${firmado}`;
        mfForm.style.display = 'none';
        mfRead.style.display = 'block';
        mfBtnEditar.style.display = 'inline-flex';
      } else if (f.status === 204) {
        mfFichaId = null;
        mfLastSaved = '';
        mfTextarea.value = '';
        mfForm.style.display = 'block';
        mfRead.style.display = 'none';
        mfBtnEditar.style.display = 'none';
        mfTextarea.focus();
      } else {
        throw new Error('Error al verificar la ficha clínica.');
      }
    } catch {
      mfFichaId = null;
      mfLastSaved = '';
      mfTextarea.value = '';
      mfForm.style.display = 'block';
      mfRead.style.display = 'none';
      mfBtnEditar.style.display = 'none';
      mfTextarea.focus();
    }
  };

  // ----- guardar -----
  const mfSave = async (showAlert = true) => {
    if (!mfReservaId) return;
    const detalleStr = (mfForm.style.display !== 'none' ? mfTextarea.value : mfLastSaved).trim();
    if (!detalleStr) {
      if (showAlert) alert('Por favor, escribe los detalles de la sesión.');
      return;
    }

    const payload = {
      id_reserva: mfReservaId,
      detalle: detalleStr,
      registrado_por: resolveRegistradoPor() || undefined
    };

    try {
      if (!mfFichaId) {
        const r = await fetch(`${API_BASE_URL}/api/fichas`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(data?.message || `Error ${r.status}`);

        mfFichaId = data.id ?? data.id_ficha ?? mfFichaId;
        mfLastSaved = detalleStr;
        const firmado = payload.registrado_por ? `\n\n— Registrado por ${payload.registrado_por}` : '';
        mfReadTxt.textContent = `${mfLastSaved}${firmado}`;
        mfForm.style.display = 'none';
        mfRead.style.display = 'block';
        mfBtnEditar.style.display = 'inline-flex';
        if (showAlert) alert(data?.message || 'Ficha guardada y marcada como realizada.');
      } else {
        const actualizar = async (method) => {
          const resp = await fetch(`${API_BASE_URL}/api/fichas/${mfFichaId}`, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ detalle: detalleStr, registrado_por: payload.registrado_por })
          });
          const json = await resp.json().catch(() => ({}));
          if (!resp.ok) throw new Error(json?.message || `Error ${resp.status}`);
          return json;
        };
        try { await actualizar('PUT'); } catch { await actualizar('PATCH'); }

        mfLastSaved = detalleStr;
        const firmado = payload.registrado_por ? `\n\n— Registrado por ${payload.registrado_por}` : '';
        mfReadTxt.textContent = `${mfLastSaved}${firmado}`;
        if (mfForm.style.display !== 'none') {
          mfForm.style.display = 'none';
          mfRead.style.display = 'block';
          mfBtnEditar.style.display = 'inline-flex';
        }
        if (showAlert) alert('Cambios guardados.');
      }
    } catch (e) {
      if (showAlert) alert(`No se pudo guardar: ${e.message}`);
    }
  };

  // eventos UI del modal
  mfBtnEditar?.addEventListener('click', () => {
    mfTextarea.value = mfLastSaved || '';
    mfForm.style.display = 'block';
    mfRead.style.display = 'none';
    mfBtnEditar.style.display = 'none';
    mfTextarea.focus();
  });
  mfBtnGuardar?.addEventListener('click', () => mfSave(true));
  mfBtnCerrar?.addEventListener('click', mfHandleClose);
  btnCloseX?.addEventListener('click', mfHandleClose);
  overlay?.addEventListener('click', (e) => { if (e.target?.dataset?.close) mfHandleClose(); });
  document.addEventListener('keydown', (e) => {
    if (modal?.getAttribute('aria-hidden') === 'false' && e.key === 'Escape') mfHandleClose();
  });

  // =========================================================
  //              LÓGICA ORIGINAL DE HISTORIAL
  // =========================================================
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
      } catch { }
    }
    console.warn('No se pudieron cargar clientes.');
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
      normalizar(c.nombre_cliente || c.nombre).includes(normalizar(q)) ||
      normalizar(c.telefono_cliente || c.telefono).includes(normalizar(q))
    );
    renderSelect(listaFiltrada);
  };

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
        // Normalizar la fecha
        const fechaISO = (res.fecha_reserva || '').replace(/\//g, '-');
        const fechaBonita = fechaISO
          ? new Date(fechaISO).toLocaleDateString('es-CL', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'America/Santiago'
          })
          : 'Sin fecha';

        // Mostrar el rango de hora completo (sin romper si es null)
        const horaTexto = res.hora_reserva ? res.hora_reserva.replace('-', ' - ') : '-';

        return `
        <div class="reserva-card">
          <p><strong>Servicio:</strong> ${res.servicio_titulo || 'No especificado'}</p>
          <p><strong>Área:</strong> ${res.nombre_area || 'Sin área'}</p>
          <p><strong>Fecha:</strong> ${fechaBonita} (${horaTexto})</p>
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

      const agrupado = {};
      reservas.forEach(res => {
        const nombre = res.nombre_cliente || 'Cliente sin nombre';
        if (!agrupado[nombre]) agrupado[nombre] = [];
        agrupado[nombre].push(res);
      });

      let html = '';
      for (const [nombre, lista] of Object.entries(agrupado)) {
        const bloque = lista.map(res => {
          const fechaISO = (res.fecha_reserva || '').replace(/\//g, '-');
          const fechaBonita = fechaISO
            ? new Date(fechaISO).toLocaleDateString('es-CL', {
              weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'America/Santiago'
            })
            : 'Sin fecha';

          const horaTexto = res.hora_reserva ? res.hora_reserva.replace('-', ' - ') : '-';

          return `
            <div class="reserva-card mini">
              <p><strong>Servicio:</strong> ${res.servicio_titulo || '-'}</p>
              <p><strong>Área:</strong> ${res.nombre_area || '-'}</p>
              <p><strong>Fecha:</strong> ${fechaBonita} (${horaTexto})</p>
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

  // Inicializar
  const init = async () => {
    clientes = await fetchClientes();
    renderSelect(clientes);

    // Seleccionar automáticamente la opción "Ver todos los clientes"
    const optAll = selectCliente.querySelector('option[value="all"]');
    if (optAll) {
      selectCliente.value = 'all';
      await fetchReservasTodas(); // Cargar todas las reservas al inicio
    }
  };


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

  // ============ "Ficha" y abre la ventana emergente ============
  panelReservas.addEventListener('click', async (e) => {
    const aFicha = e.target.closest('a[href*="admin_ficha.html"]');
    if (!aFicha) return;

    e.preventDefault();
    const url = new URL(aFicha.getAttribute('href'), location.href);
    const id = Number(url.searchParams.get('id_reserva'));
    if (!id) return;

    mfReservaId = id;
    mfOpen();
    await mfLoadReserva(mfReservaId);
    await mfLoadFicha(mfReservaId);
    if (!mfFichaId) mfTextarea?.focus();
  });

  init();
});






/* =========================================================
   MODAL PAGO — integración en historial
   ========================================================= */
(function () {
  const isLocal = ['localhost', '127.0.0.1'].includes(window.location.hostname);
  const API_BASE_URL = isLocal ? 'http://localhost:3000' : 'https://cosmeticabackend-dqxh.onrender.com';

  // Refs modal
  const modalPago = document.getElementById('modal-pago');
  if (!modalPago) return; // por si aún no pegaste el HTML

  const overlayPago = modalPago.querySelector('.modal-pago__overlay');
  const btnClosePago = document.getElementById('modal-pago-close');

  const mpLoading = document.getElementById('mp-loading');
  const mpDetails = document.getElementById('mp-details');
  const mpCliente = document.getElementById('mp-cliente');
  const mpServicio = document.getElementById('mp-servicio');
  const mpFecha = document.getElementById('mp-fecha');
  const mpArea = document.getElementById('mp-area');
  const mpIdSpan = document.getElementById('mp-id');

  const mpInfo = document.getElementById('mp-info');

  const mpOptions = document.getElementById('mp-options');
  const mpBtnAbono = document.getElementById('mp-btn-abono');
  const mpBtnPF = document.getElementById('mp-btn-pago-final');

  const mpFormCtn = document.getElementById('mp-form-container');
  const mpForm = document.getElementById('mp-form');
  const mpMonto = document.getElementById('mp-monto');
  const mpMetodo = document.getElementById('mp-metodo');
  const mpFechaPago = document.getElementById('mp-fecha-pago');
  const mpBtnCerrar = document.getElementById('mp-btn-cerrar');

  let mpReservaId = null;






  // ===== Helpers para estado de botones =====
  const DEFAULT_LABELS = {
    abono: '<i class="fas fa-hand-holding-usd"></i> Registrar Abono ($10.000)',
    final: '<i class="fas fa-money-check-alt"></i> Registrar Pago Final'
  };

  const setBtnState = (btn, { html, disabled }) => {
    if (!btn) return;
    btn.innerHTML = html;
    btn.disabled = !!disabled;
    btn.classList.toggle('btn--disabled', !!disabled);
  };

  const markAbonoRealizado = () => {
    setBtnState(mpBtnAbono, {
      html: '<i class="fas fa-circle-check"></i> Abono realizado',
      disabled: true
    });
  };

  const markReservaPagada = () => {
    setBtnState(mpBtnPF, {
      html: '<i class="fas fa-circle-check"></i> Reserva pagada',
      disabled: true
    });
    // bloquear abono también
    setBtnState(mpBtnAbono, {
      html: '<i class="fas fa-circle-check"></i> Abono bloqueado',
      disabled: true
    });
  };


  const fmtFechaLarga = (fechaISO, horaStr = '') => {
    try {
      if (!fechaISO) return 'Sin fecha';

      const fechaLimpia = fechaISO.replace(/\//g, '-').trim();

      // Si viene con rango, tomar solo la primera parte (ej: "11:00 - 13:00")
      let horaInicio = horaStr;
      if (horaStr.includes('-')) {
        horaInicio = horaStr.split('-')[0].trim();
      }

      // Crear la fecha de forma segura
      const d = new Date(`${fechaLimpia}T${horaInicio || '00:00'}:00`);

      // Si no es válida, mostrar crudo
      if (isNaN(d.getTime())) {
        return `${fechaLimpia}${horaStr ? ` (${horaStr})` : ''}`;
      }

      const fechaBonita = d.toLocaleDateString('es-CL', {
        timeZone: 'America/Santiago',
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      const capitalizada = fechaBonita.charAt(0).toUpperCase() + fechaBonita.slice(1);
      return `${capitalizada}${horaStr ? ` (${horaStr})` : ''}`;
    } catch {
      return `${fechaISO}${horaStr ? ` (${horaStr})` : ''}`;
    }
  };


  const mpOpen = () => { modalPago.setAttribute('aria-hidden', 'false'); document.body.classList.add('mp-open'); };
  const mpClose = () => {
    modalPago.setAttribute('aria-hidden', 'true'); document.body.classList.remove('mp-open');
    // reset
    mpReservaId = null;
    mpLoading.style.display = 'block';
    mpDetails.style.display = 'none';
    mpInfo.innerHTML = '';
    mpOptions.style.display = '';
    mpFormCtn.style.display = 'none';
    mpForm.reset();
    // reset botones
    setBtnState(mpBtnAbono, { html: DEFAULT_LABELS.abono, disabled: false });
    setBtnState(mpBtnPF, { html: DEFAULT_LABELS.final, disabled: false });
  };
  const handleClose = () => mpClose();

  // Carga reserva
  const mpLoadReserva = async (idReserva) => {
    mpLoading.style.display = 'block';
    mpDetails.style.display = 'none';
    try {
      const r = await fetch(`${API_BASE_URL}/api/admin/reservas/${idReserva}`);
      if (!r.ok) throw new Error('No se pudo obtener la reserva.');
      const res = await r.json();

      mpCliente.textContent = res.nombre_cliente || 'N/A';
      mpServicio.textContent = res.servicio_titulo || 'N/A';
      mpFecha.textContent = fmtFechaLarga(res.fecha_reserva, res.hora_reserva || '');
      mpArea.textContent = res.nombre_area || 'N/A';
      mpIdSpan.textContent = res.id ?? idReserva;

      mpLoading.style.display = 'none';
      mpDetails.style.display = 'block';
    } catch (e) {
      mpLoading.innerHTML = `<p style="color:#b94848;">${e.message}</p>`;
    }
  };


  // --- Verificar pagos existentes y bloquear botones (robusto) ---
  const mpVerificarPagos = async (idReserva) => {
    // Reset visual por defecto
    mpInfo.innerHTML = '';
    mpFormCtn.style.display = 'none';
    mpOptions.style.display = '';
    setBtnState(mpBtnAbono, { html: DEFAULT_LABELS.abono, disabled: false });
    setBtnState(mpBtnPF, { html: DEFAULT_LABELS.final, disabled: false });

    const norm = (s) =>
      String(s ?? '')
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .toLowerCase()
        .trim();

    // helper seguro para convertir respuesta en arreglo
    const toArray = (raw) => {
      if (!raw) return [];
      if (Array.isArray(raw)) return raw;
      if (Array.isArray(raw?.pagos)) return raw.pagos;
      return []; // cae a vacío
    };

    try {
      const r = await fetch(`${API_BASE_URL}/api/pagos/reserva/${idReserva}`);
      let pagos = [];
      if (r.status === 204) {
        pagos = [];
      } else if (r.ok) {
        const raw = await r.json().catch(() => null);
        pagos = toArray(raw);
      } else {
        throw new Error('Error al consultar pagos.');
      }

      // fallback: estado de la reserva
      let estadoReservaPago = null;
      try {
        const resReserva = await fetch(`${API_BASE_URL}/api/admin/reservas/${idReserva}`);
        if (resReserva.ok) {
          const reserva = await resReserva.json().catch(() => ({}));
          estadoReservaPago = norm(reserva?.estado_pago);
        }
      } catch { }

      // Detectores robustos
      const tieneAbono = pagos.some(p => {
        const tipo = norm(p?.tipo_pago ?? p?.tipo);
        const estado = norm(p?.estado_pago ?? p?.estado);
        return tipo.includes('abono') || estado === 'abonado';
      }) || estadoReservaPago === 'abonado';

      const tieneFinal = pagos.some(p => {
        const tipo = norm(p?.tipo_pago ?? p?.tipo);
        const estado = norm(p?.estado_pago ?? p?.estado);
        return tipo.includes('pago final') || estado === 'pagado';
      }) || estadoReservaPago === 'pagado';

      // Renderizar cajas + bloquear botones
      if (tieneAbono) {
        const pAb = pagos.find(p => {
          const tipo = norm(p?.tipo_pago ?? p?.tipo);
          const estado = norm(p?.estado_pago ?? p?.estado);
          return tipo.includes('abono') || estado === 'abonado';
        }) || {};

        const box = document.createElement('div');
        box.className = 'mp-info__box mp-info__box--abono';
        box.innerHTML = `💰 <strong>Se abonaron:</strong> $${Number(pAb?.monto_pagado || 0).toLocaleString('es-CL')}
        <small>(${pAb?.metodo_pago || 'Método no especificado'})</small><br>
        📅 ${pAb?.fecha_pago ? new Date(pAb.fecha_pago).toLocaleDateString('es-CL') : 'Fecha no informada'}`;
        mpInfo.appendChild(box);
        markAbonoRealizado();
      }

      if (tieneFinal) {
        const pFin = pagos.find(p => {
          const tipo = norm(p?.tipo_pago ?? p?.tipo);
          const estado = norm(p?.estado_pago ?? p?.estado);
          return tipo.includes('pago final') || estado === 'pagado';
        }) || {};

        const box = document.createElement('div');
        box.className = 'mp-info__box mp-info__box--final';
        box.innerHTML = `💸 <strong>Pago final completado:</strong> $${Number(pFin?.monto_pagado || 0).toLocaleString('es-CL')}
        <small>(${pFin?.metodo_pago || 'Método no especificado'})</small><br>
        📅 ${pFin?.fecha_pago ? new Date(pFin.fecha_pago).toLocaleDateString('es-CL') : 'Fecha no informada'}`;
        mpInfo.appendChild(box);
        markReservaPagada();
      }
    } catch (e) {
      console.warn('[mpVerificarPagos]', e);
      // En error, mantén botones como estaban, pero puedes optar por bloquear “Abono” si prefieres fail-safe:
      // setBtnState(mpBtnAbono, { html: DEFAULT_LABELS.abono + ' (verif. falló)', disabled: true });
    }
  };


  // --- Registrar Abono con UI optimista + verificación previa ---
  const mpRegistrarAbono = async () => {
    if (!mpReservaId) return alert('Error: reserva no cargada.');

    // Evita dobles clics
    if (mpBtnAbono?.disabled) return;
    setBtnState(mpBtnAbono, { html: '<i class="fas fa-spinner fa-spin"></i> Registrando...', disabled: true });

    try {
      // 1) Verificar antes de enviar
      let yaTieneAbono = false;
      try {
        const r = await fetch(`${API_BASE_URL}/api/pagos/reserva/${mpReservaId}`);
        let pagos = [];

        if (r.status === 204) {
          pagos = [];
        } else if (r.ok) {
          const raw = await r.json().catch(() => null);
          if (Array.isArray(raw)) {
            pagos = raw;
          } else if (Array.isArray(raw?.pagos)) {
            pagos = raw.pagos;
          } else {
            pagos = [];
          }
        } else {
          throw new Error('Error al consultar pagos.');
        }

        const norm = (s) =>
          String(s ?? '')
            .normalize('NFD')
            .replace(/\p{Diacritic}/gu, '')
            .toLowerCase()
            .trim();

        yaTieneAbono = (pagos || []).some(p => {
          const tipo = norm(p?.tipo_pago ?? p?.tipo);
          const estado = norm(p?.estado_pago ?? p?.estado);
          return tipo.includes('abono') || estado === 'abonado';
        });
      } catch {
        throw new Error('No se pudo verificar pagos previos.');
      }


      if (yaTieneAbono) {
        alert('⚠️ Esta reserva ya tiene un abono registrado.');
        await mpVerificarPagos(mpReservaId);
        return;
      }

      // 2) Confirmar
      if (!confirm('¿Confirmas registrar un abono de $10.000 para esta reserva?')) {
        setBtnState(mpBtnAbono, { html: DEFAULT_LABELS.abono, disabled: false });
        return;
      }

      // 3) Enviar
      const payload = {
        id_reserva: mpReservaId,
        tipo_pago: 'Abono',
        monto_pagado: 10000,
        metodo_pago: 'Transferencia',
        fecha_pago: new Date().toISOString().split('T')[0],
        registrado_por: 'Admin'
      };

      const res = await mpEnviarPago(payload);
      alert(res?.message || 'Abono registrado con éxito.');

      // 4) UI optimista: bloquea y muestra box sin esperar GET
      markAbonoRealizado();
      const box = document.createElement('div');
      box.className = 'mp-info__box mp-info__box--abono';
      box.innerHTML = `💰 <strong>Se abonaron:</strong> $${Number(payload.monto_pagado).toLocaleString('es-CL')}
      <small>(${payload.metodo_pago})</small><br>
      📅 ${new Date(payload.fecha_pago).toLocaleDateString('es-CL')}`;
      mpInfo.appendChild(box);

      // 5) Refresca verificación
      await mpVerificarPagos(mpReservaId);
    } catch (e) {
      alert('❌ No se pudo registrar el abono: ' + e.message);
      // Revertir botón solo si no quedó bloqueado por verificación
      setBtnState(mpBtnAbono, { html: DEFAULT_LABELS.abono, disabled: false });
    }
  };



  // Enviar pago al backend
  const mpEnviarPago = async (payload) => {
    const r = await fetch(`${API_BASE_URL}/api/pagos`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
    });
    const json = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(json?.message || `Error ${r.status}`);
    return json;
  };


  // Mostrar form pago final
  const mpMostrarPagoFinal = () => {
    // si el botón está deshabilitado, no permitir abrir el form
    if (mpBtnPF?.disabled) return;
    mpOptions.style.display = 'none';
    mpFormCtn.style.display = 'block';
    if (!mpFechaPago.value) mpFechaPago.valueAsDate = new Date();
    if (!mpMonto.value) mpMonto.focus();
  };

  // Registrar pago final
  const mpRegistrarPagoFinal = async (ev) => {
    ev.preventDefault();
    if (!mpReservaId) return alert('Error: reserva no cargada.');

    const monto = mpMonto.value;
    const metodo = mpMetodo.value;
    const fecha = mpFechaPago.value;
    if (!monto || !metodo || !fecha) return alert('Completa todos los campos del pago final.');

    const payload = {
      id_reserva: mpReservaId,
      tipo_pago: 'Pago Final',
      monto_pagado: parseFloat(monto),
      metodo_pago: metodo,
      fecha_pago: fecha,
      registrado_por: 'Personal'
    };

    try {
      const res = await mpEnviarPago(payload);
      alert(res?.message || 'Pago final registrado con éxito.');
      await mpVerificarPagos(mpReservaId);
      mpFormCtn.style.display = 'none';
      mpOptions.style.display = '';
    } catch (e) {
      alert('No se pudo registrar el pago final: ' + e.message);
    }
  };

  // Eventos de UI modal
  btnClosePago?.addEventListener('click', handleClose);
  overlayPago?.addEventListener('click', (e) => { if (e.target?.dataset?.close) handleClose(); });
  mpBtnCerrar?.addEventListener('click', handleClose);
  mpBtnAbono?.addEventListener('click', mpRegistrarAbono);
  mpBtnPF?.addEventListener('click', mpMostrarPagoFinal);
  mpForm?.addEventListener('submit', mpRegistrarPagoFinal);
  document.addEventListener('keydown', (e) => { if (modalPago.getAttribute('aria-hidden') === 'false' && e.key === 'Escape') handleClose(); });

  // Intercepta clic en "Pago" dentro del panel
  const panelReservas = document.getElementById('panel-reservas');
  panelReservas.addEventListener('click', async (e) => {
    const aPago = e.target.closest('a[href*="admin_pagos.html"]');
    if (!aPago) return;
    e.preventDefault();

    const url = new URL(aPago.getAttribute('href'), location.href);
    const id = Number(url.searchParams.get('id_reserva'));
    if (!id) return;

    mpReservaId = id;
    mpOpen();
    await mpLoadReserva(mpReservaId);
    await mpVerificarPagos(mpReservaId);
  });
})();







// filtros nuevos 

// ---- NUEVOS filtros (DOM) ----
const filtroArea = document.getElementById('filtro-area');
const filtroFecha = document.getElementById('filtro-fecha'); // <— único date
const filtroOrden = document.getElementById('filtro-orden');
const btnLimpiar = document.getElementById('btn-limpiar-filtros');

// ---- Estado para filtrar/renderizar ----
let reservasAll = [];               // dataset global (Ver todos)
let reservasClienteActual = [];     // dataset cliente actual
let nombreClienteActual = '';       // título cuando hay cliente



// Normaliza a 'YYYY-MM-DD' (acepta 'YYYY/MM/DD' o 'YYYY-MM-DD')
const normalizeDateStr = (s) => {
  if (!s) return null;
  const clean = String(s).slice(0, 10).replace(/\//g, '-').trim();
  // si viene con hora/residuo, me quedo con los primeros 10
  const y = clean.slice(0, 4), m = clean.slice(5, 7), d = clean.slice(8, 10);
  if (y.length === 4 && m.length === 2 && d.length === 2) return `${y}-${m}-${d}`;
  return null;
};



const aplicarFiltros = (lista) => {
  let out = Array.isArray(lista) ? [...lista] : [];

  // Área
  const areaSel = (filtroArea?.value || 'all').toLowerCase();
  if (areaSel !== 'all') {
    out = out.filter(r => (r.nombre_area || '').toLowerCase() === areaSel);
  }

  // Fecha única (comparación por día)
  const selDate = filtroFecha?.value?.trim(); // formato input: 'YYYY-MM-DD'
  if (selDate) {
    out = out.filter(r => normalizeDateStr(r.fecha_reserva) === selDate);
  }

  // Orden
  const dateTimeKey = (res) => {
    const dStr = normalizeDateStr(res.fecha_reserva);
    if (!dStr) return -Infinity;
    let h = 0, m = 0;
    if (res.hora_reserva) {
      const first = String(res.hora_reserva).split('-')[0].trim();
      const [hh, mm] = first.split(':').map(n => parseInt(n || '0', 10));
      h = isNaN(hh) ? 0 : hh; m = isNaN(mm) ? 0 : mm;
    }
    const dt = new Date(`${dStr}T00:00:00`);
    dt.setHours(h, m, 0, 0);
    return dt.getTime();
  };

  const orden = (filtroOrden?.value || 'desc');
  out.sort((a, b) => {
    const ka = dateTimeKey(a);
    const kb = dateTimeKey(b);
    return orden === 'desc' ? (kb - ka) : (ka - kb);
  });

  return out;
};



// Re-aplicar filtros al cambiar cualquier control
[filtroArea, filtroFecha, filtroOrden].forEach(el => {
  el?.addEventListener('change', () => {
    const selectedOption = selectCliente.options[selectCliente.selectedIndex];
    if (selectedOption?.value === 'all') {
      // Re-render con dataset global (sin refetch)
      const porCliente = {};
      aplicarFiltros(reservasAll).forEach(res => {
        const nombre = res.nombre_cliente || 'Cliente sin nombre';
        if (!porCliente[nombre]) porCliente[nombre] = [];
        porCliente[nombre].push(res);
      });

      const clientesOrden = Object.keys(porCliente).sort((a, b) => a.localeCompare(b, 'es'));
      if (!clientesOrden.length) {
        panelReservas.innerHTML = `
          <h2>Todas las reservas</h2>
          <p>No hay resultados con los filtros aplicados.</p>
        `;
        return;
      }

      let html = '';
      for (const nombre of clientesOrden) {
        const lista = porCliente[nombre];
        const bloque = lista.map(res => {
          const d = normalizeDateStr(res.fecha_reserva);
          const fechaBonita = d
            ? new Date(d).toLocaleDateString('es-CL', {
              weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'America/Santiago'
            })
            : 'Sin fecha';
          const horaTexto = res.hora_reserva ? res.hora_reserva.replace('-', ' - ') : '-';
          return `
            <div class="reserva-card mini">
              <p><strong>Servicio:</strong> ${res.servicio_titulo || '-'}</p>
              <p><strong>Área:</strong> ${res.nombre_area || '-'}</p>
              <p><strong>Fecha:</strong> ${fechaBonita} (${horaTexto})</p>
              <div class="acciones">
                <a href="admin_pagos.html?id_reserva=${res.id}" class="btn btn-secundario">
                  <i class="fas fa-dollar-sign"></i> Pago
                </a>
                <a href="admin_ficha.html?id_reserva=${res.id}" class="btn btn-primario">
                  <i class="fas fa-file-medical"></i> Ficha
                </a>
              </div>
            </div>`;
        }).join('');
        html += `<div class="bloque-cliente"><h3>${nombre}</h3>${bloque}</div>`;
      }

      panelReservas.innerHTML = `<h2>Todas las reservas</h2>${html}`;
    } else {
      // Re-render con dataset del cliente actual
      const lista = aplicarFiltros(reservasClienteActual);
      if (!lista.length) {
        panelReservas.innerHTML = `
          <h2>Reservas de ${nombreClienteActual}</h2>
          <p>No hay resultados con los filtros aplicados.</p>
        `;
        return;
      }
      const html = lista.map(res => {
        const d = normalizeDateStr(res.fecha_reserva);
        const fechaBonita = d
          ? new Date(d).toLocaleDateString('es-CL', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'America/Santiago'
          })
          : 'Sin fecha';
        const horaTexto = res.hora_reserva ? res.hora_reserva.replace('-', ' - ') : '-';
        return `
          <div class="reserva-card">
            <p><strong>Servicio:</strong> ${res.servicio_titulo || 'No especificado'}</p>
            <p><strong>Área:</strong> ${res.nombre_area || 'Sin área'}</p>
            <p><strong>Fecha:</strong> ${fechaBonita} (${horaTexto})</p>
            <div class="acciones">
              <a href="admin_pagos.html?id_reserva=${res.id}" class="btn btn-secundario">
                <i class="fas fa-dollar-sign"></i> Pago
              </a>
              <a href="admin_ficha.html?id_reserva=${res.id}" class="btn btn-primario">
                <i class="fas fa-file-medical"></i> Ficha
              </a>
            </div>
          </div>`;
      }).join('');
      panelReservas.innerHTML = `<h2>Reservas de ${nombreClienteActual}</h2>${html}`;
    }
  });
});

// BOTON PARA LIMPIAR

btnLimpiar?.addEventListener('click', () => {
  if (filtroArea) filtroArea.value = 'all';
  if (filtroFecha) filtroFecha.value = '';
  if (filtroOrden) filtroOrden.value = 'desc';
  // fuerza re-render
  const evt = new Event('change');
  filtroOrden.dispatchEvent(evt);
});





//***************************************************************/
//*******************flecha scroll******************************/
//**************************************************************/
window.addEventListener("scroll", function() {
  const btn = document.getElementById("btnScrollTop");
  if (document.body.scrollTop > 300 || document.documentElement.scrollTop > 300) {
    btn.style.display = "flex";
  } else {
    btn.style.display = "none";
  }
});

document.getElementById("btnScrollTop").addEventListener("click", function() {
  window.scrollTo({ top: 0, behavior: "smooth" });
});