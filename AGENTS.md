# Agent Instructions

These instructions apply to the whole repository.

## Git Workflow

- `main` is the release branch. Keep it stable and merge into it only when a release-ready version should be published.
- `dev` is the integration branch. It should always contain the newest runnable version.
- Start every new feature or larger fix from `dev` on a separate feature branch.
- Use the branch prefix `codex/` for Codex-created feature branches unless the user explicitly asks for a different name.
- Merge completed feature branches back into `dev` first, not directly into `main`.
- Merge `dev` into `main` only for release handoff or when the user explicitly asks to release.
- Before merging into `dev` or `main`, run the required checks for the touched areas and report any checks that could not run.
- If the current branch is `main` and the user asks for new implementation work, switch to `dev` or create a feature branch from `dev` before editing files, unless the user explicitly asks to work on `main`.

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
