// Archivo: server.js (MODIFICADO PARA NUEVA BD)

// 1. Importaciones necesarias
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('./conexion.js'); // Tu archivo de conexión a la BD
const path = require('path');
const multer = require('multer');

// --- Cargar variables de entorno del archivo .env ---
require('dotenv').config();

// --- IMPORTACIONES PARA CLOUDINARY! ---
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
// ---------------------------------------------


// --- CONFIGURACIÓN DE CLOUDINARY! ---
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configuración de Multer para PRODUCTOS (apuntando a Cloudinary)
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'cosmetica/productos', // Carpeta en Cloudinary
        format: async (req, file) => 'jpg',
        public_id: (req, file) => Date.now() + '-' + path.parse(file.originalname).name,
    },
});

// Configuración de Multer para SERVICIOS (apuntando a Cloudinary)
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

// Lee la clave secreta desde el archivo .env
const JWT_SECRET = process.env.JWT_SECRET;

// 3. Middlewares
app.use(cors({
    origin: ['https://cosmetica-cvsi.onrender.com', 'http://localhost:5500'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
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

// Sirve los archivos estáticos (CSS, JS, logos del frontend)
app.use('/assets', express.static(path.join(__dirname, '../frontend/assets')));


// ===============================================================
// --- RUTAS PARA LA GESTIÓN DE SERVICIOS ---
// ===============================================================

// --- RUTA GET (Modificada para incluir nombre del área) ---
app.get('/api/servicios', async (req, res) => {
    try {
        // --- ¡CAMBIO (BD MIGRADA)! --- 
        // Hacemos JOIN para obtener el nombre del área
        const textoSQL = `
            SELECT s.*, a.nombre_area 
            FROM servicios s
            LEFT JOIN areas_trabajo a ON s.id_area = a.id_area
            ORDER BY s.id_servicio ASC
        `;
        const resultado = await pool.query(textoSQL);
        res.status(200).json(resultado.rows);
    } catch (error) {
        console.error('🔥 Error al consultar los servicios:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
});


// --- RUTA POST: Para CREAR un nuevo servicio ---
app.post('/api/servicios', uploadServicio.single('imagen'), async (req, res) => {
    // --- ¡CAMBIO (BD MIGRADA)! --- 
    // Se recibe id_area (número) en lugar de tipo_trabajador (texto)
    const { titulo, subtitulo, descripcion, valor, id_area } = req.body;

    const imagen_url = req.file ? req.file.path : null;

    // --- ¡CAMBIO (BD MIGRADA)! --- 
    if (!titulo || !valor || !id_area) {
        return res.status(400).json({ message: 'Título, valor y ID de área son obligatorios.' });
    }

    try {
        // --- ¡CAMBIO (BD MIGRADA)! --- 
        const textoSQL = `INSERT INTO servicios(titulo, subtitulo, descripcion, valor, imagen_url, id_area) VALUES($1, $2, $3, $4, $5, $6) RETURNING * `;
        // --- ¡CAMBIO (BD MIGRADA)! --- 
        const valores = [titulo, subtitulo, descripcion, valor, imagen_url, id_area];
        const resultado = await pool.query(textoSQL, valores);
        res.status(201).json(resultado.rows[0]);
    } catch (error) {
        console.error('🔥 Error al crear el servicio:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
});

// --- RUTA PUT: Para ACTUALIZAR un servicio ---
app.put('/api/servicios/:id', uploadServicio.single('imagen'), async (req, res) => {
    const { id } = req.params;
    // --- ¡CAMBIO (BD MIGRADA)! --- 
    // Se recibe id_area (número) en lugar de tipo_trabajador (texto)
    const { titulo, subtitulo, descripcion, valor, id_area } = req.body;

    // --- ¡CAMBIO (BD MIGRADA)! --- 
    if (!titulo || !valor || !id_area) {
        return res.status(400).json({ message: 'Título, valor y ID de área son obligatorios.' });
    }

    try {
        const result = await pool.query('SELECT imagen_url FROM servicios WHERE id_servicio = $1', [id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Servicio no encontrado.' });
        }
        let imagen_url = result.rows[0]?.imagen_url;

        if (req.file) {
            imagen_url = req.file.path;
        }

        // --- ¡CAMBIO (BD MIGRADA)! --- 
        const textoSQL = `UPDATE servicios SET titulo = $1, subtitulo = $2, descripcion = $3, valor = $4, imagen_url = $5, id_area = $6 WHERE id_servicio = $7 RETURNING * `;
        // --- ¡CAMBIO (BD MIGRADA)! --- 
        const valores = [titulo, subtitulo, descripcion, valor, imagen_url, id_area, id];
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

// --- RUTA POST: Para CREAR un nuevo producto --- (Sigue igual)
app.post('/api/productos', upload.single('imagen'), async (req, res) => {
    const { nombre, descripcion, valor, stock } = req.body;

    if (!req.file) {
        return res.status(400).json({ message: 'La imagen es obligatoria.' });
    }

    const imagen_url = req.file.path;

    try {
        const textoSQL = `INSERT INTO productos(nombre, descripcion, valor, stock, imagen_url) VALUES($1, $2, $3, $4, $5) RETURNING * `;
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

// --- RUTA PUT: Para ACTUALIZAR un producto --- (Sigue igual)
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
            imagen_url = req.file.path;
        }

        const textoSQL = `UPDATE productos SET nombre = $1, descripcion = $2, valor = $3, stock = $4, imagen_url = $5 WHERE id_producto = $6 RETURNING *`;
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
// --- RUTAS DE LOGIN, RESERVAS, RESEÑAS, ETC. ---
// ===============================================================

// --- RUTA POST para INICIAR SESIÓN --- (Sigue igual, 'id_area' es correcto)
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
                JWT_SECRET,
                { expiresIn: '1h' }
            );

            res.status(200).json({
                success: true,
                message: 'Inicio de sesión exitoso.',
                token: token,
                id_area: usuario.id_area // 'id_area' existe en la nueva tabla 'usuarios'
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
    // --- ¡CAMBIO (BD MIGRADA)! --- 
    // Se recibe id_servicio e id_area (números)
    const { nombre, rut, telefono, id_servicio, fecha, hora, id_area } = req.body;
    console.log('Recibiendo nueva reserva pública:', req.body);

    // --- ¡CAMBIO (BD MIGRADA)! --- 
    if (!nombre || !id_servicio || !fecha || !hora || !rut || !id_area) {
        return res.status(400).json({ success: false, message: 'Nombre, RUT, servicio, fecha, hora y área son obligatorios.' });
    }

    try {
        // --- ¡CAMBIO (BD MIGRADA)! --- 
        // Se insertan los IDs. 'rut_cliente' ya existía.
        const textoSQL = `INSERT INTO reservas(nombre_cliente, rut_cliente, telefono_cliente, id_servicio, fecha_reserva, hora_reserva, id_area) VALUES($1, $2, $3, $4, $5, $6, $7) RETURNING * `;
        // --- ¡CAMBIO (BD MIGRADA)! --- 
        const valores = [nombre, rut, telefono, id_servicio, fecha, hora, id_area];

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
// REEMPLAZA ESTA RUTA COMPLETA (alrededor de la línea 369)

app.post('/api/resenas', async (req, res) => {
    // 1. Recibe la calificación
    const { nombre, comentario, calificacion } = req.body;

    // 2. Valida la calificación
    if (!nombre || !comentario || !calificacion) {
        return res.status(400).json({ message: 'El nombre, el comentario y la calificación son obligatorios.' });
    }

    try {
        const estado = false;

        // --- ¡CORRECCIÓN! ---
        const fecha = new Date(); // 1. Añade la fecha

        // 2. Añade 'fecha_creacion' y '$5'
        const textoSQL = 'INSERT INTO resenas(nombre, comentario, estado_aprobacion, calificacion, fecha_creacion) VALUES($1, $2, $3, $4, $5) RETURNING *';

        // 3. Añade 'fecha' al array de valores
        const valores = [nombre, comentario, estado, calificacion, fecha];
        // --- FIN DE LA CORRECCIÓN ---

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
        // --- ¡CAMBIO (BD MIGRADA)! --- 
        // Se actualizan nombres de columnas ("Comentario" -> comentario, "Fecha" -> fecha_creacion)
        const textoSQL = 'SELECT nombre, comentario, calificacion FROM resenas WHERE estado_aprobacion = true ORDER BY fecha_creacion DESC';
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
        // --- ¡CAMBIO (BD MIGRADA)! --- 
        // Se actualizan nombres de columnas ("Comentario" -> comentario, "Fecha" -> fecha_creacion)
        const textoSQL = 'SELECT id_resena, nombre, comentario, calificacion, estado_aprobacion FROM resenas ORDER BY fecha_creacion DESC';
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
        // --- ¡CAMBIO (BD MIGRADA)! --- 
        // (Nombre de columna 'estado_aprobacion' era correcto)
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
    // --- ¡CAMBIO (BD MIGRADA)! --- 
    // Se recibe id_area (número) en lugar de area (texto)
    const { fecha, id_area } = req.query;
    if (!fecha || !id_area || id_area === 'undefined' || id_area === 'null') {
        return res.status(400).json({ message: 'La fecha y el ID de área son obligatorias para verificar la disponibilidad.' });
    }
    try {
        // --- ¡CAMBIO (BD MIGRADA)! --- 
        // Se consulta por id_area en lugar de area_servicio
        const textoSQL = 'SELECT hora_reserva FROM reservas WHERE fecha_reserva = $1 AND id_area = $2';
        const resultado = await pool.query(textoSQL, [fecha, id_area]);
        const horariosOcupados = resultado.rows.map(fila => fila.hora_reserva.trim());
        res.status(200).json(horariosOcupados);
    } catch (error) {
        console.error('🔥 Error CRÍTICO al consultar horarios ocupados:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
});


// --- RUTAS ADMIN DE RESERVAS ---
app.get('/api/admin/reservas', async (req, res) => {
    // --- ¡CAMBIO (BD MIGRADA)! --- 
    // El filtro ahora es por id_area
    const { id_area } = req.query;

    // --- ¡CAMBIO (BD MIGRADA)! --- 
    // Hacemos JOIN para obtener los nombres de servicios y áreas
    let textoSQL = `
        SELECT 
            r.*, 
            s.titulo AS servicio_titulo, 
            a.nombre_area 
        FROM reservas r
        LEFT JOIN servicios s ON r.id_servicio = s.id_servicio
        LEFT JOIN areas_trabajo a ON r.id_area = a.id_area
    `;
    const values = [];
    if (id_area && id_area !== 'todos') {
        textoSQL += ' WHERE r.id_area = $1'; // Se filtra por id_area
        values.push(id_area);
    }
    textoSQL += ' ORDER BY r.fecha_reserva ASC, r.hora_reserva ASC';
    try {
        const resultado = await pool.query(textoSQL, values);
        res.status(200).json(resultado.rows);
    } catch (error) {
        console.error('🔥 Error al consultar las reservas:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
});

app.post('/api/admin/reservas', async (req, res) => {
    // --- ¡CAMBIO (BD MIGRADA)! --- 
    // Se reciben IDs (id_servicio, id_area)
    const { nombre_cliente, rut_cliente, telefono_cliente, id_servicio, fecha_reserva, hora_reserva, id_area } = req.body;
    if (!nombre_cliente || !telefono_cliente || !id_servicio || !fecha_reserva || !hora_reserva || !id_area) {
        return res.status(400).json({ message: 'Todos los campos son obligatorios.' });
    }
    try {
        // --- ¡CAMBIO (BD MIGRADA)! --- 
        // El checkSQL ahora usa id_area
        const checkSQL = 'SELECT id FROM reservas WHERE fecha_reserva = $1 AND hora_reserva = $2 AND id_area = $3';
        const checkResult = await pool.query(checkSQL, [fecha_reserva, hora_reserva, id_area]);
        if (checkResult.rowCount > 0) {
            return res.status(409).json({ message: `Este bloque horario ya está reservado para el área seleccionada.` });
        }

        // --- ¡CORRECCIÓN FINAL! ---
        // Se reescribió la consulta en una sola línea para eliminar 100%
        // cualquier carácter de espacio corrupto (U+00A0) que causaba el error.
        const textoSQL = `INSERT INTO reservas(nombre_cliente, rut_cliente, telefono_cliente, id_servicio, fecha_reserva, hora_reserva, id_area) VALUES($1, $2, $3, $4, $5, $6, $7) RETURNING *`;
        // --- FIN DE LA CORRECCIÓN ---

        // --- ¡CAMBIO (BD MIGRADA)! --- 
        const valores = [nombre_cliente, rut_cliente, telefono_cliente, id_servicio, fecha_reserva, hora_reserva, id_area];

        // Esta es la línea que fallaba (aprox 540)
        const resultado = await pool.query(textoSQL, valores);

        res.status(201).json(resultado.rows[0]);
    } catch (error) {
        console.error('🔥 Error al crear la reserva:', error);
        res.status(500).json({ message: 'Error interno del servidor al crear la reserva.' });
    }
});

app.put('/api/admin/reservas/:id', async (req, res) => {
    const { id } = req.params;
    const { nombre_cliente, rut_cliente, telefono_cliente, id_servicio, fecha_reserva, hora_reserva, id_area } = req.body;

    if (!nombre_cliente || !telefono_cliente || !id_servicio || !fecha_reserva || !hora_reserva || !id_area) {
        return res.status(400).json({ message: 'Todos los campos son obligatorios.' });
    }

    try {
        // Primero, revisa si hay conflictos
        const checkSQL = 'SELECT id FROM reservas WHERE fecha_reserva = $1 AND hora_reserva = $2 AND id_area = $3 AND id != $4';
        const checkResult = await pool.query(checkSQL, [fecha_reserva, hora_reserva, id_area, id]);

        if (checkResult.rowCount > 0) {
            return res.status(409).json({ message: `Este bloque horario ya está ocupado por otra reserva en el área seleccionada.` });
        }

        // --- CORRECCIÓN FINAL ---
        // Se reescribió la consulta en una sola línea para eliminar 100%
        // cualquier carácter de espacio corrupto (U+00A0) que causaba el error.
        const textoSQL = `UPDATE reservas SET nombre_cliente = $1, rut_cliente = $2, telefono_cliente = $3, id_servicio = $4, fecha_reserva = $5, hora_reserva = $6, id_area = $7 WHERE id = $8 RETURNING *`;
        // --- FIN DE LA CORRECCIÓN ---

        const valores = [nombre_cliente, rut_cliente, telefono_cliente, id_servicio, fecha_reserva, hora_reserva, id_area, id];

        // Esta es la línea que fallaba (ahora 576)
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

// --- RUTAS DE ÁREAS --- (Sin cambios, el schema es compatible)
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
            return res.status(409).json({ message: 'Error: No se puede eliminar el área porque está asignada a uno o más trabajadores o servicios.' });
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
        // --- ¡CAMBIO (BD MIGRADA)! --- 
        // Se actualiza nombre de columna ("Correo" -> correo)
        const insertSQL = `INSERT INTO usuarios(nombre_completo, username, password_hash, correo, id_area) VALUES($1, $2, $3, $4, $5) RETURNING id, username, nombre_completo; `;
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
        // --- ¡CAMBIO (BD MIGRADA)! --- 
        // Se actualiza nombre de columna ("Correo" -> correo)
        // Se añade JOIN para obtener el nombre del área
        const textoSQL = `SELECT u.id, u.nombre_completo, u.username, u.correo as email, u.id_area,a.nombre_area FROM usuarios u LEFT JOIN areas_trabajo a ON u.id_area = a.id_area ORDER BY u.nombre_completo ASC;`;
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
        if (password) {
            const saltRounds = 10;
            passwordHash = await bcrypt.hash(password, saltRounds);
        }

        let updateSQL;
        let values;

        if (passwordHash) {
            // --- ¡CAMBIO (BD MIGRADA)! --- 
            updateSQL = `UPDATE usuarios SET nombre_completo = $1, username = $2, correo = $3, id_area = $4, password_hash = $5 WHERE id = $6 RETURNING id, username, nombre_completo; `;
            values = [nombre, username, email, id_area, passwordHash, id];
        } else {
            // --- ¡CAMBIO (BD MIGRADA)! --- 
            updateSQL = `UPDATE usuarios SET nombre_completo = $1, username = $2, correo = $3, id_area = $4 WHERE id = $5 RETURNING id, username, nombre_completo;`;
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

    const sql = `
      SELECT
        u.id,
        u.nombre_completo,
        u.username,
        u.correo,
        u.id_area,
        a.nombre_area
      FROM usuarios AS u
      LEFT JOIN areas_trabajo AS a ON a.id_area = u.id_area
      WHERE u.id = $1
      LIMIT 1
    `;

    const { rows } = await pool.query(sql, [userId]);

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado.' });
    }

    return res.status(200).json(rows[0]);
  } catch (error) {
    console.error('🔥 Error en GET /api/trabajador/perfil:', error);
    return res.status(500).json({ message: 'Error interno del servidor.' });
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


// --- RUTA NUEVA: OBTENER UNA SOLA RESERVA POR ID ---
// (Necesaria para la página de 'registrar_pago.js')
app.get('/api/admin/reservas/:id', async (req, res) => {
    const { id } = req.params;
    try {
        // --- SQL LIMPIO ---
        const textoSQL = `SELECT 
            r.*, 
            s.titulo AS servicio_titulo, 
            a.nombre_area 
        FROM reservas r
        LEFT JOIN servicios s ON r.id_servicio = s.id_servicio
        LEFT JOIN areas_trabajo a ON r.id_area = a.id_area
        WHERE r.id = $1`;

        const resultado = await pool.query(textoSQL, [id]);

        if (resultado.rowCount === 0) {
            return res.status(404).json({ message: 'Reserva no encontrada.' });
        }
        res.status(200).json(resultado.rows[0]); // Devuelve solo un objeto
    } catch (error) {
        console.error(`🔥 Error al consultar la reserva ${id}:`, error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
}); // <-- El error 'ReferenceError: s' estaba aquí


// --- RUTA GET: OBTENER TODOS LOS PAGOS (PARA EL DASHBOARD) ---
app.get('/api/pagos', async (req, res) => {
    try {
        // Esta consulta trae todos los pagos
        // El script dashboards.js se encargará de cruzar esta info
        // con la de /api/admin/reservas y /api/areas
        const textoSQL = `SELECT * FROM pagos ORDER BY fecha_pago DESC`;
        const resultado = await pool.query(textoSQL);
        res.status(200).json(resultado.rows);
    } catch (error) {
        console.error('🔥 Error en GET /api/pagos:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
});


// --- RUTA NUEVA: REGISTRAR UN PAGO ---
app.post('/api/pagos', async (req, res) => {
    const {
        id_reserva,
        tipo_pago,
        monto_pagado,
        metodo_pago,
        fecha_pago,
        nombre_cliente,
        tipo_servicio,
        registrado_por
    } = req.body;

    if (!id_reserva || !monto_pagado || !metodo_pago || !fecha_pago) {
        return res.status(400).json({ message: 'Faltan campos obligatorios para el pago.' });
    }

    try {
        // --- SQL LIMPIO ---
        const textoSQL = `INSERT INTO pagos (id_reserva, tipo_pago, monto_pagado, metodo_pago, fecha_pago, nombre_cliente, tipo_servicio, registrado_por)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id_pago`;

        const valores = [id_reserva, tipo_pago, monto_pagado, metodo_pago, fecha_pago, nombre_cliente, tipo_servicio, registrado_por];

        await pool.query(textoSQL, valores);
        res.status(201).json({ message: 'Pago registrado con éxito.' });

    } catch (error) {
        console.error('🔥 Error al registrar el pago:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
});


// ===============================================================
// --- RUTAS FICHAS CLÍNICAS (GET + POST) ---
//    GET  /api/fichas?id_reserva=123  -> 200 con objeto | 404 si no existe
//    POST /api/fichas                 -> 201 crea registro
// ===============================================================
// server.js — GET /api/fichas (incluye registrado_por y fecha_creacion; 204 si no hay)
// Opción 2: si NO quieres agregar la columna ahora, quita `fecha_creacion` del SELECT
// server.js — reemplaza la ruta GET /api/fichas por esta versión SIN fecha_creacion

app.get('/api/fichas', async (req, res) => {
  const id_reserva = Number(req.query.id_reserva);
  if (!Number.isInteger(id_reserva) || id_reserva <= 0) {
    return res.status(400).json({ message: 'Parámetro id_reserva es requerido' });
  }

  try {
    const { rows } = await pool.query(
      `SELECT id_ficha, id_reserva, detalle, registrado_por
       FROM public.fichas_clinicas
       WHERE id_reserva = $1
       ORDER BY id_ficha DESC
       LIMIT 1`,
      [id_reserva]
    );

    if (rows.length === 0) return res.status(204).send();
    return res.status(200).json(rows[0]);
  } catch (err) {
    console.error('GET /api/fichas error:', err);
    return res.status(500).json({ message: 'Error al obtener ficha' });
  }
});



// Si también quitaste fecha_creacion, ajusta el POST para no devolverla:
// server.js — POST /api/fichas SIN fecha_creacion en el RETURNING
// server.js — POST /api/fichas (inserta `registrado_por` si viene en el body)
app.post('/api/fichas', async (req, res) => {
  try {
    const id_reserva = Number(req.body?.id_reserva);
    const detalle_raw = req.body?.detalle ?? req.body?.detalles_sesion ?? '';
    const detalle = typeof detalle_raw === 'string' ? detalle_raw.trim() : String(detalle_raw).trim();
    const registrado_por = (req.body?.registrado_por ?? null) || null;

    if (!Number.isInteger(id_reserva) || id_reserva <= 0 || !detalle) {
      return res.status(400).json({ message: 'id_reserva y detalle son obligatorios' });
    }

    await pool.query('BEGIN');

    const dup = await pool.query(
      'SELECT 1 FROM public.fichas_clinicas WHERE id_reserva = $1 LIMIT 1',
      [id_reserva]
    );
    if (dup.rowCount > 0) {
      await pool.query('ROLLBACK');
      return res.status(409).json({ message: 'Ya existe una ficha para esta reserva' });
    }

    const insert = await pool.query(
      `INSERT INTO public.fichas_clinicas (id_reserva, detalle, registrado_por)
       VALUES ($1, $2, $3)
       RETURNING id_ficha, id_reserva, detalle, registrado_por`,
      [id_reserva, detalle, registrado_por]
    );

    await pool.query('COMMIT');
    return res.status(201).json({ message: 'Ficha guardada correctamente', ficha: insert.rows[0] });
  } catch (err) {
    try { await pool.query('ROLLBACK'); } catch {}
    console.error('POST /api/fichas error:', err);
    return res.status(500).json({ message: 'Error al guardar la ficha' });
  }
});


// 5. Iniciar el servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor escuchando en http://localhost:${PORT}`);
});