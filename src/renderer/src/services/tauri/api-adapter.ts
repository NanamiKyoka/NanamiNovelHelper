import { invoke } from '@tauri-apps/api/core'
import { listen, type UnlistenFn } from '@tauri-apps/api/event'
import { open, save } from '@tauri-apps/plugin-dialog'
import { platform } from '@tauri-apps/plugin-os'

function getPlatform(): string {
  try {
    return platform()
  } catch {
    if (typeof navigator !== 'undefined') {
      const ua = navigator.userAgent.toLowerCase()
      if (ua.includes('win')) return 'win32'
      if (ua.includes('mac')) return 'darwin'
      if (ua.includes('linux')) return 'linux'
    }
    return 'unknown'
  }
}

export const tauriElectronApi = {
  window: {
    minimize: () => invoke('window_minimize'),
    maximize: () => invoke('window_maximize'),
    close: () => invoke('window_close'),
    isMaximized: (): Promise<boolean> => invoke('window_is_maximized'),
    setFullScreen: (isFullscreen: boolean) => invoke('window_set_fullscreen', { isFullscreen }),
    isFullScreen: (): Promise<boolean> => invoke('window_is_fullscreen'),
    onMaximizeChange: (callback: (isMaximized: boolean) => void) => {
      let unlisten: UnlistenFn | null = null
      listen<boolean>('window-maximize-change', (event) => {
        callback(event.payload)
      }).then(fn => { unlisten = fn })
      return () => { unlisten?.() }
    },
    removeMaximizeListener: () => {},
    onFullScreenChange: (callback: (isFullscreen: boolean) => void) => {
      let unlisten: UnlistenFn | null = null
      listen<boolean>('window-fullscreen-change', (event) => {
        callback(event.payload)
      }).then(fn => { unlisten = fn })
      return () => { unlisten?.() }
    },
    removeFullScreenListener: () => {},
    onFileChange: (callback: (event: { type: string; path: string }) => void) => {
      let unlisten: UnlistenFn | null = null
      listen<Record<string, unknown>>('file-change', (event) => {
        const payload = event.payload
        if (payload && typeof payload === 'object' && 'changes' in payload) {
          const changes = (payload as { changes: Array<{ type: string; path: string }> }).changes
          for (const change of changes) {
            callback({ type: change.type, path: change.path })
          }
        }
      }).then(fn => { unlisten = fn })
      return () => { unlisten?.() }
    },
    removeFileChangeListener: () => {}
  },

  project: {
    create: (options: { name: string; parentPath: string; description?: string; author?: string; tags?: string[] }) =>
      invoke('create_project', { name: options.name, path: options.parentPath }),
    open: (path: string) => invoke('open_project', { path }),
    close: () => invoke('close_project'),
    getCurrent: () => invoke('get_current_project'),
    updateInfo: (info: Record<string, unknown>) => invoke('update_project_info', { info }),
    getRecent: () => invoke('get_recent_projects'),
    removeRecent: (path: string) => invoke('remove_recent_project', { path }),
    clearRecent: () => invoke('clear_recent_projects'),
    showOpenDialog: () => open({ directory: true, title: '打开项目' }).then(p => p || null),
    showCreateDialog: () => open({ directory: true, title: '创建项目' }).then(p => p || null),
    isValid: (path: string) => invoke('file_exists', { path: `${path}/.novelhelper/data/project.json` }),
    getStats: (_path: string) => Promise.resolve({}),
    getInitData: () => invoke('get_init_data')
  },

  vocabulary: {
    loadTypes: () => invoke('vocabulary_load_types'),
    saveTypes: (types: unknown[]) => invoke('vocabulary_save_types', { types }),
    addType: (type: Record<string, unknown>) =>
      invoke('vocabulary_add_type', {
        name: type.name,
        color: type.color,
        isBuiltIn: type.isBuiltIn ?? false,
        description: type.description
      }),
    updateType: (id: string, updates: Record<string, unknown>) =>
      invoke('vocabulary_update_type', { id, updates }),
    deleteType: (id: string) => invoke('vocabulary_delete_type', { id }),
    loadEntries: (typeId?: string) => invoke('vocabulary_load_entries', { typeId: typeId ?? null }),
    saveEntries: (typeId: string, entries: unknown[]) =>
      invoke('vocabulary_save_entries', { typeId, entries }),
    addEntry: (entry: Record<string, unknown>) => invoke('vocabulary_add_entry', { entry }),
    updateEntry: (id: string, updates: Record<string, unknown>) =>
      invoke('vocabulary_update_entry', { id, updates }),
    deleteEntry: (id: string) => invoke('vocabulary_delete_entry', { id }),
    createLinkedFile: (_entry: unknown) => Promise.resolve(null),
    linkFile: (_entryId: string, _filePath: string) => Promise.resolve(),
    unlinkFile: (_entryId: string) => Promise.resolve(),
    getSettings: () => Promise.resolve({ autoCreateVocabularyFile: true }),
    updateSettings: (_settings: Record<string, unknown>) => Promise.resolve()
  },

  sensitive: {
    loadWords: () => invoke('sensitive_load_words'),
    saveWords: (words: unknown[]) => invoke('sensitive_save_words', { words }),
    addWord: (word: Record<string, unknown>) => invoke('sensitive_add_word', { word }),
    updateWord: (id: string, updates: Record<string, unknown>) =>
      invoke('sensitive_update_word', { id, updates }),
    deleteWord: (id: string) => invoke('sensitive_delete_word', { id }),
    importWords: (words: unknown[]) => invoke('sensitive_import_words', { words })
  },

  highlight: {
    loadConfig: () => invoke('highlight_get_config'),
    saveConfig: (config: Record<string, unknown>) => invoke('highlight_save_config', { config })
  },

  settings: {
    global: {
      getAll: () => invoke('settings_get_global'),
      update: (settings: Record<string, unknown>) => invoke('settings_update_global', { settings }),
      reset: () => invoke('settings_get_global'),
      getTheme: () => invoke('settings_get_global').then((s: Record<string, unknown>) => (s as Record<string, unknown>).theme as Record<string, unknown>),
      updateTheme: (theme: Record<string, unknown>) =>
        invoke('settings_update_global', { settings: { theme } }),
      getWindowState: () => invoke('settings_get_global').then((s: Record<string, unknown>) => (s as Record<string, unknown>).window as Record<string, unknown>),
      updateWindowState: (window: Record<string, unknown>) =>
        invoke('settings_update_global', { settings: { window } }),
      getLanguage: () => invoke('settings_get_global').then((s: Record<string, unknown>) => (s as Record<string, unknown>).language as string),
      setLanguage: (language: string) =>
        invoke('settings_update_global', { settings: { language } }),
      getSidebarWidth: () => invoke('settings_get_global').then((s: Record<string, unknown>) => (s as Record<string, unknown>).sidebarWidth as number),
      setSidebarWidth: (sidebarWidth: number) =>
        invoke('settings_update_global', { settings: { sidebarWidth } }),
      getLayout: () => invoke('settings_get_global').then((s: Record<string, unknown>) => (s as Record<string, unknown>).layout as Record<string, unknown>),
      updateLayout: (layout: Record<string, unknown>) =>
        invoke('settings_update_global', { settings: { layout } }),
      getBadgeVisibility: () => invoke('settings_get_global').then((s: Record<string, unknown>) => ((s as Record<string, unknown>).layout as Record<string, unknown>)?.badgeVisibility as Record<string, unknown>),
      updateBadgeVisibility: (badgeVisibility: Record<string, unknown>) =>
        invoke('settings_update_global', { settings: { layout: { badgeVisibility } } }),
      getBadgeOrder: () => invoke('settings_get_global').then((s: Record<string, unknown>) => ((s as Record<string, unknown>).layout as Record<string, unknown>)?.badgeOrder as string[]),
      updateBadgeOrder: (badgeOrder: string[]) =>
        invoke('settings_update_global', { settings: { layout: { badgeOrder } } }),
      getSidebarBadgeVisibility: () => invoke('settings_get_global').then((s: Record<string, unknown>) => ((s as Record<string, unknown>).layout as Record<string, unknown>)?.sidebarBadgeVisibility as Record<string, unknown>),
      updateSidebarBadgeVisibility: (sidebarBadgeVisibility: Record<string, unknown>) =>
        invoke('settings_update_global', { settings: { layout: { sidebarBadgeVisibility } } }),
      getSidebarBadgeOrder: () => invoke('settings_get_global').then((s: Record<string, unknown>) => ((s as Record<string, unknown>).layout as Record<string, unknown>)?.sidebarBadgeOrder as string[]),
      updateSidebarBadgeOrder: (sidebarBadgeOrder: string[]) =>
        invoke('settings_update_global', { settings: { layout: { sidebarBadgeOrder } } }),
      getShowHiddenFiles: () => invoke('settings_get_global').then((s: Record<string, unknown>) => ((s as Record<string, unknown>).layout as Record<string, unknown>)?.showHiddenFiles as boolean),
      setShowHiddenFiles: (showHiddenFiles: boolean) =>
        invoke('settings_update_global', { settings: { layout: { showHiddenFiles } } }),
      getApiKey: (keyName: string) => invoke('secure_get_api_key', { keyName }),
      setApiKey: (keyName: string, value: string) => invoke('secure_set_api_key', { keyName, value }),
      deleteApiKey: (keyName: string) => invoke('secure_delete_api_key', { keyName }),
      getApiKeyNames: () => invoke('secure_get_api_key_names'),
      isEncryptionAvailable: () => invoke('secure_is_encryption_available')
    },
    project: {
      getAll: () => invoke('settings_get_project'),
      update: (settings: Record<string, unknown>) => invoke('settings_update_project', { settings }),
      saveNow: () => Promise.resolve(),
      reset: () => invoke('settings_get_project'),
      getEditor: () => invoke('settings_get_project').then((s: Record<string, unknown>) => (s as Record<string, unknown>).editor as Record<string, unknown>),
      updateEditor: (editor: Record<string, unknown>) =>
        invoke('settings_update_project', { settings: { editor } }),
      getHighlight: () => invoke('settings_get_project').then((s: Record<string, unknown>) => (s as Record<string, unknown>).highlight as Record<string, unknown>),
      updateHighlight: (highlight: Record<string, unknown>) =>
        invoke('settings_update_project', { settings: { highlight } }),
      getBackup: () => invoke('settings_get_project').then((s: Record<string, unknown>) => (s as Record<string, unknown>).backup as Record<string, unknown>),
      updateBackup: (backup: Record<string, unknown>) =>
        invoke('settings_update_project', { settings: { backup } }),
      getExpandedFolders: () => invoke('settings_get_project').then((s: Record<string, unknown>) => (s as Record<string, unknown>).expandedFolders as string[]),
      setExpandedFolders: (expandedFolders: string[]) =>
        invoke('settings_update_project', { settings: { expandedFolders } }),
      getHiddenItems: () => invoke('settings_get_project').then((s: Record<string, unknown>) => (s as Record<string, unknown>).hiddenItems as string[]),
      setHiddenItems: (hiddenItems: string[]) =>
        invoke('settings_update_project', { settings: { hiddenItems } })
    }
  },

  backup: {
    create: () => invoke('create_backup'),
    list: () => invoke('list_backups'),
    restore: (filename: string) => invoke('restore_backup', { filename }),
    delete: (filename: string) => invoke('delete_backup', { filename }),
    export: (filename: string) => invoke('export_backup', { filename }),
    import: () => Promise.resolve(null)
  },

  relationship: {
    getList: () => invoke('graph_get_list', { subDir: 'relationships' }),
    get: (graphId: string) => invoke('graph_get', { subDir: 'relationships', id: graphId }),
    create: (options: Record<string, unknown>) => invoke('graph_create', { subDir: 'relationships', data: options }),
    update: (graphId: string, updates: Record<string, unknown>) =>
      invoke('graph_update', { subDir: 'relationships', id: graphId, updates }),
    delete: (graphId: string) => invoke('graph_delete', { subDir: 'relationships', id: graphId }),
    addNode: (graphId: string, node: Record<string, unknown>) =>
      invoke('graph_update', { subDir: 'relationships', id: graphId, updates: { $push: { nodes: node } } }),
    updateNode: (graphId: string, nodeId: string, updates: Record<string, unknown>) =>
      invoke('graph_update', { subDir: 'relationships', id: graphId, updates: { nodes: { [nodeId]: updates } } }),
    deleteNode: (graphId: string, nodeId: string) =>
      invoke('graph_update', { subDir: 'relationships', id: graphId, updates: { $pull: { nodes: { id: nodeId } } } }),
    addEdge: (graphId: string, edge: Record<string, unknown>) =>
      invoke('graph_update', { subDir: 'relationships', id: graphId, updates: { $push: { edges: edge } } }),
    updateEdge: (graphId: string, edgeId: string, updates: Record<string, unknown>) =>
      invoke('graph_update', { subDir: 'relationships', id: graphId, updates: { edges: { [edgeId]: updates } } }),
    deleteEdge: (graphId: string, edgeId: string) =>
      invoke('graph_update', { subDir: 'relationships', id: graphId, updates: { $pull: { edges: { id: edgeId } } } }),
    getRelationTypes: (graphId: string) =>
      invoke('graph_get', { subDir: 'relationships', id: graphId }).then((g: Record<string, unknown> | null) => g?.customRelationTypes as unknown[] ?? []),
    addRelationType: (graphId: string, type: Record<string, unknown>) =>
      invoke('graph_update', { subDir: 'relationships', id: graphId, updates: { $push: { customRelationTypes: type } } }),
    updateRelationType: (graphId: string, typeId: string, updates: Record<string, unknown>) =>
      invoke('graph_update', { subDir: 'relationships', id: graphId, updates: { customRelationTypes: { [typeId]: updates } } }),
    deleteRelationType: (graphId: string, typeId: string) =>
      invoke('graph_update', { subDir: 'relationships', id: graphId, updates: { $pull: { customRelationTypes: { id: typeId } } } }),
    saveThumbnail: (graphId: string, dataUrl: string) =>
      invoke('graph_save_thumbnail', { subDir: 'relationships', id: graphId, dataUrl }),
    getThumbnailPath: (graphId: string) =>
      invoke('graph_get_thumbnail_path', { subDir: 'relationships', id: graphId }),
    export: (graphId: string) => invoke('graph_export', { subDir: 'relationships', id: graphId }),
    import: (jsonContent: string) => invoke('graph_import', { subDir: 'relationships', jsonContent }),
    showExportDialog: (graphName: string) =>
      save({ defaultPath: `${graphName}.json5`, filters: [{ name: 'JSON5', extensions: ['json5'] }] }),
    showImportDialog: () =>
      open({ filters: [{ name: 'JSON5', extensions: ['json5'] }, { name: 'JSON', extensions: ['json'] }], multiple: false }),
    reorderGraphs: (graphIds: string[]) =>
      invoke('graph_reorder', { subDir: 'relationships', ids: graphIds })
  },

  timeline: {
    getList: () => invoke('graph_get_list', { subDir: 'timelines' }),
    get: (timelineId: string) => invoke('graph_get', { subDir: 'timelines', id: timelineId }),
    create: (options: Record<string, unknown>) => invoke('graph_create', { subDir: 'timelines', data: options }),
    update: (timelineId: string, updates: Record<string, unknown>) =>
      invoke('graph_update', { subDir: 'timelines', id: timelineId, updates }),
    delete: (timelineId: string) => invoke('graph_delete', { subDir: 'timelines', id: timelineId }),
    addNode: (timelineId: string, node: Record<string, unknown>) =>
      invoke('graph_update', { subDir: 'timelines', id: timelineId, updates: { $push: { nodes: node } } }),
    updateNode: (timelineId: string, nodeId: string, updates: Record<string, unknown>) =>
      invoke('graph_update', { subDir: 'timelines', id: timelineId, updates: { nodes: { [nodeId]: updates } } }),
    deleteNode: (timelineId: string, nodeId: string) =>
      invoke('graph_update', { subDir: 'timelines', id: timelineId, updates: { $pull: { nodes: { id: nodeId } } } }),
    batchDeleteNodes: (_timelineId: string, _nodeIds: string[]) => Promise.resolve(0),
    moveNode: (_timelineId: string, _nodeId: string, _newOrder: number) => Promise.resolve(null),
    batchMoveNodes: (_timelineId: string, _nodeIds: string[], _targetOrder: number) => Promise.resolve(null),
    updateNodes: (timelineId: string, nodes: unknown[]) =>
      invoke('graph_update', { subDir: 'timelines', id: timelineId, updates: { nodes } }),
    createBranch: (_parentTimelineId: string, _branchFromNodeId: string, _name?: string) => Promise.resolve(null),
    mergeBranch: (_branchTimelineId: string, _targetTimelineId: string, _targetNodeId?: string) => Promise.resolve(false),
    getBranches: (_parentTimelineId: string) => Promise.resolve([]),
    getBranchSourceNode: (_timelineId: string) => Promise.resolve(null),
    saveThumbnail: (timelineId: string, dataUrl: string) =>
      invoke('graph_save_thumbnail', { subDir: 'timelines', id: timelineId, dataUrl }),
    getThumbnailPath: (timelineId: string) =>
      invoke('graph_get_thumbnail_path', { subDir: 'timelines', id: timelineId }),
    export: (timelineId: string) => invoke('graph_export', { subDir: 'timelines', id: timelineId }),
    exportMarkdown: (_timelineId: string) => Promise.resolve(null),
    import: (jsonContent: string) => invoke('graph_import', { subDir: 'timelines', jsonContent }),
    showExportDialog: (timelineName: string) =>
      save({ defaultPath: `${timelineName}.json5`, filters: [{ name: 'JSON5', extensions: ['json5'] }] }),
    showImportDialog: () =>
      open({ filters: [{ name: 'JSON5', extensions: ['json5'] }], multiple: false }),
    saveExportFile: (_filePath: string, _content: string) => Promise.resolve(false),
    readImportFile: (_filePath: string) => Promise.resolve(null),
    reorder: (timelineIds: string[]) =>
      invoke('graph_reorder', { subDir: 'timelines', ids: timelineIds })
  },

  sequenceChart: {
    getList: () => invoke('graph_get_list', { subDir: 'sequence-charts' }),
    get: (chartId: string) => invoke('graph_get', { subDir: 'sequence-charts', id: chartId }),
    create: (options: Record<string, unknown>) => invoke('graph_create', { subDir: 'sequence-charts', data: options }),
    update: (chartId: string, updates: Record<string, unknown>) =>
      invoke('graph_update', { subDir: 'sequence-charts', id: chartId, updates }),
    delete: (chartId: string) => invoke('graph_delete', { subDir: 'sequence-charts', id: chartId }),
    addEvent: (chartId: string, event: Record<string, unknown>) =>
      invoke('graph_update', { subDir: 'sequence-charts', id: chartId, updates: { $push: { events: event } } }),
    updateEvent: (chartId: string, eventId: string, updates: Record<string, unknown>) =>
      invoke('graph_update', { subDir: 'sequence-charts', id: chartId, updates: { events: { [eventId]: updates } } }),
    deleteEvent: (chartId: string, eventId: string) =>
      invoke('graph_update', { subDir: 'sequence-charts', id: chartId, updates: { $pull: { events: { id: eventId } } } }),
    batchDeleteEvents: (_chartId: string, _eventIds: string[]) => Promise.resolve(0),
    moveEvent: (_chartId: string, _eventId: string, _newOrder: number) => Promise.resolve(null),
    updateEventTime: (_chartId: string, _eventId: string, _cellStart: number, _cellEnd: number) => Promise.resolve(null),
    updateEvents: (chartId: string, events: unknown[]) =>
      invoke('graph_update', { subDir: 'sequence-charts', id: chartId, updates: { events } }),
    getEventTypes: (chartId: string) =>
      invoke('graph_get', { subDir: 'sequence-charts', id: chartId }).then((g: Record<string, unknown> | null) => g?.customEventTypes as unknown[] ?? []),
    addEventType: (chartId: string, type: Record<string, unknown>) =>
      invoke('graph_update', { subDir: 'sequence-charts', id: chartId, updates: { $push: { customEventTypes: type } } }),
    updateEventType: (chartId: string, typeId: string, updates: Record<string, unknown>) =>
      invoke('graph_update', { subDir: 'sequence-charts', id: chartId, updates: { customEventTypes: { [typeId]: updates } } }),
    deleteEventType: (chartId: string, typeId: string) =>
      invoke('graph_update', { subDir: 'sequence-charts', id: chartId, updates: { $pull: { customEventTypes: { id: typeId } } } }),
    saveThumbnail: (chartId: string, dataUrl: string) =>
      invoke('graph_save_thumbnail', { subDir: 'sequence-charts', id: chartId, dataUrl }),
    getThumbnailPath: (chartId: string) =>
      invoke('graph_get_thumbnail_path', { subDir: 'sequence-charts', id: chartId }),
    export: (chartId: string) => invoke('graph_export', { subDir: 'sequence-charts', id: chartId }),
    exportMarkdown: (_chartId: string) => Promise.resolve(null),
    import: (jsonContent: string) => invoke('graph_import', { subDir: 'sequence-charts', jsonContent }),
    showExportDialog: (chartName: string) =>
      save({ defaultPath: `${chartName}.json5`, filters: [{ name: 'JSON5', extensions: ['json5'] }] }),
    showImportDialog: () =>
      open({ filters: [{ name: 'JSON5', extensions: ['json5'] }], multiple: false }),
    saveExportFile: (_filePath: string, _content: string) => Promise.resolve(false),
    readImportFile: (_filePath: string) => Promise.resolve(null),
    reorderCharts: (chartIds: string[]) =>
      invoke('graph_reorder', { subDir: 'sequence-charts', ids: chartIds })
  },

  organization: {
    getList: () => invoke('graph_get_list', { subDir: 'organizations' }),
    get: (graphId: string) => invoke('graph_get', { subDir: 'organizations', id: graphId }),
    create: (options: Record<string, unknown>) => invoke('graph_create', { subDir: 'organizations', data: options }),
    update: (graphId: string, updates: Record<string, unknown>) =>
      invoke('graph_update', { subDir: 'organizations', id: graphId, updates }),
    delete: (graphId: string) => invoke('graph_delete', { subDir: 'organizations', id: graphId }),
    addNode: (graphId: string, options: Record<string, unknown>) =>
      invoke('graph_update', { subDir: 'organizations', id: graphId, updates: { $push: { nodes: options } } }),
    updateNode: (graphId: string, nodeId: string, updates: Record<string, unknown>) =>
      invoke('graph_update', { subDir: 'organizations', id: graphId, updates: { nodes: { [nodeId]: updates } } }),
    deleteNode: (graphId: string, nodeId: string) =>
      invoke('graph_update', { subDir: 'organizations', id: graphId, updates: { $pull: { nodes: { id: nodeId } } } }),
    moveNode: (graphId: string, nodeId: string, newParentId: string | undefined) =>
      invoke('graph_update', { subDir: 'organizations', id: graphId, updates: { nodes: { [nodeId]: { parentId: newParentId } } } }),
    getChildren: (graphId: string, _parentId: string | undefined) =>
      invoke('graph_get', { subDir: 'organizations', id: graphId }).then((g: Record<string, unknown> | null) => (g?.nodes as unknown[]) ?? []),
    getDescendants: (graphId: string, _nodeId: string) =>
      invoke('graph_get', { subDir: 'organizations', id: graphId }).then((g: Record<string, unknown> | null) => (g?.nodes as unknown[]) ?? []),
    getAncestors: (graphId: string, _nodeId: string) =>
      invoke('graph_get', { subDir: 'organizations', id: graphId }).then((g: Record<string, unknown> | null) => (g?.nodes as unknown[]) ?? []),
    saveThumbnail: (graphId: string, dataUrl: string) =>
      invoke('graph_save_thumbnail', { subDir: 'organizations', id: graphId, dataUrl }),
    getThumbnailPath: (graphId: string) =>
      invoke('graph_get_thumbnail_path', { subDir: 'organizations', id: graphId }),
    export: (graphId: string) => invoke('graph_export', { subDir: 'organizations', id: graphId }),
    import: (jsonContent: string) => invoke('graph_import', { subDir: 'organizations', jsonContent }),
    showExportDialog: (graphName: string) =>
      save({ defaultPath: `${graphName}.json5`, filters: [{ name: 'JSON5', extensions: ['json5'] }] }),
    showImportDialog: () =>
      open({ filters: [{ name: 'JSON5', extensions: ['json5'] }], multiple: false }),
    reorderGraphs: (graphIds: string[]) =>
      invoke('graph_reorder', { subDir: 'organizations', ids: graphIds })
  },

  map: {
    getList: () => invoke('graph_get_list', { subDir: 'maps' }),
    get: (mapId: string) => invoke('graph_get', { subDir: 'maps', id: mapId }),
    create: (options: Record<string, unknown>) => invoke('graph_create', { subDir: 'maps', data: options }),
    update: (mapId: string, updates: Record<string, unknown>) =>
      invoke('graph_update', { subDir: 'maps', id: mapId, updates }),
    delete: (mapId: string) => invoke('graph_delete', { subDir: 'maps', id: mapId }),
    saveThumbnail: (mapId: string, dataUrl: string) =>
      invoke('graph_save_thumbnail', { subDir: 'maps', id: mapId, dataUrl }),
    getThumbnailPath: (mapId: string) =>
      invoke('graph_get_thumbnail_path', { subDir: 'maps', id: mapId }),
    export: (mapId: string) => invoke('graph_export', { subDir: 'maps', id: mapId }),
    import: (jsonContent: string) => invoke('graph_import', { subDir: 'maps', jsonContent }),
    showExportDialog: (mapName: string) =>
      save({ defaultPath: `${mapName}.json5`, filters: [{ name: 'JSON5', extensions: ['json5'] }] }),
    showImportDialog: () =>
      open({ filters: [{ name: 'JSON5', extensions: ['json5'] }], multiple: false }),
    reorderMaps: (mapIds: string[]) =>
      invoke('graph_reorder', { subDir: 'maps', ids: mapIds })
  },

  file: {
    exists: (path: string) => invoke('file_exists', { path }),
    read: (path: string) => invoke('file_read', { path }),
    write: (path: string, content: string) => invoke('file_write', { path, content }),
    mkdir: (path: string, recursive?: boolean) => invoke('file_mkdir', { path, recursive: recursive ?? false }),
    delete: (path: string) => invoke('file_delete', { path }),
    rename: (oldPath: string, newPath: string) => invoke('file_rename', { oldPath, newPath }),
    copy: (_source: string, _destination: string, _overwrite?: boolean) => Promise.resolve(),
    list: (_path: string, _options?: Record<string, unknown>) => Promise.resolve([]),
    getTree: (includeHidden?: boolean) => invoke('file_get_tree', { includeHidden: includeHidden ?? false }),
    getInfo: (_path: string) => Promise.resolve({}),
    showSaveDialog: (options?: { title?: string; defaultPath?: string; filters?: Array<{ name: string; extensions: string[] }> }) =>
      save({ title: options?.title, defaultPath: options?.defaultPath, filters: options?.filters }),
    exportTxt: (_filePath: string, _content: string) => Promise.resolve(false)
  },

  image: {
    uploadFromBase64: (base64Data: string, _config?: Record<string, unknown>) =>
      invoke('upload_image_from_base64', { base64Data, originalName: 'image.png' }),
    uploadFromFile: (filePath: string, _config?: Record<string, unknown>) =>
      invoke('upload_image_from_file', { filePath, originalName: filePath.split(/[\\/]/).pop() || 'image.png' }),
    selectAndUpload: (_config?: Record<string, unknown>) => Promise.resolve(null),
    delete: (imagePath: string) => invoke('delete_image', { imagePath }),
    readAsBase64: (imagePath: string) => invoke('read_image_as_base64', { imagePath }),
    exists: (imagePath: string) => invoke('image_exists', { imagePath }),
    getFullPath: (imagePath: string) => invoke('get_image_full_path', { imagePath })
  },

  terminal: {
    create: (options?: Record<string, unknown>) =>
      invoke('terminal_create', { name: options?.name, cwd: options?.cwd, shellPath: options?.shellPath }),
    write: (id: string, data: string) => invoke('terminal_write', { id, data }),
    resize: (id: string, cols: number, rows: number) => invoke('terminal_resize', { id, cols, rows }),
    destroy: (id: string) => invoke('terminal_kill', { id }),
    list: () => invoke('terminal_list'),
    getShells: () => invoke('terminal_get_shells'),
    setCwd: (_id: string, _cwd: string) => Promise.resolve(null),
    onData: (id: string, callback: (data: string) => void) => {
      let unlisten: UnlistenFn | null = null
      listen<Record<string, unknown>>('terminal:data', (event) => {
        if (event.payload.id === id && typeof event.payload.data === 'string') {
          callback(event.payload.data as string)
        }
      }).then(fn => { unlisten = fn })
      return () => { unlisten?.() }
    },
    onExit: (id: string, callback: (exitCode: number) => void) => {
      let unlisten: UnlistenFn | null = null
      listen<Record<string, unknown>>('terminal:exit', (event) => {
        if (event.payload.id === id) {
          callback((event.payload.exitCode as number) ?? 0)
        }
      }).then(fn => { unlisten = fn })
      return () => { unlisten?.() }
    },
    removeDataListener: (_id: string) => {},
    removeExitListener: (_id: string) => {}
  },

  terminalWindow: {
    create: () => Promise.resolve(false),
    isOpen: () => Promise.resolve(false),
    close: () => {},
    show: () => {},
    minimize: () => {},
    maximize: () => {},
    isMaximized: () => Promise.resolve(false),
    onOpened: (_callback: () => void) => {},
    onClosed: (_callback: () => void) => {},
    removeOpenedListener: () => {},
    removeClosedListener: () => {}
  },

  git: {
    isRepo: (repoPath: string) => invoke('git_is_repo', { repoPath }),
    init: (options: Record<string, unknown>) => invoke('git_init', { path: options.path, defaultBranch: options.defaultBranch }),
    status: (repoPath: string) => invoke('git_get_status', { repoPath }),
    log: (repoPath: string, options?: Record<string, unknown>) =>
      invoke('git_get_log', { repoPath, maxCount: options?.maxCount, skip: options?.skip, path: options?.path, search: options?.search, author: options?.author }),
    add: (repoPath: string, filepaths: string[]) => invoke('git_add', { repoPath, filepaths }),
    restore: (repoPath: string, filepaths: string[], source?: string) =>
      invoke('git_restore', { repoPath, filepaths, source }),
    restoreStaged: (repoPath: string, filepaths: string[]) => invoke('git_unstage', { repoPath, filepaths }),
    commit: (repoPath: string, options: Record<string, unknown>) =>
      invoke('git_commit', { repoPath, message: options.message, all: options.all, authorName: options.authorName, authorEmail: options.authorEmail }),
    reset: (repoPath: string, options: Record<string, unknown>) =>
      invoke('git_reset', { repoPath, commit: options.commit, mode: options.mode }),
    diff: (repoPath: string, filepath: string, staged?: boolean) =>
      invoke('git_get_diff', { repoPath, filepath, staged }),
    branchList: (repoPath: string) => invoke('git_get_branches', { repoPath }),
    branchCreate: (repoPath: string, name: string, startPoint?: string) =>
      invoke('git_create_branch', { repoPath, name, startPoint }),
    branchDelete: (repoPath: string, name: string, force?: boolean) =>
      invoke('git_delete_branch', { repoPath, name, force }),
    branchRename: (_repoPath: string, _oldName: string, _newName: string) => Promise.resolve(),
    checkout: (repoPath: string, options: Record<string, unknown>) =>
      invoke('git_checkout', { repoPath, target: options.target, createBranch: options.createBranch, force: options.force, paths: options.paths }),
    merge: (repoPath: string, options: Record<string, unknown>) =>
      invoke('git_merge', { repoPath, branch: options.branch, allowUnrelatedHistories: options.allowUnrelatedHistories, message: options.message }),
    configGet: (repoPath: string, key: string) => invoke('git_get_config', { repoPath, key }),
    configSet: (repoPath: string, key: string, value: string) => invoke('git_set_config', { repoPath, key, value }),
    setMode: (_mode: string) => Promise.resolve(),
    getMode: () => Promise.resolve('auto'),
    getCommitFiles: (repoPath: string, commitHash: string) =>
      invoke('git_get_commit_files', { repoPath, commitHash }),
    getCommitFileDiff: (repoPath: string, commitHash: string, filepath: string) =>
      invoke('git_get_commit_file_diff', { repoPath, commitHash, filepath })
  },

  search: {
    search: (options: Record<string, unknown>) =>
      invoke('search_content', { query: options.query, caseSensitive: options.caseSensitive, useRegex: options.useRegex, filePattern: options.filePattern, maxResults: options.maxResults }),
    replace: (filePath: string, searchQuery: string, replaceText: string, options?: Record<string, unknown>) =>
      invoke('search_replace', {
        filePath,
        searchQuery,
        replaceText,
        caseSensitive: options?.caseSensitive,
        wholeWord: options?.wholeWord,
        useRegex: options?.useRegex,
        replaceAll: options?.replaceAll,
        line: options?.line,
        column: options?.column
      })
  },

  aiAssistant: {
    listTemplates: () => invoke('ai_list_templates'),
    getTemplateList: () => invoke('ai_list_templates'),
    getTemplates: () => invoke('ai_list_templates'),
    getTemplate: (id: string) => invoke('ai_get_template', { id }),
    createTemplate: (template: Record<string, unknown>) => invoke('ai_create_template', { template }),
    updateTemplate: (id: string, updates: Record<string, unknown>) => invoke('ai_update_template', { id, updates }),
    saveTemplate: (template: Record<string, unknown>) =>
      template.id
        ? invoke('ai_update_template', { id: template.id as string, updates: template })
        : invoke('ai_create_template', { template }),
    deleteTemplate: (id: string) => invoke('ai_delete_template', { id }),
    copyTemplateToProject: async (id: string) => {
      const template = await invoke<Record<string, unknown>>('ai_get_template', { id })
      if (template) {
        const { id: _oldId, createdAt: _ca, updatedAt: _ua, ...rest } = template
        return invoke('ai_create_template', { template: { ...rest, name: `${template.name} (副本)` } })
      }
      return null
    },
    exportTemplate: async (id: string) => {
      const template = await invoke<Record<string, unknown>>('ai_get_template', { id })
      return template ? JSON.stringify(template, null, 2) : null
    },
    importTemplate: async (json5Content: string) => {
      const parsed = JSON.parse(json5Content)
      const { id: _oldId, createdAt: _ca, updatedAt: _ua, ...rest } = parsed
      return invoke('ai_create_template', { template: rest })
    },
    listWorkflows: () => invoke('ai_list_workflows'),
    getWorkflowList: () => invoke('ai_list_workflows'),
    getWorkflows: () => invoke('ai_list_workflows'),
    getWorkflow: (id: string) => invoke('ai_get_workflow', { id }),
    createWorkflow: (workflow: Record<string, unknown>) => invoke('ai_create_workflow', { workflow }),
    updateWorkflow: (id: string, updates: Record<string, unknown>) => invoke('ai_update_workflow', { id, updates }),
    saveWorkflow: (workflow: Record<string, unknown>) =>
      workflow.id
        ? invoke('ai_update_workflow', { id: workflow.id as string, updates: workflow })
        : invoke('ai_create_workflow', { workflow }),
    deleteWorkflow: (id: string) => invoke('ai_delete_workflow', { id }),
    exportWorkflow: async (id: string) => {
      const workflow = await invoke<Record<string, unknown>>('ai_get_workflow', { id })
      return workflow ? JSON.stringify(workflow, null, 2) : null
    },
    importWorkflow: async (json5Content: string) => {
      const parsed = JSON.parse(json5Content)
      const { id: _oldId, createdAt: _ca, updatedAt: _ua, ...rest } = parsed
      return invoke('ai_create_workflow', { workflow: rest })
    },
    saveExecution: (execution: Record<string, unknown>) => invoke('ai_save_execution', { execution }),
    createExecution: (_workflowId: string, _workflowName: string) =>
      invoke('ai_save_execution', { execution: { workflowId: _workflowId, workflowName: _workflowName, status: 'running', stepOutputs: {}, startedAt: new Date().toISOString() } }),
    getExecution: async (id: string) => {
      const executions = await invoke<Record<string, unknown>[]>('ai_list_executions')
      return executions.find(e => e.id === id) || null
    },
    updateExecution: (id: string, updates: Record<string, unknown>) =>
      invoke('ai_save_execution', { execution: { id, ...updates } }),
    getExecutionHistory: () => invoke('ai_list_executions'),
    listExecutions: () => invoke('ai_list_executions'),
    deleteExecution: (id: string) => invoke('ai_delete_execution', { id }),
    callApi: (prompt: string, options?: Record<string, unknown>) =>
      invoke('ai_call_api', { prompt, options }),
    callApiStream: (prompt: string, options?: Record<string, unknown>) =>
      invoke('ai_call_api_stream', { prompt, options }),
    onStreamChunk: (callback: (chunk: Record<string, unknown>) => void) => {
      let unlisten: UnlistenFn | null = null
      listen<Record<string, unknown>>('aiAssistant:streamChunk', (event) => {
        callback(event.payload)
      }).then(fn => { unlisten = fn })
      return () => { unlisten?.() }
    },
    removeStreamChunkListener: () => {},
    testApiConnection: (provider: string) =>
      invoke('ai_test_connection', { provider }).then((r: Record<string, unknown>) => r.success as boolean),
    getAvailableModels: (provider: string) =>
      invoke('ai_get_available_models', { provider })
  },

  dynamicSkill: {
    getList: () => invoke('skill_list'),
    get: (skillId: string) => invoke('skill_get', { id: skillId }),
    reload: () => Promise.resolve(),
    getTools: (skillId: string) => invoke('skill_get', { id: skillId }).then((s: Record<string, unknown> | null) => (s?.tools as unknown[]) ?? []),
    execute: (skillId: string, toolId: string, parameters: Record<string, unknown>, context: Record<string, unknown>) =>
      invoke('skill_execute', { skillId, toolId, parameters, context }),
    cancel: (executionId: string) => invoke('skill_cancel', { executionId }),
    getWhitelist: () => Promise.resolve([]),
    addToWhitelist: (_skillId: string, _skillName: string, _skillPath: string) => Promise.resolve(),
    removeFromWhitelist: (_skillId: string) => Promise.resolve(),
    isTrusted: (_skillId: string, _skillPath: string) => Promise.resolve(false),
    create: (options: Record<string, unknown>) => invoke('skill_create', { skill: options }),
    update: (skillId: string, options: Record<string, unknown>) => invoke('skill_update', { id: skillId, updates: options }),
    delete: (skillId: string) => invoke('skill_delete', { id: skillId }),
    checkPython: () => invoke('skill_check_python'),
    onExecutionOutput: (callback: (data: Record<string, unknown>) => void) => {
      let unlisten: UnlistenFn | null = null
      listen<Record<string, unknown>>('skill:executionOutput', (event) => {
        callback(event.payload)
      }).then(fn => { unlisten = fn })
      return () => { unlisten?.() }
    },
    removeExecutionOutputListener: () => {}
  },

  shell: {
    openExternal: (url: string) => invoke('shell_open_external', { url })
  },

  path: {
    resolve: (pathSegments: string[]) => invoke('path_resolve', { pathSegments }),
    basename: (path: string) => invoke('path_basename', { path }),
    dirname: (path: string) => invoke('path_dirname', { path }),
    join: (pathSegments: string[]) => invoke('path_join', { pathSegments }),
    relative: (from: string, to: string) => invoke('path_relative', { from, to })
  },

  updater: {
    checkForUpdates: () => Promise.resolve(null),
    downloadUpdate: () => Promise.resolve(),
    quitAndInstall: () => {},
    onUpdateAvailable: (_callback: (info: unknown) => void) => {},
    onUpdateDownloaded: (_callback: () => void) => {},
    removeUpdateListeners: () => {}
  },

  platform: getPlatform()
}
