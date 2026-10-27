const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const { loadTypeScript } = require('./helpers.cjs');
const { mergeVariantAttributes } = loadTypeScript(require.resolve('../src/lib/productCatalog.ts'));

function loadService(apiFetch) {
  return loadTypeScript(require.resolve('../src/services/api/adminProductsApi.ts'), apiFetch);
}

// Exercise the actual editor handlers with state and API substitutes, without a DOM.
const source = fs.readFileSync(require.resolve('../src/components/products/ProductEditor.tsx'), 'utf8');
const ast = ts.createSourceFile('editor.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
function editorHandler(name, env) {
  let found;
  function visit(node) {
    if (ts.isFunctionDeclaration(node) && node.name?.text === name) found = node;
    ts.forEachChild(node, visit);
  }
  visit(ast);
  assert.ok(found, `Editor handler ${name} exists`);
  const js = ts.transpileModule(found.getText(ast), {
    compilerOptions: { target: ts.ScriptTarget.ES2020 },
  }).outputText;
  return new Function('env', `with (env) { ${js}; return ${name}; }`)(env);
}

const { validateProductImages, MAX_TOTAL_IMAGE_BYTES, MAX_PRODUCT_IMAGE_BYTES, validateAdminProductRequestSize } = loadService(() => {});
const file = (name = 'photo.png', type = 'image/png', size = 1) => ({ name, type, size });

test('image validation counts saved images, checks MIME types and combined bytes', () => {
  assert.equal(validateProductImages([file()], 5), '');
  assert.match(validateProductImages([file()], 6), /maximum of 6/);
  assert.match(validateProductImages([file('bad.svg', 'image/svg+xml')]), /JPG, PNG or WebP/);
  assert.match(validateProductImages([file()], 1, MAX_TOTAL_IMAGE_BYTES), /10 MB/);
  assert.equal(validateProductImages([file('photo.png', 'image/png', MAX_PRODUCT_IMAGE_BYTES)]), '');
  assert.match(validateProductImages([file('photo.png', 'image/png', MAX_PRODUCT_IMAGE_BYTES + 1)]), /5 MiB/);
});

test('image picker rejects a seventh file without changing the image list', () => {
  const env = {
    images: Array.from({ length: 6 }, (_, id) => ({ key: String(id) })),
    totalImageBytes: 0, validateProductImages,
    setError(value) { env.error = value; },
    setImages(update) { env.images = update(env.images); },
  };
  const event = { target: { files: [file()], value: 'photo.png' } };
  editorHandler('onPickImages', env)(event);
  assert.equal(env.images.length, 6);
  assert.match(env.error, /maximum of 6/);
  assert.equal(event.target.value, '');
});

function deletionEnv() {
  const env = {
    editId: '123', images: [{ key: 'saved', backendImageId: '1', src: 'https://example.com/photo.png' }],
    setDeletingImageKey() {},
    setError(value) { env.error = value; },
    setImages(update) { env.images = update(env.images); },
    console: { warn() {} }, uid: () => 'key', URL,
  };
  return env;
}

test('failed DELETE and failed verification retain the image and show an error', async () => {
  const env = deletionEnv();
  env.deleteAdminProductImage = async () => { throw new Error('Delete failed'); };
  env.getAdminProductImages = async () => { throw new Error('Verification failed'); };
  await editorHandler('handleDeleteEditorImage', env)(env.images[0]);
  assert.equal(env.images.length, 1);
  assert.match(env.error, /Verification failed/);
});

test('a DELETE response does not hide an image that still exists on the server', async () => {
  const env = deletionEnv();
  env.deleteAdminProductImage = async () => {};
  env.getAdminProductImages = async () => [{ id: '1', image_url: env.images[0].src }];
  await editorHandler('handleDeleteEditorImage', env)(env.images[0]);
  assert.equal(env.images.length, 1);
  assert.match(env.error, /could not be deleted/);
});

test('image deletion accepts a verified removal even if DELETE returned an error', async () => {
  const env = deletionEnv();
  env.deleteAdminProductImage = async () => { throw new Error('Storage cleanup failed'); };
  env.getAdminProductImages = async () => [];
  await editorHandler('handleDeleteEditorImage', env)(env.images[0]);
  assert.equal(env.images.length, 0);
  assert.equal(env.error, '');
});

test('malformed image lists fail instead of appearing to confirm deletion', async () => {
  const api = loadService(async () => ({ message: 'Unexpected response' }));
  await assert.rejects(api.getAdminProductImages(123), /Unable to read/);
});

test('upload service checks fresh server count before posting, including gallery callers', async () => {
  let posts = 0;
  const api = loadService(async (_url, options) => {
    if (options.method === 'POST') posts++;
    return { data: Array.from({ length: 6 }, (_, id) => ({ id, image_url: 'photo.png' })) };
  });
  await assert.rejects(api.uploadAdminProductImages(123, [file()]), /maximum of 6/);
  assert.equal(posts, 0);
});

function saveEnv() {
  const env = {
    editId: null, productType: 'VARIABLE', createdProductIdRef: { current: null },
    validateAdminProductRequestSize,
    uncertainImageUpload: { current: false },
    productLoadError: '', lookupError: '',
    images: [{ key: 'local', file: file(), src: 'blob:local' }],
    serverImages: [], creates: 0, updates: 0, uploads: 0,
    buildApiPayload: () => ({ product_name: 'Test', product_type: 'variable', images: [file()] }),
    validateProductImages,
    createAdminProduct: async (payload) => {
      assert.equal(payload.images, undefined);
      env.creates++;
      return { product_id: 123 };
    },
    updateAdminProduct: async (_id, payload) => {
      assert.equal(payload.images, undefined);
      env.updates++;
    },
    setCreatedProductId(id) { env.editId = id; },
    window: { history: { replaceState(_state, _unused, url) { env.url = url; } } },
    getAdminProductImages: async () => env.serverImages,
    uploadAdminProductImages: async () => {
      env.uploads++;
      env.serverImages = [{ id: '10', image_url: 'https://example.com/saved.png' }];
    },
    setImages(update) { env.images = update(env.images); },
    URL: { revokeObjectURL() {} },
    syncProductVariants: async () => {},
  };
  return env;
}

test('retry after a later save failure reuses product ID and skips uploaded images', async () => {
  const env = saveEnv();
  env.syncProductVariants = async () => { throw new Error('Variant save failed'); };
  const save = editorHandler('persistProduct', env);
  await assert.rejects(save('active'), /Variant save failed/);
  assert.equal(env.images[0].file, undefined);
  assert.equal(env.images[0].backendImageId, '10');
  assert.equal(env.url, '/admin/products/edit?id=123');
  env.syncProductVariants = async () => {};
  await save('active');
  assert.equal(env.creates, 1);
  assert.equal(env.updates, 1);
  assert.equal(env.uploads, 1);
});

test('uncertain upload retains saved product ID and blocks blind retries', async () => {
  const env = saveEnv();
  env.uploadAdminProductImages = async () => { throw new Error('Connection lost'); };
  await assert.rejects(editorHandler('persistProduct', env)('active'), /Product 123 was saved.*Reload/);
  assert.equal(env.editId, '123');
  assert.equal(env.uncertainImageUpload.current, true);
  env.name = 'Test';
  assert.match(editorHandler('validateBasics', env)(), /Reload this product/);
});

test('partial multi-file success clears only the completed file', async () => {
  const env = saveEnv();
  env.images.push({ key: 'second', file: file('second.png'), src: 'blob:second' });
  const upload = env.uploadAdminProductImages;
  env.uploadAdminProductImages = async () => {
    if (env.uploads > 0) throw new Error('Second upload failed');
    await upload();
  };
  await assert.rejects(editorHandler('persistProduct', env)('active'), /Second upload failed/);
  assert.equal(env.images[0].file, undefined);
  assert.ok(env.images[1].file);
});

test('product saves exclude the rejected legacy fields', async () => {
  const bodies = [];
  const api = loadService(async (_url, options = {}) => {
    if (options.body) bodies.push(JSON.parse(options.body));
    return { data: { product_id: 123 } };
  });
  const payload = { product_name: 'Test', prescription_required: true, age_group: 'adult', category_id: 1, category_ids: [1] };
  await api.createAdminProduct(payload);
  await api.updateAdminProduct(123, payload);
  for (const body of bodies) {
    for (const field of ['prescription_required', 'age_group', 'category_id']) {
      assert.equal(Object.hasOwn(body, field), false);
    }
    assert.deepEqual(body.category_ids, [1]);
  }
});

function variantEnv() {
  const env = {
    productType: 'VARIABLE', terms: [], initialVariantIds: [], sku: 'TEST', productCode: '', name: 'Test', regular: '100', mergeVariantAttributes,
    getAllAdminVariantAttributes: async () => [], createAdminVariantAttribute: async () => {},
    updateAdminVariantAttribute: async () => {},
    num: (value) => value?.trim() ? Number(value) : null,
    setInitialVariantIds(update) { env.initialVariantIds = update(env.initialVariantIds); },
    patchTerm(key, patch) { env.terms = env.terms.map((term) => term.key === key ? { ...term, ...patch } : term); },
  };
  return env;
}

test('variant deletion failure stops save instead of reporting success', async () => {
  const env = variantEnv();
  env.initialVariantIds = [1];
  env.deleteAdminProductVariant = async () => { throw new Error('Deletion blocked'); };
  await assert.rejects(editorHandler('syncProductVariants', env)(123), /Deletion blocked/);
  assert.deepEqual(env.initialVariantIds, [1]);
});

test('variant save retries update variants already created before a later failure', async () => {
  const env = variantEnv();
  const term = (key) => ({ key, name: key, sku: '', variantName: '', unitCount: '', barcode: '', weightGrams: '', regularPrice: '', salePrice: '', stockQuantity: '' });
  env.terms = [term('first'), term('second')];
  let creates = 0;
  let updates = 0;
  let fail = true;
  env.createAdminProductVariant = async () => {
    creates++;
    if (creates === 2 && fail) throw new Error('Second variant failed');
    return { id: creates };
  };
  env.updateAdminProductVariant = async () => { updates++; };
  const sync = editorHandler('syncProductVariants', env);
  await assert.rejects(sync(123), /Second variant failed/);
  assert.equal(env.terms[0].backendVariantId, 1);
  fail = false;
  await sync(123);
  assert.equal(updates, 1);
  assert.equal(creates, 3);
});

test('saving an existing size and colour combination retains every attribute', async () => {
  const env = variantEnv();
  env.initialVariantIds = ['1'];
  env.terms = [{ key: 'saved', backendVariantId: 1, name: 'L', variantTypeName: 'size', attributes: { size: 'M', Colour: 'Blue' }, sku: 'TEST', variantName: '', unitCount: '', barcode: '', weightGrams: '', regularPrice: '100', salePrice: '', stockQuantity: '2' }];
  let saved;
  env.updateAdminProductVariant = async (_product, _variant, payload) => { saved = payload; };
  await editorHandler('syncProductVariants', env)(123);
  assert.deepEqual(saved.attributes, { size: 'L', Colour: 'Blue' });
});

test('all attributes are registered before a combination is saved', async () => {
  const env = variantEnv();
  env.terms = [{ key: 'saved', backendVariantId: 1, name: 'L', variantTypeName: 'Size', attributes: { Size: 'M', Colour: 'Blue' }, sku: 'TEST', variantName: '', unitCount: '', barcode: '', weightGrams: '', regularPrice: '100', salePrice: '', stockQuantity: '2' }];
  const registered = [];
  env.createAdminVariantAttribute = async (payload) => { registered.push(payload); };
  env.updateAdminProductVariant = async () => {
    assert.deepEqual(registered, [{ name: 'Size', values: ['L'] }, { name: 'Colour', values: ['Blue'] }]);
  };
  await editorHandler('syncProductVariants', env)(123);
});

test('failed attribute registration stops the save before variant writes', async () => {
  const env = variantEnv();
  env.terms = [{ name: 'L', variantTypeName: 'Size' }];
  env.createAdminVariantAttribute = async () => { throw new Error('Attribute save failed'); };
  await assert.rejects(editorHandler('syncProductVariants', env)(123), /Attribute save failed/);
});

test('case-distinct attribute names and options remain distinct during definition syncing', async () => {
  const env = variantEnv();
  const base = { backendVariantId: 1, sku: 'TEST', variantName: '', unitCount: '', barcode: '', weightGrams: '', regularPrice: '100', salePrice: '', stockQuantity: '2' };
  env.terms = [
    { ...base, key: 'a', name: 'Blue', variantTypeName: 'Colour', attributes: { Colour: 'Blue', colour: 'blue' } },
    { ...base, backendVariantId: 2, key: 'b', name: 'blue', variantTypeName: 'Colour', attributes: { Colour: 'blue' } },
  ];
  env.getAllAdminVariantAttributes = async () => [{ id: 'upper', name: 'Colour', values: ['Red', 'Blue'] }, { id: 'lower', name: 'colour', values: ['red'] }];
  const definitions = [];
  env.updateAdminVariantAttribute = async (id, payload) => { definitions.push({ id, ...payload }); };
  const saved = [];
  env.updateAdminProductVariant = async (_product, _id, payload) => { saved.push(payload.attributes); };
  await editorHandler('syncProductVariants', env)(123);
  assert.deepEqual(definitions, [
    { id: 'upper', name: 'Colour', values: ['Red', 'Blue', 'blue'] },
    { id: 'lower', name: 'colour', values: ['red', 'blue'] },
  ]);
  assert.deepEqual(saved, [{ Colour: 'Blue', colour: 'blue' }, { Colour: 'blue' }]);
});

test('loading saved variants keeps case-distinct attribute types and options separate', async () => {
  const variants = [
    { id: 1, attributes: { Size: 'Blue', size: 'blue' } },
    { id: 2, attributes: { Size: 'blue' } },
    { id: 3, attributes: { size: 'blue' } },
  ];
  const state = {};
  const env = new Proxy({
    getAdminProductById: async () => ({ product_name: 'Test', slug: 'test', product_type: 'variable' }),
    getAdminProductImages: async () => [],
    getAllAdminProductVariants: async () => variants,
    getAllAdminVariantAttributes: async () => [{ id: 10, name: 'Size', values: ['Blue'] }, { id: 11, name: 'size', values: ['blue'] }],
    setVariantTypesList: (value) => { state.types = value; },
    setTerms: (value) => { state.terms = value; },
    setError: (value) => { state.error = value; },
  }, {
    has: (target, key) => key in target || typeof key === 'string' && key.startsWith('set'),
    get: (target, key) => key in target ? target[key] : typeof key === 'string' && key.startsWith('set') ? () => {} : undefined,
  });
  await editorHandler('loadProduct', env)('123');
  assert.equal(state.error, undefined);
  assert.deepEqual(state.types.map((type) => ({ name: type.name, options: type.terms.map((term) => term.name) })), [
    { name: 'Size', options: ['Blue', 'blue'] }, { name: 'size', options: ['blue'] },
  ]);
  assert.deepEqual(state.terms.map((term) => term.variantTypeName), ['Size', 'Size', 'size']);
  assert.deepEqual(state.terms[0].attributes, { Size: 'Blue', size: 'blue' });
});

test('products with 7–10 saved images can be saved and replaced but cannot gain images', async () => {
  for (const count of [7, 8, 10]) {
    const env = saveEnv();
    env.editId = '123';
    env.name = 'Existing product';
    env.images = Array.from({ length: count }, (_, id) => ({ key: String(id), backendImageId: String(id), src: `https://example.com/${id}.png` }));
    assert.equal(editorHandler('validateBasics', { ...env, validateProductImages })(), '');
    await editorHandler('persistProduct', env)('active');
    assert.equal(env.updates, 1);
    assert.equal(env.uploads, 0);
    assert.equal(env.images.length, count);
    assert.equal(validateProductImages([file()], count - 1, 0, 'replace'), '');
    assert.match(validateProductImages([file()], count), /maximum of 6/);
  }
});

test('oversized product metadata is rejected before any variant deletion or product write', async () => {
  const env = saveEnv();
  env.editId = '123';
  env.buildApiPayload = () => ({ product_name: 'Test', product_type: 'simple', description: 'x'.repeat(16 * 1024) });
  let deletions = 0;
  env.removeAllBackendVariantsBeforeSimple = async () => { deletions++; };
  await assert.rejects(editorHandler('persistProduct', env)('active'), /16 KiB/);
  assert.equal(deletions, 0);
  assert.equal(env.updates, 0);
  assert.equal(env.creates, 0);
  assert.equal(env.uploads, 0);
});

function editorInputHandler(id, env) {
  let expression;
  function visit(node) {
    if (ts.isJsxSelfClosingElement(node)) {
      const attributes = node.attributes.properties;
      const inputId = attributes.find((attribute) => attribute.name?.text === 'id');
      if (inputId?.initializer && ts.isStringLiteral(inputId.initializer) && inputId.initializer.text === id) {
        expression = attributes.find((attribute) => attribute.name?.text === 'onChange').initializer.expression;
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(ast);
  assert.ok(expression, `Input ${id} has a change handler`);
  const js = ts.transpileModule(`const handler = ${expression.getText(ast)};`, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText;
  return new Function('env', `with (env) { ${js}; return handler; }`)(env);
}

function pricingEnv() {
  const env = Object.fromEntries([
    'categoryId', 'subCategoryId', 'brand', 'description', 'shortDescription', 'keywordsText', 'unitCount', 'slug', 'productCode', 'sku',
    'specialDiscountPercent', 'festivalOfferPercent', 'stock', 'minQty', 'maxQty', 'targetAudience', 'hsnCode', 'gstRate', 'weight',
    'packageLength', 'packageBreadth', 'packageHeight', 'material', 'colour', 'packageType', 'shelfLife', 'waterResistant',
    'hazardousClause', 'manufacturedIn', 'companyName', 'companyAddress', 'packerName', 'packerAddress',
  ].map((name) => [name, '']));
  Object.assign(env, {
    name: 'Test', regular: '100', sale: '80', offer: '20', pricingMode: 'percent', productType: 'SIMPLE', images: [], terms: [], details: [],
    specialDiscountEnabled: false, festivalOfferEnabled: false, sameAsManufacturer: false, weightUnit: 'g', dimensionUnit: 'cm',
    generateProductSlug: loadService(() => {}).generateProductSlug,
    setPricingMode(value) { env.pricingMode = value; }, setRegular(value) { env.regular = value; },
    setSale(value) { env.sale = value; }, setOffer(value) { env.offer = value; },
  });
  env.num = editorHandler('num', env);
  env.salePriceFrom = editorHandler('salePriceFrom', env);
  env.offerPercentFrom = editorHandler('offerPercentFrom', env);
  return env;
}

test('manual sale entry clears backend offer percentage and survives an MRP change', () => {
  const env = pricingEnv();
  editorInputHandler('sale-price', env)({ target: { value: '83.37' } });
  assert.equal(env.pricingMode, 'manual');
  editorInputHandler('regular-price', env)({ target: { value: '200' } });
  const payload = editorHandler('buildApiPayload', env)('active');
  assert.equal(payload.sale_price, 83.37);
  assert.equal(payload.regular_price, 200);
  assert.equal(payload.offer_percent, null);
});

test('percentage entry switches back to calculated pricing, including a 100% offer', () => {
  const env = pricingEnv();
  editorInputHandler('sale-price', env)({ target: { value: '83.37' } });
  editorInputHandler('offer-percent', env)({ target: { value: '25' } });
  editorInputHandler('regular-price', env)({ target: { value: '200' } });
  let payload = editorHandler('buildApiPayload', env)('active');
  assert.equal(payload.offer_percent, 25);
  assert.equal(payload.sale_price, 150);
  editorInputHandler('offer-percent', env)({ target: { value: '100' } });
  payload = editorHandler('buildApiPayload', env)('active');
  assert.equal(payload.offer_percent, 100);
  assert.equal(payload.sale_price, 0);
});
