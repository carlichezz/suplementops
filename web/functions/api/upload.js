const SUPABASE_URL = 'https://rkmaoovnzvvvgpxhczho.supabase.co';
const BUCKET = 'imagenes';

import { requireAdmin } from './_auth.js';

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB (límite de Pages y razonable para imágenes)
const EXT_BY_TYPE = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/avif': 'avif',
};

// Detecta el tipo REAL por magic bytes (no se confía en el Content-Type enviado)
function detectImageType(buf) {
  const bytes = new Uint8Array(buf.slice(0, 32));
  if (bytes.length < 12) return null;
  const ascii = (start, len) =>
    String.fromCharCode.apply(null, Array.from(bytes.slice(start, start + len)));

  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e) return 'image/png';
  if (ascii(0, 3) === 'GIF' && bytes[3] === 0x38) return 'image/gif';
  if (ascii(0, 4) === 'RIFF' && ascii(8, 4) === 'WEBP') return 'image/webp';
  if (ascii(4, 4) === 'ftyp') {
    const brand = ascii(8, 4);
    if (brand === 'avif' || brand === 'avis' || brand === 'mif1') return 'image/avif';
  }
  return null;
}

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

  if (file.size > MAX_SIZE) {
    return Response.json(
      { error: 'La imagen supera el límite de 5 MB.' },
      { status: 413 }
    );
  }

  const buf = await file.arrayBuffer();
  const contentType = detectImageType(buf);
  if (!contentType) {
    return Response.json(
      { error: 'Formato no permitido. Solo JPG, PNG, WEBP, GIF o AVIF.' },
      { status: 415 }
    );
  }
  const ext = EXT_BY_TYPE[contentType];

  const rnd = Array.from(crypto.getRandomValues(new Uint8Array(4)))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  const name = `${Date.now()}-${rnd}.${ext}`;
  const folder = (env.SUPABASE_FOLDER || 'productos').replace(/^\/|\/$/g, '').replace(/\.\./g, '');
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
    body: buf,
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