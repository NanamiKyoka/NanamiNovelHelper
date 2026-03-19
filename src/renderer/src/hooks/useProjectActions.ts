/**
 * 项目操作 Hook
 * 
 * 统一管理项目相关的跨 Store 操作，解耦 Store 间的直接依赖
 * 组件应使用此 hook 而非直接调用 projectStore 的方法
 */

import { useCallback } from 'react'
import { message } from 'antd'
import { useProjectStore } from '@stores/projectStore'
import { useSettingsStore } from '@stores/settingsStore'
import { useVocabularyStore } from '@stores/vocabularyStore'
import { useSensitiveStore } from '@stores/sensitiveStore'
import { useRelationshipStore } from '@stores/relationshipStore'
import { useTimelineStore } from '@stores/timelineStore'
import { useSequenceChartStore } from '@stores/sequenceChartStore'
import { useOrganizationStore } from '@stores/organizationStore'
import { useFileTreeStore } from '@stores/fileTreeStore'
import { useHighlightService } from '@services/highlightService'
import type { CreateProjectOptions } from '@shared/project'

interface ProjectInitData {
  project: {
    id: string
    name: string
    description?: string
    author?: string
    path: string
    cover?: string
    tags: string[]
    createdAt: string
    updatedAt: string
  }
  settings: any
  vocabularyTypes: any[]
  vocabularyEntries: any[]
  sensitiveWords: any[]
  highlightConfig: any
  relationshipGraphs: any[]
  timelines: any[]
  sequenceCharts: any[]
  organizationGraphs: any[]
  fileTree: {
    tree: any[]
    expandedFolders: string[]
    showHiddenFiles: boolean
    hiddenItems: string[]
  }
}

/**
 * 项目操作 Hook
 * 
 * 提供项目的创建、打开、关闭等操作，自动处理跨 Store 的状态同步
 */
export function useProjectActions() {
  // Store state
  const isLoading = useProjectStore((s) => s.isLoading)
  const error = useProjectStore((s) => s.error)
  const currentProject = useProjectStore((s) => s.currentProject)
  
  // Store actions - project store
  const setCurrentProject = useProjectStore((s) => s.setCurrentProject)
  const setLoading = useProjectStore((s) => s.setLoading)
  const setError = useProjectStore((s) => s.setError)
  const clearError = useProjectStore((s) => s.clearError)
  const loadRecentProjects = useProjectStore((s) => s.loadRecentProjects)
  const showOpenDialog = useProjectStore((s) => s.showOpenDialog)
  const showCreateDialog = useProjectStore((s) => s.showCreateDialog)
  
  // Store actions - other stores
  const setProjectSettings = useSettingsStore((s) => s.setProjectSettings)
  const clearProjectSettings = useSettingsStore((s) => s.clearProjectSettings)
  const setVocabularyData = useVocabularyStore((s) => s.setData)
  const clearVocabularyData = useVocabularyStore((s) => s.clearData)
  const setSensitiveWords = useSensitiveStore((s) => s.setWords)
  const clearSensitiveWords = useSensitiveStore((s) => s.clearData)
  const setRelationshipGraphs = useRelationshipStore((s) => s.setGraphs)
  const clearRelationshipData = useRelationshipStore((s) => s.clearData)
  const setTimelines = useTimelineStore((s) => s.setTimelines)
  const clearTimelineData = useTimelineStore((s) => s.clearData)
  const setSequenceCharts = useSequenceChartStore((s) => s.setCharts)
  const clearSequenceChartData = useSequenceChartStore((s) => s.clearData)
  const setOrganizationGraphs = useOrganizationStore((s) => s.setGraphs)
  const clearOrganizationData = useOrganizationStore((s) => s.clearData)
  const setFileTreeData = useFileTreeStore((s) => s.setData)
  const clearFileTreeData = useFileTreeStore((s) => s.clearData)
  const setHighlightConfig = useHighlightService((s) => s.setConfig)

  /**
   * 分发初始化数据到各个 Store
   */
  const dispatchInitData = useCallback((initData: ProjectInitData) => {
    setProjectSettings(initData.settings)
    setVocabularyData(initData.vocabularyTypes, initData.vocabularyEntries)
    setSensitiveWords(initData.sensitiveWords)
    setHighlightConfig(initData.highlightConfig)
    setRelationshipGraphs(initData.relationshipGraphs)
    setTimelines(initData.timelines)
    setSequenceCharts(initData.sequenceCharts)
    setOrganizationGraphs(initData.organizationGraphs)
    setFileTreeData(
      initData.fileTree.tree,
      initData.fileTree.expandedFolders,
      initData.fileTree.showHiddenFiles,
      initData.fileTree.hiddenItems
    )
  }, [
    setProjectSettings,
    setVocabularyData,
    setSensitiveWords,
    setHighlightConfig,
    setRelationshipGraphs,
    setTimelines,
    setSequenceCharts,
    setOrganizationGraphs,
    setFileTreeData
  ])

  /**
   * 清除所有项目相关数据
   */
  const clearAllProjectData = useCallback(() => {
    clearProjectSettings()
    clearVocabularyData()
    clearSensitiveWords()
    clearRelationshipData()
    clearTimelineData()
    clearSequenceChartData()
    clearOrganizationData()
    clearFileTreeData()
  }, [
    clearProjectSettings,
    clearVocabularyData,
    clearSensitiveWords,
    clearRelationshipData,
    clearTimelineData,
    clearSequenceChartData,
    clearOrganizationData,
    clearFileTreeData
  ])

  /**
   * 打开项目
   */
  const openProject = useCallback(async (path: string) => {
    setLoading(true)
    clearError()
    
    try {
      // 打开项目（主进程初始化）
      const project = await window.electron.project.open(path)
      setCurrentProject(project)
      
      // 获取聚合初始化数据
      const initData: ProjectInitData = await window.electron.project.getInitData()
      
      // 分发数据到各个 Store
      dispatchInitData(initData)
      
      // 刷新最近项目列表
      loadRecentProjects()
      
      return project
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '打开项目失败'
      setError(errorMessage)
      throw error
    }
  }, [
    setLoading,
    clearError,
    setCurrentProject,
    dispatchInitData,
    loadRecentProjects,
    setError
  ])

  /**
   * 创建项目
   */
  const createProject = useCallback(async (options: CreateProjectOptions) => {
    setLoading(true)
    clearError()
    
    try {
      // 创建项目
      const project = await window.electron.project.create(options)
      
      // 创建后打开项目
      const openedProject = await window.electron.project.open(project.path)
      setCurrentProject(openedProject)
      
      // 获取聚合初始化数据
      const initData: ProjectInitData = await window.electron.project.getInitData()
      
      // 分发数据到各个 Store
      dispatchInitData(initData)
      
      // 刷新最近项目列表
      loadRecentProjects()
      
      return openedProject
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '创建项目失败'
      setError(errorMessage)
      throw error
    }
  }, [
    setLoading,
    clearError,
    setCurrentProject,
    dispatchInitData,
    loadRecentProjects,
    setError
  ])

  /**
   * 关闭项目
   */
  const closeProject = useCallback(async () => {
    setLoading(true)
    clearError()
    
    try {
      await window.electron.project.close()
      
      // 清除当前项目
      setCurrentProject(null)
      
      // 清除所有项目相关数据
      clearAllProjectData()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '关闭项目失败'
      setError(errorMessage)
      throw error
    }
  }, [
    setLoading,
    clearError,
    setCurrentProject,
    clearAllProjectData,
    setError
  ])

  /**
   * 选择并打开项目
   */
  const browseAndOpen = useCallback(async () => {
    const path = await showOpenDialog()
    if (path) {
      return openProject(path)
    }
    return null
  }, [showOpenDialog, openProject])

  /**
   * 选择并创建项目
   */
  const browseAndCreate = useCallback(async (options: Omit<CreateProjectOptions, 'parentPath'>) => {
    const path = await showCreateDialog()
    if (path) {
      return createProject({ ...options, parentPath: path })
    }
    return null
  }, [showCreateDialog, createProject])

  return {
    // 状态
    isLoading,
    error,
    currentProject,
    hasProject: !!currentProject,
    
    // 操作
    openProject,
    createProject,
    closeProject,
    browseAndOpen,
    browseAndCreate,
    
    // 错误处理
    clearError,
    
    // 最近项目
    loadRecentProjects,
    showOpenDialog,
    showCreateDialog,
  }
}

export default useProjectActions
