/**
 * The non-code modules the Worker imports. Wrangler compiles a `.wasm` file into a
 * `WebAssembly.Module` (its default rule) and gives a `.ttf` file's bytes as an `ArrayBuffer`
 * (the `Data` rule in `wrangler.jsonc`).
 */
declare module '*.wasm' {
  const module: WebAssembly.Module
  export default module
}

/** A Markdown file's text (the `Text` rule in `wrangler.jsonc`): the AI mode's prompt reads the skill. */
declare module '*.md' {
  const text: string
  export default text
}

declare module '*.ttf' {
  const bytes: ArrayBuffer
  export default bytes
}
