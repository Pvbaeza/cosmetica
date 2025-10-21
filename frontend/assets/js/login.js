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

                    // 5. Comparamos la variable
                    if (areaDelUsuario == 7) { 
                        window.location.href = 'admin_reservas.html';
                    } else {
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
