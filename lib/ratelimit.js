// In-memory sliding-window rate limiter.
//
// NOTE: on serverless (Vercel), each warm lambda instance has its own memory, and cold
// starts reset it entirely. This is therefore a best-effort, per-warm-instance limiter --
// it will not enforce a hard global cap across concurrently invoked instances. That's an
// acceptable tradeoff here (it still meaningfully slows down casual abuse) without adding
// an external dependency (e.g. Redis) for a low-stakes internal tool.

/**
 * @param {object} opts
 * @param {number} [opts.limit=30] max requests allowed per window
 * @param {number} [opts.windowMs=60000] window size in ms
 * @param {() => number} [opts.now=Date.now] clock, injectable for tests
 */
export function createRateLimiter({ limit = 30, windowMs = 60_000, now = Date.now } = {}) {
  const hits = new Map(); // key -> array of timestamps within the current window

  function prune(key, cutoff) {
    const timestamps = hits.get(key);
    if (!timestamps) return [];
    const kept = timestamps.filter((t) => t > cutoff);
    if (kept.length === 0) {
      hits.delete(key);
    } else {
      hits.set(key, kept);
    }
    return kept;
  }

  function sweep(cutoff) {
    // Opportunistic full-map prune so keys that stop being used don't leak forever.
    // Only runs occasionally (cheap probabilistic trigger) to keep check() O(1)-ish.
    for (const [key, timestamps] of hits) {
      const kept = timestamps.filter((t) => t > cutoff);
      if (kept.length === 0) hits.delete(key);
      else hits.set(key, kept);
    }
  }

  let checkCount = 0;

  return {
    check(key) {
      const t = now();
      const cutoff = t - windowMs;

      checkCount += 1;
      if (checkCount % 200 === 0) sweep(cutoff);

      const timestamps = prune(key, cutoff);

      if (timestamps.length >= limit) {
        const oldest = timestamps[0];
        const retryAfterMs = oldest + windowMs - t;
        const retryAfterSeconds = Math.max(1, Math.ceil(retryAfterMs / 1000));
        return { allowed: false, remaining: 0, retryAfterSeconds };
      }

      timestamps.push(t);
      hits.set(key, timestamps);

      return { allowed: true, remaining: limit - timestamps.length, retryAfterSeconds: 0 };
    },
  };
}
