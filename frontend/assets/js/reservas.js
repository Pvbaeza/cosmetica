// Archivo: assets/js/reservas.js

document.addEventListener('DOMContentLoaded', () => {
    // --- 1. OBTENER ELEMENTOS DEL DOM ---
    const stepServicio = document.getElementById('step-servicio'); // ¡NUEVO!
    const stepFecha = document.getElementById('step-fecha');
    const stepHorarios = document.getElementById('step-horarios');
    const stepFormulario = document.getElementById('step-formulario');
    const stepAdvertencia = document.getElementById('step-advertencia');
    const stepExito = document.getElementById('step-exito');

    const servicioSeleccionadoSpan = document.getElementById('servicio-seleccionado'); // ¡NUEVO!
    const fechaSeleccionadaSpan = document.getElementById('fecha-seleccionada');
    const horarioSeleccionadoSpan = document.getElementById('horario-seleccionado');
    const horarioBotones = document.querySelectorAll('.horario-btn');
    
    const serviceSelect = document.getElementById('servicio');

    // Objeto para guardar los datos de la reserva
    let datosReserva = {};
    
    // --- FUNCIÓN PARA CARGAR SERVICIOS --- (Sin cambios)
    const loadServices = async () => {
        try {
            const response = await fetch('http://localhost:3000/api/servicios');
            if (!response.ok) throw new Error('No se pudieron cargar los servicios.');
            const services = await response.json();

            serviceSelect.innerHTML = '<option value="" disabled selected>Selecciona un servicio</option>';

            services.forEach(service => {
                const option = document.createElement('option');
                option.value = service.titulo;
                option.textContent = `${service.titulo} ($${Number(service.valor).toLocaleString('es-CL')})`;
                // Guardamos el rol (peluquero/cosmetologo) en el dataset
                option.dataset.area = service.tipo_trabajador; 
                serviceSelect.appendChild(option);
            });
        } catch (error) {
            console.error(error);
            serviceSelect.innerHTML = '<option value="">Error al cargar servicios</option>';
        }
    };

    // --- FUNCIÓN PARA VERIFICAR DISPONIBILIDAD --- (¡MODIFICADA!)
    async function consultarYActualizarHorarios(fechaSeleccionada, areaServicio) {
        horarioBotones.forEach(btn => {
            btn.disabled = true;
            btn.textContent = 'Cargando...';
            btn.classList.remove('ocupado');
        });

        // ¡IMPORTANTE! Tu API debe ser actualizada para aceptar el parámetro "area"
        // La consulta ahora envía la fecha Y el rol (área)
        try {
            const respuesta = await fetch(`http://localhost:3000/api/horarios-ocupados?fecha=${fechaSeleccionada}&area=${areaServicio}`);
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
            alert("No se pudo verificar la disponibilidad de horarios en este momento.");
            // ... (manejo de error sin cambios)
        }
    }

    // --- 2. LÓGICA DE LA INTERFAZ DE PASOS (UI) --- (¡MODIFICADA!)

    // ¡NUEVO! Paso 1: Seleccionar Servicio
    serviceSelect.addEventListener('change', () => {
        const selectedOption = serviceSelect.options[serviceSelect.selectedIndex];
        
        datosReserva.servicio = selectedOption.value;
        datosReserva.area_servicio = selectedOption.dataset.area; // ¡Guardamos el rol (área) aquí!
        
        servicioSeleccionadoSpan.textContent = datosReserva.servicio;

        stepServicio.style.display = 'none';
        stepFecha.style.display = 'block';
    });

    // Paso 2: Seleccionar Fecha
    flatpickr("#calendario-inline", {
        inline: true,
        dateFormat: "Y-m-d",
        minDate: "today",
        locale: "es",
        onChange: function(selectedDates, dateStr) {
            datosReserva.fecha = dateStr;
            fechaSeleccionadaSpan.textContent = dateStr;
            stepFecha.style.display = 'none';
            stepHorarios.style.display = 'block';
            
            // ¡MODIFICADO! Ahora pasamos el rol (área) a la función de consulta
            consultarYActualizarHorarios(datosReserva.fecha, datosReserva.area_servicio);
        }
    });

    // Paso 3: Seleccionar Horario
    horarioBotones.forEach(btn => {
        btn.addEventListener('click', () => {
            datosReserva.hora = btn.dataset.hora;
            horarioSeleccionadoSpan.textContent = datosReserva.hora;
            stepHorarios.style.display = 'none';
            stepFormulario.style.display = 'block';
        });
    });

    // --- Botones "Volver" ---
    
    // ¡NUEVO! Volver del calendario al selector de servicio
    document.getElementById('back-servicio').addEventListener('click', () => {
        stepFecha.style.display = 'none';
        stepServicio.style.display = 'block';
    });
    
    document.getElementById('back-fecha').addEventListener('click', () => {
        stepHorarios.style.display = 'none';
        stepFecha.style.display = 'block';
    });
    
    document.getElementById('back-horario').addEventListener('click', () => {
        stepFormulario.style.display = 'none';
        stepHorarios.style.display = 'block';
    });
    
    document.getElementById('back-formulario').addEventListener('click', () => {
        stepAdvertencia.style.display = 'none';
        stepFormulario.style.display = 'block';
    });

    // Paso 4: Enviar Formulario (lleva a la advertencia)
    stepFormulario.addEventListener('submit', (e) => {
        e.preventDefault();
        // Guardamos los datos del formulario en el objeto
        datosReserva.nombre = document.getElementById('nombre').value;
        datosReserva.rut = document.getElementById('rut').value;
        datosReserva.telefono = document.getElementById('telefono').value;
        
        stepFormulario.style.display = 'none';
        stepAdvertencia.style.display = 'block';
    });

    // --- 3. LÓGICA DE ENVÍO AL SERVIDOR ---
    document.getElementById('confirmar-reserva').addEventListener('click', async () => {
        
        // ¡MODIFICADO! Los datos ya están en 'datosReserva', no hay que leerlos del formulario de nuevo
        if (!datosReserva.nombre || !datosReserva.servicio || !datosReserva.fecha || !datosReserva.hora) {
            alert('Faltan datos en la reserva. Por favor, vuelve atrás y completa todo.');
            return;
        }
        
        try {
            const respuesta = await fetch('http://localhost:3000/api/reservas', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(datosReserva), // 'datosReserva' ya tiene todo (incluida el área)
            });
            const resultado = await respuesta.json();
            if (resultado.success) {
                stepAdvertencia.style.display = 'none';
                stepExito.style.display = 'block';
                
                setTimeout(() => {
                    window.location.href = 'servicios.html';
                }, 3000);
            } else {
                alert('Error del servidor: ' + resultado.message);
            }
        } catch (error) {
            console.error('Error de red al enviar la reserva:', error);
            alert('No se pudo conectar con el servidor. Intenta más tarde.');
        }
    });
    
    // --- CARGA INICIAL ---
    loadServices();
});