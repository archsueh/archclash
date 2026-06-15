/**
 * Normalizes apps/archclash/trayicons/mono.png for the macOS
 * status bar tray (template image).
 *
 * Why: drop a 2048x2048 source PNG with generous transparent margins in there
 * and macOS will scale it down on the fly. The subject reads tiny in the menu
 * bar unless you forcibly upscale the icon.
 *
 * This script crops the source image to a perfect square centered around the
 * optical/visual center of the logo, then resizes it to 44x44px. This prevents
 * any vertical/horizontal misalignment in the macOS menu bar.
 *
 * Run with `node scripts/optimize-tray-mono.mjs` after replacing the source
 * icon. Safe to re-run.
 */
import path from 'node:path'
import fs from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

const target = path.join(repoRoot, 'apps', 'archclash', 'trayicons', 'mono.png')

const svgSrc = path.join(repoRoot, 'docs', 'appicon.svg')
const pngSrcPreferred = path.join(repoRoot, 'docs', 'appicon-main.png')
const pngSrcFallback = path.join(repoRoot, 'docs', 'appicon.png')

const MAX_SIDE = 44

async function main() {
  // 1. Determine source of truth
  let src = svgSrc
  let exists = await fs
    .stat(src)
    .then(() => true)
    .catch(() => false)
  if (!exists) {
    src = pngSrcPreferred
    exists = await fs
      .stat(src)
      .then(() => true)
      .catch(() => false)
  }
  if (!exists) {
    src = pngSrcFallback
    exists = await fs
      .stat(src)
      .then(() => true)
      .catch(() => false)
  }
  if (!exists) {
    console.error(
      '[optimize-tray-mono] No source icon found in docs/ (appicon.svg, appicon-main.png, appicon.png)',
    )
    process.exit(1)
  }

  console.log(
    `[optimize-tray-mono] Using source icon: ${path.relative(repoRoot, src)}`,
  )

  // 2. Load the source image and get its dimensions
  const image = sharp(src)
  const metadata = await image.metadata()
  const imgWidth = metadata.width
  const imgHeight = metadata.height

  // 3. Find the trimmed bounding box of non-transparent pixels
  const { info } = await image
    .clone()
    .trim({ threshold: 1 })
    .toBuffer({ resolveWithObject: true })

  const left = Math.abs(info.trimOffsetLeft || 0)
  const top = Math.abs(info.trimOffsetTop || 0)
  const width = info.width
  const height = info.height

  // 4. Calculate the optical center (middle of the canvas)
  const cx = imgWidth / 2
  const cy = imgHeight / 2

  // 5. Calculate the maximum distance from the center to any edge of the bounding box
  const distLeft = cx - left
  const distRight = left + width - cx
  const distTop = cy - top
  const distBottom = top + height - cy

  const maxDist = Math.ceil(Math.max(distLeft, distRight, distTop, distBottom))

  // 6. Crop box centered at (cx, cy) with side length 2 * maxDist
  const cropLeft = Math.max(0, Math.floor(cx - maxDist))
  const cropTop = Math.max(0, Math.floor(cy - maxDist))
  const cropSize = Math.min(imgWidth, imgHeight, maxDist * 2)

  console.log(
    `[optimize-tray-mono] Original: ${imgWidth}x${imgHeight} | Bounding Box: [L:${left}, T:${top}, W:${width}, H:${height}]`,
  )
  console.log(
    `[optimize-tray-mono] Optical Crop: [L:${cropLeft}, T:${cropTop}, W:${cropSize}, H:${cropSize}]`,
  )

  // 7. Perform the extraction, resize to MAX_SIDE (44px) to make it a perfect square, and write
  const buf = await image
    .extract({
      left: cropLeft,
      top: cropTop,
      width: cropSize,
      height: cropSize,
    })
    .resize(MAX_SIDE, MAX_SIDE)
    .png({ compressionLevel: 9, palette: false })
    .toBuffer()

  // Ensure output directory exists
  await fs.mkdir(path.dirname(target), { recursive: true })
  await fs.writeFile(target, buf)

  const finalMeta = await sharp(target).metadata()
  console.log(
    `[optimize-tray-mono] Successfully generated perfect square tray icon: ${finalMeta.width}x${finalMeta.height} (${buf.length} B)`,
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
