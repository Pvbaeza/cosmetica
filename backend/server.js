// Archivo: server.js

// 1. Importaciones necesarias
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt'); // Se usa para comparar contraseñas de forma segura
const jwt = require('jsonwebtoken'); // ¡NUEVA IMPORTACIÓN!
const pool = require('./conexion.js'); // Tu archivo de conexión a la BD
const path = require('path'); // <-- AÑADE ESTA LÍNEA
const multer = require('multer');


// Configuración de Multer para guardar las imágenes de productos
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // La ruta es relativa a donde se ejecuta el servidor (la carpeta 'backend')
    cb(null, path.join(__dirname, '../frontend/assets/img/Productos'));
  },
  filename: function (req, file, cb) {
    // Crea un nombre de archivo único con la fecha actual para evitar sobreescribir
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});



// NUEVA configuración para guardar las imágenes de SERVICIOS
const serviceStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Asegúrate de que la carpeta 'servicios' exista dentro de 'assets/img'
    cb(null, path.join(__dirname, '../frontend/assets/img/Servicios'));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'servicio-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const uploadServicio = multer({ storage: serviceStorage }); // Nuevo 'uploader'


const upload = multer({ storage: storage });

// 2. Configuración inicial
const app = express();
const PORT = 3000;

// ¡NUEVO! Clave secreta para firmar los tokens. En un proyecto real, esto debería estar en un archivo de entorno.
const JWT_SECRET = 'tu_clave_secreta_super_dificil_de_adivinar';

// 3. Middlewares (ESTE ES EL ORDEN CORRECTO)
app.use(cors()); 
app.use(express.json()); 

// TERCERO: Sirve los archivos estáticos
app.use('/assets', express.static(path.join(__dirname, '../frontend/assets')));





// ===============================================================
// --- RUTAS PARA LA GESTIÓN DE SERVICIOS (¡NUEVO!) ---
// ===============================================================

// --- RUTA GET: Para OBTENER TODOS los servicios ---
app.get('/api/servicios', async (req, res) => {
    try {
        // Asumimos que la tabla se llama 'servicios'
        const textoSQL = 'SELECT * FROM servicios ORDER BY id_servicio ASC';
        const resultado = await pool.query(textoSQL);
        res.status(200).json(resultado.rows);
    } catch (error) {
        console.error('🔥 Error al consultar los servicios:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
});


// --- RUTA POST: Para CREAR un nuevo servicio CON IMAGEN y TIPO DE TRABAJADOR --- (MODIFICADO)
app.post('/api/servicios', uploadServicio.single('imagen'), async (req, res) => {
    // Obtenemos el nuevo campo del cuerpo de la petición
    const { titulo, subtitulo, descripcion, valor, tipo_trabajador } = req.body;
    
    const imagen_url = req.file ? `assets/img/Servicios/${req.file.filename}` : null;

    // Actualizamos la validación
    if (!titulo || !valor || !tipo_trabajador) {
        return res.status(400).json({ message: 'Título, valor y tipo de profesional son obligatorios.' });
    }

    try {
        // Actualizamos la consulta SQL para incluir la nueva columna
        const textoSQL = `
            INSERT INTO servicios(titulo, subtitulo, descripcion, valor, imagen_url, tipo_trabajador)
            VALUES($1, $2, $3, $4, $5, $6) RETURNING *
        `;
        // Actualizamos los valores a insertar
        const valores = [titulo, subtitulo, descripcion, valor, imagen_url, tipo_trabajador];
        const resultado = await pool.query(textoSQL, valores);
        res.status(201).json(resultado.rows[0]);
    } catch (error) {
        console.error('🔥 Error al crear el servicio:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
});

// --- RUTA PUT: Para ACTUALIZAR un servicio existente CON IMAGEN y TIPO DE TRABAJADOR --- (MODIFICADO)
app.put('/api/servicios/:id', uploadServicio.single('imagen'), async (req, res) => {
    const { id } = req.params;
    // Obtenemos el nuevo campo del cuerpo de la petición
    const { titulo, subtitulo, descripcion, valor, tipo_trabajador } = req.body;

    // Actualizamos la validación
    if (!titulo || !valor || !tipo_trabajador) {
        return res.status(400).json({ message: 'Título, valor y tipo de profesional son obligatorios.' });
    }
    
    try {
        const result = await pool.query('SELECT imagen_url FROM servicios WHERE id_servicio = $1', [id]);
        let imagen_url = result.rows[0]?.imagen_url;

        if (req.file) {
            imagen_url = `assets/img/Servicios/${req.file.filename}`;
        }

        // Actualizamos la consulta SQL para modificar la nueva columna
        const textoSQL = `
            UPDATE servicios
            SET titulo = $1, subtitulo = $2, descripcion = $3, valor = $4, imagen_url = $5, tipo_trabajador = $6
            WHERE id_servicio = $7 RETURNING *
        `;
        // Actualizamos los valores
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
// --- RUTA DELETE: Para ELIMINAR un servicio ---
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











// --- RUTA POST: Para CREAR un nuevo producto con imagen ---
app.post('/api/productos', upload.single('imagen'), async (req, res) => {
    // 'imagen' debe coincidir con el nombre del campo en el FormData del frontend
    
    // Los datos del formulario de texto están en req.body
    const { nombre, descripcion, valor, stock } = req.body;
    
    // La información del archivo subido está en req.file
    if (!req.file) {
        return res.status(400).json({ message: 'La imagen es obligatoria.' });
    }
    
    // Construimos la URL relativa que guardaremos en la base de datos
    const imagen_url = `assets/img/Productos/${req.file.filename}`;

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

// --- RUTA PUT: Para ACTUALIZAR un producto (NUEVA) ---
app.put('/api/productos/:id', upload.single('imagen'), async (req, res) => {
    const { id } = req.params;
    const { nombre, descripcion, valor, stock } = req.body;

    try {
        // Primero, obtenemos la URL de la imagen actual para no perderla si no se sube una nueva
        const result = await pool.query('SELECT imagen_url FROM productos WHERE id_producto = $1', [id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Producto no encontrado.' });
        }
        let imagen_url = result.rows[0].imagen_url;

        // Si se subió un nuevo archivo, actualizamos la URL
        if (req.file) {
            imagen_url = `assets/img/Productos/${req.file.filename}`;
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

// --- RUTA DELETE: Para ELIMINAR un producto (NUEVA) ---
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

// --- RUTA GET: Para OBTENER TODOS los productos ---
app.get('/api/productos', async (req, res) => {
    try {
        // Asumimos que la tabla se llama 'productos' y tiene una columna 'id_producto'
        const textoSQL = 'SELECT * FROM productos ORDER BY id_producto DESC';
        
        const resultado = await pool.query(textoSQL);
        
        // Enviamos la lista de productos encontrada de vuelta al frontend
        res.status(200).json(resultado.rows);

    } catch (error) {
        console.error('🔥 Error al consultar los productos:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
});






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
            // 1. Generar un token si el login es exitoso
            const token = jwt.sign(
                { userId: usuario.id, username: usuario.username }, // Contenido del token
                JWT_SECRET, // Clave secreta
                { expiresIn: '1h' } // El token expira en 1 hora
            );
            // 2. Enviar el token al frontend
            res.status(200).json({ success: true, message: 'Inicio de sesión exitoso.', token: token });
        } else {
            res.status(401).json({ success: false, message: 'Credenciales incorrectas.' });
        }
    } catch (error) {
        console.error('🔥 Error en POST /api/login:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor.' });
    }
});








// --- RUTA POST PARA CREAR RESERVAS (SIMPLIFICADA) ---
// --- RUTA POST PARA CREAR RESERVAS (PÚBLICA) ---
app.post('/api/reservas', async (req, res) => {
    // MODIFICADO: Añadimos 'area_servicio' a los datos que recibimos del frontend
    const { nombre, rut, telefono, servicio, fecha, hora, area_servicio } = req.body;

    console.log('Recibiendo nueva reserva pública:', req.body);

    // Validación
    if (!nombre || !servicio || !fecha || !hora) {
        return res.status(400).json({ success: false, message: 'Nombre, servicio, fecha y hora son obligatorios.' });
    }

    try {
        // MODIFICADO: Actualizamos la consulta SQL para insertar la nueva columna
        const textoSQL = `
            INSERT INTO reservas(nombre_cliente, rut_cliente, telefono_cliente, servicio, fecha_reserva, hora_reserva, area_servicio)
            VALUES($1, $2, $3, $4, $5, $6, $7) RETURNING *
        `;
        // MODIFICADO: Añadimos el nuevo valor al array
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





// --- RUTA POST: Para CREAR nuevas reseñas ---
app.post('/api/resenas', async (req, res) => {
    // Volvemos a aceptar el nombre y el comentario para poder mostrarlos luego
    const { nombre, comentario } = req.body;

    console.log('Recibiendo nueva reseña:', { nombre, comentario });

    if (!nombre || !comentario) {
        return res.status(400).json({ message: 'El nombre y el comentario son obligatorios.' });
    }

    try {
        const fecha = new Date();
        const estado = false;

        // ¡Asegúrate de tener una columna "nombre" en tu tabla resenas!
        const textoSQL = 'INSERT INTO resenas(nombre, "Comentario", "Fecha", "estado_aprobacion") VALUES($1, $2, $3, $4) RETURNING *';
        const valores = [nombre, comentario, fecha, estado];

        const resultado = await pool.query(textoSQL, valores);

        if (resultado.rowCount === 1) {
            console.log('🎉 ¡Reseña insertada con éxito!');
            res.status(201).json({
                message: '¡Gracias por tu reseña! Ha sido enviada con éxito.',
                data: resultado.rows[0]
            });
        } else {
            res.status(500).json({ message: 'Ocurrió un error inesperado al guardar la reseña.' });
        }

    } catch (error) {
        console.error('🔥 Error al realizar la inserción:', error);
        res.status(500).json({ message: 'Error interno del servidor.', error: error.message });
    }
});

// --- ¡NUEVO! RUTA GET: Para OBTENER las reseñas aprobadas ---
app.get('/api/resenas', async (req, res) => {
    try {
        // Consultamos solo las reseñas con estado_aprobacion = true
        const textoSQL = 'SELECT nombre, "Comentario" FROM resenas WHERE estado_aprobacion = true ORDER BY "Fecha" DESC';
        
        const resultado = await pool.query(textoSQL);
        
        // Enviamos las reseñas encontradas de vuelta al frontend
        res.status(200).json(resultado.rows);

    } catch (error) {
        console.error('🔥 Error al consultar las reseñas:', error);
        res.status(500).json({ message: 'Error interno del servidor.', error: error.message });
    }
});





// OBTENER TODAS las reseñas (publicadas y no publicadas)
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

// ACTUALIZAR el estado de una reseña (publicar/ocultar)
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

// ELIMINAR una reseña
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








app.get('/api/horarios-ocupados', async (req, res) => {
    const { fecha, area } = req.query;

    // --- LOGGING PARA DEPURACIÓN ---
    console.log(`\n[${new Date().toLocaleTimeString()}] Solicitud de horarios recibida.`);
    console.log(` -> Fecha recibida: ${fecha}`);
    console.log(` -> Área recibida: ${area}`);
    
    // Verificación más robusta para evitar errores
    if (!fecha || !area || area === 'undefined' || area === 'null') {
        console.log(" -> Respuesta: Error 400 - Faltan parámetros 'fecha' o 'area'.");
        return res.status(400).json({ message: 'La fecha y el área son obligatorias para verificar la disponibilidad.' });
    }

    try {
        const textoSQL = 'SELECT hora_reserva FROM reservas WHERE fecha_reserva = $1 AND area_servicio = $2';
        console.log(' -> Ejecutando consulta SQL para verificar disponibilidad...');
        const resultado = await pool.query(textoSQL, [fecha, area]);
        
        const horariosOcupados = resultado.rows.map(fila => fila.hora_reserva);
        
        console.log(` -> Consulta exitosa. Horarios ocupados encontrados: [${horariosOcupados.join(', ')}]`);
        console.log(" -> Respuesta: Enviando 200 OK con los horarios.");
        
        res.status(200).json(horariosOcupados);

    } catch (error) {
        // --- LOGGING DE ERRORES CRÍTICOS ---
        console.error('🔥 Error CRÍTICO al consultar horarios ocupados:', error);
        console.log(" -> Respuesta: Enviando 500 Internal Server Error.");

        res.status(500).json({ message: 'Error interno del servidor.' });
    }
});


// --- RUTA GET: Para OBTENER TODAS las reservas (MODIFICADA PARA FILTRAR) ---
app.get('/api/admin/reservas', async (req, res) => {
    const { area } = req.query; // Capturamos el parámetro 'area' de la URL

    let textoSQL = 'SELECT * FROM reservas';
    const values = [];

    // Si se especificó un área y no es 'todos', añadimos un filtro a la consulta
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

// --- RUTA POST: Para CREAR una nueva reserva ---
app.post('/api/admin/reservas', async (req, res) => {
    const { nombre_cliente, rut_cliente, telefono_cliente, servicio, fecha_reserva, hora_reserva, area_servicio } = req.body;

    if (!nombre_cliente || !telefono_cliente || !servicio || !fecha_reserva || !hora_reserva || !area_servicio) {
        return res.status(400).json({ message: 'Todos los campos son obligatorios.' });
    }

    try {
        // VALIDACIÓN DE DISPONIBILIDAD POR ÁREA
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

// --- RUTA PUT: Para ACTUALIZAR una reserva existente ---
app.put('/api/admin/reservas/:id', async (req, res) => {
    const { id } = req.params;
    const { nombre_cliente, rut_cliente, telefono_cliente, servicio, fecha_reserva, hora_reserva, area_servicio } = req.body;

     if (!nombre_cliente || !telefono_cliente || !servicio || !fecha_reserva || !hora_reserva || !area_servicio) {
        return res.status(400).json({ message: 'Todos los campos son obligatorios.' });
    }

    try {
        // VALIDACIÓN DE DISPONIBILIDAD POR ÁREA (excluyendo la reserva actual)
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

// --- RUTA DELETE: Para ELIMINAR una reserva ---
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



// --- RUTA GET: Para OBTENER todas las áreas de trabajo ---
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

// --- RUTA POST: Para CREAR una nueva área de trabajo ---
app.post('/api/areas', async (req, res) => {
    const { nombre } = req.body; // El nombre viene del frontend

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
        // Maneja el error si el área ya existe (error de restricción 'unique')
        if (error.code === '23505') {
            return res.status(409).json({ message: 'Error: El área ya existe.' });
        }
        console.error('🔥 Error al crear área:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
});

// --- RUTA DELETE: Para ELIMINAR un área de trabajo por ID ---
app.delete('/api/areas/:id', async (req, res) => {
    const { id } = req.params; // Obtiene el ID de la URL

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
        // Error si el área está siendo usada por un trabajador (foreign key)
        if (error.code === '23503') { 
            return res.status(409).json({ message: 'Error: No se puede eliminar el área porque está asignada a uno o más trabajadores.' });
        }
        console.error('🔥 Error al eliminar área:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
});


// --- RUTA PARA CREAR NUEVO TRABAJADOR ---
app.post('/api/trabajadores', async (req, res) => {
    const { nombre, id_area, email, username, password } = req.body;
    if (!nombre || !id_area || !email || !username || !password) {
        return res.status(400).json({ message: 'Todos los campos son obligatorios.' });
    }
    try {
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);
        // OJO: Asegúrate que tu tabla usa "Correo" con mayúscula si ese es el caso.
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

// --- RUTA GET: Para OBTENER TODOS los trabajadores (CORREGIDA) ---
app.get('/api/trabajadores', async (req, res) => {
    try {
        // CORRECCIÓN: Se eliminó "WHERE u.id_area IS NOT NULL" para incluir a todos los usuarios.
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

// --- RUTA PUT: Para ACTUALIZAR un trabajador existente ---
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


// 5. Iniciar el servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor escuchando en http://localhost:${PORT}`);
});

