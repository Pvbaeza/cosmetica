// --- LÓGICA DE ENTORNO AUTOMÁTICO ---
const isLocal_TH = ['localhost', '127.0.0.1'].includes(window.location.hostname);
const API_BASE_URL_TH = isLocal_TH ? 'http://localhost:3000' : 'https://cosmeticabackend-dqxh.onrender.com';

document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('authToken');
  const userAreaId = localStorage.getItem('userArea'); // id área del trabajador

  const selectCliente = document.getElementById('select-cliente');
  const panelHistorial = document.getElementById('panel-historial');
  const inputBuscar = document.getElementById('entrada-buscar');
  const logoutBtn = document.getElementById('logout');

  if (!token || !userAreaId) {
    window.location.href = 'login.html';
    return;
  }

  // logout
  logoutBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    localStorage.removeItem('authToken');
    localStorage.removeItem('userArea');
    window.location.href = 'login.html';
  });

  initHistorial(token, userAreaId, { selectCliente, panelHistorial, inputBuscar });
});

// ========================== Helpers de normalización ==========================
const normTH = (s) => String(s || '')
  .normalize('NFD')
  .replace(/\p{Diacritic}/gu, '')
  .trim()
  .toLowerCase();

// nombre a fecha bonita
const fechaBonitaTH = (fechaISO) => {
  const dStr = String(fechaISO || '').slice(0,10).replace(/\//g,'-');
  if (!dStr) return 'Sin fecha';
  const d = new Date(`${dStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return 'Sin fecha';
  return d.toLocaleDateString('es-CL', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    timeZone: 'America/Santiago'
  });
};

// =============================== Inicialización ===============================
async function initHistorial(token, areaId, refs){
  const { selectCliente, panelHistorial, inputBuscar } = refs;

  // 1) obtener nombre del área
  const areasResp = await fetch(`${API_BASE_URL_TH}/api/areas`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!areasResp.ok) throw new Error('No se pudo obtener áreas.');
  const areas = await areasResp.json();
  const miArea = areas.find(a => String(a.id_area) === String(areaId));
  if (!miArea) throw new Error('No se encontró el área del trabajador.');
  const nombreDeMiArea = miArea.nombre_area;

  // 2) pedir reservas (con area y area_id en el query)
  const qs = new URLSearchParams();
  qs.set('area', nombreDeMiArea);
  qs.set('area_id', areaId);

  const resResp = await fetch(`${API_BASE_URL_TH}/api/admin/reservas?${qs.toString()}`, {
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
  });

  if (resResp.status === 401 || resResp.status === 403) {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userArea');
    alert('Tu sesión ha expirado. Inicia sesión nuevamente.');
    window.location.href = 'login.html';
    return;
  }
  if (!resResp.ok) throw new Error('Error al cargar reservas.');
  let reservas = await resResp.json();

  // 3) filtro robusto por área (ID o nombre)
  const areaIdNum = Number(areaId);
  reservas = reservas.filter((r) => {
    const idHits = [
      r.id_area, r.area_id, r.id_area_servicio,
      r.servicio?.id_area, r.servicio?.area_id
    ].some((v) => Number(v) === areaIdNum);

    if (idHits) return true;

    const nameHits = [
      r.area, r.nombre_area,
      r.servicio?.area, r.servicio?.nombre_area
    ].filter(Boolean).some(n => normTH(n) === normTH(nombreDeMiArea));

    return nameHits;
  });

  // 4) construir grupos por cliente (clave estable por ID si existe)
  const grupos = new Map();
  for (const r of reservas) {
    const clientId =
      r.id_cliente ?? r.cliente_id ?? r.id_usuario_cliente ?? r.usuario_cliente_id ?? null;

    const clientName =
      r.nombre_cliente ?? r.cliente_nombre ?? r.cliente?.nombre ?? r.nombre ?? 'Cliente sin nombre';

    const key = clientId ? `id:${clientId}` : `name:${normTH(clientName)}`;

    if (!grupos.has(key)) {
      grupos.set(key, { nombre: clientName, id: clientId, items: [] });
    }
    grupos.get(key).items.push(r);
  }

  // 5) llenar selector de clientes
  renderSelectTH(selectCliente, grupos);

  // 6) estado de filtros y render
  const state = {
    query: '',
    selectedKey: 'all', // all por defecto
    grupos
  };

  const doRender = () => renderPanelTH(panelHistorial, state);

  // listeners filtros
  inputBuscar?.addEventListener('input', (e) => {
    state.query = e.target.value || '';
    doRender();
  });

  selectCliente?.addEventListener('change', (e) => {
    state.selectedKey = e.target.value || 'all';
    doRender();
  });

  // render inicial
  doRender();

  // manejar apertura de modal de ficha (delegado)
  panelHistorial.addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-ficha-id]');
    if (!btn) return;
    const idReserva = Number(btn.getAttribute('data-ficha-id'));
    if (!idReserva) return;

    await openFichaModalTH(idReserva, token);
  });
}

// =========================== Render de selector ===========================
function renderSelectTH(selectEl, grupos){
  selectEl.innerHTML = `
    <option value="all" selected>👥 Ver todos</option>
  `;

  // ordenar por nombre de cliente
  const arr = [...grupos.entries()]
    .map(([key, val]) => ({ key, nombre: val.nombre }))
    .sort((a,b) => a.nombre.localeCompare(b.nombre, 'es'));

  for (const { key, nombre } of arr) {
    const opt = document.createElement('option');
    opt.value = key;
    opt.textContent = nombre;
    selectEl.appendChild(opt);
  }
}

// ============================= Render panel ==============================
function renderPanelTH(panel, state){
  const { grupos, query, selectedKey } = state;
  const q = normTH(query);

  // armar lista de bloques visibles según filtros
  const visibles = [];

  for (const [key, data] of grupos.entries()) {
    // filtro por select
    if (selectedKey !== 'all' && key !== selectedKey) continue;

    // filtro por texto (nombre cliente o teléfono en reservas)
    const nombreOk = !q || normTH(data.nombre).includes(q);

    // si no entra por nombre, probamos por teléfono en alguna reserva
    let telefonoOk = false;
    if (!nombreOk && q) {
      telefonoOk = data.items.some(r => normTH(r.telefono_cliente || r.telefono).includes(q));
      if (!telefonoOk) continue;
    } else if (!nombreOk && !q) {
      // sin query, mostrar igual
    }

    // ordenar reservas de ese cliente por fecha DESC (más recientes primero)
    const itemsOrdenados = [...data.items].sort((a,b) => {
      const da = new Date(a.fecha_reserva).getTime() || 0;
      const db = new Date(b.fecha_reserva).getTime() || 0;
      return db - da;
    });

    visibles.push({ key, nombre: data.nombre, items: itemsOrdenados });
  }

  if (visibles.length === 0) {
    panel.innerHTML = `<p style="padding:1rem; text-align:center;">No hay resultados para mostrar.</p>`;
    return;
  }

  let html = '';
  for (const bloque of visibles) {
    const cards = bloque.items.map((res) => {
      const fecha = fechaBonitaTH(res.fecha_reserva);
      const hora = res.hora_reserva
        ? String(res.hora_reserva).replace('-', ' - ').replace('  -  ', ' - ')
        : '—';

      const tituloServicio =
        res.servicio?.titulo ??
        (typeof res.id_servicio === 'object' ? res.id_servicio?.titulo : undefined) ??
        res.servicio_titulo ??
        res.tipo_servicio ??
        '(Servicio no encontrado)';

      const areaTxt = res.nombre_area || res.area || res.servicio?.area || '—';
      const reservaId = Number(res.id ?? res.id_reserva);

      return `
        <div class="reserva-card">
          <p><strong>Servicio:</strong> ${tituloServicio}</p>
          <p><strong>Área:</strong> ${areaTxt}</p>
          <p><strong>Fecha:</strong> ${fecha} (${hora})</p>
          <div class="acciones">
            <button class="btn btn-primario" data-ficha-id="${reservaId}">
              <i class="fas fa-file-medical"></i> Ficha
            </button>
          </div>
        </div>
      `;
    }).join('');

    html += `
      <div class="bloque-cliente">
        <h3>${bloque.nombre}</h3>
        ${cards}
      </div>
    `;
  }

  panel.innerHTML = html;
}

// ============================== MODAL FICHA ==============================
async function openFichaModalTH(idReserva, token){
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

  // open
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
      const r = await fetch(`${API_BASE_URL_TH}/api/admin/reservas/${mfReservaId}`, {
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
      const f = await fetch(`${API_BASE_URL_TH}/api/fichas?id_reserva=${mfReservaId}`);
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

  // guardar ficha
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
        const r = await fetch(`${API_BASE_URL_TH}/api/fichas`, {
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
          const resp = await fetch(`${API_BASE_URL_TH}/api/fichas/${mfFichaId}`, {
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

  // eventos modal
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
