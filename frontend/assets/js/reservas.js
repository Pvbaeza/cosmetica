// --- LÓGICA DE ENTORNO AUTOMÁTICO ---
// Detecta si estamos en localhost o en el servidor de Render
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

    let datosReserva = {};
    
    // --- FUNCIÓN PARA CARGAR SERVICIOS ---
    const loadServices = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/servicios`);
            if (!response.ok) throw new Error('No se pudieron cargar los servicios.');
            const services = await response.json();

            serviceSelect.innerHTML = '<option value="" disabled selected>Selecciona un servicio</option>';

            services.forEach(service => {
                const option = document.createElement('option');
                option.value = service.titulo;
                option.textContent = `${service.titulo} ($${Number(service.valor).toLocaleString('es-CL')})`;
                option.dataset.area = service.tipo_trabajador; 
                serviceSelect.appendChild(option);
            });
        } catch (error) {
            console.error(error);
            serviceSelect.innerHTML = '<option value="">Error al cargar servicios</option>';
        }
    };

    // --- FUNCIÓN PARA VERIFICAR DISPONIBILIDAD ---
    async function consultarYActualizarHorarios(fechaSeleccionada, areaServicio) {
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
        }
    }

    // --- LÓGICA DE LA INTERFAZ DE PASOS (UI) ---

    // Paso 1: Seleccionar Servicio
    serviceSelect.addEventListener('change', () => {
        const selectedOption = serviceSelect.options[serviceSelect.selectedIndex];
        
        datosReserva.servicio = selectedOption.value;
        datosReserva.area_servicio = selectedOption.dataset.area;
        
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
        datosReserva.nombre = document.getElementById('nombre').value;
        datosReserva.rut = document.getElementById('rut').value;
        datosReserva.telefono = document.getElementById('telefono').value;
        
        stepFormulario.style.display = 'none';
        stepAdvertencia.style.display = 'block';
    });

    // --- LÓGICA DE ENVÍO AL SERVIDOR ---
    document.getElementById('confirmar-reserva').addEventListener('click', async () => {
        
        if (!datosReserva.nombre || !datosReserva.servicio || !datosReserva.fecha || !datosReserva.hora) {
            alert('Faltan datos en la reserva. Por favor, vuelve atrás y completa todo.');
            return;
        }
        
        try {
            const respuesta = await fetch(`${API_BASE_URL}/api/reservas`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(datosReserva),
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

