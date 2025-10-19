// --- LÓGICA DE ENTORNO AUTOMÁTICO ---
// Detecta si estamos en localhost o en el servidor de Render
const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const API_BASE_URL = isLocal 
    ? 'http://localhost:3000' // URL para desarrollo local
    : 'https://cosmeticabackend.onrender.com'; // URL para producción

let allWorkers = []; // Variable global para guardar los datos de los trabajadores

document.addEventListener('DOMContentLoaded', () => {

    // --- LÓGICA GENERAL PARA SECCIONES COLAPSABLES ---
    const collapsibleTitles = document.querySelectorAll('.collapsible-title');
    collapsibleTitles.forEach(title => {
        const content = title.nextElementSibling;
        if (content && content.classList.contains('collapsible-content')) {
            title.addEventListener('click', () => {
                content.classList.toggle('active');
                title.classList.toggle('active');
            });
        }
    });

    // --- FORMULARIO AÑADIR TRABAJADOR ---
    const addWorkerForm = document.getElementById('add-worker-form');
    if (addWorkerForm) {
        addWorkerForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const passwordInput = document.getElementById('worker-password');
            const confirmPasswordInput = document.getElementById('worker-confirm-password');
            const passwordError = document.getElementById('add-password-error');
            passwordError.style.display = 'none';
    
            if (passwordInput.value !== confirmPasswordInput.value) {
                passwordError.style.display = 'block';
                confirmPasswordInput.focus();
                return;
            }
    
            const workerData = {
                nombre: document.getElementById('worker-name').value,
                id_area: document.getElementById('worker-area').value,
                email: document.getElementById('worker-email').value,
                username: document.getElementById('worker-username').value,
                password: passwordInput.value
            };
    
            try {
                const response = await fetch(`${API_BASE_URL}/api/trabajadores`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(workerData)
                });
    
                const result = await response.json();
                if (!response.ok) throw new Error(result.message);
    
                alert(result.message); 
                addWorkerForm.reset();
                loadWorkersAndPopulateDropdown(); // Recarga la lista de trabajadores en el otro formulario
    
            } catch (error) {
                alert(`Error: ${error.message}`);
            }
        });
    }

    // --- FORMULARIO EDITAR TRABAJADOR ---
    const selectWorkerEdit = document.getElementById('select-worker-edit');
    const editWorkerDetailsForm = document.getElementById('edit-worker-details-form');
    
    const loadWorkersAndPopulateDropdown = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/trabajadores`);
            if (!response.ok) throw new Error('No se pudo cargar la lista de trabajadores.');
            
            allWorkers = await response.json(); // Guardamos los datos en la variable global
            
            selectWorkerEdit.innerHTML = '<option value="" disabled selected>Selecciona un trabajador...</option>'; // Limpiamos y añadimos el placeholder
            
            allWorkers.forEach(worker => {
                const option = document.createElement('option');
                option.value = worker.id;
                option.textContent = worker.nombre_completo;
                selectWorkerEdit.appendChild(option);
            });
             // Ocultar el formulario de detalles al recargar
            editWorkerDetailsForm.style.display = 'none';
            editWorkerDetailsForm.reset();

        } catch (error) {
            console.error('Error cargando trabajadores:', error);
            selectWorkerEdit.innerHTML = '<option value="" disabled selected>Error al cargar</option>';
        }
    };

    if (selectWorkerEdit) {
        selectWorkerEdit.addEventListener('change', () => {
            const selectedId = selectWorkerEdit.value;
            const selectedWorker = allWorkers.find(w => w.id == selectedId);
            
            if (selectedWorker) {
                // Rellenamos el formulario con los datos del trabajador seleccionado
                document.getElementById('edit-worker-id').value = selectedWorker.id;
                document.getElementById('edit-worker-name').value = selectedWorker.nombre_completo;
                document.getElementById('edit-worker-area').value = selectedWorker.id_area;
                document.getElementById('edit-worker-email').value = selectedWorker.email;
                document.getElementById('edit-worker-username').value = selectedWorker.username;
                
                // Limpiamos los campos de contraseña
                document.getElementById('edit-worker-password').value = '';
                document.getElementById('edit-worker-confirm-password').value = '';
                document.getElementById('edit-password-error').style.display = 'none';

                // Mostramos el formulario de detalles
                editWorkerDetailsForm.style.display = 'block';
            } else {
                editWorkerDetailsForm.style.display = 'none';
            }
        });
    }

    if (editWorkerDetailsForm) {
        editWorkerDetailsForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const passwordInput = document.getElementById('edit-worker-password');
            const confirmPasswordInput = document.getElementById('edit-worker-confirm-password');
            const passwordError = document.getElementById('edit-password-error');
            passwordError.style.display = 'none';

            if (passwordInput.value && passwordInput.value !== confirmPasswordInput.value) {
                passwordError.style.display = 'block';
                confirmPasswordInput.focus();
                return;
            }

            const workerId = document.getElementById('edit-worker-id').value;
            const updatedData = {
                nombre: document.getElementById('edit-worker-name').value,
                id_area: document.getElementById('edit-worker-area').value,
                email: document.getElementById('edit-worker-email').value,
                username: document.getElementById('edit-worker-username').value,
            };

            // Solo incluimos la contraseña en los datos si el usuario escribió una nueva
            if (passwordInput.value) {
                updatedData.password = passwordInput.value;
            }

            try {
                const response = await fetch(`${API_BASE_URL}/api/trabajadores/${workerId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updatedData)
                });
                
                const result = await response.json();
                if (!response.ok) throw new Error(result.message);

                alert(result.message);
                loadWorkersAndPopulateDropdown(); // Recarga y resetea el dropdown

            } catch (error) {
                alert(`Error al actualizar: ${error.message}`);
            }
        });
    }

    // --- ADMINISTRAR ÁREAS ---
    const areaListContainer = document.getElementById('area-list');
    const addAreaForm = document.getElementById('add-area-form');
    const newAreaNameInput = document.getElementById('new-area-name');
    const addWorkerAreaSelect = document.getElementById('worker-area');
    const editWorkerAreaSelect = document.getElementById('edit-worker-area');

    const renderAreaList = (areas) => {
        if (!areaListContainer) return;
        areaListContainer.innerHTML = '';
        if (areas.length === 0) {
            areaListContainer.innerHTML = '<p>No hay áreas de trabajo registradas.</p>';
            return;
        }
        areas.forEach(area => {
            const areaElement = document.createElement('div');
            areaElement.className = 'area-item';
            areaElement.innerHTML = `
                <span>${area.nombre_area}</span>
                <button class="btn btn-danger btn-delete-area" data-id="${area.id_area}" aria-label="Eliminar ${area.nombre_area}">
                    <i class="fas fa-trash"></i>
                </button>
            `;
            areaListContainer.appendChild(areaElement);
        });
    };

    const updateAreaSelects = (areas) => {
        const selects = [addWorkerAreaSelect, editWorkerAreaSelect];
        selects.forEach(select => {
            if (!select) return;
            const placeholder = select.querySelector('option[disabled]');
            select.innerHTML = '';
            if (placeholder) select.appendChild(placeholder);
            areas.forEach(area => {
                const option = document.createElement('option');
                option.value = area.id_area;
                option.textContent = area.nombre_area;
                select.appendChild(option);
            });
        });
    };

    const loadAndRenderAreas = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/areas`);
            if (!response.ok) throw new Error(`No se pudo cargar la lista de áreas.`);
            const areas = await response.json();
            renderAreaList(areas);
            updateAreaSelects(areas);
        } catch (error) {
            console.error('Error en loadAndRenderAreas:', error);
            if (areaListContainer) areaListContainer.innerHTML = `<p class="error-message">Error al cargar las áreas. Revisa que el backend esté corriendo.</p>`;
        }
    };

    if (addAreaForm) {
        addAreaForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const nombre = newAreaNameInput.value.trim();
            if (!nombre) return;
            try {
                const response = await fetch(`${API_BASE_URL}/api/areas`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ nombre: nombre })
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.message);
                alert(data.message || 'Área creada con éxito.');
                newAreaNameInput.value = '';
                loadAndRenderAreas();
            } catch (error) {
                alert(`Error: ${error.message}`);
            }
        });
    }

    if (areaListContainer) {
        areaListContainer.addEventListener('click', async (event) => {
            const deleteButton = event.target.closest('.btn-delete-area');
            if (deleteButton) {
                const areaId = deleteButton.dataset.id;
                if (!confirm('¿Estás seguro de que quieres eliminar esta área?')) return;
                try {
                    const response = await fetch(`${API_BASE_URL}/api/areas/${areaId}`, {
                        method: 'DELETE'
                    });
                    const data = await response.json();
                    if (!response.ok) throw new Error(data.message);
                    alert(data.message || 'Área eliminada.');
                    loadAndRenderAreas();
                } catch (error) {
                    alert(`Error: ${error.message}`);
                }
            }
        });
    }
    
    // --- INICIALIZACIÓN ---
    // Se ejecutan estas funciones cuando la página carga por primera vez
    loadAndRenderAreas();
    loadWorkersAndPopulateDropdown();
});

