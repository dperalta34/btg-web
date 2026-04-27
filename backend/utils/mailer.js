'use strict';
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatMXN(monto) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Number(monto));
}

function formatTimestamp() {
  return new Date().toLocaleString('es-MX', {
    timeZone: 'America/Mexico_City',
    dateStyle: 'long',
    timeStyle: 'short',
  });
}

function row(label, value) {
  return `
  <tr>
    <td style="padding:12px 0;border-bottom:1px solid rgba(26,127,188,0.08);width:150px;vertical-align:top">
      <span style="font-size:11px;font-weight:600;letter-spacing:.07em;text-transform:uppercase;color:rgba(228,238,245,0.35)">${label}</span>
    </td>
    <td style="padding:12px 0 12px 18px;border-bottom:1px solid rgba(26,127,188,0.08);font-size:14px;color:rgba(228,238,245,0.75)">
      ${value}
    </td>
  </tr>`;
}

function buildHtml({ nombre, cua, correo, mes, monto, folio }) {
  const amount = formatMXN(monto);
  const ts = formatTimestamp();

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#030d1a;font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#030d1a;padding:48px 20px">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px">

        <!-- Header card -->
        <tr><td style="background:#071628;border:1px solid rgba(26,127,188,0.22);border-radius:16px 16px 0 0;border-bottom:none;padding:32px 36px 24px">
          <div style="font-size:10px;font-weight:600;letter-spacing:.13em;text-transform:uppercase;color:#1A7FBC;margin-bottom:10px">
            BTG Seguros · Operaciones
          </div>
          <div style="font-size:24px;font-weight:700;color:#F5F9FC;letter-spacing:-.03em;margin-bottom:6px">
            Nueva factura recibida
          </div>
          <div style="font-size:13px;color:rgba(228,238,245,0.38);line-height:1.55">
            El siguiente agente ha enviado su factura para proceso de pago de comisiones.
          </div>
        </td></tr>

        <!-- Folio banner -->
        <tr><td style="background:rgba(26,127,188,0.08);border-left:1px solid rgba(26,127,188,0.22);border-right:1px solid rgba(26,127,188,0.22);padding:13px 36px">
          <span style="font-size:11px;font-weight:700;letter-spacing:.13em;text-transform:uppercase;color:#1A7FBC">
            Folio: ${esc(folio)}
          </span>
        </td></tr>

        <!-- Data rows -->
        <tr><td style="background:#071628;border:1px solid rgba(26,127,188,0.22);border-top:none;border-radius:0 0 16px 16px;padding:8px 36px 32px">
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse">
            ${row('Agente', esc(nombre))}
            ${row('Clave CUA', esc(cua))}
            ${row('Correo', `<a href="mailto:${esc(correo)}" style="color:#1A7FBC;text-decoration:none">${esc(correo)}</a>`)}
            ${row('Mes facturado', esc(mes))}
            ${row('Monto', `<strong style="color:#F5F9FC">${amount}</strong>`)}
            ${row('Recibido el', ts)}
          </table>
          <div style="margin-top:24px;padding-top:20px;border-top:1px solid rgba(26,127,188,0.1);font-size:11px;color:rgba(228,238,245,0.2);line-height:1.7">
            Los archivos PDF y XML del CFDI se encuentran adjuntos a este correo.<br>
            Este mensaje es generado automáticamente — no responder.
          </div>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:22px 0 0;text-align:center;font-size:10px;color:rgba(228,238,245,0.12);letter-spacing:.07em;text-transform:uppercase">
          BTG Seguros · Sistema Interno
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

async function sendFactura({ nombre, cua, correo, mes, monto, folio, pdfFile, xmlFile }) {
  const html = buildHtml({ nombre, cua, correo, mes, monto, folio });

  await resend.emails.send({
    from: process.env.MAIL_FROM || 'onboarding@resend.dev',
    to: process.env.MAIL_TO || 'dperalta@btgseguros.com',
    subject: `Nueva factura recibida — ${nombre} — ${folio}`,
    html,
    attachments: [
      {
        filename: pdfFile.originalname,
        content: pdfFile.buffer.toString('base64'),
      },
      {
        filename: xmlFile.originalname,
        content: xmlFile.buffer.toString('base64'),
      },
    ],
  });
}

module.exports = { sendFactura };
