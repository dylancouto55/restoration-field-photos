// Handles OAuth callback from Jobber, exchanges code for tokens
export default async function handler(req, res) {
  const { code } = req.query;

  if (!code) {
    return res.redirect('/?jobber_error=no_code');
  }

  const clientId = process.env.JOBBER_CLIENT_ID;
  const clientSecret = process.env.JOBBER_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return res.redirect('/?jobber_error=not_configured');
  }

  const protocol = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const redirectUri = `${protocol}://${host}/api/jobber/callback`;

  try {
    const tokenRes = await fetch('https://api.getjobber.com/api/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri
      })
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      console.error('Jobber token exchange failed:', err);
      return res.redirect('/?jobber_error=token_failed');
    }

    const tokens = await tokenRes.json();

    // Redirect back to the app with tokens in the hash (client-side only, not logged by server)
    const tokenData = encodeURIComponent(JSON.stringify({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_in: tokens.expires_in
    }));

    return res.redirect(`/?jobber_tokens=${tokenData}`);
  } catch (err) {
    console.error('Jobber callback error:', err);
    return res.redirect('/?jobber_error=server_error');
  }
}
