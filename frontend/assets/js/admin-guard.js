// Obtenemos AMBOS datos del localStorage
const token = localStorage.getItem('authToken');
const userArea = localStorage.getItem('userArea'); // Esto será '7', '3', '5', etc.

// 1. Si NO hay token, no ha iniciado sesión
if (!token) {
    window.location.replace('login.html'); // Redirige a login
} 
// 2. Si HAY token, PERO el 'userArea' NO es '7'
//    (localStorage guarda todo como texto, por eso comparamos con '7')
else if (userArea !== '7') {
    // Es un usuario logueado, pero no es admin.
    // Lo sacamos de aquí y lo mandamos a la página de trabajador.
    // CAMBIA 'mis_reservas.html' si tu página de trabajador se llama diferente
    window.location.replace('mis_reservas.html'); 
} 
// 3. Si HAY token Y el 'userArea' SÍ es '7'
else {
    // Es admin y está en el lugar correcto. Mostramos la página.
    document.body.style.display = 'block';
}