// Archivo: conexion.js

const { Pool } = require('pg');

// Tu cadena de conexión a Supabase
const connectionString = "postgresql://postgres:vj6cgPG8hqH7Uw6I@db.jqqqtltitaexfmifuhqn.supabase.co:5432/postgres";

// Creamos el pool de conexiones AÑADIENDO la configuración SSL
const pool = new Pool({
  connectionString,
  ssl: {
    // Esta parte es ESENCIAL para conectar con Supabase desde Node.js
    rejectUnauthorized: false
  }
});

// Exportamos el pool para que server.js lo pueda usar
module.exports = pool;

