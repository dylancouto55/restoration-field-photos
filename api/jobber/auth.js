// Redirects user to Jobber's OAuth consent screen
export default function handler(req, res) {
  const clientId = process.env.JOBBER_CLIENT_ID;

  if (!clientId) {
    return res.status(500).json({ error: 'JOBBER_CLIENT_ID not configured' });
  }

  // Build the redirect URI dynamically from the request
  const protocol = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const redirectUri = `${protocol}://${host}/api/jobber/callback`;

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'read:clients read:jobs read:properties write:jobs'
  });

  const authUrl = `https://api.getjobber.com/api/oauth/authorize?${params.toString()}`;
  res.redirect(302, authUrl);
}
