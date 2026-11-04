# UAT merged-source deployment — 4 November 2026

Deployed to https://cms.merabetta.com from source commit `871b0e466dc27e606cb32a420f25da30c2fe51e9`.

## Source integration

Fetched GitHub and pulled `origin/main` at `d947402debc383915b9fd835205640c84611ae50` into `feat/catalog-variant-galleries-20261102`. Resolved the ProductEditor conflict while retaining the upstream one-option dropdown, additive Terms confirmation, layout changes and removed Terms pricing/stock controls. Merged `origin/feat/configuration-product-ids-20261102` at `1a63b46`, retaining nullable individual/group product IDs and configuration labels.

The active UAT release had changed since the previous deployment to `/var/www/releases/cms-20261104-publishing-7a943fc`. Its source was compared before deployment. Preserved its case-sensitive attribute handling, original-stock tracking, omission of unchanged product/variant stock from metadata updates, initial stock for newly created/recreated variants, nullable regular pricing, requested-variant tab behavior and converted single-variant inventory summary. This retains the deployed fix for metadata saves accidentally requesting inventory adjustments, while still initializing new variants. Existing saved price values are retained by the editor even though upstream removed the separate Terms price inputs.

All integration commits were pushed to the feature branch attached to [PR #3 into main](https://github.com/meghashyam-merabetta/CMS/pull/3). No direct main push or PR merge was performed. The locally generated API PDF/HTML artifacts were preserved and excluded from the release.

## Verification

- 109/109 automated tests passed locally and on Linux, including unchanged-stock omission, initialization of recreated variants, case-distinct options, repeat confirmation and converted configuration inventory.
- Local and Linux production webpack builds and TypeScript checks passed. The obsolete `next lint` script was not reported as passing.
- 98 allowlisted source files were checksum-verified. Dependencies were installed from the lockfile on Linux. No local environment files, PEM/private keys, Git metadata, local build output or Mac dependencies were transferred.
- Staging login, products, categories and editor routes returned 200; all 11 referenced login assets loaded. The protected API proxy returned expected anonymous 401. The rewrite and client bundles retained `https://api.merabetta.com` with no local/IP API targets.
- Authenticated baseline browser checks passed before switching releases.
- Final public browser checks passed login with an HttpOnly session, stock comparisons for 10 products, price/stock rendering and variant gallery for product `999031`, optional Accessories & features selection/removal, categories, and the merged dropdown workflow. Two temporary options were confirmed one at a time and both remained in Terms; removed Terms price/stock inputs were absent. These changes existed only in browser memory and were not saved.
- Final browser report: zero runtime errors, failed resources, backend gallery failures or catalog write requests. These smoke checks do not claim to verify every live mutation/upload/payment workflow.

## Release and rollback

| Item | Value |
| --- | --- |
| Active release | `/var/www/releases/cms-20261104T144008Z-871b0e4` |
| Build ID | `8r6JevNTae29GXyslptOq` |
| Previous release retained | `/var/www/releases/cms-20261104-publishing-7a943fc` |
| Backup | `/var/backups/merabetta-cms/20261104T144008Z` |
| API origin | `https://api.merabetta.com` |
| Service | Root PM2 `nextjs-app`, port 3001 |

Strict SSH host-key checking was enabled. A full previous-application backup, Nginx snapshot and private PM2 rollback configuration were created before upload. Server environment files were copied server-to-server with restricted permissions. Linux build ran in a resource-limited transient service. A guard checked that the active UAT release had not changed before switching. Only PM2 `nextjs-app` was replaced; Nginx and backend services were unchanged. Running and saved PM2 state point to the new release, and the temporary preview service was stopped. Final Nginx login returned 200 and protected API returned 401.

Restore the previous CMS on the host with:

```sh
sudo bash /var/backups/merabetta-cms/20261104T144008Z/rollback.sh
```

No database migrations, catalog records, storage objects or backend services were changed. Local evidence: `/tmp/cms-uat-20261104/`; release contains its source manifest, staging verification and build/test logs. This documentation follow-up does not change deployed application source.
