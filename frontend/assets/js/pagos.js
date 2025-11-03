// Archivo: assets/js/registrar_pago.js (CORREGIDO)

document.addEventListener('DOMContentLoaded', () => {

    // --- LÓGICA DE ENTORNO AUTOMÁTICO ---
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const API_BASE_URL = isLocal
        ? 'http://localhost:3000' // URL local
        : 'https://cosmeticabackend-dqxh.onrender.com'; // URL producción

    // --- ELEMENTOS DEL DOM ---
    const loadingEl = document.getElementById('pago-loading');
    const detailsEl = document.getElementById('pago-details');
    const optionsEl = document.getElementById('payment-options');
    const pagoFinalFormContainer = document.getElementById('pago-final-form-container');
    const pagoFinalForm = document.getElementById('pago-final-form');

    const btnRegistrarAbono = document.getElementById('btn-registrar-abono');
    const btnMostrarPagoFinal = document.getElementById('btn-mostrar-pago-final');

    // Spans de detalles
    const spanCliente = document.getElementById('pago-cliente-nombre');
    const spanServicio = document.getElementById('pago-servicio-nombre');
    const spanFecha = document.getElementById('pago-fecha-reserva');
    const spanArea = document.getElementById('pago-area-servicio');
    const spanId = document.getElementById('pago-id-reserva');

    const fechaPagoFinalInput = document.getElementById('pago-final-fecha');

    let reservaActual = null;

    // --- FUNCIÓN 1: OBTENER DATOS DE LA RESERVA ---
    const cargarDetallesReserva = async () => {
        const urlParams = new URLSearchParams(window.location.search);
        const idReservaParam = urlParams.get('id_reserva');

        if (!idReservaParam) {
            alert("Error: No se ha proporcionado un ID de reserva.");
            loadingEl.textContent = "Error: ID de reserva no encontrado en la URL.";
            if (optionsEl) optionsEl.style.display = 'none';
            return;
        }

        try {
            // 1. Pedir al backend (¡Esta ruta ahora existe!)
            const response = await fetch(`${API_BASE_URL}/api/admin/reservas/${idReservaParam}`);

            if (!response.ok) {
                throw new Error('No se pudo encontrar la reserva (ID: ' + idReservaParam + ')');
            }
            reservaActual = await response.json();

            // 2. Llenar la tarjeta (usando los nombres de columna correctos del JOIN)
            spanCliente.textContent = reservaActual.nombre_cliente || 'N/A';

            // --- ¡CORRECCIÓN! ---
            // Usamos 'servicio_titulo' y 'nombre_area' (vienen del JOIN en server.js)
            // Ya no usamos 'tipo_servicio' o 'area_servicio'
            spanServicio.textContent = reservaActual.servicio_titulo || 'N/A';
            spanFecha.textContent = new Date(reservaActual.fecha_reserva).toLocaleDateString('es-CL', { timeZone: 'UTC' }) + ` (${reservaActual.hora_reserva})`;
            spanArea.textContent = reservaActual.nombre_area || 'N/A';
            spanId.textContent = reservaActual.id || idReservaParam;

            // 3. Mostrar detalles
            loadingEl.style.display = 'none';
            detailsEl.style.display = 'block';

        } catch (error) {
            console.error("Error al cargar detalles:", error);
            alert("Error: " + error.message);
            loadingEl.textContent = "Error: " + error.message;
        }
    };

    // --- FUNCIÓN 2: REGISTRAR EL ABONO ---
    const registrarAbono = async () => {
        if (!reservaActual) {
            alert("Error: No hay datos de reserva cargados.");
            return;
        }

        const idReserva = reservaActual.id;

        if (!idReserva) {
            alert("Error: No se pudo leer el ID de la reserva cargada.");
            return;
        }

        if (!confirm("¿Confirmas el registro de un abono de $10.000 para esta reserva?")) {
            return;
        }

        const pagoData = {
            id_reserva: idReserva,
            tipo_pago: 'Abono',
            monto_pagado: 10000,
            metodo_pago: 'Transferencia', // Valor por defecto
            fecha_pago: new Date().toISOString().split('T')[0], // Hoy
            nombre_cliente: reservaActual.nombre_cliente,
            // --- ¡CORRECCIÓN! ---
            tipo_servicio: reservaActual.servicio_titulo, // Usar el campo correcto
            registrado_por: 'Admin'
        };

        await enviarPago(pagoData);
    };

    // --- FUNCIÓN 3: REGISTRAR EL PAGO FINAL ---
    const registrarPagoFinal = async (event) => {
        event.preventDefault();
        if (!reservaActual) {
            alert("Error: No hay datos de reserva cargados.");
            return;
        }

        const idReserva = reservaActual.id;
        if (!idReserva) {
            alert("Error: No se pudo leer el ID de la reserva cargada.");
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
            id_reserva: idReserva,
            tipo_pago: 'Pago Final',
            monto_pagado: monto,
            metodo_pago: metodo,
            fecha_pago: fecha,
            nombre_cliente: reservaActual.nombre_cliente,
            // --- ¡CORRECCIÓN! ---
            tipo_servicio: reservaActual.servicio_titulo, // Usar el campo correcto
            registrado_por: 'Personal'
        };

        await enviarPago(pagoData);
    };

    // --- FUNCIÓN 4: LÓGICA DE ENVÍO (POST a /api/pagos) ---
    const enviarPago = async (pagoData) => {
        console.log("Enviando pago:", pagoData);
        try {
            // ¡Esta ruta ahora existe!
            const response = await fetch(`${API_BASE_URL}/api/pagos`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(pagoData)
            });

            const resultado = await response.json().catch(() => ({}));

            if (response.ok) {
                alert(resultado.message || 'Pago registrado con éxito.');
                window.location.href = 'admin_reservas.html'; // Volver a la lista de reservas
            } else {
                throw new Error(resultado.message || `Error ${response.status}`);
            }

        } catch (error) {
            console.error("Error al enviar el pago:", error);
            alert("No se pudo registrar el pago: " + error.message);
        }
    };

    // --- ASIGNACIÓN DE EVENTOS ---
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

}); // Fin DOMContentLoaded