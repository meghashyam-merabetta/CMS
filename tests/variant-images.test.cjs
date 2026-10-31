const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadTypeScript } = require('./helpers.cjs');
const picture = (name = 'photo.png', size = 8, type = 'image/png') => new File([new Uint8Array(size)], name, { type });

function server() {
  const state = { parent: [{ id: '900', image_url: 'https://images/product.png', is_primary: true }], variants: new Map(['1', '2', '3'].map(id => [id, { inherit: true, images: [] }])), calls: [], replay: new Map(), next: 100, failUpload: 0, failAfterCommit: false, failGet: false, refreshes: 0 };
  const snapshot = id => {
    const v = state.variants.get(id);const effective = v.inherit ? state.parent : v.images;
    return structuredClone({ data: { product_id: '55', variant_id: id, use_product_images: v.inherit, effective_source: v.inherit ? 'product' : 'variant', custom_images: v.images, effective_images: effective, primary_image: effective.find(row => row.is_primary) || effective[0] || null } });
  };
  state.api = async (url, options = {}) => {
    const method = options.method || 'GET';const key = options.headers?.['Idempotency-Key'];
    const file = options.body instanceof FormData ? options.body.get('uploadimage') : null;
    state.calls.push({ method, url, key, filename: file?.name, headers: options.headers, body: options.body });
    if (method === 'GET' && state.failGet) { state.failGet = false; throw new Error('Refresh interrupted'); }
    if (key && state.replay.has(key)) return structuredClone(state.replay.get(key));
    if (url.endsWith('/variants/images/share')) {
      assert.equal(method, 'POST');const source = state.variants.get(String(JSON.parse(options.body).source_variant_id));
      const rows = source.inherit ? state.parent : source.images;
      state.parent = rows.map((row, i) => ({ id: String(900 + i), image_url: row.image_url, is_primary: row.is_primary }));
      for (const v of state.variants.values()) v.inherit = true;
      const data = snapshot(String(JSON.parse(options.body).source_variant_id));state.replay.set(key, data);
      return data;
    }
    const match = url.match(/^\/api\/admin\/products\/55\/variants\/(\d+)\/images(?:\/(\d+)(\/primary)?)?$/);
    assert.ok(match, url);const [, id, imageId, primary] = match;const v = state.variants.get(id);
    if (method === 'GET') return snapshot(id);
    if (method === 'PATCH' && !imageId) { v.inherit = JSON.parse(options.body).use_product_images; return snapshot(id); }
    if (method === 'POST' || method === 'PUT') {
      assert.deepEqual([...options.body.keys()], ['uploadimage']);assert.equal(options.headers['Content-Type'], undefined);assert.ok(key);
      if (state.failUpload > 0) { state.failUpload--; throw new Error('Upload interrupted'); }
      const row = { id: imageId || String(++state.next), variant_id: id, image_url: `https://images/${id}/${key}/${file.name}`, is_primary: !v.images.length };
      if (imageId) { const i = v.images.findIndex(row => row.id === imageId);assert(i >= 0);row.is_primary = v.images[i].is_primary;v.images[i] = row; }
      else v.images.push(row);
      v.inherit = false;const data = snapshot(id);state.replay.set(key, data);
      if (state.failAfterCommit) { state.failAfterCommit = false; throw new Error('Response lost after commit'); }
      return data;
    }
    assert.ok(v.images.some(row => row.id === imageId));
    if (primary) { assert.equal(options.body, '{}');v.images.forEach(row => { row.is_primary = row.id === imageId; }); }
    else if (method === 'DELETE') {
      assert.equal(options.body, '{}');v.images = v.images.filter(row => row.id !== imageId);
      if (v.images.length && !v.images.some(row => row.is_primary)) v.images[0].is_primary = true;
    }
    v.inherit = false;return method === 'DELETE' ? {} : snapshot(id);
  };
  const module = loadTypeScript(require.resolve('../src/lib/variantImageEditor.ts'), state.api);
  state.editor = id => new module.VariantImageEditor('55', id);
  return state;
}
const refresh = async () => {};

test('M/L/XL galleries stay isolated and load by exact backend IDs', async () => {
  const s = server();
  for (const [id, size] of [['1', 'M'], ['2', 'L'], ['3', 'XL']]) {
    const editor = s.editor(id);await editor.load();await editor.upload([picture(size + '.png')], refresh);
  }
  for (const [id, size] of [['1', 'M'], ['2', 'L'], ['3', 'XL']]) {
    const reloaded = s.editor(id);await reloaded.load();assert.equal(reloaded.gallery.variant_id, id);assert.equal(reloaded.gallery.use_product_images, false);
    assert.equal(reloaded.gallery.custom_images.length, 1);assert.match(reloaded.gallery.primary_image.image_url, new RegExp('/' + size + '\\.png$'));
  }
  assert.equal(s.parent[0].image_url, 'https://images/product.png');
});

test('share M to all, refresh product defaults and variants, then override L only', async () => {
  const s = server();const m = s.editor('1');await m.load();await m.upload([picture('M.png')], refresh);
  let productRefreshes = 0;
  await m.share(async () => { productRefreshes++; });assert.equal(productRefreshes, 1);
  for (const id of ['1', '2', '3']) { const e = s.editor(id);await e.load();assert.equal(e.gallery.use_product_images, true);assert.match(e.gallery.primary_image.image_url, /M.png$/); }
  const l = s.editor('2');await l.load();await l.upload([picture('L.png')], refresh);
  const xl = s.editor('3');await xl.load();assert.equal(l.gallery.use_product_images, false);assert.match(l.gallery.primary_image.image_url, /L.png$/);assert.match(xl.gallery.primary_image.image_url, /M.png$/);
});

test('primary, replacement and deletion use custom IDs; empty custom galleries never inherit', async () => {
  const s = server();const e = s.editor('1');await e.load();
  await assert.rejects(e.remove('900', refresh), /custom gallery/);assert.equal(s.calls.filter(c => c.method === 'DELETE').length, 0);
  await e.mode(false, refresh);assert.equal(e.gallery.effective_images.length, 0);
  await e.upload([picture('front.png'), picture('back.png')], refresh);const [front, back] = e.gallery.custom_images;
  await e.primary(back.id, refresh);assert.equal(e.gallery.primary_image.id, back.id);
  await e.replace(back.id, picture('new.png'), refresh);assert.equal(e.gallery.primary_image.id, back.id);assert.match(e.gallery.primary_image.image_url, /new.png$/);
  await e.remove(back.id, refresh);assert.equal(e.gallery.primary_image.id, front.id);
  await e.remove(front.id, refresh);await e.load();assert.equal(e.gallery.use_product_images, false);assert.deepEqual(e.gallery.effective_images, []);assert.equal(e.gallery.primary_image, null);
  assert.equal(s.parent.length, 1);
});

test('mode PATCH preserves custom images when switching inheritance on and off', async () => {
  const s = server();const e = s.editor('1');await e.load();await e.upload([picture('M.png')], refresh);
  await e.mode(true, refresh);assert.match(e.gallery.primary_image.image_url, /product.png$/);assert.equal(e.gallery.custom_images.length, 1);
  await e.mode(false, refresh);assert.match(e.gallery.primary_image.image_url, /M.png$/);
});

test('uploads and replacements retry with the same key after a lost successful response', async () => {
  const s = server();const e = s.editor('1');await e.load();s.failAfterCommit = true;
  await assert.rejects(e.upload([picture('one.png')], refresh), /Response lost/);
  await e.retry(refresh);assert.equal(e.gallery.custom_images.length, 1);
  let writes = s.calls.filter(c => c.method === 'POST');assert.equal(writes[0].key, writes[1].key);
  s.failAfterCommit = true;await assert.rejects(e.replace(e.gallery.custom_images[0].id, picture('replacement.png'), refresh), /Response lost/);
  await e.retry(refresh);writes = s.calls.filter(c => c.method === 'PUT');assert.equal(writes[0].key, writes[1].key);assert.equal(e.gallery.custom_images.length, 1);
});

test('partial batches keep confirmed files and send remaining files one at a time', async () => {
  const s = server();const api = s.api;let uploadCount = 0;
  const { VariantImageEditor } = loadTypeScript(require.resolve('../src/lib/variantImageEditor.ts'), async (url, options = {}) => {
    if (options.method === 'POST' && ++uploadCount === 2) { s.failUpload = 1; }
    return api(url, options);
  });
  const e = new VariantImageEditor('55', '1');await e.load();await assert.rejects(e.upload([picture('a.png'), picture('b.png'), picture('c.png')], refresh), /Upload interrupted/);
  await e.retry(refresh);const calls = s.calls.filter(c => c.method === 'POST');assert.deepEqual(calls.map(c => c.filename), ['a.png', 'b.png', 'b.png', 'c.png']);assert.equal(calls[1].key, calls[2].key);assert.equal(e.gallery.custom_images.length, 3);
});

test('share retry retains its key, and a post-commit refresh retry sends no new mutation', async () => {
  const s = server();const api = s.api;let failShare = true;
  const { VariantImageEditor } = loadTypeScript(require.resolve('../src/lib/variantImageEditor.ts'), async (url, options = {}) => {
    const result = await api(url, options);
    if (url.endsWith('/share') && failShare) { failShare = false;throw new Error('Share response lost'); }
    return result;
  });
  const e = new VariantImageEditor('55', '1');await e.load();await e.upload([picture()], refresh);
  await assert.rejects(e.share(refresh), /Share response lost/);await e.retry(refresh);
  const shares = s.calls.filter(c => c.url.endsWith('/share'));assert.equal(shares.length, 2);assert.equal(shares[0].key, shares[1].key);
  s.failGet = true;await assert.rejects(e.replace(e.gallery.custom_images[0].id, picture('next.png'), refresh), /Refresh interrupted/);
  const before = s.calls.filter(c => c.method === 'PUT').length;await e.retry(refresh);assert.equal(s.calls.filter(c => c.method === 'PUT').length, before);
});

test('variant limits count custom images, accept 5 MiB exactly, and reject invalid files', async () => {
  const s = server();const api = loadTypeScript(require.resolve('../src/services/api/adminVariantImagesApi.ts'), s.api);
  assert.doesNotThrow(() => api.validateVariantImages([picture('max.png', 5 * 1024 * 1024)], 9));
  assert.throws(() => api.validateVariantImages([picture()], 10), /maximum of 10/);
  for (const file of [picture('large.png', 5 * 1024 * 1024 + 1), picture('empty.png', 0), picture('bad.svg', 1, 'image/svg+xml')]) assert.throws(() => api.validateVariantImages([file], 0));
  s.parent = Array.from({ length: 10 }, (_, i) => ({ id: String(900 + i), image_url: 'https://images/' + i }));const e = s.editor('1');await e.load();await e.upload([picture()], refresh);assert.equal(e.gallery.custom_images.length, 1);
});

test('wrong-owner and malformed custom responses fail instead of falling back to product images', async () => {
  const api = loadTypeScript(require.resolve('../src/services/api/adminVariantImagesApi.ts'), async () => ({ data: { product_id: '55', variant_id: '2', use_product_images: true, custom_images: [], effective_images: [], primary_image: null } }));
  await assert.rejects(api.getVariantGallery('55', '1'), /Unable to read/);
  const broken = loadTypeScript(require.resolve('../src/services/api/adminVariantImagesApi.ts'), async () => ({ data: { product_id: '55', variant_id: '1', use_product_images: false, effective_source: 'variant', custom_images: [], effective_images: [{ id: '900', image_url: 'https://images/parent' }], primary_image: null } }));
  await assert.rejects(broken.getVariantGallery('55', '1'), /inherited images for a custom gallery/);
});

test('unsaved variants allow staging images for the same save while the deployment gate stays respected', () => {
  const React = require('react');const { renderToStaticMarkup } = require('react-dom/server');
  const Component = loadTypeScript(require.resolve('../src/components/products/VariantImageGallery.tsx')).default;
  for (const enabled of [false, true]) {
    const html = renderToStaticMarkup(React.createElement(Component, { enabled, label: 'M', onShared: refresh, onBusyChange() {}, onPendingFilesChange() {} }));
    if (enabled) {
      assert.match(html, /type="file"/);
      assert.match(html, /upload automatically when you save/);
      assert.doesNotMatch(html, /first, then reopen/);
    } else {
      assert.doesNotMatch(html, /type="file"/);
      assert.match(html, /not available yet/);
    }
  }
});

test('only a definite rejected action can be discarded; an uncertain upload must keep its retry key', async () => {
  const s = server();const api = s.api;let reject = true;
  const { VariantImageEditor } = loadTypeScript(require.resolve('../src/lib/variantImageEditor.ts'), async (url, options = {}) => {
    if (options.method === 'POST' && reject) throw Object.assign(new Error('Image bytes do not match MIME'), { status: 400 });
    return api(url, options);
  });
  const e = new VariantImageEditor('55', '1');await e.load();await assert.rejects(e.upload([picture()], refresh), /MIME/);assert.equal(e.rejected, true);e.discardRejected();assert.equal(e.pending, null);
  reject = false;s.failAfterCommit = true;await assert.rejects(e.upload([picture()], refresh), /Response lost/);assert.equal(e.rejected, false);assert.throws(() => e.discardRejected(), /Retry this operation/);await e.retry(refresh);assert.equal(e.gallery.custom_images.length, 1);
});
