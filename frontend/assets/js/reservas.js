// Archivo: assets/js/reservas.js

// --- LÓGICA DE ENTORNO AUTOMÁTICO ---
const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const API_BASE_URL = isLocal 
    ? 'http://localhost:3000' // URL para desarrollo local
    : 'https://cosmeticabackend-dqxh.onrender.com'; // URL para producción

document.addEventListener('DOMContentLoaded', () => {
    // --- OBTENER ELEMENTOS DEL DOM ---
    const stepServicio = document.getElementById('step-servicio');
    const stepFecha = document.getElementById('step-fecha');
    const stepHorarios = document.getElementById('step-horarios');
    const stepFormulario = document.getElementById('step-formulario');
    const stepAdvertencia = document.getElementById('step-advertencia');
    const stepExito = document.getElementById('step-exito');

    const servicioSeleccionadoSpan = document.getElementById('servicio-seleccionado');
    const fechaSeleccionadaSpan = document.getElementById('fecha-seleccionada');
    const horarioSeleccionadoSpan = document.getElementById('horario-seleccionado');
    const horarioBotones = document.querySelectorAll('.horario-btn');

    const serviceSelect = document.getElementById('servicio');
    const btnContinuarFecha = document.getElementById('btn-continuar-fecha'); // Ensure this matches your HTML ID

    let datosReserva = {}; // Objeto para guardar los datos

    // --- FUNCIÓN PARA CARGAR SERVICIOS ---
    const loadServices = async () => {
        if (!serviceSelect) {
            console.error("Elemento select con id 'servicio' no encontrado.");
            return;
        }
        try {
            const response = await fetch(`${API_BASE_URL}/api/servicios`);
            if (!response.ok) throw new Error('No se pudieron cargar los servicios.');
            const services = await response.json();

            serviceSelect.innerHTML = '<option value="" disabled selected>Selecciona un servicio</option>';

            services.forEach(service => {
                if (service.nombre_area?.toLowerCase() === 'admin') return;
                const option = document.createElement('option');
                option.value = service.id_servicio;
                // Concatenar título + subtítulo si existe
                const tituloCompleto = service.subtitulo
                ? `${service.titulo} ${service.subtitulo}`
                : service.titulo;

                // Mostrar el texto con el valor formateado
                option.textContent = `${tituloCompleto} ($${Number(service.valor || 0).toLocaleString('es-CL')})`;
                option.dataset.areaId = service.id_area;
                option.dataset.titulo = service.titulo;
                serviceSelect.appendChild(option);
            });

            preselectServiceFromUrl();
        } catch (error) {
            console.error("Error cargando servicios:", error);
            serviceSelect.innerHTML = '<option value="">Error al cargar</option>';
        }
    };

    // --- FUNCIÓN PARA PRESELECCIONAR SERVICIO DESDE URL ---
    const preselectServiceFromUrl = () => {
        if (!serviceSelect) return;
        const urlParams = new URLSearchParams(window.location.search);
        const servicioParam = urlParams.get('servicio');
        if (servicioParam) {
            // Find option by title (dataset.titulo) to match URL param
            const optionToSelect = Array.from(serviceSelect.options).find(opt => opt.dataset.titulo === servicioParam);
            if (optionToSelect) {
                optionToSelect.selected = true;
                datosReserva.id_servicio = optionToSelect.value;
                datosReserva.id_area = optionToSelect.dataset.areaId;
                datosReserva.nombre_servicio = optionToSelect.dataset.titulo;
                if (servicioSeleccionadoSpan) servicioSeleccionadoSpan.textContent = datosReserva.nombre_servicio;
            }
        }
    };

    // --- FUNCIÓN PARA VERIFICAR DISPONIBILIDAD ---
    async function consultarYActualizarHorarios(fechaSeleccionada, areaId) {
        if (!fechaSeleccionada || !areaId) {
            console.warn("Falta fecha o ID de área para consultar horarios.");
            horarioBotones.forEach(btn => { btn.disabled = true; btn.textContent = "Error"; });
            return;
        }

        horarioBotones.forEach(btn => {
            btn.disabled = true;
            btn.textContent = 'Cargando...';
            btn.classList.remove('ocupado');
        });

        try {
            const respuesta = await fetch(`${API_BASE_URL}/api/horarios-ocupados?fecha=${fechaSeleccionada}&id_area=${areaId}`);
            if (!respuesta.ok) throw new Error('Error al obtener horarios.');
            const horariosOcupados = await respuesta.json();

            horarioBotones.forEach(btn => {
                const horaDelBoton = btn.dataset.hora;
                btn.textContent = horaDelBoton;
                if (horariosOcupados.includes(horaDelBoton)) {
                    btn.disabled = true;
                    btn.classList.add('ocupado');
                    btn.textContent = 'Reservado';
                } else {
                    btn.disabled = false;
                    btn.classList.remove('ocupado');
                }
            });
        } catch (error) {
            console.error("Error al verificar horarios:", error);
            alert("No se pudo verificar la disponibilidad horaria.");
            horarioBotones.forEach(btn => { btn.disabled = true; btn.textContent = "Error"; });
        }
    }

    // --- LÓGICA DE LA INTERFAZ DE PASOS ---
    if (serviceSelect) {
        serviceSelect.addEventListener('change', () => {
            const selectedOption = serviceSelect.options[serviceSelect.selectedIndex];
            if (!selectedOption || !selectedOption.value) {
                datosReserva.id_servicio = undefined;
                datosReserva.id_area = undefined;
                datosReserva.nombre_servicio = undefined;
                if (servicioSeleccionadoSpan) servicioSeleccionadoSpan.textContent = '';
                return;
            }
            datosReserva.id_servicio = selectedOption.value;
            datosReserva.id_area = selectedOption.dataset.areaId;
            datosReserva.nombre_servicio = selectedOption.dataset.titulo;
            if (servicioSeleccionadoSpan) servicioSeleccionadoSpan.textContent = datosReserva.nombre_servicio;
        });
    }

    // *** NUEVO: LISTENER PARA EL BOTÓN CONTINUAR ***
    if (btnContinuarFecha) {
        btnContinuarFecha.addEventListener('click', () => {
            // Validar que se haya seleccionado un servicio
            if (!datosReserva.id_servicio || !serviceSelect.value) {
                alert("Por favor, selecciona un servicio antes de continuar.");
                if (serviceSelect) serviceSelect.focus();
                return;
            }
            // Avanzar al paso de fecha
            if (stepServicio) stepServicio.style.display = 'none';
            if (stepFecha) stepFecha.style.display = 'block';
        });
    } else {
        console.error("Botón 'btn-continuar-fecha' no encontrado.");
    }
    // *** FIN NUEVO LISTENER ***

    // --- Paso 2: Seleccionar Fecha ---
    if (document.getElementById('calendario-inline') && typeof flatpickr === 'function') {
        flatpickr('#calendario-inline', {
            inline: true,
            showMonths: 1,
            disableMobile: true,
            dateFormat: 'Y-m-d',
            minDate: 'today',
            locale: 'es',
            onChange: function (selectedDates, dateStr) {
                datosReserva.fecha = dateStr;
                if (fechaSeleccionadaSpan) fechaSeleccionadaSpan.textContent = dateStr;
                if (stepFecha) stepFecha.style.display = 'none';
                if (stepHorarios) stepHorarios.style.display = 'block';
                consultarYActualizarHorarios(datosReserva.fecha, datosReserva.id_area);
            }
        });
    }

    // --- Paso 3: Seleccionar Horario ---
    horarioBotones.forEach(btn => {
        btn.addEventListener('click', () => {
            datosReserva.hora = btn.dataset.hora;
            if (horarioSeleccionadoSpan) horarioSeleccionadoSpan.textContent = datosReserva.hora;
            if (stepHorarios) stepHorarios.style.display = 'none';
            if (stepFormulario) stepFormulario.style.display = 'block';
        });
    });

    // --- Botones Volver ---
    const btnBackServicio = document.getElementById('back-servicio');
    const btnBackFecha = document.getElementById('back-fecha');
    const btnBackHorario = document.getElementById('back-horario');
    const btnBackFormulario = document.getElementById('back-formulario');

    if (btnBackServicio) {
        btnBackServicio.addEventListener('click', () => {
            stepFecha.style.display = 'none';
            stepServicio.style.display = 'block';
        });
    }
    if (btnBackFecha) {
        btnBackFecha.addEventListener('click', () => {
            stepHorarios.style.display = 'none';
            stepFecha.style.display = 'block';
        });
    }
    if (btnBackHorario) {
        btnBackHorario.addEventListener('click', () => {
            stepFormulario.style.display = 'none';
            stepHorarios.style.display = 'block';
        });
    }
    if (btnBackFormulario) {
        btnBackFormulario.addEventListener('click', () => {
            stepAdvertencia.style.display = 'none';
            stepFormulario.style.display = 'block';
        });
    }


    // --- Paso 4: Formulario ---
    if (stepFormulario) stepFormulario.addEventListener('submit', (e) => {
        e.preventDefault();
        const nombreInput = document.getElementById('nombre');
        const rutInput = document.getElementById('rut');
        const telefonoInput = document.getElementById('telefono');

        // 🧹 Solo permitir números en el campo de RUT (Validación básica)
        // Nota: Es mejor hacer validación en input event, pero aquí limpiamos al enviar
        let rutLimpio = rutInput.value.replace(/\D/g, ''); 

        datosReserva.nombre = nombreInput ? nombreInput.value.trim() : '';
        datosReserva.rut = rutLimpio;
        datosReserva.telefono = telefonoInput ? telefonoInput.value.trim() : '';

        stepFormulario.style.display = 'none';
        if (stepAdvertencia) stepAdvertencia.style.display = 'block';
    });
    
    // Validación en tiempo real para RUT (opcional pero recomendado)
    const rutInput = document.getElementById('rut');
    if (rutInput) {
        rutInput.addEventListener('input', () => {
            rutInput.value = rutInput.value.replace(/[^0-9kK]/g, ''); // Permitir números y K
        });
    }


    // --- Envío final ---
    const btnConfirmar = document.getElementById('confirmar-reserva');
    if (btnConfirmar) {
        btnConfirmar.addEventListener('click', async () => {
            if (!datosReserva.nombre || !datosReserva.id_servicio || !datosReserva.fecha || !datosReserva.hora || !datosReserva.id_area) {
                alert('Faltan datos esenciales en la reserva. Revisa los pasos anteriores.');
                if (stepAdvertencia) stepAdvertencia.style.display = 'none';
                if (stepFormulario) stepFormulario.style.display = 'block';
                return;
            }

            const datosParaEnviar = {
                nombre: datosReserva.nombre,
                rut: datosReserva.rut,
                telefono: datosReserva.telefono,
                id_servicio: datosReserva.id_servicio,
                fecha: datosReserva.fecha,
                hora: datosReserva.hora,
                id_area: datosReserva.id_area
            };

            console.log("Enviando reserva:", datosParaEnviar);

            try {
                const respuesta = await fetch(`${API_BASE_URL}/api/reservas`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(datosParaEnviar)
                });
                const resultado = await respuesta.json().catch(async () => ({ message: await respuesta.text() || `Error ${respuesta.status}` }));

                if (respuesta.ok && resultado.success) {
                    if (stepAdvertencia) stepAdvertencia.style.display = 'none';
                    if (stepExito) stepExito.style.display = 'block';
                    setTimeout(() => { window.location.href = 'servicios.html'; }, 3000);
                } else {
                    alert('Error del servidor: ' + (resultado.message || `No se pudo completar la reserva (Estado ${respuesta.status})`));
                }
            } catch (error) {
                console.error('Error de red al enviar la reserva:', error);
                alert('No se pudo conectar con el servidor. Intenta más tarde.');
            }
        });
    }

    // --- CARGA INICIAL ---
    loadServices();
}); // Fin DOMContentLoaded