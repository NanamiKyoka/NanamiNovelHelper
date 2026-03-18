/**
 * 项目初始化 Hook
 * 使用聚合接口一次性获取项目初始化所需的所有数据，减少 IPC 调用次数
 */

import { useCallback, useState } from 'react'
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

interface ProjectInitState {
  isLoading: boolean
  error: string | null
  isInitialized: boolean
}

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
 * 项目初始化 Hook
 * 负责一次性获取并分发所有初始化数据
 */
export function useProjectInit() {
  const [state, setState] = useState<ProjectInitState>({
    isLoading: false,
    error: null,
    isInitialized: false
  })

  // Store actions
  const setCurrentProject = useProjectStore((s) => s.setCurrentProject)
  const setProjectSettings = useSettingsStore((s) => s.setProjectSettings)
  const setVocabularyData = useVocabularyStore((s) => s.setData)
  const setSensitiveWords = useSensitiveStore((s) => s.setWords)
  const setRelationshipGraphs = useRelationshipStore((s) => s.setGraphs)
  const setTimelines = useTimelineStore((s) => s.setTimelines)
  const setSequenceCharts = useSequenceChartStore((s) => s.setCharts)
  const setOrganizationGraphs = useOrganizationStore((s) => s.setGraphs)
  const setFileTreeData = useFileTreeStore((s) => s.setData)
  const setHighlightConfig = useHighlightService((s) => s.setConfig)

  /**
   * 初始化项目数据
   * 从聚合接口获取所有数据，然后分发到各个 Store
   */
  const initProject = useCallback(async (projectPath: string) => {
    setState({ isLoading: true, error: null, isInitialized: false })

    try {
      // 先打开项目（这会初始化主进程的各服务）
      const project = await window.electron.project.open(projectPath)
      setCurrentProject(project)

      // 获取聚合初始化数据
      const initData: ProjectInitData = await window.electron.project.getInitData()

      // 分发数据到各个 Store
      // 设置项目设置
      setProjectSettings(initData.settings)

      // 设置词汇数据
      setVocabularyData(initData.vocabularyTypes, initData.vocabularyEntries)

      // 设置敏感词
      setSensitiveWords(initData.sensitiveWords)

      // 设置高亮配置
      setHighlightConfig(initData.highlightConfig)

      // 设置关系图列表
      setRelationshipGraphs(initData.relationshipGraphs)

      // 设置时间线列表
      setTimelines(initData.timelines)

      // 设置事序图列表
      setSequenceCharts(initData.sequenceCharts)

      // 设置组织架构图列表
      setOrganizationGraphs(initData.organizationGraphs)

      // 设置文件树数据
      setFileTreeData(
        initData.fileTree.tree,
        initData.fileTree.expandedFolders,
        initData.fileTree.showHiddenFiles,
        initData.fileTree.hiddenItems
      )

      setState({ isLoading: false, error: null, isInitialized: true })

      return project
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '项目初始化失败'
      setState({ isLoading: false, error: errorMessage, isInitialized: false })
      throw error
    }
  }, [
    setCurrentProject,
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
   * 重置初始化状态
   */
  const resetInit = useCallback(() => {
    setState({ isLoading: false, error: null, isInitialized: false })
  }, [])

  return {
    ...state,
    initProject,
    resetInit
  }
}

export default useProjectInit
