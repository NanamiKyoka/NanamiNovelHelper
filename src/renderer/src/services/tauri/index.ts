export * from './project'
export { tauriElectronApi } from './api-adapter'

import { projectApi } from './project'

export const tauriApi = {
  project: projectApi
}
