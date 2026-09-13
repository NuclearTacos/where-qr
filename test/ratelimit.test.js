import test from 'node:test';
import assert from 'node:assert/strict';
import { createRateLimiter } from '../lib/ratelimit.js';

test('createRateLimiter: allows up to the limit', () => {
  let now = 1000;
  const limiter = createRateLimiter({ limit: 3, windowMs: 60_000, now: () => now });

  assert.equal(limiter.check('a').allowed, true);
  assert.equal(limiter.check('a').allowed, true);
  assert.equal(limiter.check('a').allowed, true);
});

test('createRateLimiter: blocks the request after the limit', () => {
  let now = 1000;
  const limiter = createRateLimiter({ limit: 3, windowMs: 60_000, now: () => now });

  limiter.check('a');
  limiter.check('a');
  limiter.check('a');
  const fourth = limiter.check('a');

  assert.equal(fourth.allowed, false);
  assert.equal(fourth.remaining, 0);
  assert.ok(fourth.retryAfterSeconds >= 1);
});

test('createRateLimiter: remaining decreases with each allowed call', () => {
  let now = 1000;
  const limiter = createRateLimiter({ limit: 3, windowMs: 60_000, now: () => now });

  assert.equal(limiter.check('a').remaining, 2);
  assert.equal(limiter.check('a').remaining, 1);
  assert.equal(limiter.check('a').remaining, 0);
});

test('createRateLimiter: window slides -- old hits expire and free up capacity', () => {
  let now = 1000;
  const limiter = createRateLimiter({ limit: 2, windowMs: 10_000, now: () => now });

  assert.equal(limiter.check('a').allowed, true);
  assert.equal(limiter.check('a').allowed, true);
  assert.equal(limiter.check('a').allowed, false);

  now += 10_001; // past the window for both earlier hits

  assert.equal(limiter.check('a').allowed, true);
});

test('createRateLimiter: separate keys have independent windows', () => {
  let now = 1000;
  const limiter = createRateLimiter({ limit: 1, windowMs: 10_000, now: () => now });

  assert.equal(limiter.check('a').allowed, true);
  assert.equal(limiter.check('b').allowed, true);
  assert.equal(limiter.check('a').allowed, false);
});

test('createRateLimiter: partial window slide only frees expired hits', () => {
  let now = 0;
  const limiter = createRateLimiter({ limit: 2, windowMs: 10_000, now: () => now });

  assert.equal(limiter.check('a').allowed, true); // t=0
  now = 5000;
  assert.equal(limiter.check('a').allowed, true); // t=5000, both within window
  now = 10_001; // t=0 hit now expired, t=5000 still within window
  assert.equal(limiter.check('a').allowed, true);
  assert.equal(limiter.check('a').allowed, false);
});
