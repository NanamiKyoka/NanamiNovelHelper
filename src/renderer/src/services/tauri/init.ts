import { tauriApi } from './api-adapter'

declare global {
  interface Window {
    api: typeof tauriApi
    __TAURI_INTERNALS__: unknown
  }
  const __APP_VERSION__: string
}

export function initTauriApi(): void {
  if (!window.api) {
    window.api = tauriApi
  }
}
