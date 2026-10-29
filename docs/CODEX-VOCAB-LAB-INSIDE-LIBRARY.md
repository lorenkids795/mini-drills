# CODEX — Move Vocab Lab into Library > Learning Materials

## Teacher decision
Use the actual Mini Drills Library screenshot and latest source ZIP as the visual reference. Vocab Lab must NOT appear as a standalone top-level sidebar navigation item. Its home is **Library → Learning Materials**, alongside Writing, Listening, Reading, Speaking.

## Expected IA and UX
- Keep the existing Library sidebar entry, Library heading, Cambridge / Learning Materials tabs, Writing IELTS Task 1/2 content and existing other sections unchanged.
- Add one **Vocabulary / Vocab Lab** category row within Learning Materials using the SAME visual pattern as other material categories: icon tile, type/spacing, accordion chevron or Coming Soon tag consistent with existing site.
- For admin/tester, row expands to two real destinations: **Vocab Check** and **Personalized Missions** (or a single Vocab Lab entry that opens the flow, if the actual current library code makes that more natural). Within Missions offer existing Town on the Move and Save the Coast demo in sandbox only. Do not display developer labels in learner view.
- Ordinary students should see **Coming Soon** or no actionable link according to the established UI policy, with direct-route and auth checks. The Writing module remains Coming Soon to students and accessible to testers as previously decided; never change Writing logic.
- Breadcrumb/path should read `Library / Learning Materials / Vocab Lab / ...` and Back returns to Library without losing Vocab Check/Mission progress.
- Do NOT duplicate a Vocab Lab sidebar item or place standalone Mission links in the site-wide navigation. Keep Library as the sole navigation entry point. No unrelated menu clutter.
- Follow the latest uploaded `mini-drills (6).zip` and actual screenshot for exact CSS, container width, category row styling, responsive and light/dark design. Avoid copy/pasting or overwriting the whole app.

## Safety and two environments
- Main product integration work stays solely on `feature/vocab-lab`, no merge to main or production deployment. Respect latest main/Claude Writing changes; reconcile before future merging.
- The **UI-only Cloudflare Preview is a separate, isolated 17-file static artifact** and cannot import the authenticated Library app directly. Update its safe shell to *visually simulate Library → Learning Materials* and expose Vocab Lab via that pathway only. Clearly label static demo; avoid fake auth, Firebase, backend, external calls or student records. Preserve allowlist, CSP, network guard, fixture accounts A/B, existing Check/Mission components and gameplay. Do not include actual Writing content in static demo.
- Cloudflare Direct Upload project `mini-drills-vocab-ui-preview` does NOT update automatically from GitHub pushes. Build a new audited versioned ZIP for teacher to manually upload later, not to production `myhomeworkmyfuture`.

## Verify
- Navigation tests: Library → Learning Materials → Vocab Lab → Check → Mission → back; browser reload/resume; mobile nav; 390/768/1280 light/dark.
- Verify Library typography and category styling against provided screenshot; no duplicate sidebar item; existing Writing not touched.
- Keep demo offline/network-zero and no production data. Include before/after screenshots and updated build/handoff manifest.
- Commit/push changes only to feature branch with [CF-Pages-Skip]; no merge/deploy until teacher signs off.
