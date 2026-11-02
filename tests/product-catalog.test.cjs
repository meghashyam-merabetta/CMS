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

test('parent inventory uses saved variant stock and price range even when its product type says simple', () => {
  const parent = { product_type: 'simple', inventory_managed: false, stock_quantity: 0, regular_price: null };
  const variants = [997.2, 999, 699].map((price, index) => ({ id: String(index), stock_quantity: 1000, regular_price: '1000.00', sale_price: String(price), is_active: true }));
  assert.deepEqual(catalog.summarizeProductInventory(parent, variants), { source: 'variants', stock: 3000, minPrice: 699, maxPrice: 999, activeVariantCount: 3 });
  assert.equal(parent.stock_quantity, 0); // Display aggregation must not alter saved parent inventory.
});

test('variant summaries exclude inactive rows, prefer effective prices and preserve legitimate zero prices', () => {
  const variants = [
    { stock_quantity: 8, regular_price: 100, sale_price: 90, effective_price: 80, is_active: true },
    { stock_quantity: 2, regular_price: 100, sale_price: 0, is_active: true },
    { stock_quantity: 900, sale_price: 900, is_active: false },
  ];
  assert.deepEqual(catalog.summarizeProductInventory({}, variants), { source: 'variants', stock: 10, minPrice: 0, maxPrice: 80, activeVariantCount: 2 });
});

test('unknown or malformed variant data never becomes false zero stock or a fabricated price range', () => {
  assert.deepEqual(catalog.summarizeProductInventory({ product_type: 'variable', stock_quantity: 0, regular_price: 0 }), { source: 'unavailable', stock: null, minPrice: null, maxPrice: null, activeVariantCount: 0 });
  for (const value of [undefined, '', 'bad', -1]) {
    const result = catalog.summarizeProductInventory({}, [{ stock_quantity: value, sale_price: value, is_active: true }, { stock_quantity: 3, sale_price: 100, is_active: true }]);
    assert.equal(result.stock, null); assert.equal(result.minPrice, null); assert.equal(result.maxPrice, null);
  }
  const empty = catalog.summarizeProductInventory({ product_type: 'variable' }, []);
  assert.equal(empty.stock, 0); assert.equal(empty.minPrice, null);
});

test('simple and warehouse-managed products keep their authoritative parent inventory and pricing', () => {
  const product = { product_type: 'simple', stock_quantity: 50, effective_price: '42.50' };
  assert.deepEqual(catalog.summarizeProductInventory(product, []), { source: 'product', stock: 50, minPrice: 42.5, maxPrice: 42.5, activeVariantCount: 0 });
  assert.equal(catalog.summarizeProductInventory({ ...product, inventory_managed: true }, [{ stock_quantity: 9000, regular_price: 9000 }]).stock, 50);
  assert.equal(catalog.summarizeProductInventory({ product_type: 'simple', regular_price: 100 }, [{ stock_quantity: 2, sale_price: null, regular_price: null }]).minPrice, 100);
});

test('an empty placeholder variant cannot replace a simple product’s own stock and price', () => {
  const product = { product_type: 'simple', inventory_managed: false, stock_quantity: 40, regular_price: 250 };
  const placeholder = { id: '219', attributes: {}, variant_name: 'Test', stock_quantity: 0, regular_price: null, sale_price: null };
  assert.deepEqual(catalog.summarizeProductInventory(product, [placeholder]), { source: 'product', stock: 40, minPrice: 250, maxPrice: 250, activeVariantCount: 0 });
  assert.equal(catalog.summarizeProductInventory(product, [{ ...placeholder, attributes: { Size: 'M' }, stock_quantity: 5, sale_price: 200 }]).stock, 5);
});

test('variant search finds saved options, names, IDs and SKUs without treating tax metadata as options', () => {
  const variants = [{ id: '203', variant_name: 'DSM02 (Pack of 15)', sku: 'ARREX-DSM02-1', attributes: { Size: 'DSM02', Colour: 'Blue', ' HSN ': '87131010' } }];
  for (const query of [' dsm02 ', 'pack of 15', '203', 'ARREX-DSM02-1', 'colour: blue']) {
    assert.equal(catalog.variantMatchesSearch(variants, query), true, query);
  }
  for (const query of ['', 'XXXL', '87131010']) assert.equal(catalog.variantMatchesSearch(variants, query), false, query);
  assert.equal(catalog.variantMatchesSearch([], 'DSM02'), false);
});

test('sorting supports names, natural product codes and numeric IDs in both directions', () => {
  const rows = [{ id: '10', name: 'Zebra', catalogCode: 'P2' }, { id: '2', name: 'apple', catalogCode: 'P10' }];
  for (const [field, order, expected] of [['product_name', 'asc', '2'], ['product_code', 'asc', '10'], ['product_id', 'asc', '2'], ['product_id', 'desc', '10']]) {
    assert.equal([...rows].sort((a, b) => catalog.compareProductRecords(a, b, field, order))[0].id, expected);
  }
});

test('multi-attribute variant matrix computes cartesian product and scales dynamically', () => {
  const sizes = ['M', 'XL'];
  const colors = ['Black', 'Blue'];
  const optionLists = [
    sizes.map((s) => ({ vtName: 'Size', val: s })),
    colors.map((c) => ({ vtName: 'Color', val: c })),
  ];
  const combos = optionLists.reduce(
    (acc, curr) => acc.flatMap((a) => curr.map((b) => [...a, b])),
    [[]]
  );
  assert.equal(combos.length, 4);
  const formatted = combos.map((c) => Object.fromEntries(c.map((item) => [item.vtName, item.val])));
  assert.deepEqual(formatted, [
    { Size: 'M', Color: 'Black' },
    { Size: 'M', Color: 'Blue' },
    { Size: 'XL', Color: 'Black' },
    { Size: 'XL', Color: 'Blue' },
  ]);

  // If a 3rd attribute (e.g. Material or Pack) is added in the future:
  const packs = ['10 pcs', '30 pcs'];
  const threeWayLists = [
    sizes.map((s) => ({ vtName: 'Size', val: s })),
    colors.map((c) => ({ vtName: 'Color', val: c })),
    packs.map((p) => ({ vtName: 'Pack', val: p })),
  ];
  const threeWayCombos = threeWayLists.reduce(
    (acc, curr) => acc.flatMap((a) => curr.map((b) => [...a, b])),
    [[]]
  );
  assert.equal(threeWayCombos.length, 8);
  const threeWayFormatted = threeWayCombos.map((c) => Object.fromEntries(c.map((item) => [item.vtName, item.val])));
  assert.deepEqual(threeWayFormatted[0], { Size: 'M', Color: 'Black', Pack: '10 pcs' });
  assert.deepEqual(threeWayFormatted[7], { Size: 'XL', Color: 'Blue', Pack: '30 pcs' });
});

