# Mini Drill — Visual Asset Policy (Vocab Lab)

## Mandatory requirement
Do **not** use AI-generated images or AI-generated illustrations in any production Mini Drill interface or assets. All earlier AI-image mockups were for concept communication only and must not be copied, embedded, shipped, or used as a source to trace or recreate recognizable artwork.

## Approved approaches
- Use HTML/CSS for layouts, decorative surfaces, motion and game feedback.
- Use original, hand-authored SVG / CSS geometry for icons, progress, badges, puzzles, maps and simple scenery.
- Reuse the existing repository's non-AI visual assets when suitable and licensed for this purpose.
- If photographs/illustrations are needed, choose independently sourced assets with documented commercial-use rights and appropriate attribution as required; do not add assets with uncertain licenses.
- Prefer lightweight, responsive, accessible, performant assets. Honor `prefers-reduced-motion` and mobile layouts.

## Pinterest references — inspiration, not an asset license
- Pinterest is approved for **visual research and moodboards**: look for reference styles, color schemes, hand-drawn illustration aesthetics, map art, puzzle concepts, typography and interactions.
- Do **not** download, trace, crop, embed, hotlink, or redistribute an image just because it is on Pinterest. Pins commonly repost third-party work; Pinterest availability does not grant a license to use an image in a public website.
- When a Pinterest reference is selected, follow it to the **original artist/photographer/source** and establish permission or a suitable license for commercial/public website use, including any attribution requirements. Record source URL, creator, license/permission, and attribution in an asset register.
- If no permission is verifiable, use the pin for high-level inspiration only and create original UI using HTML/CSS/SVG, or use separately licensed non-AI assets.
- Ask the project owner to approve any externally sourced production artwork before integration; don't add it autonomously.

## Puzzle Collection implementation
- Build the jigsaw board and puzzle-piece shapes in SVG/HTML/CSS.
- The underlying completed image must be an eligible licensed non-AI image or original human-created artwork. If none is available, use an abstract CSS/SVG-designed puzzle for the prototype.
- Assign each earned piece from the set of still-missing pieces (no duplicates); restore its correct position with subtle animation. Piece rewards must remain separate from vocabulary mastery assessment.

## Scope for current Codex task
- This is a clarification for Vocab Check Phase 1 and future phases.
- Do not expand Phase 1 into Puzzle Collection or other missions.
- If a prior HTML prototype references AI-generated images, replace these with non-image CSS/SVG placeholders rather than importing those images.
- Keep work on `feature/vocab-lab`; do not alter `main`, Cloudflare deployment, or Writing Module.

## Acceptance checks
- No image generation services, generated image files, or AI mockup artwork in shipped assets.
- No external image hotlinks with unknown rights.
- Credits/license information are maintained for any third-party assets introduced.
