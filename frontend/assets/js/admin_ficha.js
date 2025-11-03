// assets/js/admin_ficha.js — Ficha editable + sin redireccionar al guardar

document.addEventListener('DOMContentLoaded', () => {
  const isLocal = ['localhost', '127.0.0.1'].includes(window.location.hostname);
  const API_BASE_URL = isLocal ? 'http://localhost:3000' : 'https://cosmeticabackend-dqxh.onrender.com';

  // DOM
  const loadingEl    = document.getElementById('ficha-loading');
  const detailsEl    = document.getElementById('ficha-details');
  const formCrear    = document.getElementById('ficha-form-crear');  // crear y editar
  const displayVer   = document.getElementById('ficha-display-ver');

  const spanCliente  = document.getElementById('ficha-cliente-nombre');
  const spanServicio = document.getElementById('ficha-servicio-nombre');
  const spanFecha    = document.getElementById('ficha-fecha-reserva');
  const spanArea     = document.getElementById('ficha-area-servicio');

  const detallesTextarea   = document.getElementById('ficha-detalles');
  const textoGuardadoDiv   = document.getElementById('ficha-texto-guardado');

  const btnGuardar         = document.getElementById('btn-guardar-ficha');
  const btnCancelarEdicion = document.getElementById('btn-cancelar-edicion');
  const btnEditarFicha     = document.getElementById('btn-editar-ficha');

  // Estado
  let idReservaGlobal = null;
  let idFichaGlobal   = null;   // null => aún no existe (modo crear)
  let detalleActual   = '';

  const mostrar = (el, si = true) => { if (el) el.style.display = si ? 'block' : 'none'; };

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

  const setModoVer = () => {
    mostrar(displayVer, true);
    mostrar(formCrear, false);
    if (btnCancelarEdicion) btnCancelarEdicion.style.display = 'none';
    if (btnGuardar) btnGuardar.innerHTML = `<i class="fas fa-save"></i> Guardar Ficha y Marcar como Realizada`;
  };

  const setModoCrear = () => {
    detallesTextarea.value = '';
    mostrar(displayVer, false);
    mostrar(formCrear, true);
    if (btnCancelarEdicion) btnCancelarEdicion.style.display = 'none';
    if (btnGuardar) btnGuardar.innerHTML = `<i class="fas fa-save"></i> Guardar Ficha y Marcar como Realizada`;
    idFichaGlobal = null;
  };

  const setModoEditar = () => {
    detallesTextarea.value = detalleActual || '';
    mostrar(displayVer, false);
    mostrar(formCrear, true);
    if (btnCancelarEdicion) btnCancelarEdicion.style.display = 'inline-block';
    if (btnGuardar) btnGuardar.innerHTML = `<i class="fas fa-save"></i> Guardar cambios`;
  };

  const formatearFechaBonita = (fechaISO, horaStr = '') => {
    try {
      const d = horaStr ? new Date(`${fechaISO}T${horaStr}:00`) : new Date(`${fechaISO}T00:00:00`);
      return `${d.toLocaleDateString('es-CL', { timeZone: 'America/Santiago', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}${horaStr ? ` (${horaStr})` : ''}`;
    } catch {
      return `${fechaISO}${horaStr ? ` (${horaStr})` : ''}`;
    }
  };

  const recargarFicha = async () => {
    try {
      const f = await fetch(`${API_BASE_URL}/api/fichas?id_reserva=${idReservaGlobal}`);
      if (f.status === 200) {
        const ficha = await f.json();
        idFichaGlobal  = ficha.id ?? ficha.id_ficha ?? null;
        detalleActual  = ficha.detalle || '';
        const firmado  = ficha.registrado_por ? `\n\n— Registrado por ${ficha.registrado_por}` : '';
        textoGuardadoDiv.innerText = `${detalleActual}${firmado}`;
        setModoVer();
      } else if (f.status === 204) {
        idFichaGlobal = null;
        detalleActual = '';
        setModoCrear();
      } else {
        throw new Error('Error al verificar la ficha clínica.');
      }
    } catch (e) {
      console.warn(e);
      idFichaGlobal = null;
      detalleActual = '';
      setModoCrear();
    }
  };

  const cargarDatos = async () => {
    const params = new URLSearchParams(window.location.search);
    const id_reserva = params.get('id_reserva');
    if (!id_reserva) {
      alert('Error: falta id_reserva en la URL.');
      if (loadingEl) loadingEl.textContent = 'Error: falta id_reserva en la URL.';
      return;
    }
    idReservaGlobal = Number(id_reserva);

    // Reserva
    try {
      const r = await fetch(`${API_BASE_URL}/api/admin/reservas/${idReservaGlobal}`);
      if (!r.ok) throw new Error(r.status === 404 ? 'Reserva no encontrada.' : 'No se pudo obtener la reserva.');
      const reserva = await r.json();

      spanCliente.textContent  = reserva.nombre_cliente || 'N/A';
      spanServicio.textContent = reserva.servicio_titulo || 'N/A';
      spanFecha.textContent    = formatearFechaBonita(reserva.fecha_reserva, reserva.hora_reserva || '');
      spanArea.textContent     = reserva.nombre_area || 'N/A';

      mostrar(loadingEl, false);
      mostrar(detailsEl, true);
    } catch (e) {
      console.error(e);
      alert(`Error: ${e.message}`);
      if (loadingEl) loadingEl.textContent = `Error: ${e.message}`;
      return;
    }

    await recargarFicha();
  };

  // Guardar (crear o editar)
  const onSubmitGuardar = async (ev) => {
    ev.preventDefault();

    const detalleStr = (detallesTextarea.value || '').trim();
    if (!detalleStr) return alert('Por favor, escribe los detalles de la sesión.');
    if (!idReservaGlobal) return alert('Error: No hay ID de reserva asociado.');

    const basePayload = {
      id_reserva: idReservaGlobal,
      detalle: detalleStr,
      registrado_por: resolveRegistradoPor() || undefined
    };

    try {
      if (!idFichaGlobal) {
        // CREAR
        const r = await fetch(`${API_BASE_URL}/api/fichas`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(basePayload)
        });
        const data = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(data?.message || `Error ${r.status}`);

        await recargarFicha();  // no redirecciona
        alert(data?.message || 'Ficha guardada y marcada como realizada.');
      } else {
        // EDITAR — intentar PUT; si falla, PATCH
        const actualizar = async (method) => {
          const resp = await fetch(`${API_BASE_URL}/api/fichas/${idFichaGlobal}`, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ detalle: detalleStr, registrado_por: basePayload.registrado_por })
          });
          const json = await resp.json().catch(() => ({}));
          if (!resp.ok) throw new Error(json?.message || `Error ${resp.status}`);
          return json;
        };

        try {
          await actualizar('PUT');
        } catch {
          await actualizar('PATCH');
        }

        // Actualiza vista local
        detalleActual = detalleStr;
        const firmado = basePayload.registrado_por ? `\n\n— Registrado por ${basePayload.registrado_por}` : '';
        textoGuardadoDiv.innerText = `${detalleActual}${firmado}`;
        setModoVer();
        alert('Cambios guardados.');
      }
    } catch (e) {
      console.error(e);
      alert(`No se pudo guardar: ${e.message}`);
    }
  };

  // Eventos
  formCrear?.addEventListener('submit', onSubmitGuardar);
  btnEditarFicha?.addEventListener('click', setModoEditar);
  btnCancelarEdicion?.addEventListener('click', setModoVer);

  // Init
  cargarDatos();
});
