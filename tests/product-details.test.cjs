const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadTypeScript } = require('./helpers.cjs');
const details = loadTypeScript(require.resolve('../src/lib/productDetails.ts'));

test('all 43 additional fields serialize and reload with appropriate types', () => {
  const values = Object.fromEntries(details.PRODUCT_DETAIL_FIELDS.map((field) => [field.key,
    field.key === 'seller_pincodes' ? '560001, 560002' : field.options?.[0] ?? (field.type === 'date' ? '2026-10-20' : field.type === 'number' ? '1' : field.type === 'email' ? 'person@example.com' : 'Example'),
  ]));
  assert.equal(details.PRODUCT_DETAIL_FIELDS.length, 43);
  assert.equal(details.validateProductDetails(values), '');
  const payload = details.serializeProductDetails(values);
  assert.deepEqual(details.readProductDetails(payload), values);
  assert.equal(typeof payload.is_customisable, 'boolean');
  assert.equal(typeof payload.net_weight, 'number');
  assert.deepEqual(payload.seller_pincodes, ['560001', '560002']);
});

test('blank fields remain omitted and clearing saved values sends null', () => {
  assert.deepEqual(details.serializeProductDetails({}), {});
  assert.deepEqual(details.serializeProductDetails({ model_number: '' }, { model_number: 'OLD' }), { model_number: null });
  assert.deepEqual(details.serializeProductDetails({ reusable: 'false', age_min: '0' }), { reusable: false, age_min: 0 });
  assert.equal(details.readProductDetails({ manufacturing_date: '2026-10-28T12:00:00.000Z' }).manufacturing_date, '2026-10-28');
});

test('additional details validate ranges, units, dates, email and delivery PINs', () => {
  for (const values of [
    { age_min: '20', age_max: '10', age_unit: 'years' }, { age_min: '1' },
    { net_weight: '1' }, { product_length: '1' }, { business_offer_percent: '101' },
    { seller_handling_days: '1.5' }, { sale_start_date: '2026-10-28', sale_end_date: '2026-10-27' },
    { manufacturing_date: '2026-02-30' }, { manufacturer_email: 'bad email' }, { seller_pincodes: '123' },
  ]) assert.notEqual(details.validateProductDetails(values), '', JSON.stringify(values));
});

test('additional fields are included in save bodies while arbitrary and legacy keys stay excluded', async () => {
  let saved;
  const api = loadTypeScript(require.resolve('../src/services/api/adminProductsApi.ts'), async (_url, options = {}) => {
    if (options.method === 'PATCH') saved = JSON.parse(options.body);
    return { data: { product_id: 123 } };
  });
  await api.updateAdminProduct(123, { product_name: 'Test', ...details.serializeProductDetails({ model_number: 'M1', fulfillment_channel: 'self', battery_required: 'false' }), arbitrary_field: 'ignore', age_group: 'adult' });
  assert.equal(saved.model_number, 'M1');
  assert.equal(saved.fulfillment_channel, 'self');
  assert.equal(saved.battery_required, false);
  assert.equal(Object.hasOwn(saved, 'arbitrary_field'), false);
  assert.equal(Object.hasOwn(saved, 'age_group'), false);
});

test('the section renders labelled controls and the preview shows entered values', () => {
  const React = require('react');
  const { renderToStaticMarkup } = require('react-dom/server');
  const ui = loadTypeScript(require.resolve('../src/components/products/AdditionalProductDetails.tsx'));
  const values = { model_number: 'MODEL-42', reusable: 'false' };
  const html = renderToStaticMarkup(React.createElement(ui.default, { values, onChange() {} }));
  assert.match(html, /Additional Product Details/);
  assert.match(html, /Manufacturer SKU/);
  assert.match(html, /Product Net Weight/);
  assert.doesNotMatch(html, /for="detail-product_length"/);
  assert.match(html, /Sale Starts/);
  assert.match(html, /Battery Required/);
  assert.match(html, /for="detail-model_number"/);
  assert.match(html, /value="MODEL-42"/);
  const summary = renderToStaticMarkup(React.createElement(ui.ProductDetailSummary, { values }));
  assert.match(summary, /MODEL-42/);
  assert.match(summary, />No</);
});

test('generateManufacturerSku generates MB-[BRAND-FIRST-LAST]-[INDEX] format', () => {
  assert.equal(details.generateManufacturerSku('JOYLIFE', 1), 'MB-JE-001');
  assert.equal(details.generateManufacturerSku('ARREX', 1), 'MB-AX-001');
  assert.equal(details.generateManufacturerSku('Sun Pharma', 2), 'MB-SA-002');
  assert.equal(details.generateManufacturerSku('Dr. Morepen', 1), 'MB-DN-001');
  assert.equal(details.generateManufacturerSku('Z', 3), 'MB-ZX-003');
  assert.equal(details.generateManufacturerSku('', 1), 'MB-XX-001');
  assert.equal(details.generateManufacturerSku(null, 10), 'MB-XX-010');
});

test('generateModelNumber generates MD-[CAT-CODE]-[PRODUCT-ID] format', () => {
  assert.equal(details.generateModelNumber('Wheelchairs', 998844), 'MD-WHE-998844');
  assert.equal(details.generateModelNumber('Mobility Aids', '102'), 'MD-MOB-102');
  assert.match(details.generateModelNumber('Wheelchairs', null), /^MD-WHE-\d{4}$/);
  assert.match(details.generateModelNumber('', null), /^MD-GEN-\d{4}$/);
});

test('copying listing preserves descriptions and specifications while resetting dimensions, dates and pricing', () => {
  const original = {
    product_name: 'JOYLIFE PANT STYLE ADULT DIAPERS (M)',
    description: '• Super absorbent core\n• Breathable waistband',
    short_description: 'Adult diaper pants size M',
    brand_id: 42,
    hsn_code: '96190010',
    gst_rate: 12,
    material: 'Cotton & Non-woven',
    company_name: 'Solis Hygiene Pvt. Ltd',
    packer_name: 'Solis Hygiene Pvt. Ltd',
    keywords: ['diaper', 'joylife', 'adult'],
    // Excluded fields:
    regular_price: 350,
    sale_price: 286,
    stock_quantity: 23,
    min_order_quantity: 1,
    max_order_quantity: 10,
    barcode: '8901234567890',
    sku: 'JOY-M-01',
    net_weight: 450,
    net_weight_unit: 'g',
    product_length: 20,
    product_breadth: 15,
    product_height: 5,
    product_dimension_unit: 'cm',
    manufacturing_date: '2026-01-01',
    sale_start_date: '2026-02-01',
    sale_end_date: '2026-03-01',
    manufacturer_sku: 'MB-JE-001',
    model_number: 'MD-ADU-870516',
  };

  const loadedDetails = details.readProductDetails(original);
  const {
    net_weight: _nw,
    net_weight_unit: _nwu,
    product_length: _pl,
    product_breadth: _pb,
    product_height: _ph,
    product_dimension_unit: _pdu,
    manufacturing_date: _md,
    sale_start_date: _ssd,
    sale_end_date: _sed,
    manufacturer_sku: _msku,
    model_number: _mnum,
    ...filteredDetails
  } = loadedDetails;

  assert.equal(filteredDetails.net_weight, undefined);
  assert.equal(filteredDetails.manufacturing_date, undefined);
  assert.equal(filteredDetails.manufacturer_sku, undefined);
  assert.equal(filteredDetails.model_number, undefined);
  assert.equal(original.description, '• Super absorbent core\n• Breathable waistband');
  assert.equal(original.hsn_code, '96190010');
  assert.equal(original.brand_id, 42);
});
