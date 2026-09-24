import { next, rewrite } from '@vercel/edge';

export const config = {
  matcher: [
    '/propuesta-flexngate',
    '/propuesta-flexngate.html',
    '/propuesta-flexngate/login',
  ],
};

const COOKIE_NAME = 'pfng_auth';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30;
const NOINDEX = 'noindex, nofollow, noarchive';

async function sha256Hex(input) {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function expectedToken(password) {
  return sha256Hex(`propuesta-flexngate|v1|${password}`);
}

function readCookie(request, name) {
  const raw = request.headers.get('cookie');
  if (!raw) return null;
  for (const part of raw.split(';')) {
    const [k, ...rest] = part.trim().split('=');
    if (k === name) return rest.join('=');
  }
  return null;
}

function timingSafeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function loginHtml({ error } = { error: false }) {
  const msg = error ? 'Contraseña incorrecta.' : '';
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex, nofollow, noarchive">
<title>Acceso · BTG</title>
<link rel="icon" href="/favicon_btg.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap">
<style>
:root{--navy:#0E2030;--ink:#081521;--cyan:#0CC0DF;--cyan-d:#0AA5C1;--on:#E7EEF3;--on2:#9FB2C2}
*{box-sizing:border-box}
html,body{margin:0;padding:0;min-height:100%;background:var(--ink);color:var(--on);font-family:Montserrat,"Segoe UI",Helvetica,Arial,sans-serif}
body{display:flex;align-items:center;justify-content:center;padding:24px;min-height:100vh;background:radial-gradient(1100px 700px at 82% -10%,rgba(12,192,223,.10),transparent 60%),radial-gradient(900px 700px at -10% 110%,rgba(12,192,223,.08),transparent 55%),var(--ink)}
.card{width:100%;max-width:420px;background:var(--navy);border:1px solid rgba(255,255,255,.08);border-radius:20px;padding:44px 36px;box-shadow:0 24px 60px rgba(0,0,0,.45)}
.logo{display:flex;justify-content:center;margin-bottom:26px}
.logo img{max-width:150px;height:auto}
h1{font-weight:700;font-size:20px;letter-spacing:.01em;margin:0 0 6px;text-align:center;color:#fff}
.sub{color:var(--on2);text-align:center;font-size:13px;margin:0 0 28px}
label{display:block;font-size:11px;letter-spacing:.18em;text-transform:uppercase;font-weight:700;color:var(--on2);margin-bottom:10px}
input[type=password]{width:100%;background:#0b1a2a;border:1px solid rgba(255,255,255,.14);color:#fff;padding:14px 16px;border-radius:12px;font:inherit;font-size:15px;outline:none;transition:border-color .18s,box-shadow .18s}
input[type=password]:focus{border-color:var(--cyan);box-shadow:0 0 0 3px rgba(12,192,223,.22)}
button{margin-top:18px;width:100%;background:var(--cyan);color:#062231;border:none;border-radius:12px;padding:14px 16px;font-weight:700;letter-spacing:.02em;font-size:15px;cursor:pointer;transition:background .18s,transform .06s}
button:hover{background:#0ad2f0}
button:active{transform:translateY(1px)}
.err{margin-top:14px;color:#ffb1b1;font-size:13px;text-align:center;min-height:18px}
footer{margin-top:26px;color:var(--on2);text-align:center;font-size:10.5px;letter-spacing:.16em;text-transform:uppercase}
</style>
</head>
<body>
<main class="card" role="main">
  <div class="logo"><img src="/logo-btg-blanco-hd.png" alt="BTG"></div>
  <h1>Propuesta privada</h1>
  <p class="sub">Ingresa la contraseña para continuar.</p>
  <form method="POST" action="/propuesta-flexngate/login" autocomplete="off">
    <label for="p">Contraseña</label>
    <input id="p" name="password" type="password" autofocus required>
    <button type="submit">Ver propuesta</button>
    <p class="err" role="alert" aria-live="polite">${msg}</p>
  </form>
  <footer>BTG · Black Tower Group</footer>
</main>
</body>
</html>`;
}

function loginResponse({ status = 200, error = false } = {}) {
  return new Response(loginHtml({ error }), {
    status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Robots-Tag': NOINDEX,
    },
  });
}

export default async function middleware(request) {
  const url = new URL(request.url);
  const pathname = url.pathname;
  const password = process.env.PROPUESTA_FNG_PASSWORD;

  if (!password) {
    return new Response('Servicio no disponible.', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'X-Robots-Tag': NOINDEX },
    });
  }

  if (pathname === '/propuesta-flexngate/login') {
    if (request.method === 'POST') {
      let submitted = '';
      try {
        const form = await request.formData();
        submitted = String(form.get('password') || '');
      } catch {
        submitted = '';
      }
      if (timingSafeEqual(submitted, password)) {
        const token = await expectedToken(password);
        return new Response(null, {
          status: 303,
          headers: {
            Location: '/propuesta-flexngate',
            'Set-Cookie': `${COOKIE_NAME}=${token}; Path=/; Max-Age=${COOKIE_MAX_AGE}; HttpOnly; Secure; SameSite=Lax`,
            'Cache-Control': 'no-store',
            'X-Robots-Tag': NOINDEX,
          },
        });
      }
      return loginResponse({ status: 401, error: true });
    }
    return loginResponse();
  }

  const token = readCookie(request, COOKIE_NAME);
  const expected = await expectedToken(password);
  const authed = token && timingSafeEqual(token, expected);

  if (!authed) {
    return loginResponse();
  }

  if (pathname === '/propuesta-flexngate') {
    return rewrite(new URL('/propuesta-flexngate.html', request.url), {
      headers: { 'X-Robots-Tag': NOINDEX, 'Cache-Control': 'private, no-store' },
    });
  }

  return next({
    headers: { 'X-Robots-Tag': NOINDEX, 'Cache-Control': 'private, no-store' },
  });
}
