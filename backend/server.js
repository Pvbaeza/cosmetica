// Archivo: server.js

// 1. Importaciones necesarias
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('./conexion.js'); // Tu archivo de conexión a la BD
const path = require('path');
const multer = require('multer');

// --- ¡NUEVO! Cargar variables de entorno del archivo .env ---
require('dotenv').config(); 

// --- ¡NUEVAS IMPORTACIONES PARA CLOUDINARY! ---
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
// ---------------------------------------------


// --- ¡NUEVA CONFIGURACIÓN DE CLOUDINARY! ---
// Lee las claves desde el archivo .env (process.env)
cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET 
});

// NUEVA Configuración de Multer para PRODUCTOS (apuntando a Cloudinary)
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'cosmetica/productos', // Carpeta en Cloudinary
    format: async (req, file) => 'jpg', 
    public_id: (req, file) => Date.now() + '-' + path.parse(file.originalname).name,
  },
});

// NUEVA Configuración de Multer para SERVICIOS (apuntando a Cloudinary)
const serviceStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'cosmetica/servicios', // Carpeta en Cloudinary
    format: async (req, file) => 'jpg',
    public_id: (req, file) => 'servicio-' + Date.now() + '-' + path.parse(file.originalname).name,
  },
});
// --------------------------------------------------


const upload = multer({ storage: storage }); // Uploader de productos
const uploadServicio = multer({ storage: serviceStorage }); // Uploader de servicios


// 2. Configuración inicial
const app = express();
const PORT = 3000;

// ¡NUEVO! Lee la clave secreta desde el archivo .env
const JWT_SECRET = process.env.JWT_SECRET; 

// 3. Middlewares
app.use(cors({
    origin: ['https://cosmetica-cvsi.onrender.com', 'http://localhost:5500'],
    methods: ['GET','POST','PUT','PATCH','DELETE'],
    credentials: true
}));

// Este middleware verifica el token
const verificarToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; 
    
    if (token == null) {
        return res.status(401).json({ message: 'No se proporcionó token.' }); 
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'Token inválido o expirado.' });
        }
        req.user = user; 
        next(); 
    });
};


app.use(express.json()); 

// TERCERO: Sirve los archivos estáticos (CSS, JS, logos del frontend)
// Esta línea ya NO sirve las imágenes de productos/servicios.
app.use('/assets', express.static(path.join(__dirname, '../frontend/assets')));


// ===============================================================
// --- RUTAS PARA LA GESTIÓN DE SERVICIOS ---
// ===============================================================

// --- RUTA GET (Sigue igual) ---
app.get('/api/servicios', async (req, res) => {
    try {
        const textoSQL = 'SELECT * FROM servicios ORDER BY id_servicio ASC';
        const resultado = await pool.query(textoSQL);
        res.status(200).json(resultado.rows);
    } catch (error) {
        console.error('🔥 Error al consultar los servicios:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
});


// --- RUTA POST: Para CREAR un nuevo servicio --- (LIMPIO)
app.post('/api/servicios', uploadServicio.single('imagen'), async (req, res) => {
    const { titulo, subtitulo, descripcion, valor, tipo_trabajador } = req.body;
    
    // ¡CAMBIO CLAVE! req.file.path ahora es la URL de Cloudinary
    const imagen_url = req.file ? req.file.path : null; 

    if (!titulo || !valor || !tipo_trabajador) {
        return res.status(400).json({ message: 'Título, valor y tipo de profesional son obligatorios.' });
    }

    try {
        const textoSQL = `
            INSERT INTO servicios(titulo, subtitulo, descripcion, valor, imagen_url, tipo_trabajador)
            VALUES($1, $2, $3, $4, $5, $6) RETURNING *
        `;
        const valores = [titulo, subtitulo, descripcion, valor, imagen_url, tipo_trabajador];
        const resultado = await pool.query(textoSQL, valores);
        res.status(201).json(resultado.rows[0]);
    } catch (error) {
        console.error('🔥 Error al crear el servicio:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
});

// --- RUTA PUT: Para ACTUALIZAR un servicio --- (LIMPIO)
app.put('/api/servicios/:id', uploadServicio.single('imagen'), async (req, res) => {
    const { id } = req.params;
    const { titulo, subtitulo, descripcion, valor, tipo_trabajador } = req.body;

    if (!titulo || !valor || !tipo_trabajador) {
        return res.status(400).json({ message: 'Título, valor y tipo de profesional son obligatorios.' });
    }
    
    try {
        const result = await pool.query('SELECT imagen_url FROM servicios WHERE id_servicio = $1', [id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Servicio no encontrado.' });
        }
        let imagen_url = result.rows[0]?.imagen_url;

        if (req.file) {
            // ¡CAMBIO CLAVE! Si se sube un nuevo archivo, usamos la URL de Cloudinary
            imagen_url = req.file.path;
        }

        const textoSQL = `
            UPDATE servicios
            SET titulo = $1, subtitulo = $2, descripcion = $3, valor = $4, imagen_url = $5, tipo_trabajador = $6
            WHERE id_servicio = $7 RETURNING *
        `;
        const valores = [titulo, subtitulo, descripcion, valor, imagen_url, tipo_trabajador, id];
        const resultado = await pool.query(textoSQL, valores);

        if (resultado.rowCount === 0) {
            return res.status(404).json({ message: 'Servicio no encontrado.' });
        }
        res.status(200).json(resultado.rows[0]);
    } catch (error) {
        console.error(`🔥 Error al actualizar el servicio ${id}:`, error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
});

// --- RUTA DELETE (Sigue igual) ---
app.delete('/api/servicios/:id', async (req, res) => {
    const { id } = req.params;
    try {
        // Opcional: Aquí podrías borrar la imagen de Cloudinary antes de la BD
        const textoSQL = 'DELETE FROM servicios WHERE id_servicio = $1';
        const resultado = await pool.query(textoSQL, [id]);
        if (resultado.rowCount === 0) {
            return res.status(404).json({ message: 'Servicio no encontrado.' });
        }
        res.status(200).json({ message: 'Servicio eliminado con éxito.' });
    } catch (error) {
        console.error(`🔥 Error al eliminar el servicio ${id}:`, error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
});


// ===============================================================
// --- RUTAS PARA LA GESTIÓN DE PRODUCTOS ---
// ===============================================================

// --- RUTA POST: Para CREAR un nuevo producto --- (LIMPIO)
app.post('/api/productos', upload.single('imagen'), async (req, res) => {
    const { nombre, descripcion, valor, stock } = req.body;
    
    if (!req.file) {
        return res.status(400).json({ message: 'La imagen es obligatoria.' });
    }
    
    // ¡CAMBIO CLAVE! req.file.path ahora es la URL de Cloudinary
    const imagen_url = req.file.path;

    try {
        const textoSQL = `
            INSERT INTO productos(nombre, descripcion, valor, stock, imagen_url)
            VALUES($1, $2, $3, $4, $5) RETURNING *
        `;
        const valores = [nombre, descripcion, valor, stock, imagen_url];
        const resultado = await pool.query(textoSQL, valores);

        res.status(201).json({
            message: 'Producto publicado con éxito!',
            data: resultado.rows[0]
        });

    } catch (error) {
        console.error('🔥 Error al publicar el producto:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
});

// --- RUTA PUT: Para ACTUALIZAR un producto --- (LIMPIO)
app.put('/api/productos/:id', upload.single('imagen'), async (req, res) => {
    const { id } = req.params;
    const { nombre, descripcion, valor, stock } = req.body;

    try {
        const result = await pool.query('SELECT imagen_url FROM productos WHERE id_producto = $1', [id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Producto no encontrado.' });
        }
        let imagen_url = result.rows[0].imagen_url;

        if (req.file) {
            // ¡CAMBIO CLAVE! Si se sube un nuevo archivo, usamos la URL de Cloudinary
            imagen_url = req.file.path;
        }

        const textoSQL = `
            UPDATE productos
            SET nombre = $1, descripcion = $2, valor = $3, stock = $4, imagen_url = $5
            WHERE id_producto = $6 RETURNING *
        `;
        const valores = [nombre, descripcion, valor, stock, imagen_url, id];
        const resultado = await pool.query(textoSQL, valores);

        res.status(200).json({
            message: 'Producto actualizado con éxito.',
            data: resultado.rows[0]
        });
    } catch (error) {
        console.error(`🔥 Error al actualizar el producto ${id}:`, error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
});

// --- RUTA DELETE (Sigue igual) ---
app.delete('/api/productos/:id', async (req, res) => {
    const { id } = req.params;
    try {
        // Opcional: Aquí podrías borrar la imagen de Cloudinary antes de la BD
        const textoSQL = 'DELETE FROM productos WHERE id_producto = $1';
        const resultado = await pool.query(textoSQL, [id]);
        if (resultado.rowCount === 0) {
            return res.status(404).json({ message: 'Producto no encontrado.' });
        }
        res.status(200).json({ message: 'Producto eliminado con éxito.' });
    } catch (error) {
        console.error(`🔥 Error al eliminar el producto ${id}:`, error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
});

// --- RUTA GET: OBTENER TODOS los productos (Sigue igual) ---
app.get('/api/productos', async (req, res) => {
    try {
        const textoSQL = 'SELECT * FROM productos ORDER BY id_producto DESC';
        const resultado = await pool.query(textoSQL);
        res.status(200).json(resultado.rows);
    } catch (error) {
        console.error('🔥 Error al consultar los productos:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
});


// ===============================================================
// --- RUTAS DE LOGIN, RESERVAS, RESEÑAS, ETC. (LIMPIAS) ---
// ===============================================================

// --- RUTA POST para INICIAR SESIÓN ---
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ success: false, message: 'Usuario y contraseña son obligatorios.' });
    }
    try {
        const textoSQL = 'SELECT * FROM usuarios WHERE username = $1';
        const resultado = await pool.query(textoSQL, [username]);
        if (resultado.rowCount === 0) {
            return res.status(401).json({ success: false, message: 'Credenciales incorrectas.' });
        }
        const usuario = resultado.rows[0];
        const esValida = await bcrypt.compare(password, usuario.password_hash);

        if (esValida) {
            const token = jwt.sign(
                { userId: usuario.id, username: usuario.username }, 
                JWT_SECRET, // Lee la clave del .env
                { expiresIn: '1h' } 
            );
            
            res.status(200).json({ 
                success: true, 
                message: 'Inicio de sesión exitoso.', 
                token: token,
                id_area: usuario.id_area
            });

        } else {
            res.status(401).json({ success: false, message: 'Credenciales incorrectas.' });
        }
    } catch (error) {
        console.error('🔥 Error en POST /api/login:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor.' });
    }
});

// --- RUTA POST PARA CREAR RESERVAS (PÚBLICA) ---
app.post('/api/reservas', async (req, res) => {
    const { nombre, rut, telefono, servicio, fecha, hora, area_servicio } = req.body;
    console.log('Recibiendo nueva reserva pública:', req.body);

    if (!nombre || !servicio || !fecha || !hora) {
        return res.status(400).json({ success: false, message: 'Nombre, servicio, fecha y hora son obligatorios.' });
    }

    try {
        const textoSQL = `
            INSERT INTO reservas(nombre_cliente, rut_cliente, telefono_cliente, servicio, fecha_reserva, hora_reserva, area_servicio)
            VALUES($1, $2, $3, $4, $5, $6, $7) RETURNING *
        `;
        const valores = [nombre, rut, telefono, servicio, fecha, hora, area_servicio];
        
        const resultado = await pool.query(textoSQL, valores);

        res.status(201).json({
            success: true,
            message: '¡Tu reserva ha sido registrada con éxito!',
            data: resultado.rows[0]
        });
    } catch (error) {
        console.error('🔥 Error al registrar la reserva:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor.' });
    }
});

// --- RUTAS DE RESEÑAS ---
app.post('/api/resenas', async (req, res) => {
    const { nombre, comentario } = req.body;
    if (!nombre || !comentario) {
        return res.status(400).json({ message: 'El nombre y el comentario son obligatorios.' });
    }
    try {
        const fecha = new Date();
        const estado = false;
        const textoSQL = 'INSERT INTO resenas(nombre, "Comentario", "Fecha", "estado_aprobacion") VALUES($1, $2, $3, $4) RETURNING *';
        const valores = [nombre, comentario, fecha, estado];
        const resultado = await pool.query(textoSQL, valores);
        res.status(201).json({
                message: '¡Gracias por tu reseña! Ha sido enviada con éxito.',
                data: resultado.rows[0]
        });
    } catch (error) {
        console.error('🔥 Error al realizar la inserción:', error);
        res.status(500).json({ message: 'Error interno del servidor.', error: error.message });
    }
});

app.get('/api/resenas', async (req, res) => {
    try {
        const textoSQL = 'SELECT nombre, "Comentario" FROM resenas WHERE estado_aprobacion = true ORDER BY "Fecha" DESC';
        const resultado = await pool.query(textoSQL);
        res.status(200).json(resultado.rows);
    } catch (error) {
        console.error('🔥 Error al consultar las reseñas:', error);
        res.status(500).json({ message: 'Error interno del servidor.', error: error.message });
    }
});

// --- RUTAS ADMIN DE RESEÑAS ---
app.get('/api/admin/resenas', async (req, res) => {
    try {
        const textoSQL = 'SELECT id_resena, nombre, "Comentario", estado_aprobacion FROM resenas ORDER BY "Fecha" DESC';
        const resultado = await pool.query(textoSQL);
        res.status(200).json(resultado.rows);
    } catch (error) {
        console.error('🔥 Error en GET /api/admin/resenas:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
});

app.patch('/api/admin/resenas/:id', async (req, res) => {
    const { id } = req.params;
    const { estado } = req.body;
    try {
        const textoSQL = 'UPDATE resenas SET estado_aprobacion = $1 WHERE id_resena = $2 RETURNING *';
        const resultado = await pool.query(textoSQL, [estado, id]);
        if (resultado.rowCount === 0) {
            return res.status(404).json({ message: 'Reseña no encontrada.' });
        }
        res.status(200).json({ message: 'Estado de la reseña actualizado con éxito.', data: resultado.rows[0] });
    } catch (error) {
        console.error('🔥 Error en PATCH /api/admin/resenas/:id:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
});

app.delete('/api/admin/resenas/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const textoSQL = 'DELETE FROM resenas WHERE id_resena = $1';
        const resultado = await pool.query(textoSQL, [id]);
        if (resultado.rowCount === 0) {
            return res.status(404).json({ message: 'Reseña no encontrada.' });
        }
        res.status(200).json({ message: 'Reseña eliminada con éxito.' });
    } catch (error) {
        console.error('🔥 Error en DELETE /api/admin/resenas/:id:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
});

// --- RUTA HORARIOS OCUPADOS ---
app.get('/api/horarios-ocupados', async (req, res) => {
    const { fecha, area } = req.query;
    if (!fecha || !area || area === 'undefined' || area === 'null') {
        return res.status(400).json({ message: 'La fecha y el área son obligatorias para verificar la disponibilidad.' });
    }
    try {
        const textoSQL = 'SELECT hora_reserva FROM reservas WHERE fecha_reserva = $1 AND area_servicio = $2';
        const resultado = await pool.query(textoSQL, [fecha, area]);
        const horariosOcupados = resultado.rows.map(fila => fila.hora_reserva);
        res.status(200).json(horariosOcupados);
    } catch (error) {
        console.error('🔥 Error CRÍTICO al consultar horarios ocupados:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
});


// --- RUTAS ADMIN DE RESERVAS ---
app.get('/api/admin/reservas', async (req, res) => {
    const { area } = req.query;
    let textoSQL = 'SELECT * FROM reservas';
    const values = [];
    if (area && area !== 'todos') {
        textoSQL += ' WHERE area_servicio = $1';
        values.push(area);
    }
    textoSQL += ' ORDER BY fecha_reserva ASC, hora_reserva ASC';
    try {
        const resultado = await pool.query(textoSQL, values);
        res.status(200).json(resultado.rows);
    } catch (error) {
        console.error('🔥 Error al consultar las reservas:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
});

app.post('/api/admin/reservas', async (req, res) => {
    const { nombre_cliente, rut_cliente, telefono_cliente, servicio, fecha_reserva, hora_reserva, area_servicio } = req.body;
    if (!nombre_cliente || !telefono_cliente || !servicio || !fecha_reserva || !hora_reserva || !area_servicio) {
        return res.status(400).json({ message: 'Todos los campos son obligatorios.' });
    }
    try {
        const checkSQL = 'SELECT id FROM reservas WHERE fecha_reserva = $1 AND hora_reserva = $2 AND area_servicio = $3';
        const checkResult = await pool.query(checkSQL, [fecha_reserva, hora_reserva, area_servicio]);
        if (checkResult.rowCount > 0) {
            return res.status(409).json({ message: `Este bloque horario ya está reservado para el área de ${area_servicio}.` });
        }
        const textoSQL = `
            INSERT INTO reservas(nombre_cliente, rut_cliente, telefono_cliente, servicio, fecha_reserva, hora_reserva, area_servicio)
            VALUES($1, $2, $3, $4, $5, $6, $7) RETURNING *
        `;
        const valores = [nombre_cliente, rut_cliente, telefono_cliente, servicio, fecha_reserva, hora_reserva, area_servicio];
        const resultado = await pool.query(textoSQL, valores);
        res.status(201).json(resultado.rows[0]);
    } catch (error) {
        console.error('🔥 Error al crear la reserva:', error);
        res.status(500).json({ message: 'Error interno del servidor al crear la reserva.' });
    }
});

app.put('/api/admin/reservas/:id', async (req, res) => {
    const { id } = req.params;
    const { nombre_cliente, rut_cliente, telefono_cliente, servicio, fecha_reserva, hora_reserva, area_servicio } = req.body;
    if (!nombre_cliente || !telefono_cliente || !servicio || !fecha_reserva || !hora_reserva || !area_servicio) {
        return res.status(400).json({ message: 'Todos los campos son obligatorios.' });
    }
    try {
        const checkSQL = 'SELECT id FROM reservas WHERE fecha_reserva = $1 AND hora_reserva = $2 AND area_servicio = $3 AND id != $4';
        const checkResult = await pool.query(checkSQL, [fecha_reserva, hora_reserva, area_servicio, id]);
        if (checkResult.rowCount > 0) {
            return res.status(409).json({ message: `Este bloque horario ya está ocupado por otra reserva en el área de ${area_servicio}.` });
        }
        const textoSQL = `
            UPDATE reservas
            SET nombre_cliente = $1, rut_cliente = $2, telefono_cliente = $3, servicio = $4, fecha_reserva = $5, hora_reserva = $6, area_servicio = $7
            WHERE id = $8 RETURNING *
        `;
        const valores = [nombre_cliente, rut_cliente, telefono_cliente, servicio, fecha_reserva, hora_reserva, area_servicio, id];
        const resultado = await pool.query(textoSQL, valores);
        if (resultado.rowCount === 0) {
            return res.status(404).json({ message: 'Reserva no encontrada.' });
        }
        res.status(200).json(resultado.rows[0]);
    } catch (error) {
        console.error(`🔥 Error al actualizar la reserva ${id}:`, error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
});

app.delete('/api/admin/reservas/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const textoSQL = 'DELETE FROM reservas WHERE id = $1';
        const resultado = await pool.query(textoSQL, [id]);
        if (resultado.rowCount === 0) {
            return res.status(404).json({ message: 'Reserva no encontrada.' });
        }
        res.status(204).send();
    } catch (error) {
        console.error(`🔥 Error al eliminar la reserva ${id}:`, error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
});

// --- RUTAS DE ÁREAS ---
app.get('/api/areas', async (req, res) => {
    try {
        const textoSQL = 'SELECT * FROM areas_trabajo ORDER BY nombre_area ASC';
        const resultado = await pool.query(textoSQL);
        res.status(200).json(resultado.rows);
    } catch (error) {
        console.error('🔥 Error al consultar áreas:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
});

app.post('/api/areas', async (req, res) => {
    const { nombre } = req.body;
    if (!nombre) {
        return res.status(400).json({ message: 'El nombre del área es obligatorio.' });
    }
    try {
        const textoSQL = 'INSERT INTO areas_trabajo(nombre_area) VALUES($1) RETURNING *';
        const resultado = await pool.query(textoSQL, [nombre]);
        res.status(201).json({ 
            message: 'Área creada con éxito', 
            data: resultado.rows[0] 
        });
    } catch (error) {
        if (error.code === '23505') {
            return res.status(409).json({ message: 'Error: El área ya existe.' });
        }
        console.error('🔥 Error al crear área:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
});

app.delete('/api/areas/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const textoSQL = 'DELETE FROM areas_trabajo WHERE id_area = $1 RETURNING *';
        const resultado = await pool.query(textoSQL, [id]);
        if (resultado.rowCount === 0) {
            return res.status(404).json({ message: 'Área no encontrada.' });
        }
        res.status(200).json({ 
            message: 'Área eliminada con éxito', 
            data: resultado.rows[0] 
        });
    } catch (error) {
        if (error.code === '23503') { 
            return res.status(409).json({ message: 'Error: No se puede eliminar el área porque está asignada a uno o más trabajadores.' });
        }
        console.error('🔥 Error al eliminar área:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
});

// --- RUTAS DE TRABAJADORES ---
app.post('/api/trabajadores', async (req, res) => {
    const { nombre, id_area, email, username, password } = req.body;
    if (!nombre || !id_area || !email || !username || !password) {
        return res.status(400).json({ message: 'Todos los campos son obligatorios.' });
    }
    try {
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);
        const insertSQL = `
            INSERT INTO usuarios(nombre_completo, username, password_hash, "Correo", id_area)
            VALUES($1, $2, $3, $4, $5)
            RETURNING id, username, nombre_completo;
        `;
        const values = [nombre, username, passwordHash, email, id_area];
        const result = await pool.query(insertSQL, values);
        res.status(201).json({ 
            message: 'Trabajador añadido con éxito.',
            data: result.rows[0]
        });
    } catch (error) {
        if (error.code === '23505') {
            return res.status(409).json({ message: 'Error: El nombre de usuario o el correo ya existen.' });
        }
        console.error('🔥 Error al crear trabajador:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
});

app.get('/api/trabajadores', async (req, res) => {
    try {
        const textoSQL = `
            SELECT 
                u.id, 
                u.nombre_completo, 
                u.username, 
                u."Correo" as email, 
                u.id_area
            FROM usuarios u
            ORDER BY u.nombre_completo ASC;
        `;
        const resultado = await pool.query(textoSQL);
        res.status(200).json(resultado.rows);
    } catch (error) {
        console.error('🔥 Error al consultar trabajadores:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
});

app.put('/api/trabajadores/:id', async (req, res) => {
    const { id } = req.params;
    const { nombre, id_area, email, username, password } = req.body;

    if (!nombre || !id_area || !email || !username) {
        return res.status(400).json({ message: 'Nombre, área, correo y usuario son obligatorios.' });
    }
    try {
        let passwordHash;
        if (password) { // Solo actualiza la contraseña si se provee una nueva
            const saltRounds = 10;
            passwordHash = await bcrypt.hash(password, saltRounds);
        }

        let updateSQL;
        let values;

        if (passwordHash) {
            updateSQL = `
                UPDATE usuarios 
                SET nombre_completo = $1, username = $2, "Correo" = $3, id_area = $4, password_hash = $5
                WHERE id = $6 RETURNING id, username, nombre_completo;
            `;
            values = [nombre, username, email, id_area, passwordHash, id];
        } else {
            updateSQL = `
                UPDATE usuarios 
                SET nombre_completo = $1, username = $2, "Correo" = $3, id_area = $4
                WHERE id = $5 RETURNING id, username, nombre_completo;
            `;
            values = [nombre, username, email, id_area, id];
        }

        const result = await pool.query(updateSQL, values);
        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Trabajador no encontrado.' });
        }
        res.status(200).json({ 
            message: 'Trabajador actualizado con éxito.',
            data: result.rows[0]
        });
    } catch (error) {
        if (error.code === '23505') {
            return res.status(409).json({ message: 'Error: El nombre de usuario o el correo ya existen.' });
        }
        console.error('🔥 Error al actualizar trabajador:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
});

// ===============================================================
// --- RUTAS DEL PORTAL DEL TRABAJADOR ---
// ===============================================================

app.get('/api/trabajador/perfil', verificarToken, async (req, res) => {
    try {
        const userId = req.user.userId; 
        const textoSQL = `
            SELECT 
                u.id, 
                u.nombre_completo, 
                u.username, 
                u."Correo", 
                u.id_area,
                a.nombre_area
            FROM usuarios u
            LEFT JOIN areas_trabajo a ON u.id_area = a.id_area
            WHERE u.id = $1;
        `;
        
        const resultado = await pool.query(textoSQL, [userId]);
        
        if (resultado.rowCount === 0) {
            return res.status(404).json({ message: 'Usuario no encontrado.' });
        }
        
        res.status(200).json(resultado.rows[0]);
    } catch (error) {
        console.error('🔥 Error en GET /api/trabajador/perfil:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
});

app.put('/api/trabajador/cambiar-contrasena', verificarToken, async (req, res) => {
    const userId = req.user.userId; 
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: 'Se requiere la contraseña actual y la nueva.' });
    }
    try {
        const sqlSelect = 'SELECT password_hash FROM usuarios WHERE id = $1';
        const resultado = await pool.query(sqlSelect, [userId]);
        
        if (resultado.rowCount === 0) {
            return res.status(404).json({ message: 'Usuario no encontrado.' });
        }
        
        const usuario = resultado.rows[0];
        
        const esValida = await bcrypt.compare(currentPassword, usuario.password_hash);
        
        if (!esValida) {
            return res.status(403).json({ message: 'La contraseña actual es incorrecta.' });
        }
        
        const saltRounds = 10;
        const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);
        
        const sqlUpdate = 'UPDATE usuarios SET password_hash = $1 WHERE id = $2';
        await pool.query(sqlUpdate, [newPasswordHash, userId]);
        
        res.status(200).json({ message: 'Contraseña actualizada con éxito.' });
    } catch (error) {
        console.error('🔥 Error en PUT /api/trabajador/cambiar-contrasena:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
});

// 5. Iniciar el servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor escuchando en http://localhost:${PORT}`);
});
