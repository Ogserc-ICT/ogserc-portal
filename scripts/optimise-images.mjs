// Prepares supplied photographs and emblems for the site (docs/DECISIONS.md D-034).
//
//   node scripts/optimise-images.mjs <folder with the supplied originals>
//
// The originals are not kept in the repository (they are 2 MB or more each). OGSERC holds them,
// and the first set is also in git history (commit 5326dd3). The script:
//   - resizes each hero photo to a 2048px-wide master in src/assets/hero/ (outside public/, so the
//     master itself is never served; next/image serves resized AVIF/WebP copies),
//   - trims the crest's white margin into public/brand/,
//   - strips all metadata (EXIF, GPS, XMP, IPTC, ICC) and then re-reads every output to prove it.
//
// sharp writes no metadata unless .keepMetadata()/.withMetadata() is called, so leaving those out is
// what strips it. .toColorspace('srgb') converts first so colours do not shift when the ICC
// profile is dropped.

import { stat } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const source = process.argv[2]
if (!source) {
  console.error('Usage: node scripts/optimise-images.mjs <folder with the supplied originals>')
  process.exit(1)
}

// Hero slide order agreed with the project owner (step 2b): electricity4, 3, 2.
const heroPhotos = [
  ['electricity4.jpg', 'hero-1.jpg'],
  ['electricity3.jpg', 'hero-2.jpg'],
  ['electricity2.jpg', 'hero-3.jpg'],
]

const WHITE = { r: 255, g: 255, b: 255 }

async function hero(input, output) {
  return sharp(path.join(source, input))
    .rotate() // apply any EXIF orientation before it is discarded
    .resize({ width: 2048, withoutEnlargement: true })
    .toColorspace('srgb')
    .jpeg({ quality: 80, mozjpeg: true })
    .toFile(path.join(root, 'src/assets/hero', output))
}

async function crest() {
  return sharp(path.join(source, 'Ogun-State-Crest.png'))
    .trim({ background: WHITE, threshold: 10 })
    .flatten({ background: WHITE }) // the supplied PNG is fully opaque; drop the unused alpha channel
    .toColorspace('srgb')
    .png({ compressionLevel: 9 })
    .toFile(path.join(root, 'public/brand/ogun-state-crest.png'))
}

/** Fails if an output still carries any metadata block. */
async function assertClean(file) {
  const meta = await sharp(file).metadata()
  const left = ['exif', 'xmp', 'iptc', 'icc'].filter((key) => meta[key])
  if (left.length) throw new Error(`${file} still has metadata: ${left.join(', ')}`)
  return meta
}

const outputs = []
for (const [input, output] of heroPhotos) {
  await hero(input, output)
  outputs.push(path.join(root, 'src/assets/hero', output))
}
await crest()
outputs.push(path.join(root, 'public/brand/ogun-state-crest.png'))

for (const file of outputs) {
  const meta = await assertClean(file)
  const { size } = await stat(file)
  console.log(
    `${path.relative(root, file)}  ${meta.width}x${meta.height}  ${Math.round(size / 1024)} KB  no metadata`,
  )
}
