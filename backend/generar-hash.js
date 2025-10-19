// Archivo: generar-hash.js

const bcrypt = require('bcrypt');

// La contraseña que quieres encriptar
const passwordPlana = 'admin123';
const saltRounds = 10; // Un valor estándar para la seguridad

console.log(`Encriptando la contraseña: "${passwordPlana}"...`);

bcrypt.hash(passwordPlana, saltRounds, function(err, hash) {
    if (err) {
        console.error("Error al generar el hash:", err);
        return;
    }
    console.log("\n¡Hash generado con éxito!\n");
    console.log("Copia esta línea completa y pégala en la columna 'password_hash' de tu usuario en Supabase:\n");
    console.log(hash);
});
