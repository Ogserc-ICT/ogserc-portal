// Test helper: makes every sharp binary (native and WebAssembly) fail to load, as on OGSERC's
// VPS, whose virtual CPU has neither x86-64-v2 nor WebAssembly SIMD (D-056). Preload it to
// check that a build or server with IMAGE_PROCESSING=off never needs sharp:
//
//   NODE_OPTIONS="--import ./scripts/block-sharp-binaries.mjs" IMAGE_PROCESSING=off next build

import Module from 'node:module'

const SHARP_BINARY = /^@img\/sharp-[^/]+\/sharp\.node$/
const load = Module._load
Module._load = function (request, ...rest) {
  if (SHARP_BINARY.test(request)) {
    const error = new Error(
      `sharp binary blocked (simulating a CPU that cannot run it): ${request}`,
    )
    error.code = 'MODULE_NOT_FOUND'
    throw error
  }
  return load.call(this, request, ...rest)
}
