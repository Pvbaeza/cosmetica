// assets/js/servicios.js — Filtro por área corregido con normalización robusta

// --- LÓGICA DE ENTORNO AUTOMÁTICO ---
const isLocal =
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1';

const API_BASE_URL = isLocal
  ? 'http://localhost:3000'
  : 'https://cosmeticabackend-dqxh.onrender.com';

document.addEventListener('DOMContentLoaded', () => {
  // --- ELEMENTOS DEL DOM ---
  const servicesContainer = document.getElementById('servicios');
  const areaFilterSelect  = document.getElementById('area-filter'); // Select de área
  const searchInput       = document.getElementById('search-input'); // Input de búsqueda
  const loadingMessage    = document.querySelector('.loading-message'); // Mensaje "Cargando..."

  let allServices = []; // Todos los servicios
  let areaMap     = new Map(); // clave normalizada -> etiqueta visible

  // --- Helpers de normalización ---
  const norm = (str) =>
    (str || '')
      .toString()
      .normalize('NFD')                    // separa diacríticos
      .replace(/[\u0300-\u036f]/g, '')    // elimina tildes
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ');              // colapsa espacios

  const getAreaRaw = (s) =>
    s?.tipo_trabajador ?? s?.nombre_area ?? s?.area ?? '';

  const getAreaKey = (s) => norm(getAreaRaw(s));

  // --- RENDERIZAR TARJETAS ---
  const renderServices = (servicesToRender) => {
    if (!servicesContainer) {
      console.error("Contenedor 'servicios' no encontrado.");
      return;
    }
    servicesContainer.innerHTML = ''; // Limpiar contenedor

    if (!servicesToRender || servicesToRender.length === 0) {
      servicesContainer.innerHTML =
        '<p class="empty-message">No se encontraron servicios que coincidan con los filtros.</p>';
      return;
    }

    servicesToRender.forEach((service) => {
      const serviceCard = document.createElement('div');
      serviceCard.classList.add('servicio-card');
      // útil para debug o estilos futuros:
      serviceCard.dataset.area = getAreaKey(service);

      // Imagen (Cloudinary o relativa al backend)
      let imageUrl;
      if (service.imagen_url && service.imagen_url.startsWith('http')) {
        imageUrl = service.imagen_url;
      } else if (service.imagen_url) {
        imageUrl = `${API_BASE_URL}/${service.imagen_url}`;
      } else {
        imageUrl = 'https://via.placeholder.com/400x225?text=Servicio';
      }

      // Precio CLP
      const valorNumerico    = Number(service.valor || 0);
      const precioFormateado = valorNumerico.toLocaleString('es-CL', {
        style: 'currency',
        currency: 'CLP',
      });

      const reservaUrl = `reserva.html?servicio=${encodeURIComponent(
        service.titulo || ''
      )}`;

      serviceCard.innerHTML = `
        <div class="servicio-img">
          <img src="${imageUrl}" alt="Imagen de ${service.titulo || 'Servicio'}">
        </div>
        <div class="servicio-info">
          <h2 class="servicio-titulo">${service.titulo || 'Servicio sin título'}</h2>
          <h4 class="servicio-subtitulo">${service.subtitulo || ''}</h4>
          <p>${service.descripcion || 'Descripción no disponible.'}</p>
          <a href="${reservaUrl}" class="btn-reservar">Reservar por ${precioFormateado}</a>
        </div>
      `;
      servicesContainer.appendChild(serviceCard);
    });
  };

  // --- POBLAR SELECT DE ÁREAS (evita duplicados con tildes/espacios) ---
  const populateAreaFilter = (services) => {
    if (!areaFilterSelect) return;

    areaMap = new Map(); // Reinicia

    services.forEach((service) => {
      const raw = getAreaRaw(service);
      const key = norm(raw);
      if (!key || key === 'admin') return; // excluye admin
      if (!areaMap.has(key)) {
        // Guarda primera etiqueta “humana” encontrada
        areaMap.set(key, (raw || '').toString().trim());
      }
    });

    // Reconstruye el select
    const previous = areaFilterSelect.value || 'todos';
    areaFilterSelect.innerHTML =
      '<option value="todos">Mostrar Todas</option>';

    // Ordenar por etiqueta visible (ignorando tildes)
    const ordenadas = Array.from(areaMap.entries()).sort((a, b) =>
      a[1].normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .localeCompare(
          b[1].normalize('NFD').replace(/[\u0300-\u036f]/g, ''),
          'es',
          { sensitivity: 'base' }
        )
    );

    ordenadas.forEach(([key, label]) => {
      const opt = document.createElement('option');
      opt.value = key;   // valor normalizado
      opt.textContent = label; // etiqueta visible con tildes
      areaFilterSelect.appendChild(opt);
    });

    // Restaura selección si existe
    const existe = Array.from(areaFilterSelect.options).some(
      (o) => o.value === previous
    );
    areaFilterSelect.value = existe ? previous : 'todos';
  };

  // --- FILTRAR POR ÁREA + BÚSQUEDA ---
  const filterServices = () => {
    const selectedKey = areaFilterSelect ? areaFilterSelect.value : 'todos';
    const q = searchInput ? norm(searchInput.value) : '';

    let filtered = allServices;

    // Área
    if (selectedKey !== 'todos') {
      filtered = filtered.filter((s) => getAreaKey(s) === selectedKey);
    } else {
      // En "todas": excluye admin por defecto
      filtered = filtered.filter((s) => getAreaKey(s) !== 'admin');
    }

    // Búsqueda (normalizada: quita tildes, etc.)
    if (q) {
      filtered = filtered.filter((s) => {
        const titulo = norm(s.titulo);
        const desc   = norm(s.descripcion);
        const sub    = norm(s.subtitulo);
        return (
          (titulo && titulo.includes(q)) ||
          (desc && desc.includes(q)) ||
          (sub && sub.includes(q))
        );
      });
    }

    renderServices(filtered);
  };

  // --- CARGA INICIAL ---
  const fetchAndSetupServices = async () => {
    try {
      if (loadingMessage) loadingMessage.style.display = 'block';
      if (servicesContainer) servicesContainer.innerHTML = '';

      const response = await fetch(`${API_BASE_URL}/api/servicios`);
      if (!response.ok) throw new Error('No se pudo conectar al servidor.');
      allServices = await response.json();

      if (loadingMessage) loadingMessage.style.display = 'none';

      populateAreaFilter(allServices);
      filterServices();

      // Listeners
      areaFilterSelect?.addEventListener('change', filterServices);
      searchInput?.addEventListener('input', filterServices);
    } catch (error) {
      console.error('Error al cargar los servicios:', error);
      if (loadingMessage) loadingMessage.style.display = 'none';
      if (servicesContainer) {
        servicesContainer.innerHTML = `<p class="error-message">Ocurrió un error: ${error.message}. Inténtalo más tarde.</p>`;
      }
    }
  };

  fetchAndSetupServices();
});







// flecha para volver al arriba

window.addEventListener("scroll", function() {
  const btn = document.getElementById("btnScrollTop");
  if (document.body.scrollTop > 300 || document.documentElement.scrollTop > 300) {
    btn.style.display = "flex";
  } else {
    btn.style.display = "none";
  }
});

document.getElementById("btnScrollTop").addEventListener("click", function() {
  window.scrollTo({ top: 0, behavior: "smooth" });
});
