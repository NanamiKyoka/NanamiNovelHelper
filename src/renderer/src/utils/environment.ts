export type RuntimeEnvironment = 'tauri' | 'web'

let cachedEnv: RuntimeEnvironment | null = null

export function getRuntimeEnvironment(): RuntimeEnvironment {
  if (cachedEnv) return cachedEnv

  if (typeof window !== 'undefined') {
    if ('__TAURI_INTERNALS__' in window) {
      cachedEnv = 'tauri'
      return 'tauri'
    }
  }

  cachedEnv = 'web'
  return 'web'
}

export function isTauri(): boolean {
  return getRuntimeEnvironment() === 'tauri'
}

export function isWeb(): boolean {
  return getRuntimeEnvironment() === 'web'
}
