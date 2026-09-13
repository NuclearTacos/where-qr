import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifyDomain, isKnownIntermediary, CATEGORIES } from '../src/analysis/domains.js';

test('exact match classifies a known domain', () => {
  const result = classifyDomain('bit.ly');
  assert.equal(result.name, 'Bitly');
  assert.equal(result.categoryKey, 'shortener');
  assert.equal(result.category.name, 'Link Shortener');
});

test('exact match: facebook.com is social, not the dead analytics duplicate', () => {
  const result = classifyDomain('facebook.com');
  assert.equal(result.name, 'Facebook');
  assert.equal(result.categoryKey, 'social');
});

test('suffix match: www.amazon.com falls back to amazon.com', () => {
  const result = classifyDomain('www.amazon.com');
  assert.equal(result.name, 'Amazon');
  assert.equal(result.categoryKey, 'ecommerce');
});

test('suffix match: m.facebook.com falls back to facebook.com', () => {
  const result = classifyDomain('m.facebook.com');
  assert.equal(result.name, 'Facebook');
  assert.equal(result.categoryKey, 'social');
});

test('suffix match: l.facebook.com is the Link Shim, not Facebook itself', () => {
  const result = classifyDomain('l.facebook.com');
  assert.equal(result.name, 'Facebook Link Shim');
  assert.equal(result.categoryKey, 'tracking');
});

test('suffix match: adsystem.amazon.com is Amazon Advertising, not swallowed by amazon.com', () => {
  const result = classifyDomain('adsystem.amazon.com');
  assert.equal(result.name, 'Amazon Advertising');
  assert.equal(result.categoryKey, 'advertising');
});

test('apple.com is not misclassified as a Short Domain', () => {
  assert.equal(classifyDomain('apple.com'), null);
});

test('bare TLD is never matched', () => {
  assert.equal(classifyDomain('com'), null);
  assert.equal(classifyDomain('localhost'), null);
});

test('qrco.de classifies as a shortener (dynamic QR redirector)', () => {
  const result = classifyDomain('qrco.de');
  assert.equal(result.categoryKey, 'shortener');
});

test('qr-code-generator.com classifies under the qrservice category', () => {
  const result = classifyDomain('qr-code-generator.com');
  assert.equal(result.categoryKey, 'qrservice');
  assert.equal(result.category.name, 'QR Service');
  assert.equal(CATEGORIES.qrservice.name, 'QR Service');
});

test('pattern match still works and includes categoryKey', () => {
  const result = classifyDomain('d111111abcdef8.cloudfront.net');
  assert.equal(result.name, 'AWS CloudFront');
  assert.equal(result.categoryKey, 'infrastructure');
});

test('hostname normalization: uppercase and trailing dot', () => {
  const result = classifyDomain('BIT.LY.');
  assert.equal(result.name, 'Bitly');
});

test('isKnownIntermediary is true for shortener/qrservice/tracking/advertising/analytics/email', () => {
  assert.equal(isKnownIntermediary(classifyDomain('bit.ly')), true);
  assert.equal(isKnownIntermediary(classifyDomain('qr-code-generator.com')), true);
  assert.equal(isKnownIntermediary(classifyDomain('l.facebook.com')), true);
  assert.equal(isKnownIntermediary(classifyDomain('doubleclick.net')), true);
  assert.equal(isKnownIntermediary(classifyDomain('google-analytics.com')), true);
  assert.equal(isKnownIntermediary(classifyDomain('mailchimp.com')), true);
});

test('isKnownIntermediary is false for the actual destination or no classification', () => {
  assert.equal(isKnownIntermediary(classifyDomain('facebook.com')), false);
  assert.equal(isKnownIntermediary(classifyDomain('amazon.com')), false);
  assert.equal(isKnownIntermediary(classifyDomain('apple.com')), false);
  assert.equal(isKnownIntermediary(null), false);
});
