// Archivo: assets/js/productos.js

document.addEventListener('DOMContentLoaded', () => {
    const catalogoProductos = document.getElementById('catalogo-productos');

    // Función para obtener los productos de la API y mostrarlos
    async function cargarProductos() {
        try {
            const respuesta = await fetch('http://localhost:3000/api/productos');
            if (!respuesta.ok) {
                throw new Error('La respuesta de la red no fue satisfactoria.');
            }
            const productos = await respuesta.json();
            mostrarProductosEnCatalogo(productos);
        } catch (error) {
            console.error('Error al cargar los productos:', error);
            if (catalogoProductos) { // Check if element exists
                catalogoProductos.innerHTML = '<p>No se pudieron cargar los productos en este momento.</p>';
            } else {
                console.error("Elemento 'catalogo-productos' no encontrado.");
            }
        }
    }

    // Función para construir el HTML de cada producto y mostrarlo
    function mostrarProductosEnCatalogo(productos) {
        if (!catalogoProductos) { // Check if element exists
            console.error("Elemento 'catalogo-productos' no encontrado para mostrar productos.");
            return;
        }
        catalogoProductos.innerHTML = ''; // Limpiar catálogo
        if (!productos || productos.length === 0) {
            catalogoProductos.innerHTML = '<p>No hay productos disponibles por el momento.</p>';
            return;
        }

        productos.forEach(producto => {
            // *** FORMATEAR PRECIO A PESO CHILENO ***
            const valorNumerico = Number(producto.valor || 0); // Asegura que sea número
            const precioFormateado = valorNumerico.toLocaleString('es-CL', {
                style: 'currency',
                currency: 'CLP'
                // Puedes añadir , minimumFractionDigits: 0, maximumFractionDigits: 0 si no quieres decimales
            });
            // *** FIN FORMATEO ***

            // Asegurar que la imagen tenga URL completa
            const imageUrl = producto.imagen_url ? `http://localhost:3000/${producto.imagen_url}` : 'https://via.placeholder.com/300x200?text=Sin+Imagen'; // Placeholder por defecto

            const productoCardHTML = `
                <div class="producto-card">
                    <img src="${imageUrl}" alt="Imagen de ${producto.nombre || 'Producto'}">
                    <h3>${producto.nombre || 'Producto sin nombre'}</h3>
                    <p>${producto.descripcion || 'Sin descripción'}</p>
                    <p class="product-price">${precioFormateado}</p>
                    <button class="btn-contactar">Contactar</button>
                </div>
            `;
            catalogoProductos.insertAdjacentHTML('beforeend', productoCardHTML);
        });
    }

    // Iniciar la carga de productos cuando la página esté lista
    cargarProductos();
});