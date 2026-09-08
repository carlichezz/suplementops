function isAllowedOrigin(request) {
  const origin = request.headers.get('Origin');
  if (!origin) return true;
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

export const onRequest = async (context) => {
  const { request, next } = context;

  if (request.method === 'OPTIONS') {
    if (!isAllowedOrigin(request)) {
      return new Response(null, { status: 403 });
    }
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': new URL(request.url).origin,
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Admin-Token',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  const response = await next();
  if (isAllowedOrigin(request)) {
    const newResponse = new Response(response.body, response);
    newResponse.headers.set('Access-Control-Allow-Origin', new URL(request.url).origin);
    newResponse.headers.set('Vary', 'Origin');
    return newResponse;
  }
  return response;
};