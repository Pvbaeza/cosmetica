// Archivo: assets/js/trabajador_reservas.js

document.addEventListener('DOMContentLoaded', () => {

    // --- ELEMENTOS DEL DOM (Reservas) ---
    const listaReservas = document.querySelector('.booking-list');
    // ... (otros elementos de reservas que ya tenías) ...

    // --- ELEMENTOS DEL DOM (Perfil) ---
    const profileName = document.getElementById('profile-name');
    const profileUsername = document.getElementById('profile-username');
    const profileEmail = document.getElementById('profile-email');
    const profileArea = document.getElementById('profile-area');

    // --- ELEMENTOS DEL DOM (Cambiar Contraseña) ---
    const changePasswordCard = document.getElementById('cambiar-contrasena'); // Card container
    const changePasswordTitle = changePasswordCard?.querySelector('.collapsible-title'); // Title
    const changePasswordContent = changePasswordCard?.querySelector('.collapsible-content'); // Content div
    const changePasswordForm = document.getElementById('change-password-form');
    const currentPasswordInput = document.getElementById('current-password');
    const newPasswordInput = document.getElementById('new-password');
    const confirmNewPasswordInput = document.getElementById('confirm-new-password');
    const changePasswordError = document.getElementById('change-password-error');

    // --- VARIABLES GLOBALES (Reservas) ---
    let todasLasReservas = [];
    let loggedInUserRole = null; // Variable para guardar el rol/área del usuario logueado

    // ... (Funciones de modal de reservas, mostrarReservas - asegúrate que estén) ...
     // --- FUNCIONES DEL MODAL (Reservas) ---
    const modalOverlay = document.querySelector('.modal-overlay'); // Asegúrate que el selector es correcto
    const closeModalBtn = document.querySelector('.modal-close');
    const manageBookingForm = document.getElementById('manage-booking-form'); // ID del form del modal de reservas

    const openModal = () => modalOverlay?.classList.add('active');
    const closeModal = () => {
        if (modalOverlay) modalOverlay.classList.remove('active');
        if (manageBookingForm) manageBookingForm.reset(); // Resetear form de gestión de reserva
        // editingReservaId = null; // Si usas esta variable
    };
    if(closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
    if(modalOverlay) modalOverlay.addEventListener('click', (event) => {
        if (event.target === modalOverlay) closeModal();
    });
    // --- FIN FUNCIONES MODAL RESERVAS ---

     // --- FUNCIÓN PARA MOSTRAR RESERVAS --- (Incluyendo filtro de fecha)
     const mostrarReservas = (reservasParaMostrar) => {
        if (!listaReservas) return;
        listaReservas.innerHTML = '<h2><i class="fas fa-calendar-alt"></i> Próximas Reservas</h2>'; // Limpiar y poner título

        if (!reservasParaMostrar || reservasParaMostrar.length === 0) {
            listaReservas.innerHTML += '<p>No hay reservas para mostrar.</p>';
            return;
        }

        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);

        const reservasFuturas = reservasParaMostrar.filter(reserva => {
            if (!reserva.fecha_reserva) return false;
            const fechaReserva = new Date(reserva.fecha_reserva);
             // IMPORTANTE: Asegurar comparación correcta de fechas (considerar UTC si es necesario)
            fechaReserva.setUTCHours(0, 0, 0, 0); // Comparar fechas en UTC puede ser más seguro
            return fechaReserva >= hoy;
        });

        if (reservasFuturas.length === 0) {
            listaReservas.innerHTML += '<p>No tienes reservas programadas para hoy o fechas futuras.</p>';
            return;
        }

        // Ordenar
        reservasFuturas.sort((a, b) => {
             const timeA = a.hora_reserva ? a.hora_reserva.split('-')[0].trim() : '00:00';
             const timeB = b.hora_reserva ? b.hora_reserva.split('-')[0].trim() : '00:00';
             const dateA = new Date(a.fecha_reserva + 'T' + timeA + ':00Z'); // Asumir UTC si las fechas son UTC
             const dateB = new Date(b.fecha_reserva + 'T' + timeB + ':00Z');
            return dateA - dateB;
        });

        reservasFuturas.forEach(reserva => {
            // *** ASEGÚRATE QUE TU BACKEND ENVÍA 'id_reserva' ***
            const idReserva = reserva.id_reserva;
            if (!idReserva) { console.warn("Reserva omitida por falta de ID", reserva); return; }

            const nombreCliente = reserva.nombre_cliente || 'N/A';
            const servicio = reserva.tipo_servicio || 'N/A';
            // Formatear fecha asegurando UTC para consistencia
            const fecha = reserva.fecha_reserva ? new Date(reserva.fecha_reserva).toLocaleDateString('es-CL', { timeZone: 'UTC', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A';
            const hora = reserva.hora_reserva || 'N/A';
            const rut = reserva.rut_cliente || 'N/A';
            const telefono = reserva.telefono_cliente || 'N/A';
            const fechaCreacion = reserva.fecha_creacion ? new Date(reserva.fecha_creacion).toLocaleDateString('es-CL') : 'N/A';
            const areaServicio = reserva.area_servicio || 'Desconocida';

            const card = document.createElement('div');
            card.className = 'booking-card';
            card.dataset.reserva = JSON.stringify(reserva).replace(/'/g, "&apos;"); // Guardar datos y escapar

            card.innerHTML = `
                <div class="booking-header">
                    <h3 class="client-name">${nombreCliente}</h3>
                    <div class="booking-actions">
                        <button class="btn-icon btn-edit" data-id="${idReserva}" title="Gestionar"><i class="fas fa-pencil-alt"></i></button>
                        <button class="btn-icon btn-delete" data-id="${idReserva}" title="Cancelar"><i class="fas fa-trash-alt"></i></button>
                    </div>
                </div>
                <div class="booking-body">
                    <p><strong>Servicio:</strong> ${servicio} <span class="area-tag">(${areaServicio})</span></p>
                    <p><strong>Fecha:</strong> ${fecha}</p>
                    <p><strong>Hora:</strong> ${hora}</p>
                </div>
                <div class="booking-footer">
                    <div class="client-contact">
                        <p><i class="fas fa-id-card"></i> ${rut}</p>
                        <p><i class="fas fa-phone"></i> ${telefono}</p>
                    </div>
                    <small class="creation-date">Creado: ${fechaCreacion}</small>
                </div>
            `;
            listaReservas.appendChild(card);
        });
    };
    // --- FIN FUNCIÓN MOSTRAR RESERVAS ---


    // --- FUNCIÓN PARA OBTENER DATOS DEL USUARIO Y SUS RESERVAS ---
    const fetchUserDataAndReservations = async () => {
        try {
            // 1. Obtener datos del usuario logueado (necesitas un endpoint para esto)
            //    Esta llamada debe devolver el nombre, username, email y MUY IMPORTANTE: el 'area' o 'rol'.
            // const userResponse = await fetch('http://localhost:3000/api/trabajador/perfil'); // EJEMPLO DE URL
            // if (!userResponse.ok) throw new Error('No se pudo obtener el perfil del trabajador.');
            // const userData = await userResponse.json();

            // --- SIMULACIÓN DE DATOS DE USUARIO ---
            const userData = {
                 nombre: "Empleado Ejemplo",
                 username: "empleado1",
                 correo: "empleado@ejemplo.com",
                 area: "Peluqueria" // ¡Este valor es crucial!
            };
             // --- FIN SIMULACIÓN ---

            console.log("Datos del trabajador:", userData);
            loggedInUserRole = userData.area; // Guardar el área/rol globalmente

            // 2. Mostrar datos en la sección "Mi Perfil"
            if (profileName) profileName.textContent = userData.nombre || 'No disponible';
            if (profileUsername) profileUsername.textContent = userData.username || 'No disponible';
            if (profileEmail) profileEmail.textContent = userData.correo || 'No disponible';
            if (profileArea) profileArea.textContent = userData.area || 'No asignada';

            // 3. Cargar SOLO las reservas del área/rol del usuario
            if (loggedInUserRole) {
                // Necesitas un endpoint que filtre por área, p.ej. /api/reservas?area=Peluqueria
                const reservasResponse = await fetch(`http://localhost:3000/api/reservas?area=${loggedInUserRole}`);
                if (!reservasResponse.ok) throw new Error(`Error ${reservasResponse.status}: No se pudo obtener la lista de reservas para ${loggedInUserRole}.`);
                todasLasReservas = await reservasResponse.json();
                console.log(`Reservas cargadas para ${loggedInUserRole}:`, todasLasReservas);
                mostrarReservas(todasLasReservas); // Muestra las reservas filtradas
            } else {
                 throw new Error("No se pudo determinar el área del trabajador.");
            }

        } catch (error) {
            console.error('Error al cargar datos iniciales:', error);
            if(listaReservas) listaReservas.innerHTML = `<p class="error-msg">Error: ${error.message}</p>`;
            // Podrías mostrar error también en perfil
             if (profileName) profileName.textContent = 'Error';
             if (profileUsername) profileUsername.textContent = 'Error';
             if (profileEmail) profileEmail.textContent = 'Error';
             if (profileArea) profileArea.textContent = 'Error';
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

            const currentPassword = currentPasswordInput.value;
            const newPassword = newPasswordInput.value;
            const confirmNewPassword = confirmNewPasswordInput.value;

            if (newPassword !== confirmNewPassword) {
                if (changePasswordError) changePasswordError.style.display = 'block';
                confirmNewPasswordInput.focus();
                return;
            }
             if (!currentPassword || !newPassword) {
                 alert("Ingresa la contraseña actual y la nueva."); return;
            }

            const passwordData = { currentPassword, newPassword };
            console.log("Cambiando contraseña:", passwordData);

            try {
                 // --- NECESITAS UN ENDPOINT PARA ESTO: PUT /api/trabajador/cambiar-contrasena ---
                 // Debe verificar la contraseña actual ANTES de cambiarla
                 // const response = await fetch('http://localhost:3000/api/trabajador/cambiar-contrasena', {
                 //    method: 'PUT',
                 //    headers: { 'Content-Type': 'application/json' },
                 //    body: JSON.stringify(passwordData)
                 // });
                 // const result = await response.json().catch(() => ({}));
                 // if (!response.ok) throw new Error(result.message || `Error ${response.status}`);
                 // alert(result.message || 'Contraseña cambiada con éxito.');

                 // Simulación:
                 alert('Contraseña cambiada (simulación).');
                 changePasswordForm.reset();
                  // Opcional: Cerrar sección
                 // if (changePasswordContent) changePasswordContent.classList.remove('active');
                 // if (changePasswordTitle) changePasswordTitle.classList.remove('active');

            } catch(error) {
                 console.error("Error al cambiar contraseña:", error);
                 alert("No se pudo cambiar la contraseña: " + error.message);
            }
        });
    }

     // --- LÓGICA PARA GESTIONAR RESERVAS (Modal simplificado) ---
     if (listaReservas) {
        listaReservas.addEventListener('click', async (event) => {
             const btnEditar = event.target.closest('.btn-edit');
             const btnEliminar = event.target.closest('.btn-delete');
             const card = event.target.closest('.booking-card');

             if (!card || (!btnEditar && !btnEliminar)) return;

             let reserva;
             try {
                 reserva = JSON.parse(card.dataset.reserva.replace(/&apos;/g, "'"));
             } catch(e) { console.error("Error parse reserva data:", e); return; }

             const reservaId = reserva.id_reserva;
             if (!reservaId) return;

             // ACCIÓN: EDITAR/GESTIONAR (Abrir modal simplificado)
             if (btnEditar) {
                 // Llenar modal de gestión
                 document.getElementById('edit-reserva-id').value = reservaId; // Input oculto en modal
                 document.getElementById('modal-cliente-nombre').textContent = reserva.nombre_cliente || 'N/A';
                 document.getElementById('modal-servicio-nombre').textContent = reserva.tipo_servicio || 'N/A';
                 const fechaModal = reserva.fecha_reserva ? new Date(reserva.fecha_reserva).toLocaleDateString('es-CL', { timeZone: 'UTC' }) : 'N/A';
                 document.getElementById('modal-fecha-hora').textContent = `${fechaModal} ${reserva.hora_reserva || ''}`;
                 // Aquí podrías poner el estado actual si lo tienes
                 // document.getElementById('reserva-status').value = reserva.estado || 'programada';
                 // document.getElementById('reserva-notas').value = reserva.notas || '';
                 openModal();
             }

             // ACCIÓN: ELIMINAR/CANCELAR
             if (btnEliminar) {
                 if (confirm(`¿Seguro que quieres cancelar la reserva de ${reserva.nombre_cliente}?`)) {
                     try {
                         const response = await fetch(`http://localhost:3000/api/reservas/${reservaId}`, { method: 'DELETE' });
                         if (!response.ok && response.status !== 204) {
                             const error = await response.json().catch(() => ({}));
                             throw new Error(error.message || `Error ${response.status}`);
                         }
                         alert('Reserva cancelada.');
                         fetchUserDataAndReservations(); // Recarga todo
                     } catch (error) {
                         console.error("Error al cancelar:", error);
                         alert("No se pudo cancelar la reserva: " + error.message);
                     }
                 }
             }
        });
     }

      // --- LÓGICA PARA GUARDAR ESTADO/NOTAS DESDE EL MODAL ---
      if (manageBookingForm) {
          manageBookingForm.addEventListener('submit', async (event) => {
              event.preventDefault();
              const id = document.getElementById('edit-reserva-id').value;
              const estado = document.getElementById('reserva-status').value;
              const notas = document.getElementById('reserva-notas').value;

              if(!id) return;

              console.log(`Actualizando estado/notas para reserva ID ${id}:`, { estado, notas });
              try {
                  // --- NECESITAS UN ENDPOINT PUT /api/reservas/:id/estado O SIMILAR ---
                  // const response = await fetch(`http://localhost:3000/api/reservas/${id}/estado`, {
                  //      method: 'PUT',
                  //      headers: { 'Content-Type': 'application/json' },
                  //      body: JSON.stringify({ estado, notas })
                  // });
                  // if (!response.ok) { /* ... manejo de error ... */ }
                  // alert('Estado actualizado.');

                  alert("Estado actualizado (simulación)."); // Simulación
                  closeModal();
                  fetchUserDataAndReservations(); // Recarga todo

              } catch(error) {
                  console.error("Error al actualizar estado:", error);
                  alert("No se pudo actualizar: " + error.message);
              }
          });
      }


    // --- CARGA INICIAL ---
    fetchUserDataAndReservations(); // Llama a la función que carga perfil y reservas filtradas

}); // Fin DOMContentLoaded