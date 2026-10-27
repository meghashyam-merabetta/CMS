const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadTypeScript } = require('./helpers.cjs');

const catalog = loadTypeScript(require.resolve('../src/lib/productCatalog.ts'));
const { collectAllPages } = loadTypeScript(require.resolve('../src/lib/pagination.ts'));

for (const [service, method, key] of [
  ['adminBrandsApi', 'getAllAdminBrands', 'brand_id'],
  ['adminCategoriesApi', 'getAllAdminCategories', 'category_id'],
  ['adminVariantAttributesApi', 'getAllAdminVariantAttributes', 'id'],
]) {
  test(`${method} loads every page, including a server-clamped page size`, async () => {
    const records = Array.from({ length: 5 }, (_, id) => ({ [key]: id + 1 }));
    const offsets = [];
    const api = loadTypeScript(require.resolve(`../src/services/api/${service}.ts`), async (_url, options) => {
      const { offset } = options.params;
      offsets.push(offset);
      return { data: records.slice(offset, offset + 2), pagination: { total: 5, limit: 2, offset, hasMore: offset + 2 < 5 } };
    });
    assert.deepEqual(await api[method](), records);
    assert.deepEqual(offsets, [0, 2, 4]);
  });
  test(`${method} exposes lookup failures instead of silently returning an empty list`, async () => {
    const api = loadTypeScript(require.resolve(`../src/services/api/${service}.ts`), async () => { throw new Error('Connection failed'); });
    await assert.rejects(api[method](), /Connection failed/);
  });
}

test('pagination terminates safely on repeated pages and empty incomplete pages', async () => {
  await assert.rejects(collectAllPages(async () => ({ data: [{ id: 1 }], pagination: { total: 2, hasMore: true } }), (item) => item.id), /repeated a page/);
  await assert.rejects(collectAllPages(async () => ({ data: [], pagination: { total: 2, hasMore: true } }), (item) => item.id), /incomplete list/);
});

test('thumbnail aliases resolve consistently, with primary image first', async () => {
  const api = loadTypeScript(require.resolve('../src/services/api/adminProductsApi.ts'), async () => ({ data: [{ image_id: 3, url: 'https://example.com/saved.png' }] }));
  assert.deepEqual(api.resolveProductImageUrls({ images: [{ url: 'a.png' }, { imageUrl: 'b.png', is_primary: true }] }), ['b.png', 'a.png']);
  assert.equal((await api.getAdminProductImages(123))[0].id, 3);
  assert.equal((await api.getAdminProductImages(123))[0].image_url, 'https://example.com/saved.png');
});

test('changing size preserves all other variant attributes and original key casing', () => {
  const original = { size: 'M', Colour: 'Blue', Pack: '10' };
  assert.deepEqual(catalog.mergeVariantAttributes(original, 'size', 'L'), { size: 'L', Colour: 'Blue', Pack: '10' });
  assert.deepEqual(catalog.mergeVariantAttributes(original, 'Size', 'XL'), { size: 'M', Size: 'XL', Colour: 'Blue', Pack: '10' });
  assert.equal(original.size, 'M');
});

test('product summaries distinguish size and colour combinations', () => {
  const summary = catalog.summarizeProductVariants([{ attributes: { Size: 'M', Colour: 'Blue' } }, { attributes: { Size: 'L', Colour: 'Red' } }]);
  assert.match(summary, /Size: M \/ Colour: Blue/);
  assert.match(summary, /Size: L \/ Colour: Red/);
});

test('sorting supports names, natural product codes and numeric IDs in both directions', () => {
  const rows = [{ id: '10', name: 'Zebra', catalogCode: 'P2' }, { id: '2', name: 'apple', catalogCode: 'P10' }];
  for (const [field, order, expected] of [['product_name', 'asc', '2'], ['product_code', 'asc', '10'], ['product_id', 'asc', '2'], ['product_id', 'desc', '10']]) {
    assert.equal([...rows].sort((a, b) => catalog.compareProductRecords(a, b, field, order))[0].id, expected);
  }
});

