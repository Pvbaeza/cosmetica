// --- LÓGICA DE ENTORNO AUTOMÁTICO ---
// Detecta si estamos en localhost o en el servidor de Render
const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const API_BASE_URL = isLocal 
    ? 'http://localhost:3000' // URL para desarrollo local
    : 'https://cosmeticabackend-dqxh.onrender.com'; // URL para producción

document.addEventListener('DOMContentLoaded', () => {

    // --- ELEMENTOS DEL DOM ---
    const listaProductos = document.getElementById('lista-productos');
    const btnPublicar = document.getElementById('btn-publicar');
    const formProducto = document.getElementById('form-producto');

    // --- ELEMENTOS DEL MODAL DE EDICIÓN ---
    const modalOverlay = document.querySelector('.modal-overlay');
    const closeModalBtn = document.querySelector('.modal-close');
    const editForm = document.getElementById('edit-product-form');
    const editImagePreview = document.getElementById('edit-image-preview');

    let editingProductId = null;

    // --- FUNCIONES DEL MODAL ---
    const openModal = () => {
        if (modalOverlay) modalOverlay.classList.add('active');
    };
    const closeModal = () => {
        if (modalOverlay) modalOverlay.classList.remove('active');
        if (editForm) editForm.reset();
        editingProductId = null;
        if (editImagePreview) {
            editImagePreview.style.display = 'none';
            editImagePreview.src = '';
        }
    };

    // --- LÓGICA PARA PUBLICAR UN NUEVO PRODUCTO (POST) ---
    if (btnPublicar) {
        btnPublicar.addEventListener('click', async () => {
            if (!formProducto.checkValidity()) {
                alert('Por favor, completa todos los campos requeridos.');
                return;
            }

            const formData = new FormData(formProducto);

            try {
                const respuesta = await fetch(`${API_BASE_URL}/api/productos`, {
                    method: 'POST',
                    body: formData,
                });
                const resultado = await respuesta.json();
                if (!respuesta.ok) {
                    throw new Error(resultado.message || 'Error del servidor.');
                }
                alert(resultado.message || 'Producto añadido exitosamente.');
                formProducto.reset();
                cargarProductos();
            } catch (error) {
                console.error('Error al publicar:', error);
                alert('No se pudo publicar el producto. Error: ' + error.message);
            }
        });
    }

    // --- LÓGICA PARA CARGAR Y MOSTRAR LOS PRODUCTOS (GET) ---
    async function cargarProductos() {
        try {
            const respuesta = await fetch(`${API_BASE_URL}/api/productos`);
            if (!respuesta.ok) {
                throw new Error(`Error ${respuesta.status}: No se pudo conectar al servidor.`);
            }
            const productos = await respuesta.json();
            mostrarProductos(productos);
        } catch (error) {
            console.error('Error detallado al cargar productos:', error);
            listaProductos.innerHTML = `<p class="error-msg" style="color: red; text-align: center;">Error al cargar productos: ${error.message}.</p>`;
        }
    }

    function mostrarProductos(productos) {
        listaProductos.innerHTML = '';
        if (!productos || productos.length === 0) {
            listaProductos.innerHTML = '<p style="text-align: center;">No hay productos registrados.</p>';
            return;
        }

        productos.forEach(producto => {
            
            // --- CORRECCIÓN 1 AQUÍ ---
            // Esta lógica decide si usar la URL de Cloudinary directamente o construir la URL antigua.
            let imageUrl;
            if (producto.imagen_url && producto.imagen_url.startsWith('http')) {
                // Es una URL absoluta (de Cloudinary)
                imageUrl = producto.imagen_url;
            } else if (producto.imagen_url) {
                // Es una URL relativa antigua (ej: 'assets/img/...')
                imageUrl = `${API_BASE_URL}/${producto.imagen_url}`;
            } else {
                // No hay imagen
                imageUrl = 'https://placehold.co/300x180/eee/aaa?text=Sin+Imagen';
            }
            
            const productoHTML = `
                <div class="product-card" data-producto='${JSON.stringify(producto).replace(/'/g, "&apos;")}'>
                    <img class="product-image" src="${imageUrl}" alt="${producto.nombre || 'Producto'}">
                    <div class="product-info">
                        <h3 class="product-title">${producto.nombre || 'Sin nombre'}</h3>
                        <p class="product-description">${producto.descripcion || 'Sin descripción'}</p>
                        <div class="product-details">
                            <span class="product-price">$${Number(producto.valor || 0).toLocaleString('es-CL')}</span>
                            <span class="product-stock">Stock: ${producto.stock || 0}</span>
                        </div>
                    </div>
                    <div class="product-actions">
                        <button class="btn-action btn-edit" title="Editar"><i class="fas fa-pencil-alt"></i></button>
                        <button class="btn-action btn-delete" title="Eliminar"><i class="fas fa-trash-alt"></i></button>
                    </div>
                </div>`;
            listaProductos.insertAdjacentHTML('beforeend', productoHTML);
        });
    }

    // --- EVENT LISTENERS PARA MODAL ---
    if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
    if (modalOverlay) modalOverlay.addEventListener('click', (event) => {
        if (event.target === modalOverlay) closeModal();
    });

    // --- DELEGACIÓN DE EVENTOS PARA EDITAR Y ELIMINAR ---
    if (listaProductos) {
        listaProductos.addEventListener('click', async (event) => {
            const editButton = event.target.closest('.btn-edit');
            const deleteButton = event.target.closest('.btn-delete');
            const card = event.target.closest('.product-card');

            if (!card || (!editButton && !deleteButton)) return;

            let producto;
            try {
                producto = JSON.parse(card.dataset.producto.replace(/&apos;/g, "'"));
            } catch (e) {
                alert("Error: No se pudieron leer los datos del producto.");
                return;
            }
            
            const productoId = producto.id_producto;
            if (!productoId) {
                alert("Error interno: No se pudo identificar el ID del producto.");
                return;
            }

            // --- ACCIÓN: EDITAR ---
            if (editButton) {
                document.querySelector('.modal-content h2').textContent = 'Editar Producto';
                editingProductId = productoId;
                
                document.getElementById('edit-product-id').value = productoId;
                document.getElementById('edit-nombre').value = producto.nombre;
                document.getElementById('edit-descripcion').value = producto.descripcion;
                document.getElementById('edit-valor').value = producto.valor;
                document.getElementById('edit-stock').value = producto.stock;
                
                const preview = document.getElementById('edit-image-preview');
                
                // --- CORRECCIÓN 2 AQUÍ ---
                // Esta lógica decide qué URL mostrar en la vista previa de edición.
                let imageUrl = '';
                if (producto.imagen_url && producto.imagen_url.startsWith('http')) {
                    // Es una URL absoluta (de Cloudinary)
                    imageUrl = producto.imagen_url;
                } else if (producto.imagen_url) {
                    // Es una URL relativa antigua (ej: 'assets/img/...')
                    imageUrl = `${API_BASE_URL}/${producto.imagen_url}`;
                }

                preview.src = imageUrl;
                preview.style.display = imageUrl ? 'block' : 'none';
                
                document.getElementById('edit-imagen').value = ''; // Limpiar input file
                openModal();
            }

            // --- ACCIÓN: ELIMINAR ---
            if (deleteButton) {
                if (confirm(`¿Estás seguro de que quieres eliminar "${producto.nombre}"?`)) {
                    try {
                        const response = await fetch(`${API_BASE_URL}/api/productos/${productoId}`, { method: 'DELETE' });
                        
                        let responseBody = { message: 'Producto eliminado exitosamente.' };
                        if (response.status !== 204) {
                            responseBody = await response.json();
                        }

                        if (!response.ok) {
                            throw new Error(responseBody.message || `Error ${response.status}`);
                        }
                        
                        alert(responseBody.message);
                        cargarProductos();
                    } catch (error) {
                        console.error('Error durante la eliminación:', error);
                        alert('No se pudo eliminar el producto: ' + error.message);
                    }
                }
            }
        });
    }

    // --- LÓGICA PARA GUARDAR CAMBIOS (PUT) ---
    if (editForm) {
        editForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const id = editingProductId;
            if (!id) return;

            const formData = new FormData(editForm);

            try {
                const respuesta = await fetch(`${API_BASE_URL}/api/productos/${id}`, {
                    method: 'PUT',
                    body: formData,
                });
                const resultado = await respuesta.json();

                if (!respuesta.ok) {
                    throw new Error(resultado.message || `Error ${respuesta.status}`);
                }
                
                alert(resultado.message || 'Producto actualizado.');
                closeModal();
                cargarProductos();
            } catch (error) {
                console.error('Error al actualizar:', error);
                alert('No se pudo actualizar: ' + error.message);
            }
        });
    }

    // --- CARGA INICIAL ---
    cargarProductos();
});






// flecha de scroll
window.addEventListener("scroll", function() {
  const btn = document.getElementById("btnScrollTop");
  if (document.body.scrollTop > 300 || document.documentElement.scrollTop > 300) {
    btn.style.display = "flex";
  } else {
    btn.style.display = "none";
  }
});

document.getElementById("btnScrollTop").addEventListener("click", function() {
  window.scrollTo({ top: 0, behavior: "smooth" });
});