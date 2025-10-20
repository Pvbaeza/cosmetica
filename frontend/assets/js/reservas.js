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
    // <<< OBTENER EL BOTÓN CONTINUAR (Asegúrate que existe en tu HTML con este ID) >>>
    const btnContinuarFecha = document.getElementById('btn-continuar-fecha');

    let datosReserva = {};

    // --- FUNCIÓN PARA CARGAR SERVICIOS ---
    const loadServices = async () => {
        // Verificar que el select existe
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
                // Filtrar servicios 'Admin' si existen en los datos
                if (service.tipo_trabajador?.toLowerCase() === 'admin') return;

                const option = document.createElement('option');
                option.value = service.titulo;
                option.textContent = `${service.titulo} ($${Number(service.valor || 0).toLocaleString('es-CL')})`;
                option.dataset.area = service.tipo_trabajador;
                serviceSelect.appendChild(option);
            });

            // Llamar a preseleccionar DESPUÉS de llenar el select
            preselectServiceFromUrl();

        } catch (error) {
            console.error("Error cargando servicios:", error);
            serviceSelect.innerHTML = '<option value="">Error al cargar</option>';
        }
    };

    // --- FUNCIÓN PARA PRESELECCIONAR SERVICIO DESDE URL --- (MODIFICADA)
    const preselectServiceFromUrl = () => {
        if (!serviceSelect) return; // Salir si el select no existe

        const urlParams = new URLSearchParams(window.location.search);
        const servicioParam = urlParams.get('servicio'); // Obtiene ?servicio=VALOR

        if (servicioParam) {
            console.log("Intentando preseleccionar servicio:", servicioParam); // Log
            // Busca la opción cuyo VALOR coincide con el parámetro
            const optionToSelect = Array.from(serviceSelect.options).find(opt => opt.value === servicioParam);

            if (optionToSelect) {
                optionToSelect.selected = true; // Selecciona la opción
                console.log("Opción encontrada y seleccionada."); // Log

                // <<< YA NO DISPARAMOS EL EVENTO 'change' >>>
                // const event = new Event('change', { bubbles: true });
                // serviceSelect.dispatchEvent(event);

                // <<< GUARDAR DATOS DIRECTAMENTE AL PRESELECCIONAR >>>
                datosReserva.servicio = optionToSelect.value;
                datosReserva.area_servicio = optionToSelect.dataset.area;
                if (servicioSeleccionadoSpan) servicioSeleccionadoSpan.textContent = datosReserva.servicio;
                console.log("Datos de reserva actualizados por preselección:", datosReserva);

            } else {
                console.warn(`Servicio "${servicioParam}" de la URL no encontrado en las opciones.`); // Log si no se encuentra
            }
        } else {
            console.log("No hay parámetro 'servicio' en la URL para preseleccionar."); // Log si no hay parámetro
        }
    };

    // --- FUNCIÓN PARA VERIFICAR DISPONIBILIDAD --- (Sin cambios)
    async function consultarYActualizarHorarios(fechaSeleccionada, areaServicio) {
        if (!fechaSeleccionada || !areaServicio) {
            console.warn("Falta fecha o área para consultar horarios.");
            horarioBotones.forEach(btn => { btn.disabled = true; btn.textContent = "Error"; });
            return;
        }
        // Deshabilitar botones mientras carga
        horarioBotones.forEach(btn => {
            btn.disabled = true;
            btn.textContent = 'Cargando...';
            btn.classList.remove('ocupado');
        });

        try {
            const respuesta = await fetch(`${API_BASE_URL}/api/horarios-ocupados?fecha=${fechaSeleccionada}&area=${areaServicio}`);
            if (!respuesta.ok) throw new Error('Error al obtener horarios.');
            const horariosOcupados = await respuesta.json();

            horarioBotones.forEach(btn => {
                const horaDelBoton = btn.dataset.hora;
                btn.textContent = horaDelBoton; // Restaurar texto original
                // Marcar como ocupado si está en la lista
                if (horariosOcupados.includes(horaDelBoton)) {
                    btn.disabled = true;
                    btn.classList.add('ocupado');
                    btn.textContent = 'Reservado'; // Opcional: Cambiar texto
                } else {
                    btn.disabled = false;
                    btn.classList.remove('ocupado');
                }
            });
        } catch (error) {
            console.error("Error al verificar horarios:", error);
            alert("No se pudo verificar la disponibilidad horaria.");
            // Restaurar texto y mantener deshabilitado en caso de error
            horarioBotones.forEach(btn => { btn.disabled = true; btn.textContent = "Error"; });
        }
    }


    // --- LÓGICA DE LA INTERFAZ DE PASOS (UI) ---

    // Paso 1: Seleccionar Servicio (MODIFICADO: Solo guarda datos)
    if (serviceSelect) {
        serviceSelect.addEventListener('change', () => {
            const selectedOption = serviceSelect.options[serviceSelect.selectedIndex];
            // Verificar si la opción seleccionada es válida (no la de "Selecciona...")
            if (!selectedOption || !selectedOption.value) {
                 datosReserva.servicio = undefined; // Limpiar datos si se deselecciona
                 datosReserva.area_servicio = undefined;
                 if (servicioSeleccionadoSpan) servicioSeleccionadoSpan.textContent = '';
                 console.log("Selección de servicio inválida o reseteada.");
                 return; // No hacer nada más
            }

            // Guardar los datos del servicio seleccionado
            datosReserva.servicio = selectedOption.value;
            datosReserva.area_servicio = selectedOption.dataset.area;
            if (servicioSeleccionadoSpan) servicioSeleccionadoSpan.textContent = datosReserva.servicio; // Actualizar resumen en formulario

            console.log("Servicio seleccionado manualmente:", datosReserva.servicio, "Área:", datosReserva.area_servicio);

            // <<< YA NO SE AVANZA AUTOMÁTICAMENTE >>>
            // if (stepServicio) stepServicio.style.display = 'none';
            // if (stepFecha) stepFecha.style.display = 'block';
        });
    } else {
         console.error("Elemento select 'servicio' no encontrado.");
    }

    // --- ¡NUEVO LISTENER PARA EL BOTÓN CONTINUAR A FECHA! ---
    if (btnContinuarFecha) {
        btnContinuarFecha.addEventListener('click', () => {
            // Verificar si se ha seleccionado un servicio válido
            if (!datosReserva.servicio || !serviceSelect.value) {
                alert("Por favor, selecciona un servicio antes de continuar.");
                if (serviceSelect) serviceSelect.focus(); // Poner foco en el select
                return; // Detener si no hay servicio
            }

            // Si hay un servicio seleccionado, avanzar al paso de fecha
            console.log("Continuando a selección de fecha...");
            if (stepServicio) stepServicio.style.display = 'none';
            if (stepFecha) stepFecha.style.display = 'block';
        });
    } else {
        console.error("Botón 'btn-continuar-fecha' no encontrado en el HTML.");
    }


    // Paso 2: Seleccionar Fecha (Inicializa Flatpickr)
    if (document.getElementById('calendario-inline') && typeof flatpickr === 'function') {
        flatpickr("#calendario-inline", {
             inline: true, dateFormat: "Y-m-d", minDate: "today", locale: "es",
             onChange: function(selectedDates, dateStr) {
                 datosReserva.fecha = dateStr;
                 if (fechaSeleccionadaSpan) fechaSeleccionadaSpan.textContent = dateStr;
                 // Avanzar al paso de horarios
                 if (stepFecha) stepFecha.style.display = 'none';
                 if (stepHorarios) stepHorarios.style.display = 'block';
                 // Consultar horarios para la fecha y área seleccionadas
                 consultarYActualizarHorarios(datosReserva.fecha, datosReserva.area_servicio);
             }
        });
    } else { console.error("'calendario-inline' o Flatpickr no encontrados."); }

    // Paso 3: Seleccionar Horario
    horarioBotones.forEach(btn => {
        btn.addEventListener('click', () => {
            datosReserva.hora = btn.dataset.hora;
            if (horarioSeleccionadoSpan) horarioSeleccionadoSpan.textContent = datosReserva.hora;
            // Avanzar al formulario
            if (stepHorarios) stepHorarios.style.display = 'none';
            if (stepFormulario) stepFormulario.style.display = 'block';
        });
    });

    // --- Botones "Volver" --- (Asegurarse que los botones existen)
    const btnBackServicio = document.getElementById('back-servicio');
    const btnBackFecha = document.getElementById('back-fecha');
    const btnBackHorario = document.getElementById('back-horario');
    const btnBackFormulario = document.getElementById('back-formulario');

    if(btnBackServicio) btnBackServicio.addEventListener('click', () => {
        if (stepFecha) stepFecha.style.display = 'none';
        if (stepServicio) stepServicio.style.display = 'block';
    });
    if(btnBackFecha) btnBackFecha.addEventListener('click', () => {
        if (stepHorarios) stepHorarios.style.display = 'none';
        if (stepFecha) stepFecha.style.display = 'block';
    });
    if(btnBackHorario) btnBackHorario.addEventListener('click', () => {
        if (stepFormulario) stepFormulario.style.display = 'none';
        if (stepHorarios) stepHorarios.style.display = 'block';
    });
    if(btnBackFormulario) btnBackFormulario.addEventListener('click', () => {
        if (stepAdvertencia) stepAdvertencia.style.display = 'none';
        if (stepFormulario) stepFormulario.style.display = 'block';
    });

    // Paso 4: Enviar Formulario (Submit lleva a advertencia)
    if(stepFormulario) stepFormulario.addEventListener('submit', (e) => {
        e.preventDefault();
        // Validar que los campos existan antes de leerlos
        const nombreInput = document.getElementById('nombre');
        const rutInput = document.getElementById('rut');
        const telefonoInput = document.getElementById('telefono');

        datosReserva.nombre = nombreInput ? nombreInput.value : '';
        datosReserva.rut = rutInput ? rutInput.value : '';
        datosReserva.telefono = telefonoInput ? telefonoInput.value : '';

        // Avanzar a advertencia
        stepFormulario.style.display = 'none';
        if (stepAdvertencia) stepAdvertencia.style.display = 'block';
    });

    // --- LÓGICA DE ENVÍO FINAL AL SERVIDOR ---
    const btnConfirmar = document.getElementById('confirmar-reserva');
    if (btnConfirmar) {
        btnConfirmar.addEventListener('click', async () => {
            // Revalidar datos esenciales antes de enviar
            if (!datosReserva.nombre || !datosReserva.servicio || !datosReserva.fecha || !datosReserva.hora || !datosReserva.area_servicio) {
                alert('Faltan datos esenciales en la reserva. Revisa los pasos anteriores.');
                // Volver al formulario si faltan datos
                if (stepAdvertencia) stepAdvertencia.style.display = 'none';
                if (stepFormulario) stepFormulario.style.display = 'block';
                return;
            }

            console.log("Enviando reserva:", datosReserva); // Log

            try {
                const respuesta = await fetch(`${API_BASE_URL}/api/reservas`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(datosReserva),
                });
                const resultado = await respuesta.json().catch(async () => ({ message: await respuesta.text() || `Error ${respuesta.status}`}));

                if (respuesta.ok && resultado.success) { // Asume backend envía { success: true, ... }
                    if (stepAdvertencia) stepAdvertencia.style.display = 'none';
                    if (stepExito) stepExito.style.display = 'block';
                    // Llenar mensaje de éxito si es necesario
                    // const exitoMsg = stepExito.querySelector('p'); // Asumiendo que hay un <p>
                    // if (exitoMsg) exitoMsg.textContent = `¡Gracias por tu reserva, ${datosReserva.nombre}! Serás redirigido...`;

                    setTimeout(() => { window.location.href = 'servicios.html'; }, 3000);
                } else {
                    alert('Error del servidor: ' + (resultado.message || `No se pudo completar la reserva (Estado ${respuesta.status})`));
                }
            } catch (error) {
                console.error('Error de red al enviar la reserva:', error);
                alert('No se pudo conectar con el servidor. Intenta más tarde.');
            }
        });
    } else {
        console.error("Botón 'confirmar-reserva' no encontrado.");
    }

    // --- CARGA INICIAL ---
    loadServices(); // Carga servicios y luego intenta preseleccionar

}); // Fin DOMContentLoaded