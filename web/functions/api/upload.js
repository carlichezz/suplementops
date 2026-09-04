const SUPABASE_URL = 'https://rkmaoovnzvvvgpxhczho.supabase.co';
const BUCKET = 'imagenes';

import { requireAdmin } from './_auth.js';

export const onRequestPost = async (context) => {
  const { env, request } = context;

  const denied = await requireAdmin(env, request);
  if (denied) return denied;

  const url = env.SUPABASE_URL || SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE || env.SUPABASE_KEY || '';

  if (!key) {
    return Response.json(
      { error: 'Falta configurar SUPABASE_SERVICE_ROLE (secret) en el proyecto.' },
      { status: 500 }
    );
  }

  const form = await request.formData().catch(() => null);
  if (!form) {
    return Response.json({ error: 'Body inválido.' }, { status: 400 });
  }
  const file = form.get('file');
  if (!file || typeof file === 'string') {
    return Response.json({ error: 'Falta el archivo (campo "file").' }, { status: 400 });
  }

  const extMatch = (file.name || '').match(/\.([a-zA-Z0-9]+)$/);
  const ext = extMatch ? extMatch[1].toLowerCase() : 'png';
  const mimeMap = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    avif: 'image/avif',
  };
  const contentType = mimeMap[ext] || file.type || 'application/octet-stream';
  const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const folder = (env.SUPABASE_FOLDER || 'productos').replace(/^\/|\/$/g, '');
  const basePath = folder ? `${folder}/` : '';
  const path = `${basePath}${name}`;

  const res = await fetch(`${url}/storage/v1/object/${BUCKET}/${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      apikey: key,
      'Content-Type': contentType,
      'x-upsert': 'true',
    },
    body: file.stream ? file.stream() : Buffer.from(await file.arrayBuffer()),
  });

  if (!res.ok) {
    let detail = '';
    try {
      detail = JSON.stringify(await res.json());
    } catch (e) {}
    return Response.json(
      { error: `Error al subir a Supabase (${res.status}). ${detail}` },
      { status: 502 }
    );
  }

  const publicUrl = `${url}/storage/v1/object/public/${BUCKET}/${path}`;
  return Response.json({ url: publicUrl });
};