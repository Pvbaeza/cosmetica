// --- LÓGICA DE ENTORNO AUTOMÁTICO ---
// Detecta si estamos en localhost o en el servidor de Render
const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const API_BASE_URL = isLocal 
    ? 'http://localhost:3000' // URL para desarrollo local
    : 'https://cosmeticabackend-dqxh.onrender.com'; // URL para producción

document.addEventListener('DOMContentLoaded', () => {
    // Seleccionamos el formulario por el ID que le pusimos en el HTML
    const loginForm = document.getElementById('login-form');

    if (loginForm) {
        // Añadimos un "escuchador" para cuando se intente enviar el formulario
        loginForm.addEventListener('submit', async (event) => {
            // Prevenimos que la página se recargue, que es el comportamiento por defecto
            event.preventDefault();

            // Obtenemos los valores que el usuario escribió en los campos
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;

            try {
                // Usamos fetch para enviar los datos a la ruta /api/login de nuestro servidor
                const respuesta = await fetch(`${API_BASE_URL}/api/login`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ username, password })
                });

                const resultado = await respuesta.json();

                // 1. Muestra en la consola (F12) la respuesta COMPLETA del backend
                console.log('Respuesta COMPLETA del backend:', resultado); 

                if (resultado.success) {
                    // Si el servidor nos dice que todo salió bien...
                    alert(resultado.message); 

                    // 2. Guardamos el token
                    localStorage.setItem('authToken', resultado.token);
                    

                    // --- INICIO DE LA CORRECCIÓN ---
                    // CAMBIA 'resultado.id_area' POR EL NOMBRE CORRECTO QUE VISTE EN LA CONSOLA
                    
                    const areaDelUsuario = resultado.id_area; // <--- CAMBIA ESTO (Ej: resultado.rol_id)
                    
                    // 3. Guardamos el área del usuario en localStorage
                    localStorage.setItem('userArea', areaDelUsuario);
                    
                    // 4. Mostramos un alert para verificar
                    alert('El id_area de este usuario es: ' + areaDelUsuario);

                    // 5. Comparamos la variable
                    if (areaDelUsuario == 7) { 
                        alert('Rol detectado: ADMIN (7). Redirigiendo a panel de admin...');
                        window.location.href = 'admin_reservas.html';
                    } else {
                        alert('Rol detectado: TRABAJADOR (Valor: ' + areaDelUsuario + '). Redirigiendo a panel de trabajador...');
                        window.location.href = 'trabajador_reserva.html'; 
                    }
                    // --- FIN DE LA CORRECCIÓN ---
                
                } else {
                    // Si el servidor nos dice que hubo un error, mostramos el mensaje que nos envió.
                    alert(resultado.message);
                }

            } catch (error) {
                // Si hay un error de red (ej: el servidor está apagado), lo capturamos aquí.
                console.error('Error al intentar iniciar sesión:', error);
                alert('No se pudo conectar con el servidor. Intenta más tarde.');
            }
        });
    }
});