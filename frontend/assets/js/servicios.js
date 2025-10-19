// Archivo: servicios.js
// Este script carga los servicios desde el servidor y los muestra en la página de servicios para los clientes.

document.addEventListener('DOMContentLoaded', () => {
    // Seleccionamos el contenedor donde se mostrarán las tarjetas de servicios.
    const servicesContainer = document.getElementById('servicios');

    // Función asíncrona para buscar y renderizar los servicios.
    const fetchAndRenderServices = async () => {
        try {
            // Hacemos la petición a la API del backend.
            const response = await fetch('http://localhost:3000/api/servicios');
            if (!response.ok) {
                throw new Error('No se pudo conectar al servidor para obtener los servicios.');
            }
            const services = await response.json();

            // Limpiamos el contenido actual del contenedor (ej. "Cargando...").
            servicesContainer.innerHTML = '';

            // Si no hay servicios, mostramos un mensaje.
            if (services.length === 0) {
                servicesContainer.innerHTML = '<p class="empty-message">No hay servicios disponibles en este momento.</p>';
                return;
            }

            // Recorremos cada servicio y creamos su tarjeta HTML.
            services.forEach((service, index) => {
                const serviceCard = document.createElement('div');
                serviceCard.classList.add('servicio-card');

                // Para alternar el diseño (imagen a la izquierda o derecha), añadimos la clase 'invertido' a las tarjetas pares.
                if (index % 2 !== 0) {
                    serviceCard.classList.add('invertido');
                }
                
                // Usamos una imagen de reemplazo si el servicio no tiene una asignada.
                const imageUrl = service.imagen_url 
                    ? service.imagen_url 
                    : 'https://placehold.co/600x400/EFEFEF/AAAAAA&text=Servicio';

                // Creamos el contenido HTML de la tarjeta.
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

                // Añadimos la tarjeta recién creada al contenedor.
                servicesContainer.appendChild(serviceCard);
            });

        } catch (error) {
            console.error('Error al cargar los servicios:', error);
            servicesContainer.innerHTML = '<p class="error-message">Ocurrió un error al cargar los servicios. Por favor, inténtalo de nuevo más tarde.</p>';
        }
    };

    // Llamamos a la función para que se ejecute al cargar la página.
    fetchAndRenderServices();
});
