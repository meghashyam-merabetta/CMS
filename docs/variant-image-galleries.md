# Variant image galleries: frontend implementation

## Status and deployment dependency

The frontend is implemented against the supplied backend contract. **Live integration has not been tested**, because the backend changes are not deployed yet. Do not enable the feature before migration `038-variant-image-galleries.sql`, the updated API and cleanup workers are deployed.

The build-time flag defaults to off:

```dotenv
NEXT_PUBLIC_VARIANT_IMAGES_ENABLED=false
```

When off, no variant-gallery API requests or uploads are made. The Terms panel explains that separate image editing is not available yet. Existing product-image controls continue to work.

After backend deployment, set `NEXT_PUBLIC_VARIANT_IMAGES_ENABLED=true` in the intended frontend build environment and **rebuild** before deploying the frontend. Setting only a PM2 runtime variable cannot change this compiled public flag. Preserve the target's existing API URL; do not copy local environment files to the server.

## Admin workflow

Open a variant under Terms. Each saved panel uses the exact backend product and variant IDs, not array positions, size labels, SKUs or product image IDs. For unsaved variants, choose and preview files immediately. Files stay in browser memory and upload automatically during the normal product save, after the backend returns the variant ID; no reopening is required. New variants without selected files inherit product images.

- **Use product images** persists the mode with PATCH. Turning it off reveals that variant's retained custom gallery; an empty gallery stays empty.
- Upload one or several selected files. Requests are sequential, exactly one `uploadimage` file per request. The limit is 10 **custom** images per variant, 5 MiB per file, JPEG/PNG/WebP. There is no artificial aggregate batch cap because files are sent separately.
- Upload, replace, delete and select primary only through the selected variant's endpoints. Editing automatically selects custom mode as the backend contract specifies.
- Previews use `effective_images`; the main picture uses the returned `primary_image`. Management controls exist only for matching `custom_images` records. Inherited product IDs are never sent to variant edit/delete/primary routes.
- **Use these images for all variants** opens a confirmation explaining that it replaces the product default and switches all variants, including future variants, to inherit. Sharing is blocked while selected product files remain unsaved or another variant has an unfinished image operation.
- Existing variant image changes save immediately. Unsaved variant files wait for the normal product save. A busy image operation disables the parent editing fieldset and product-save actions to prevent conflicting operations.

## API implementation

Base: `/api/admin/products/:productId`.

| Action | Method/path |
| --- | --- |
| Read gallery | GET `/variants/:variantId/images` |
| Upload one file | POST `/variants/:variantId/images` |
| Replace one custom image | PUT `/variants/:variantId/images/:imageId` |
| Delete one custom image | DELETE `/variants/:variantId/images/:imageId` with JSON `{}` |
| Select primary | PATCH `/variants/:variantId/images/:imageId/primary` with JSON `{}` |
| Change inheritance | PATCH `/variants/:variantId/images` with `{ "use_product_images": boolean }` |
| Share | POST `/variants/images/share` with `{ "source_variant_id": number }` |

All requests use the shared `apiFetch` authentication and error handling. FormData sets multipart Content-Type/boundaries. Upload/replace/share each receive a UUID `Idempotency-Key`, retained with the action for retries. Other edit operations use their custom IDs. IDs stay opaque strings in frontend state; the share body uses the backend's numeric schema only after a safe-integer check.

Gallery responses are checked for matching owner IDs, explicit mode, valid arrays, custom/effective consistency and a primary image belonging to the effective gallery. Malformed responses produce an error instead of a shared-image fallback.

## Failure handling

- Each variant's editor/action is retained in the parent cache across Terms tab changes.
- Confirmed uploads are removed from the queue immediately; a later failed file does not cause successful files to be uploaded again.
- A lost upload/replacement/share response retries the same payload with the same key. A successful mutation followed by failed refresh retries reads only.
- A lost DELETE response is reconciled with GET before treating it as failed.
- Definite HTTP 4xx rejections (excluding ambiguous 408/409) can be discarded so the user can choose a corrected file. Uncertain operations keep their retry key and cannot be blindly discarded.
- Backend error text is shown in the variant panel. The shared error object now also retains HTTP status without changing the existing message parsing.
- Sharing refetches product images, invalidates every cached variant gallery and reloads the selected variant. Other tabs fetch their new state when opened.
- Full browser reloads re-read saved galleries; in-flight File objects are session-local. Do not claim pending files survive closing/reloading the browser.

## Variant identity correction

Previously the editor could collapse Size M / Blue and Size M / Black into one Term and delete the other backend row. Loading now retains each backend ID; Done retains all saved combinations matching a selected option; saving distinguishes the complete attribute combination rather than only size. Duplicate complete combinations fail instead of silently dropping an image-owning variant.

## Verification

**Latest checks: 88/88 automated tests pass, and the webpack production build passes (including TypeScript checks).**

Automated service/controller tests cover:

- M/L/XL isolation and fresh reloads;
- sharing M to all, refreshing state and overriding L only;
- empty custom mode and inherited/custom toggling;
- primary selection, immutable-URL replacement, deletion and inherited-ID protection;
- lost successful responses, stable upload/PUT/share keys and partial-batch recovery;
- refresh-only retries after confirmed writes;
- 10-image/5 MiB limits and invalid/empty files;
- wrong-owner/malformed responses, deployment gating and image selection before a variant exists;
- case-preserving complete combinations retaining backend image owner IDs;
- definite rejection versus ambiguous-operation discard behavior.

A temporary local browser harness intercepted **every API request** and used tiny synthetic PNGs. Browser checks passed for isolation, confirmation/cancel, product-default refresh, inherited ID protection, L override, primary selection, replacement ID preservation, deletion/reload and idempotent lost-response retry. No live gallery endpoints or S3 objects were modified. The temporary route was removed before the production build.

Once migration/API/workers are deployed, repeat these cases end-to-end with authorized test records and storage, then enable/deploy the rebuilt frontend through the normal reviewed deployment process.

### Selecting images before the first save

The local editor now caches selected variant files in its Term state and creates revocable browser object URLs for previews. No image request is sent until the product is saved. After variant POST/PATCH, the same save uses the returned backend ID to upload each queued file separately. The upload controller takes ownership of partially completed batches, retaining retry keys and remaining files; gallery-load failures retain the selection for the next Save. A second save updates the existing variant without uploading completed files again.

The full editor was also tested in a browser with every API request intercepted: choose two LARGE images before saving, save the draft, simulate a lost response after the first upload commits, retry with the original key, then save again. One variant and two images were created in the mock, with no duplicate files or variants, no stale error banner after recovery, and no runtime errors. No live catalog records or storage objects were changed by this test.
