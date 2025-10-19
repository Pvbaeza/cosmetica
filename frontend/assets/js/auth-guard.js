// Archivo: assets/js/auth-guard.js

// Obtenemos el token que guardamos en el navegador después del login
const token = localStorage.getItem('authToken');

// Si NO hay un token, significa que el usuario no ha iniciado sesión.
if (!token) {
    // Lo redirigimos inmediatamente a la página de login.
    // Como la página está oculta por defecto, el usuario nunca verá el contenido.
    window.location.replace('login.html');
} else {
    // Si el token SÍ existe, hacemos visible el contenido de la página.
    // Esto evita el "parpadeo" del contenido antes de una posible redirección.
    document.body.style.display = 'block';
}

