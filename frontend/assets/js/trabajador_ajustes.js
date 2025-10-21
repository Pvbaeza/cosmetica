// --- LÓGICA DE ENTORNO AUTOMÁTICO ---
const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const API_BASE_URL = isLocal 
    ? 'http://localhost:3000' // URL para desarrollo local
    : 'https://cosmeticabackend-dqxh.onrender.com'; // URL para producción

document.addEventListener('DOMContentLoaded', () => {

    // --- ELEMENTOS DEL DOM (Perfil) ---
    const profileName = document.getElementById('profile-name');
    const profileUsername = document.getElementById('profile-username');
    const profileEmail = document.getElementById('profile-email');
    const profileArea = document.getElementById('profile-area');

    // --- ELEMENTOS DEL DOM (Cambiar Contraseña) ---
    const changePasswordCard = document.getElementById('cambiar-contrasena');
    const changePasswordTitle = changePasswordCard?.querySelector('.collapsible-title');
    const changePasswordContent = changePasswordCard?.querySelector('.collapsible-content');
    const changePasswordForm = document.getElementById('change-password-form');
    const currentPasswordInput = document.getElementById('current-password');
    const newPasswordInput = document.getElementById('new-password');
    const confirmNewPasswordInput = document.getElementById('confirm-new-password');
    const changePasswordError = document.getElementById('change-password-error');
    
    // --- ELEMENTO DEL DOM (Logout) ---
    const logoutButton = document.getElementById('logout');
    
    // Obtenemos el token para todas las peticiones
    const token = localStorage.getItem('authToken');

    // --- FUNCIÓN PARA OBTENER DATOS DEL USUARIO ---
    const fetchUserProfile = async () => {
        if (!token) {
            console.error('No hay token, redirigiendo a login.');
            window.location.href = 'login.html';
            return;
        }

        try {
            // ¡ESTE ENDPOINT ES NUEVO! Debes crearlo en tu backend.
            const userResponse = await fetch(`${API_BASE_URL}/api/trabajador/perfil`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (userResponse.status === 401 || userResponse.status === 403) {
                // Token inválido o expirado
                localStorage.removeItem('authToken');
                localStorage.removeItem('userArea');
                alert('Tu sesión ha expirado. Por favor, inicia sesión de nuevo.');
                window.location.href = 'login.html';
                return;
            }

            if (!userResponse.ok) {
                throw new Error('No se pudo obtener el perfil del trabajador.');
            }
            
            const userData = await userResponse.json();
            
            // Llenamos la información del perfil
            if (profileName) profileName.textContent = userData.nombre_completo || 'No disponible';
            if (profileUsername) profileUsername.textContent = userData.username || 'No disponible';
            if (profileEmail) profileEmail.textContent = userData.Correo || 'No disponible';
            if (profileArea) profileArea.textContent = userData.nombre_area || 'No asignada';

        } catch (error) {
            console.error('Error al cargar datos iniciales:', error);
            if(profileName) profileName.innerHTML = `<span class="error-msg">${error.message}</span>`;
            // Oculta el resto para evitar confusiones
            if (profileUsername) profileUsername.textContent = '...';
            if (profileEmail) profileEmail.textContent = '...';
            if (profileArea) profileArea.textContent = '...';
        }
    };

    // --- LÓGICA COLAPSABLE PARA CAMBIAR CONTRASEÑA ---
    if (changePasswordTitle && changePasswordContent) {
        changePasswordTitle.addEventListener('click', () => {
            changePasswordContent.classList.toggle('active');
            changePasswordTitle.classList.toggle('active');
            const icon = changePasswordTitle.querySelector('.toggle-icon');
            icon.classList.toggle('fa-chevron-down');
            icon.classList.toggle('fa-chevron-up');
        });
    }

    // --- LÓGICA FORMULARIO CAMBIAR CONTRASEÑA ---
    if (changePasswordForm) {
        changePasswordForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            if (changePasswordError) changePasswordError.style.display = 'none';

            const newPassword = newPasswordInput.value;
            const currentPassword = currentPasswordInput.value;
            
            if (newPassword !== confirmNewPasswordInput.value) {
                if (changePasswordError) {
                    changePasswordError.textContent = 'Las contraseñas nuevas no coinciden.';
                    changePasswordError.style.display = 'block';
                }
                return;
            }
            
            if (newPassword.length < 6) { // Validación simple
                 if (changePasswordError) {
                    changePasswordError.textContent = 'La nueva contraseña debe tener al menos 6 caracteres.';
                    changePasswordError.style.display = 'block';
                }
                return;
            }

            try {
                // ¡ESTE ENDPOINT ES NUEVO! Debes crearlo en tu backend.
                const response = await fetch(`${API_BASE_URL}/api/trabajador/cambiar-contrasena`, {
                    method: 'PUT',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ 
                        currentPassword: currentPassword, 
                        newPassword: newPassword 
                    })
                });
                const result = await response.json();
                if (!response.ok) throw new Error(result.message);
                
                alert(result.message || 'Contraseña cambiada con éxito.');
                changePasswordForm.reset();
                if (changePasswordContent) changePasswordContent.classList.remove('active'); // Cierra el colapsable
            } catch(error) {
                alert("No se pudo cambiar la contraseña: " + error.message);
            }
        });
    }
    
    // --- LÓGICA DE LOGOUT ---
    if (logoutButton) {
        logoutButton.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('authToken');
            localStorage.removeItem('userArea');
            window.location.href = 'login.html';
        });
    }

    // --- CARGA INICIAL ---
    fetchUserProfile();
});