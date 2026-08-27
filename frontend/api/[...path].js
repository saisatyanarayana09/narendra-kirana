export default async function handler(req, res) {
  // Use req.url directly to preserve trailing slashes and query params
  // req.url = /api/v1/auth/password-reset/ → forward to backend as-is
  const targetUrl = 'https://narendra-kirana.onrender.com' + req.url;

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const fetchOptions = {
      method: req.method,
      headers: {
        'Content-Type': req.headers['content-type'] || 'application/json',
      },
    };

    if (req.headers.authorization) {
      fetchOptions.headers['Authorization'] = req.headers.authorization;
    }

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      fetchOptions.body = JSON.stringify(req.body);
    }

    const response = await fetch(targetUrl, fetchOptions);
    const data = await response.text();

    res.status(response.status);
    res.setHeader('Content-Type', response.headers.get('content-type') || 'application/json');
    res.send(data);
  } catch (error) {
    res.status(502).json({ error: 'Proxy error: ' + error.message });
  }
}
