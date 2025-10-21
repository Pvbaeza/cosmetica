// --- LÓGICA DE ENTORNO AUTOMÁTICO ---
// Detecta si estamos en localhost o en el servidor de Render
const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
// (Espacio falso corregido en la línea de abajo)
const API_BASE_URL = isLocal
    ? 'http://localhost:3000' // URL local
    : 'https://cosmeticabackend-dqxh.onrender.com'; // URL producción

document.addEventListener('DOMContentLoaded', () => {

    // --- ELEMENTOS DEL DOM ---
    const servicesContainer = document.getElementById('servicios');
    const areaFilterSelect = document.getElementById('area-filter'); // Select de área
    const searchInput = document.getElementById('search-input'); // Input de búsqueda
    const loadingMessage = document.querySelector('.loading-message'); // Mensaje "Cargando..."

    let allServices = []; // Guardaremos todos los servicios aquí

    // --- FUNCIÓN PARA MOSTRAR SERVICIOS (RENDERIZAR) ---
    const renderServices = (servicesToRender) => {
        // Asegúrate que el contenedor existe
        if (!servicesContainer) {
            console.error("Contenedor 'servicios' no encontrado.");
            return;
        }
        servicesContainer.innerHTML = ''; // Limpiar contenedor

        if (!servicesToRender || servicesToRender.length === 0) {
            servicesContainer.innerHTML = '<p class="empty-message">No se encontraron servicios que coincidan con los filtros.</p>';
            return;
        }

        servicesToRender.forEach((service, index) => {
            const serviceCard = document.createElement('div');
            serviceCard.classList.add('servicio-card');

            // --- ¡CORRECCIÓN DE URL DE CLOUDINARY APLICADA! ---
            let imageUrl;
            if (service.imagen_url && service.imagen_url.startsWith('http')) {
                // Es una URL absoluta (de Cloudinary)
                imageUrl = service.imagen_url;
            } else if (service.imagen_url) {
                // Es una URL relativa antigua (ej: 'assets/img/...')
                imageUrl = `${API_BASE_URL}/${service.imagen_url}`;
            } else {
                // No hay imagen
                imageUrl = 'https://via.placeholder.com/400x225?text=Servicio'; // Placeholder
            }
            
            // Formatear precio a CLP
            const valorNumerico = Number(service.valor || 0);
            const precioFormateado = valorNumerico.toLocaleString('es-CL', { style: 'currency', currency: 'CLP' });

            // Usamos encodeURIComponent por si el título tiene espacios o caracteres especiales
            const reservaUrl = `reserva.html?servicio=${encodeURIComponent(service.titulo || '')}`;

            serviceCard.innerHTML = `
                <div class="servicio-img">
                    <img src="${imageUrl}" alt="Imagen de ${service.titulo || 'Servicio'}">
                </div>
                <div class="servicio-info">
                    <h2 class="servicio-titulo">${service.titulo || 'Servicio sin título'}</h2>
                    <h4 class="servicio-subtitulo">${service.subtitulo || ''}</h4>
                    <p>${service.descripcion || 'Descripción no disponible.'}</p>
                    <a href="${reservaUrl}" class="btn-reservar">Reservar por ${precioFormateado}</a>
                </div>
            `;
            servicesContainer.appendChild(serviceCard);
        });
    };

    // --- FUNCIÓN PARA POBLAR EL FILTRO DE ÁREAS ---
    const populateAreaFilter = (services) => {
         if (!areaFilterSelect) return;
         const areas = new Set();
         services.forEach(service => {
             if (service.tipo_trabajador && service.tipo_trabajador.toLowerCase() !== 'admin') {
                 areas.add(service.tipo_trabajador);
             }
         });
         areaFilterSelect.innerHTML = '<option value="todos">Mostrar Todas</option>';
         const sortedAreas = [...areas].sort((a, b) => a.localeCompare(b));
         sortedAreas.forEach(area => {
             const option = document.createElement('option');
             option.value = area;
             option.textContent = area;
             areaFilterSelect.appendChild(option);
         });
    };

    // --- FUNCIÓN PARA FILTRAR SERVICIOS (POR ÁREA Y BÚSQUEDA) ---
    const filterServices = () => {
        const selectedArea = areaFilterSelect ? areaFilterSelect.value : 'todos';
        const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';

        console.log("Filtrando - Área:", selectedArea, "Búsqueda:", searchTerm);

        let filteredServices = allServices;

        // Filtrar por Área
        if (selectedArea !== 'todos') {
            filteredServices = filteredServices.filter(service =>
                service.tipo_trabajador && service.tipo_trabajador.toLowerCase() === selectedArea.toLowerCase()
            );
        } else {
             filteredServices = filteredServices.filter(service => service.tipo_trabajador?.toLowerCase() !== 'admin');
        }

        // Filtrar por Búsqueda
        if (searchTerm) {
            filteredServices = filteredServices.filter(service =>
                (service.titulo && service.titulo.toLowerCase().includes(searchTerm)) ||
                (service.descripcion && service.descripcion.toLowerCase().includes(searchTerm)) ||
                (service.subtitulo && service.subtitulo.toLowerCase().includes(searchTerm))
            );
        }

        renderServices(filteredServices);
    };

    // --- FUNCIÓN PRINCIPAL PARA CARGAR DATOS Y CONFIGURAR EVENTOS ---
    const fetchAndSetupServices = async () => {
        try {
            if (loadingMessage) loadingMessage.style.display = 'block';
            if (servicesContainer) servicesContainer.innerHTML = '';

            const response = await fetch(`${API_BASE_URL}/api/servicios`);
            if (!response.ok) throw new Error('No se pudo conectar al servidor.');
            allServices = await response.json();

            if (loadingMessage) loadingMessage.style.display = 'none';

            populateAreaFilter(allServices);
            filterServices();

            // Añadir listeners
            if (areaFilterSelect) areaFilterSelect.addEventListener('change', filterServices);
            if (searchInput) searchInput.addEventListener('input', filterServices);

        } catch (error) {
            console.error('Error al cargar los servicios:', error);
            if (loadingMessage) loadingMessage.style.display = 'none';
            if (servicesContainer) {
                 servicesContainer.innerHTML = `<p class="error-message">Ocurrió un error: ${error.message}. Inténtalo más tarde.</p>`;
            }
        }
    };

    // --- INICIAR CARGA ---
    fetchAndSetupServices();

}); // Fin DOMContentLoaded
