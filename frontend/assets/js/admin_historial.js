// Vista: Historial de Clientes (buscador + tarjetas con acciones)
document.addEventListener('DOMContentLoaded', () => {
  const isLocal = ['localhost', '127.0.0.1'].includes(window.location.hostname);
  const API_BASE_URL = isLocal
    ? 'http://localhost:3000'
    : 'https://cosmeticabackend-dqxh.onrender.com';

  const contenedor = document.getElementById('lista-clientes');
  const inputBuscar = document.getElementById('entrada-buscar');
  const mensajeVacio = document.getElementById('mensaje-vacio');

  let clientes = [];

  const normalizar = (s) => (s || '').toString().toLowerCase().trim();

  const inicialesDe = (nombre) => {
    const n = (nombre || '').trim();
    if (!n) return 'CM';
    const partes = n.split(/\s+/).slice(0, 2);
    return partes.map(p => p[0]?.toUpperCase() || '').join('') || 'CM';
  };

  const tarjetaClienteHTML = (c) => {
    const nombre = c.nombre || c.nombre_completo || c.cliente || 'Cliente sin nombre';
    const correo = c.correo || c.email || '';
    const telefono = c.telefono || c.fono || '';
    const id = c.id || c.id_cliente || c.cliente_id || c._id || '';

    const pagosURL = `historial_pagos.html?cliente_id=${encodeURIComponent(id)}&cliente_nombre=${encodeURIComponent(nombre)}`;
    const fichaURL = `historial_fichas.html?cliente_id=${encodeURIComponent(id)}&cliente_nombre=${encodeURIComponent(nombre)}`;

    return `
      <article class="tarjeta-cliente" data-id="${id}">
        <div class="cliente-info">
          <div class="avatar" aria-hidden="true">${inicialesDe(nombre)}</div>
          <div>
            <h3 class="cliente-nombre">${nombre}</h3>
            <p class="cliente-meta">
              ${correo ? `<i class="fas fa-envelope"></i> ${correo}` : ''}
              ${correo && telefono ? ' · ' : ''}
              ${telefono ? `<i class="fas fa-phone-alt"></i> ${telefono}` : ''}
            </p>
          </div>
        </div>
        <div class="cliente-acciones">
          <a class="btn btn-secundario" href="${pagosURL}" title="Ver historial de pagos">
            <i class="fas fa-receipt"></i> Pagos
          </a>
          <a class="btn btn-primario" href="${fichaURL}" title="Ver ficha clínica">
            <i class="fas fa-notes-medical"></i> Ficha
          </a>
        </div>
      </article>
    `;
  };

  const renderClientes = (lista) => {
    if (!contenedor) return;
    if (!lista || lista.length === 0) {
      contenedor.innerHTML = '';
      if (mensajeVacio) mensajeVacio.style.display = 'block';
      return;
    }
    if (mensajeVacio) mensajeVacio.style.display = 'none';
    contenedor.innerHTML = lista.map(tarjetaClienteHTML).join('');
  };

  const filtrar = () => {
    const q = normalizar(inputBuscar?.value || '');
    if (!q) {
      renderClientes(clientes);
      return;
    }
    const resultado = clientes.filter(c =>
      normalizar(c.nombre || c.nombre_completo || c.cliente).includes(q) ||
      normalizar(c.correo || c.email).includes(q) ||
      normalizar(c.telefono || c.fono).includes(q)
    );
    renderClientes(resultado);
  };

  // Intenta distintos endpoints comunes para clientes
  const fetchClientes = async () => {
    const intentos = [
      `${API_BASE_URL}/api/clientes`,
      `${API_BASE_URL}/api/admin/clientes`,
      `${API_BASE_URL}/api/usuarios/clientes`
    ];
    let ultimoError = null;

    for (const url of intentos) {
      try {
        const r = await fetch(url);
        if (!r.ok) throw new Error(`${r.status}`);
        const data = await r.json();
        if (Array.isArray(data)) return data;
        if (Array.isArray(data?.clientes)) return data.clientes;
      } catch (e) {
        ultimoError = e;
      }
    }
    // Si falla todo, devolver arreglo vacío
    console.warn('No se pudieron cargar clientes.', ultimoError?.message || ultimoError);
    return [];
  };

  const init = async () => {
    clientes = await fetchClientes();
    renderClientes(clientes);
  };

  inputBuscar?.addEventListener('input', filtrar);
  init();
});
