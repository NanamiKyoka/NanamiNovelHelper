import { tauriElectronApi } from './api-adapter'

declare global {
  interface Window {
    electron: typeof tauriElectronApi
    __TAURI_INTERNALS__: unknown
  }
}

export function isTauriEnvironment(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

export function initTauriApi(): void {
  if (isTauriEnvironment() && !window.electron) {
    window.electron = tauriElectronApi
  }
}
