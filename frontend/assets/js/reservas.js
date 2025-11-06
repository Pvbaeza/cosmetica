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
    const btnContinuarFecha = document.getElementById('btn-continuar-fecha');

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

                // --- ¡CORRECCIÓN #1! ---
                // Usamos 'nombre_area' (del JOIN) en lugar de 'tipo_trabajador'
                if (service.nombre_area?.toLowerCase() === 'admin') return;

                const option = document.createElement('option');

                // --- ¡CORRECCIÓN #2! ---
                // El 'value' debe ser el ID del servicio (id_servicio)
                option.value = service.id_servicio;
                option.textContent = `${service.titulo} ($${Number(service.valor || 0).toLocaleString('es-CL')})`;

                // Guardamos el ID del área y el Título en el dataset
                option.dataset.areaId = service.id_area;
                option.dataset.titulo = service.titulo; // Para el resumen
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
            console.log("Intentando preseleccionar servicio:", servicioParam);

            // --- ¡CORRECCIÓN #3! ---
            // Buscamos la opción por 'dataset.titulo', no por 'value'
            const optionToSelect = Array.from(serviceSelect.options).find(opt => opt.dataset.titulo === servicioParam);

            if (optionToSelect) {
                optionToSelect.selected = true;
                console.log("Opción encontrada y seleccionada.");

                // Guardamos los datos correctos (IDs y el nombre para el resumen)
                datosReserva.id_servicio = optionToSelect.value;
                datosReserva.id_area = optionToSelect.dataset.areaId;
                datosReserva.nombre_servicio = optionToSelect.dataset.titulo; // Guardamos el nombre

                if (servicioSeleccionadoSpan) servicioSeleccionadoSpan.textContent = datosReserva.nombre_servicio;
                console.log("Datos de reserva actualizados por preselección:", datosReserva);

            } else {
                console.warn(`Servicio "${servicioParam}" de la URL no encontrado en las opciones.`);
            }
        } else {
            console.log("No hay parámetro 'servicio' en la URL para preseleccionar.");
        }
    };

    // --- FUNCIÓN PARA VERIFICAR DISPONIBILIDAD ---
    async function consultarYActualizarHorarios(fechaSeleccionada, areaId) {
        // ¡Ahora 'areaId' es el ID numérico!
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
            // --- ¡CORRECCIÓN #4! ---
            // El backend espera 'id_area', no 'area'
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

    // --- LÓGICA DE LA INTERFAZ DE PASOS (UI) ---

    // Paso 1: Seleccionar Servicio
    if (serviceSelect) {
        serviceSelect.addEventListener('change', () => {
            const selectedOption = serviceSelect.options[serviceSelect.selectedIndex];
            if (!selectedOption || !selectedOption.value) {
                // Limpiar datos
                datosReserva.id_servicio = undefined;
                datosReserva.id_area = undefined;
                datosReserva.nombre_servicio = undefined;
                if (servicioSeleccionadoSpan) servicioSeleccionadoSpan.textContent = '';
                console.log("Selección de servicio inválida o reseteada.");
                return;
            }

            // Guardar los datos del servicio seleccionado
            datosReserva.id_servicio = selectedOption.value; // ID del servicio
            datosReserva.id_area = selectedOption.dataset.areaId; // ID del área
            datosReserva.nombre_servicio = selectedOption.dataset.titulo; // Nombre para el resumen

            if (servicioSeleccionadoSpan) servicioSeleccionadoSpan.textContent = datosReserva.nombre_servicio;
            console.log("Servicio seleccionado manualmente:", datosReserva);
        });
    } else {
        console.error("Elemento select 'servicio' no encontrado.");
    }

    // --- LISTENER PARA EL BOTÓN CONTINUAR A FECHA ---
    if (btnContinuarFecha) {
        btnContinuarFecha.addEventListener('click', () => {
            // Verificar si se ha seleccionado un servicio válido (ahora chequea id_servicio)
            if (!datosReserva.id_servicio || !serviceSelect.value) {
                alert("Por favor, selecciona un servicio antes de continuar.");
                if (serviceSelect) serviceSelect.focus();
                return;
            }
            console.log("Continuando a selección de fecha...");
            if (stepServicio) stepServicio.style.display = 'none';
            if (stepFecha) stepFecha.style.display = 'block';
        });
    } else {
        console.error("Botón 'btn-continuar-fecha' no encontrado en el HTML.");
    }


    // Paso 2: Seleccionar Fecha (Inicializa Flatpickr)
    if (document.getElementById('calendario-inline') && typeof flatpickr === 'function') {
  flatpickr('#calendario-inline', {
    inline: true,
    showMonths: 1,          // Forzamos 1 mes
    disableMobile: true,    // Mismo look en móvil
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
} else {
  console.error("'calendario-inline' o Flatpickr no encontrados.");
}

    // Paso 3: Seleccionar Horario
    horarioBotones.forEach(btn => {
        btn.addEventListener('click', () => {
            datosReserva.hora = btn.dataset.hora;
            if (horarioSeleccionadoSpan) horarioSeleccionadoSpan.textContent = datosReserva.hora;

            if (stepHorarios) stepHorarios.style.display = 'none';
            if (stepFormulario) stepFormulario.style.display = 'block';
        });
    });

    // --- Botones "Volver" ---
    const btnBackServicio = document.getElementById('back-servicio');
    const btnBackFecha = document.getElementById('back-fecha');
    const btnBackHorario = document.getElementById('back-horario');
    const btnBackFormulario = document.getElementById('back-formulario');

    if (btnBackServicio) btnBackServicio.addEventListener('click', () => {
        if (stepFecha) stepFecha.style.display = 'none';
        if (stepServicio) stepServicio.style.display = 'block';
    });
    if (btnBackFecha) btnBackFecha.addEventListener('click', () => {
        if (stepHorarios) stepHorarios.style.display = 'none';
        if (stepFecha) stepFecha.style.display = 'block';
    });
    if (btnBackHorario) btnBackHorario.addEventListener('click', () => {
        if (stepFormulario) stepFormulario.style.display = 'none';
        if (stepHorarios) stepHorarios.style.display = 'block';
    });
    if (btnBackFormulario) btnBackFormulario.addEventListener('click', () => {
        if (stepAdvertencia) stepAdvertencia.style.display = 'none';
        if (stepFormulario) stepFormulario.style.display = 'block';
    });

    // Paso 4: Enviar Formulario (Submit lleva a advertencia)
    if (stepFormulario) stepFormulario.addEventListener('submit', (e) => {
        e.preventDefault();
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

            // --- ¡CORRECCIÓN #5! ---
            // Revalidar que los IDs existan, no los nombres
            if (!datosReserva.nombre || !datosReserva.id_servicio || !datosReserva.fecha || !datosReserva.hora || !datosReserva.id_area) {
                alert('Faltan datos esenciales en la reserva. Revisa los pasos anteriores.');
                if (stepAdvertencia) stepAdvertencia.style.display = 'none';
                if (stepFormulario) stepFormulario.style.display = 'block';
                return;
            }

            // Creamos el objeto de datos FINAL que espera el backend
            const datosParaEnviar = {
                nombre: datosReserva.nombre,
                rut: datosReserva.rut,
                telefono: datosReserva.telefono,
                id_servicio: datosReserva.id_servicio, // ID numérico
                fecha: datosReserva.fecha,
                hora: datosReserva.hora,
                id_area: datosReserva.id_area // ID numérico
            };

            console.log("Enviando reserva:", datosParaEnviar);

            try {
                const respuesta = await fetch(`${API_BASE_URL}/api/reservas`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(datosParaEnviar), // ¡Enviamos el objeto limpio!
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
    } else {
        console.error("Botón 'confirmar-reserva' no encontrado.");
    }

    // --- CARGA INICIAL ---
    loadServices(); // Carga servicios y luego intenta preseleccionar

}); // Fin DOMContentLoaded