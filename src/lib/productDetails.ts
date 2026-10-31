export interface ProductDetailField {
  key: string;
  label: string;
  group: string;
  type?: 'text' | 'number' | 'date' | 'email' | 'tel' | 'textarea' | 'select';
  options?: readonly string[];
  min?: number;
  max?: number;
  step?: string;
}

export const PRODUCT_DETAIL_FIELDS = [
  {"key": "manufacturer_sku", "label": "Manufacturer SKU", "group": "Product identity"},
  {"key": "brand_type", "label": "Brand Classification", "group": "Product identity", "type": "select", "options": ["company", "generic"]},
  {"key": "is_customisable", "label": "Customisable", "group": "Product identity", "type": "select", "options": ["true", "false"]},
  {"key": "model_number", "label": "Model Number", "group": "Product identity"},
  {"key": "manufacturer_contact_name", "label": "Manufacturer Contact Person", "group": "Manufacturer & repacker"},
  {"key": "manufacturer_phone", "label": "Manufacturer Phone", "group": "Manufacturer & repacker", "type": "tel"},
  {"key": "manufacturer_email", "label": "Manufacturer Email", "group": "Manufacturer & repacker", "type": "email"},
  {"key": "license_number", "label": "Manufacturer Licence Number", "group": "Manufacturer & repacker"},
  {"key": "repacker_name", "label": "Repacker Name", "group": "Manufacturer & repacker"},
  {"key": "repacker_address", "label": "Repacker Address", "group": "Manufacturer & repacker", "type": "textarea"},
  {"key": "age_min", "label": "Minimum Age", "group": "Audience & use", "type": "number", "min": 0, "step": "1"},
  {"key": "age_max", "label": "Maximum Age", "group": "Audience & use", "type": "number", "min": 0, "step": "1"},
  {"key": "age_unit", "label": "Age Unit", "group": "Audience & use", "type": "select", "options": ["years", "months"]},
  {"key": "audience_age_group", "label": "Age Classification", "group": "Audience & use", "type": "select", "options": ["infants", "children", "young people", "adults", "seniors", "all ages"]},
  {"key": "product_uses", "label": "Uses of Product", "group": "Audience & use", "type": "textarea"},
  {"key": "special_instructions", "label": "Special Instructions", "group": "Audience & use", "type": "textarea"},
  {"key": "material_composition", "label": "Material / Composition Details", "group": "Material & safety", "type": "textarea"},
  {"key": "material_type", "label": "Material Type / Heat, Water or Gas Application", "group": "Material & safety"},
  {"key": "resistance_level", "label": "Resistance Level / Rating", "group": "Material & safety"},
  {"key": "heat_resistant", "label": "Heat Resistant", "group": "Material & safety", "type": "select", "options": ["true", "false"]},
  {"key": "gas_resistant", "label": "Gas Resistant", "group": "Material & safety", "type": "select", "options": ["true", "false"]},
  {"key": "physical_state", "label": "Physical State", "group": "Material & safety", "type": "select", "options": ["solid", "liquid", "gas"]},
  {"key": "pattern", "label": "Product Pattern", "group": "Material & safety"},
  {"key": "reusable", "label": "Reusable", "group": "Material & safety", "type": "select", "options": ["true", "false"]},
  {"key": "hazard_classification", "label": "Hazard Classification", "group": "Material & safety"},
  {"key": "net_weight", "label": "Product Net Weight (without packaging)", "group": "Product dimensions & dates", "type": "number", "min": 0, "step": "0.001"},
  {"key": "net_weight_unit", "label": "Product Weight Unit", "group": "Product dimensions & dates", "type": "select", "options": ["g", "kg"]},
  {"key": "product_length", "label": "Actual Product Length", "group": "Product dimensions & dates", "type": "number", "min": 0, "step": "0.01"},
  {"key": "product_breadth", "label": "Actual Product Breadth", "group": "Product dimensions & dates", "type": "number", "min": 0, "step": "0.01"},
  {"key": "product_height", "label": "Actual Product Height", "group": "Product dimensions & dates", "type": "number", "min": 0, "step": "0.01"},
  {"key": "product_dimension_unit", "label": "Actual Dimension Unit", "group": "Product dimensions & dates", "type": "select", "options": ["cm", "mm", "in"]},
  {"key": "manufacturing_date", "label": "Manufacturing Date", "group": "Product dimensions & dates", "type": "date"},
  {"key": "fulfillment_channel", "label": "Fulfillment Channel", "group": "Sales & delivery", "type": "select", "options": ["merabetta", "self"]},
  {"key": "seller_handling_days", "label": "Seller Handling Time (days)", "group": "Sales & delivery", "type": "number", "min": 0, "step": "1"},
  {"key": "business_offer_percent", "label": "Business Offer (%)", "group": "Sales & delivery", "type": "number", "min": 0, "step": "0.01", "max": 100},
  {"key": "sale_start_date", "label": "Sale Starts", "group": "Sales & delivery", "type": "date"},
  {"key": "sale_end_date", "label": "Sale Ends", "group": "Sales & delivery", "type": "date"},
  {"key": "shipping_template", "label": "Shipping Template Name / ID", "group": "Sales & delivery"},
  {"key": "seller_pincodes", "label": "Self Delivery PIN Codes (comma separated)", "group": "Sales & delivery", "type": "textarea"},
  {"key": "accessories", "label": "Accessories Included", "group": "Accessories & features", "type": "textarea"},
  {"key": "battery_required", "label": "Battery Required", "group": "Accessories & features", "type": "select", "options": ["true", "false"]},
  {"key": "battery_consumption", "label": "Battery / Power Consumption", "group": "Accessories & features"},
  {"key": "cosmetic_features", "label": "Cosmetic Features", "group": "Accessories & features", "type": "textarea"}
] as const satisfies readonly ProductDetailField[];

export type ProductDetailKey = typeof PRODUCT_DETAIL_FIELDS[number]['key'];
export type AdditionalProductDetails = Partial<Record<ProductDetailKey, string | number | boolean | string[] | null>>;
export type ProductDetailValues = Partial<Record<ProductDetailKey, string>>;

export function readProductDetails(product: AdditionalProductDetails): ProductDetailValues {
  return Object.fromEntries(PRODUCT_DETAIL_FIELDS.map(({ key }) => {
    const value = product[key];
    return [key, Array.isArray(value) ? value.join(', ') : value == null ? '' : String(value).slice(0, key.endsWith('_date') ? 10 : undefined)];
  }));
}

export function serializeProductDetails(values: ProductDetailValues, initial: ProductDetailValues = {}): AdditionalProductDetails {
  const result: AdditionalProductDetails = {};
  for (const field of PRODUCT_DETAIL_FIELDS as readonly (ProductDetailField & { key: ProductDetailKey })[]) {
    const value = values[field.key]?.trim() || '';
    if (!value && !initial[field.key]) continue;
    if (!value) result[field.key] = null;
    else if (field.key === 'seller_pincodes') result[field.key] = [...new Set(value.split(/[\s,]+/).filter(Boolean))];
    else if (field.type === 'number') result[field.key] = Number(value);
    else if (field.options?.includes('true')) result[field.key] = value === 'true';
    else result[field.key] = value;
  }
  return result;
}

export function validateProductDetails(values: ProductDetailValues): string {
  for (const field of PRODUCT_DETAIL_FIELDS as readonly (ProductDetailField & { key: ProductDetailKey })[]) {
    const value = values[field.key]?.trim();
    if (!value) continue;
    if (field.type === 'number' && (!Number.isFinite(Number(value)) || Number(value) < (field.min ?? 0) || Number(value) > (field.max ?? Infinity) || (field.step === '1' && !Number.isInteger(Number(value))))) {
      return `${field.label} must be a valid ${field.step === '1' ? 'whole ' : ''}number${field.max != null ? ` between ${field.min ?? 0} and ${field.max}` : ` of at least ${field.min ?? 0}`}.`;
    }
    if (field.options && !field.options.includes(value)) return `Select a valid ${field.label.toLowerCase()}.`;
    if (field.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Enter a valid manufacturer email address.';
    if (field.type === 'date' && (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value)) return `Enter a valid ${field.label.toLowerCase()} date.`;
  }
  if (values.age_min && values.age_max && Number(values.age_min) > Number(values.age_max)) return 'Minimum age cannot exceed maximum age.';
  if ((values.age_min || values.age_max) && !values.age_unit) return 'Select an age unit.';
  if (values.net_weight && !values.net_weight_unit) return 'Select a product weight unit.';
  if ((values.product_length || values.product_breadth || values.product_height) && !values.product_dimension_unit) return 'Select an actual product dimension unit.';
  if (values.sale_start_date && values.sale_end_date && values.sale_start_date > values.sale_end_date) return 'Sale end date cannot be before the start date.';
  if (values.seller_pincodes && values.seller_pincodes.trim().split(/[\s,]+/).some((pin) => !/^[1-9]\d{5}$/.test(pin))) return 'Enter valid six-digit delivery PIN codes.';
  return '';
}

/**
 * Generates Manufacturer SKU following the formula:
 * MB-[COMPANY-FIRST-LAST]-[VARIANT-INDEX]
 * E.g. Company "ARREX", index 1 -> "MB-AX-001"
 * E.g. Company "Sun Pharma", index 2 -> "MB-SA-002"
 */
export function generateManufacturerSku(
  companyOrBrand?: string | null,
  variantIndex: number = 1
): string {
  const companyClean = (companyOrBrand || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');

  let companyCode = 'XX';
  if (companyClean.length >= 2) {
    companyCode = `${companyClean[0]}${companyClean[companyClean.length - 1]}`;
  } else if (companyClean.length === 1) {
    companyCode = `${companyClean[0]}X`;
  }

  const paddedIndex = String(Math.max(1, Math.floor(variantIndex))).padStart(3, '0');
  return `MB-${companyCode}-${paddedIndex}`;
}

/**
 * Generates Model Number following the formula (Option A):
 * MD-[CAT-CODE]-[PRODUCT-ID]
 * E.g. Category "Wheelchairs", Product ID 998844 -> "MD-WHE-998844"
 * If no Product ID is assigned yet (new product), uses a random 4-digit number e.g. "MD-WHE-4821"
 */
export function generateModelNumber(
  categoryName?: string | null,
  productId?: string | number | null
): string {
  const catClean = (categoryName || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');

  const catCode = (catClean.slice(0, 3) || 'GEN').padEnd(3, 'X');

  let idPart = '';
  if (productId != null && String(productId).trim() !== '' && !isNaN(Number(productId))) {
    idPart = String(productId).trim();
  } else {
    idPart = String(Math.floor(1000 + Math.random() * 9000));
  }

  return `MD-${catCode}-${idPart}`;
}
