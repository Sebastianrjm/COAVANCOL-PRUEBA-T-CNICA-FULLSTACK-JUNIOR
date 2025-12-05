const express = require('express')
const fs = require('fs')
const path = require('path')
const bodyParser = require('body-parser')
const cors = require('cors')

const app = express()
const PORT = process.env.PORT || 4000
const DB_DIR = path.join(__dirname, 'db')
const DB_PATH = path.join(DB_DIR, 'asociados.json')

// --- Configuración Middleware ---
app.use(cors())
app.use(bodyParser.json())

// --- Definiciones del Pipeline de Estados ---

// Lista de estados válidos según el enunciado
const VALID_STATES = [
  'Prospecto',
  'Expediente en Construcción',
  'Pendiente Jurídico',
  'Pendiente Cierre de Crédito',
  'Pendiente Firma y Litivo',
  'Pendiente Revisión Abogado',
  'Cartera Activa',
  'Desembolsado/Finalizado'
]

// Reglas de transición permitidas (LINEALIDAD ESTRICTA: Solo se avanza al PRIMER elemento del array)
const allowedTransitions = {
  '': ['Prospecto'], // Estado inicial siempre va a 'Prospecto'
  'Prospecto': ['Expediente en Construcción'],
  'Expediente en Construcción': ['Pendiente Jurídico'], 
  'Pendiente Jurídico': ['Pendiente Cierre de Crédito'], 
  'Pendiente Cierre de Crédito': ['Pendiente Firma y Litivo'], 
  'Pendiente Firma y Litivo': ['Pendiente Revisión Abogado'], 
  'Pendiente Revisión Abogado': ['Cartera Activa'],
  'Cartera Activa': ['Desembolsado/Finalizado'],
  'Desembolsado/Finalizado': [] // Final, sin más transiciones
}

// --- Funciones de Utilidad de Base de Datos ---

function readDB() {
  try {
    // Si el archivo no existe, retorna un array vacío
    if (!fs.existsSync(DB_PATH)) return [] 
    const raw = fs.readFileSync(DB_PATH, 'utf-8')
    // Maneja el caso de archivo vacío
    return raw ? JSON.parse(raw) : []
  } catch (e) {
    console.error('Error leyendo DB:', e)
    return []
  }
}

function writeDBAtomic(data) {
  // Escribe de forma atómica: primero a un tmp, luego renombra
  try {
    if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true })
    const tmpPath = DB_PATH + '.tmp'
    fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf-8')
    fs.renameSync(tmpPath, DB_PATH)
  } catch (e) {
    console.error('Error escribiendo DB:', e)
    throw e
  }
}

// --- Rutas ---

// GET /api/asociados: Obtener todos los asociados
app.get('/api/asociados', (req, res) => {
  const data = readDB()
  res.json(data)
})

// GET /api/asociados/:id: Obtener asociado por ID o Identificación
app.get('/api/asociados/:id', (req, res) => {
  try {
    const id = req.params.id
    const db = readDB()
    const asociado = db.find((a) => (a.id && a.id === id) || (a.identificacion && a.identificacion === id))
    if (!asociado) return res.status(404).json({ success: false, message: 'Asociado no encontrado' })
    return res.json(asociado)
  } catch (err) {
    console.error(err)
    return res.status(500).json({ success: false, message: 'Error interno' })
  }
})

// 🔑 POST /api/updateEstadoPipeline: Actualizar el estado del pipeline de un asociado 
app.post('/api/updateEstadoPipeline', (req, res) => {
  try {
    const { asociadoId, nuevoEstado } = req.body || {}

    // Validación 1: Verificar que los campos obligatorios existen
    if (typeof asociadoId !== 'string' || asociadoId.trim() === '') {
      return res.status(400).json({ success: false, message: 'Campo asociadoId obligatorio (string no vacío)' })
    }
    if (typeof nuevoEstado !== 'string' || nuevoEstado.trim() === '') {
      return res.status(400).json({ success: false, message: 'Campo nuevoEstado obligatorio (string no vacío)' })
    }
    // Validación 2: Verificar que el nuevo estado es un valor conocido
    if (!VALID_STATES.includes(nuevoEstado)) {
      return res.status(400).json({ success: false, message: `nuevoEstado no válido. Valores permitidos: ${VALID_STATES.join(', ')}` })
    }

    // Leer DB y buscar asociado
    const db = readDB()
    const idx = db.findIndex(
      (a) => (a.id && a.id === asociadoId) || (a.identificacion && a.identificacion === asociadoId)
    )

    if (idx === -1) {
      // 404 Not Found: El ID es válido, pero no existe en la DB.
      return res.status(404).json({ success: false, message: `Asociado con ID/Identificación "${asociadoId}" no encontrado` })
    }

    const asociado = db[idx]
    const estadoActual = (asociado.estado_pipeline || '').trim()

    // --- Lógica de Transición Lineal Estricta (VALIDACIÓN DE FLUJO) ---

    const allowedNext = allowedTransitions[estadoActual] || []
    
    // Si el estado no cambia, es una operación nula, la aceptamos.
    if (nuevoEstado !== estadoActual) {
      // 1. Verificar si hay avances permitidos desde el estado actual
      if (allowedNext.length === 0) {
        return res.status(400).json({
          success: false,
          message: `Transición inválida: El estado actual "${estadoActual}" no permite más avances.`
        })
      }
      
      // 2. Verificar que el nuevo estado sea la única transición permitida
      if (nuevoEstado !== allowedNext[0]) {
        return res.status(400).json({
          success: false,
          message: `Transición inválida. Solo se permite avanzar a: "${allowedNext[0]}".`
        })
      }
    }

    // Actualizar valores del asociado
    asociado.estado_pipeline = nuevoEstado
    asociado.ultima_actualizacion = new Date().toISOString()

    // Persistir cambios
    db[idx] = asociado
    writeDBAtomic(db)

    return res.json({ success: true, message: 'Estado actualizado', asociado })
  } catch (err) {
    console.error('Error en updateEstadoPipeline:', err)
    return res.status(500).json({ success: false, message: 'Error interno del servidor' })
  }
})


// --- Inicio del Servidor ---

app.listen(PORT, () => {
  console.log(`Server escuchando en http://localhost:${PORT}`)
})