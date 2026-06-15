import fs from 'fs'
import fsp from 'fs/promises'
import path from 'path'
import { glob } from 'glob'

const cwd = process.cwd()
const desktopBuild = path.join(cwd, 'apps', 'archclash', 'build')
/** Windows/macOS: prebuild puts service binaries here (Wails bundle). */
const resourcesDir = path.join(desktopBuild, 'resources')
/** Linux: prebuild puts them under sidecar (see scripts/prebuild.mjs SERVICE_DIR). */
const sidecarDir = path.join(desktopBuild, 'sidecar')

/** Only Arch on-disk names; legacy Verge files are migrated once if present. */
const patterns = [
  'arch-clash-service*.exe',
  'arch-clash-service',
  'arch-clash-service-install*.exe',
  'arch-clash-service-install',
  'arch-clash-service-uninstall*.exe',
  'arch-clash-service-uninstall',
]

async function migrateLegacyVergeAliases() {
  if (process.platform !== 'win32') return
  const pairs = [
    ['clash-verge-service.exe', 'arch-clash-service.exe'],
    ['clash-verge-service-install.exe', 'arch-clash-service-install.exe'],
    ['clash-verge-service-uninstall.exe', 'arch-clash-service-uninstall.exe'],
  ]
  for (const [legacy, next] of pairs) {
    const from = path.join(resourcesDir, legacy)
    const to = path.join(resourcesDir, next)
    if (fs.existsSync(from) && !fs.existsSync(to)) {
      await fsp.copyFile(from, to)
      console.log(
        `[wails-prepare] copied ${legacy} → ${next} (you can delete ${legacy})`,
      )
    }
  }
}

async function main() {
  await fsp.mkdir(resourcesDir, { recursive: true })
  await fsp.mkdir(sidecarDir, { recursive: true })

  await migrateLegacyVergeAliases()

  const matched = new Set()
  for (const dir of [resourcesDir, sidecarDir]) {
    for (const pattern of patterns) {
      for (const f of glob.sync(pattern, { cwd: dir, nodir: true })) {
        matched.add(path.join(dir, f))
      }
    }
  }
  const present = matched.size

  if (present === 0) {
    console.error(
      `[wails-prepare] No arch-clash-service bundle in ${resourcesDir} or ${sidecarDir}. Run: pnpm run prebuild`,
    )
    process.exit(1)
  }

  await linkLegacyServiceAliases(resourcesDir)
  if (resourcesDir !== sidecarDir) {
    await linkLegacyServiceAliases(sidecarDir)
  }

  console.log(
    `[wails-prepare] OK (${present} service file(s) under build/resources or build/sidecar)`,
  )
}

/** Upstream sloth/Verge installers still look for legacy basenames at runtime. */
async function linkLegacyServiceAliases(dir) {
  const ext = process.platform === 'win32' ? '.exe' : ''
  const pairs = [
    ['sloth-clash-service', 'arch-clash-service'],
    ['sloth-clash-service-install', 'arch-clash-service-install'],
    ['sloth-clash-service-uninstall', 'arch-clash-service-uninstall'],
    ['clash-verge-service', 'arch-clash-service'],
    ['clash-verge-service-install', 'arch-clash-service-install'],
    ['clash-verge-service-uninstall', 'arch-clash-service-uninstall'],
  ]
  for (const [legacyBase, canonicalBase] of pairs) {
    const canonical = path.join(dir, `${canonicalBase}${ext}`)
    const legacy = path.join(dir, `${legacyBase}${ext}`)
    if (!fs.existsSync(canonical) || fs.existsSync(legacy)) continue
    await fsp.copyFile(canonical, legacy)
  }
}

main().catch((err) => {
  console.error('[wails-prepare] failed:', err)
  process.exit(1)
})
