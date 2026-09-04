async function getChatIds(env) {
  try {
    const { results } = await env.DB.prepare('SELECT chat_id FROM chat_ids').all();
    if (results && results.length > 0) {
      return results.map((r) => String(r.chat_id).trim()).filter(Boolean);
    }
  } catch (e) {}
  return (env.TELEGRAM_CHAT_IDS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

// Caduca códigos expirados y marca innecesarios
async function cleanup(env) {
  await env.DB.prepare(
    "DELETE FROM admin_codes WHERE expiracion IS NOT NULL AND expiracion < datetime('now')"
  ).run();
}

export const onRequestPost = async (context) => {
  const { env, request } = context;
  const body = await request.json().catch(() => ({}));

  const chatIds = await getChatIds(env);
  if (chatIds.length === 0) {
    return Response.json(
      { error: 'No hay chat ID de Telegram configurado. Añade uno en Notificaciones.' },
      { status: 400 }
    );
  }

  if (!env.TELEGRAM_BOT_TOKEN) {
    return Response.json(
      { error: 'El bot de Telegram no está configurado.' },
      { status: 500 }
    );
  }

  await cleanup(env);

  // Código aleatorio de 7 dígitos
  const codigo = String(Math.floor(1000000 + Math.random() * 9000000));
  const exp = new Date(Date.now() + 5 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);

  await env.DB.prepare(
    'INSERT INTO admin_codes (codigo, usado, expiracion) VALUES (?, 0, ?)'
  )
    .bind(codigo, exp)
    .run();

  // Enviar al bot
  let sent = 0;
  for (const chatId of chatIds) {
    try {
      const r = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: `*Código de acceso al panel de administración*\n\nTu código es: *${codigo}*\n\nVence en 5 minutos.`,
          parse_mode: 'Markdown',
        }),
      });
      if (r.ok) sent++;
    } catch (e) {}
  }

  if (sent === 0) {
    return Response.json({ error: 'No se pudo enviar el código. Revisa el bot.' }, { status: 500 });
  }

  return Response.json({ ok: true });
};
