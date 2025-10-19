// Archivo: assets/js/login.js

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
                const respuesta = await fetch('http://localhost:3000/api/login', {
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

                    // --- ¡ESTA ES LA LÍNEA NUEVA Y MÁS IMPORTANTE! ---
                    // Guardamos el token en el almacenamiento local del navegador.
                    localStorage.setItem('authToken', resultado.token);
                    // ----------------------------------------------------

                    // Ahora sí, redirigimos al usuario a la página de administración.
                    window.location.href = 'admin_resenas.html';
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

