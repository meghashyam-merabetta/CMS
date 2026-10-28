# Product corrections and backend contract

Implemented locally on 28 October 2026. These changes are not deployed.

## Frontend alignment after the two backend reviews

- Attribute names and option values now match case-sensitively throughout editor loading, option discovery, definition syncing, labels and full-object variant PATCHes. Definition updates preserve existing options.
- Manual sale-price entry sends `offer_percent: null`; changing MRP preserves that manually entered sale price. Editing the percentage switches back to calculated pricing. Variant price editing also tracks whether the sale price or percentage was entered.
- Existing products with 7–10 saved images may be saved, replaced or deleted from without hiding or discarding images. New additions remain subject to the six-image UI policy. Each file must be at most 5 MiB; the 10 MiB selection check counts pending files rather than saved files.
- JSON requests are checked against 16 KiB in encoded UTF-8 bytes before fetch. Product metadata is checked before variant cleanup. Multipart image requests bypass the JSON limit; server 413 responses without JSON have a useful error message.
- Automated client checks cover same-origin browser request paths, cookie inclusion, JSON headers, multipart boundaries and 204 handling. They do not establish real proxy forwarding or authenticated backend integration.

The remaining integration checks require disposable staging records and authenticated access: login/me/logout through the proxy, actual Cookie/Set-Cookie/Origin forwarding, production HTTPS cookies, brand/product CRUD, sorting/category assignments, variant combinations, image operations and controlled failure recovery. For the default frontend development command, configure the backend's `ALLOWED_ORIGINS` with the actual browser origin (typically `http://localhost:5173`); do not copy example ports blindly. Root-category descendant inclusion remains a product/backend decision. Additional Product Details has been restored at the user’s request; backend persistence for its new fields is not yet verified.

## Frontend changes

- Complete pagination for brands, categories and variant attributes, with errors for incomplete or repeated pages. Product search no longer stops at 500 records.
- Root selection controls category expansion, including while searching. The root's View Items action also expands that root.
- Product name/code/ID sorting, ascending or descending, with page reset and server query parameters.
- Product rows show variant sizes and other attributes. Missing thumbnails/variant summaries are fetched for the visible page; failures have a retry message.
- Image aliases are normalized across listing, gallery and editor. Saved image/variant loading errors are visible and prevent saving incomplete editor state.
- Multi-attribute variants retain all attributes and their original key casing. Other attributes can be edited in Terms; combination labels distinguish options with the same size.
- Earlier image limit/deletion/retry fixes remain in place. Additional Product Details and its 43 optional fields are restored with controls, validation, saved-value loading, preview, and whitelisted save mappings.

## Restored frontend fields — backend contract required

The user has requested restoration of this section. The table below is now implemented in the frontend. The backend is outside this repository; its latest inspected schema did not support these new keys. Backend validators, database storage and response serialization must support them before populated additional details can be saved successfully.

Blank additional fields are omitted. Entered values are sent to POST/PATCH product endpoints; clearing a previously saved value sends null, and No sends false. Existing supported specification fields remain available. The 16 KiB preflight check includes these additional fields. An API rejection leaves the entered values in the form; there is no silent fallback that discards additional details.

| API key | Form label | Type |
| --- | --- | --- |
| `manufacturer_sku` | Manufacturer SKU | string, nullable |
| `brand_type` | Brand Classification | company / generic, nullable |
| `is_customisable` | Customisable | boolean, nullable |
| `model_number` | Model Number | string, nullable |
| `manufacturer_contact_name` | Manufacturer Contact Person | string, nullable |
| `manufacturer_phone` | Manufacturer Phone | string, nullable |
| `manufacturer_email` | Manufacturer Email | string, nullable |
| `license_number` | Manufacturer Licence Number | string, nullable |
| `repacker_name` | Repacker Name | string, nullable |
| `repacker_address` | Repacker Address | string, nullable |
| `age_min` | Minimum Age | integer >= 0, nullable |
| `age_max` | Maximum Age | integer >= 0, nullable |
| `age_unit` | Age Unit | years / months, nullable |
| `audience_age_group` | Age Classification | infants / children / young people / adults / seniors / all ages, nullable |
| `product_uses` | Uses of Product | string, nullable |
| `special_instructions` | Special Instructions | string, nullable |
| `material_composition` | Material / Composition Details | string, nullable |
| `material_type` | Material Type / Heat, Water or Gas Application | string, nullable |
| `resistance_level` | Resistance Level / Rating | string, nullable |
| `heat_resistant` | Heat Resistant | boolean, nullable |
| `gas_resistant` | Gas Resistant | boolean, nullable |
| `physical_state` | Physical State | solid / liquid / gas, nullable |
| `pattern` | Product Pattern | string, nullable |
| `reusable` | Reusable | boolean, nullable |
| `hazard_classification` | Hazard Classification | string, nullable |
| `net_weight` | Product Net Weight (without packaging) | number >= 0, nullable |
| `net_weight_unit` | Product Weight Unit | g / kg, nullable |
| `product_length` | Actual Product Length | number >= 0, nullable |
| `product_breadth` | Actual Product Breadth | number >= 0, nullable |
| `product_height` | Actual Product Height | number >= 0, nullable |
| `product_dimension_unit` | Actual Dimension Unit | cm / mm / in, nullable |
| `manufacturing_date` | Manufacturing Date | YYYY-MM-DD, nullable |
| `fulfillment_channel` | Fulfillment Channel | merabetta / self, nullable |
| `seller_handling_days` | Seller Handling Time (days) | integer >= 0, nullable |
| `business_offer_percent` | Business Offer (%) | number >= 0, <= 100, nullable |
| `sale_start_date` | Sale Starts | YYYY-MM-DD, nullable |
| `sale_end_date` | Sale Ends | YYYY-MM-DD, nullable |
| `shipping_template` | Shipping Template Name / ID | string, nullable |
| `seller_pincodes` | Self Delivery PIN Codes (comma separated) | string[] (six-digit PIN codes), nullable |
| `accessories` | Accessories Included | string, nullable |
| `battery_required` | Battery Required | boolean, nullable |
| `battery_consumption` | Battery / Power Consumption | string, nullable |
| `cosmetic_features` | Cosmetic Features | string, nullable |

Validate numeric bounds, age ranges/units, product dimension and weight units, chronological sale dates, email and PIN codes on the server as well as in the UI. Preserve existing values for omitted PATCH fields.

Sale schedules, business discounts and fulfillment/shipping fields require actual backend pricing/logistics behavior; accepting their values alone does not implement those rules. The shipping template is currently a name/ID input, pending a template-list API and verified identifiers.

The backend should honor sort_by=product_id|product_name|product_code and sort_order=asc|desc across the entire filtered catalog. Offset lists must expose total/hasMore when truncating a page.

Image reads must provide IDs and accessible URLs (image_url, url and imageUrl are normalized). Verify storage permissions/URL expiry, transactional deletion or retryable storage cleanup, atomic count/size limits, and idempotency for ambiguous create/upload results. Live brand CRUD/authentication and product deletion still need authenticated verification.

Existing short description and bullet editing continue to share the existing description model; a separate persisted bullet array would require an additional backend contract. Existing generic SKU, package dimensions/weight, packer details, HSN/GST, material/colour, water resistance, shelf life, keywords, stock/order quantities and discounts remain available.

## Verification

Run npm test for pagination, image aliases/deletion/retries, sorting, attribute preservation, additional-field round trips, validation and rendered controls. Run npm run build -- --webpack for the production build. No live records were mutated during implementation checks.
