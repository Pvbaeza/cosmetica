// admin_servicios_filtro.js
document.addEventListener("DOMContentLoaded", () => {
  const contenedorLista = document.querySelector(".services-list");
  const selectArea = document.getElementById("filtro-area");
  const inputBuscar = document.getElementById("buscador-servicios");

  if (!contenedorLista) return;

  // --- Utils ---
  const obtenerTarjetas = () =>
    Array.from(contenedorLista.querySelectorAll(".service-card"));

  const extraerAreaDeTarjeta = (tarjeta) => {
    // 1) data-area="Facial", 2) texto en .service-staff, 3) vacío
    const data = tarjeta.getAttribute("data-area");
    if (data && data.trim()) return data.trim();

    const staff = tarjeta.querySelector(".service-staff");
    if (staff && staff.textContent) return staff.textContent.trim();

    return ""; // área desconocida
  };

  const extraerTextoBuscable = (tarjeta) => {
    // Título, subtítulo y descripción (usa las clases que ya tienes en admin)
    const titulo = tarjeta.querySelector(".service-title")?.textContent || "";
    const subtitulo = tarjeta.querySelector(".service-subtitle")?.textContent || "";
    const descripcion = tarjeta.querySelector(".service-description")?.textContent || "";
    return (titulo + " " + subtitulo + " " + descripcion).toLowerCase();
  };

  // Construye opciones de área con lo que haya en las tarjetas
  const poblarAreas = () => {
    if (!selectArea) return;
    const areas = new Set();
    obtenerTarjetas().forEach((t) => {
      const a = extraerAreaDeTarjeta(t);
      if (a) areas.add(a);
    });

    // Mantén "Mostrar Todas"
    const valorPrevio = selectArea.value || "todas";
    selectArea.innerHTML = '<option value="todas">Mostrar Todas</option>';

    Array.from(areas)
      .sort((a, b) => a.localeCompare(b))
      .forEach((a) => {
        const opt = document.createElement("option");
        opt.value = a;
        opt.textContent = a;
        selectArea.appendChild(opt);
      });

    // Restaura selección si existe
    const tiene = Array.from(selectArea.options).some(o => o.value === valorPrevio);
    selectArea.value = tiene ? valorPrevio : "todas";
  };

  const aplicarFiltros = () => {
    const areaElegida = (selectArea?.value || "todas").toLowerCase();
    const termino = (inputBuscar?.value || "").toLowerCase().trim();

    obtenerTarjetas().forEach((tarjeta) => {
      const areaTarjeta = extraerAreaDeTarjeta(tarjeta).toLowerCase();
      const texto = extraerTextoBuscable(tarjeta);

      const coincideArea = areaElegida === "todas" || areaTarjeta === areaElegida;
      const coincideTexto = !termino || texto.includes(termino);

      tarjeta.classList.toggle("oculta", !(coincideArea && coincideTexto));
    });
  };

  // Observa cambios en la lista (cuando tu JS re-renderiza tarjetas)
  const observer = new MutationObserver(() => {
    poblarAreas();
    aplicarFiltros();
  });
  observer.observe(contenedorLista, { childList: true, subtree: false });

  // Listeners
  selectArea?.addEventListener("change", aplicarFiltros);
  inputBuscar?.addEventListener("input", aplicarFiltros);

  // Inicial
  poblarAreas();
  aplicarFiltros();
});
