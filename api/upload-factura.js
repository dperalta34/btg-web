'use strict';

const { Resend } = require('resend');
const busboy = require('busboy');

// Disable Vercel's automatic body parser — required for multipart/form-data
module.exports.config = {
  api: { bodyParser: false },
};

function parseForm(req) {
  return new Promise((resolve, reject) => {
    const bb = busboy({ headers: req.headers });
    const fields = {};
    const files = {};

    bb.on('file', (name, stream, info) => {
      const chunks = [];
      stream.on('data', (chunk) => chunks.push(chunk));
      stream.on('end', () => {
        files[name] = {
          buffer: Buffer.concat(chunks),
          originalname: info.filename,
          mimetype: info.mimeType,
        };
      });
    });

    bb.on('field', (name, val) => { fields[name] = val; });
    bb.on('finish', () => resolve({ fields, files }));
    bb.on('error', reject);

    req.pipe(bb);
  });
}

function esc(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

function formatMXN(monto) {
  return new Intl.NumberFormat('es-MX', { style:'currency', currency:'MXN' }).format(Number(monto));
}

function formatTimestamp() {
  return new Date().toLocaleString('es-MX', {
    timeZone:'America/Mexico_City', dateStyle:'long', timeStyle:'short',
  });
}

function row(label, value) {
  return `<tr>
    <td style="padding:12px 0;border-bottom:1px solid rgba(26,127,188,0.08);width:150px;vertical-align:top">
      <span style="font-size:11px;font-weight:600;letter-spacing:.07em;text-transform:uppercase;color:rgba(228,238,245,0.35)">${label}</span>
    </td>
    <td style="padding:12px 0 12px 18px;border-bottom:1px solid rgba(26,127,188,0.08);font-size:14px;color:rgba(228,238,245,0.75)">${value}</td>
  </tr>`;
}

function buildHtml({ nombre, correo, mes, monto, folio }) {
  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#030d1a;font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#030d1a;padding:48px 20px">
  <tr><td align="center"><table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px">
    <tr><td style="background:#071628;border:1px solid rgba(26,127,188,0.22);border-radius:16px 16px 0 0;border-bottom:none;padding:32px 36px 24px">
      <div style="font-size:10px;font-weight:600;letter-spacing:.13em;text-transform:uppercase;color:#1A7FBC;margin-bottom:10px">BTG Seguros · Operaciones</div>
      <div style="font-size:24px;font-weight:700;color:#F5F9FC;letter-spacing:-.03em;margin-bottom:6px">Nueva factura recibida</div>
      <div style="font-size:13px;color:rgba(228,238,245,0.38);line-height:1.55">El siguiente agente ha enviado su factura para proceso de pago de comisiones.</div>
    </td></tr>
    <tr><td style="background:rgba(26,127,188,0.08);border-left:1px solid rgba(26,127,188,0.22);border-right:1px solid rgba(26,127,188,0.22);padding:13px 36px">
      <span style="font-size:11px;font-weight:700;letter-spacing:.13em;text-transform:uppercase;color:#1A7FBC">Folio: ${esc(folio)}</span>
    </td></tr>
    <tr><td style="background:#071628;border:1px solid rgba(26,127,188,0.22);border-top:none;border-radius:0 0 16px 16px;padding:8px 36px 32px">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse">
        ${row('Agente', esc(nombre))}
        ${row('Correo', `<a href="mailto:${esc(correo)}" style="color:#1A7FBC;text-decoration:none">${esc(correo)}</a>`)}
        ${row('Mes facturado', esc(mes))}
        ${row('Monto', `<strong style="color:#F5F9FC">${formatMXN(monto)}</strong>`)}
        ${row('Recibido el', formatTimestamp())}
      </table>
      <div style="margin-top:24px;padding-top:20px;border-top:1px solid rgba(26,127,188,0.1);font-size:11px;color:rgba(228,238,245,0.2);line-height:1.7">
        Los archivos PDF y XML del CFDI se encuentran adjuntos a este correo.<br>Este mensaje es generado automáticamente — no responder.
      </div>
    </td></tr>
    <tr><td style="padding:22px 0 0;text-align:center;font-size:10px;color:rgba(228,238,245,0.12);letter-spacing:.07em;text-transform:uppercase">BTG Seguros · Sistema Interno</td></tr>
  </table></td></tr>
</table>
</body></html>`;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ message: 'Método no permitido.' });

  try {
    const { fields, files } = await parseForm(req);
    const { nombre, correo, mes, monto } = fields;

    if (!nombre || !correo || !mes || !monto) {
      return res.status(400).json({ message: 'Todos los campos son requeridos.' });
    }

    const pdfFile = files.pdf;
    const xmlFile = files.xml;

    if (!pdfFile) return res.status(400).json({ message: 'El archivo PDF es requerido.' });
    if (!xmlFile) return res.status(400).json({ message: 'El archivo XML (CFDI) es requerido.' });

    const folio = `BTG-FAC-${Date.now()}`;
    const resend = new Resend(process.env.RESEND_API_KEY);

    await resend.emails.send({
      from: process.env.MAIL_FROM || 'onboarding@resend.dev',
      to:   process.env.MAIL_TO   || 'dperalta@btgseguros.com',
      subject: `Nueva factura recibida — ${nombre} — ${folio}`,
      html: buildHtml({ nombre, correo, mes, monto, folio }),
      attachments: [
        { filename: pdfFile.originalname, content: pdfFile.buffer.toString('base64') },
        { filename: xmlFile.originalname, content: xmlFile.buffer.toString('base64') },
      ],
    });

    console.log(`[${new Date().toISOString()}] OK | Folio: ${folio}`);
    return res.status(200).json({ ok: true, folio });

  } catch (err) {
    console.error(`[${new Date().toISOString()}] ERROR:`, err.message);
    return res.status(500).json({ message: 'Error al procesar la solicitud. Intenta de nuevo.' });
  }
};
