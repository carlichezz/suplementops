export function clientKey(request, action) {
  const ip =
    request.headers.get('CF-Connecting-IP') ||
    request.headers.get('x-real-ip') ||
    (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() ||
    'desconocida';
  return `${action}:${ip}`;
}

export async function checkRateLimit(env, key, max, windowMin) {
  const now = Date.now();
  const cutoff = now - windowMin * 60000;

  await env.DB.prepare('INSERT OR IGNORE INTO rate_limits (clave, conteo, inicio) VALUES (?, 0, ?)')
    .bind(key, now)
    .run();
  await env.DB.prepare(
    `UPDATE rate_limits SET
       conteo = CASE WHEN inicio >= ? THEN conteo + 1 ELSE 1 END,
       inicio = CASE WHEN inicio >= ? THEN inicio ELSE ? END
     WHERE clave = ?`
  )
    .bind(cutoff, cutoff, now, key)
    .run();

  const row = await env.DB.prepare('SELECT conteo, inicio FROM rate_limits WHERE clave = ?')
    .bind(key)
    .first();
  const conteo = row ? row.conteo : 1;

  if (conteo > max) {
    const retryAfter = Math.max(
      1,
      Math.ceil(((row ? row.inicio : now) + windowMin * 60000 - now) / 1000)
    );
    return { allowed: false, retryAfter };
  }
  return { allowed: true, remaining: max - conteo };
}

export function rateLimitResponse(retryAfter) {
  return Response.json(
    { error: `Demasiados intentos. Intentá de nuevo dentro de ${retryAfter} s.` },
    { status: 429, headers: { 'Retry-After': String(retryAfter) } }
  );
}

export async function cleanupRateLimits(env) {
  await env.DB.prepare('DELETE FROM rate_limits WHERE inicio < ?')
    .bind(Date.now() - 26 * 60 * 60 * 1000)
    .run();
}