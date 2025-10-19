// Archivo: conexion.js
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // La URL que Render te da para PostgreSQL
  ssl: { rejectUnauthorized: false } // IMPORTANTE para Render
});

module.exports = pool;
