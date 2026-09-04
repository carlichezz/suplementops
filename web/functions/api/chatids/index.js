import { requireAdmin } from '../_auth.js';

export const onRequestGet = async (context) => {
  const { env, request } = context;

  const denied = await requireAdmin(env, request);
  if (denied) return denied;

  const { results } = await env.DB.prepare(
    'SELECT * FROM chat_ids ORDER BY id DESC'
  ).all();
  return Response.json(results);
};

export const onRequestPost = async (context) => {
  const { env, request } = context;

  const denied = await requireAdmin(env, request);
  if (denied) return denied;

  const body = await request.json();
  const { chat_id, etiqueta } = body;

  if (!chat_id || !String(chat_id).trim()) {
    return Response.json({ error: 'El chat ID es obligatorio' }, { status: 400 });
  }

  try {
    const { success } = await env.DB.prepare(
      'INSERT INTO chat_ids (chat_id, etiqueta) VALUES (?, ?)'
    )
      .bind(String(chat_id).trim(), etiqueta || null)
      .run();

    if (!success) {
      return Response.json({ error: 'No se pudo añadir el chat ID' }, { status: 500 });
    }
    return Response.json({ ok: true }, { status: 201 });
  } catch (err) {
    if (String(err).includes('UNIQUE')) {
      return Response.json({ error: 'Ese chat ID ya está registrado' }, { status: 409 });
    }
    return Response.json({ error: 'No se pudo añadir el chat ID' }, { status: 500 });
  }
};