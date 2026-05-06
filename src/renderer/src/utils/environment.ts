export type RuntimeEnvironment = 'electron' | 'tauri' | 'web'

let cachedEnv: RuntimeEnvironment | null = null

export function getRuntimeEnvironment(): RuntimeEnvironment {
  if (cachedEnv) return cachedEnv

  if (typeof window !== 'undefined') {
    if (window.__TAURI__) {
      cachedEnv = 'tauri'
      return 'tauri'
    }
    if (window.electron) {
      cachedEnv = 'electron'
      return 'electron'
    }
  }

  cachedEnv = 'web'
  return 'web'
}

export function isTauri(): boolean {
  return getRuntimeEnvironment() === 'tauri'
}

export function isElectron(): boolean {
  return getRuntimeEnvironment() === 'electron'
}

export function isWeb(): boolean {
  return getRuntimeEnvironment() === 'web'
}
