'use strict';

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

function validateFile(file, type) {
  if (file.size > MAX_SIZE) {
    return { ok: false, error: `El archivo ${type.toUpperCase()} supera el límite de 10 MB.` };
  }

  const buf = file.buffer;
  const ext = file.originalname.split('.').pop().toLowerCase();

  if (type === 'pdf') {
    if (ext !== 'pdf') {
      return { ok: false, error: 'El archivo debe tener extensión .pdf' };
    }
    const magic = buf.slice(0, 5).toString('ascii');
    if (magic !== '%PDF-') {
      return { ok: false, error: 'El archivo PDF no es válido. Asegúrate de subir un PDF real.' };
    }
  }

  if (type === 'xml') {
    if (ext !== 'xml') {
      return { ok: false, error: 'El archivo debe tener extensión .xml' };
    }
    const start = buf.slice(0, 10).toString('utf8').trimStart();
    if (!start.startsWith('<')) {
      return { ok: false, error: 'El archivo XML no es válido. Asegúrate de subir el CFDI correcto.' };
    }
  }

  return { ok: true };
}

module.exports = { validateFile };
