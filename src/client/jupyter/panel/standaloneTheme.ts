/**
 * Standalone-page theme tokens. The embedded notebook editor (loaded inside
 * the Explorer's .ipynb preview iframe) runs outside the dsh GUI, so the
 * --dsw-* tokens are undefined there; this block pins a dark palette matching
 * the Explorer's Darcula look before PANEL_CSS is applied.
 * @module dsh-explorer/client/jupyter/panel/standaloneTheme
 */

export const STANDALONE_THEME_CSS = /* css */ `
:root {
  color-scheme: dark;
  --dsw-alias-bg-base: #0f1115;
  --dsw-alias-label-primary: #e3e6ea;
  --dsw-alias-label-secondary: #9aa2ad;
  --dsw-alias-label-tertiary: #6b7280;
  --dsw-alias-button-floating-fill: #1b1f26;
  --dsw-alias-button-floating-hover: #262b33;
  --dsw-specific-sidebar-nav-item-hover: rgba(128, 136, 148, .25);
  --dsw-specific-sidebar-nav-item-active: rgba(79, 140, 255, .18);
  --dsw-font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft YaHei", Roboto, sans-serif;
  --dsw-font-mono: ui-monospace, SFMono-Regular, "Cascadia Mono", "Cascadia Code", Menlo, Consolas, "DejaVu Sans Mono", "Liberation Mono", monospace;
}
`
