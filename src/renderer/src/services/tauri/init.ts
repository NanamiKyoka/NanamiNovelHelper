import { tauriElectronApi } from './api-adapter'

declare global {
  interface Window {
    electron: typeof tauriElectronApi
    __TAURI_INTERNALS__: unknown
  }
}

export function initTauriApi(): void {
  if (!window.electron) {
    window.electron = tauriElectronApi
  }
}
