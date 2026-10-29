// Checks that sharp still works when its native binary cannot load, as on a CPU without
// x86-64-v2 (OGSERC's VPS, D-055): sharp must fall back to @img/sharp-wasm32 and still
// resize to the formats the site serves (AVIF, WebP). sharp is resolved from the current
// directory, so the same file checks the repo and the Docker image:
//
//   node scripts/check-sharp-wasm.mjs
//   docker run -i --rm --entrypoint node IMAGE --input-type=module - < scripts/check-sharp-wasm.mjs

import Module, { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'

// Refuse every native sharp binary, so only the WebAssembly fallback is left.
const NATIVE = /^@img\/sharp-(darwin|linux|linuxmusl|win32)-[^/]+\/sharp\.node$/
const load = Module._load
Module._load = function (request, ...rest) {
  if (NATIVE.test(request)) {
    const error = new Error(`Native sharp blocked for this check: ${request}`)
    error.code = 'MODULE_NOT_FOUND'
    throw error
  }
  return load.call(this, request, ...rest)
}

async function main() {
  const require = createRequire(pathToFileURL(`${process.cwd()}/`))
  const sharp = require('sharp')
  const usingWasm = Object.keys(require.cache).some((path) => path.includes('sharp-wasm32'))
  if (!usingWasm) throw new Error('sharp loaded without @img/sharp-wasm32')

  const source = await sharp({
    create: { width: 640, height: 480, channels: 3, background: 'white' },
  })
    .jpeg()
    .toBuffer()
  for (const format of ['avif', 'webp']) {
    const output = await sharp(source).resize(320)[format]().toBuffer()
    const { width, format: written } = await sharp(output).metadata()
    if (width !== 320 || written !== (format === 'avif' ? 'heif' : format)) {
      throw new Error(`${format}: got ${written} at ${width}px`)
    }
  }
  console.log(`sharp ${sharp.versions.sharp} works through WebAssembly (AVIF and WebP)`)
}

main().catch((error) => {
  console.error(`sharp WebAssembly check failed: ${error.message}`)
  process.exit(1)
})
