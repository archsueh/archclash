/**
 * Regenerate GitHub-facing branding assets from docs/appicon.png.
 * Replaces legacy Sloth Clash readmelogo / social preview artwork.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import sharp from 'sharp'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const docsDir = path.join(repoRoot, 'docs')
const preferred = path.join(docsDir, 'appicon-main.png')
const fallback = path.join(docsDir, 'appicon.png')
const iconSrc = fs.existsSync(preferred) ? preferred : fallback

async function writeReadmeLogo() {
  const size = 512
  const icon = await sharp(iconSrc)
    .resize(300, 300, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer()

  const titleSvg =
    Buffer.from(`<svg width="${size}" height="120" xmlns="http://www.w3.org/2000/svg">
  <text x="256" y="78" font-family="system-ui, -apple-system, Segoe UI, sans-serif" font-size="58" font-weight="700" fill="#c9a86c" text-anchor="middle">ArchClash</text>
</svg>`)

  const out = path.join(docsDir, 'readmelogo.png')
  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 18, g: 17, b: 16, alpha: 1 },
    },
  })
    .composite([
      { input: titleSvg, top: 24, left: 0 },
      { input: icon, top: 150, left: 106 },
    ])
    .png()
    .toFile(out)
  console.log('[branding] wrote', path.relative(repoRoot, out))
}

async function writeSocialPreview() {
  const width = 1280
  const height = 640
  const icon = await sharp(iconSrc)
    .resize(220, 220, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer()

  const copySvg =
    Buffer.from(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <text x="300" y="250" font-family="system-ui, -apple-system, Segoe UI, sans-serif" font-size="72" font-weight="700" fill="#f2efe8">ArchClash</text>
  <text x="300" y="320" font-family="system-ui, -apple-system, Segoe UI, sans-serif" font-size="30" fill="#a39e96">Mihomo desktop client · Wails · Go · React</text>
  <text x="300" y="370" font-family="system-ui, -apple-system, Segoe UI, sans-serif" font-size="24" fill="#c9a86c">Windows · macOS · Linux</text>
</svg>`)

  const out = path.join(docsDir, 'social-preview.png')
  await sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 18, g: 17, b: 16, alpha: 1 },
    },
  })
    .composite([
      { input: copySvg, top: 0, left: 0 },
      { input: icon, top: 210, left: 48 },
    ])
    .png()
    .toFile(out)
  console.log('[branding] wrote', path.relative(repoRoot, out))
}

function titleBarSvg(width, barHeight) {
  const titleY = Math.round(barHeight * 0.62)
  const lightsX = width - Math.round(barHeight * 0.95)
  const lightR = Math.round(barHeight * 0.11)
  const lightGap = Math.round(barHeight * 0.34)
  const lightY = Math.round(barHeight * 0.48)
  return Buffer.from(`<svg width="${width}" height="${barHeight}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${width}" height="${barHeight}" fill="#121110"/>
  <text x="${Math.round(width / 2)}" y="${titleY}" font-family="system-ui, -apple-system, 'SF Pro Text', sans-serif" font-size="${Math.round(barHeight * 0.38)}" font-weight="500" fill="#d8d2c8" text-anchor="middle">ArchClash</text>
  <circle cx="${lightsX}" cy="${lightY}" r="${lightR}" fill="#ff5f57"/>
  <circle cx="${lightsX + lightGap}" cy="${lightY}" r="${lightR}" fill="#febc2e"/>
  <circle cx="${lightsX + lightGap * 2}" cy="${lightY}" r="${lightR}" fill="#28c840"/>
</svg>`)
}

/** Replace legacy "Sloth Clash" window titles in README screenshots. */
async function patchScreenshotTitleBars() {
  const shotsDir = path.join(docsDir, 'screenshots')
  if (!fs.existsSync(shotsDir)) return

  const skip = new Set(['settings.png'])
  for (const name of fs
    .readdirSync(shotsDir)
    .filter((f) => f.endsWith('.png'))) {
    if (skip.has(name)) continue
    const file = path.join(shotsDir, name)
    const meta = await sharp(file).metadata()
    const width = meta.width ?? 0
    const height = meta.height ?? 0
    if (!width || !height) continue

    const barHeight = Math.max(48, Math.round(height * 0.055))
    const overlay = titleBarSvg(width, barHeight)
    const tmp = `${file}.tmp`
    await sharp(file)
      .composite([{ input: overlay, top: 0, left: 0 }])
      .png()
      .toFile(tmp)
    fs.renameSync(tmp, file)
    console.log('[branding] patched title bar:', path.relative(repoRoot, file))
  }
}

/** Cover legacy corner mascot on refreshed settings capture. */
async function replaceSettingsCornerIcon() {
  const file = path.join(docsDir, 'screenshots', 'settings.png')
  if (!fs.existsSync(file)) return

  const meta = await sharp(file).metadata()
  const width = meta.width ?? 0
  if (!width) return

  const size = Math.max(44, Math.round(width * 0.052))
  const pad = Math.round(size * 0.35)
  const icon = await sharp(iconSrc)
    .resize(size, size, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer()

  const tmp = `${file}.tmp`
  await sharp(file)
    .composite([{ input: icon, top: pad, left: width - size - pad }])
    .png()
    .toFile(tmp)
  fs.renameSync(tmp, file)
  console.log(
    '[branding] replaced settings corner icon:',
    path.relative(repoRoot, file),
  )
}

/** Drop legacy service-error chrome from settings capture. */
async function trimSettingsScreenshot() {
  const file = path.join(docsDir, 'screenshots', 'settings.png')
  if (!fs.existsSync(file)) return

  const meta = await sharp(file).metadata()
  const width = meta.width ?? 0
  const height = meta.height ?? 0
  if (!width || !height) return

  const cropBottom = Math.min(Math.round(height * 0.09), 80)
  const nextHeight = height - cropBottom
  if (nextHeight <= 0) return

  const tmp = `${file}.tmp`
  await sharp(file)
    .extract({ left: 0, top: 0, width, height: nextHeight })
    .png()
    .toFile(tmp)
  fs.renameSync(tmp, file)
  console.log(
    '[branding] trimmed settings footer:',
    path.relative(repoRoot, file),
  )
}

async function main() {
  if (!fs.existsSync(iconSrc)) {
    console.error('[branding] missing icon source:', iconSrc)
    process.exit(1)
  }
  await writeReadmeLogo()
  await writeSocialPreview()
  await patchScreenshotTitleBars()
  await trimSettingsScreenshot()
  await replaceSettingsCornerIcon()
}

main().catch((err) => {
  console.error('[branding] failed:', err)
  process.exit(1)
})
