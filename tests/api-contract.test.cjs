const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadTypeScript } = require('./helpers.cjs');
const { MAX_JSON_REQUEST_BYTES, assertJsonRequestSize } = loadTypeScript(require.resolve('../src/lib/jsonRequest.ts'));
const { apiFetch } = loadTypeScript(require.resolve('../src/lib/api.ts'));

test('JSON size limit counts encoded UTF-8 bytes and permits exactly 16 KiB', () => {
  assert.doesNotThrow(() => assertJsonRequestSize('x'.repeat(MAX_JSON_REQUEST_BYTES)));
  assert.throws(() => assertJsonRequestSize('x'.repeat(MAX_JSON_REQUEST_BYTES + 1)), /16 KiB/);
  const unicode = JSON.stringify({ description: '😀'.repeat(5000) });
  assert.ok(unicode.length < MAX_JSON_REQUEST_BYTES);
  assert.throws(() => assertJsonRequestSize(unicode), /16 KiB/);
});

test('oversized JSON requests are stopped before fetch', async (t) => {
  const fetch = t.mock.method(global, 'fetch', async () => new Response(null, { status: 204 }));
  await assert.rejects(apiFetch('/api/admin/products/123', { method: 'PATCH', body: JSON.stringify({ description: 'x'.repeat(MAX_JSON_REQUEST_BYTES) }) }), /16 KiB/);
  assert.equal(fetch.mock.callCount(), 0);
});

test('browser JSON writes use same-origin paths, cookies, JSON headers and empty 204 handling', async (t) => {
  const oldWindow = global.window;
  global.window = {};
  t.after(() => { if (oldWindow === undefined) delete global.window; else global.window = oldWindow; });
  const fetch = t.mock.method(global, 'fetch', async () => new Response(null, { status: 204 }));
  for (const method of ['POST', 'PATCH', 'PUT', 'DELETE']) {
    assert.deepEqual(await apiFetch('/api/admin/products/123', { method }), {});
    const [url, options] = fetch.mock.calls.at(-1).arguments;
    assert.equal(url, '/api/admin/products/123');
    assert.equal(options.credentials, 'include');
    assert.equal(new Headers(options.headers).get('Content-Type'), 'application/json');
    assert.equal(options.body, '{}');
  }
});

test('multipart uploads bypass the JSON limit and let the browser select the boundary', async (t) => {
  const fetch = t.mock.method(global, 'fetch', async () => new Response(JSON.stringify({ data: [] }), { status: 201 }));
  const body = new FormData();
  body.append('uploadimage', new Blob(['x'.repeat(MAX_JSON_REQUEST_BYTES + 1)], { type: 'image/png' }), 'photo.png');
  await apiFetch('/api/admin/products/123/images', { method: 'POST', body });
  assert.equal(fetch.mock.callCount(), 1);
  const [, options] = fetch.mock.calls[0].arguments;
  assert.equal(new Headers(options.headers).has('Content-Type'), false);
});

test('a server-side 413 without JSON has an actionable error', async (t) => {
  t.mock.method(global, 'fetch', async () => new Response('Request too large', { status: 413 }));
  await assert.rejects(apiFetch('/api/admin/products/123', { method: 'PATCH', body: '{}' }), /too large/);
});
