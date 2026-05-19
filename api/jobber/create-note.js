export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Authorization header required' });
  }

  const { jobberId, message, attachmentUrls } = req.body || {};

  if (!jobberId) {
    return res.status(400).json({ error: 'jobberId required' });
  }

  const attachments = (attachmentUrls || []).map(url => ({ url }));

  const mutation = `
    mutation CreateJobNote($jobId: EncodedId!, $input: JobCreateNoteInput!) {
      jobCreateNote(jobId: $jobId, input: $input) {
        jobNote {
          id
        }
        userErrors {
          message
          path
        }
      }
    }
  `;

  const variables = {
    jobId: jobberId,
    input: {
      message: message || 'Field photo uploaded from Restoration Field Photos',
      ...(attachments.length > 0 ? { attachments } : {})
    }
  };

  try {
    const jobberRes = await fetch('https://api.getjobber.com/api/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
        'X-JOBBER-GRAPHQL-VERSION': '2026-05-12'
      },
      body: JSON.stringify({ query: mutation, variables })
    });

    const data = await jobberRes.json();

    if (data.errors) {
      console.error('Jobber createNote errors:', data.errors);
      return res.status(502).json({ error: data.errors[0]?.message || 'Jobber API error' });
    }

    const result = data.data?.jobCreateNote;
    if (result?.userErrors?.length > 0) {
      return res.status(400).json({ error: result.userErrors[0].message });
    }

    return res.status(200).json({
      success: true,
      noteId: result?.jobNote?.id
    });
  } catch (err) {
    console.error('Jobber createNote error:', err);
    return res.status(500).json({ error: 'Failed to create note' });
  }
}
