// Proxies GraphQL requests to Jobber's API
// This avoids CORS issues and keeps the API structure clean
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Authorization header required' });
  }

  const { query, variables } = req.body || {};
  if (!query) {
    return res.status(400).json({ error: 'GraphQL query required' });
  }

  try {
    const jobberRes = await fetch('https://api.getjobber.com/api/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
        'X-JOBBER-GRAPHQL-VERSION': '2026-05-12'
      },
      body: JSON.stringify({ query, variables })
    });

    const data = await jobberRes.json();
    return res.status(jobberRes.status).json(data);
  } catch (err) {
    console.error('Jobber GraphQL proxy error:', err);
    return res.status(500).json({ error: 'Failed to reach Jobber API' });
  }
}
