# Agent Instructions

These instructions apply to the whole repository.

## UI And Styling

- For every UI, CSS, layout, or visual change, read and follow `DESIGN_GUIDELINES.md`.
- Use the existing CSS tokens in `src/styles.css` for spacing, radius, control heights, shadows, and graph-specific shapes.
- Do not introduce pill-shaped controls (`999px`, `50%`) unless the user explicitly approves a physical round indicator.
- Keep graph containers square and GoldenLayout tabs rounded only on the top corners.
- Glass, glow, blur, and shadows are allowed only as controlled accents for overlays, menus, dialogs, selected states, and schematic feedback.
- Avoid duplicate style override blocks. Prefer updating the shared rule or token.

## Required Checks

After UI or CSS changes, run:

```bash
npm run style:audit
npm test
```

If a check cannot run, report why in the final response.
