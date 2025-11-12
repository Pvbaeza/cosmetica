// --- LÓGICA DE ENTORNO AUTOMÁTICO ---
// Detecta si estamos en localhost o en el servidor de Render
const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const API_BASE_URL = isLocal
    ? 'http://localhost:3000' // URL para desarrollo local
    : 'https://cosmeticabackend-dqxh.onrender.com'; // URL para producción

// --- NÚMERO DE WHATSAPP ---
// Chile → código internacional +56
const WHATSAPP_NUMBER = "56957034877";

document.addEventListener('DOMContentLoaded', () => {
    const catalogoProductos = document.getElementById('catalogo-productos');

    // --- Cargar productos desde la API ---
    async function cargarProductos() {
        try {
            const respuesta = await fetch(`${API_BASE_URL}/api/productos`);
            if (!respuesta.ok) throw new Error('Error al obtener los productos');
            const productos = await respuesta.json();
            mostrarProductosEnCatalogo(productos);
        } catch (error) {
            console.error('Error al cargar los productos:', error);
            if (catalogoProductos) {
                catalogoProductos.innerHTML = '<p>No se pudieron cargar los productos en este momento.</p>';
            }
        }
    }

    function mostrarProductosEnCatalogo(productos) {
        if (!catalogoProductos) return;
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

            // --- Imagen del producto ---
            let imageUrl;
            if (producto.imagen_url && producto.imagen_url.startsWith('http')) {
                imageUrl = producto.imagen_url;
            } else if (producto.imagen_url) {
                imageUrl = `${API_BASE_URL}/${producto.imagen_url}`;
            } else {
                imageUrl = 'https://placehold.co/300x200/EFEFEF/AAAAAA?text=Sin+Imagen';
            }

            // --- Tarjeta del producto ---
            const productoCardHTML = `
            <div class="producto-card">
                <img src="${imageUrl}" alt="Imagen de ${producto.nombre || 'Producto'}">
                <h3>${producto.nombre || 'Producto sin nombre'}</h3>
                <p class="product-price">${precioFormateado}</p>
                <div class="descripcion-producto">
                    ${producto.descripcion || '<em>Sin descripción disponible.</em>'}
                </div>
                <button class="btn-contactar" 
                data-nombre="${producto.nombre || 'Producto'}" 
                data-descripcion="${(producto.descripcion || '').replace(/"/g, '&quot;')}" 
                data-precio="${precioFormateado}"
                data-imagen="${imageUrl}">
                <i class="fab fa-whatsapp"></i> Contactar por WhatsApp
                </button>

            </div>
        `;
            catalogoProductos.insertAdjacentHTML('beforeend', productoCardHTML);
        });

        // --- Evento de WhatsApp ---
        const botones = document.querySelectorAll('.btn-contactar');
        botones.forEach(btn => {
            btn.addEventListener('click', () => {
                const nombre = btn.dataset.nombre;
                const descripcionHTML = btn.dataset.descripcion || '';
                const precio = btn.dataset.precio;
                const imagen = btn.dataset.imagen || ''; // Agregado correctamente

                // 🧼 Limpiar HTML → texto legible
                const stripHTML = (html) => {
                    const tempDiv = document.createElement("div");
                    tempDiv.innerHTML = html;
                    return tempDiv.textContent
                        .replace(/\s+/g, ' ') // Quita espacios extra
                        .trim();
                };
                const descripcionLimpia = stripHTML(descripcionHTML);

                // 💬 Formato legible y bonito con saltos de línea
                const mensaje = `¡Hola! Estoy interesado(a) en este producto:
- *${nombre}*
- Precio: ${precio}
- Imagen: ${imagen}

¿Podrías darme más información?`;

                const url = `https://wa.me/56957034877?text=${encodeURIComponent(mensaje)}`;
                window.open(url, '_blank');
            });
        });


    }


    // --- Cargar productos al iniciar ---
    cargarProductos();
});

// --- Flecha para volver arriba ---
window.addEventListener("scroll", function () {
    const btn = document.getElementById("btnScrollTop");
    if (document.body.scrollTop > 300 || document.documentElement.scrollTop > 300) {
        btn.style.display = "flex";
    } else {
        btn.style.display = "none";
    }
});

document.getElementById("btnScrollTop").addEventListener("click", function () {
    window.scrollTo({ top: 0, behavior: "smooth" });
});
