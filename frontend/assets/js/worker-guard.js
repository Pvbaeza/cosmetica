// Obtenemos AMBOS datos del localStorage
const token = localStorage.getItem('authToken');
const userArea = localStorage.getItem('userArea'); // Esto será '7', '3', '5', etc.

// 1. Si NO hay token, no ha iniciado sesión
if (!token) {
    window.location.replace('login.html'); // Redirige a login
} 
// 2. Si HAY token, PERO el 'userArea' ES '7'
//    (localStorage guarda todo como texto, por eso comparamos con '7')
else if (userArea === '7') {
    // Es un admin. No debería estar en el panel de trabajador.
    // Lo mandamos a su panel de admin.
    window.location.replace('admin_reservas.html'); 
} 
// 3. Si HAY token Y el 'userArea' NO es '7'
else {
    // Es un trabajador (3, 5, etc.) y está en el lugar correcto. 
    // Mostramos la página.
    document.body.style.display = 'block';
}