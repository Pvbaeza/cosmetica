// Vista: Historial de Clientes (selector + reservas + ver todos) + MODAL FICHA
document.addEventListener('DOMContentLoaded', () => {
  const isLocal = ['localhost', '127.0.0.1'].includes(window.location.hostname);
  const API_BASE_URL = isLocal
    ? 'http://localhost:3000'
    : 'https://cosmeticabackend-dqxh.onrender.com';

  // ----------- DOM principal -----------
  const selectCliente = document.getElementById('select-cliente');
  const panelReservas = document.getElementById('panel-reservas');
  const inputBuscar   = document.getElementById('entrada-buscar');

  // Filtros (esta vista)
  const filtroArea  = document.getElementById('filtro-area');
  const filtroFecha = document.getElementById('filtro-fecha');
  const filtroOrden = document.getElementById('filtro-orden');
  const btnLimpiar  = document.getElementById('btn-limpiar-filtros');

  // Estado global para filtros
  let clientes = [];
  let reservasAll = [];           // dataset cuando "Ver todos"
  let reservasClienteActual = []; // dataset del cliente seleccionado
  let nombreClienteActual = '';

  // ==========================
  // Helpers generales
  // ==========================
  // --- Helpers de fecha seguros (sin desfase) ---
  const parseYMD = (s) => {
    if (!s) return null;
    const clean = String(s).slice(0,10).replace(/\//g,'-').trim();
    const [yy, mm, dd] = clean.split('-').map(n => parseInt(n, 10));
    if (!yy || !mm || !dd) return null;
    return { y: yy, m: mm, d: dd };
  };

  const formatDateCL = (dateStr, hourRange = '') => {
    const p = parseYMD(dateStr);
    if (!p) return 'Sin fecha';

    // si viene rango "HH:mm - HH:mm", tomamos el inicio
    let hh = 0, mi = 0;
    if (hourRange) {
      const first = String(hourRange).split('-')[0].trim();
      const [h, m] = first.split(':').map(n => parseInt(n || '0', 10));
      if (!Number.isNaN(h)) hh = h;
      if (!Number.isNaN(m)) mi = m;
    }

    // Fecha LOCAL (no UTC) → evita correr un día
    const d = new Date(p.y, p.m - 1, p.d, hh, mi, 0, 0);

    const fechaBonita = d.toLocaleDateString('es-CL', {
      timeZone: 'America/Santiago',
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const cap = fechaBonita.charAt(0).toUpperCase() + fechaBonita.slice(1);
    return cap + (hourRange ? ` (${hourRange.replace('-', ' - ').trim()})` : '');
  };

  const norm = (s) =>
    String(s ?? '')
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase()
      .trim();

  const normalizeDateStr = (s) => {
    if (!s) return null;
    const clean = String(s).slice(0, 10).replace(/\//g, '-').trim();
    const y = clean.slice(0, 4), m = clean.slice(5, 7), d = clean.slice(8, 10);
    return (y.length === 4 && m.length === 2 && d.length === 2) ? `${y}-${m}-${d}` : null;
  };

  const dateTimeKey = (res) => {
    const p = parseYMD(res?.fecha_reserva);
    if (!p) return -Infinity;

    let hh = 0, mm = 0;
    if (res?.hora_reserva) {
      const first = String(res.hora_reserva).split('-')[0].trim();
      const [h, m] = first.split(':').map(n => parseInt(n || '0', 10));
      if (!Number.isNaN(h)) hh = h;
      if (!Number.isNaN(m)) mm = m;
    }

    // ¡Local time! evita desfase
    const dt = new Date(p.y, p.m - 1, p.d, hh, mm, 0, 0);
    return dt.getTime();
  };

  const getAreaId = (r) => r?.id_area ?? r?.area_id ?? r?.servicio?.id_area ?? null;
  const getAreaNombre = (r) => r?.nombre_area ?? r?.area ?? r?.servicio?.area ?? '';

  // ==========================
  // Select de clientes
  // ==========================
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
        return Array.isArray(data) ? data : (data.clientes || []);
      } catch {}
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
      norm(c.nombre_cliente || c.nombre).includes(norm(q)) ||
      norm(c.telefono_cliente || c.telefono).includes(norm(q))
    );
    renderSelect(listaFiltrada);
  };

  inputBuscar?.addEventListener('input', (e) => filtrarSelect(e.target.value));

  // ==========================
  // Filtros (área/fecha/orden)
  // ==========================
  const loadAreasIntoFiltro = async () => {
    try {
      const r = await fetch(`${API_BASE_URL}/api/areas`);
      if (!r.ok) throw new Error('No se pudieron cargar áreas.');
      const areas = await r.json();
      // Reset + opción "Todas"
      filtroArea.innerHTML = `<option value="all" selected>Todas</option>`;
      areas
        .sort((a,b)=> String(a.nombre_area).localeCompare(b.nombre_area,'es'))
        .forEach(a => {
          const opt = document.createElement('option');
          opt.value = String(a.id_area);          // valor = id para comparar fácil
          opt.textContent = a.nombre_area || `Área ${a.id_area}`;
          filtroArea.appendChild(opt);
        });
    } catch (e) {
      console.warn('No se poblaron áreas en el filtro:', e.message);
    }
  };

  const aplicarFiltros = (lista) => {
    let out = Array.isArray(lista) ? [...lista] : [];

    // Área: si value es 'all' no filtra; si es id, intenta por id; fallback por nombre
    const areaVal = filtroArea?.value || 'all';
    if (areaVal !== 'all') {
      out = out.filter(r => {
        const rid = getAreaId(r);
        if (rid != null && String(rid) === String(areaVal)) return true;
        // fallback por nombre (por si no viene id_area)
        return norm(getAreaNombre(r)) === norm(filtroArea.options[filtroArea.selectedIndex]?.textContent || '');
      });
    }

    // Fecha (YYYY-MM-DD exacto)
    const selDate = filtroFecha?.value?.trim();
    if (selDate) {
      out = out.filter(r => normalizeDateStr(r?.fecha_reserva) === selDate);
    }

    // Orden
    const ord = filtroOrden?.value || 'desc';
    out.sort((a,b) => {
      const ka = dateTimeKey(a), kb = dateTimeKey(b);
      return ord === 'asc' ? (ka - kb) : (kb - ka);
    });
    return out;
  };

  const renderAllFiltered = () => {
    const filtradas = aplicarFiltros(reservasAll);
    const porCliente = {};
    filtradas.forEach(res => {
      const nombre = res.nombre_cliente || 'Cliente sin nombre';
      if (!porCliente[nombre]) porCliente[nombre] = [];
      porCliente[nombre].push(res);
    });

    const nombres = Object.keys(porCliente).sort((a,b)=>a.localeCompare(b,'es'));
    if (!nombres.length) {
      panelReservas.innerHTML = `
        <h2>Todas las reservas</h2>
        <p>No hay resultados con los filtros aplicados.</p>
      `;
      return;
    }

    let html = '';
    for (const nombre of nombres) {
      const bloque = porCliente[nombre].map(res => {
        // ✅ Evitar desfase: usar formatDateCL
        const fechaTexto = formatDateCL(res.fecha_reserva, res.hora_reserva || '');
        return `
          <div class="reserva-card mini">
            <p><strong>Servicio:</strong> ${res.servicio_titulo || '-'}</p>
            <p><strong>Área:</strong> ${getAreaNombre(res) || '-'}</p>
            <p><strong>Fecha:</strong> ${fechaTexto}</p>
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
  };

  const renderClienteFiltered = () => {
    const lista = aplicarFiltros(reservasClienteActual);
    if (!lista.length) {
      panelReservas.innerHTML = `
        <h2>Reservas de ${nombreClienteActual}</h2>
        <p>No hay resultados con los filtros aplicados.</p>
      `;
      return;
    }
    const html = lista.map(res => {
      // ✅ Evitar desfase: usar formatDateCL
      const fechaTexto = formatDateCL(res.fecha_reserva, res.hora_reserva || '');
      return `
        <div class="reserva-card">
          <p><strong>Servicio:</strong> ${res.servicio_titulo || 'No especificado'}</p>
          <p><strong>Área:</strong> ${getAreaNombre(res) || 'Sin área'}</p>
          <p><strong>Fecha:</strong> ${fechaTexto}</p>
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
  };

  const handleFiltroChange = () => {
    const val = selectCliente?.value;
    if (val === 'all') renderAllFiltered();
    else renderClienteFiltered();
  };

  [filtroArea, filtroFecha, filtroOrden].forEach(el => {
    el?.addEventListener('change', handleFiltroChange);
  });

  btnLimpiar?.addEventListener('click', () => {
    if (filtroArea)  filtroArea.value = 'all';
    if (filtroFecha) filtroFecha.value = '';
    if (filtroOrden) filtroOrden.value = 'desc';
    handleFiltroChange();
  });

  // ==========================
  // Reservas (fetch y render)
  // ==========================
  const fetchReservasCliente = async (idCliente, nombreCliente) => {
    panelReservas.innerHTML = `
      <h2>Reservas de ${nombreCliente}</h2>
      <p class="loading">Cargando reservas...</p>
    `;
    try {
      const r = await fetch(`${API_BASE_URL}/api/reservas/cliente/${idCliente}`);
      if (!r.ok) throw new Error('Error al cargar reservas');
      const reservas = await r.json();

      reservasClienteActual = Array.isArray(reservas) ? reservas : [];
      nombreClienteActual = nombreCliente;

      renderClienteFiltered();
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

      reservasAll = Array.isArray(reservas) ? reservas : [];
      renderAllFiltered();
    } catch (e) {
      console.error(e);
      panelReservas.innerHTML = `<p>Error al cargar todas las reservas.</p>`;
    }
  };

  // ==========================
  // MODAL FICHA (mismo flujo)
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
  let mfFichaId   = null;
  let mfLastSaved = '';

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
      } catch {}
    }
    return null;
  };

  const mfOpen = () => { if (modal){ modal.setAttribute('aria-hidden','false'); document.body.classList.add('mf-open'); } };
  const mfClose = () => {
    if (!modal) return;
    modal.setAttribute('aria-hidden','true'); document.body.classList.remove('mf-open');
    mfReservaId = null; mfFichaId = null; mfLastSaved = '';
    if (mfTextarea) mfTextarea.value = '';
    if (mfReadTxt)  mfReadTxt.textContent = '';
    if (mfDetails)  mfDetails.style.display = 'none';
    if (mfForm)     mfForm.style.display = 'none';
    if (mfRead)     mfRead.style.display = 'none';
    if (mfLoading)  mfLoading.style.display = 'block';
  };
  const mfHasChanges = () =>
    (mfForm?.style.display !== 'none' && (mfTextarea?.value || '').trim() !== mfLastSaved.trim());
  const mfHandleClose = async () => { try { if (mfHasChanges()) await mfSave(false); } finally { mfClose(); } };

  const mfLoadReserva = async (idReserva) => {
    mfLoading.style.display = 'block';
    mfDetails.style.display = 'none';
    try {
      const r = await fetch(`${API_BASE_URL}/api/admin/reservas/${idReserva}`);
      if (!r.ok) throw new Error('No se pudo obtener la reserva.');
      const reserva = await r.json();
      mfCliente.textContent = reserva.nombre_cliente || 'N/A';
      mfServicio.textContent= reserva.servicio_titulo || 'N/A';
      // ✅ Usar formatDateCL aquí también
      mfFecha.textContent   = formatDateCL(reserva.fecha_reserva, reserva.hora_reserva || '');
      mfArea.textContent    = reserva.nombre_area || 'N/A';
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
        mfFichaId   = ficha.id ?? ficha.id_ficha ?? null;
        mfLastSaved = ficha.detalle || '';
        const firmado = ficha.registrado_por ? `\n\n— Registrado por ${ficha.registrado_por}` : '';
        mfReadTxt.textContent = `${mfLastSaved}${firmado}`;
        mfForm.style.display = 'none';
        mfRead.style.display = 'block';
        mfBtnEditar.style.display = 'inline-flex';
      } else if (f.status === 204) {
        mfFichaId   = null;
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
      mfFichaId   = null;
      mfLastSaved = '';
      mfTextarea.value = '';
      mfForm.style.display = 'block';
      mfRead.style.display = 'none';
      mfBtnEditar.style.display = 'none';
      mfTextarea.focus();
    }
  };

  const mfSave = async (showAlert = true) => {
    if (!mfReservaId) return;
    const detalleStr = (mfForm.style.display !== 'none' ? mfTextarea.value : mfLastSaved).trim();
    if (!detalleStr) { if (showAlert) alert('Por favor, escribe los detalles de la sesión.'); return; }

    const payload = { id_reserva: mfReservaId, detalle: detalleStr, registrado_por: resolveRegistradoPor() || undefined };

    try {
      if (!mfFichaId) {
        const r = await fetch(`${API_BASE_URL}/api/fichas`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
        });
        const data = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(data?.message || `Error ${r.status}`);
        mfFichaId   = data.id ?? data.id_ficha ?? mfFichaId;
        mfLastSaved = detalleStr;
        const firmado = payload.registrado_por ? `\n\n— Registrado por ${payload.registrado_por}` : '';
        mfReadTxt.textContent = `${mfLastSaved}${firmado}`;
        mfForm.style.display = 'none'; mfRead.style.display = 'block'; mfBtnEditar.style.display = 'inline-flex';
        if (showAlert) alert(data?.message || 'Ficha guardada y marcada como realizada.');
      } else {
        const actualizar = async (method) => {
          const resp = await fetch(`${API_BASE_URL}/api/fichas/${mfFichaId}`, {
            method, headers: { 'Content-Type': 'application/json' },
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
        if (mfForm.style.display !== 'none') { mfForm.style.display = 'none'; mfRead.style.display = 'block'; mfBtnEditar.style.display = 'inline-flex'; }
        if (showAlert) alert('Cambios guardados.');
      }
    } catch (e) { if (showAlert) alert(`No se pudo guardar: ${e.message}`); }
  };

  mfBtnEditar?.addEventListener('click', () => {
    mfTextarea.value = mfLastSaved || '';
    mfForm.style.display = 'block'; mfRead.style.display = 'none'; mfBtnEditar.style.display = 'none'; mfTextarea.focus();
  });
  mfBtnGuardar?.addEventListener('click', () => mfSave(true));
  mfBtnCerrar?.addEventListener('click', () => {
    if (modal?.getAttribute('aria-hidden') === 'false') { mfHandleClose(); }
  });
  btnCloseX?.addEventListener('click', mfHandleClose);
  overlay?.addEventListener('click', (e) => { if (e.target?.dataset?.close) mfHandleClose(); });
  document.addEventListener('keydown', (e) => {
    if (modal?.getAttribute('aria-hidden') === 'false' && e.key === 'Escape') mfHandleClose();
  });

  // Abre modal ficha desde los links del panel
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

  // ==========================
  // Inicialización
  // ==========================
  const init = async () => {
    await loadAreasIntoFiltro();
    clientes = await fetchClientes();
    renderSelect(clientes);

    // Seleccionar y cargar "Ver todos"
    const optAll = selectCliente.querySelector('option[value="all"]');
    if (optAll) {
      selectCliente.value = 'all';
      await fetchReservasTodas();
    }
  };

  // Cambio de cliente/“ver todos”
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
});


/* =========================================================
   MODAL PAGO — integración en historial (se mantiene)
   ========================================================= */
(function () {
  const isLocal = ['localhost', '127.0.0.1'].includes(window.location.hostname);
  const API_BASE_URL = isLocal ? 'http://localhost:3000' : 'https://cosmeticabackend-dqxh.onrender.com';

  const modalPago = document.getElementById('modal-pago');
  if (!modalPago) return;

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
    setBtnState(mpBtnAbono, { html: '<i class="fas fa-circle-check"></i> Abono realizado', disabled: true });
  };
  const markReservaPagada = () => {
    setBtnState(mpBtnPF, { html: '<i class="fas fa-circle-check"></i> Reserva pagada', disabled: true });
    setBtnState(mpBtnAbono, { html: '<i class="fas fa-circle-check"></i> Abono bloqueado', disabled: true });
  };

  const fmtFechaLarga = (fechaISO, horaStr = '') => {
    try {
      if (!fechaISO) return 'Sin fecha';
      const fechaLimpia = fechaISO.replace(/\//g, '-').trim();
      let horaInicio = horaStr;
      if (horaStr.includes('-')) horaInicio = horaStr.split('-')[0].trim();
      const d = new Date(`${fechaLimpia}T${horaInicio || '00:00'}:00`);
      if (isNaN(d.getTime())) return `${fechaLimpia}${horaStr ? ` (${horaStr})` : ''}`;
      const fechaBonita = d.toLocaleDateString('es-CL', {
        timeZone: 'America/Santiago', weekday:'long', year:'numeric', month:'long', day:'numeric'
      });
      const cap = fechaBonita.charAt(0).toUpperCase() + fechaBonita.slice(1);
      return `${cap}${horaStr ? ` (${horaStr})` : ''}`;
    } catch { return `${fechaISO}${horaStr ? ` (${horaStr})` : ''}`; }
  };

  const mpOpen = () => { modalPago.setAttribute('aria-hidden', 'false'); document.body.classList.add('mp-open'); };
  const mpClose = () => {
    modalPago.setAttribute('aria-hidden', 'true'); document.body.classList.remove('mp-open');
    mpReservaId = null;
    mpLoading.style.display = 'block';
    mpDetails.style.display = 'none';
    mpInfo.innerHTML = '';
    mpOptions.style.display = '';
    mpFormCtn.style.display = 'none';
    mpForm.reset();
    setBtnState(mpBtnAbono, { html: DEFAULT_LABELS.abono, disabled: false });
    setBtnState(mpBtnPF,   { html: DEFAULT_LABELS.final, disabled: false });
  };

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

  const mpVerificarPagos = async (idReserva) => {
    mpInfo.innerHTML = '';
    mpFormCtn.style.display = 'none';
    mpOptions.style.display = '';
    setBtnState(mpBtnAbono, { html: DEFAULT_LABELS.abono, disabled: false });
    setBtnState(mpBtnPF,   { html: DEFAULT_LABELS.final, disabled: false });

    const normS = (s) => String(s ?? '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();
    const toArray = (raw) => Array.isArray(raw) ? raw : (Array.isArray(raw?.pagos) ? raw.pagos : []);

    try {
      const r = await fetch(`${API_BASE_URL}/api/pagos/reserva/${idReserva}`);
      let pagos = [];
      if (r.status === 204) pagos = [];
      else if (r.ok) pagos = toArray(await r.json().catch(()=>null));
      else throw new Error('Error al consultar pagos.');

      let estadoReservaPago = null;
      try {
        const resReserva = await fetch(`${API_BASE_URL}/api/admin/reservas/${idReserva}`);
        if (resReserva.ok) {
          const reserva = await resReserva.json().catch(()=> ({}));
          estadoReservaPago = normS(reserva?.estado_pago);
        }
      } catch {}

      const tieneAbono = pagos.some(p => {
        const tipo = normS(p?.tipo_pago ?? p?.tipo);
        const estado = normS(p?.estado_pago ?? p?.estado);
        return tipo.includes('abono') || estado === 'abonado';
      }) || estadoReservaPago === 'abonado';

      const tieneFinal = pagos.some(p => {
        const tipo = normS(p?.tipo_pago ?? p?.tipo);
        const estado = normS(p?.estado_pago ?? p?.estado);
        return tipo.includes('pago final') || estado === 'pagado';
      }) || estadoReservaPago === 'pagado';

      if (tieneAbono) {
        const pAb = pagos.find(p => {
          const tipo = normS(p?.tipo_pago ?? p?.tipo);
          const estado = normS(p?.estado_pago ?? p?.estado);
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
          const tipo = normS(p?.tipo_pago ?? p?.tipo);
          const estado = normS(p?.estado_pago ?? p?.estado);
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
    }
  };

  const mpEnviarPago = async (payload) => {
    const r = await fetch(`${API_BASE_URL}/api/pagos`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
    });
    const json = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(json?.message || `Error ${r.status}`);
    return json;
  };

  const mpRegistrarAbono = async () => {
    if (!mpReservaId) return alert('Error: reserva no cargada.');
    if (mpBtnAbono?.disabled) return;
    setBtnState(mpBtnAbono, { html: '<i class="fas fa-spinner fa-spin"></i> Registrando...', disabled: true });
    try {
      const r = await fetch(`${API_BASE_URL}/api/pagos/reserva/${mpReservaId}`);
      let pagos = [];
      if (r.status === 204) pagos = [];
      else if (r.ok) {
        const raw = await r.json().catch(()=>null);
        pagos = Array.isArray(raw) ? raw : (Array.isArray(raw?.pagos) ? raw.pagos : []);
      } else throw new Error('Error al consultar pagos.');
      const n =(s)=>String(s??'').normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase().trim();
      const yaTieneAbono = pagos.some(p => n(p?.tipo_pago ?? p?.tipo).includes('abono') || n(p?.estado_pago ?? p?.estado)==='abonado');
      if (yaTieneAbono) { alert('⚠️ Esta reserva ya tiene un abono registrado.'); await mpVerificarPagos(mpReservaId); return; }
      if (!confirm('¿Confirmas registrar un abono de $10.000 para esta reserva?')) { setBtnState(mpBtnAbono, { html: DEFAULT_LABELS.abono, disabled: false }); return; }
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
      markAbonoRealizado();
      const box = document.createElement('div');
      box.className = 'mp-info__box mp-info__box--abono';
      box.innerHTML = `💰 <strong>Se abonaron:</strong> $${Number(payload.monto_pagado).toLocaleString('es-CL')}
        <small>(${payload.metodo_pago})</small><br>
        📅 ${new Date(payload.fecha_pago).toLocaleDateString('es-CL')}`;
      mpInfo.appendChild(box);
      await mpVerificarPagos(mpReservaId);
    } catch (e) {
      alert('❌ No se pudo registrar el abono: ' + e.message);
      setBtnState(mpBtnAbono, { html: DEFAULT_LABELS.abono, disabled: false });
    }
  };

  const mpMostrarPagoFinal = () => {
    if (mpBtnPF?.disabled) return;
    mpOptions.style.display = 'none';
    mpFormCtn.style.display = 'block';
    if (!mpFechaPago.value) mpFechaPago.valueAsDate = new Date();
    if (!mpMonto.value) mpMonto.focus();
  };

  const mpRegistrarPagoFinal = async (ev) => {
    ev.preventDefault();
    if (!mpReservaId) return alert('Error: reserva no cargada.');
    const monto = mpMonto.value, metodo = mpMetodo.value, fecha = mpFechaPago.value;
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

  btnClosePago?.addEventListener('click', mpClose);
  overlayPago?.addEventListener('click', (e) => { if (e.target?.dataset?.close) mpClose(); });
  mpBtnCerrar?.addEventListener('click', mpClose);
  mpBtnAbono?.addEventListener('click', mpRegistrarAbono);
  mpBtnPF?.addEventListener('click', mpMostrarPagoFinal);
  mpForm?.addEventListener('submit', mpRegistrarPagoFinal);
  document.addEventListener('keydown', (e) => { if (modalPago.getAttribute('aria-hidden') === 'false' && e.key === 'Escape') mpClose(); });

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


//***************************************************************
//******************* Flecha scroll *****************************
//***************************************************************
window.addEventListener("scroll", function() {
  const btn = document.getElementById("btnScrollTop");
  if (!btn) return;
  if (document.body.scrollTop > 300 || document.documentElement.scrollTop > 300) {
    btn.style.display = "flex";
  } else {
    btn.style.display = "none";
  }
});
document.getElementById("btnScrollTop")?.addEventListener("click", function() {
  window.scrollTo({ top: 0, behavior: "smooth" });
});
