// --- LÓGICA DE ENTORNO AUTOMÁTICO ---
// Detecta si estamos en localhost o en el servidor de Render
const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const API_BASE_URL = isLocal 
    ? 'http://localhost:3000' // URL para desarrollo local
    : 'https://cosmeticabackend-dqxh.onrender.com'; // URL para producción

document.addEventListener('DOMContentLoaded', () => {
    const unpublishedList = document.getElementById('unpublished-reviews-list');
    const publishedList = document.getElementById('published-reviews-list');

    // --- FUNCIÓN PRINCIPAL PARA CARGAR LAS RESEÑAS ---
    async function cargarResenas() {
        try {
            const response = await fetch(`${API_BASE_URL}/api/admin/resenas`);
            if (!response.ok) {
                throw new Error('No se pudieron cargar las reseñas.');
            }
            const resenas = await response.json();

            unpublishedList.innerHTML = '';
            publishedList.innerHTML = '';

            const unpublishedCount = resenas.filter(r => !r.estado_aprobacion).length;
            const publishedCount = resenas.length - unpublishedCount;

            if (unpublishedCount === 0) {
                unpublishedList.innerHTML = '<p>No hay reseñas pendientes.</p>';
            }
            if (publishedCount === 0) {
                publishedList.innerHTML = '<p>No hay reseñas publicadas.</p>';
            }
            
            resenas.forEach(resena => {
                const reviewCard = crearTarjetaResena(resena);
                if (resena.estado_aprobacion) {
                    publishedList.appendChild(reviewCard);
                } else {
                    unpublishedList.appendChild(reviewCard);
                }
            });

        } catch (error) {
            console.error('Error al cargar reseñas:', error);
            unpublishedList.innerHTML = '<p>Error al cargar las reseñas.</p>';
            publishedList.innerHTML = '<p>Error al cargar las reseñas.</p>';
        }
    }

    // --- FUNCIÓN PARA CREAR EL HTML DE UNA TARJETA DE RESEÑA ---
    function crearTarjetaResena(resena) {
        const div = document.createElement('div');
        div.className = 'review-card';
        div.dataset.id = resena.id_resena;

        const botonPublicarTexto = resena.estado_aprobacion ? 'Ocultar' : 'Aprobar';
        const nuevoEstado = !resena.estado_aprobacion;

        div.innerHTML = `
            <p><strong>${resena.nombre}:</strong> ${resena.Comentario}</p>
            <div class="review-actions">
                <button class="btn-publicar" data-nuevo-estado="${nuevoEstado}">${botonPublicarTexto}</button>
                <button class="btn-eliminar">Eliminar</button>
            </div>
        `;

        const btnPublicar = div.querySelector('.btn-publicar');
        btnPublicar.addEventListener('click', () => actualizarEstado(resena.id_resena, nuevoEstado));

        const btnEliminar = div.querySelector('.btn-eliminar');
        btnEliminar.addEventListener('click', () => eliminarResena(resena.id_resena));
        
        return div;
    }

    // --- FUNCIÓN PARA ACTUALIZAR EL ESTADO (APROBAR/OCULTAR) ---
    async function actualizarEstado(id, nuevoEstado) {
        try {
            const response = await fetch(`${API_BASE_URL}/api/admin/resenas/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ estado: nuevoEstado }),
            });

            if (!response.ok) {
                throw new Error('No se pudo actualizar la reseña.');
            }
            
            cargarResenas(); 

        } catch (error) {
            console.error('Error al actualizar:', error);
            alert('No se pudo actualizar la reseña.');
        }
    }

    // --- FUNCIÓN PARA ELIMINAR UNA RESEÑA ---
    async function eliminarResena(id) {
        if (!confirm('¿Estás seguro de que quieres eliminar esta reseña permanentemente?')) {
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/admin/resenas/${id}`, {
                method: 'DELETE',
            });
            
            if (!response.ok) {
                throw new Error('No se pudo eliminar la reseña.');
            }

            cargarResenas();

        } catch (error) {
            console.error('Error al eliminar:', error);
            alert('No se pudo eliminar la reseña.');
        }
    }

    // --- Carga inicial de las reseñas al entrar a la página ---
    cargarResenas();
});

