// ===== Botón hamburguesa =====
const menuToggle = document.getElementById('menu-toggle');
const navMenu = document.getElementById('menu');

menuToggle.addEventListener('click', () => {
  navMenu.classList.toggle('open');
  menuToggle.classList.toggle('open');
});

document.addEventListener("DOMContentLoaded", () => {
  const normalLinks = document.querySelectorAll(".menu-normal");
  const adminLinks = document.querySelectorAll(".menu-admin");
  const logoutBtn = document.getElementById("logout");

  // ✅ Verificar si el usuario está logueado (usando tu key real)
  const isLoggedIn = !!localStorage.getItem("authToken");

  // Mostrar/ocultar enlaces según estado de sesión
  if (isLoggedIn) {
    normalLinks.forEach(link => link.classList.add("hidden"));
    adminLinks.forEach(link => link.classList.remove("hidden"));
  } else {
    normalLinks.forEach(link => link.classList.remove("hidden"));
    adminLinks.forEach(link => link.classList.add("hidden"));
  }

  // Cerrar sesión
  if (logoutBtn) {
    logoutBtn.addEventListener("click", (e) => {
      e.preventDefault();
      localStorage.removeItem("authToken");
      alert("✅ Sesión cerrada correctamente.");
      window.location.href = "index.html";
    });
  }
});
