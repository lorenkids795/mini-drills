# ADDENDUM — Use teacher's latest uploaded Mini Drills ZIP as the shell reference

Teacher has supplied **mini-drills (6).zip** (contains folder `mini-drills/`), which represents their latest source snapshot. They are also sending it to Codex. Treat that ZIP as the **visual/layout reference**, and compare its code with origin/main and feature branch before touching implementation; ZIP is NOT automatically authoritative for backend, deployment or uncommitted Writing changes. Never replace index.html wholesale or merge its nested directory blindly.

I inspected the ZIP entry `mini-drills/index.html` (roughly 854 KB). Specific genuine app-shell anchors:
- `.app { max-width:1180px; margin:0 auto; ... }`
- `<header class="top">` with `button#sbBtn.sbbtn`, `.brand` with `Mini <mark>Drills</mark>`, and `.right` user/theme/sign-out controls
- `<div class="shell">` then `<aside class="side" id="sideNav">`; real sidebar uses its existing styling and state behavior (`body.nav-on`, `body.sb-open`, `body.sb-wide`, plus responsive breakpoints)
- `--font:'Be Vietnam Pro',system-ui,-apple-system,'Segoe UI',sans-serif`; `--mono:'IBM Plex Mono',...`
- Real admin shell shown in teacher screenshot uses a centered header/sidebar/main with border-defined nav and compact dark-navy active nav item.

Task: compare these exact CSS selectors/DOM against `preview-ui/index.html`, `preview-ui/preview.css`, `preview-ui/preview.js`. Update only the safe standalone preview shell to visually match the *provided ZIP* at desktop/390px/light/dark; use source-specific tokens/spacing/layout and preserve zero-network policy. DO NOT copy original index wholesale, import production auth/Firebase/API, or fetch Google fonts; use safe local/fallback fonts while matching metrics as closely as possible.

Keep preview's functional three views, Tester A/B fixtures, no fake sign-out, no unrelated disabled nav, compact disclaimer. Keep gameplay components untouched. Generate v2 audited ZIP, test, commit/push to feature only; no merge or Cloudflare deploy. Include a concise before/after screenshot comparison against teacher's real admin screenshot.

If ZIP is not present in Codex workspace, request that teacher attach **mini-drills (6).zip** there; do not silently substitute old remote main.
