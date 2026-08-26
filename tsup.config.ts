import { defineConfig } from 'tsup'

/** Package name; the client bundle registers its factory under this id. */
const ID = 'dsh-client-ui-brand'

/** Node-half imports a real install resolves on disk. */
const nodeExternal = [
  '@deepseek-ai/cordis',
  '@deepseek-ai/dsh-host-webserver',
]

/**
 * Specifiers the browser module table answers: the shell's platform seed plus
 * the preloaded runtime bundle. Anything else must inline — the injected
 * `require` throws on a specifier the table does not carry.
 */
const clientExternal = [
  'react',
  'react/jsx-runtime',
  'react-dom',
  'react-dom/client',
  '@deepseek-ai/cordis',
  '@deepseek-ai/dsh-client-ui-slots',
  '@deepseek-ai/dsh-client-ui-primitives',
  '@deepseek-ai/dsh-client-runtime/client',
]

export default defineConfig([
  {
    entry: { index: 'src/index.ts' },
    format: ['esm'],
    platform: 'node',
    target: 'node18',
    dts: true,
    sourcemap: true,
    clean: true,
    external: nodeExternal,
    outDir: 'lib',
  },
  {
    entry: { 'client/index': 'src/client/index.ts' },
    // Factory-form CJS, not ESM: the host serves this artifact as a classic
    // script, and the wrapper below is what registers the module. A bundle
    // that loads without calling __ModuleLoader__.load fails plugin boot.
    format: ['cjs'],
    platform: 'browser',
    target: 'es2022',
    // `exports["./client"]` names lib/client/index.js, so the cjs default
    // .cjs extension would leave that entry pointing at a missing file.
    outExtension: () => ({ js: '.js' }),
    // Types come from the separate declaration build below; emitting them here
    // would fold the banner into the declaration output.
    dts: false,
    sourcemap: true,
    clean: false,
    external: clientExternal,
    outDir: 'lib',
    banner: {
      js: `window.__ModuleLoader__.load({ id: ${JSON.stringify(ID)}, factory: (require) => {\n`
        + 'var module = { exports: {} }; var exports = module.exports;',
    },
    footer: { js: 'return module.exports; } });' },
  },
  {
    entry: { 'client/index': 'src/client/index.ts' },
    format: ['esm'],
    dts: { only: true },
    clean: false,
    external: clientExternal,
    outDir: 'lib',
  },
])
