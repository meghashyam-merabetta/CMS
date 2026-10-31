# UAT deployment — 31 October 2026

Outcome: deployed and verified at https://cms.merabetta.com.

## Source and merge

- Local project: `/Users/aryansingh/Downloads/CMS`.
- GitHub main fetched through `6c6ad08`, including automatic manufacturer SKU/model generation, Cartesian variant combinations, Copy listing, weight inheritance and expanded search.
- Local frontend work checkpointed at `fd1f67f`; merged source deployed at `b1bc44acc6f1005836a218033776ba88f7ad4534`.
- Overlapping changes were resolved to retain both feature sets, including exact variant image owner IDs, staged image files, mandatory manufacturer licence and relocated expiry values. A merge regression test verifies a Size × Colour matrix preserves a saved variant's ID and queued files.
- Existing older stashes remain untouched. Local `.env.local` remains configured for the IP backend; environment files were excluded from transfer.
- GitHub was used for fetching changes; deployment used direct rsync over SSH. No GitHub push was performed by this deployment.

## Deployment

| Item | Value |
| --- | --- |
| Environment | UAT, previously explicitly confirmed by owner and requested for this deployment |
| Host | `ubuntu@13.203.59.213` |
| SSH | StrictHostKeyChecking enabled against the previously independently confirmed host-key pin |
| Source files transferred | 92 allowlisted files; all SHA-256 checksums verified; dry run showed 22 differences from the previous release |
| Active release | `/var/www/releases/cms-20261031T124207Z-b1bc44a` |
| Previous release retained | `/var/www/releases/cms-20261030T145855Z-0f2b19d` |
| Build ID | `dDKTWuf3K9v8uDACs3187` |
| Backend | `https://api.merabetta.com`, preserved for the UAT build and runtime |
| Variant image feature | Enabled explicitly for build and runtime |
| Process | Only root PM2 `nextjs-app` replaced; cwd and saved PM2 configuration verified |
| Nginx | Existing proxy unchanged; no reload required |

The active release was backed up before source transfer. Linux dependencies were installed using `npm ci`; tests and the webpack build ran in a memory-limited staging unit while the original CMS remained online. A temporary Next server on loopback port 3002 passed checks before activation and was stopped after public verification. No PEM, Mac dependencies/build, local environment or Git metadata was transferred. Server environment files were preserved by server-local copies.

## Verification

- Local and Linux automated tests: **94/94 passed**.
- Local and Linux production webpack builds: passed, including TypeScript checks.
- Staging: login, product list, categories and product editor returned 200; all 11 referenced login assets returned 200; the API proxy returned the expected anonymous 401.
- Public authenticated browser: login succeeded with an HttpOnly admin session; 10 visible parent-product stock values matched the backend; zero-stock labels matched where present.
- Product `870516` loaded and its displayed variant stock matched the backend. The current API returned one variant (`210`) at verification time; this is an observation of existing data, not a frontend data change.
- Category page loaded; the sampled 100-record API page had 91 subcategories and eight image mappings. These are sample counts, not full catalogue totals. No relationships were written.
- Searching DSM02 found product `998844`; expanded variant `203` displayed its backend primary image and six custom images. Its edit link opened the exact variant; the deployed **Choose files** button was visible and enabled.
- **Zero browser runtime errors, zero failed resource responses and zero catalog mutations.**
- Final local Nginx login: 200. CMS API proxy: expected anonymous 401. Saved PM2 cwd matches the new release.

A separate mocked browser test also passed image selection before Save, previews, one-time variant creation, one-file uploads, lost-response retry with the original idempotency key, a second save without duplicate images/variants, and recovery-banner clearing. It did not modify live storage or records.

## Limits

- This is read-only live verification, not a claim that every possible catalog write was exercised on UAT.
- Variant rows retain independent backend variant IDs under the parent product; they do not create independent product IDs.
- Separate Option Notes/variant descriptions still need backend field support; the unsupported input is disabled with an explanation.
- Created By / Updated By and product-category history UI remain unimplemented. Complete timestamp/audit presentation is not part of this release and is not claimed as verified.
- The repository's existing lint command uses removed `next lint`; lint is not reported as passed. Builds, TypeScript, tests and browser checks passed.

## Rollback

Restricted backup, full previous application copy, Nginx snapshot and original PM2 metadata:

`/var/backups/merabetta-cms/20261031T124207Z`

On the CMS host:

```sh
sudo bash /var/backups/merabetta-cms/20261031T124207Z/rollback.sh
```

This restores only `nextjs-app` to the retained previous release, checks local login health and persists PM2. It does not modify the API database, Nginx or unrelated services.

Local verification evidence: `/tmp/cms-uat-20261031/` (source manifest, transfer log and public browser report). Server build/test logs and staging verification are in the active release.
