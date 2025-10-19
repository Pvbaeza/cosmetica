// --- LÓGICA DE ENTORNO AUTOMÁTICO ---
// Detecta si estamos en localhost o en el servidor de Render
const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const API_BASE_URL = isLocal 
    ? 'http://localhost:3000' // URL para desarrollo local
    : 'https://cosmetica-cvsi.onrender.com'; // URL para producción

// Función que pide las reseñas al servidor y las dibuja en el HTML
async function cargarResenas() {
    try {
        // 1. Pedimos las reseñas a la ruta GET usando la URL base correcta
        const respuesta = await fetch(`${API_BASE_URL}/api/resenas`);
        
        if (!respuesta.ok) {
            console.error("No se pudieron cargar las reseñas.");
            return;
        }

        const resenas = await respuesta.json();
        const reviewsList = document.getElementById('reviews-list');
        
        // 2. Borramos el contenido de ejemplo del HTML
        reviewsList.innerHTML = '';

        // Si no hay reseñas, mostramos un mensaje
        if (resenas.length === 0) {
            reviewsList.innerHTML = '<p>Aún no hay reseñas. ¡Sé el primero en dejar una!</p>';
            return;
        }

        // 3. Por cada reseña recibida, creamos su HTML y lo añadimos a la lista
        resenas.forEach(resena => {
            const article = document.createElement('article');
            article.className = 'review-card';

            const content = document.createElement('p');
            content.className = 'review-content';
            content.textContent = `"${resena.Comentario}"`;

            const author = document.createElement('h3');
            author.className = 'review-author';
            author.textContent = `- ${resena.nombre}`;

            article.appendChild(content);
            article.appendChild(author);
            reviewsList.appendChild(article);
        });

    } catch (error) {
        console.error('Error al cargar las reseñas:', error);
    }
}


document.addEventListener('DOMContentLoaded', () => {
    
    // 4. Apenas cargue la página, llamamos a la función para mostrar las reseñas
    cargarResenas();

    const reviewForm = document.getElementById('review-form');

    if (reviewForm) {
        reviewForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            const nombre = document.getElementById('review-name').value;
            const comentario = document.getElementById('review-comment').value;
            const calificacion = document.getElementById('review-rating').value;

            const datosResena = {
                nombre: nombre,
                comentario: comentario,
                calificacion: parseInt(calificacion)
            };

            try {
                const respuesta = await fetch(`${API_BASE_URL}/api/resenas`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(datosResena)
                });

                const resultado = await respuesta.json();

                if (respuesta.ok) {
                    alert(resultado.message);
                    reviewForm.reset(); 
                    // 5. Tras enviar una reseña, volvemos a cargar la lista para que se vea la nueva
                    cargarResenas(); 
                } else {
                    alert('Error: ' + resultado.message);
                }

            } catch (error) {
                console.error('Error al conectar con el servidor:', error);
                alert('No se pudo enviar la reseña. Por favor, intenta más tarde.');
            }
        });
    }
});
