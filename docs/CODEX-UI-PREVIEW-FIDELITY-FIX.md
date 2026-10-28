# Codex — Fix UI-only Preview to match REAL Mini Drills shell

## Teacher feedback / reference
Teacher compared the deployed Vocab Lab UI-only preview with a screenshot of the actual Mini Drills admin Library screen. The preview is NOT visually faithful. Treat the REAL Mini Drills app UI as the reference, not the current invented preview shell. The provided teacher screenshot shows:
- Main content and sidebar inside a centered max-width page container, not spread across entire viewport.
- Header with compact hamburger, Mini Drills wordmark, right-side Admin indicator, theme and sign-out area (for demo, replace truthful admin/sign-out with fixture UI; do NOT imply actual auth).
- Left sidebar narrow (~245 px at screenshot scale) with rounded white bordered group, individual item rows and dark navy active row. A separate white rounded bottom sign-out card is present in real app, but a fake sign-out is NOT appropriate in an unauthenticated UI-only demo.
- Main content starts near sidebar, consistent padding, type scale and section headings.
- Existing official app typography, neutrals, radii, colors, spacing and navigation behavior must be reused where possible from ROOT source, or faithfully replicated only in static preview build. Do not link production config/auth or copy the entire root index.

## Required implementation
1. Inspect actual root `index.html` app-shell CSS and DOM patterns and existing reusable tokens. Compare teacher screenshot with preview screenshot and document specific differences. No generic alternative dashboard or invented site design.
2. Build a faithful **static safe replica of the shell** for the UI-only artifact only, ideally using a scoped extraction of actual non-sensitive CSS/structure. Keep actual Vocab Check and Mission components unchanged. Ensure toolbar and header at same max width, sidebar alignment, font, header height, nav spacing, active-state shape and main column sizing. Match dark theme too.
3. Preview should expose only three functional nav items: Vocab Check, Town on the Move, Save the Coast. REMOVE disabled Writing / Other app screens, long developer labels and fake sign-out. Keep a compact, truthful `UI demo · local browser data` notice accessible via details, instead of big info panel above learning content. Tester A/B & theme can be compact in top-right, visibly demo.
4. At desktop, sidebar and main in an app-shell container; on mobile implement real app-style collapse/menu and maintain keyboard accessibility, 44px targets and no horizontal scroll. Preserve phase resume, account isolation, CSP, network guard and all 17-file allowlist constraints.
5. Review actual rendered before/after screenshot side-by-side with teacher's real Mini Drills screenshot at approximately same viewport and device scale. Update tests for design fidelity, screenshot 390/768/1280 light/dark, and all gameplay/network safety regressions.
6. Build new isolated dist and verified static ZIP under fresh versioned output name (e.g. `ui-only-static-v2.zip`) so teacher can distinguish it from old. Write precise handoff including which changes should be upstreamed later to the actual app vs preview-only shell. Do not claim updating the Git branch automatically updates separate Cloudflare Direct Upload: it must be manually uploaded again.
7. Commit/push only `feature/vocab-lab`, prefix `[CF-Pages-Skip]`; NO merge, NO production deployment, NO editing Cloudflare settings.

## Acceptance
Preview resembles genuine Mini Drills admin shell in screenshot rather than simply sharing the wordmark and colors, with minimal preview-specific controls; all game functionality and strict zero-production-network behavior preserved. Teacher reviews final visuals before re-upload.
