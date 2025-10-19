// conexion.js
const { Pool } = require('pg');

// Configuración de conexión a la base de datos
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres.jqqqtltitaexfmifuhqn:vj6cgPG8hqH7Uw6I@aws-1-us-east-2.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false } // necesario para Supabase desde Render
});

module.exports = pool;
