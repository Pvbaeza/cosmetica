// --- LÓGICA DE ENTORNO AUTOMÁTICO ---
// Detecta si estamos en localhost o en el servidor de Render
const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const API_BASE_URL = isLocal
    ? 'http://localhost:3000' // URL para desarrollo local
    : 'https://cosmeticabackend-dqxh.onrender.com'; // URL para producción

document.addEventListener('DOMContentLoaded', () => {

    // --- SELECCIÓN DE ELEMENTOS DEL DOM ---
    const modalOverlay = document.querySelector('.modal-overlay');
    const modalTitle = document.querySelector('.modal-content h2');
    const openModalBtn = document.querySelector('.actions .btn-primary');
    const closeModalBtn = document.querySelector('.modal-close');
    const servicesListContainer = document.querySelector('.services-list');
    const serviceForm = document.querySelector('.service-form');

    // Inputs del formulario
    const titleInput = document.getElementById('service-title-input');
    const subtitleInput = document.getElementById('service-subtitle-input');
    const staffSelect = document.getElementById('service-staff-input');
    const descriptionInput = document.getElementById('service-description-input');
    const priceInput = document.getElementById('service-price-input');
    const imageInput = document.getElementById('service-image-input');
    const imagePreview = document.getElementById('image-preview');

    let editingServiceId = null;

    // --- FUNCIONES DEL MODAL ---
    const openModal = () => modalOverlay.classList.add('active');
    const closeModal = () => {
        modalOverlay.classList.remove('active');
        serviceForm.reset();
        editingServiceId = null;
        imagePreview.style.display = 'none';
        imagePreview.src = '';
    };

    // --- FUNCIÓN PARA CARGAR ÁREAS EN EL SELECT ---
    const loadAreasIntoSelect = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/areas`);
            if (!response.ok) throw new Error('No se pudieron cargar las áreas.');
            const areas = await response.json();

            staffSelect.innerHTML = '<option value="" disabled selected>Selecciona un área...</option>';

            areas.forEach(area => {
                const option = document.createElement('option');
                option.value = area.nombre_area;
                option.textContent = area.nombre_area;
                staffSelect.appendChild(option);
            });
        } catch (error) {
            console.error('Error al cargar áreas en el select:', error);
            staffSelect.innerHTML = '<option value="">Error al cargar áreas</option>';
        }
    };

    // --- FUNCIÓN PARA RENDERIZAR SERVICIOS ---
    const renderServices = (services) => {
        servicesListContainer.innerHTML = '<h2>Servicios Existentes</h2>';
        if (!services || services.length === 0) {
            servicesListContainer.innerHTML += '<p>No hay servicios registrados.</p>';
            return;
        }

        services.forEach(service => {
            const serviceCard = document.createElement('div');
            serviceCard.className = 'service-card';
            serviceCard.dataset.service = JSON.stringify(service);

            // --- ¡CORRECCIÓN 1 AQUÍ! ---
            // Lógica para decidir qué URL de imagen usar (Cloudinary o local antigua)
            let imageUrl;
            if (service.imagen_url && service.imagen_url.startsWith('http')) {
                // Es una URL absoluta (de Cloudinary)
                imageUrl = service.imagen_url;
            } else if (service.imagen_url) {
                // Es una URL relativa antigua (ej: 'assets/img/...')
                imageUrl = `${API_BASE_URL}/${service.imagen_url}`;
            } else {
                // No hay imagen
                imageUrl = 'https://placehold.co/150x150/EFEFEF/AAAAAA&text=Sin+Imagen';
            }

            serviceCard.innerHTML = `
                <img class="service-image" src="${imageUrl}" alt="Imagen de ${service.titulo}">
                <div class="service-info">
                    <h3 class="service-title">${service.titulo}</h3>
                    <p class="service-subtitle">${service.subtitulo || ''}</p>
                    <p class="service-description">${service.descripcion || ''}</p>
                    <p class="service-price">$${Number(service.valor).toLocaleString('es-CL')}</p>
                    <p class="service-staff"><strong>Área:</strong> ${service.tipo_trabajador || 'No especificado'}</p>
                </div>
                <div class="service-actions">
                    <button class="btn-icon btn-edit" title="Editar"><i class="fas fa-pencil-alt"></i></button>
                    <button class="btn-icon btn-delete" title="Eliminar"><i class="fas fa-trash-alt"></i></button>
                </div>
            `;
            servicesListContainer.appendChild(serviceCard);
        });
    };

    // --- FUNCIÓN PARA OBTENER SERVICIOS ---
    const fetchServices = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/servicios`);
            if (!response.ok) throw new Error('No se pudieron obtener los servicios.');
            const services = await response.json();
            renderServices(services);
        } catch (error) {
            console.error('Error al obtener servicios:', error);
            servicesListContainer.innerHTML = '<h2>Error</h2><p>No se pudieron cargar los servicios.</p>';
        }
    };

    // --- MANEJO DE EVENTOS ---

    openModalBtn.addEventListener('click', () => {
        modalTitle.textContent = 'Añadir Nuevo Servicio';
        openModal();
    });

    closeModalBtn.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', (event) => {
        if (event.target === modalOverlay) closeModal();
    });
    
    imageInput.addEventListener('change', () => {
        const file = imageInput.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                imagePreview.src = e.target.result;
                imagePreview.style.display = 'block';
            };
            reader.readAsDataURL(file);
        }
    });

    serviceForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const formData = new FormData();
        formData.append('titulo', titleInput.value);
        formData.append('subtitulo', subtitleInput.value);
        formData.append('descripcion', descriptionInput.value);
        formData.append('valor', priceInput.value);
        formData.append('tipo_trabajador', staffSelect.value);
        
        if (imageInput.files[0]) {
            formData.append('imagen', imageInput.files[0]);
        }

        const method = editingServiceId ? 'PUT' : 'POST';
        const url = editingServiceId 
            ? `${API_BASE_URL}/api/servicios/${editingServiceId}` 
            : `${API_BASE_URL}/api/servicios`;

        try {
            const response = await fetch(url, { method: method, body: formData });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Error al guardar el servicio');
            }
            closeModal();
            fetchServices();
        } catch (error) {
            alert(`Error: ${error.message}`);
        }
    });

    servicesListContainer.addEventListener('click', async (event) => {
        const editButton = event.target.closest('.btn-edit');
        const deleteButton = event.target.closest('.btn-delete');
        
        if (editButton) {
            const serviceCard = editButton.closest('.service-card');
            const service = JSON.parse(serviceCard.dataset.service);
            
            modalTitle.textContent = 'Editar Servicio';
            editingServiceId = service.id_servicio;
            
            titleInput.value = service.titulo;
            subtitleInput.value = service.subtitulo || '';
            descriptionInput.value = service.descripcion || '';
            priceInput.value = service.valor;
            staffSelect.value = service.tipo_trabajador || '';

            // --- ¡CORRECCIÓN 2 AQUÍ! ---
            // Lógica para mostrar la imagen correcta en la vista previa de edición
            if (service.imagen_url) {
                let imageUrl;
                if (service.imagen_url.startsWith('http')) {
                    // Es una URL absoluta (de Cloudinary)
                    imageUrl = service.imagen_url;
                } else {
                    // Es una URL relativa antigua
                    imageUrl = `${API_BASE_URL}/${service.imagen_url}`;
                }
                imagePreview.src = imageUrl;
                imagePreview.style.display = 'block';
            } else {
                imagePreview.src = '';
                imagePreview.style.display = 'none';
            }
            openModal();
        }

        if (deleteButton) {
            const serviceCard = deleteButton.closest('.service-card');
            const service = JSON.parse(serviceCard.dataset.service);
            
            if (confirm(`¿Estás seguro de que quieres eliminar "${service.titulo}"?`)) {
                try {
                    const response = await fetch(`${API_BASE_URL}/api/servicios/${service.id_servicio}`, { method: 'DELETE' });
                    if (!response.ok) {
                       const errorData = await response.json();
                       throw new Error(errorData.message || 'Error al eliminar');
                    }
                    fetchServices();
                } catch (error) {
                    alert(`Error: ${error.message}`);
                }
            }
        }
    });

    // --- CARGA INICIAL DE DATOS ---
    fetchServices();
    loadAreasIntoSelect();
});
