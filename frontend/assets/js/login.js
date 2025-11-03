// login.js (versión funcional que guarda datos para `registrado_por`)

// --- LÓGICA DE ENTORNO AUTOMÁTICO ---
const isLocal = ['localhost', '127.0.0.1'].includes(window.location.hostname);
const API_BASE_URL = isLocal ? 'http://localhost:3000' : 'https://cosmeticabackend-dqxh.onrender.com';

document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('login-form');
  if (!loginForm) return;

  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const username = document.getElementById('username').value?.trim();
    const password = document.getElementById('password').value;

    try {
      const respuesta = await fetch(`${API_BASE_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const resultado = await respuesta.json();

      if (!resultado.success) {
        alert(resultado.message || 'Credenciales incorrectas.');
        return;
      }

      // --- Guarda token con AMBOS nombres para compatibilidad ---
      localStorage.setItem('authToken', resultado.token);
      localStorage.setItem('token', resultado.token); // muchos scripts leen "token"

      // --- Guarda identificadores para usar como `registrado_por` ---
      localStorage.setItem('username', username); // al menos el usuario ingresado

      // (Opcional) obtener nombre completo desde el perfil protegido
      try {
        const me = await fetch(`${API_BASE_URL}/api/trabajador/perfil`, {
          headers: { Authorization: `Bearer ${resultado.token}` }
        });
        if (me.ok) {
          const perfil = await me.json();
          if (perfil?.nombre_completo) {
            localStorage.setItem('nombre_completo', perfil.nombre_completo);
          }
          if (perfil?.username) {
            localStorage.setItem('username', perfil.username); // sobreescribe con el oficial
          }
        }
      } catch (_) {
        // si falla, seguimos con el username básico
      }

      // Área de usuario (para redirección)
      const areaDelUsuario = resultado.id_area; // tu backend ya envía id_area
      localStorage.setItem('userArea', areaDelUsuario);

      alert(resultado.message || 'Inicio de sesión exitoso.');

      // Redirección por área
      if (String(areaDelUsuario) === '7') {
        window.location.href = 'admin_reservas.html';
      } else {
        window.location.href = 'trabajador_reserva.html';
      }

    } catch (err) {
      console.error('Error al intentar iniciar sesión:', err);
      alert('No se pudo conectar con el servidor. Intenta más tarde.');
    }
  });
});
