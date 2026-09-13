import { followRedirects } from '../lib/redirects.js';
import { isBlockedHost } from '../lib/ssrf.js';
import { createRateLimiter } from '../lib/ratelimit.js';

const MAX_URL_LENGTH = 2048;

// Module-level: persists across invocations on the same warm serverless instance (best
// effort only -- see lib/ratelimit.js).
const limiter = createRateLimiter({ limit: 30, windowMs: 60_000 });

function clientIp(req) {
  const forwarded = req.headers?.['x-forwarded-for'];
  if (forwarded) {
    const first = String(forwarded).split(',')[0].trim();
    if (first) return first;
  }
  return req.socket?.remoteAddress || 'unknown';
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ip = clientIp(req);
  const rate = limiter.check(ip);
  if (!rate.allowed) {
    res.setHeader('Retry-After', String(rate.retryAfterSeconds));
    return res.status(429).json({ error: 'Too many requests. Try again in a minute.' });
  }

  const { url } = req.query || {};

  if (!url) {
    return res.status(400).json({ error: 'URL parameter is required' });
  }

  if (typeof url !== 'string' || url.length > MAX_URL_LENGTH) {
    return res.status(400).json({ error: 'URL is too long' });
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(url);
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return res.status(400).json({ error: 'Only HTTP(S) URLs are supported' });
    }
  } catch {
    return res.status(400).json({ error: 'Invalid URL format' });
  }

  try {
    if (await isBlockedHost(parsedUrl.hostname)) {
      return res.status(400).json({
        error: 'That address points to a private or internal network and cannot be checked.',
      });
    }

    const result = await followRedirects(url, {
      isBlockedHost,
      userAgent: 'where-qr/4.0 (+https://github.com/NuclearTacos/where-qr)',
    });

    return res.status(200).json({
      success: true,
      originalUrl: url,
      ...result,
    });
  } catch {
    return res.status(500).json({ error: 'Failed to track redirects' });
  }
}
