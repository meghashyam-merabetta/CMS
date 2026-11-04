# CMS direct SSH deployment preflight — 30 October 2026

Historical preflight record. The owner subsequently verified the fingerprint, approved deployment and explicitly confirmed UAT. Deployment is complete; see [deployment-report-20261030.md](deployment-report-20261030.md). The original plan and discovery observations are retained below.

## Verified target and version

| Item | Verified result |
| --- | --- |
| Local CMS | `/Users/aryansingh/Downloads/CMS` |
| Candidate | Clean checked-out `main`, `0f2b19d` (`0f2b19d feat(products): add inactive product status support, filter option, and distinct badge`) |
| Other local work | Two existing stashes are preserved; neither is part of this candidate. Earlier local variant/field fixes are in a stash, not silently merged for deployment. |
| SSH target | `ubuntu@13.203.59.213`, host `ip-10-100-1-200` |
| Host-key check | Strict checking passes against the current local `known_hosts` ED25519 pin: `SHA256:95alU67zKa0DYGnnc1R5tA7y1ulPgn6kdOnRVBqXRfc`. The key was absent initially and appeared externally before the successful retry. No key was added by this agent. An independently trusted AWS fingerprint was not supplied in chat; do not claim AWS-console verification. |
| Environment | **Production-associated / treat as production.** Domain `cms.merabetta.com`, ALB DNS name `alb-prod-merabetta-app-cms-1455778186.ap-south-1.elb.amazonaws.com`, production-named PEM. No explicit UAT designation was found. Production approval is required; this target must not be described as UAT. |
| Live application directory | `/var/www/html`, real directory, root-owned, mode 0777 |
| Existing process | Root PM2 v7.0.4, process `nextjs-app`, id 0, `npm run start`, cwd `/var/www/html`, online |
| Runtime | Node 20.20.2 / npm 10.8.2 on Linux; local validation used Node 26.0.0 / npm 11.12.1 |
| Framework | Next.js 16.3.4 / React 19.2.8; npm lockfile; App Router, server-side API rewrites and `public/` assets |
| Web server | Nginx site `/etc/nginx/sites-enabled/default`, hostname `cms.merabetta.com`, HTTP 80 → `http://127.0.0.1:3001`; TLS is reached through the public load-balancer URL |
| Static vs SSR | Nginx proxies the Next.js server; this is not a static `dist` deployment. |
| Live Git metadata | Branch main, HEAD `1f6163400e9fb43936f87490ca320bcebca3ccde`, many tracked working-tree modifications. HEAD alone does not identify the actual live source. |
| Existing build | `/var/www/html/.next`, build ID `fGuR9iLF3BOuUn0SVcYJ9`, BUILD_ID mtime 2026-10-29 01:10:12 UTC |
| Live API configuration | Server `.env` and built rewrite both use `https://api.merabetta.com` |
| Local API configuration | `.env.local` uses `http://16.4.61.3:3000`; tracked defaults use localhost. Production build explicitly used the live HTTPS API to avoid inheriting those defaults. No environment file will be uploaded. |
| Backup size / capacity | Live app approx. 736 MiB; 23 GiB disk available; 1.9 GiB RAM, no swap. Limit the isolated build's memory to protect the live process. |

## Completed validation

- `npm test`: **67/67 passing** on the deployment candidate.
- `npm run build -- --webpack`: **passed**, first with explicit IP target for integration, then with `NEXT_PUBLIC_API_URL=https://api.merabetta.com` for the production target. Build includes TypeScript checks.
- The final built routes manifest points `/api/:path*` to `https://api.merabetta.com/api/:path*`; browser JavaScript bundles contain no `http://localhost:3000` API target.
- Lint **not passed / unavailable**: the repository's script calls removed `next lint`; it fails with “Invalid project directory … /CMS/lint”. No configured replacement was silently introduced.
- Dependency tree resolves Next 16.3.4 and React/React DOM 19.2.8. Two extraneous optional/native support packages exist locally. Linux release will install from `package-lock.json` rather than copy Mac `node_modules`.
- Public root returns 307 to `/login`; public login returns 200. All 11 referenced login assets returned 200 with TLS validation enabled.
- CMS same-origin protected API and direct API IP both return 401 without a session, confirming reachability without exposing records.
- From the CMS host, localhost ports 3001 and 80 login routes return 200; the API IP returns the expected unauthenticated 401.
- Authentication, authenticated product/category data and browser console checks are reserved for the approved release verification with the authorized test account. No production catalog writes will be used as smoke tests.

## Required feature assessment

| Feature | Current checked-out candidate |
| --- | --- |
| Independent backend variant row IDs | Present in Terms and PATCH URLs. |
| Independent *product ID* per size/colour combination | **Not established / not implemented in the current list mapping.** Rows use parent `product_id`/`id`; variants are not expanded into separate catalogue product rows. This deployment must not be described as delivering that feature. |
| Independent stock | Per-variant Terms fields exist, but main product listing maps parent `stock_quantity`; separate XL Blue / XL Black list rows are not implemented. |
| Sold-out display | Main list displays “Out of stock” for zero stock; independent per-combination list behavior still requires work. |
| Categories / subcategories | Hierarchical UI and backend-backed assignment/upload controls are present. Live relationship preservation requires read-only verification after deployment; no relationships will be changed in smoke tests. |
| Category image URLs | Backend image URL mapping and thumbnail rendering/upload UI are present; no new images will be uploaded in verification. |
| Created At / Updated At | Category UI renders Created At. Products map Created At internally, with a synthetic-current-date fallback if missing; product table has no date columns. Updated At is not rendered in these screens. |
| Created By / Updated By | **No implemented fields/display found** in current product/category screens. |
| Product-category audit history | **No implemented history UI/service found.** Existing relationships and historical records must remain untouched. |

The working production service is not assumed to provide any missing feature merely because the code can build.

## Actual rsync dry run and frozen candidate

A checksum-based **remote** dry run was executed over strict SSH against the discovered `/var/www/html/`, with sudo used only to read destination metadata:

- 82 tracked source/config/asset/test/documentation files eligible for the fresh release.
- **81 content transfer entries**, including **one new file**, compared with the live source. The remaining Banner asset has matching content (timestamp metadata differs).
- No transfer, deletion, backup creation, dependency installation, restart, Nginx reload or environment-file change was performed.
- Excluded `.git`, `.env*`, `node_modules`, `.next`, PEM/key files, private tooling directories, caches, local artifacts and generated files.
- Frozen candidate: `/tmp/merabetta-deployment-preflight/candidate/`.
- Full checksum manifest: `/tmp/merabetta-deployment-preflight/source-checksums.json`.
- Full remote itemized dry run: `/tmp/merabetta-deployment-preflight/remote-transfer-dry-run.log`.

Key proposed transfers include `ProductEditor.tsx`, products/categories/orders screens, `src/lib/api.ts`, product/category API services, `next.config.ts`, package files, tests and static assets. The exact changed file list is appended below.

## Proposed actions after approval

1. Recheck host-key pin, live PM2 process, available disk and candidate checksums for drift. Abort and re-plan if target/source changed.
2. Create root-restricted backup directory `/var/backups/merabetta-cms/20261030T145855Z/`. Preserve a full copy of `/var/www/html`, including the working `.next`, dependencies, server-only environment, current uncommitted source and Git metadata. Preserve Nginx configuration and PM2 process/dump metadata with restrictive permissions; never print secrets.
3. Create fresh release `/var/www/releases/cms-20261030T145855Z-0f2b19d/`. Transfer frozen source via rsync/SSH, never through GitHub and never over the live checkout. Do another dry run against that staging directory and verify SHA-256 checksums after transfer. Normalize new source permissions, not the old working tree.
4. Preserve environment configuration by copying the current server environment **server-to-server only**, without changing or uploading secret values. Keep the verified API `https://api.merabetta.com` explicit for build/runtime.
5. Install locked Linux dependencies (`npm ci`) and build the Next.js release on the server. Do not upload Mac-native dependencies or assume Mac build output is deployable on Linux. Use a transient, memory-limited build unit (systemd MemoryMax, no added swap), so a failed/OOM staging build does not restart or replace the current service.
6. Verify the Linux build's rewrite and inputs. Launch an isolated temporary Next server bound to `127.0.0.1` on an available alternate port and check login, assets and API proxy; stop only that temporary PID. Do not activate a failed build.
7. Write a release-specific PM2 ecosystem configuration for the existing name `nextjs-app`, `/usr/bin/npm`, arguments `run start`, new release cwd, fork mode, one instance, original logs, production environment and port 3001 through the unchanged start script. Apply it with `sudo pm2 startOrReload <release-config> --only nextjs-app --update-env`. No `restart all`; Nginx configuration stays unchanged. Expect a brief interruption with this single fork-mode process.
8. Verify direct/backend/public health, assets and redirects; log in with the authorized test account and perform read-only product editing/category/stock checks. Record actual unsupported features rather than claiming them complete. Persist the successful PM2 state only after health verification and retain the previous release for rollback.

## Rollback (after any failed activation)

- Preserve release/build/error logs in the backup/release metadata.
- Restore only `nextjs-app` using a rollback ecosystem configuration with original `/var/www/html` cwd, original npm start arguments, environment and log paths. The original live checkout remains intact throughout this plan; the full backup is a second recovery copy.
- Reload that single PM2 application and verify localhost/public login, assets and API reachability. Restore the previous PM2 saved state if persistence changed, without replacing/restarting unrelated applications.
- Nginx configuration remains unchanged. If a later approved modification becomes necessary, save its original, run `nginx -t`, and reload only after successful validation.
- No backend database changes, reset/clean, live-directory rsync deletion or PEM operations are involved.

## Approval needed

The supplied deployment instructions require: “After showing me the deployment plan and obtaining approval” and “If it is production or the environment cannot be established, stop before deployment and request explicit approval for that target.”

Approval must specify this production-associated server and candidate `0f2b19d` **as-is**, acknowledging the missing per-combination product list and audit features and excluded local stashes. Also confirm the pinned ED25519 fingerprint was checked through an independently trusted source, as the supplied instructions require. No server application modification will begin before that approval.

## Itemized source differences from live

```text
<fcst.... .gitignore
<fcst.... README.md
<fcst.... next.config.ts
<fcst.... package-lock.json
<fcst.... package.json
<fcst.... postcss.config.mjs
<fcst.... tsconfig.json
<fcst.... docs/catalog-image-uploads.md
<fcst.... docs/correction-sheet-audit.md
<fcst.... docs/product-corrections-backend-contract.md
<fcst.... public/icon.svg
<fcst.... public/Images/logo.svg
<fcst.... public/Images/panel.svg
<fcst.... src/app/globals.css
<fcst.... src/app/layout.tsx
<fcst.... src/app/page.tsx
<fcst.... src/app/admin/layout.tsx
<fcst.... src/app/admin/admins/page.tsx
<fcst.... src/app/admin/admins/createAdmin/page.tsx
<fcst.... src/app/admin/brands/page.tsx
<fcst.... src/app/admin/cancellations/page.tsx
<fcst.... src/app/admin/categories/page.tsx
<fcst.... src/app/admin/cms/page.tsx
<fcst.... src/app/admin/coupons/page.tsx
<fcst.... src/app/admin/dashboard/page.tsx
<fcst.... src/app/admin/labs/page.tsx
<fcst.... src/app/admin/labs/test-categories/page.tsx
<fcst.... src/app/admin/labs/test-categories/[categoryId]/page.tsx
<fcst.... src/app/admin/notifications/page.tsx
<fcst.... src/app/admin/orders/page.tsx
<fcst.... src/app/admin/payments/page.tsx
<fcst.... src/app/admin/pincode-delivery/page.tsx
<fcst.... src/app/admin/product-variants/page.tsx
<fcst.... src/app/admin/products/page.tsx
<fcst.... src/app/admin/products/add/page.tsx
<fcst.... src/app/admin/products/edit/page.tsx
<fcst.... src/app/admin/profile/page.tsx
<fcst.... src/app/admin/replacements/page.tsx
<fcst.... src/app/admin/reports/page.tsx
<fcst.... src/app/admin/returns/page.tsx
<fcst.... src/app/admin/users/page.tsx
<fcst.... src/app/admin/warehouses/page.tsx
<fcst.... src/app/login/page.tsx
<fcst.... src/components/dashboard/BarChartComponent.tsx
<fcst.... src/components/dashboard/DateRangePicker.tsx
<fcst.... src/components/dashboard/ErrorAlert.tsx
<fcst.... src/components/dashboard/MetricComparisonCard.tsx
<fcst.... src/components/dashboard/OrdersCancelledSection.tsx
<fcst.... src/components/dashboard/SummaryCards.tsx
<fcst.... src/components/dashboard/UsersProductsSection.tsx
<fcst.... src/components/layout/Header.tsx
<fcst.... src/components/layout/LogoutModal.tsx
<fcst.... src/components/layout/Sidebar.tsx
<fcst.... src/components/products/AdditionalProductDetails.tsx
<fcst.... src/components/products/ProductEditor.tsx
<fcst.... src/components/ui/EntityImageInput.tsx
<fcst.... src/contexts/AuthContext.tsx
<fcst.... src/data/mockData.ts
<fcst.... src/lib/api.ts
<fcst.... src/lib/catalogImages.ts
<fcst.... src/lib/jsonRequest.ts
<fcst.... src/lib/pagination.ts
<fcst.... src/lib/productCatalog.ts
<fcst.... src/lib/productDetails.ts
<fcst.... src/services/api/adminAuthApi.ts
<fcst.... src/services/api/adminBrandsApi.ts
<fcst.... src/services/api/adminCategoriesApi.ts
<fcst.... src/services/api/adminEntityImagesApi.ts
<fcst.... src/services/api/adminManagementApi.ts
<f+++++++ src/services/api/adminOrderApi.ts
<fcst.... src/services/api/adminProductsApi.ts
<fcst.... src/services/api/adminUsersApi.ts
<fcst.... src/services/api/adminVariantAttributesApi.ts
<fcst.... src/types/api.ts
<fcst.... src/types/dashboard.ts
<fcst.... tests/api-contract.test.cjs
<fcst.... tests/entity-images.test.cjs
<fcst.... tests/helpers.cjs
<fcst.... tests/product-catalog.test.cjs
<fcst.... tests/product-details.test.cjs
<fcst.... tests/product-images.test.cjs
```
