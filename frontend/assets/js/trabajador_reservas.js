// --- LÓGICA DE ENTORNO AUTOMÁTICO ---
// (Copiado de tu login.js para consistencia)
const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const API_BASE_URL = isLocal 
    ? 'http://localhost:3000' // URL para desarrollo local
    : 'https://cosmeticabackend-dqxh.onrender.com'; // URL para producción

document.addEventListener('DOMContentLoaded', () => {
    // 1. Obtener los datos de la sesión
    const token = localStorage.getItem('authToken');
    const userAreaId = localStorage.getItem('userArea'); // Este es el ID (ej: 3, 5)

    // 2. Elementos del DOM
    const bookingList = document.querySelector('.booking-list');
    const loadingPlaceholder = document.getElementById('loading-placeholder');
    const exampleCard = document.querySelector('.booking-card'); // La tarjeta de ejemplo
    const logoutButton = document.getElementById('logout');

    // 3. Limpiar la página (quitar tarjeta de ejemplo)
    if (exampleCard) {
        exampleCard.remove();
    }

    // 4. Iniciar la carga de datos
    if (token && userAreaId) {
        iniciarCargaDeReservas(token, userAreaId);
    } else {
        // Esto no debería pasar si el worker-guard.js funciona, pero es una buena práctica
        console.error('No se encontró token o ID de área. Redirigiendo a login.');
        window.location.href = 'login.html';
    }

    // 5. Configurar el botón de Cerrar Sesión
    if (logoutButton) {
        logoutButton.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('authToken');
            localStorage.removeItem('userArea');
            window.location.href = 'login.html';
        });
    }
});

async function iniciarCargaDeReservas(token, areaId) {
    const bookingList = document.querySelector('.booking-list');
    const loadingPlaceholder = document.getElementById('loading-placeholder');

    try {
        // --- PASO 1: Obtener el NOMBRE de nuestra área usando nuestro ID ---
        const areasResponse = await fetch(`${API_BASE_URL}/api/areas`, {
            headers: { 'Authorization': `Bearer ${token}` } // (Buena práctica enviar el token)
        });

        if (!areasResponse.ok) throw new Error('Error al obtener la lista de áreas.');
        
        const areas = await areasResponse.json();
        
        // Buscamos nuestra área en la lista (comparamos con '==' por si uno es string y el otro número)
        const miArea = areas.find(a => a.id_area == areaId);

        if (!miArea) {
            throw new Error('No se pudo encontrar el nombre del área para este trabajador.');
        }

        const nombreDeMiArea = miArea.nombre_area; // Ej: "Peluqueria"
        console.log(`Trabajador del área: ${nombreDeMiArea} (ID: ${areaId})`);


        // --- PASO 2: Pedir las reservas usando el NOMBRE del área ---
        // Reutilizamos la ruta del admin, pero filtrando por nuestra área
        const reservasResponse = await fetch(`${API_BASE_URL}/api/admin/reservas?area=${nombreDeMiArea}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` // (Buena práctica)
            }
        });

        // Manejo de sesión expirada (si el token es inválido)
        if (reservasResponse.status === 401 || reservasResponse.status === 403) {
            localStorage.removeItem('authToken');
            localStorage.removeItem('userArea');
            alert('Tu sesión ha expirado. Por favor, inicia sesión de nuevo.');
            window.location.href = 'login.html';
            return;
        }

        if (!reservasResponse.ok) {
            throw new Error('Error al cargar las reservas.');
        }

        const reservas = await reservasResponse.json();

        // --- PASO 3: Mostrar las reservas en la página ---
        if (loadingPlaceholder) {
            loadingPlaceholder.style.display = 'none'; // Ocultar "Cargando..."
        }

        if (reservas.length === 0) {
            bookingList.innerHTML = '<p style="text-align: center;">No tienes reservas programadas por el momento.</p>';
            return;
        }

        // Limpiar lista por si acaso
        bookingList.innerHTML = ''; 

        // Renderizar cada tarjeta de reserva
        reservas.forEach(reserva => {
            const card = document.createElement('div');
            card.className = 'booking-card';
            
            // Guardamos todos los datos de la reserva en el 'dataset'
            // (Esto es lo que hacía tu tarjeta de ejemplo y es útil para el modal)
            card.dataset.reserva = JSON.stringify(reserva); 

            // Formatear la fecha para que sea legible
            const fecha = new Date(reserva.fecha_reserva);
            const fechaFormateada = fecha.toLocaleDateString('es-ES', {
                weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
                timeZone: 'UTC' // Importante para evitar desfase de un día
            });
            
            const fechaCreacion = new Date(reserva.fecha_creacion).toLocaleDateString('es-ES');

            card.innerHTML = `
                <div class="booking-header">
                    <h3 class="client-name">${reserva.nombre_cliente}</h3>
                </div>
                <div class="booking-body">
                    <p><strong>Servicio:</strong> ${reserva.servicio}</p>
                    <p><strong>Fecha:</strong> ${fechaFormateada}</p>
                    <p><strong>Hora:</strong> ${reserva.hora_reserva}</p>
                </div>
                <div class="booking-footer">
                    <div class="client-contact">
                        <p><i class="fas fa-id-card"></i> ${reserva.rut_cliente || 'No ingresado'}</p>
                        <p><i class="fas fa-phone"></i> ${reserva.telefono_cliente || 'No ingresado'}</p>
                    </div>
                    <small class="creation-date">Registrado: ${fechaCreacion}</small>
                </div>
            `;
            bookingList.appendChild(card);
        });

    } catch (error) {
        console.error('Error al iniciar la página:', error);
        if (loadingPlaceholder) {
            loadingPlaceholder.innerHTML = `<p style="color: red; text-align: center;">${error.message}</p>`;
        }
    }
}