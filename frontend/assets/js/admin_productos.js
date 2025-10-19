// Archivo: assets/js/admin_productos.js
// Lógica completa y corregida para CRUD de productos

document.addEventListener('DOMContentLoaded', () => {

    // --- ELEMENTOS DEL DOM ---
    const listaProductos = document.getElementById('lista-productos');
    const btnPublicar = document.getElementById('btn-publicar');
    const formProducto = document.getElementById('form-producto'); // Formulario para AÑADIR

    // --- ELEMENTOS DEL MODAL DE EDICIÓN --- (Asegúrate que existen en tu HTML)
    const modalOverlay = document.querySelector('.modal-overlay');
    const modalTitle = document.querySelector('.modal-content h2');
    const closeModalBtn = document.querySelector('.modal-close');
    const editForm = document.getElementById('edit-product-form');
    const editImagePreview = document.getElementById('edit-image-preview');
    const editImageInput = document.getElementById('edit-imagen');
    const editProductIdInput = document.getElementById('edit-product-id');

    // Inputs del formulario de AÑADIR (para resetear)
    const nombreInput = document.getElementById('nombre');
    const descripcionInput = document.getElementById('descripcion');
    const valorInput = document.getElementById('valor');
    const stockInput = document.getElementById('stock');
    const imagenInput = document.getElementById('imagen');

    // Inputs del formulario de EDITAR
    const editNombreInput = document.getElementById('edit-nombre');
    const editDescripcionInput = document.getElementById('edit-descripcion');
    const editValorInput = document.getElementById('edit-valor');
    const editStockInput = document.getElementById('edit-stock');

    // Variable global para ID en edición
    let editingProductId = null;

    // --- FUNCIONES DEL MODAL ---
    const openModal = () => {
        if (modalOverlay) modalOverlay.classList.add('active');
    };
    const closeModal = () => {
        if (modalOverlay) modalOverlay.classList.remove('active');
        if (editForm) editForm.reset(); // Limpiar form de edición
        editingProductId = null;
        if (editImagePreview) {
            editImagePreview.style.display = 'none';
            editImagePreview.src = '';
        }
        if (editImageInput) editImageInput.value = '';
    };

    // --- LÓGICA PARA PUBLICAR UN NUEVO PRODUCTO (POST) ---
    if (btnPublicar) {
        btnPublicar.addEventListener('click', async () => {
            // Validar campos
            if (!nombreInput.value || !descripcionInput.value || !valorInput.value || !stockInput.value || !imagenInput.files[0]) {
                alert('Por favor, completa todos los campos para añadir un producto.');
                return;
            }

            const formData = new FormData();
            formData.append('nombre', nombreInput.value);
            formData.append('descripcion', descripcionInput.value);
            formData.append('valor', valorInput.value);
            formData.append('stock', stockInput.value);
            formData.append('imagen', imagenInput.files[0]);

            try {
                const respuesta = await fetch('http://localhost:3000/api/productos', {
                    method: 'POST',
                    body: formData,
                });
                // Intenta obtener la respuesta JSON SIEMPRE
                const resultado = await respuesta.json().catch(() => ({ message: 'Respuesta no válida del servidor' }));

                if (respuesta.ok) {
                    alert(resultado.message || 'Producto añadido exitosamente.');
                    // *** AQUÍ SE LIMPIA EL FORMULARIO DE AÑADIR ***
                    formProducto.reset();
                    cargarProductos(); // Refresca la lista
                } else {
                    // Muestra el mensaje de error del backend si existe
                    throw new Error(resultado.message || `Error ${respuesta.status} del servidor.`);
                }
            } catch (error) {
                console.error('Error al publicar:', error);
                alert('No se pudo publicar el producto. Error: ' + error.message);
            }
        });
    } else {
        console.error("Botón 'btn-publicar' no encontrado.");
    }


    // --- LÓGICA PARA CARGAR Y MOSTRAR LOS PRODUCTOS (GET) ---
    async function cargarProductos() {
        console.log("Iniciando carga de productos..."); // Log
        try {
            const respuesta = await fetch('http://localhost:3000/api/productos');
            console.log("Respuesta fetch:", respuesta.status, respuesta.statusText); // Log

            if (!respuesta.ok) {
                let errorMsg = `Error ${respuesta.status}: ${respuesta.statusText}`;
                try {
                    const errorBody = await respuesta.text();
                    console.error("Cuerpo del error del servidor:", errorBody);
                    errorMsg = `Error ${respuesta.status}: ${errorBody || respuesta.statusText}`;
                } catch (e) { console.error("No se pudo leer el cuerpo del error:", e); }
                throw new Error(errorMsg);
            }

            const productos = await respuesta.json();
            console.log("Productos recibidos:", productos); // Log

            mostrarProductos(productos);

        } catch (error) {
            console.error('Error detallado al cargar productos:', error);
            listaProductos.innerHTML = `<p class="error-msg" style="color: red; text-align: center;">Error al cargar productos: ${error.message}. Revisa la consola.</p>`;
        }
    }

    // --- FUNCIÓN mostrarProductos ---
    function mostrarProductos(productos) {
        listaProductos.innerHTML = '';
        if (!productos || !Array.isArray(productos) || productos.length === 0) {
             console.log("No hay productos válidos para mostrar.");
            listaProductos.innerHTML = '<p class="info-msg" style="text-align: center; color: grey;">No hay productos registrados.</p>';
            return;
        }

        productos.forEach((producto, index) => {
            //console.log(`Procesando producto ${index}:`, producto);

            // *** USAREMOS 'id_producto' COMO INDICASTE ***
            const productoId = producto.id_producto;
            if (productoId === undefined || productoId === null) {
                console.warn(`Producto en índice ${index} omitido por falta de 'id_producto':`, producto);
                return; // Saltar este producto
            }

            const imageUrl = producto.imagen_url ? `http://localhost:3000/${producto.imagen_url}` : 'https://via.placeholder.com/150?text=No+Img';
            let safeProductoData = '{}';
            try {
                safeProductoData = JSON.stringify(producto).replace(/'/g, "&apos;");
            } catch (e) { console.error("Error al stringify producto:", producto, e); }


            const productoHTML = `
                <div class="product-card" data-producto='${safeProductoData}'>
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
                        <button class="btn-action btn-edit" data-id="${productoId}" title="Editar"><i class="fas fa-pencil-alt"></i></button>
                        <button class="btn-action btn-delete" data-id="${productoId}" title="Eliminar"><i class="fas fa-trash-alt"></i></button>
                    </div>
                </div>
            `;
            listaProductos.insertAdjacentHTML('beforeend', productoHTML);
        });
    }


    // --- EVENT LISTENERS PARA MODAL ---
    if(closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
    if(modalOverlay) modalOverlay.addEventListener('click', (event) => {
        if (event.target === modalOverlay) closeModal();
    });

    // Previsualización de imagen en modal de EDICIÓN
     if(editImageInput) editImageInput.addEventListener('change', function() {
        const file = this.files[0];
        if (file && editImagePreview) {
            const reader = new FileReader();
            reader.onload = (e) => {
                editImagePreview.src = e.target.result;
                editImagePreview.style.display = 'block';
            };
            reader.readAsDataURL(file);
        } else if(editImagePreview) {
             editImagePreview.style.display = 'none';
             editImagePreview.src = '';
        }
    });

    // --- DELEGACIÓN DE EVENTOS PARA EDITAR Y ELIMINAR (Lógica Reforzada) ---
    if (listaProductos) {
        listaProductos.addEventListener('click', async (event) => {
            const editButton = event.target.closest('.btn-edit');     // Botón Editar
            const deleteButton = event.target.closest('.btn-delete'); // Botón Eliminar
            const card = event.target.closest('.product-card');     // Tarjeta contenedora

            // Si no se hizo clic en un botón dentro de una tarjeta, no hacer nada
            if (!card || (!editButton && !deleteButton)) {
                return;
            }

            // --- Obtener datos del producto ---
            let producto;
            try {
                // Reemplazar &apos; por comilla simple antes de parsear
                const productoDataString = card.dataset.producto.replace(/&apos;/g, "'");
                producto = JSON.parse(productoDataString);
            } catch (e) {
                console.error("Error crítico al parsear datos del producto desde data-producto:", e, card.dataset.producto);
                alert("Error: No se pudieron leer los datos del producto asociado a esta tarjeta.");
                return; // Detener si no se pueden leer los datos
            }

            // --- Obtener ID del producto (usando id_producto como especificaste) ---
            const productoId = producto ? producto.id_producto : null; // Obtener ID desde los datos parseados
            let finalProductId = productoId; // Usar variable final para claridad

            // Verificar si se obtuvo un ID válido desde los datos del producto
            if (finalProductId === undefined || finalProductId === null) {
                // Como fallback, intentar obtenerlo del data-id del botón presionado
                const buttonId = editButton?.dataset.id || deleteButton?.dataset.id;
                 if (!buttonId) {
                    console.error("CRÍTICO: No se encontró 'id_producto' en los datos Y tampoco 'data-id' en el botón:", producto);
                    alert("Error interno: No se pudo identificar el ID del producto.");
                    return; // Detener si no hay ID por ninguna vía
                 }
                 console.warn("Se usó ID del botón como fallback:", buttonId);
                 // Usar el ID del botón si el de los datos falló
                 finalProductId = buttonId;
            }


            // --- ACCIÓN: EDITAR (Abrir y llenar modal) ---
            if (editButton && finalProductId) {
                 if (!modalTitle || !editForm || !editProductIdInput || !editNombreInput || !editDescripcionInput || !editValorInput || !editStockInput || !editImagePreview || !editImageInput) {
                    console.error("Error: Faltan elementos del DOM para el modal de edición.");
                    alert("Error al intentar abrir el editor.");
                    return;
                }
                modalTitle.textContent = 'Editar Producto';
                editingProductId = finalProductId; // Guardar ID global

                // Llenar formulario (usa los datos 'producto' parseados)
                editProductIdInput.value = finalProductId;
                editNombreInput.value = producto.nombre || '';
                editDescripcionInput.value = producto.descripcion || '';
                editValorInput.value = producto.valor || '';
                editStockInput.value = producto.stock || '';

                if (producto.imagen_url) {
                    editImagePreview.src = `http://localhost:3000/${producto.imagen_url}`;
                    editImagePreview.style.display = 'block';
                } else {
                    editImagePreview.style.display = 'none';
                    editImagePreview.src = '';
                }
                editImageInput.value = ''; // Limpiar input file
                openModal(); // Abrir el modal
            }

            // --- ACCIÓN: ELIMINAR (DELETE) ---
            if (deleteButton && finalProductId) {
                const nombreProducto = producto ? producto.nombre : 'este producto';
                if (confirm(`¿Estás seguro de que quieres eliminar "${nombreProducto}"?`)) {
                    console.log(`Intentando eliminar producto con ID: ${finalProductId}`);
                    try {
                        const response = await fetch(`http://localhost:3000/api/productos/${finalProductId}`, { method: 'DELETE' });
                        console.log(`Respuesta DELETE ${finalProductId}:`, response.status);

                        let responseBody = {}; // Objeto para guardar el cuerpo de la respuesta si existe
                        // Intentar leer cuerpo solo si NO es 204
                        if (response.status !== 204) {
                            responseBody = await response.json().catch(async () => {
                                 // Si falla JSON, intentar leer texto
                                 const text = await response.text();
                                 console.warn("Respuesta DELETE no era JSON:", text);
                                 return { message: text || `Estado ${response.status}` }; // Usar texto o estado si está vacío
                            });
                        }

                        if (response.ok || response.status === 204) {
                            alert(responseBody.message || 'Producto eliminado exitosamente.');
                            cargarProductos(); // Refrescar lista
                        } else {
                            // Si la respuesta no fue OK, usar el mensaje del cuerpo leído o estado
                            throw new Error(responseBody.message || `Error ${response.status} del servidor.`);
                        }
                    } catch (error) {
                        console.error('Error durante la eliminación:', error);
                        alert('No se pudo eliminar el producto: ' + error.message);
                    }
                }
            }
        });
    } else {
        console.error("Elemento 'lista-productos' no encontrado al añadir event listener.");
    }

    // --- LÓGICA PARA GUARDAR CAMBIOS (ENVIAR FORMULARIO DE EDICIÓN - PUT) ---
    if (editForm) {
        editForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            const id = editingProductId; // Usar el ID guardado al abrir el modal
            if (!id) {
                alert("Error: ID del producto no encontrado para editar.");
                return;
            }

            const formData = new FormData();
            formData.append('nombre', document.getElementById('edit-nombre').value);
            formData.append('descripcion', document.getElementById('edit-descripcion').value);
            formData.append('valor', document.getElementById('edit-valor').value);
            formData.append('stock', document.getElementById('edit-stock').value);

            const imagenFile = editImageInput.files[0];
            if (imagenFile) { formData.append('imagen', imagenFile); }

            console.log("Enviando actualización PUT para ID:", id);

            try {
                const respuesta = await fetch(`http://localhost:3000/api/productos/${id}`, {
                    method: 'PUT',
                    body: formData, // FormData es necesario si envías archivos
                });

                // Leer respuesta como texto primero
                const responseText = await respuesta.text();
                console.log("Respuesta PUT (texto):", respuesta.status, responseText);

                let resultado;
                try { resultado = JSON.parse(responseText); } // Intentar parsear
                catch (e) {
                     console.warn("Respuesta PUT no era JSON:", responseText);
                     if (respuesta.ok) resultado = { message: 'Operación exitosa (respuesta no JSON).' };
                     else resultado = { message: responseText || `Error ${respuesta.status}` };
                }


                if (respuesta.ok) {
                    alert(resultado.message || 'Producto actualizado.');
                    closeModal();
                    cargarProductos();
                } else {
                     // Si la respuesta no fue OK, muestra el mensaje de error (del JSON o del texto)
                    throw new Error(resultado.message || `Error ${respuesta.status}`);
                }
            } catch (error) {
                console.error('Error al actualizar:', error);
                alert('No se pudo actualizar: ' + error.message);
            }
        });
    } else {
        console.error("Formulario de edición 'edit-product-form' no encontrado.");
    }

    // --- CARGA INICIAL ---
    cargarProductos();

}); // Fin del DOMContentLoaded