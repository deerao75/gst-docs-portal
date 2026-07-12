# GST Docs Portal — Acer Tax

Next.js reference library for GST Acts, Rules, Finance Acts, Notifications, Circulars, Forms, and more.

## Local development

```bash
npm install
npm run build
npm start
```

Open http://localhost:3001

## Deploy temporarily (recommended: Vercel + GitHub)

This app uses **server-side API routes** and local PDF/JSON data. **GitHub Pages cannot host it** (static only).

**Free temporary hosting:**

1. Push this repo to GitHub (`deerao75/gst-docs-portal`).
2. Sign in at [vercel.com](https://vercel.com) with your GitHub account.
3. **Add New Project** → import `gst-docs-portal` → Deploy (defaults work).
4. Your site will be live at `https://gst-docs-portal-*.vercel.app`.

Vercel rebuilds automatically on every `git push`.

## Repository size notes

- `data/` — catalogs, PDFs, forms (required at runtime)
- `All Circulars/`, `All Orders/` — notification PDFs live under `data/notifications/`
- `node_modules/` and `.next/` are not committed

## Data refresh scripts

| Script | Purpose |
|--------|---------|
| `scripts/download_gst_forms.py` | GST forms from CBIC Part-B |
| `scripts/scrape_gst_advisories.py` | GST advisories |
| `scripts/download_gst_press_releases.py` | GST Council press releases |