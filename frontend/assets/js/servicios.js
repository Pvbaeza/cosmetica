// --- LÓGICA DE ENTORNO AUTOMÁTICO ---
// Detecta si estamos en localhost o en el servidor de Render
const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const API_BASE_URL = isLocal 
    ? 'http://localhost:3000' // URL para desarrollo local
    : 'https://cosmeticabackend-dqxh.onrender.com'; // URL para producción

document.addEventListener('DOMContentLoaded', () => {
    const servicesContainer = document.getElementById('servicios');

    const fetchAndRenderServices = async () => {
        try {
            // Hacemos la petición a la API del backend usando la URL base correcta.
            const response = await fetch(`${API_BASE_URL}/api/servicios`);
            if (!response.ok) {
                throw new Error('No se pudo conectar al servidor para obtener los servicios.');
            }
            const services = await response.json();

            servicesContainer.innerHTML = '';

            if (services.length === 0) {
                servicesContainer.innerHTML = '<p class="empty-message">No hay servicios disponibles en este momento.</p>';
                return;
            }

            services.forEach((service, index) => {
                const serviceCard = document.createElement('div');
                serviceCard.classList.add('servicio-card');

                if (index % 2 !== 0) {
                    serviceCard.classList.add('invertido');
                }
                
                // Usamos API_BASE_URL para construir la URL completa de la imagen.
                const imageUrl = service.imagen_url 
                    ? `${API_BASE_URL}/${service.imagen_url}`
                    : 'https://placehold.co/600x400/EFEFEF/AAAAAA?text=Servicio';

                serviceCard.innerHTML = `
                    <div class="servicio-img">
                        <img src="${imageUrl}" alt="Imagen de ${service.titulo}">
                    </div>
                    <div class="servicio-info">
                        <h2 class="servicio-titulo">${service.titulo}</h2>
                        <h4 class="servicio-subtitulo">${service.subtitulo || ''}</h4>
                        <p>${service.descripcion || 'Descripción no disponible.'}</p>
                        <a href="reserva.html" class="btn-reservar">Reservar por $${Number(service.valor).toLocaleString('es-CL')}</a>
                    </div>
                `;

                servicesContainer.appendChild(serviceCard);
            });

        } catch (error) {
            console.error('Error al cargar los servicios:', error);
            servicesContainer.innerHTML = '<p class="error-message">Ocurrió un error al cargar los servicios. Por favor, inténtalo de nuevo más tarde.</p>';
        }
    };

    fetchAndRenderServices();
});

