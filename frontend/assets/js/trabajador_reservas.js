// --- LÓGICA DE ENTORNO AUTOMÁTICO ---
const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const API_BASE_URL = isLocal
    ? 'http://localhost:3000' // URL para desarrollo local
    : 'https://cosmeticabackend-dqxh.onrender.com'; // URL para producción

document.addEventListener('DOMContentLoaded', () => {
    // 1. Obtener los datos de la sesión
    const token = localStorage.getItem('authToken');
    const userAreaId = localStorage.getItem('userArea'); // ID del área del trabajador (ej: 3, 5)

    // 2. Elementos del DOM
    const bookingList = document.querySelector('.booking-list');
    const loadingPlaceholder = document.getElementById('loading-placeholder');
    const exampleCard = document.querySelector('.booking-card');
    const logoutButton = document.getElementById('logout');

    // 3. Limpiar la página (quitar tarjeta de ejemplo)
    if (exampleCard) {
        exampleCard.remove();
    }

    // 4. Iniciar la carga de datos
    if (token && userAreaId) {
        iniciarCargaDeReservas(token, userAreaId);
    } else {
        console.error('No se encontró token o ID de área. Redirigiendo a login.');
        window.location.href = 'login.html';
    }

    // 5. Botón de cerrar sesión
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

    // Helper: cargar servicios desde la API
    async function cargarServicios(token) {
        const posiblesRutas = ['/api/servicios', '/api/admin/servicios'];
        for (const ruta of posiblesRutas) {
            try {
                const resp = await fetch(`${API_BASE_URL}${ruta}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (resp.ok) {
                    const data = await resp.json();
                    return Array.isArray(data) ? data : (data.data ?? []);
                }
            } catch (e) {
                console.warn(`No se pudo leer ${ruta}:`, e);
            }
        }
        return [];
    }

    try {
        // --- PASO 1: Obtener el nombre del área del trabajador ---
        const areasResponse = await fetch(`${API_BASE_URL}/api/areas`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!areasResponse.ok) throw new Error('Error al obtener la lista de áreas.');

        const areas = await areasResponse.json();
        const miArea = areas.find(a => a.id_area == areaId);

        if (!miArea) throw new Error('No se pudo encontrar el nombre del área para este trabajador.');

        const nombreDeMiArea = miArea.nombre_area; // Ej: "Peluquería"
        console.log(`Trabajador del área: ${nombreDeMiArea} (ID: ${areaId})`);

        // --- PASO 2: Obtener las reservas del área ---
        const reservasResponse = await fetch(`${API_BASE_URL}/api/admin/reservas?area=${encodeURIComponent(nombreDeMiArea)}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        if (reservasResponse.status === 401 || reservasResponse.status === 403) {
            localStorage.removeItem('authToken');
            localStorage.removeItem('userArea');
            alert('Tu sesión ha expirado. Por favor, inicia sesión de nuevo.');
            window.location.href = 'login.html';
            return;
        }

        if (!reservasResponse.ok) throw new Error('Error al cargar las reservas.');

        let reservas = await reservasResponse.json();

        // --- PASO 3: Filtro local por área (por seguridad) ---
        reservas = reservas.filter(r =>
            r.area?.toLowerCase() === nombreDeMiArea.toLowerCase() ||
            r.nombre_area?.toLowerCase() === nombreDeMiArea.toLowerCase() ||
            r.servicio?.area?.toLowerCase() === nombreDeMiArea.toLowerCase()
        );

        // Ordenar reservas por fecha (más próxima primero)
        reservas.sort((a, b) => new Date(a.fecha_reserva) - new Date(b.fecha_reserva));

        // --- PASO 4: Cargar servicios y crear índice ---
        const servicios = await cargarServicios(token);
        const serviciosById = new Map(
            servicios.map(s => [String(s.id ?? s.id_servicio ?? s._id), s])
        );

        console.log({ reservas, servicios });

        // --- PASO 5: Mostrar las reservas ---
        if (loadingPlaceholder) loadingPlaceholder.style.display = 'none';

        if (!Array.isArray(reservas) || reservas.length === 0) {
            bookingList.innerHTML = '<p style="text-align: center;">No tienes reservas programadas por el momento.</p>';
            return;
        }

        bookingList.innerHTML = '';

        reservas.forEach(reserva => {
            const card = document.createElement('div');
            card.className = 'booking-card';
            card.dataset.reserva = JSON.stringify(reserva);

            const fecha = new Date(reserva.fecha_reserva);
            const fechaFormateada = fecha.toLocaleDateString('es-ES', {
                weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
                timeZone: 'UTC'
            });
            const fechaCreacion = new Date(reserva.fecha_creacion).toLocaleDateString('es-ES');

            // Obtener título del servicio (varias opciones)
            const tituloServicio =
                reserva.servicio?.titulo ??
                (typeof reserva.id_servicio === 'object' ? reserva.id_servicio?.titulo : undefined) ??
                serviciosById.get(String(reserva.id_servicio))?.titulo ??
                '(Servicio no encontrado)';

            card.innerHTML = `
                <div class="booking-header">
                    <h3 class="client-name">${reserva.nombre_cliente}</h3>
                </div>
                <div class="booking-body">
                    <p><strong>Servicio:</strong> ${tituloServicio}</p>
                    <p><strong>Fecha:</strong> ${fechaFormateada}</p>
                    <p><strong>Hora:</strong> ${reserva.hora_reserva}</p>
                    <p><strong>Área:</strong> ${nombreDeMiArea}</p>
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
