import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyzeParameters, generateParameterInsight, redactUrl } from '../src/analysis/parameters.js';

function paramByKey(analysis, key) {
  return analysis.params.find(p => p.key === key);
}

test('exact table entries keep their specific description', () => {
  const analysis = analyzeParameters('https://example.com/?utm_source=newsletter&gclid=abc123');
  const utmSource = paramByKey(analysis, 'utm_source');
  const gclid = paramByKey(analysis, 'gclid');

  assert.equal(utmSource.type, 'attribution');
  assert.equal(utmSource.description, 'Traffic source identifier (e.g., google, newsletter)');

  assert.equal(gclid.type, 'tracking');
  assert.equal(gclid.description, 'Google Ads click identifier');
});

test('utm_ prefix family catches unlisted utm params', () => {
  const analysis = analyzeParameters('https://example.com/?utm_totally_made_up=1');
  const param = paramByKey(analysis, 'utm_totally_made_up');
  assert.equal(param.type, 'attribution');
  assert.equal(param.description, 'UTM campaign parameter');
});

test('*clid suffix family catches unlisted click ids', () => {
  const analysis = analyzeParameters('https://example.com/?epikclid=zzz');
  const param = paramByKey(analysis, 'epikclid');
  assert.equal(param.type, 'tracking');
  assert.equal(param.description, 'Ad click identifier');
});

test('email-shaped key family matches variants like user_email', () => {
  const analysis = analyzeParameters('https://example.com/?user_email=abc');
  const param = paramByKey(analysis, 'user_email');
  assert.equal(param.type, 'personal');
  assert.equal(param.privacy, 'high');
});

test('value heuristic: email detected in value of an otherwise unknown key', () => {
  const analysis = analyzeParameters('https://example.com/?x=jane.doe%40example.com');
  const param = paramByKey(analysis, 'x');
  assert.equal(param.type, 'personal');
  assert.equal(param.description, 'Email address (detected in value)');
});

test('value heuristic: JWT', () => {
  const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dGhpc2lzYXNpZ25hdHVyZQ';
  const analysis = analyzeParameters(`https://example.com/?x=${jwt}`);
  const param = paramByKey(analysis, 'x');
  assert.equal(param.type, 'session');
  assert.equal(param.description, 'JSON Web Token');
});

test('value heuristic: UUID', () => {
  const analysis = analyzeParameters('https://example.com/?x=550e8400-e29b-41d4-a716-446655440000');
  const param = paramByKey(analysis, 'x');
  assert.equal(param.type, 'tracking');
  assert.equal(param.description, 'Unique identifier');
});

test('value heuristic: 10+ digit number reads as phone/account id', () => {
  const analysis = analyzeParameters('https://example.com/?x=15551234567');
  const param = paramByKey(analysis, 'x');
  assert.equal(param.type, 'personal');
  assert.equal(param.privacy, 'medium');
});

test('value heuristic: embedded URL', () => {
  const analysis = analyzeParameters('https://example.com/?x=https%3A%2F%2Fother.example.com%2Fpath');
  const param = paramByKey(analysis, 'x');
  assert.equal(param.type, 'functional');
  assert.equal(param.description, 'Embedded URL');
});

test('value heuristic: opaque base64/hex blob', () => {
  const analysis = analyzeParameters(`https://example.com/?x=${'a'.repeat(24)}`);
  const param = paramByKey(analysis, 'x');
  assert.equal(param.type, 'tracking');
  assert.equal(param.description, 'Opaque identifier');
});

test('truly unknown parameter stays unknown with the updated description', () => {
  const analysis = analyzeParameters('https://example.com/?foo=bar');
  const param = paramByKey(analysis, 'foo');
  assert.equal(param.type, 'unknown');
  assert.equal(param.description, 'Unrecognised parameter');
});

test('truncation: long values are truncated at 50 chars but fullValue is kept', () => {
  const longValue = 'b'.repeat(80);
  const analysis = analyzeParameters(`https://example.com/?note=${longValue}`);
  const param = paramByKey(analysis, 'note');
  assert.equal(param.truncated, true);
  assert.equal(param.value.length, 50);
  assert.equal(param.value.endsWith('...'), true);
  assert.equal(param.fullValue, longValue);
});

test('truncation flag is false for short values', () => {
  const analysis = analyzeParameters('https://example.com/?utm_source=x');
  const param = paramByKey(analysis, 'utm_source');
  assert.equal(param.truncated, false);
});

test('byType returns counts across all six categories', () => {
  const analysis = analyzeParameters(
    'https://example.com/?utm_source=newsletter&utm_medium=email&gclid=abc123&user_id=12345&session_id=xyz&foo=bar'
  );

  assert.deepEqual(analysis.byType, {
    attribution: 2,
    tracking: 1,
    personal: 1,
    session: 1,
    functional: 0,
    unknown: 1
  });
  assert.equal(analysis.totalCount, 6);
  assert.equal(analysis.personalDataCount, 1);
  assert.equal(analysis.hasPersonalData, true);
});

test('byType is present and zeroed for a URL with no query params', () => {
  const analysis = analyzeParameters('https://example.com/');
  assert.deepEqual(analysis.byType, {
    attribution: 0,
    tracking: 0,
    personal: 0,
    session: 0,
    functional: 0,
    unknown: 0
  });
  assert.equal(analysis.totalCount, 0);
});

test('generateParameterInsight reads naturally with the middle dot separator', () => {
  const analysis = analyzeParameters(
    'https://example.com/?utm_source=newsletter&gclid=abc&fbclid=def&user_id=12345'
  );
  const insight = generateParameterInsight(analysis);
  assert.equal(insight, '1 personal identifier · 2 tracking IDs · campaign attribution');
});

test('generateParameterInsight returns null when there are no params', () => {
  const analysis = analyzeParameters('https://example.com/');
  assert.equal(generateParameterInsight(analysis), null);
});

test('redactUrl redacts personal and session values but leaves attribution values intact', () => {
  const url = 'https://example.com/go?utm_campaign=summer&email=test%40example.com&token=abcXYZ123456';
  const result = redactUrl(url);

  assert.ok(result.includes('utm_campaign=summer'));
  assert.ok(!result.includes('test%40example.com'));
  assert.ok(!result.includes('test@example.com'));
  assert.ok(!result.includes('abcXYZ123456'));
  assert.equal((result.match(/•••/g) || []).length, 2);
});

test('redactUrl returns the input unchanged for an invalid URL', () => {
  assert.equal(redactUrl('not a url'), 'not a url');
});

test('redactUrl returns the input unchanged when there are no query params', () => {
  assert.equal(redactUrl('https://example.com/path'), 'https://example.com/path');
});

test('redactUrl re-encodes (but does not redact) non-sensitive values with special characters', () => {
  // Pinning documented behavior: non-redacted values are rebuilt via
  // encodeURIComponent, so a "+" (decoded by URLSearchParams as a space)
  // comes back as "%20" rather than the original "+" - the value
  // round-trips to the same data, but not to byte-identical query text.
  const result = redactUrl('https://example.com/?utm_content=a+b&email=x%40y.com');
  assert.ok(result.includes('utm_content=a%20b'));
  assert.ok(result.includes('email=•••'));
});
