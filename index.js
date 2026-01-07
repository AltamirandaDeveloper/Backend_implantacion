const express = require("express")
const cors = require("cors")
const multer = require("multer")
const cloudinary = require("cloudinary").v2
const fs = require("fs")
const path = require("path")
const axios = require("axios")
require("dotenv").config()

const app = express()

// ==========================================
// CONFIGURACIÓN DE CORS CORREGIDA
// ==========================================
app.use(cors({ 
  origin: true, // Permite cualquier origen (localhost o URL de producción)
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}))

app.use(express.json())

// Configuración de Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

// Carpeta para archivos temporales de Multer
const uploadDir = "uploads"
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir)

// Configuración de Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + "-" + Math.round(Math.random() * 1e9) + path.extname(file.originalname)
    cb(null, uniqueName)
  },
})
const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } })

// Endpoint para subir archivos
app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No se recibió ningún archivo" })

    let resourceType = req.file.mimetype.includes("pdf") ? "raw" : "auto"

    const result = await cloudinary.uploader.upload(req.file.path, {
      resource_type: resourceType,
      folder: "contenidos_ingles",
      public_id: path.parse(req.file.originalname).name,
      overwrite: false,
      type: "upload",
    })

    if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path)

    res.json({
      success: true,
      url: result.secure_url,
      nombre: req.file.originalname,
      tipo: result.resource_type,
      mime: req.file.mimetype,
      public_id: result.public_id,
      size: result.bytes,
    })
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path)
    console.error(error)
    res.status(500).json({ error: "Error subiendo archivo", detalles: error.message })
  }
})

// Endpoint para descargar PDF
app.get("/download", async (req, res) => {
  try {
    const { url } = req.query
    if (!url) return res.status(400).send("Falta la URL del archivo")
    const fileName = url.split("/").pop().split("?")[0] || "archivo.pdf"
    const response = await axios.get(url, { responseType: "stream" })
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`)
    response.data.pipe(res)
  } catch (error) {
    console.error("Error descargando el PDF:", error.message)
    res.status(500).send("Error descargando el PDF")
  }
})

app.get("/test", (req, res) => res.json({ mensaje: "Backend funcionando ✅", timestamp: new Date().toISOString() }))

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`🚀 Backend activo en el puerto ${PORT}`));