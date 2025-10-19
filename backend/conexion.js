// Archivo: conexion.js
const { Pool } = require('pg');

// URL de conexión, tomada de variable de entorno o fallback (solo para pruebas)
const connectionString = process.env.DATABASE_URL || "postgresql://postgres:vj6cgPG8hqH7Uw6I@db.jqqqtltitaexfmifuhqn.supabase.co:5432/postgres";

const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false // necesario para Supabase
  }
});

module.exports = pool;
