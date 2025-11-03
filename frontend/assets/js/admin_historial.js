// Archivo: assets/js/historial_pagos.js

document.addEventListener('DOMContentLoaded', () => {
    
    // --- LÓGICA DE ENTORNO AUTOMÁTICO ---
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const API_BASE_URL = isLocal 
        ? 'http://localhost:3000' // URL local
        : 'https://cosmeticabackend-dqxh.onrender.com'; // URL producción

    // --- ELEMENTOS DEL DOM ---
    const paymentHistoryList = document.getElementById('historial-lista-body'); // El <tbody> de la tabla

    // --- FUNCIÓN: Cargar y Mostrar Historial de Pagos ---
    const loadPaymentHistory = async () => {
        if (!paymentHistoryList) {
            console.error("Elemento 'historial-lista-body' no encontrado.");
            return;
        }
        
        // Mensaje de carga inicial (ya está en el HTML, pero podemos reforzar)
        paymentHistoryList.innerHTML = '<tr><td colspan="7" class="loading-message"><i class="fas fa-spinner fa-spin"></i> Cargando historial...</td></tr>';

        try {
            // 1. Obtener datos del nuevo endpoint /api/pagos
            const response = await fetch(`${API_BASE_URL}/api/pagos`);
            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                throw new Error(err.message || 'No se pudo cargar el historial de pagos.');
            }
            const payments = await response.json();

            // 2. Verificar si hay pagos
            if (!payments || payments.length === 0) {
                paymentHistoryList.innerHTML = '<tr><td colspan="7" class="loading-message">No hay pagos registrados.</td></tr>';
                return;
            }

            paymentHistoryList.innerHTML = ''; // Limpiar la lista (quitar "Cargando...")
            
            // 3. Ordenar por fecha (más reciente primero)
            payments.sort((a, b) => new Date(b.fecha_pago) - new Date(a.fecha_pago));

            // 4. Renderizar cada pago en la tabla
            payments.forEach(pago => {
                const row = document.createElement('tr');

                // Formatear datos
                const fechaPago = new Date(pago.fecha_pago).toLocaleDateString('es-CL', { timeZone: 'UTC' });
                const monto = Number(pago.monto_pagado || 0).toLocaleString('es-CL', { style: 'currency', currency: 'CLP' });
                
                // Asignar clase de estilo según tipo de pago
                let tipoPagoClass = '';
                if (pago.tipo_pago?.toLowerCase() === 'abono') {
                    tipoPagoClass = 'pago-tipo-abono';
                } else if (pago.tipo_pago?.toLowerCase() === 'pago final') {
                    tipoPagoClass = 'pago-tipo-pago-final';
                }

                row.innerHTML = `
                    <td>${fechaPago}</td>
                    <td>${pago.nombre_cliente || 'N/A'}</td>
                    <td>${pago.tipo_servicio || 'N/A'}</td>
                    <td><span class="${tipoPagoClass}">${pago.tipo_pago || 'N/A'}</span></td>
                    <td>${pago.metodo_pago || 'N/A'}</td>
                    <td>${monto}</td>
                    <td>${pago.registrado_por || 'Sistema'}</td>
                `;
                paymentHistoryList.appendChild(row);
            });

        } catch (error) {
            console.error("Error cargando historial de pagos:", error);
            paymentHistoryList.innerHTML = `<tr><td colspan="7" class="error-message">${error.message}</td></tr>`;
        }
    };

    // --- INICIALIZACIÓN ---
    loadPaymentHistory();

}); // Fin DOMContentLoaded