# BTG Factura — Backend

Backend Express para el módulo de subida de facturas (POC).

## Setup rápido

```bash
cd backend
npm install
cp .env.example .env
# Edita .env y pega tu RESEND_API_KEY
node server.js
```

## Variables de entorno

| Variable         | Descripción                                      |
|-----------------|--------------------------------------------------|
| PORT            | Puerto del servidor (default 3000)               |
| ALLOWED_ORIGIN  | URL del frontend permitido por CORS              |
| RESEND_API_KEY  | Tu API key de Resend                             |
| MAIL_FROM       | Remitente del correo (dominio verificado Resend) |
| MAIL_TO         | Destinatario de las facturas                     |

## Endpoint

`POST /api/upload-factura`

**Form fields:** `nombre`, `cua`, `correo`, `mes`, `monto`, `pdf` (file), `xml` (file)

**Respuesta exitosa:** `{ ok: true, folio: "BTG-FAC-..." }`
