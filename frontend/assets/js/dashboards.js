document.addEventListener("DOMContentLoaded", () => {

    // --- Colores base para los gráficos ---
    const chartColors = {
        primary: '#d63384', // Rosa Fuerte
        secondary: '#ff85b4', // Rosa Claro
        tertiary: '#fbcfe8', // Rosa Pálido
        blue: '#36A2EB',
        grey: '#b0b0b0'
    };

    // Base URL del API. Puedes sobrescribirlo con window.API_BASE en el HTML.
    const API_BASE = window.API_BASE || 'http://localhost:3000';
    const API_TOKEN = window.API_TOKEN || null; // Opcional: token Bearer si hace falta

    // Helper: formatea moneda CLP
    const formatCLP = (value) => {
        try {
            return '$' + new Intl.NumberFormat('es-CL').format(value);
        } catch (e) {
            return '$' + value;
        }
    };

    // --- NUEVO HELPER ---
    // Helper: formatea fechas a "27 oct"
    const formatShortDateES = (date) => {
        // 'es-ES' da un formato más estándar (ej. "oct." en lugar de "oct")
        return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    };
    // --- FIN NUEVO HELPER ---

    // Fetch helper con manejo de errores y posibilidad de token
    async function safeFetch(path) {
        try {
            const headers = {};
            if (API_TOKEN) headers['Authorization'] = 'Bearer ' + API_TOKEN;
            const res = await fetch(API_BASE + path, { headers });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return await res.json();
        } catch (err) {
            console.warn(`No se pudo obtener ${path}:`, err.message);
            return null;
        }
    }

    // Obtener datos desde el backend (intenta múltiples endpoints)
    async function fetchAllData() {
        const pagos = await safeFetch('/api/pagos');
        const servicios = await safeFetch('/api/servicios');
        const reservas = await safeFetch('/api/admin/reservas');
        const productos = await safeFetch('/api/productos');
        const areas = await safeFetch('/api/areas');
        // --- AÑADIDO ---
        // Se necesitan las reseñas para el KPI de calificación
        const resenas = await safeFetch('/api/admin/resenas'); 

        return { pagos, servicios, reservas, productos, areas, resenas }; // <-- AÑADIDO
    }

    // Obtener contextos de canvas
    const ctxIngresosTipo = document.getElementById('ingresosTipoChart')?.getContext('2d');
    const ctxTopServicios = document.getElementById('topServiciosChart')?.getContext('2d');
    const ctxIngresosArea = document.getElementById('ingresosAreaChart')?.getContext('2d');
    const ctxIngresosMes = document.getElementById('ingresosMesChart')?.getContext('2d');

    if (!ctxIngresosTipo || !ctxTopServicios || !ctxIngresosArea || !ctxIngresosMes) {
        console.error('No se encontraron uno o más elementos canvas para los charts (ingresosTipoChart, topServiciosChart, ingresosAreaChart, ingresosMesChart).');
        return;
    }

    // --- REGISTRO GLOBAL DEL PLUGIN DE ETIQUETAS ---
    // (Asegúrate de haber añadido el <script> del plugin en tu HTML)
    if (typeof ChartDataLabels !== 'undefined') {
        Chart.register(ChartDataLabels);
    }
    // ----------------------------------------------

    // Gráfico 1 (Circular)
    const ingresosTipoChart = new Chart(ctxIngresosTipo, {
        type: 'pie',
        data: {
            labels: [], // <-- Inicia vacío
            datasets: [{
                label: 'Ingresos',
                data: [], // <-- Inicia vacío
                backgroundColor: [ // <-- Más colores
                    chartColors.primary,
                    chartColors.secondary,
                    chartColors.tertiary,
                    chartColors.blue,
                    chartColors.grey
                ],
                borderColor: '#ffffff',
                borderWidth: 3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { 
                legend: { position: 'bottom' },
                // --- CONFIGURACIÓN DE ETIQUETAS DE PORCENTAJE ---
                datalabels: {
                    formatter: (value, ctx) => {
                        // Suma todos los valores del dataset
                        const total = ctx.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
                        // Calcula el porcentaje
                        const percentage = (value / total) * 100;
                        
                        // No mostrar etiquetas para valores muy pequeños (ej. < 5%)
                        if (percentage < 5) {
                            return null;
                        }
                        return percentage.toFixed(1) + '%';
                    },
                    color: '#ffffff', // Color del texto
                    font: {
                        weight: 'bold',
                        size: 14,
                    },
                    // Sombra de texto para legibilidad
                    textStrokeColor: 'rgba(0, 0, 0, 0.6)',
                    textStrokeWidth: 2
                }
                // --- FIN CONFIGURACIÓN ---
            }
        }
    });

    // Gráfico 2 (Barras Horizontales)
    const topServiciosChart = new Chart(ctxTopServicios, {
        type: 'bar',
        data: { labels: [], datasets: [{ label: 'Nº de Reservas', data: [], backgroundColor: [] }] },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } }
        }
    });

    // Gráfico 3 (Barras Verticales)
    const ingresosAreaChart = new Chart(ctxIngresosArea, {
         type: 'bar',
        data: { labels: [], datasets: [{ 
            // --- CAMBIO AQUÍ ---
            label: 'Nº de Reservas', // Antes era 'Ingresos ($)'
            data: [], 
            backgroundColor: chartColors.secondary 
        }] },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            // --- CAMBIO AQUÍ ---
            scales: { 
                y: { 
                    beginAtZero: true,
                    // Se quitó el callback de formatCLP para mostrar números enteros
                    ticks: {
                        // Asegurar que solo se muestren enteros (ej. 1, 2, 3)
                        precision: 0 
                    }
                } 
            }
        }
    });

    // Gráfico 4 (Línea)
    const ingresosMesChart = new Chart(ctxIngresosMes, {
        type: 'line',
        data: { labels: [], datasets: [{ label: 'Ingresos Semanales', data: [], fill: true, backgroundColor: 'rgba(214, 51, 132, 0.1)', borderColor: chartColors.primary, tension: 0.3, pointBackgroundColor: chartColors.primary, pointRadius: 5 }] },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true, ticks: { callback: (v) => formatCLP(v) } } }
        }
    });

    // Lógica para calcular y actualizar los charts con los datos obtenidos
    // Lógica para calcular y actualizar los charts con los datos obtenidos
    async function loadAndPopulate() {
        // --- AÑADIDO 'resenas' ---
        const { pagos, servicios, reservas, productos, areas, resenas } = await fetchAllData();

        // Mapas auxiliares
        const serviciosMap = new Map();
        if (Array.isArray(servicios)) servicios.forEach(s => serviciosMap.set(Number(s.id_servicio), s));

        const areasMap = new Map();
        if (Array.isArray(areas)) areas.forEach(a => areasMap.set(Number(a.id_area), a.nombre_area));

        // 1) Ingresos ($) Reales por Área de Trabajo (PARA GRÁFICO CIRCULAR)
        const ingresosRealesPorArea_Pie = new Map(); 
        const reservasMap = new Map(); 
        if (Array.isArray(reservas)) {
             reservas.forEach(r => reservasMap.set(Number(r.id), r));
        }
        
        if (Array.isArray(pagos) && reservasMap.size > 0 && areasMap.size > 0) {
            for (const p of pagos) {
                const monto = Number(p.monto_pagado) || 0;
                if (!p.id_reserva) continue;
                const reserva = reservasMap.get(Number(p.id_reserva));
                if (!reserva || reserva.id_area === null || reserva.id_area === undefined) {
                    continue; 
                }
                const nombreArea = areasMap.get(Number(reserva.id_area)) || `Área ${reserva.id_area}`;
                ingresosRealesPorArea_Pie.set(nombreArea, (ingresosRealesPorArea_Pie.get(nombreArea) || 0) + monto);
            }
        } else {
            console.warn('Datos insuficientes (pagos, reservas, areas) para gráfico de ingresos por área.');
        }

        const labelsAreaPie = [];
        const dataAreaPie = [];
        for (const [nombre, total] of ingresosRealesPorArea_Pie.entries()) {
            labelsAreaPie.push(nombre);
            dataAreaPie.push(Math.round(total));
       }

        ingresosTipoChart.data.labels = labelsAreaPie;
        ingresosTipoChart.data.datasets[0].data = dataAreaPie;
        ingresosTipoChart.update();

        // 2) Top 5 Servicios por número de reservas
        const contadorServicios = new Map();
        if (Array.isArray(reservas)) {
            for (const r of reservas) {
                const idS = String(r.id_servicio || '');
                if (!idS) continue;
                contadorServicios.set(idS, (contadorServicios.get(idS) || 0) + 1);
            }
        }

        const servicioCounts = [];
        for (const [idS, cnt] of contadorServicios.entries()) {
            const serv = serviciosMap.get(Number(idS));
            servicioCounts.push({ id: idS, titulo: serv ? serv.titulo : `Servicio ${idS}`, count: cnt });
       }
        servicioCounts.sort((a, b) => b.count - a.count);
        const top5 = servicioCounts.slice(0, 5);

        topServiciosChart.data.labels = top5.map(s => s.titulo);
        topServiciosChart.data.datasets[0].data = top5.map(s => s.count);
        topServiciosChart.data.datasets[0].backgroundColor = top5.map((_, i) => i === 0 ? chartColors.primary : chartColors.tertiary);
        topServiciosChart.update();

        // 3) Top 5 Áreas por número de reservas
        const contadorAreas = new Map();
        if (Array.isArray(reservas)) {
            for (const r of reservas) {
                const idA = r.id_area; 
                if (idA === null || idA === undefined) continue; 
                contadorAreas.set(idA, (contadorAreas.get(idA) || 0) + 1);
            }
        }
        const areaCounts = [];
        for (const [idA, cnt] of contadorAreas.entries()) {
            const nombre = areasMap.get(Number(idA)) || `Área ${idA}`;
            areaCounts.push({ id: idA, nombre: nombre, count: cnt });
        }
        areaCounts.sort((a, b) => b.count - a.count); 
        const top5Areas = areaCounts.slice(0, 5);
        ingresosAreaChart.data.labels = top5Areas.map(a => a.nombre);
        ingresosAreaChart.data.datasets[0].data = top5Areas.map(a => a.count);
        ingresosAreaChart.update();

        // 4) Ingresos del mes (últimas 5 semanas)
        const getWeekIndex = (dateStr) => {
            const d = new Date(dateStr);
            if (isNaN(d)) return -1;
            const now = new Date();
            const nowMidnight = new Date(now);
            const dMidnight = new Date(d);
            nowMidnight.setHours(0,0,0,0);
            dMidnight.setHours(0,0,0,0);
           const oneDay = 1000 * 60 * 60 * 24;
            const diff = nowMidnight - dMidnight;
            const days = diff / oneDay;
            const weekIndex = Math.floor(days / 7);
             return weekIndex;
        };

        const weeks = new Array(5).fill(0);
        if (Array.isArray(pagos)) {
            for (const p of pagos) {
                const idx = getWeekIndex(p.fecha_pago);
                if (idx >= 0 && idx < 5) weeks[idx] += Number(p.monto_pagado || 0);
            }
        } else if (Array.isArray(reservas)) {
            for (const r of reservas) {
                const idx = getWeekIndex(r.fecha_reserva);
               if (idx >= 0 && idx < 5) {
                    const serv = serviciosMap.get(Number(r.id_servicio));
                    weeks[idx] += serv ? Number(serv.valor || 0) : 0;
                }
            }
           console.info('Usando reservas para estimar ingresos semanales (no hay /api/pagos).');
       }

        const semanasLabels = [];
        const semanasSums = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const oneDay = 1000 * 60 * 60 * 24;
        for (let i = 4; i >= 0; i--) {
            const endDate = new Date(today.getTime() - (i * 7 * oneDay));
            const startDate = new Date(endDate.getTime() - (6 * oneDay));
            let label;
            if (i === 0) {
                label = 'Últimos 7 días';
            } else {
                label = `${formatShortDateES(startDate)} - ${formatShortDateES(endDate)}`;
            }
            semanasLabels.push(label);
             semanasSums.push(Math.round(weeks[i] || 0));
      }
        ingresosMesChart.data.labels = semanasLabels;
        ingresosMesChart.data.datasets[0].data = semanasSums;
        ingresosMesChart.update();


        // ==================================================================
        // --- NUEVA SECCIÓN 5: ACTUALIZAR KPIs ---
        // ==================================================================
        
        // 1. Ingresos Totales (Mes)
        const totalIngresosMes = semanasSums.reduce((a, b) => a + b, 0);
        const kpiIngresosEl = document.getElementById('kpi-ingresos');
        if (kpiIngresosEl) kpiIngresosEl.textContent = formatCLP(totalIngresosMes);

        // --- CÁLCULOS CENTRALES (Reservas y Cancelaciones) ---
        let totalReservasMesActual = 0;
        let totalReservasMesPasado = 0; 
        let totalCanceladasMesActual = 0;

        // Bucle: Contar Reservas y Cancelaciones
        // (ESTE BUCLE ES EL QUE FALTABA)
        if (Array.isArray(reservas)) {
            for (const r of reservas) {
                const idx = getWeekIndex(r.fecha_reserva); 
                if (idx < 0) continue; 

                // "Mes Actual" (Semanas 0-4)
                if (idx >= 0 && idx < 5) {
                    totalReservasMesActual++;

                    // --- ¡AQUÍ USAMOS TU NUEVA COLUMNA! ---
                    const estado = r.estado_reserva ? String(r.estado_reserva).toLowerCase() : '';
                    if (estado === 'cancelada' || estado === 'no-show') {
                        totalCanceladasMesActual++;
                    }
                } 
                // "Mes Pasado" (Semanas 5-9)
                else if (idx >= 5 && idx < 10) { 
                    totalReservasMesPasado++;
                }
            }
        }
        // --- FIN CÁLCULOS CENTRALES ---


        // 2. Actualizar KPI de Reservas Totales (Mes)
        const kpiReservasEl = document.getElementById('kpi-reservas');
        if (kpiReservasEl) kpiReservasEl.textContent = totalReservasMesActual;

        const kpiReservasSmallEl = document.querySelector('#kpi-reservas + small');
        if (kpiReservasSmallEl) {
            const kpiReservasLabel = kpiReservasSmallEl.nextElementSibling;
            if (kpiReservasLabel && kpiReservasLabel.tagName === 'P') {
                kpiReservasLabel.textContent = 'Reservas (Mes)';
            }
            if (totalReservasMesPasado > 0) {
                const diff = totalReservasMesActual - totalReservasMesPasado;
                let comparacionStr = '';
                let colorClass = 'text-muted'; 
                if (diff > 0) {
                    comparacionStr = `+${diff} que el mes pasado`;
                    colorClass = 'text-success'; 
                } else if (diff < 0) {
                    comparacionStr = `${diff} que el mes pasado`; 
                    colorClass = 'text-danger'; 
                } else {
                    comparacionStr = 'Igual que el mes pasado';
               }
                kpiReservasSmallEl.textContent = comparacionStr;
                kpiReservasSmallEl.className = colorClass; 
            } else {
                kpiReservasSmallEl.textContent = 'Últimas 5 semanas';
                kpiReservasSmallEl.className = 'text-muted';
            }
        }

        // 3. Actualizar KPI Tasa de Cancelación

        const kpiCancelacionEl = document.getElementById('kpi-cancelacion');
        const kpiCancelacionSmallEl = document.querySelector('#kpi-cancelacion + small');
        if (kpiCancelacionEl) {
            let tasaCancelacion = 0;
            if (totalReservasMesActual > 0) {
                tasaCancelacion = (totalCanceladasMesActual / totalReservasMesActual) * 100;
            }
            kpiCancelacionEl.textContent = `${tasaCancelacion.toFixed(1)}%`;
            if (kpiCancelacionSmallEl) {
                kpiCancelacionSmallEl.textContent = `${totalCanceladasMesActual} canceladas (últimas 5 sem)`;
            }
        }

        // 4. Actualizar KPI Calificación Promedio
        let calificacionSum = 0;
        let calificacionCount = 0;
        if (Array.isArray(resenas)) {
            for (const r of resenas) {
                if (r.calificacion) { 
                    calificacionSum += Number(r.calificacion);
                    calificacionCount++;
                }
            }
        }
        const calificacionPromedio = calificacionCount > 0 ? (calificacionSum / calificacionCount).toFixed(1) : 'N/A';
        const kpiCalificacionEl = document.getElementById('kpi-calificacion');
        if (kpiCalificacionEl) kpiCalificacionEl.textContent = `${calificacionPromedio} ★`;
        
        const kpiCalificacionSmallEl = document.querySelector('#kpi-calificacion + small');
        if (kpiCalificacionSmallEl) kpiCalificacionSmallEl.textContent = `Basado en ${calificacionCount} reseñas`;
    
    } // <-- ESTE es el cierre de 'loadAndPopulate()'

    // Ejecutar la carga inicial y poblar charts
    loadAndPopulate();

});

