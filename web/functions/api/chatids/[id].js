import { requireAdmin } from '../_auth.js';

export const onRequestDelete = async (context) => {
  const { env, params, request } = context;

  const denied = await requireAdmin(env, request);
  if (denied) return denied;

  const { id } = params;
  const { success } = await env.DB.prepare('DELETE FROM chat_ids WHERE id = ?')
    .bind(id)
    .run();

  if (!success) {
    return Response.json({ error: 'No se pudo eliminar el chat ID' }, { status: 500 });
  }
  return Response.json({ ok: true });
};