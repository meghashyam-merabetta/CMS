# Merabetta CMS direct deployment report — 30 October 2026

**Outcome: deployed and verified.**

| Item | Result |
| --- | --- |
| Environment | **UAT**, explicitly confirmed by the owner. Production-named PEM/domain infrastructure was not used to infer UAT; approval was obtained before modification. |
| CMS URL | https://cms.merabetta.com |
| SSH target | ubuntu@13.203.59.213; StrictHostKeyChecking enabled; ED25519 SHA256:95alU67zKa0DYGnnc1R5tA7y1ulPgn6kdOnRVBqXRfc independently confirmed by owner through AWS. |
| Local source | /Users/aryansingh/Downloads/CMS |
| Deployed candidate | main, `0f2b19dff8f9c31278377a9459956e12cbc8bd93` |
| Active remote directory | `/var/www/releases/cms-20261030T145855Z-0f2b19d` |
| Previous app | `/var/www/html`, retained intact with its previous working build and uncommitted files |
| Build ID | `wAytxT-1XvxTmHDMEBhSf` |
| Deployment transport | Direct rsync over strict SSH; no GitHub deployment transport |
| Files | 82 approved tracked source/config/asset/test/doc files; server-generated checksum manifest. No Git metadata, Mac dependencies/build, PEM, local environment, cache or unrelated artifacts uploaded. |
| Backend URL | Preserved `https://api.merabetta.com`; direct API integration address `http://16.4.61.3:3000` also verified |
| Build | npm ci from lockfile, Linux Node 20.20.2 / npm 10.8.2, Next 16.3.4, webpack production build passed in memory-limited staging unit |
| Tests | 67/67 passed locally and again on Linux |
| Lint | Existing script is invalid (`next lint` removed in this Next.js version); not reported as passed |
| App process | Only root PM2 `nextjs-app` was replaced/restarted; active cwd is the release above; saved PM2 startup state verified |
| Nginx | Existing port-80 → localhost:3001 proxy retained; no configuration edits or reload performed |
| Temporary staging service | Used loopback port 3002, verified, then stopped |
| Secrets | Server environment preserved via server-local copy; no PEM file was read, changed, uploaded or committed |

## Verification

- Login, product listing, categories and product edit routes load.
- Anonymous protected API requests return expected 401; authenticated CMS requests work.
- Authorized admin browser login passed with the HttpOnly session cookie.
- **10 visible product rows** were checked against the backend stock values, including zero-stock labeling where present.
- Existing product **870516** loaded correctly in the editor. The first displayed variant's stock matched the backend; four backend variants were returned at verification time. No product/variant/category saves or deletes were sent as smoke tests.
- Category screen loaded, with root/subcategory API data and image mappings. The sampled API page contained 100 records, 86 with parents and eight mapped image URLs; these are sample counts, not an assertion of full catalogue totals.
- Staged login and all **12 referenced assets** returned 200; direct Nginx and Next.js login checks returned 200 after activation.
- Final authenticated browser run reported **zero runtime errors and zero failed resource responses**.
- Source checksums matched all 82 approved files before build; the compiled API rewrite targets the preserved HTTPS API, and browser chunks contain no localhost API target.

## Remaining feature limits, approved before deployment

- Current main product list still maps parent product IDs and parent stock; distinct product-list rows/IDs for every size/colour combination are not implemented by this release. Backend variant row IDs and per-variant stock fields exist in Terms.
- Created By / Updated By and product-category audit-history UI are not implemented. Category Created At is displayed; Updated At and full product audit display remain incomplete. These features were not claimed as complete.
- Category assignment controls were inspected without writing relationships. Historical data and all existing relationships were left untouched.
- Earlier unfinished frontend fixes remain in the existing local stashes and were not silently included in the approved GitHub-main candidate.
- Authentication and editor loading were verified without saving real records. This is a deployment/read-only smoke test, not certification of every product save path.

## Events and recovery

1. The first PM2 reload retained the old cwd. Original process configuration was restored; activation was corrected to delete/start **only nextjs-app** with the explicit new release configuration.
2. A login check then returned 502. Rollback restored the original CMS, which also returned API 502; the direct API port was unreachable. The owner confirmed the backend was being restarted. No backend processes or databases were changed by this deployment.
3. After API health returned and passed three probes, the release was reactivated. All authenticated checks passed, and the final PM2 state was saved.

## Backup and rollback

Full restricted backup and original process/Nginx metadata:

`/var/backups/merabetta-cms/20261030T145855Z`

The original `/var/www/html` remains intact as a ready fallback. A restricted rollback script restores the previous cwd/config for nextjs-app only, waits for login health and saves the restored PM2 state:

```sh
sudo bash /var/backups/merabetta-cms/20261030T145855Z/rollback.sh
```

Run it on the CMS server if rollback is needed. It does not touch the API database, Nginx configuration or unrelated applications. An ordinary PM2 reload alone must not be used to change cwd on this installation; the deployment demonstrated that it retains the old cwd.

Server logs and verification artifacts are retained in the backup directory and release (`install.log`, `build.log`, `tests.log`, `staging-verification.json`, `DEPLOYMENT-MANIFEST.json`). Local browser and transfer evidence is in `/tmp/merabetta-deployment-preflight/`.
