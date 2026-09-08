import { hashToken } from './_auth.js';
import { clientKey, checkRateLimit, rateLimitResponse } from './_rate-limit.js';

export const onRequestPost = async (context) => {
  const { env, request } = context;
  const body = await request.json().catch(() => ({}));

  const rl = await checkRateLimit(env, clientKey(request, 'admin-verify'), 5, 10);
  if (!rl.allowed) return rateLimitResponse(rl.retryAfter);

  const { codigo } = body;

  if (!codigo || !String(codigo).trim()) {
    return Response.json({ error: 'Ingresa el código.' }, { status: 400 });
  }

  // Limpia sesiones y códigos expirados acumulados
  await env.DB.prepare("DELETE FROM admin_sessions WHERE expira_en < datetime('now')").run();
  await env.DB.prepare(
    "DELETE FROM admin_codes WHERE expiracion IS NOT NULL AND expiracion < datetime('now')"
  ).run();

  // Código más reciente que exista, no usado y no expirado
  const row = await env.DB.prepare(
    "SELECT * FROM admin_codes WHERE codigo = ? AND usado = 0 AND (expiracion IS NULL OR expiracion >= datetime('now')) ORDER BY id DESC LIMIT 1"
  )
    .bind(String(codigo).trim())
    .first();

  if (!row) {
    return Response.json(
      { error: 'Código inválido o expirado. Solicita uno nuevo al bot.' },
      { status: 401 }
    );
  }

  // Marcar como usado
  await env.DB.prepare('UPDATE admin_codes SET usado = 1 WHERE id = ?').bind(row.id).run();

  // Token de sesión simple (aleatorio). En la DB solo se guarda su hash SHA-256
  const token =
    Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

  const expira = new Date(Date.now() + 12 * 60 * 60 * 1000)
    .toISOString()
    .replace('T', ' ')
    .slice(0, 19);

  await env.DB.prepare(
    'INSERT INTO admin_sessions (token, expira_en) VALUES (?, ?) '
  )
    .bind(await hashToken(token), expira)
    .run();

  return Response.json({ ok: true, token });
};
