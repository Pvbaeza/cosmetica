// --- LÓGICA DE ENTORNO AUTOMÁTICO ---
// Detecta si estamos en localhost o en el servidor de Render
const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const API_BASE_URL = isLocal 
    ? 'http://localhost:3000' // URL para desarrollo local
    : 'https://cosmetica-cvsi.onrender.com'; // URL para producción

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

                    // Guardamos el token en el almacenamiento local del navegador.
                    localStorage.setItem('authToken', resultado.token);

                    // Redirigimos al usuario a la página de administración.
                    window.location.href = 'admin_reservas.html'; // Cambiado a admin_reservas como página principal
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

