// --- LÓGICA DE ENTORNO AUTOMÁTICO ---
const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const API_BASE_URL = isLocal
  ? 'http://localhost:3000' // URL para desarrollo local
  : 'https://cosmeticabackend-dqxh.onrender.com'; // URL para producción

document.addEventListener('DOMContentLoaded', () => {
  // 1. Obtener los datos de la sesión
  const token = localStorage.getItem('authToken');
  const userAreaId = localStorage.getItem('userArea'); // ID del área del trabajador (ej: 3, 5)

  // 2. Elementos del DOM
  const bookingList = document.querySelector('.booking-list');
  const loadingPlaceholder = document.getElementById('loading-placeholder');
  const exampleCard = document.querySelector('.booking-card');
  const logoutButton = document.getElementById('logout');

  // 3. Limpiar la página (quitar tarjeta de ejemplo)
  if (exampleCard) exampleCard.remove();

  // 4. Iniciar la carga de datos
  if (token && userAreaId) {
    iniciarCargaDeReservas(token, userAreaId);
  } else {
    console.error('No se encontró token o ID de área. Redirigiendo a login.');
    window.location.href = 'login.html';
  }

  // 5. Botón de cerrar sesión
  logoutButton?.addEventListener('click', (e) => {
    e.preventDefault();
    localStorage.removeItem('authToken');
    localStorage.removeItem('userArea');
    window.location.href = 'login.html';
  });
});

async function iniciarCargaDeReservas(token, areaId) {
  const bookingList = document.querySelector('.booking-list');
  const loadingPlaceholder = document.getElementById('loading-placeholder');

  // === Helpers de tiempo y formato ===
  function getReservaStartMs(r) {
    const dStr = String(r?.fecha_reserva || '').slice(0, 10).replace(/\//g, '-').trim();
    if (!dStr) return NaN;
    let hhmm = '00:00';
    if (r?.hora_reserva) {
      const first = String(r.hora_reserva).split('-')[0].trim();
      if (/^\d{1,2}:\d{2}$/.test(first)) hhmm = first.padStart(5, '0');
    }
    return new Date(`${dStr}T${hhmm}:00`).getTime();
  }

  function getReservaDateOnlyMs(r) {
    const dStr = String(r?.fecha_reserva || '').slice(0, 10).replace(/\//g, '-').trim();
    if (!dStr) return NaN;
    const d = new Date(`${dStr}T00:00:00`);
    return d.getTime();
  }

  function formatFechaBonita(fechaISO) {
    const dStr = String(fechaISO || '').slice(0, 10).replace(/\//g, '-').trim();
    if (!dStr) return 'Sin fecha';
    const d = new Date(`${dStr}T00:00:00`);
    if (Number.isNaN(d.getTime())) return 'Sin fecha';
    return d.toLocaleDateString('es-CL', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'America/Santiago'
    });
  }

  async function cargarServicios(token) {
    const posiblesRutas = ['/api/servicios', '/api/admin/servicios'];
    for (const ruta of posiblesRutas) {
      try {
        const resp = await fetch(`${API_BASE_URL}${ruta}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (resp.ok) {
          const data = await resp.json();
          return Array.isArray(data) ? data : (data.data ?? []);
        }
      } catch (e) {
        console.warn(`No se pudo leer ${ruta}:`, e);
      }
    }
    return [];
  }

  try {
    // --- PASO 1: Obtener reservas confirmadas del trabajador ---
    const reservasResponse = await fetch(`${API_BASE_URL}/api/trabajador/reservas`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (reservasResponse.status === 401 || reservasResponse.status === 403) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('userArea');
      alert('Tu sesión ha expirado. Por favor, inicia sesión de nuevo.');
      window.location.href = 'login.html';
      return;
    }

    if (!reservasResponse.ok)
      throw new Error('Error al cargar las reservas confirmadas.');

    let reservas = await reservasResponse.json();

    // 🔥 SOLO HOY Y FUTURAS
    const now = new Date();
    const startOfTodayMs = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    reservas = reservas.filter(r => {
      const dayMs = getReservaDateOnlyMs(r);
      return !Number.isNaN(dayMs) && dayMs >= startOfTodayMs;
    });

    // Ordenar por fecha/hora
    reservas.sort((a, b) => getReservaStartMs(a) - getReservaStartMs(b));

    // --- PASO 2: Cargar servicios ---
    const servicios = await cargarServicios(token);
    const serviciosById = new Map(
      servicios.map(s => [String(s.id ?? s.id_servicio ?? s._id), s])
    );

    // --- PASO 3: Render de tarjetas ---
    if (loadingPlaceholder) loadingPlaceholder.style.display = 'none';
    if (!Array.isArray(reservas) || reservas.length === 0) {
      bookingList.innerHTML = '<p style="text-align: center;">No tienes reservas confirmadas por el momento.</p>';
      return;
    }

    bookingList.innerHTML = '';
    reservas.forEach(reserva => {
      const card = document.createElement('div');
      card.className = 'booking-card';
      card.dataset.reserva = JSON.stringify(reserva);

      const fechaFormateada = formatFechaBonita(reserva.fecha_reserva);
      const fechaCreacion = reserva.fecha_creacion
        ? new Date(reserva.fecha_creacion).toLocaleDateString('es-CL', { timeZone: 'America/Santiago' })
        : '—';

      const tituloServicio =
        reserva.servicio?.titulo ??
        serviciosById.get(String(reserva.id_servicio))?.titulo ??
        reserva.servicio_titulo ??
        '(Servicio no encontrado)';

      const horaTexto = reserva.hora_reserva
        ? String(reserva.hora_reserva).replace('-', ' - ').replace('  -  ', ' - ')
        : '—';

      const idReserva = reserva.id ?? reserva.id_reserva;

      card.innerHTML = `
        <div class="booking-header">
          <h3 class="client-name">${reserva.nombre_cliente || 'Cliente'}</h3>
        </div>
        <div class="booking-body">
          <p><strong>Servicio:</strong> ${tituloServicio}</p>
          <p><strong>Fecha:</strong> ${fechaFormateada}</p>
          <p><strong>Hora:</strong> ${horaTexto}</p>
          <p><strong>Área:</strong> ${reserva.nombre_area || 'N/A'}</p>
        </div>
        <div class="booking-footer">
          <div class="client-contact">
            <p><i class="fas fa-id-card"></i> ${reserva.rut_cliente || 'No ingresado'}</p>
            <p><i class="fas fa-phone"></i> ${reserva.telefono_cliente || 'No ingresado'}</p>
          </div>
          <div class="acciones" style="display:flex;gap:8px;flex-wrap:wrap;">
            <button class="btn btn--soft btn-ficha" data-id="${idReserva}">
              <i class="fas fa-file-medical"></i> Ficha
            </button>
            <button class="btn btn--accent btn-pago-final" data-id="${idReserva}">
              <i class="fas fa-money-check-alt"></i> Pago Final
            </button>
          </div>
          <small class="creation-date">Registrado: ${fechaCreacion}</small>
        </div>
      `;
      bookingList.appendChild(card);
    });

    // --- Delegación de eventos ---
    bookingList.addEventListener('click', async (e) => {
      const btnFicha = e.target.closest('.btn-ficha');
      const btnPago = e.target.closest('.btn-pago-final');

      if (btnFicha) {
        const id = Number(btnFicha.dataset.id);
        if (id) await mfOpenAndLoad(id, token);
      }
      if (btnPago) {
        const id = Number(btnPago.dataset.id);
        if (id) await mpOpenAndLoad(id, token);
      }
    });
  } catch (error) {
    console.error('Error al iniciar la página:', error);
    if (loadingPlaceholder) {
      loadingPlaceholder.innerHTML = `<p style="color: red; text-align: center;">${error.message}</p>`;
    }
  }
}

/* =========================
   MODAL FICHA (igual que historial: click->mfSave)
   ========================= */
async function mfOpenAndLoad(idReserva, token){
  const modal = document.getElementById('modal-ficha');
  const overlay = modal?.querySelector('.modal-ficha__overlay');
  const btnCloseX = document.getElementById('modal-ficha-close');

  const mfLoading = document.getElementById('mf-loading');
  const mfDetails = document.getElementById('mf-details');
  const mfCliente = document.getElementById('mf-cliente');
  const mfServicio= document.getElementById('mf-servicio');
  const mfFecha   = document.getElementById('mf-fecha');
  const mfArea    = document.getElementById('mf-area');

  const mfForm    = document.getElementById('mf-form');
  const mfTextarea= document.getElementById('mf-detalle');
  const mfRead    = document.getElementById('mf-read');
  const mfReadTxt = document.getElementById('mf-detalle-read');

  const mfBtnEditar = document.getElementById('mf-btn-editar');
  const mfBtnGuardar= document.getElementById('mf-btn-guardar');
  const mfBtnCerrar = document.getElementById('mf-btn-cerrar');

  let mfReservaId = idReserva;
  let mfFichaId   = null;
  let mfLastSaved = '';

  // open / close
  const mfOpen = () => { if (modal){ modal.setAttribute('aria-hidden','false'); document.body.classList.add('mf-open'); } };
  const mfClose= () => {
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
  const mfHasChanges = () => (mfForm?.style.display !== 'none' && (mfTextarea?.value || '').trim() !== mfLastSaved.trim());
  const mfHandleClose = async () => {
    try {
      if (mfHasChanges()) await mfSave(false);
    } finally { mfClose(); }
  };

  // quién registra
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

  const formatearFechaBonita = (fechaISO, horaStr = '') => {
    try {
      if (!fechaISO) return 'Sin fecha';
      const fechaLimpia = fechaISO.replace(/\//g, '-').trim();
      let horaInicio = horaStr;
      if (horaStr && horaStr.includes('-')) horaInicio = horaStr.split('-')[0].trim();
      const d = new Date(`${fechaLimpia}T${horaInicio || '00:00'}:00`);
      if (isNaN(d.getTime())) return `${fechaLimpia}${horaStr ? ` (${horaStr})` : ''}`;
      const fechaBonita = d.toLocaleDateString('es-CL', {
        timeZone: 'America/Santiago', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
      });
      const capitalizada = fechaBonita.charAt(0).toUpperCase() + fechaBonita.slice(1);
      return `${capitalizada}${horaStr ? ` (${horaStr})` : ''}`;
    } catch { return `${fechaISO}${horaStr ? ` (${horaStr})` : ''}`; }
  };

  // cargar reserva
  const mfLoadReserva = async () => {
    mfLoading.style.display = 'block';
    mfDetails.style.display = 'none';
    try {
      const r = await fetch(`${API_BASE_URL}/api/admin/reservas/${mfReservaId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!r.ok) throw new Error('No se pudo obtener la reserva.');
      const reserva = await r.json();
      mfCliente.textContent = reserva.nombre_cliente || 'N/A';
      mfServicio.textContent= reserva.servicio_titulo || reserva.servicio?.titulo || 'N/A';
      mfFecha.textContent   = formatearFechaBonita(reserva.fecha_reserva, reserva.hora_reserva || '');
      mfArea.textContent    = reserva.nombre_area || reserva.area || reserva.servicio?.area || 'N/A';
      mfLoading.style.display = 'none';
      mfDetails.style.display = 'block';
    } catch (e) {
      mfLoading.innerHTML = `<p style="color:#b94848;">${e.message}</p>`;
    }
  };

  // cargar ficha
  const mfLoadFicha = async () => {
    try {
      const f = await fetch(`${API_BASE_URL}/api/fichas?id_reserva=${mfReservaId}`);
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

  // guardar ficha (MISMO FLUJO QUE HISTORIAL)
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
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(data?.message || `Error ${r.status}`);

        mfFichaId   = data.id ?? data.id_ficha ?? mfFichaId;
        mfLastSaved = detalleStr;
        const firmado = payload.registrado_por ? `\n\n— Registrado por ${payload.registrado_por}` : '';
        mfReadTxt.textContent = `${mfLastSaved}${firmado}`;
        mfForm.style.display = 'none';
        mfRead.style.display = 'block';
        mfBtnEditar.style.display = 'inline-flex';
        if (showAlert) alert(data?.message || 'Ficha guardada y marcada como realizada.');
      } else {
        // PUT -> PATCH fallback
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

  // eventos modal (MISMO PATRÓN QUE HISTORIAL)
  document.getElementById('mf-btn-editar')?.addEventListener('click', () => {
    mfTextarea.value = mfLastSaved || '';
    mfForm.style.display = 'block';
    mfRead.style.display = 'none';
    mfBtnEditar.style.display = 'none';
    mfTextarea.focus();
  });
  document.getElementById('mf-btn-guardar')?.addEventListener('click', () => mfSave(true));
  document.getElementById('mf-btn-cerrar')?.addEventListener('click', mfHandleClose);
  document.getElementById('modal-ficha-close')?.addEventListener('click', mfHandleClose);
  overlay?.addEventListener('click', (e) => { if (e.target?.dataset?.close) mfHandleClose(); });
  document.addEventListener('keydown', (e) => {
    if (modal?.getAttribute('aria-hidden') === 'false' && e.key === 'Escape') mfHandleClose();
  });

  // abrir y cargar
  mfOpen();
  await mfLoadReserva();
  await mfLoadFicha();
}

/* =========================
   MODAL PAGO FINAL (sin cambios)
   ========================= */
async function mpOpenAndLoad(idReserva, token) {
  const modalPago = document.getElementById('modal-pago');
  if (!modalPago) { alert('No se encontró el modal de Pago (id="modal-pago").'); return; }

  const overlayPago  = modalPago.querySelector('.modal-pago__overlay');
  const btnClosePago = modalPago.querySelector('#modal-pago-close');

  const mpLoading    = modalPago.querySelector('#mp-loading');
  const mpDetails    = modalPago.querySelector('#mp-details');
  const mpCliente    = modalPago.querySelector('#mp-cliente');
  const mpServicio   = modalPago.querySelector('#mp-servicio');
  const mpFecha      = modalPago.querySelector('#mp-fecha');
  const mpArea       = modalPago.querySelector('#mp-area');
  const mpIdSpan     = modalPago.querySelector('#mp-id');

  const mpInfo       = modalPago.querySelector('#mp-info');
  const mpFormCtn    = modalPago.querySelector('#mp-form-container');
  const mpForm       = modalPago.querySelector('#mp-form');
  const mpMonto      = modalPago.querySelector('#mp-monto');
  const mpMetodo     = modalPago.querySelector('#mp-metodo');
  const mpFechaPago  = modalPago.querySelector('#mp-fecha-pago');
  const mpBtnCerrar  = modalPago.querySelector('#mp-btn-cerrar');

  let mpReservaId = idReserva;

  const mpOpen  = ()=>{ modalPago.setAttribute('aria-hidden','false'); document.body.classList.add('mp-open'); };
  const mpClose = ()=>{
    modalPago.setAttribute('aria-hidden','true'); document.body.classList.remove('mp-open');
    mpReservaId = null;
    mpLoading.style.display = 'block';
    mpDetails.style.display = 'none';
    mpInfo.innerHTML = '';
    mpFormCtn.style.display = 'none';
    mpForm?.reset();
  };

  const fmtFechaLarga = (fechaISO, horaStr='')=>{
    try {
      const dStr = String(fechaISO || '').slice(0,10).replace(/\//g,'-').trim();
      if (!dStr) return 'Sin fecha';
      let hh = '00:00';
      if (horaStr && horaStr.includes('-')) hh = horaStr.split('-')[0].trim();
      const d = new Date(`${dStr}T${hh}:00`);
      if (isNaN(d.getTime())) return `${dStr}${horaStr?` (${horaStr})`:''}`;
      const txt = d.toLocaleDateString('es-CL',{ timeZone:'America/Santiago', weekday:'long', year:'numeric', month:'long', day:'numeric' });
      return `${txt.charAt(0).toUpperCase()+txt.slice(1)}${horaStr?` (${horaStr})`:''}`;
    } catch { return `${fechaISO}${horaStr?` (${horaStr})`:''}`; }
  };

  const mpLoadReserva = async () => {
    mpLoading.style.display = 'block';
    mpDetails.style.display = 'none';
    try {
      const r = await fetch(`${API_BASE_URL}/api/admin/reservas/${mpReservaId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!r.ok) throw new Error('No se pudo obtener la reserva.');
      const res = await r.json();
      mpCliente.textContent  = res.nombre_cliente || 'N/A';
      mpServicio.textContent = res.servicio_titulo || res.servicio?.titulo || 'N/A';
      mpFecha.textContent    = fmtFechaLarga(res.fecha_reserva, res.hora_reserva || '');
      mpArea.textContent     = res.nombre_area || res.area || res.servicio?.area || 'N/A';
      mpIdSpan.textContent   = res.id ?? mpReservaId;
      mpLoading.style.display = 'none';
      mpDetails.style.display = 'block';
    } catch (e) {
      mpLoading.innerHTML = `<p style="color:#b94848;">${e.message}</p>`;
    }
  };

  const mpVerificarPagos = async () => {
    mpInfo.innerHTML = '';
    mpFormCtn.style.display = 'block';

    try {
      const r = await fetch(`${API_BASE_URL}/api/pagos/reserva/${mpReservaId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!r.ok) throw new Error('Error al consultar pagos.');
      const pagos = await r.json();

      const norm = s => String(s || '').toLowerCase().trim();
      const final = pagos.find(p => norm(p.tipo_pago).includes('pago final'));
      const abono = pagos.find(p => norm(p.tipo_pago).includes('abono'));

      if (abono) {
        const box = document.createElement('div');
        box.className = 'mp-info__box mp-info__box--abono';
        box.innerHTML = `💰 <strong>Abono:</strong> $${Number(abono.monto_pagado).toLocaleString('es-CL')}
          <small>(${abono.metodo_pago || 'Método no especificado'})</small><br>
          📅 ${new Date(abono.fecha_pago).toLocaleDateString('es-CL')}`;
        mpInfo.appendChild(box);
      }

      if (final) {
        const box = document.createElement('div');
        box.className = 'mp-info__box mp-info__box--final';
        box.innerHTML = `💸 <strong>Pago final:</strong> $${Number(final.monto_pagado).toLocaleString('es-CL')}
          <small>(${final.metodo_pago || 'Método no especificado'})</small><br>
          📅 ${new Date(final.fecha_pago).toLocaleDateString('es-CL')}`;
        mpInfo.appendChild(box);
        mpFormCtn.style.display = 'none';
      } else {
        if (!mpFechaPago.value) mpFechaPago.valueAsDate = new Date();
        mpMonto.focus();
      }
    } catch {}
  };

  const mpEnviarPago = async (payload) => {
    const r = await fetch(`${API_BASE_URL}/api/pagos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(payload)
    });
    const json = await r.json().catch(()=> ({}));
    if (!r.ok) throw new Error(json?.message || `Error ${r.status}`);
    return json;
  };

  const onSubmitPagoFinal = async (ev) => {
    ev.preventDefault();
    const monto  = mpMonto.value;
    const metodo = mpMetodo.value;
    const fecha  = mpFechaPago.value;
    if (!monto || !metodo || !fecha) return alert('Completa todos los campos del pago final.');

    const check = await fetch(`${API_BASE_URL}/api/pagos/reserva/${mpReservaId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const pagos = check.ok ? await check.json() : [];
    const yaFinal = pagos.some(p => String(p.tipo_pago || '').toLowerCase().includes('pago final'));
    if (yaFinal) {
      alert('Esta reserva ya tiene Pago Final registrado.');
      await mpVerificarPagos();
      return;
    }

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
      await mpVerificarPagos();
    } catch (e) {
      alert('No se pudo registrar el pago final: ' + e.message);
    }
  };

  const bindOnce = (el, evt, fn) => {
    if (!el) return;
    const key = `__bound_${evt}`;
    if (!el[key]) { el.addEventListener(evt, fn); el[key] = true; }
  };

  bindOnce(btnClosePago, 'click', mpClose);
  bindOnce(overlayPago, 'click', (e)=>{ if (e.target?.dataset?.close) mpClose(); });
  bindOnce(mpBtnCerrar, 'click', mpClose);
  bindOnce(mpForm, 'submit', onSubmitPagoFinal);

  mpOpen();
  await mpLoadReserva();
  await mpVerificarPagos();
}