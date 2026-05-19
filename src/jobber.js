// Jobber API client
// Uses Jobber's GraphQL API via our serverless proxy at /api/jobber

const JOBBER_GRAPHQL = '/api/jobber/graphql';

export async function fetchJobberJobs(accessToken) {
  const query = `
    query {
      jobs(first: 50, sortOrder: DESC) {
        nodes {
          id
          title
          jobNumber
          startAt
          endAt
          jobStatus
          client {
            id
            firstName
            lastName
            companyName
          }
          property {
            id
            street1
            street2
            city
            province
            postalCode
          }
        }
      }
    }
  `;

  const res = await fetch(JOBBER_GRAPHQL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify({ query })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Jobber API error: ${res.status}`);
  }

  const data = await res.json();
  if (data.errors) throw new Error(data.errors[0]?.message || 'GraphQL error');

  return (data.data?.jobs?.nodes || []).map(normalizeJob);
}

function normalizeJob(j) {
  const client = j.client;
  const prop = j.property;
  const clientName = client
    ? (client.companyName || `${client.firstName || ''} ${client.lastName || ''}`.trim())
    : '';
  const address = prop
    ? [prop.street1, prop.street2, prop.city, prop.province, prop.postalCode].filter(Boolean).join(', ')
    : '';

  return {
    id: `jobber-${j.id}`,
    jobberId: j.id,
    title: j.title || `Job #${j.jobNumber}`,
    jobNumber: j.jobNumber,
    client: clientName,
    address,
    status: mapStatus(j.jobStatus),
    source: 'jobber',
    startAt: j.startAt,
    endAt: j.endAt,
    created: new Date(j.startAt || Date.now()).getTime()
  };
}

function mapStatus(s) {
  const map = {
    'ACTIVE': 'active',
    'REQUIRES_INVOICING': 'active',
    'TODAY': 'active',
    'UPCOMING': 'pending',
    'UNSCHEDULED': 'pending',
    'LATE': 'active',
    'ON_HOLD': 'pending',
    'ARCHIVED': 'completed',
    'COMPLETED': 'completed'
  };
  return map[s] || 'active';
}

// Start Jobber OAuth flow
export function startJobberAuth() {
  window.location.href = '/api/jobber/auth';
}

// Exchange code for tokens after OAuth redirect
export async function exchangeJobberCode(code) {
  const res = await fetch('/api/jobber/callback?code=' + encodeURIComponent(code));
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Auth exchange failed');
  }
  return res.json(); // { access_token, refresh_token, expires_in }
}

// Refresh access token
export async function refreshJobberToken(refreshToken) {
  const res = await fetch('/api/jobber/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Token refresh failed');
  }
  return res.json();
}
