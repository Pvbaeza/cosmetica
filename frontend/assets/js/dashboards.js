document.addEventListener("DOMContentLoaded", () => {
  const chartColors = {
    primary: "#d63384",
    secondary: "#ff85b4",
    tertiary: "#fbcfe8",
    blue: "#36A2EB",
    grey: "#b0b0b0",
  };

  // ============================================
  // 🔧 DETECCIÓN AUTOMÁTICA DE ENTORNO
  // ============================================
  const isLocal =
    location.hostname === "localhost" ||
    location.hostname === "127.0.0.1";

  const API_BASE = isLocal
    ? "http://localhost:3000"
    : "https://cosmeticabackend-dqxh.onrender.com";

  const API_TOKEN = window.API_TOKEN || null;
  // ============================================

  const formatCLP = (v) =>
    "$" + new Intl.NumberFormat("es-CL").format(Number(v) || 0);

  const formatDateES = (d) =>
    d.toLocaleDateString("es-CL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

  async function safeFetch(path) {
    try {
      const headers = {};
      if (API_TOKEN) headers["Authorization"] = "Bearer " + API_TOKEN;

      const res = await fetch(API_BASE + path, { headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      return await res.json();
    } catch (err) {
      console.warn(`⚠️ No se pudo obtener ${path}:`, err.message);
      return [];
    }
  }

  async function fetchAll() {
    const [pagos, reservas, servicios, resenas] = await Promise.all([
      safeFetch("/api/pagos"),
      safeFetch("/api/admin/reservas"),
      safeFetch("/api/servicios"),
      safeFetch("/api/admin/resenas"),
    ]);

    return { pagos, reservas, servicios, resenas };
  }

  // === Funciones auxiliares ===
  function startOfDay(d) {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  }

  function endOfDay(d) {
    const x = new Date(d);
    x.setHours(23, 59, 59, 999);
    return x;
  }

  // === Gráficos base ===
  const ctxPie = document.getElementById("ingresosTipoChart")?.getContext("2d");
  const ctxServ = document.getElementById("topServiciosChart")?.getContext("2d");
  const ctxArea = document.getElementById("ingresosAreaChart")?.getContext("2d");
  const ctxLine = document.getElementById("ingresosMesChart")?.getContext("2d");

  const pie = new Chart(ctxPie, {
    type: "pie",
    data: {
      labels: [],
      datasets: [
        {
          data: [],
          backgroundColor: [
            chartColors.primary,
            chartColors.secondary,
            chartColors.tertiary,
            chartColors.blue,
            chartColors.grey,
          ],
        },
      ],
    },
    options: { responsive: true, plugins: { legend: { position: "bottom" } } },
  });

  const servChart = new Chart(ctxServ, {
    type: "bar",
    data: { labels: [], datasets: [{ data: [], backgroundColor: chartColors.primary }] },
    options: { indexAxis: "y", plugins: { legend: { display: false } } },
  });

  const areaChart = new Chart(ctxArea, {
    type: "bar",
    data: { labels: [], datasets: [{ data: [], backgroundColor: chartColors.secondary }] },
    options: { plugins: { legend: { display: false } } },
  });

  const lineChart = new Chart(ctxLine, {
    type: "line",
    data: {
      labels: [],
      datasets: [
        {
          data: [],
          fill: true,
          borderColor: chartColors.primary,
          backgroundColor: "rgba(214,51,132,0.1)",
          tension: 0.3,
          pointRadius: 4,
          pointBackgroundColor: chartColors.primary,
        },
      ],
    },
    options: {
      plugins: { legend: { display: false } },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: (v) => formatCLP(v),
          },
          grid: { color: "rgba(0,0,0,0.05)" },
        },
        x: {
          grid: { color: "rgba(0,0,0,0.05)" },
        },
      },
    },
  });

  // 📅 Mensaje de rango
  const rangoInfo = document.createElement("div");
  rangoInfo.style.textAlign = "center";
  rangoInfo.style.margin = "15px";
  rangoInfo.style.fontWeight = "500";
  rangoInfo.style.color = "#5a3d3d";

  document
    .querySelector("main")
    .insertBefore(rangoInfo, document.querySelector(".kpi-grid"));

  // === Función principal ===
  async function load(fechaInicio = null, fechaFin = null) {
    const { pagos, reservas, servicios, resenas } = await fetchAll();

    const hoy = new Date();

    const inicio = fechaInicio
      ? startOfDay(new Date(fechaInicio))
      : startOfDay(new Date(hoy.getFullYear(), hoy.getMonth(), 1));

    const fin = fechaFin ? endOfDay(new Date(fechaFin)) : endOfDay(hoy);

    rangoInfo.textContent = `📅 Mostrando datos del ${formatDateES(
      inicio
    )} al ${formatDateES(fin)}`;

    const pagosFiltrados = pagos.filter((p) => {
      const f = new Date(p.fecha_pago);
      return !isNaN(f) && f >= inicio && f <= fin;
    });

    const reservasFiltradas = reservas.filter((r) => {
      const f = new Date(r.fecha_reserva || r.fecha_creacion);
      return !isNaN(f) && f >= inicio && f <= fin;
    });

    // === KPIs ===
    const totalIngresos = pagosFiltrados.reduce(
      (a, b) => a + Number(b.monto_pagado || 0),
      0
    );
    document.getElementById("kpi-ingresos").textContent = formatCLP(totalIngresos);

    const totalReservas = reservasFiltradas.length;
    document.getElementById("kpi-reservas").textContent = totalReservas;

    const canceladas = reservasFiltradas.filter((r) =>
      ["cancelada", "no-show"].includes((r.estado_reserva || "").toLowerCase())
    ).length;

    const tasa = totalReservas > 0 ? (canceladas / totalReservas) * 100 : 0;
    document.getElementById("kpi-cancelacion").textContent = `${tasa.toFixed(1)}%`;

    const calificaciones = resenas
      .map((r) => Number(r.calificacion))
      .filter((x) => !isNaN(x));

    const promedio = calificaciones.length
      ? (calificaciones.reduce((a, b) => a + b) / calificaciones.length).toFixed(1)
      : "N/A";

    document.getElementById("kpi-calificacion").textContent = `${promedio} ★`;

    // === Gráficos ===
    const ingresosPorArea = {};

    pagosFiltrados.forEach((p) => {
      const area = p.nombre_area || "Sin área";
      ingresosPorArea[area] = (ingresosPorArea[area] || 0) + Number(p.monto_pagado);
    });

    pie.data.labels = Object.keys(ingresosPorArea);
    pie.data.datasets[0].data = Object.values(ingresosPorArea);
    pie.update();

    const servMap = new Map(servicios.map((s) => [s.id_servicio, s.titulo]));

    const conteoServ = {};
    reservasFiltradas.forEach((r) => {
      const id = r.id_servicio;
      if (id) conteoServ[id] = (conteoServ[id] || 0) + 1;
    });

    const topServ = Object.entries(conteoServ)
      .map(([id, count]) => ({
        titulo: servMap.get(Number(id)) || `Servicio ${id}`,
        count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    servChart.data.labels = topServ.map((s) => s.titulo);
    servChart.data.datasets[0].data = topServ.map((s) => s.count);
    servChart.update();

    const conteoAreas = {};
    reservasFiltradas.forEach((r) => {
      const area = r.nombre_area || "Área desconocida";
      conteoAreas[area] = (conteoAreas[area] || 0) + 1;
    });

    const topAreas = Object.entries(conteoAreas)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    areaChart.data.labels = topAreas.map((a) => a[0]);
    areaChart.data.datasets[0].data = topAreas.map((a) => a[1]);
    areaChart.update();

    const ingresosPorDia = {};

    pagosFiltrados.forEach((p) => {
      const f = new Date(p.fecha_pago);
      const key = f.toISOString().slice(0, 10);
      ingresosPorDia[key] = (ingresosPorDia[key] || 0) + Number(p.monto_pagado);
    });

    const ordenado = Object.entries(ingresosPorDia).sort((a, b) =>
      a[0].localeCompare(b[0])
    );

    lineChart.data.labels = ordenado.map(([k]) =>
      new Date(k).toLocaleDateString("es-CL")
    );

    lineChart.data.datasets[0].data = ordenado.map(([, v]) => v);
    lineChart.update();
  }

  // === Eventos ===
  document.getElementById("btnFiltrarFechas")?.addEventListener("click", () => {
    const fi = document.getElementById("fechaInicio").value;
    const ff = document.getElementById("fechaFin").value;

    if (!fi || !ff) return alert("Selecciona ambas fechas");
    load(fi, ff);
  });

  document.getElementById("btnLimpiarFechas")?.addEventListener("click", () => {
    document.getElementById("fechaInicio").value = "";
    document.getElementById("fechaFin").value = "";
    load();
  });

  // === Carga inicial (mes actual) ===
  load();
});
