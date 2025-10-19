// Archivo: admin_reservas.js

document.addEventListener('DOMContentLoaded', () => {
    // --- URL BASE DE LA API ---
    const API_BASE_URL = 'http://localhost:3000';

    // --- SELECCIÓN DE ELEMENTOS DEL DOM ---
    const modalOverlay = document.querySelector('.modal-overlay');
    const modalTitle = document.querySelector('.modal-content h2');
    const openModalBtn = document.querySelector('.btn-open-modal');
    const closeModalBtn = document.querySelector('.modal-close');
    const bookingListContainer = document.querySelector('.booking-list');
    const bookingForm = document.querySelector('.booking-form');
    const areaFilter = document.getElementById('area-filter'); // El filtro de área

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
        // Resetea el select de horas a su estado original
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
            
            // Limpiamos opciones viejas (excepto la primera de "Todas") y añadimos las nuevas
            areaFilter.innerHTML = '<option value="todos">Todas las Áreas</option>';
            areas.forEach(area => {
                const option = document.createElement('option');
                option.value = area.nombre_area; // Usamos el nombre del área como valor para el filtro
                option.textContent = area.nombre_area;
                areaFilter.appendChild(option);
            });
        } catch (error) {
            console.error('Error cargando áreas para el filtro:', error);
            // Si falla, el filtro se quedará con la opción "Todas las Áreas"
        }
    };

    // --- FUNCIÓN PARA OBTENER Y MOSTRAR LAS RESERVAS (YA FILTRADAS DESDE EL BACKEND) ---
    const fetchBookings = async () => {
        const selectedArea = areaFilter.value; // Obtenemos el valor actual del filtro
        try {
            // Construimos la URL con el filtro como parámetro de consulta
            const url = `${API_BASE_URL}/api/admin/reservas?area=${selectedArea}`;
            const response = await fetch(url);
            if (!response.ok) throw new Error('No se pudieron obtener las reservas.');
            
            const bookings = await response.json();
            renderBookings(bookings);
        } catch (error) {
            console.error(error);
            bookingListContainer.innerHTML = '<h2>Error</h2><p>No se pudieron cargar las reservas.</p>';
        }
    };

    // --- FUNCIÓN PARA RENDERIZAR LAS TARJETAS DE RESERVA ---
    const renderBookings = (bookings) => {
        bookingListContainer.innerHTML = '<h2>Reservas Programadas</h2>'; // Limpia y resetea el título
        if (!bookings || bookings.length === 0) {
            bookingListContainer.innerHTML += '<p>No hay reservas programadas para el área seleccionada.</p>';
            return;
        }
        bookings.forEach(booking => {
            const bookingCard = document.createElement('div');
            bookingCard.className = 'booking-card';
            // Guardamos todos los datos de la reserva en el dataset para usarlos al editar
            bookingCard.dataset.booking = JSON.stringify(booking);

            const bookingDate = new Date(booking.fecha_reserva);
            const formattedDate = bookingDate.toLocaleDateString('es-CL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
            
            const creationDate = new Date(booking.fecha_creacion);
            const formattedCreationDate = creationDate.toLocaleDateString('es-CL');
            
            bookingCard.innerHTML = `
                <div class="booking-header">
                    <h3 class="client-name">${booking.nombre_cliente}</h3>
                    <div class="booking-actions">
                        <button class="btn-icon btn-edit" title="Editar"><i class="fas fa-pencil-alt"></i></button>
                        <button class="btn-icon btn-delete" title="Eliminar"><i class="fas fa-trash-alt"></i></button>
                    </div>
                </div>
                <div class="booking-body">
                    <p><strong>Servicio:</strong> ${booking.servicio}</p>
                    <p><strong>Área:</strong> ${booking.area_servicio || 'No especificada'}</p>
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

    const loadServicesIntoSelect = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/servicios`);
            if (!response.ok) throw new Error('No se pudieron cargar los servicios.');
            const services = await response.json();
            serviceSelect.innerHTML = '<option value="" disabled selected>Selecciona un servicio...</option>';
            services.forEach(service => {
                const option = document.createElement('option');
                option.value = service.titulo;
                option.textContent = service.titulo;
                option.dataset.area = service.tipo_trabajador; // Guardamos el área en el dataset
                serviceSelect.appendChild(option);
            });
        } catch (error) {
            console.error(error);
            serviceSelect.innerHTML = '<option value="">Error al cargar</option>';
        }
    };
    
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
            const response = await fetch(`${API_BASE_URL}/api/horarios-ocupados?fecha=${date}&area=${area}`);
            if (!response.ok) throw new Error('Error al consultar disponibilidad.');
            
            const occupiedTimes = await response.json();
            
            Array.from(timeSelect.options).forEach(opt => {
                if (opt.value) {
                    opt.textContent = opt.value.replace('-', ' a ');
                    const isOccupied = occupiedTimes.includes(opt.value);
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

    // Evento para el filtro de área
    areaFilter.addEventListener('change', fetchBookings);

    // Eventos para el modal
    dateInput.addEventListener('change', checkAvailability);
    serviceSelect.addEventListener('change', checkAvailability);
    openModalBtn.addEventListener('click', () => {
        modalTitle.textContent = 'Añadir Nueva Reserva';
        openModal();
    });
    closeModalBtn.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', e => e.target === modalOverlay && closeModal());

    // Evento para enviar el formulario (Crear o Editar)
    bookingForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const selectedOption = serviceSelect.options[serviceSelect.selectedIndex];
        const areaServicio = selectedOption ? selectedOption.dataset.area : '';
        const bookingData = {
            nombre_cliente: nameInput.value,
            rut_cliente: rutInput.value,
            telefono_cliente: phoneInput.value,
            servicio: serviceSelect.value,
            fecha_reserva: dateInput.value,
            hora_reserva: timeSelect.value,
            area_servicio: areaServicio
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
                const errorData = await response.json().catch(() => ({ message: 'El servidor respondió con un error inesperado.' }));
                throw new Error(errorData.message);
            }
            closeModal();
            fetchBookings(); // Recarga las reservas (respetando el filtro actual)
        } catch (error) {
            alert(`Error: ${error.message}`);
        }
    });

    // Delegación de eventos para los botones de Editar y Eliminar en las tarjetas
    bookingListContainer.addEventListener('click', (event) => {
        const editButton = event.target.closest('.btn-edit');
        const deleteButton = event.target.closest('.btn-delete');
        
        if (editButton) {
            const bookingCard = editButton.closest('.booking-card');
            const booking = JSON.parse(bookingCard.dataset.booking);
            modalTitle.textContent = 'Editar Reserva';
            editingBookingId = booking.id;

            nameInput.value = booking.nombre_cliente;
            rutInput.value = booking.rut_cliente || '';
            phoneInput.value = booking.telefono_cliente;
            
            const bookingDate = new Date(booking.fecha_reserva).toISOString().split('T')[0];
            dateInput.value = bookingDate;
            
            setTimeout(() => {
                serviceSelect.value = booking.servicio;
                timeSelect.dataset.originalTime = booking.hora_reserva;
                checkAvailability().then(() => {
                    timeSelect.value = booking.hora_reserva;
                });
                openModal();
            }, 100);
        }

        if (deleteButton) {
            const bookingCard = deleteButton.closest('.booking-card');
            const booking = JSON.parse(bookingCard.dataset.booking);
            if (confirm(`¿Seguro que quieres eliminar la reserva de ${booking.nombre_cliente}?`)) {
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

    // --- CARGA INICIAL DE DATOS AL ABRIR LA PÁGINA ---
    loadServicesIntoSelect();
    loadAreasIntoFilter();
    fetchBookings();
});
