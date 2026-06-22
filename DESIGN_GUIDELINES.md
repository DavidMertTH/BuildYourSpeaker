# Design Guidelines

Cabio is a dense technical design tool. The interface should feel precise, compact and modern, without drifting into decorative landing-page styling.

## Shape

- Standard controls use `--radius-control` (`4px`).
- Graph containers use `--radius-graph` (`0`).
- GoldenLayout tabs use `--radius-tab-top` (`4px 4px 0 0`).
- Do not introduce pill controls (`999px`, `50%`) unless the component is explicitly documented as a round physical indicator.

## Spacing

- Use the spacing scale in `src/styles.css`: `--space-1` through `--space-8`.
- Preferred layout gaps are `4px`, `6px`, `8px`, `10px`, `12px`, and `16px`.
- Values like `1px`, `3px`, `5px`, `7px`, `9px`, or `11px` are only for icon alignment or pixel-edge tuning.
- Standard controls should use `--control-height` (`32px`), compact controls `--control-height-small` (`28px`), and tiny overlay controls `--control-height-compact` (`24px`).

## Controls

- Buttons, tabs, and menu summaries should share the flat technical style: transparent or lightly tinted background, subtle border, clear hover/focus state.
- Tab-like controls use an underline or bottom-border active state.
- Icon-only actions should use square dimensions and centered icons.

## Graphs

- Plot panels and GoldenLayout content stay square.
- Graph overlays may use light glass/shadow styling, but should stay compact and aligned to the same spacing scale.
- Plot switchers use the same understated control language as other technical controls.

## Modern Effects

- Glass, blur, glow, and shadows are allowed for floating overlays, menus, dialogs, selected schematic groups, and active technical states.
- Do not use glow or glass as the default treatment for ordinary controls.
- Avoid decorative radial blobs, hero-style gradients, or purely ornamental effects.

## Maintenance

- Prefer tokens over one-off values.
- Keep shared rules in one place; avoid repeated override blocks that restate the same radius, spacing, or tab behavior.
- Run `npm run style:audit` after UI styling changes.
