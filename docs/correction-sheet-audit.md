# Correction sheet audit — 28 October 2026

Implementation update: this document records the findings before the latest fixes. See [Product corrections and backend contract](product-corrections-backend-contract.md) for the implemented fixes, deferred additional-field proposal and remaining backend requirements. Additional Product Details has been removed pending confirmation.

Scope: the five supplied screenshots, compared against the current local source, including the earlier local fixes. This is an implementation audit with mocked API checks, not authenticated browser or live CRUD verification. No application code was changed during this audit.

“Present” means an editor control and request mapping exist. It does not prove the backend accepts, persists, or returns that field. “Missing” means absent from this frontend's editor/request mapping; the backend schema is not available in this repository.

## Correction sheet

| Requested correction | Current finding | Remaining work |
| --- | --- | --- |
| Branch subcategories under each category head | Present. Root rows expand into subcategories, including nested descendants. | Completeness is limited by first-page category loaders. |
| Show subcategories/items only after root selection | Partial. Normal browsing gates children/items on expansion. Searching automatically expands matching roots, without selection. | Decide whether the sheet's strict selection rule should also apply during search; implement that if required. |
| Images visible after publishing/replacing/deleting | Partial. Earlier local fixes address limits, verified deletion, and repeated uploads. Listing thumbnail resolution handles `image_url` and string images but ignores image objects with `url`, although editor loading accepts `url`. If the listing API omits images, there is no automatic per-product image fetch for table thumbnails. | Normalize image representations; expose loading failures; verify actual API response shapes, image URL access, and expiry. |
| Brand update | Frontend handler calls PATCH, uses `brand_id` or `id`, reports errors, and reloads. Mock request check passes. | Authenticated persistence check required; no evidence yet of a broken backend operation. |
| Brand addition/deletion | Frontend POST and DELETE handlers exist, report errors, and reload. Mock request check passes. | Authenticated create/delete checks required; do not mark resolved solely from wiring. |
| All brands visible | Requests `all=true`, with no fallback when the response remains paginated. A mocked paginated response leaves records unrequested. | Add paging fallback or confirm the backend guarantees an unpaginated response for `all=true`. |
| Show sizes beside each product/brand name | Missing from All Products. Rows display the product name; there is no size/variant summary beside it. | Add summaries or expandable variant rows, and fetch variants if absent from the product list response. |
| Separate option tabs rather than comma-separated variants | Present in attribute add/edit forms, attribute list options, and the product editor's Variants tab. Terms have separate expandable price/stock sections. | Multi-attribute combinations remain unsafe: editor loading reads only the first attribute entry, and saving builds a one-attribute object. A Size + Colour variant can lose attributes on save. |
| Alphabetical/product-code sorting | Missing. Product fetching and subsequent client sorting force numeric product ID descending. No sorting selector exists. | Add selectable name/code sorting and preserve it across filtering and pagination. The request type already includes `product_name` and `product_code`; actual backend support needs verification. |
| Existing images visible in edit screen | Loading exists: image endpoint first, then embedded product images. Endpoint failures are swallowed; total product-loading failures are console-only. | Show actionable loading errors and distinguish an empty gallery from an unavailable gallery. Test with live saved products and accessible image URLs. |
| Existing product incorrectly labelled “Add New Product” | Correct in current code for supported edit routes. `/admin/products/edit` sets `initialIsEdit`; an `id` query also enables edit labels. The listing's advanced editor link uses `/admin/products/edit?id=...`. | Verify the deployed version and entry URL. A manually opened add page without an ID correctly remains Add New Product. |
| Simplified MRP/offer/special/festival pricing | Present: editable MRP, offer price, offer percentage, and special/festival enable switches plus percentages; fields are loaded and serialized. | Discount date ranges/business-specific offers are absent from the suggested format. Effective-price calculation and persistence require backend verification. |
| The 17 specification additions | Controls and mappings exist for target audience, HSN, GST, unit count, package dimensions, material, colour, package type, shelf life, water resistance, hazardous clause, country, manufacturer name/address, packer name/address, and keywords. Weight is labelled Package Weight, not a separate product net weight. | Clarify product versus packaged weight; verify persistence. No separate actual product dimensions exist. |

## Suggested-format field mapping

Numbers follow the screenshot, which skips 5 and 6 and places Company/Generic under Brand Name.

| Sheet number | Suggested field | Current implementation |
| --- | --- | --- |
| 1 | Product name | Present: `product_name`. |
| 2 | SKU of manufacturer | Partial: generic product/variant SKU exists; no distinct manufacturer SKU. |
| 3 | Product type | Present: simple/variable. |
| 4 | Brand name, Company/Generic | Partial: brand selector exists; no explicit Company/Generic classification. |
| 7 | Merabetta product ID | Present: generated product ID displayed; separate `product_code` input exists. |
| 8 | Product category | Present: root/subcategory selection and category IDs. |
| 9 | Product description | Present: `description`, plus short description. |
| 10 | Product bullet points | Partial: bullet editing exists but shares description storage, not an independent bullet array. |
| 11 | Image upload | Present with earlier local fixes; display/load gaps remain as described above. |
| 12 | Product customisable | Missing. |
| 13 | Target audience | Present: `target_audience`. |
| 14 | Model number | Missing. |
| 15 | Item variant | Partial: per-option pricing/stock exists; list summaries and multi-attribute round-trip support are incomplete. |
| 16 | Manufacturer and contact details | Partial: manufacturer name/address exist; no dedicated phone/email/contact person. |
| 17 | Licence number | Missing. |
| 18 | Generic search keywords | Present: `keywords`. |
| 19 | Repacker name | Partial: `packer_name`/`packer_address`; no distinct repacker record. |
| 20 | Age range | Missing: no age minimum/maximum or dedicated saved age group control. Legacy `age_group` is intentionally not serialized after earlier API rejection. |
| 21 | Child/young/adults | Partial: target audience presets include adults and children/infants, plus custom text; no separate age classification. |
| 22 | Material product details | Partial: material text exists; no separate detailed composition field. |
| 23 | Material type (heat/water/gas) | Missing as a structured classification. |
| 24 | Product resistance level | Partial: water-resistant boolean only; no resistance rating or heat/gas resistance. |
| 25 | Other special instructions | Partial: free-form description/hazardous clause can hold text; no dedicated field. |
| 26 | Colour / liquid-solid-gas note | Partial: colour exists; physical-state classification does not. |
| 27 | Product pattern | Missing. |
| 28 | Product weight | Partial: shared weight field labelled Package Weight and variant weight in grams; no distinct net/gross pair. |
| 29 | Actual product length/breadth/height | Missing as separate actual dimensions. |
| 30 | Length/breadth/height after packing | Present: package dimensions and unit. |
| 31 | Manufacturing date | Missing. |
| 32 | Shelf life | Present: `shelf_life`. |
| 33 | Uses of product | Partial: description/target audience only; no dedicated uses field. |
| 34 | HSN code | Present: `hsn_code`. |
| 35 | Reusability | Missing. |
| 36 | Fulfillment channel (Merabetta/self) | Missing from product editor/request mapping. |
| 37 | Quantity available for sale | Present: product and variant stock quantities. |
| 38 | Seller handling time | Missing from product editor/request mapping. |
| 39 | Selling price | Present: sale/offer price. |
| 40 | MRP | Present: regular price labelled MRP. |
| 41 | Business offer | Partial: generic special/festival discounts exist; no business/customer-segment offer. |
| 42 | Sale date from/to | Missing. |
| 43 | Shipping template/self PIN-code choice | Missing from product editor/request mapping; separate PIN-code delivery administration is not a product shipping-template selector. |
| 44 | Maximum order quantity | Present: `max_order_quantity`. |
| 45 | Accessories included | Missing as a dedicated field. |
| 46 | Battery/consumption | Missing. |
| 47 | Cosmetic features | Missing as a dedicated field. |
| 48 | Country of origin | Present: `manufactured_in`. |
| 49 | Hazardous product details | Partial: `hazardous_clause` text exists; no structured hazard classification. |

## Additional confirmed limits

- `getAllAdminCategories()` fetches only `limit=100, offset=0`, ignores `hasMore`, and returns an empty array on request failure. Mocked total=150 returns just 100.
- `getAllAdminVariantAttributes()` and the attribute administration page also fetch only the first 100. Mocked total=150 returns just 100.
- The product editor uses only the first key/value from an existing variant's `attributes`. Its save payload includes only that one attribute.
- Product thumbnails ignore `images: [{ url: '...' }]`, while `images: [{ image_url: '...' }]` works. This is a frontend compatibility gap, not proof of the live response shape.

## Backend boundaries

- Brand CRUD handlers are wired, but successful authenticated storage changes remain unverified. The screenshots do not establish the current cause of backend failures.
- Missing suggested fields need an agreed API/schema contract plus frontend controls. Do not blindly send new keys: earlier product validation rejected unknown fields.
- Product/variant list responses need reliable pagination and enough image/variant information, or the frontend must fetch those resources separately.
- Image URL permissions/expiry, durable storage cleanup, atomic image limits, idempotency, and discount calculations/persistence require backend verification or implementation.

## Verification

- Existing regression suite: `npm test`, 13 passed.
- Additional temporary mocked checks confirmed thumbnail URL incompatibility, category/attribute first-page truncation, brands' dependence on `all=true`, and brand CRUD request methods/paths.
- No live brands/products were added, edited, or deleted. This audit did not establish live backend persistence or deployment status.
