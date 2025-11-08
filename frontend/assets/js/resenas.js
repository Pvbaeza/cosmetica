// --- LÓGICA DE ENTORNO AUTOMÁTICO ---
const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const API_BASE_URL = isLocal
  ? 'http://localhost:3000'
  : 'https://cosmeticabackend-dqxh.onrender.com';

// ===============================
// Utilidades Carrusel
// ===============================
function getSlidesPerView(width) {
  if (width >= 1024) return 3;  // desktop
  if (width >= 640)  return 2;  // tablet
  return 1;                      // móvil
}

function initReviewsCarousel() {
  const container = document.querySelector('.rv-carousel');
  if (!container) return;

  const viewport = container.querySelector('.rv-viewport');
  const track    = container.querySelector('.rv-track');
  const prevBtn  = container.querySelector('.rv-prev');
  const nextBtn  = container.querySelector('.rv-next');
  if (!viewport || !track) return;

  // Asegurar que las flechas NO actúen como submit en algunos navegadores
  prevBtn?.setAttribute('type', 'button');
  nextBtn?.setAttribute('type', 'button');

  // Restaurar HTML original para evitar clones acumulados en re-init
  if (!track.dataset.original) {
    track.dataset.original = track.innerHTML;
  } else {
    track.innerHTML = track.dataset.original;
  }

  const slides = Array.from(track.children);
  const originalCount = slides.length;

  const spv = getSlidesPerView(viewport.clientWidth);

  // Modo estático si no hay suficientes tarjetas
  if (originalCount <= spv) {
    container.classList.add('rv-static');
    if (prevBtn) prevBtn.onclick = null;
    if (nextBtn) nextBtn.onclick = null;
    track.style.transform = 'none';
    track.style.transition = 'none';
    return;
  } else {
    container.classList.remove('rv-static');
  }

  // Clonación para loop infinito
  const cloneCount = spv;
  const firstClones = slides.slice(0, cloneCount).map(n => n.cloneNode(true));
  const lastClones  = slides.slice(-cloneCount).map(n => n.cloneNode(true));

  lastClones.forEach(c => track.insertBefore(c, track.firstChild));
  firstClones.forEach(c => track.appendChild(c));

  const allSlides = Array.from(track.children);

  // Ancho de cada slide (ojo: tu CSS tiene padding lateral en .rv-slide)
  const slideWidth = viewport.clientWidth / spv;
  allSlides.forEach(s => {
    s.style.width = `${slideWidth}px`;
    s.style.flex = '0 0 auto';
  });

  let currentIndex = cloneCount; // posición inicial (primer real)
  let isAnimating  = false;

  // 🔧 FIX: solo marcar isAnimating si hay transición
  function goTo(index, opts = { smooth: true }) {
    track.style.transition = opts.smooth ? 'transform 400ms ease' : 'none';
    const translateX = -index * slideWidth;
    track.style.transform = `translate3d(${translateX}px,0,0)`;
    isAnimating = !!opts.smooth; // <- aquí el fix
  }

  // Posicionar sin animación
  goTo(currentIndex, { smooth: false });

  // Reajuste al terminar animaciones (loop infinito)
  track.ontransitionend = () => {
    isAnimating = false;

    if (currentIndex >= originalCount + cloneCount) {
      currentIndex -= originalCount;
      goTo(currentIndex, { smooth: false });
    }
    if (currentIndex < cloneCount) {
      currentIndex += originalCount;
      goTo(currentIndex, { smooth: false });
    }
  };

  // Navegación (paso de 1; si prefieres por “página”, usa += spv / -= spv)
  function next() {
    if (isAnimating) return;
    currentIndex += 1; // o += spv
    goTo(currentIndex, { smooth: true });
  }
  function prev() {
    if (isAnimating) return;
    currentIndex -= 1; // o -= spv
    goTo(currentIndex, { smooth: true });
  }

  nextBtn?.addEventListener('click', next);
  prevBtn?.addEventListener('click', prev);

  // Drag / Swipe
  let startX = 0, currentX = 0, dragging = false;

  function onPointerDown(e) {
    if (isAnimating) return;
    dragging = true;
    startX = (e.touches ? e.touches[0].clientX : e.clientX);
    currentX = startX;
    track.style.transition = 'none';
    container.classList.add('rv-grabbing');
  }
  function onPointerMove(e) {
    if (!dragging) return;
    currentX = (e.touches ? e.touches[0].clientX : e.clientX);
    const dx = currentX - startX;
    const baseX = -currentIndex * slideWidth;
    track.style.transform = `translate3d(${baseX + dx}px,0,0)`;
  }
  function onPointerUp() {
    if (!dragging) return;
    dragging = false;
    container.classList.remove('rv-grabbing');
    const dx = currentX - startX;

    if (Math.abs(dx) > slideWidth / 5) {
      if (dx < 0) currentIndex += 1; else currentIndex -= 1;
    }
    goTo(currentIndex, { smooth: true });
  }

  viewport.addEventListener('mousedown', onPointerDown);
  viewport.addEventListener('mousemove', onPointerMove);
  document.addEventListener('mouseup', onPointerUp);

  viewport.addEventListener('touchstart', onPointerDown, { passive: true });
  viewport.addEventListener('touchmove',  onPointerMove, { passive: true });
  viewport.addEventListener('touchend',   onPointerUp);

  // Re-init en resize (debounce)
  if (!window._rvResizeHandler) {
    let t;
    window._rvResizeHandler = () => {
      clearTimeout(t);
      t = setTimeout(() => initReviewsCarousel(), 200);
    };
    window.addEventListener('resize', window._rvResizeHandler);
  }
}

// ===============================
// Cargar y renderizar reseñas
// ===============================
async function cargarResenas() {
  const reviewsList = document.getElementById('reviews-list');
  if (!reviewsList) {
    console.warn("No se encontró el contenedor '#reviews-list'.");
    return;
  }

  reviewsList.innerHTML = '<p style="text-align:center; color:#888; font-style:italic;">Cargando reseñas…</p>';

  try {
    const respuesta = await fetch(`${API_BASE_URL}/api/resenas`);
    if (!respuesta.ok) throw new Error(`No se pudieron cargar las reseñas (HTTP ${respuesta.status}).`);

    const resenas = await respuesta.json();
    reviewsList.innerHTML = '';

    if (!Array.isArray(resenas) || resenas.length === 0) {
      reviewsList.innerHTML = '<p style="text-align:center; color:#888; font-style:italic;">Aún no hay reseñas. ¡Sé la primera en dejar una!</p>';
      initReviewsCarousel(); // dejará rv-static
      return;
    }

    const esCarrusel = reviewsList.classList.contains('rv-track');
    const frag = document.createDocumentFragment();

    resenas.forEach((resena) => {
      const nombre = (resena.nombre || 'Cliente').toString().trim();
      const comentario = (resena.comentario || '').toString().trim();
      const cal = Math.max(0, Math.min(5, Number(resena.calificacion) || 0)); // 0..5

      const article = document.createElement('article');
      article.className = 'review-card';

      if (cal > 0) {
        const stars = document.createElement('div');
        stars.className = 'review-rating';
        stars.textContent = '★★★★★'.slice(0, cal) + '☆☆☆☆☆'.slice(0, 5 - cal);
        article.appendChild(stars);
      }

      const content = document.createElement('p');
      content.className = 'review-content';
      content.textContent = comentario; // comillas las pone el CSS ::before/::after

      const author = document.createElement('h3');
      author.className = 'review-author';
      author.textContent = `- ${nombre}`;

      article.appendChild(content);
      article.appendChild(author);

      if (esCarrusel) {
        const slide = document.createElement('div');
        slide.className = 'rv-slide';
        slide.appendChild(article);
        frag.appendChild(slide);
      } else {
        frag.appendChild(article);
      }
    });

    reviewsList.appendChild(frag);
    initReviewsCarousel(); // ← imprescindible

  } catch (error) {
    console.error('Error al cargar las reseñas:', error);
    reviewsList.innerHTML = `<p style="text-align:center; color:#c00;">Error al cargar reseñas. Inténtalo más tarde.</p>`;
  }
}

// ===============================
// Envío de formulario
// ===============================
document.addEventListener('DOMContentLoaded', () => {
  cargarResenas();

  const reviewForm = document.getElementById('review-form');
  if (reviewForm) {
    reviewForm.addEventListener('submit', async (event) => {
      event.preventDefault();

      const nombreEl = document.getElementById('review-name');
      const comentarioEl = document.getElementById('review-comment');
      const calificacionEl = document.getElementById('review-rating');

      const nombre = (nombreEl?.value || '').trim();
      const comentario = (comentarioEl?.value || '').trim();
      const calificacion = parseInt((calificacionEl?.value || '').trim(), 10);

      if (!nombre || !comentario || !Number.isFinite(calificacion)) {
        alert('El nombre, el comentario y la calificación son obligatorios.');
        return;
      }

      const datosResena = {
        nombre,
        comentario,
        calificacion: Math.max(0, Math.min(5, calificacion))
      };

      const submitBtn = reviewForm.querySelector('button[type="submit"]');
      const oldLabel = submitBtn ? submitBtn.textContent : '';
      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Enviando…'; }

      try {
        const respuesta = await fetch(`${API_BASE_URL}/api/resenas`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(datosResena)
        });

        const resultado = await respuesta.json().catch(() => ({}));

        if (respuesta.ok) {
          alert(resultado.message || '¡Gracias por tu reseña!');
          reviewForm.reset();
          await cargarResenas(); // repinta e inicializa el carrusel
        } else {
          alert('Error: ' + (resultado.message || `No se pudo guardar la reseña (HTTP ${respuesta.status}).`));
        }
      } catch (error) {
        console.error('Error al conectar con el servidor:', error);
        alert('No se pudo enviar la reseña. Por favor, intenta más tarde.');
      } finally {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = oldLabel || 'Enviar reseña'; }
      }
    });
  }
});
