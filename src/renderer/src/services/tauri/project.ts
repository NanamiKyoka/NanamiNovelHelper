import { invoke } from '@tauri-apps/api/core'

export interface Project {
  id: string
  name: string
  path: string
  dataDir: string
  createdAt: string
  updatedAt: string
}

export interface ProjectInitData {
  project: Project | null
  settings: Record<string, unknown> | null
  vocabularies: Record<string, unknown>[]
  sensitiveWords: Record<string, unknown>[]
  highlightConfig: Record<string, unknown> | null
  relationships: Record<string, unknown>[]
  timelines: Record<string, unknown>[]
  sequenceCharts: Record<string, unknown>[]
  organizations: Record<string, unknown>[]
  maps: Record<string, unknown>[]
  fileTree: Record<string, unknown> | null
}

export const projectApi = {
  create: async (name: string, path: string): Promise<Project> => {
    return invoke<Project>('create_project', { name, path })
  },

  open: async (path: string): Promise<Project> => {
    return invoke<Project>('open_project', { path })
  },

  close: async (): Promise<void> => {
    return invoke('close_project')
  },

  getCurrent: async (): Promise<Project | null> => {
    return invoke<Project | null>('get_current_project')
  },

  getInitData: async (): Promise<ProjectInitData> => {
    return invoke<ProjectInitData>('get_init_data')
  }
}
