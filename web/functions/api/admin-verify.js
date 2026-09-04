export const onRequestPost = async (context) => {
  const { env, request } = context;
  const body = await request.json().catch(() => ({}));
  const { codigo } = body;

  if (!codigo || !String(codigo).trim()) {
    return Response.json({ error: 'Ingresa el código.' }, { status: 400 });
  }

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

  // Token de sesión simple (aleatorio) guardado en el servidor
  const token =
    Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

  const expira = new Date(Date.now() + 12 * 60 * 60 * 1000)
    .toISOString()
    .replace('T', ' ')
    .slice(0, 19);

  await env.DB.prepare(
    "INSERT INTO admin_sessions (token, expira_en) VALUES (?, ?) "
  )
    .bind(token, expira)
    .run();

  return Response.json({ ok: true, token });
};
