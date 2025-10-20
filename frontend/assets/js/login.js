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

                // ¡REVISA LA CONSOLA! Esto te dirá la estructura real de la respuesta
                console.log('Respuesta del backend:', resultado); 

                // --- INICIO DE LA CORRECCIÓN ---
                if (resultado.success) {
                    // Si el servidor nos dice que todo salió bien...
                    alert(resultado.message); 

                    // 1. Guardamos el token (como ya hacías)
                    localStorage.setItem('authToken', resultado.token);
                    
                    // 2. ¡CORREGIDO! Leemos 'id_area' desde la raíz de 'resultado'
                    //    (Porque resultado.user era undefined)
                    localStorage.setItem('userArea', resultado.id_area);

                    // 3. ¡CORREGIDO! Comparamos 'id_area' desde la raíz de 'resultado'
                    // Comparamos el id_area (el 7 es el admin según tu tabla)
                    if (resultado.id_area === 7) {
                        // Es Admin, va a la página de admin
                        window.location.href = 'admin_reservas.html';
                    } else {
                        // Es otro trabajador (Área 3, 5, etc.)
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