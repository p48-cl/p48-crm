// Callback OAuth de Google (147b). Corre como Vercel Function en crm.p48.cl.
// Variables requeridas en Vercel: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET.
// Pendiente: validar `state` contra cookie emitida por el endpoint de inicio
// y guardar el refresh_token cifrado (no se persiste aún, ni se registra en logs).

const REDIRECT_URI = 'https://crm.p48.cl/api/google/callback';

export default async function handler(req: any, res: any) {
  const { code, error } = req.query ?? {};

  if (error || typeof code !== 'string') {
    res.status(400).send('Autorización de Google cancelada o inválida.');
    return;
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    res.status(500).send('Configuración de Google incompleta.');
    return;
  }

  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: REDIRECT_URI,
    grant_type: 'authorization_code',
  });

  const respuesta = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!respuesta.ok) {
    res.status(502).send('No se pudo completar la conexión con Google.');
    return;
  }

  res.redirect(302, '/?google=conectado');
}
