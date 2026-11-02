# Saved variants in All Products

Verified on 2026-10-31 using read-only API and local browser checks.

## Finding

ARREX LITT WHEEL CHAIR (product `998844`) has saved variant `203`, Size DSM02, with six custom images and `use_product_images: false`. Variant `204`, Size XXXL, inherits the four product images. The images were persisted; All Products displayed only the parent record and parent image, hiding the saved variants.

## Frontend change

- All Products now displays variant summaries and a **View variants** action. Expanded rows load saved variants and their galleries by exact backend IDs.
- Each variant shows its own authoritative gallery primary image, image count/mode, display name, SKU, stock, MRP and sale price. Empty custom galleries remain empty. Failed image reads show the error rather than a parent-image fallback.
- Search includes variant ID, name, SKU and option combinations. Search **DSM02**, expand the wheelchair, then choose **Edit variant** to open variant `203` in Terms directly.
- Product descriptions remain shared. Option Notes is disabled with an explanation because it has no supported save field; the previous editable input could accept text without persisting it.

## Backend handoff: variant descriptions

No backend changes are needed for the saved variant images to appear in this CMS list. Existing variant and gallery GET routes are sufficient.

If separate variant notes/descriptions are required, please provide a nullable text field supported consistently by variant POST, PATCH and GET/list responses, with database persistence and validation. Confirm its exact name and any customer-facing publication behavior. The frontend currently sends no unsupported notes field. Parent Product Description and Product Details remain shared across variants.

## Verification

- 86 automated tests passed, including saved-ID deep links and variant search.
- Production webpack build passed, including TypeScript checks.
- Authenticated local browser: DSM02 search found product `998844`; variant `203` showed six custom images with a different primary image from the parent; variant `204` showed four inherited images; Edit variant opened `variantId=203` with the correct custom gallery.
- No browser runtime errors or catalog mutations during verification. No deployment was performed for this change.
