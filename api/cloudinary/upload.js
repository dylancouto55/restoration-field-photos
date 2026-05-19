import crypto from 'crypto';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    return res.status(500).json({ error: 'Cloudinary not configured' });
  }

  const { photoData, jobberId, jobTitle, tag, note, photoId, timestamp } = req.body || {};

  if (!photoData) {
    return res.status(400).json({ error: 'photoData required' });
  }

  const folder = jobberId ? `restoration-photos/${jobberId}` : 'restoration-photos/unassigned';
  const tags = [tag, 'restoration-cam', jobberId].filter(Boolean).join(',');
  const context = [`caption=${note || ''}`, `tag=${tag || ''}`, `jobTitle=${jobTitle || ''}`, `photoId=${photoId || ''}`, `timestamp=${timestamp || ''}`].join('|');
  const ts = Math.floor(Date.now() / 1000);

  const paramsToSign = `context=${context}&folder=${folder}&tags=${tags}&timestamp=${ts}`;
  const signature = crypto.createHash('sha1').update(paramsToSign + apiSecret).digest('hex');

  try {
    const formBody = new URLSearchParams({
      file: photoData,
      folder,
      tags,
      context,
      timestamp: ts.toString(),
      api_key: apiKey,
      signature
    });

    const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formBody.toString()
    });

    if (!uploadRes.ok) {
      const err = await uploadRes.text();
      console.error('Cloudinary upload failed:', err);
      return res.status(502).json({ error: 'Cloudinary upload failed' });
    }

    const result = await uploadRes.json();
    return res.status(200).json({
      success: true,
      cloudinaryUrl: result.secure_url,
      publicId: result.public_id
    });
  } catch (err) {
    console.error('Cloudinary upload error:', err);
    return res.status(500).json({ error: 'Upload failed' });
  }
}
