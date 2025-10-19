// --- LÓGICA DE ENTORNO AUTOMÁTICO ---
// Detecta si estamos en localhost o en el servidor de Render
const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const API_BASE_URL = isLocal 
    ? 'http://localhost:3000' // URL para desarrollo local
    : 'https://cosmeticabackend-dqxh.onrender.com'; // URL para producción

document.addEventListener('DOMContentLoaded', () => {
    const catalogoProductos = document.getElementById('catalogo-productos');

    // Función para obtener los productos de la API y mostrarlos
    async function cargarProductos() {
        try {
            const respuesta = await fetch(`${API_BASE_URL}/api/productos`);
            if (!respuesta.ok) {
                throw new Error('La respuesta de la red no fue satisfactoria.');
            }
            const productos = await respuesta.json();
            mostrarProductosEnCatalogo(productos);
        } catch (error) {
            console.error('Error al cargar los productos:', error);
            if (catalogoProductos) {
                catalogoProductos.innerHTML = '<p>No se pudieron cargar los productos en este momento.</p>';
            }
        }
    }

    // Función para construir el HTML de cada producto y mostrarlo
    function mostrarProductosEnCatalogo(productos) {
        if (!catalogoProductos) {
            return;
        }
        catalogoProductos.innerHTML = ''; // Limpiar catálogo
        if (!productos || productos.length === 0) {
            catalogoProductos.innerHTML = '<p>No hay productos disponibles por el momento.</p>';
            return;
        }

        productos.forEach(producto => {
            const valorNumerico = Number(producto.valor || 0);
            const precioFormateado = valorNumerico.toLocaleString('es-CL', {
                style: 'currency',
                currency: 'CLP'
            });

            // Usamos API_BASE_URL para construir la URL completa de la imagen
            const imageUrl = producto.imagen_url ? `${API_BASE_URL}/${producto.imagen_url}` : 'https://placehold.co/300x200/EFEFEF/AAAAAA?text=Sin+Imagen';

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

