# Contributing

## Branch Workflow

- `main` contains release versions only.
- `dev` contains the newest runnable version and is the default integration branch.
- Create each new feature or larger fix on its own feature branch from `dev`.
- Codex-created feature branches should use the `codex/` prefix unless a different name is requested.
- Merge completed feature branches into `dev` first.
- Merge `dev` into `main` only for release handoff.
- Run the relevant checks before merging into `dev` or `main`.

## Development Checks

Run the test suite before handing off code changes:

```bash
npm test
```

For UI, CSS, layout, or visual changes, also run:

```bash
npm run style:audit
```

## Design System

All UI work must follow `DESIGN_GUIDELINES.md`.

Key rules:

- Use the spacing, radius, control-height, and shadow tokens in `src/styles.css`.
- Keep normal controls compact and technical.
- Do not add pill-shaped controls unless explicitly approved.
- Keep graph panels square.
- Keep GoldenLayout content square and GoldenLayout tabs rounded only on the top corners.
- Glass, glow, blur, and shadows are allowed as accents for overlays, menus, dialogs, selected states, and schematic feedback, but not as the default treatment for ordinary controls.
- Prefer updating shared CSS rules instead of adding duplicate override blocks.

## Style Changes

When changing CSS:

- Search for an existing component pattern before adding a new one.
- Prefer tokenized values over one-off pixel values.
- Keep mobile and desktop behavior aligned unless a breakpoint-specific difference is intentional.
- If a visual exception is necessary, keep it narrowly scoped and document the reason in code only when it is not obvious.
