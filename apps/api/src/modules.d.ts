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

/**
 * The one Node API the Worker uses (`auth/password.ts`), from the runtime's `node:crypto`
 * (`nodejs_compat` in wrangler.jsonc). Declared here, not with `@types/node`, whose globals
 * (`Buffer`, `process`, Node's `fetch`) would stand over the Workers' own in the whole program.
 */
declare module 'node:crypto' {
  export function scrypt(
    password: Uint8Array | string,
    salt: Uint8Array | string,
    keylen: number,
    options: { N: number; r: number; p: number; maxmem?: number },
    callback: (err: Error | null, derivedKey: Uint8Array) => void,
  ): void
}
