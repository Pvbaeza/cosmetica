// Archivo: assets/js/registrar_pago.js (CON VALIDACIÓN DE ABONO EXISTENTE)
document.addEventListener('DOMContentLoaded', () => {

  const isLocal = ['localhost', '127.0.0.1'].includes(window.location.hostname);
  const API_BASE_URL = isLocal
    ? 'http://localhost:3000'
    : 'https://cosmeticabackend-dqxh.onrender.com';

  // --- ELEMENTOS DEL DOM ---
  const loadingEl = document.getElementById('pago-loading');
  const detailsEl = document.getElementById('pago-details');
  const optionsEl = document.getElementById('payment-options');
  const pagoFinalFormContainer = document.getElementById('pago-final-form-container');
  const pagoFinalForm = document.getElementById('pago-final-form');

  const btnRegistrarAbono = document.getElementById('btn-registrar-abono');
  const btnMostrarPagoFinal = document.getElementById('btn-mostrar-pago-final');

  const spanCliente = document.getElementById('pago-cliente-nombre');
  const spanServicio = document.getElementById('pago-servicio-nombre');
  const spanFecha = document.getElementById('pago-fecha-reserva');
  const spanArea = document.getElementById('pago-area-servicio');
  const spanId = document.getElementById('pago-id-reserva');

  const fechaPagoFinalInput = document.getElementById('pago-final-fecha');

  let reservaActual = null;

  // --- FUNCIÓN 1: OBTENER DATOS DE LA RESERVA ---
  // --- FUNCIÓN 1: OBTENER DATOS DE LA RESERVA ---
const cargarDetallesReserva = async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const idReservaParam = urlParams.get('id_reserva');

  if (!idReservaParam) {
    alert("Error: No se ha proporcionado un ID de reserva.");
    loadingEl.textContent = "Error: ID de reserva no encontrado.";
    if (optionsEl) optionsEl.style.display = 'none';
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/admin/reservas/${idReservaParam}`);
    if (!response.ok) throw new Error('No se pudo encontrar la reserva.');

    reservaActual = await response.json();

    // --- 🧩 Compatibilidad de alias con base de datos ---
    const nombreCliente =
      reservaActual.nombre_cliente || reservaActual.cliente_nombre || reservaActual.nombre || 'N/A';
    const telefonoCliente =
      reservaActual.telefono_cliente || reservaActual.telefono || 'N/A';
    const servicioNombre =
      reservaActual.servicio_titulo || reservaActual.titulo_servicio || 'N/A';
    const areaNombre =
      reservaActual.nombre_area || reservaActual.area_nombre || 'N/A';

    spanCliente.textContent = nombreCliente;
    spanServicio.textContent = servicioNombre;
    spanFecha.textContent =
      new Date(reservaActual.fecha_reserva).toLocaleDateString('es-CL', { timeZone: 'UTC' }) +
      ` (${reservaActual.hora_reserva})`;
    spanArea.textContent = areaNombre;
    spanId.textContent = reservaActual.id || idReservaParam;

    loadingEl.style.display = 'none';
    detailsEl.style.display = 'block';

    // 🚀 Verificar si ya tiene un abono
    verificarAbonoExistente(reservaActual.id);

  } catch (error) {
    console.error("Error al cargar detalles:", error);
    loadingEl.textContent = "Error: " + error.message;
    alert("Error: " + error.message);
  }
};


// --- 🧾 FUNCIÓN 1.1: VERIFICAR SI YA EXISTE UN ABONO O PAGO FINAL ---
const verificarAbonoExistente = async (idReserva) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/pagos/reserva/${idReserva}`);
    if (!response.ok) throw new Error('Error al consultar pagos.');

    const pagos = await response.json();
    console.log('Pagos recibidos:', pagos);

    // Filtrar pagos
    const abono = pagos.find(p => (p.tipo_pago || '').toLowerCase().trim() === 'abono');
    const pagoFinal = pagos.find(p => (p.tipo_pago || '').toLowerCase().trim() === 'pago final');

    // Contenedor general
    const infoContainer = document.createElement('div');
    infoContainer.className = 'pagos-info-container';
    infoContainer.style.marginTop = '15px';
    infoContainer.style.display = 'flex';
    infoContainer.style.flexDirection = 'column';
    infoContainer.style.gap = '10px';

    // 💰 Bloque de abono
    if (abono) {
      if (btnRegistrarAbono) btnRegistrarAbono.style.display = 'none';

      const abonoBox = document.createElement('div');
      abonoBox.className = 'abono-info';
      abonoBox.style.padding = '12px 15px';
      abonoBox.style.borderLeft = '6px solid #a67bd7';
      abonoBox.style.background = '#f8f4ff';
      abonoBox.style.borderRadius = '8px';
      abonoBox.innerHTML = `
        💰 <strong>Se abonaron:</strong> 
        $${Number(abono.monto_pagado).toLocaleString('es-CL')}
        <small>(${abono.metodo_pago || 'Método no especificado'})</small><br>
        📅 Fecha: ${new Date(abono.fecha_pago).toLocaleDateString('es-CL')}
      `;
      infoContainer.appendChild(abonoBox);
    }

    // 💸 Bloque de pago final
    if (pagoFinal) {
      if (btnMostrarPagoFinal) btnMostrarPagoFinal.style.display = 'none';
      if (pagoFinalFormContainer) pagoFinalFormContainer.style.display = 'none';

      const pagoBox = document.createElement('div');
      pagoBox.className = 'pago-final-info';
      pagoBox.style.padding = '12px 15px';
      pagoBox.style.borderLeft = '6px solid #4caf50';
      pagoBox.style.background = '#f3fff3';
      pagoBox.style.borderRadius = '8px';
      pagoBox.innerHTML = `
        💸 <strong>Pago final completado:</strong> 
        $${Number(pagoFinal.monto_pagado).toLocaleString('es-CL')}
        <small>(${pagoFinal.metodo_pago || 'Método no especificado'})</small><br>
        📅 Fecha: ${new Date(pagoFinal.fecha_pago).toLocaleDateString('es-CL')}
      `;
      infoContainer.appendChild(pagoBox);
    }

    // Si hay contenido, insertarlo al inicio del bloque de opciones
    if (infoContainer.childNodes.length > 0) {
      optionsEl.insertBefore(infoContainer, optionsEl.firstChild);
    }

  } catch (error) {
    console.error('Error al verificar pagos existentes:', error);
  }
};




  // --- FUNCIÓN 2: REGISTRAR UN ABONO ---
  const registrarAbono = async () => {
    if (!reservaActual?.id) {
      alert("Error: No hay datos de reserva cargados.");
      return;
    }

    if (!confirm("¿Confirmas el registro de un abono de $10.000 para esta reserva?")) return;

    const pagoData = {
      id_reserva: reservaActual.id,
      tipo_pago: 'Abono',
      monto_pagado: 10000,
      metodo_pago: 'Transferencia',
      fecha_pago: new Date().toISOString().split('T')[0],
      registrado_por: 'Admin'
    };

    await enviarPago(pagoData);
  };

  // --- FUNCIÓN 3: REGISTRAR EL PAGO FINAL ---
  const registrarPagoFinal = async (event) => {
    event.preventDefault();
    if (!reservaActual?.id) {
      alert("Error: No hay datos de reserva cargados.");
      return;
    }

    const monto = document.getElementById('pago-final-monto').value;
    const metodo = document.getElementById('pago-final-metodo').value;
    const fecha = fechaPagoFinalInput.value;

    if (!monto || !metodo || !fecha) {
      alert("Por favor, completa todos los detalles del pago final.");
      return;
    }

    const pagoData = {
      id_reserva: reservaActual.id,
      tipo_pago: 'Pago Final',
      monto_pagado: parseFloat(monto),
      metodo_pago: metodo,
      fecha_pago: fecha,
      registrado_por: 'Personal'
    };

    await enviarPago(pagoData);
  };

  // --- FUNCIÓN 4: ENVIAR PAGO AL BACKEND ---
  const enviarPago = async (pagoData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/pagos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pagoData)
      });

      const resultado = await response.json().catch(() => ({}));

      if (response.ok) {
        alert(resultado.message || 'Pago registrado con éxito.');
        window.location.reload(); // 🔁 recarga para actualizar visualmente el estado
      } else {
        throw new Error(resultado.message || `Error ${response.status}`);
      }
    } catch (error) {
      console.error("Error al enviar el pago:", error);
      alert("No se pudo registrar el pago: " + error.message);
    }
  };

  // --- EVENTOS ---
  if (btnRegistrarAbono) btnRegistrarAbono.addEventListener('click', registrarAbono);

  if (btnMostrarPagoFinal) {
    btnMostrarPagoFinal.addEventListener('click', () => {
      if (pagoFinalFormContainer) pagoFinalFormContainer.style.display = 'block';
      if (optionsEl) optionsEl.style.display = 'none';
      if (fechaPagoFinalInput && !fechaPagoFinalInput.value) {
        fechaPagoFinalInput.valueAsDate = new Date();
      }
    });
  }

  if (pagoFinalForm) pagoFinalForm.addEventListener('submit', registrarPagoFinal);

  // --- INICIALIZACIÓN ---
  cargarDetallesReserva();
});
