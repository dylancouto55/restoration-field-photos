const UPLOAD_ENDPOINT = '/api/cloudinary/upload';

export async function uploadPhoto({ photoData, jobberId, jobTitle, tag, note, photoId, timestamp }) {
  const res = await fetch(UPLOAD_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ photoData, jobberId, jobTitle, tag, note, photoId, timestamp })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Upload failed: ${res.status}`);
  }

  return res.json();
}
