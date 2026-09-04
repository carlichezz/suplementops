export async function checkAdmin(env, request) {
  const auth = request.headers.get('Authorization') || '';
  const token = auth.replace(/^Bearer\s+/i, '').trim();
  if (!token) return { ok: false, status: 401, error: 'No autorizado.' };

  const row = await env.DB.prepare(
    "SELECT id FROM admin_sessions WHERE token = ? AND expira_en >= datetime('now') LIMIT 1"
  )
    .bind(token)
    .first();

  if (!row) return { ok: false, status: 401, error: 'Sesión inválida o expirada.' };
  return { ok: true, token };
}

export async function requireAdmin(env, request) {
  const r = await checkAdmin(env, request);
  if (!r.ok) {
    return Response.json({ error: r.error }, { status: r.status });
  }
  return null;
}
