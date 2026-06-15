/** Mihomo / Clash Party–compatible per-profile override script scaffold. */
export const DEFAULT_OVERRIDE_SCRIPT = `function main(config) {
  return config;
}
`

export function scriptTemplateFromProfile(
  profiles: Array<{ id?: string; scriptTemplate?: string }> | undefined,
  profileId: string,
): string {
  const p = profiles?.find((x) => x.id === profileId)
  return String(p?.scriptTemplate ?? '')
}
