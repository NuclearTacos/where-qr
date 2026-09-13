// Client for the redirect-tracking function.

export async function trackUrl(url) {
  const endpoint = `/api/track?url=${encodeURIComponent(url)}`;
  let response;
  try {
    response = await fetch(endpoint, { headers: { accept: 'application/json' } });
  } catch {
    throw new Error('Could not reach the analysis service. Check your connection and try again.');
  }

  let body = null;
  try { body = await response.json(); } catch { /* non-JSON error page */ }

  if (!response.ok) {
    const fallback = response.status === 429
      ? 'Too many requests. Give it a minute and try again.'
      : `The analysis service returned an error (HTTP ${response.status}).`;
    throw new Error(body?.error || fallback);
  }
  if (!body || body.error) throw new Error(body?.error || 'Unexpected response from the analysis service.');
  return body;
}
