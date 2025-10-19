// Archivo: index.js

// Importamos el pool de conexiones que creamos en conexion.js
// El './' es importante para indicar que es un archivo local.
const pool = require('./conexion.js');

// Función que usa el pool importado para hacer la consulta
async function recuperarResenas() {
  try {
    console.log('✅ Usando la conexión importada para consultar...');

    // Usamos pool.query(), un atajo que maneja la conexión y liberación automáticamente
    const resultado = await pool.query('SELECT * FROM resenas');

    console.log('📄 Reseñas recuperadas:');
    console.log(resultado.rows);

  } catch (error) {
    console.error('🔥 Error al realizar la consulta:', error.message);
  } finally {
    // Cerramos el pool para que el programa finalice
    pool.end();
  }
}

// Llamamos a la función
recuperarResenas();