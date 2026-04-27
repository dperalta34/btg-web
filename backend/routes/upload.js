'use strict';
const express = require('express');
const multer = require('multer');
const { validateFile } = require('../utils/validation');
const { sendFactura } = require('../utils/mailer');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

router.post('/upload-factura', upload.fields([
  { name: 'pdf', maxCount: 1 },
  { name: 'xml', maxCount: 1 },
]), async (req, res) => {
  try {
    const { nombre, cua, correo, mes, monto } = req.body || {};

    // Required field check
    if (!nombre || !cua || !correo || !mes || !monto) {
      return res.status(400).json({ message: 'Todos los campos son requeridos.' });
    }

    // Files
    const pdfFile = req.files?.pdf?.[0];
    const xmlFile = req.files?.xml?.[0];

    if (!pdfFile) return res.status(400).json({ message: 'El archivo PDF es requerido.' });
    if (!xmlFile) return res.status(400).json({ message: 'El archivo XML (CFDI) es requerido.' });

    // Validate by magic bytes + extension + size
    const pdfVal = validateFile(pdfFile, 'pdf');
    if (!pdfVal.ok) return res.status(400).json({ message: pdfVal.error });

    const xmlVal = validateFile(xmlFile, 'xml');
    if (!xmlVal.ok) return res.status(400).json({ message: xmlVal.error });

    // Generate folio
    const folio = `BTG-FAC-${Date.now()}`;

    // Send email with attachments
    await sendFactura({ nombre, cua, correo, mes, monto, folio, pdfFile, xmlFile });

    console.log(`[${new Date().toISOString()}] OK | Folio: ${folio}`);

    return res.json({ ok: true, folio });

  } catch (err) {
    console.error(`[${new Date().toISOString()}] ERROR: ${err.message}`);
    return res.status(500).json({ message: 'Error al procesar la solicitud. Intenta de nuevo.' });
  }
});

module.exports = router;
