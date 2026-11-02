# UAT deployment — 2 November 2026

Deployed to https://cms.merabetta.com from source commit `4470fc2c823abc7c139f387fc45aa6782d6062b7`.

- Feature branch: `feat/catalog-variant-galleries-20261102`.
- Review: [PR #3 into main](https://github.com/meghashyam-merabetta/CMS/pull/3). Pulled `origin/main` before pushing; already up to date. No direct main push or PR merge.
- Active release: `/var/www/releases/cms-20261102T055554Z-4470fc2`.
- Previous release: `/var/www/releases/cms-20261031T130600Z-65c4432`.
- API preserved: `https://api.merabetta.com`; variant gallery integration enabled.
- Strict SSH host checking used; 97 allowlisted source files checksum-verified. Credentials, local environment files, Git metadata, Mac dependencies and local builds excluded.

103 automated tests passed locally and on Linux. Production webpack builds and TypeScript checks passed on both. Staging login, product list, categories and product editor returned 200; all 11 referenced login assets loaded. Client bundles were checked for unintended local/IP API targets.

Final authenticated public browser checks passed login with an HttpOnly session, stock comparisons for 10 current products, stock/price rendering for product `998844`, that product's variant gallery, optional Accessories & features select/add/remove, and category loading. There were zero runtime errors, failed resources or catalog write requests. Optional controls were exercised in browser state without saving. Historical test products `998970` and `998973` returned 404, so verification was repeated using a current existing product; the initial failed-sample report is retained locally.

The gallery endpoint now succeeds for the current sample. Earlier route-level 404 observations remain documented as historical evidence, not a current deployment blocker. This read-only deployment smoke test does not claim to verify every gallery upload, delete, share or retry against live storage. Arbitrary accessory field names still need the backend persistence contract described in [the handoff](backend-handoff-custom-accessory-features.md).

Only PM2 `nextjs-app` was replaced. Its online state and new working directory were verified, PM2 configuration saved, and the temporary port-3002 preview stopped. Nginx and backend services were unchanged. Final local Nginx login returned 200 and the protected API returned expected anonymous 401. No migrations or catalog/storage writes were performed. The removed `next lint` command is not reported as passing.

Backup, previous application, Nginx snapshot and PM2 rollback configuration are retained at `/var/backups/merabetta-cms/20261102T055554Z`. Restore the previous CMS on the host with:

```sh
sudo bash /var/backups/merabetta-cms/20261102T055554Z/rollback.sh
```

Local verification artifacts: `/tmp/cms-uat-20261102/`. Source manifest, build/test logs and staging evidence are retained with the release. This documentation follow-up does not change the deployed application source.
