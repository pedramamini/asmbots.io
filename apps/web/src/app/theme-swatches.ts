/** Each theme's swatch colors from tokens.css; none under bun test, where Vite defines nothing. */
export const SWATCHES: Record<string, Record<string, string>> = typeof __THEME_SWATCHES__ ===
'object'
  ? __THEME_SWATCHES__
  : {}
