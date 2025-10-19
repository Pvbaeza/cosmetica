// --- SECCIÓN 1: Lógica para MOSTRAR las reseñas al cargar la página ---

// Función que pide las reseñas al servidor y las dibuja en el HTML
async function cargarResenas() {
    try {
        // 1. Pedimos las reseñas a la ruta GET que creamos en el servidor
        const respuesta = await fetch('http://localhost:3000/api/resenas');
        
        if (!respuesta.ok) {
            console.error("No se pudieron cargar las reseñas.");
            return;
        }

        const resenas = await respuesta.json();
        const reviewsList = document.getElementById('reviews-list');
        
        // 2. ¡CLAVE! Borramos el contenido de ejemplo del HTML
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
            content.textContent = `"${resena.Comentario}"`; // Asegúrate que la columna se llame "Comentario"

            const author = document.createElement('h3');
            author.className = 'review-author';
            author.textContent = `- ${resena.nombre}`; // Asegúrate que la columna se llame "nombre"

            article.appendChild(content);
            article.appendChild(author);
            reviewsList.appendChild(article);
        });

    } catch (error) {
        console.error('Error al cargar las reseñas:', error);
    }
}


// --- SECCIÓN 2: Lógica para ENVIAR una nueva reseña desde el formulario ---

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
                const respuesta = await fetch('http://localhost:3000/api/resenas', {
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

