# What to upload to GitHub

22 files. The folder structure matters: `netlify/functions/` must stay a folder,
not flattened, or the alerts and share features will not deploy.

## Structure your repo must end up with

```
signal-screener/
├── index.html                      ← rename from index__13_.html
├── manifest.webmanifest
├── sw.js
├── netlify.toml
├── package.json
├── robots.txt
├── sitemap.xml
├── og-image.png
├── icon-192.svg
├── icon-512.svg
├── ALERTS-SETUP.md                 (docs, optional)
├── REGRESSION-CHECKS.md            (docs, optional)
├── README.md                       (docs, optional)
└── netlify/
    └── functions/
        ├── subscribe.js
        ├── confirm.js
        ├── unsubscribe.js
        ├── check-alerts.js
        ├── share-create.js
        ├── share-image.js
        ├── share-view.js
        └── _lib/
            ├── scoring.js
            └── providers.js
```

## Changed since your last upload — these MUST be replaced

| File | What changed |
|---|---|
| `index.html` | www domain, em-dashes removed, bulk/import removed, core/extended scoring split, absence scoring, coverage cap, per-metric staleness, hello@ contact, pricing copy, API-key labels |
| `robots.txt` | www domain |
| `sitemap.xml` | www domain |
| `subscribe.js` | reply-to header, www domain |
| `check-alerts.js` | reply-to header, www domain |
| `_lib/providers.js` | www domain in user-agent |
| `ALERTS-SETUP.md` | www domain, reply-to variable |

## Brand new — these do not exist in your repo yet

| File | Purpose |
|---|---|
| `share-create.js` | Stores a scorecard image and returns a share URL |
| `share-view.js` | Serves `/s/:id` with the card as its og:image |
| `share-image.js` | Serves `/card/:id.png` |
| `REGRESSION-CHECKS.md` | Checklist of bugs that have shipped and how to catch them |

## Unchanged — only upload if missing from your repo

`manifest.webmanifest`, `sw.js`, `netlify.toml`, `package.json`, `og-image.png`,
`icon-192.svg`, `icon-512.svg`, `confirm.js`, `unsubscribe.js`, `_lib/scoring.js`

## How to upload without the "file already exists" error

GitHub's web uploader refuses to overwrite. For each file that already exists:
open it, click the pencil, then the three dots, Delete file, Commit. Then use
Add file → Upload files.

For the `netlify/functions/` folder, drag the whole `netlify` folder into the
GitHub upload box in one go — it preserves the structure. Do not upload the
`.js` files individually into the repo root.

## After uploading

1. Netlify redeploys automatically, about a minute.
2. Check Functions in the Netlify dashboard: you should see 7 functions listed.
3. Hard-refresh the site with Ctrl+Shift+R (Cmd+Shift+R on Mac).
4. Alerts and sharing stay dormant until the environment variables in
   `ALERTS-SETUP.md` are set. That is deliberate — nothing half-works.
