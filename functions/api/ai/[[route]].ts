const TARGET = 'https://integrate.api.nvidia.com';

export async function onRequest(context: {
  request: Request;
  env: Record<string, string>;
}): Promise<Response> {
  const { request } = context;
  const url = new URL(request.url);

  const targetPath = url.pathname.replace(/^\/api\/ai/, '/v1');
  const targetUrl = `${TARGET}${targetPath}${url.search}`;

  const newHeaders = new Headers(request.headers);
  newHeaders.set('Host', 'integrate.api.nvidia.com');

  const proxyRequest = new Request(targetUrl, {
    method: request.method,
    headers: newHeaders,
    body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : null,
    redirect: 'follow',
  });

  let response: Response;
  try {
    response = await fetch(proxyRequest);
  } catch (err) {
    return new Response(
      JSON.stringify({ error: { message: `Proxy error: ${err instanceof Error ? err.message : String(err)}` } }),
      {
        status: 502,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      },
    );
  }

  const responseHeaders = new Headers(response.headers);

  responseHeaders.set('Access-Control-Allow-Origin', '*');
  responseHeaders.set('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  responseHeaders.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  });
}

export async function onRequestOptions(): Promise<Response> {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}
