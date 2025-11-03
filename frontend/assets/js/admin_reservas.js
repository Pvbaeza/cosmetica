// Archivo: assets/js/admin_reservas.js

// --- LÓGICA DE ENTORNO AUTOMÁTICO ---
const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const API_BASE_URL = isLocal
    ? 'http://localhost:3000' // URL para desarrollo local
    : 'https://cosmeticabackend-dqxh.onrender.com'; // URL para producción

document.addEventListener('DOMContentLoaded', () => {

    // --- SELECCIÓN DE ELEMENTOS DEL DOM ---
    const modalOverlay = document.querySelector('.modal-overlay');
    const modalTitle = document.querySelector('.modal-content h2');
    const openModalBtn = document.querySelector('.btn-open-modal');
    const closeModalBtn = document.querySelector('.modal-close');
    const bookingListContainer = document.querySelector('.booking-list');
    const bookingForm = document.querySelector('.booking-form');
    const areaFilter = document.getElementById('area-filter');

    // Inputs del formulario del modal
    const nameInput = document.getElementById('nombre_cliente');
    const rutInput = document.getElementById('rut_cliente');
    const phoneInput = document.getElementById('telefono_cliente');
    const serviceSelect = document.getElementById('tipo_servicio');
    const dateInput = document.getElementById('fecha_reserva');
    const timeSelect = document.getElementById('hora_reserva');

    let editingBookingId = null;

    // --- FUNCIONES DEL MODAL ---
    const openModal = () => modalOverlay.classList.add('active');
    const closeModal = () => {
        modalOverlay.classList.remove('active');
        bookingForm.reset();
        editingBookingId = null;
        // Limpiar estilos y estado de los horarios en el modal
        Array.from(timeSelect.options).forEach(opt => {
            opt.disabled = false;
            opt.style.color = '';
            if (opt.value) opt.textContent = opt.value.replace('-', ' a ');
        });
    };

    // --- FUNCIÓN PARA CARGAR ÁREAS EN EL FILTRO ---
    const loadAreasIntoFilter = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/areas`);
            if (!response.ok) throw new Error('No se pudieron cargar las áreas para el filtro.');

            const areas = await response.json();

            areaFilter.innerHTML = '<option value="todos">Todas las Áreas</option>';
            areas.forEach(area => {
                // Asumiendo que el backend envía 'id_area' y 'nombre_area'
                const option = document.createElement('option');
                option.value = area.id_area;
                option.textContent = area.nombre_area;
                areaFilter.appendChild(option);
            });
        } catch (error) {
            console.error('Error cargando áreas para el filtro:', error);
        }
    };

    // --- FUNCIÓN PARA OBTENER Y MOSTRAR LAS RESERVAS ---
    const fetchBookings = async () => {
        const selectedArea = areaFilter.value; // Obtener valor del filtro
        try {
            // La URL ahora incluye el filtro
            const url = `${API_BASE_URL}/api/admin/reservas?id_area=${selectedArea}`;
            const response = await fetch(url);
            if (!response.ok) throw new Error('No se pudieron obtener las reservas.');

            const bookings = await response.json();
            renderBookings(bookings); // Llamar a la función que dibuja
        } catch (error) {
            console.error(error);
            bookingListContainer.innerHTML = '<h2>Error</h2><p>No se pudieron cargar las reservas.</p>';
        }
    };

    // --- FUNCIÓN PARA RENDERIZAR LAS TARJETAS DE RESERVA (MODIFICADA) ---
    const renderBookings = (bookings) => {
        bookingListContainer.innerHTML = '<h2>Reservas Programadas</h2>'; // Limpiar lista
        if (!bookings || bookings.length === 0) {
            bookingListContainer.innerHTML += '<p>No hay reservas programadas para el área seleccionada.</p>';
            return;
        }
        bookings.forEach(booking => {
            const bookingCard = document.createElement('div');
            bookingCard.className = 'booking-card';
            // Guardar todos los datos de la reserva en el dataset
            bookingCard.dataset.booking = JSON.stringify(booking); 

            // Formatear fechas
            const bookingDate = new Date(booking.fecha_reserva);
            const formattedDate = bookingDate.toLocaleDateString('es-CL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
            const creationDate = new Date(booking.fecha_creacion);
            const formattedCreationDate = creationDate.toLocaleDateString('es-CL');
            
            // Asumimos que tu backend envía 'booking.estado_pago' y 'booking.id'
            const estadoPago = booking.estado_pago || 'Pendiente'; 
            const idReserva = booking.id; // Asumiendo que el ID se llama 'id'

            let paymentActionsHTML = ''; // Variable para el botón/chip de pago

            // Lógica de Pagos (la dejamos como estaba)
            if (estadoPago.toLowerCase() === 'abonado') {
                paymentActionsHTML = `
                    <span class="btn-icon btn-chip btn-abonado" title="Abono ya registrado">
                        <i class="fas fa-check"></i> Abonado
                    </span>
                    <a href="registrar_pago.html?id_reserva=${idReserva}" class="btn-icon btn-pay" title="Registrar Pago Final">
                        <i class="fas fa-dollar-sign"></i>
                    </a>
                `;
            } else if (estadoPago.toLowerCase() === 'pago final') {
                 paymentActionsHTML = `
                    <span class="btn-icon btn-chip btn-pagado" title="Pago completado">
                        <i class="fas fa-check-circle"></i> Pagado
                    </span>
                `;
            } else { // Pendiente
                 paymentActionsHTML = `
                    <a href="admin_pagos.html?id_reserva=${idReserva}" class="btn-icon btn-pay" title="Registrar Pago/Abono">
                        <i class="fas fa-dollar-sign"></i>
                    </a>
                `;
            }
            
            // --- ¡NUEVO BOTÓN DE FICHA CLÍNICA AÑADIDO! ---
            // Este botón siempre se muestra (o puedes añadirle lógica de estado si quieres)
            const fichaButtonHTML = `
                <a href="admin_ficha.html?id_reserva=${idReserva}" class="btn-icon btn-ficha" title="Ver/Añadir Ficha Clínica">
                    <i class="fas fa-file-medical"></i>
                </a>
            `;

            bookingCard.innerHTML = `
                <div class="booking-header">
                    <h3 class="client-name">${booking.nombre_cliente}</h3>
                    <div class="booking-actions">
                        ${paymentActionsHTML}
                        ${fichaButtonHTML}
                        <button class="btn-icon btn-edit" title="Editar"><i class="fas fa-pencil-alt"></i></button>
                        <button class="btn-icon btn-delete" title="Eliminar"><i class="fas fa-trash-alt"></i></button>
                    </div>
                </div>
                <div class="booking-body">
                    <p><strong>Servicio:</strong> ${booking.servicio_titulo || 'Servicio eliminado'}</p>
                    <p><strong>Área:</strong> ${booking.nombre_area || 'Área no especificada'}</p>
                    <p><strong>Fecha:</strong> ${formattedDate}</p>
                    <p><strong>Hora:</strong> ${booking.hora_reserva.replace('-', ' a ')}</p>
                </div>
                <div class="booking-footer">
                    <div class="client-contact">
                        <p><i class="fas fa-id-card"></i> ${booking.rut_cliente || 'No ingresado'}</p>
                        <p><i class="fas fa-phone"></i> ${booking.telefono_cliente}</p>
                    </div>
                    <small class="creation-date">Creado: ${formattedCreationDate}</small>
                </div>
            `;
            bookingListContainer.appendChild(bookingCard);
        });
    };

    // --- LÓGICA DEL FORMULARIO DEL MODAL ---

    // Cargar servicios en el select del modal
    const loadServicesIntoSelect = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/servicios`);
            if (!response.ok) throw new Error('No se pudieron cargar los servicios.');
            const services = await response.json();
            serviceSelect.innerHTML = '<option value="" disabled selected>Selecciona un servicio...</option>';
            services.forEach(service => {
                const option = document.createElement('option');
                option.value = service.id_servicio;
                option.textContent = service.titulo;
                option.dataset.area = service.id_area; // Asumiendo que servicio tiene id_area
                serviceSelect.appendChild(option);
            });
        } catch (error) {
            console.error(error);
            serviceSelect.innerHTML = '<option value="">Error al cargar</option>';
        }
    };

    // Verificar disponibilidad de horarios
    const checkAvailability = async () => {
        const date = dateInput.value;
        const selectedOption = serviceSelect.options[serviceSelect.selectedIndex];
        const area = selectedOption ? selectedOption.dataset.area : null;

        if (!date || !area || area === 'undefined' || area === 'null') {
            Array.from(timeSelect.options).forEach(opt => {
                if (opt.value) opt.disabled = true;
                else opt.textContent = "Selecciona servicio y fecha";
            });
            return;
        }

        Array.from(timeSelect.options).forEach(opt => {
            if (opt.value) { opt.disabled = true; opt.textContent = 'Cargando...'; }
        });

        try {
            // Asumiendo que la API de horarios filtra por id_area
            const response = await fetch(`${API_BASE_URL}/api/horarios-ocupados?fecha=${date}&id_area=${area}`);
            if (!response.ok) throw new Error('Error al consultar disponibilidad.');

            const occupiedTimes = await response.json();

            Array.from(timeSelect.options).forEach(opt => {
                if (opt.value) {
                    opt.textContent = opt.value.replace('-', ' a ');
                    const isOccupied = occupiedTimes.includes(opt.value);
                    // Permite seleccionar la hora original si se está editando
                    const isCurrentBookingTime = editingBookingId && timeSelect.dataset.originalTime === opt.value;

                    if (isOccupied && !isCurrentBookingTime) {
                        opt.disabled = true;
                        opt.style.color = '#aaa';
                        opt.textContent += ' (Reservado)';
                    } else {
                        opt.disabled = false;
                        opt.style.color = '';
                    }
                }
            });
        } catch (error) {
            console.error(error);
            Array.from(timeSelect.options).forEach(opt => {
                if (opt.value) opt.textContent = 'Error al verificar';
            });
        }
    };

    // --- MANEJO DE EVENTOS ---

    // Filtro de área cambia
    areaFilter.addEventListener('change', fetchBookings);

    // Inputs del modal cambian (para verificar horarios)
    dateInput.addEventListener('change', checkAvailability);
    serviceSelect.addEventListener('change', checkAvailability);

    // Abrir y cerrar modal
    openModalBtn.addEventListener('click', () => {
        modalTitle.textContent = 'Añadir Nueva Reserva';
        openModal();
    });
    closeModalBtn.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', e => e.target === modalOverlay && closeModal());

    // Enviar formulario (Añadir o Editar)
    bookingForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const selectedOption = serviceSelect.options[serviceSelect.selectedIndex];
        const areaId = selectedOption ? selectedOption.dataset.area : '';
        const servicioId = serviceSelect.value;

        const bookingData = {
            nombre_cliente: nameInput.value,
            rut_cliente: rutInput.value,
            telefono_cliente: phoneInput.value,
            fecha_reserva: dateInput.value,
            hora_reserva: timeSelect.value,
            id_servicio: servicioId,
            id_area: areaId // El backend debe esperar id_area
        };

        const method = editingBookingId ? 'PUT' : 'POST';
        const url = editingBookingId
            ? `${API_BASE_URL}/api/admin/reservas/${editingBookingId}`
            : `${API_BASE_URL}/api/admin/reservas`;

        try {
            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bookingData),
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: 'Error inesperado del servidor.' }));
                throw new Error(errorData.message);
            }
            closeModal();
            fetchBookings(); // Recarga las reservas para el área actual
        } catch (error) {
            alert(`Error: ${error.message}`);
        }
    });

    // Clics en botones de la tarjeta (Editar o Eliminar)
    bookingListContainer.addEventListener('click', (event) => {
        const editButton = event.target.closest('.btn-edit');
        const deleteButton = event.target.closest('.btn-delete');

        // ¡Importante! Si se hizo clic en el botón de pago, no hacer nada aquí
        if (event.target.closest('.btn-pay')) {
            return;
        }

        if (editButton) {
            const bookingCard = editButton.closest('.booking-card');
            const booking = JSON.parse(bookingCard.dataset.booking);
            modalTitle.textContent = 'Editar Reserva';
            editingBookingId = booking.id; // Asumiendo que el ID se llama 'id'

            nameInput.value = booking.nombre_cliente;
            rutInput.value = booking.rut_cliente || '';
            phoneInput.value = booking.telefono_cliente;

            // Formatear fecha para el input type="date"
            const bookingDate = new Date(booking.fecha_reserva).toISOString().split('T')[0];
            dateInput.value = bookingDate;

            // Usar setTimeout para asegurar que loadServicesIntoSelect haya terminado
            setTimeout(() => {
                serviceSelect.value = booking.id_servicio;
                timeSelect.dataset.originalTime = booking.hora_reserva; // Guardar hora original

                // Verificar horarios para la fecha y servicio cargados
                checkAvailability().then(() => {
                    // Una vez verificados, seleccionar la hora original
                    timeSelect.value = booking.hora_reserva;
                });

                openModal(); // Abrir el modal
            }, 100); // Pequeña espera
        }

        if (deleteButton) {
            const bookingCard = deleteButton.closest('.booking-card');
            const booking = JSON.parse(bookingCard.dataset.booking);
            if (confirm(`¿Seguro que quieres eliminar la reserva de ${booking.nombre_cliente}?`)) {
                // Asumiendo que el ID se llama 'id'
                fetch(`${API_BASE_URL}/api/admin/reservas/${booking.id}`, { method: 'DELETE' })
                    .then(res => {
                        if (res.status !== 204 && !res.ok) {
                            return res.json().then(err => { throw new Error(err.message || 'Error desconocido') });
                        }
                        fetchBookings(); // Recarga las reservas
                    })
                    .catch(err => alert(`Error al eliminar: ${err.message}`));
            }
        }
    });

    // --- CARGA INICIAL ---
    loadServicesIntoSelect(); // Carga servicios para el modal
    loadAreasIntoFilter();    // Carga áreas para el filtro
    fetchBookings();          // Carga las reservas iniciales (probablemente "Todas")
});