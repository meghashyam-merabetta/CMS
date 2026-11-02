# UAT custom variant fields deployment — 31 October 2026

Deployed and verified at https://cms.merabetta.com.

| Item | Result |
| --- | --- |
| Source commit | `65c4432b175a854097e6d8e0deecb1ec449cf520` |
| Local project | `/Users/aryansingh/Downloads/CMS` |
| UAT host | `ubuntu@13.203.59.213`, strict SSH host-key checking enabled |
| Active release | `/var/www/releases/cms-20261031T130600Z-65c4432` |
| Previous release retained | `/var/www/releases/cms-20261031T124207Z-b1bc44a` |
| Build ID | `pcZgpU0qsPNd7NwF51z7s` |
| Transport | Direct rsync over SSH; 93 allowlisted source files checksum-verified; dry run showed three differences |
| API | `https://api.merabetta.com`, preserved in build/runtime; variant galleries remain enabled |
| Tests and build | 96/96 tests passed locally and on Linux; production webpack build and TypeScript passed |
| Services | Only PM2 `nextjs-app` restarted; new cwd and saved PM2 configuration verified; Nginx unchanged; temporary preview stopped |

**Feature:** Variants → Select Variant → **+ Add new field** opens a field-name input. Users can add their own options and save through existing attribute/variant APIs. No backend changes or migrations are needed. Existing definitions are reused and no placeholder Option 1 is fabricated.

Staging routes and all 11 referenced login assets returned 200; the API proxy returned expected anonymous 401. Public browser verification passed login, 10 parent-product stock comparisons, product 870516 variant stock, categories, DSM02's six custom images and its exact-ID edit link. The new dropdown was exercised by adding a temporary field and option in browser state **without saving**. There were zero catalog mutations, runtime errors or failed resource responses. Final CMS login returned 200 and the protected API returned expected anonymous 401.

Server environment files were copied server-to-server only. PEM, local environment, Git metadata, Mac dependencies and local builds were excluded. No GitHub push, backend changes or catalog/storage writes were performed. Existing audit and independent-product-ID limitations from [the earlier report](deployment-report-20261031.md) remain unchanged. The existing removed `next lint` script is not reported as passed.

Full previous application backup, Nginx snapshot and PM2 rollback configuration are retained at `/var/backups/merabetta-cms/20261031T130600Z`. On the CMS host, restore only this CMS process with:

```sh
sudo bash /var/backups/merabetta-cms/20261031T130600Z/rollback.sh
```

Local evidence: `/tmp/cms-uat-custom-fields/`. Build/test logs, source manifest and staging verification remain in the active release.
