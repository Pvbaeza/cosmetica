// --- LÓGICA DE ENTORNO AUTOMÁTICO ---
// Detecta si estamos en localhost o en el servidor de Render
const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const API_BASE_URL = isLocal 
    ? 'http://localhost:3000' // URL para desarrollo local
    : 'https://cosmetica-cvsi.onrender.com'; // URL para producción

document.addEventListener('DOMContentLoaded', () => {

    // --- ELEMENTOS DEL DOM (Perfil y Reservas) ---
    const listaReservas = document.querySelector('.booking-list');
    const profileName = document.getElementById('profile-name');
    const profileUsername = document.getElementById('profile-username');
    const profileEmail = document.getElementById('profile-email');
    const profileArea = document.getElementById('profile-area');

    // --- ELEMENTOS DEL DOM (Cambiar Contraseña) ---
    const changePasswordCard = document.getElementById('cambiar-contrasena');
    const changePasswordTitle = changePasswordCard?.querySelector('.collapsible-title');
    const changePasswordContent = changePasswordCard?.querySelector('.collapsible-content');
    const changePasswordForm = document.getElementById('change-password-form');
    const currentPasswordInput = document.getElementById('current-password');
    const newPasswordInput = document.getElementById('new-password');
    const confirmNewPasswordInput = document.getElementById('confirm-new-password');
    const changePasswordError = document.getElementById('change-password-error');
    
    // --- ELEMENTOS DEL DOM (Modal de Gestión de Reservas) ---
    const modalOverlay = document.querySelector('.modal-overlay');
    const closeModalBtn = document.querySelector('.modal-close');
    const manageBookingForm = document.getElementById('manage-booking-form');

    let todasLasReservas = [];
    let loggedInUserRole = null;

    // --- FUNCIONES DEL MODAL (Reservas) ---
    const openModal = () => modalOverlay?.classList.add('active');
    const closeModal = () => {
        if (modalOverlay) modalOverlay.classList.remove('active');
        if (manageBookingForm) manageBookingForm.reset();
    };
    if(closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
    if(modalOverlay) modalOverlay.addEventListener('click', (event) => {
        if (event.target === modalOverlay) closeModal();
    });

    // --- FUNCIÓN PARA MOSTRAR RESERVAS ---
    const mostrarReservas = (reservasParaMostrar) => {
        if (!listaReservas) return;
        listaReservas.innerHTML = '<h2><i class="fas fa-calendar-alt"></i> Próximas Reservas</h2>';

        if (!reservasParaMostrar || reservasParaMostrar.length === 0) {
            listaReservas.innerHTML += '<p>No hay reservas para mostrar.</p>';
            return;
        }

        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);

        const reservasFuturas = reservasParaMostrar.filter(reserva => {
            if (!reserva.fecha_reserva) return false;
            const fechaReserva = new Date(reserva.fecha_reserva);
            fechaReserva.setUTCHours(0, 0, 0, 0);
            return fechaReserva >= hoy;
        });

        if (reservasFuturas.length === 0) {
            listaReservas.innerHTML += '<p>No tienes reservas programadas para hoy o fechas futuras.</p>';
            return;
        }

        reservasFuturas.sort((a, b) => {
            const timeA = a.hora_reserva ? a.hora_reserva.split('-')[0].trim() : '00:00';
            const timeB = b.hora_reserva ? b.hora_reserva.split('-')[0].trim() : '00:00';
            const dateA = new Date(a.fecha_reserva + 'T' + timeA + ':00Z');
            const dateB = new Date(b.fecha_reserva + 'T' + timeB + ':00Z');
            return dateA - dateB;
        });

        reservasFuturas.forEach(reserva => {
            const idReserva = reserva.id; // Asumiendo que el ID se llama 'id'
            if (!idReserva) { console.warn("Reserva omitida por falta de ID", reserva); return; }

            const card = document.createElement('div');
            card.className = 'booking-card';
            card.dataset.reserva = JSON.stringify(reserva).replace(/'/g, "&apos;");

            card.innerHTML = `
                <div class="booking-header">
                    <h3 class="client-name">${reserva.nombre_cliente || 'N/A'}</h3>
                    <div class="booking-actions">
                        <button class="btn-icon btn-edit" data-id="${idReserva}" title="Gestionar"><i class="fas fa-pencil-alt"></i></button>
                        <button class="btn-icon btn-delete" data-id="${idReserva}" title="Cancelar"><i class="fas fa-trash-alt"></i></button>
                    </div>
                </div>
                <div class="booking-body">
                    <p><strong>Servicio:</strong> ${reserva.servicio || 'N/A'} <span class="area-tag">(${reserva.area_servicio || 'N/A'})</span></p>
                    <p><strong>Fecha:</strong> ${new Date(reserva.fecha_reserva).toLocaleDateString('es-CL', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' })}</p>
                    <p><strong>Hora:</strong> ${reserva.hora_reserva || 'N/A'}</p>
                </div>
                <div class="booking-footer">
                    <div class="client-contact">
                        <p><i class="fas fa-id-card"></i> ${reserva.rut_cliente || 'N/A'}</p>
                        <p><i class="fas fa-phone"></i> ${reserva.telefono_cliente || 'N/A'}</p>
                    </div>
                </div>
            `;
            listaReservas.appendChild(card);
        });
    };

    // --- FUNCIÓN PARA OBTENER DATOS DEL USUARIO Y SUS RESERVAS ---
    const fetchUserDataAndReservations = async () => {
        try {
            // Asumimos que tienes un endpoint que devuelve los datos del trabajador autenticado
            const userResponse = await fetch(`${API_BASE_URL}/api/trabajador/perfil`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
            });
            if (!userResponse.ok) throw new Error('No se pudo obtener el perfil del trabajador.');
            const userData = await userResponse.json();

            loggedInUserRole = userData.area;

            if (profileName) profileName.textContent = userData.nombre || 'No disponible';
            if (profileUsername) profileUsername.textContent = userData.username || 'No disponible';
            if (profileEmail) profileEmail.textContent = userData.correo || 'No disponible';
            if (profileArea) profileArea.textContent = userData.area || 'No asignada';

            if (loggedInUserRole) {
                const reservasResponse = await fetch(`${API_BASE_URL}/api/admin/reservas?area=${loggedInUserRole}`);
                if (!reservasResponse.ok) throw new Error(`No se pudo obtener la lista de reservas para ${loggedInUserRole}.`);
                todasLasReservas = await reservasResponse.json();
                mostrarReservas(todasLasReservas);
            } else {
                throw new Error("No se pudo determinar el área del trabajador.");
            }
        } catch (error) {
            console.error('Error al cargar datos iniciales:', error);
            if(listaReservas) listaReservas.innerHTML = `<p class="error-msg">Error: ${error.message}</p>`;
        }
    };

    // --- LÓGICA COLAPSABLE PARA CAMBIAR CONTRASEÑA ---
    if (changePasswordTitle && changePasswordContent) {
        changePasswordTitle.addEventListener('click', () => {
            changePasswordContent.classList.toggle('active');
            changePasswordTitle.classList.toggle('active');
        });
    }

    // --- LÓGICA FORMULARIO CAMBIAR CONTRASEÑA ---
    if (changePasswordForm) {
        changePasswordForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            if (changePasswordError) changePasswordError.style.display = 'none';

            const newPassword = newPasswordInput.value;
            if (newPassword !== confirmNewPasswordInput.value) {
                if (changePasswordError) changePasswordError.style.display = 'block';
                return;
            }

            try {
                // Asumimos un endpoint para cambiar la contraseña
                const response = await fetch(`${API_BASE_URL}/api/trabajador/cambiar-contrasena`, {
                    method: 'PUT',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                    },
                    body: JSON.stringify({ 
                        currentPassword: currentPasswordInput.value, 
                        newPassword: newPassword 
                    })
                });
                const result = await response.json();
                if (!response.ok) throw new Error(result.message);
                
                alert(result.message || 'Contraseña cambiada con éxito.');
                changePasswordForm.reset();
            } catch(error) {
                alert("No se pudo cambiar la contraseña: " + error.message);
            }
        });
    }
    
    // --- LÓGICA PARA GESTIONAR RESERVAS ---
    if (listaReservas) {
        listaReservas.addEventListener('click', async (event) => {
            const btnEliminar = event.target.closest('.btn-delete');
            if (!btnEliminar) return;

            const card = event.target.closest('.booking-card');
            const reserva = JSON.parse(card.dataset.reserva.replace(/&apos;/g, "'"));
            const reservaId = reserva.id;

            if (confirm(`¿Seguro que quieres cancelar la reserva de ${reserva.nombre_cliente}?`)) {
                try {
                    const response = await fetch(`${API_BASE_URL}/api/admin/reservas/${reservaId}`, { method: 'DELETE' });
                    if (!response.ok && response.status !== 204) {
                        const error = await response.json().catch(() => ({}));
                        throw new Error(error.message || `Error ${response.status}`);
                    }
                    alert('Reserva cancelada.');
                    fetchUserDataAndReservations(); // Recarga todo
                } catch (error) {
                    alert("No se pudo cancelar la reserva: " + error.message);
                }
            }
        });
    }

    // --- CARGA INICIAL ---
    fetchUserDataAndReservations();
});
