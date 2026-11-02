# Frontend → Backend: historical UAT variant image route failure

**Deployment follow-up, 2 November 2026:** The final authenticated public smoke test successfully loaded the variant gallery for existing product `998844` and displayed its images. The route-level failure below was observed earlier; it is not reproduced for that current sample. Products `998972`, `998973` and `998970` have since been removed from the API, so their old IDs cannot be used for current verification. Full image write/retry coverage still requires separate authorized integration testing. The frontend fixes are now deployed; see [the deployment report](deployment-report-20261102.md).

Verified on 2 November 2026 using authenticated, read-only catalogue requests through https://cms.merabetta.com. No product, variant, image or storage records were modified.

Product and variant reads succeed:

| Method | URL | Status |
| --- | --- | --- |
| GET | `/api/admin/products/998973` | 200 |
| GET | `/api/admin/products/998973/variants?limit=100&offset=0` | 200; contains variant `219`, owned by product `998973` |

The agreed image routes fail:

| Method | URL | Status / body |
| --- | --- | --- |
| GET | `/api/admin/products/998973/variants/219/images` | 404; `{"error":"Endpoint not found"}` |
| GET | `/api/admin/products/998972/variants/218/images` | 404; same body |
| GET | `/api/admin/products/998844/variants/203/images` | 404; same body; this existing gallery previously passed UAT verification |

These GET requests have no payload. The image URLs also return the same route-level 404 when probed directly through https://api.merabetta.com. Ordinary direct API requests without that origin's own authenticated cookie return 401, while these gallery paths return 404. The authenticated CMS results above establish the failure without relying on cross-domain cookie sharing.

Please restore/deploy the agreed variant gallery route registration on the API instances serving UAT, and confirm load-balanced instances serve the same backend version. If the public contract has intentionally changed, provide the replacement endpoints and response schema before the frontend is changed.

The locally available backend source defines these paths in `src/admin/variants/variants.routes.js`, mounted through `src/admin/products/products.routes.js`. Local source presence does not prove that version is running on UAT.

Confirm migration `038-variant-image-galleries.sql` and the corresponding API/cleanup workers are deployed where required. Verify the full previously agreed GET/POST/PUT/DELETE/PATCH/share contract; only safe GET probes were performed for this investigation.

The frontend uses exact backend product/variant IDs and the previously agreed URL structure. It preserves gallery errors and never substitutes product images for an unavailable or empty custom gallery. A local improvement now explains route unavailability and retains the failed method, path, status and backend message for diagnosis. No frontend fallback can restore an absent API route or recover inaccessible images.

## Separate stock/price observation

For product `998973` and its variant `219`, the API currently returns stock `0` and null prices. Its screenshot therefore does not establish missing stock. Showing `₹0` for null pricing is a frontend display bug; a local fix shows unavailable pricing rather than fabricating zero. The earlier product `998970` has three stocked variants and needs the separately implemented variant stock/range summary. Both frontend updates remain local until deployed.

The `paymentcheck-…` names shown in the screenshot are stored records returned by the API. They were not created during this read-only investigation and were not deleted.
