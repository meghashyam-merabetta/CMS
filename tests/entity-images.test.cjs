const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadTypeScript } = require('./helpers.cjs');
const { validateCatalogImage, MAX_CATALOG_IMAGE_BYTES } = loadTypeScript(require.resolve('../src/lib/catalogImages.ts'));
const servicePath = require.resolve('../src/services/api/adminEntityImagesApi.ts');
const image = () => new File(['image bytes'], 'photo.png', { type: 'image/png' });

test('category and brand image selection validates format, empty files and 5 MiB limit', () => {
  assert.equal(validateCatalogImage(image()), '');
  assert.match(validateCatalogImage(new File(['x'], 'image.svg', { type: 'image/svg+xml' })), /JPG, PNG or WebP/);
  assert.match(validateCatalogImage(new File([], 'empty.png', { type: 'image/png' })), /empty/);
  assert.equal(validateCatalogImage({ type: 'image/webp', size: MAX_CATALOG_IMAGE_BYTES }), '');
  assert.match(validateCatalogImage({ type: 'image/jpeg', size: MAX_CATALOG_IMAGE_BYTES + 1 }), /5 MiB/);
});

for (const resource of ['categories', 'brands']) {
  test(`${resource} uploads one uploadimage file via PUT and uses the returned URL`, async () => {
    let request;
    const api = loadTypeScript(servicePath, async (url, options) => { request = { url, ...options }; return { data: { image_url: 'https://example.com/new-immutable.png' } }; });
    const file = image();
    const url = await api.uploadAdminEntityImage(resource, '123', file);
    assert.equal(url, 'https://example.com/new-immutable.png');
    assert.equal(request.url, `/api/admin/${resource}/123/image`);
    assert.equal(request.method, 'PUT');
    assert.ok(request.body instanceof FormData);
    assert.deepEqual([...request.body.keys()], ['uploadimage']);
    assert.equal(request.body.get('uploadimage').name, 'photo.png');
    assert.equal(request.headers, undefined);
  });

  test(`${resource} reads null images and deletes with JSON {}`, async () => {
    const requests = [];
    const api = loadTypeScript(servicePath, async (url, options) => { requests.push({ url, ...options }); return { data: { image_url: null } }; });
    assert.equal(await api.getAdminEntityImage(resource, '123'), null);
    await api.deleteAdminEntityImage(resource, '123');
    assert.equal(requests[0].cache, 'no-store');
    assert.equal(requests[1].method, 'DELETE');
    assert.equal(requests[1].body, '{}');
  });

  test(`${resource} image retry reuses the created ID and does not repeat metadata creation`, async () => {
    let fail = true;
    const requests = [];
    const api = loadTypeScript(servicePath, async (url, options) => {
      requests.push({ url, ...options });
      if (fail) throw new Error('Storage unavailable');
      return { data: { image_url: 'https://example.com/saved.png' } };
    });
    let creates = 0;
    let preview;
    const state = {};
    const options = {
      resource, state, metadata: { name: 'Test' }, selection: { file: image(), remove: false },
      saveMetadata: async () => { creates++; return { id: '123' }; }, getId: (entity) => entity.id,
      onImageSaved: (url) => { preview = url; },
    };
    await assert.rejects(api.saveEntityWithImage(options), /#123 was saved.*Storage unavailable.*Retry Save/);
    assert.equal(state.id, '123');
    assert.equal(preview, undefined);
    fail = false;
    await api.saveEntityWithImage(options);
    assert.equal(creates, 1);
    assert.equal(preview, 'https://example.com/saved.png');
    assert.equal(requests.length, 2);
    assert.ok(requests.every((request) => request.url.endsWith('/123/image')));
  });
}

test('subcategories use the category upload route after their metadata is saved', async () => {
  const calls = [];
  const api = loadTypeScript(servicePath, async (url) => { calls.push(url); return { data: { image_url: 'https://example.com/subcategory.png' } }; });
  const metadata = { category_name: 'Child', parent_category_id: 12 };
  await api.saveEntityWithImage({ resource: 'categories', state: {}, metadata, selection: { file: image(), remove: false },
    saveMetadata: async () => { calls.push(metadata); return { category_id: '24' }; }, getId: (entity) => entity.category_id, onImageSaved() {},
  });
  assert.deepEqual(calls, [metadata, '/api/admin/categories/24/image']);
});

test('image removal failure preserves the preview and permits image-only retry', async () => {
  let fail = true;
  let metadataSaves = 0;
  let preview = 'https://example.com/old.png';
  const api = loadTypeScript(servicePath, async () => { if (fail) throw new Error('Delete failed'); return {}; });
  const options = { resource: 'brands', state: { id: '123' }, metadata: { brand_name: 'Test' }, selection: { file: null, remove: true },
    saveMetadata: async () => { metadataSaves++; return { brand_id: '123' }; }, getId: (entity) => entity.brand_id,
    onImageSaved: (url) => { preview = url; },
  };
  await assert.rejects(api.saveEntityWithImage(options), /Delete failed/);
  assert.equal(preview, 'https://example.com/old.png');
  fail = false;
  await api.saveEntityWithImage(options);
  assert.equal(preview, null);
  assert.equal(metadataSaves, 1);
});

test('metadata edited after an upload failure updates the existing record before retry', async () => {
  let fail = true;
  const api = loadTypeScript(servicePath, async () => { if (fail) throw new Error('Upload failed'); return { data: { image_url: 'https://example.com/new.png' } }; });
  const ids = [];
  const options = { resource: 'categories', state: {}, metadata: { category_name: 'Original' }, selection: { file: image(), remove: false },
    saveMetadata: async (id) => { ids.push(id); return { category_id: '123' }; }, getId: (entity) => entity.category_id, onImageSaved() {},
  };
  await assert.rejects(api.saveEntityWithImage(options), /Upload failed/);
  options.metadata = { category_name: 'Edited' };
  fail = false;
  await api.saveEntityWithImage(options);
  assert.deepEqual(ids, [undefined, '123']);
});

test('invalid image files stop before metadata creation or any upload', async () => {
  const api = loadTypeScript(servicePath, async () => assert.fail('No image request expected'));
  await assert.rejects(api.saveEntityWithImage({ resource: 'categories', state: {}, metadata: {},
    selection: { file: new File(['x'], 'bad.txt', { type: 'text/plain' }), remove: false },
    saveMetadata: async () => assert.fail('No metadata request expected'), getId() {}, onImageSaved() {},
  }), /JPG, PNG or WebP/);
});

test('saving without a new file preserves the current image without re-upload or deletion', async () => {
  const api = loadTypeScript(servicePath, async () => assert.fail('No image request expected'));
  const original = { brand_id: '123', image_url: 'https://example.com/current.png' };
  const saved = await api.saveEntityWithImage({ resource: 'brands', state: { id: '123' }, metadata: { brand_name: 'New name' },
    selection: { file: null, remove: false }, saveMetadata: async () => original,
    getId: (entity) => entity.brand_id, onImageSaved: () => assert.fail('No preview change expected'),
  });
  assert.equal(saved.image_url, original.image_url);
});

test('invalid IDs and missing upload URLs produce errors instead of claiming success', async () => {
  let requests = 0;
  const api = loadTypeScript(servicePath, async () => { requests++; return { data: {} }; });
  for (const id of ['0', '-1', '1.2', 'abc']) await assert.rejects(api.uploadAdminEntityImage('brands', id, image()), /valid category or brand ID/);
  assert.equal(requests, 0);
  await assert.rejects(api.uploadAdminEntityImage('brands', '123', image()), /did not return/);
});

test('image input offers uploads, persisted preview, removal and undo instead of a URL textbox', () => {
  const React = require('react');
  const { renderToStaticMarkup } = require('react-dom/server');
  const Input = loadTypeScript(require.resolve('../src/components/ui/EntityImageInput.tsx')).default;
  const props = { label: 'Category Image', currentUrl: 'https://example.com/current.png', value: { file: null, remove: false }, onChange() {} };
  const html = renderToStaticMarkup(React.createElement(Input, props));
  assert.match(html, /type="file"/);
  assert.match(html, /current.png/);
  assert.match(html, /Replace image/);
  assert.match(html, /Remove image/);
  assert.doesNotMatch(html, /type="url"/);
  const removed = renderToStaticMarkup(React.createElement(Input, { ...props, value: { file: null, remove: true } }));
  assert.match(removed, /Keep current image/);
  assert.match(removed, /will be removed when you save/);
});
