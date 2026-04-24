/**
 * 时间线状态管理
 */

import { create } from 'zustand'
import type {
  Timeline,
  TimelineMeta,
  TimelineNode,
  CreateTimelineOptions,
  UpdateTimelineOptions,
  TimelineHistoryAction,
} from '../types/timeline'

interface TimelineState {
  // 状态
  timelines: TimelineMeta[]
  currentTimeline: Timeline | null
  isLoading: boolean
  error: string | null

  // 撤销重做
  history: TimelineHistoryAction[]
  historyIndex: number
  maxHistorySize: number

  // 选择状态
  selectedNodeIds: string[]

  // 时间线管理
  loadList: () => Promise<void>
  loadTimeline: (timelineId: string) => Promise<void>
  createTimeline: (options: CreateTimelineOptions) => Promise<Timeline | null>
  updateTimeline: (timelineId: string, updates: UpdateTimelineOptions) => Promise<void>
  deleteTimeline: (timelineId: string) => Promise<void>
  clearCurrentTimeline: () => void

  // 节点管理
  addNode: (node: Omit<TimelineNode, 'id' | 'createdAt' | 'updatedAt' | 'order'>) => Promise<TimelineNode | null>
  updateNode: (nodeId: string, updates: Partial<TimelineNode>) => Promise<void>
  deleteNode: (nodeId: string) => Promise<void>
  batchDeleteNodes: (nodeIds: string[]) => Promise<number>
  moveNode: (nodeId: string, newOrder: number) => Promise<void>
  batchMoveNodes: (nodeIds: string[], targetOrder: number) => Promise<void>
  updateNodesOrder: (nodes: TimelineNode[]) => Promise<void>

  // 分支管理
  createBranch: (parentTimelineId: string, branchFromNodeId: string, name?: string) => Promise<Timeline | null>
  mergeBranch: (branchTimelineId: string, targetTimelineId: string, targetNodeId?: string) => Promise<boolean>
  getBranches: (parentTimelineId: string) => Promise<TimelineMeta[]>

  // 撤销重做
  pushHistory: (action: TimelineHistoryAction) => void
  undo: () => void
  redo: () => void
  canUndo: () => boolean
  canRedo: () => boolean
  clearHistory: () => void

  // 选择管理
  selectNode: (nodeId: string, multi?: boolean) => void
  deselectNode: (nodeId: string) => void
  selectAllNodes: () => void
  clearSelection: () => void

  // 缩略图
  saveThumbnail: (dataUrl: string) => Promise<void>

  // 导入导出
  exportTimeline: (timelineId: string) => Promise<string | null>
  exportTimelineAsMarkdown: (timelineId: string) => Promise<string | null>
  importTimeline: (jsonContent: string) => Promise<Timeline | null>

  // 辅助方法
  getNodeById: (nodeId: string) => TimelineNode | undefined
  getNodesByTimeRange: (startTime: string, endTime: string) => TimelineNode[]
  clearData: () => void
  // 批量设置方法（用于聚合接口）
  setTimelines: (timelines: TimelineMeta[]) => void
  // 排序方法
  reorderTimelines: (timelineIds: string[]) => Promise<boolean>
}

export const useTimelineStore = create<TimelineState>((set, get) => ({
  // 初始状态
  timelines: [],
  currentTimeline: null,
  isLoading: false,
  error: null,

  // 撤销重做
  history: [],
  historyIndex: -1,
  maxHistorySize: 50,

  // 选择状态
  selectedNodeIds: [],

  // 时间线管理
  loadList: async () => {
    set({ isLoading: true, error: null })
    try {
      const timelines = await window.electron.timeline.getList()
      set({ timelines, isLoading: false })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '加载时间线列表失败'
      console.error('Failed to load timelines:', error)
      set({ isLoading: false, error: errorMessage })
    }
  },

  loadTimeline: async (timelineId: string) => {
    set({ isLoading: true, error: null })
    try {
      const timeline = await window.electron.timeline.get(timelineId)
      set({ currentTimeline: timeline, isLoading: false, selectedNodeIds: [] })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '加载时间线失败'
      console.error('Failed to load timeline:', error)
      set({ isLoading: false, error: errorMessage })
    }
  },

  createTimeline: async (options: CreateTimelineOptions) => {
    set({ isLoading: true, error: null })
    try {
      const timeline = await window.electron.timeline.create(options)
      set((state) => ({
        timelines: [
          {
            id: timeline.id,
            name: timeline.name,
            description: timeline.description,
            thumbnail: timeline.thumbnail,
            branchInfo: timeline.branchInfo,
            nodeCount: timeline.nodeCount,
            tags: timeline.tags,
            createdAt: timeline.createdAt,
            updatedAt: timeline.updatedAt,
          },
          ...state.timelines,
        ],
        currentTimeline: timeline,
        isLoading: false,
      }))
      return timeline
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '创建时间线失败'
      console.error('Failed to create timeline:', error)
      set({ isLoading: false, error: errorMessage })
      return null
    }
  },

  updateTimeline: async (timelineId: string, updates: UpdateTimelineOptions) => {
    try {
      const updatedTimeline = await window.electron.timeline.update(timelineId, updates)
      if (updatedTimeline) {
        set((state) => ({
          timelines: state.timelines.map((t) =>
            t.id === timelineId
              ? {
                  ...t,
                  name: updatedTimeline.name,
                  description: updatedTimeline.description,
                  thumbnail: updatedTimeline.thumbnail,
                  branchInfo: updatedTimeline.branchInfo,
                  nodeCount: updatedTimeline.nodeCount,
                  tags: updatedTimeline.tags,
                  updatedAt: updatedTimeline.updatedAt,
                }
              : t
          ),
          currentTimeline:
            state.currentTimeline?.id === timelineId ? updatedTimeline : state.currentTimeline,
        }))
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '更新时间线失败'
      console.error('Failed to update timeline:', error)
      set({ error: errorMessage })
    }
  },

  deleteTimeline: async (timelineId: string) => {
    try {
      const success = await window.electron.timeline.delete(timelineId)
      if (success) {
        set((state) => ({
          timelines: state.timelines.filter((t) => t.id !== timelineId),
          currentTimeline:
            state.currentTimeline?.id === timelineId ? null : state.currentTimeline,
        }))
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '删除时间线失败'
      console.error('Failed to delete timeline:', error)
      set({ error: errorMessage })
    }
  },

  clearCurrentTimeline: () => {
    set({ currentTimeline: null, selectedNodeIds: [] })
  },

  // 节点管理
  addNode: async (node: Omit<TimelineNode, 'id' | 'createdAt' | 'updatedAt' | 'order'>) => {
    const { currentTimeline } = get()
    if (!currentTimeline) return null

    try {
      const newNode = await window.electron.timeline.addNode(currentTimeline.id, node)
      if (newNode) {
        // 记录历史
        get().pushHistory({
          type: 'create_node',
          timelineId: currentTimeline.id,
          afterData: newNode,
          timestamp: Date.now(),
          description: `创建节点: ${newNode.title}`,
        })

        set((state) => ({
          currentTimeline: state.currentTimeline
            ? {
                ...state.currentTimeline,
                nodes: [...state.currentTimeline.nodes, newNode],
                nodeCount: state.currentTimeline.nodeCount + 1,
              }
            : null,
        }))
      }
      return newNode
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '添加节点失败'
      console.error('Failed to add node:', error)
      set({ error: errorMessage })
      return null
    }
  },

  updateNode: async (nodeId: string, updates: Partial<TimelineNode>) => {
    const { currentTimeline } = get()
    if (!currentTimeline) return

    const oldNode = currentTimeline.nodes.find((n) => n.id === nodeId)

    try {
      const updatedNode = await window.electron.timeline.updateNode(
        currentTimeline.id,
        nodeId,
        updates
      )
      if (updatedNode) {
        // 记录历史
        get().pushHistory({
          type: 'update_node',
          timelineId: currentTimeline.id,
          beforeData: oldNode,
          afterData: updatedNode,
          timestamp: Date.now(),
          description: `更新节点: ${updatedNode.title}`,
        })

        set((state) => ({
          currentTimeline: state.currentTimeline
            ? {
                ...state.currentTimeline,
                nodes: state.currentTimeline.nodes.map((n) =>
                  n.id === nodeId ? updatedNode : n
                ),
              }
            : null,
        }))
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '更新节点失败'
      console.error('Failed to update node:', error)
      set({ error: errorMessage })
    }
  },

  deleteNode: async (nodeId: string) => {
    const { currentTimeline } = get()
    if (!currentTimeline) return

    const oldNode = currentTimeline.nodes.find((n) => n.id === nodeId)

    try {
      const success = await window.electron.timeline.deleteNode(currentTimeline.id, nodeId)
      if (success) {
        // 记录历史
        get().pushHistory({
          type: 'delete_node',
          timelineId: currentTimeline.id,
          beforeData: oldNode,
          timestamp: Date.now(),
          description: `删除节点: ${oldNode?.title}`,
        })

        set((state) => ({
          currentTimeline: state.currentTimeline
            ? {
                ...state.currentTimeline,
                nodes: state.currentTimeline.nodes.filter((n) => n.id !== nodeId),
                nodeCount: state.currentTimeline.nodeCount - 1,
              }
            : null,
          selectedNodeIds: state.selectedNodeIds.filter((id) => id !== nodeId),
        }))
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '删除节点失败'
      console.error('Failed to delete node:', error)
      set({ error: errorMessage })
    }
  },

  batchDeleteNodes: async (nodeIds: string[]) => {
    const { currentTimeline } = get()
    if (!currentTimeline) return 0

    const oldNodes = currentTimeline.nodes.filter((n) => nodeIds.includes(n.id))

    try {
      const deletedCount = await window.electron.timeline.batchDeleteNodes(
        currentTimeline.id,
        nodeIds
      )
      if (deletedCount > 0) {
        // 记录历史
        get().pushHistory({
          type: 'batch_delete_nodes',
          timelineId: currentTimeline.id,
          beforeData: oldNodes,
          timestamp: Date.now(),
          description: `批量删除 ${deletedCount} 个节点`,
        })

        set((state) => ({
          currentTimeline: state.currentTimeline
            ? {
                ...state.currentTimeline,
                nodes: state.currentTimeline.nodes.filter((n) => !nodeIds.includes(n.id)),
                nodeCount: state.currentTimeline.nodeCount - deletedCount,
              }
            : null,
          selectedNodeIds: [],
        }))
      }
      return deletedCount
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '批量删除节点失败'
      console.error('Failed to batch delete nodes:', error)
      set({ error: errorMessage })
      return 0
    }
  },

  moveNode: async (nodeId: string, newOrder: number) => {
    const { currentTimeline } = get()
    if (!currentTimeline) return

    const oldNode = currentTimeline.nodes.find((n) => n.id === nodeId)
    const oldOrder = oldNode?.order ?? 0

    try {
      const updatedNodes = await window.electron.timeline.moveNode(
        currentTimeline.id,
        nodeId,
        newOrder
      )
      if (updatedNodes) {
        // 记录历史
        get().pushHistory({
          type: 'move_node',
          timelineId: currentTimeline.id,
          beforeData: { nodeId, oldOrder },
          afterData: { nodeId, newOrder },
          timestamp: Date.now(),
          description: `移动节点: ${oldNode?.title}`,
        })

        set((state) => ({
          currentTimeline: state.currentTimeline
            ? {
                ...state.currentTimeline,
                nodes: updatedNodes,
              }
            : null,
        }))
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '移动节点失败'
      console.error('Failed to move node:', error)
      set({ error: errorMessage })
    }
  },

  batchMoveNodes: async (nodeIds: string[], targetOrder: number) => {
    const { currentTimeline } = get()
    if (!currentTimeline) return

    const oldNodes = currentTimeline.nodes.filter((n) => nodeIds.includes(n.id))

    try {
      const updatedNodes = await window.electron.timeline.batchMoveNodes(
        currentTimeline.id,
        nodeIds,
        targetOrder
      )
      if (updatedNodes) {
        // 记录历史
        get().pushHistory({
          type: 'batch_move_nodes',
          timelineId: currentTimeline.id,
          beforeData: oldNodes.map((n) => ({ id: n.id, order: n.order })),
          afterData: { nodeIds, targetOrder },
          timestamp: Date.now(),
          description: `批量移动 ${nodeIds.length} 个节点`,
        })

        set((state) => ({
          currentTimeline: state.currentTimeline
            ? {
                ...state.currentTimeline,
                nodes: updatedNodes,
              }
            : null,
        }))
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '批量移动节点失败'
      console.error('Failed to batch move nodes:', error)
      set({ error: errorMessage })
    }
  },

  updateNodesOrder: async (nodes: TimelineNode[]) => {
    const { currentTimeline } = get()
    if (!currentTimeline) return

    const oldNodes = [...currentTimeline.nodes]

    try {
      const updatedTimeline = await window.electron.timeline.updateNodes(
        currentTimeline.id,
        nodes
      )
      if (updatedTimeline) {
        // 记录历史
        get().pushHistory({
          type: 'move_node',
          timelineId: currentTimeline.id,
          beforeData: oldNodes,
          afterData: nodes,
          timestamp: Date.now(),
          description: '重新排序节点',
        })

        set((state) => ({
          currentTimeline: state.currentTimeline
            ? {
                ...state.currentTimeline,
                nodes: nodes,
              }
            : null,
        }))
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '更新节点顺序失败'
      console.error('Failed to update nodes order:', error)
      set({ error: errorMessage })
    }
  },

  // 分支管理
  createBranch: async (parentTimelineId: string, branchFromNodeId: string, name?: string) => {
    try {
      const branchTimeline = await window.electron.timeline.createBranch(
        parentTimelineId,
        branchFromNodeId,
        name
      )
      if (branchTimeline) {
        set((state) => ({
          timelines: [
            {
              id: branchTimeline.id,
              name: branchTimeline.name,
              description: branchTimeline.description,
              thumbnail: branchTimeline.thumbnail,
              branchInfo: branchTimeline.branchInfo,
              nodeCount: branchTimeline.nodeCount,
              tags: branchTimeline.tags,
              createdAt: branchTimeline.createdAt,
              updatedAt: branchTimeline.updatedAt,
            },
            ...state.timelines,
          ],
        }))

        // 更新父时间线中的分支点信息
        const { currentTimeline } = get()
        if (currentTimeline && currentTimeline.id === parentTimelineId) {
          set((state) => ({
            currentTimeline: state.currentTimeline
              ? {
                  ...state.currentTimeline,
                  nodes: state.currentTimeline.nodes.map((n) =>
                    n.id === branchFromNodeId
                      ? {
                          ...n,
                          isBranchPoint: true,
                          branchedTimelineIds: [
                            ...(n.branchedTimelineIds || []),
                            branchTimeline.id,
                          ],
                        }
                      : n
                  ),
                }
              : null,
          }))
        }
      }
      return branchTimeline
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '创建分支失败'
      console.error('Failed to create branch:', error)
      set({ error: errorMessage })
      return null
    }
  },

  mergeBranch: async (
    branchTimelineId: string,
    targetTimelineId: string,
    targetNodeId?: string
  ) => {
    try {
      const success = await window.electron.timeline.mergeBranch(
        branchTimelineId,
        targetTimelineId,
        targetNodeId
      )
      if (success) {
        // 更新分支时间线的状态
        set((state) => ({
          timelines: state.timelines.map((t) =>
            t.id === branchTimelineId
              ? {
                  ...t,
                  branchInfo: {
                    ...t.branchInfo,
                    mergeToTimelineId: targetTimelineId,
                    mergeToNodeId: targetNodeId,
                  },
                }
              : t
          ),
        }))
      }
      return success
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '合并分支失败'
      console.error('Failed to merge branch:', error)
      set({ error: errorMessage })
      return false
    }
  },

  getBranches: async (parentTimelineId: string) => {
    try {
      return await window.electron.timeline.getBranches(parentTimelineId)
    } catch (error) {
      console.error('Failed to get branches:', error)
      return []
    }
  },

  // 撤销重做
  pushHistory: (action: TimelineHistoryAction) => {
    const { history, historyIndex, maxHistorySize } = get()
    
    // 如果在历史中间进行了新操作，删除后面的历史
    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push(action)

    // 限制历史大小
    if (newHistory.length > maxHistorySize) {
      newHistory.shift()
    }

    set({
      history: newHistory,
      historyIndex: newHistory.length - 1,
    })
  },

  undo: () => {
    const { history, historyIndex, currentTimeline } = get()
    if (historyIndex < 0 || !currentTimeline) return

    const action = history[historyIndex]
    if (!action) return

    // 根据操作类型执行撤销
    switch (action.type) {
      case 'create_node':
        // 撤销创建 = 删除节点
        if (action.afterData) {
          const node = action.afterData as TimelineNode
          window.electron.timeline.deleteNode(currentTimeline.id, node.id)
          set((state) => ({
            currentTimeline: state.currentTimeline
              ? {
                  ...state.currentTimeline,
                  nodes: state.currentTimeline.nodes.filter((n) => n.id !== node.id),
                  nodeCount: state.currentTimeline.nodeCount - 1,
                }
              : null,
          }))
        }
        break

      case 'delete_node':
        // 撤销删除 = 重新添加节点
        if (action.beforeData) {
          const node = action.beforeData as TimelineNode
          window.electron.timeline.addNode(currentTimeline.id, {
            title: node.title,
            description: node.description,
            timeInfo: node.timeInfo,
            characters: node.characters,
            chapter: node.chapter,
            color: node.color,
          })
          set((state) => ({
            currentTimeline: state.currentTimeline
              ? {
                  ...state.currentTimeline,
                  nodes: [...state.currentTimeline.nodes, node],
                  nodeCount: state.currentTimeline.nodeCount + 1,
                }
              : null,
          }))
        }
        break

      case 'update_node':
        // 撤销更新 = 恢复旧数据
        if (action.beforeData) {
          const node = action.beforeData as TimelineNode
          window.electron.timeline.updateNode(currentTimeline.id, node.id, node)
          set((state) => ({
            currentTimeline: state.currentTimeline
              ? {
                  ...state.currentTimeline,
                  nodes: state.currentTimeline.nodes.map((n) =>
                    n.id === node.id ? node : n
                  ),
                }
              : null,
          }))
        }
        break

      case 'move_node':
        // 撤销移动 = 恢复旧顺序
        if (action.beforeData && 'nodes' in action.beforeData) {
          const nodes = action.beforeData as TimelineNode[]
          window.electron.timeline.updateNodes(currentTimeline.id, nodes)
          set((state) => ({
            currentTimeline: state.currentTimeline
              ? {
                  ...state.currentTimeline,
                  nodes: nodes,
                }
              : null,
          }))
        }
        break

      case 'batch_delete_nodes':
        // 撤销批量删除
        if (action.beforeData) {
          const nodes = action.beforeData as TimelineNode[]
          nodes.forEach((node) => {
            window.electron.timeline.addNode(currentTimeline.id, {
              title: node.title,
              description: node.description,
              timeInfo: node.timeInfo,
              characters: node.characters,
              chapter: node.chapter,
              color: node.color,
              order: node.order,
            })
          })
          get().loadTimeline(currentTimeline.id)
        }
        break
    }

    set({ historyIndex: historyIndex - 1 })
  },

  redo: () => {
    const { history, historyIndex, currentTimeline } = get()
    if (historyIndex >= history.length - 1 || !currentTimeline) return

    const action = history[historyIndex + 1]
    if (!action) return

    // 根据操作类型执行重做
    switch (action.type) {
      case 'create_node':
        // 重做创建
        if (action.afterData) {
          const node = action.afterData as TimelineNode
          window.electron.timeline.addNode(currentTimeline.id, {
            title: node.title,
            description: node.description,
            timeInfo: node.timeInfo,
            characters: node.characters,
            chapter: node.chapter,
            color: node.color,
          })
          get().loadTimeline(currentTimeline.id)
        }
        break

      case 'delete_node':
        // 重做删除
        if (action.beforeData) {
          const node = action.beforeData as TimelineNode
          window.electron.timeline.deleteNode(currentTimeline.id, node.id)
          set((state) => ({
            currentTimeline: state.currentTimeline
              ? {
                  ...state.currentTimeline,
                  nodes: state.currentTimeline.nodes.filter((n) => n.id !== node.id),
                  nodeCount: state.currentTimeline.nodeCount - 1,
                }
              : null,
          }))
        }
        break

      case 'update_node':
        // 重做更新
        if (action.afterData) {
          const node = action.afterData as TimelineNode
          window.electron.timeline.updateNode(currentTimeline.id, node.id, node)
          set((state) => ({
            currentTimeline: state.currentTimeline
              ? {
                  ...state.currentTimeline,
                  nodes: state.currentTimeline.nodes.map((n) =>
                    n.id === node.id ? node : n
                  ),
                }
              : null,
          }))
        }
        break

      case 'move_node':
        // 重做移动
        if (action.afterData && 'nodes' in action.afterData) {
          const nodes = action.afterData as TimelineNode[]
          window.electron.timeline.updateNodes(currentTimeline.id, nodes)
          set((state) => ({
            currentTimeline: state.currentTimeline
              ? {
                  ...state.currentTimeline,
                  nodes: nodes,
                }
              : null,
          }))
        }
        break
    }

    set({ historyIndex: historyIndex + 1 })
  },

  canUndo: () => {
    const { historyIndex } = get()
    return historyIndex >= 0
  },

  canRedo: () => {
    const { history, historyIndex } = get()
    return historyIndex < history.length - 1
  },

  clearHistory: () => {
    set({ history: [], historyIndex: -1 })
  },

  // 选择管理
  selectNode: (nodeId: string, multi = false) => {
    if (multi) {
      set((state) => ({
        selectedNodeIds: state.selectedNodeIds.includes(nodeId)
          ? state.selectedNodeIds.filter((id) => id !== nodeId)
          : [...state.selectedNodeIds, nodeId],
      }))
    } else {
      set({ selectedNodeIds: [nodeId] })
    }
  },

  deselectNode: (nodeId: string) => {
    set((state) => ({
      selectedNodeIds: state.selectedNodeIds.filter((id) => id !== nodeId),
    }))
  },

  selectAllNodes: () => {
    const { currentTimeline } = get()
    if (!currentTimeline) return
    set({ selectedNodeIds: currentTimeline.nodes.map((n) => n.id) })
  },

  clearSelection: () => {
    set({ selectedNodeIds: [] })
  },

  // 缩略图
  saveThumbnail: async (dataUrl: string) => {
    const { currentTimeline } = get()
    if (!currentTimeline) return

    try {
      const thumbnailPath = await window.electron.timeline.saveThumbnail(
        currentTimeline.id,
        dataUrl
      )
      if (thumbnailPath) {
        set((state) => ({
          currentTimeline: state.currentTimeline
            ? { ...state.currentTimeline, thumbnail: thumbnailPath }
            : null,
          timelines: state.timelines.map((t) =>
            t.id === currentTimeline.id ? { ...t, thumbnail: thumbnailPath } : t
          ),
        }))
      }
    } catch (error) {
      console.error('Failed to save thumbnail:', error)
    }
  },

  // 导入导出
  exportTimeline: async (timelineId: string) => {
    try {
      return await window.electron.timeline.export(timelineId)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '导出时间线失败'
      console.error('Failed to export timeline:', error)
      set({ error: errorMessage })
      return null
    }
  },

  exportTimelineAsMarkdown: async (timelineId: string) => {
    try {
      return await window.electron.timeline.exportMarkdown(timelineId)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '导出时间线为 Markdown 失败'
      console.error('Failed to export timeline as markdown:', error)
      set({ error: errorMessage })
      return null
    }
  },

  importTimeline: async (jsonContent: string) => {
    try {
      const timeline = await window.electron.timeline.import(jsonContent)
      if (timeline) {
        set((state) => ({
          timelines: [
            {
              id: timeline.id,
              name: timeline.name,
              description: timeline.description,
              thumbnail: timeline.thumbnail,
              branchInfo: timeline.branchInfo,
              nodeCount: timeline.nodeCount,
              tags: timeline.tags,
              createdAt: timeline.createdAt,
              updatedAt: timeline.updatedAt,
            },
            ...state.timelines,
          ],
        }))
      }
      return timeline
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '导入时间线失败'
      console.error('Failed to import timeline:', error)
      set({ error: errorMessage })
      return null
    }
  },

  // 辅助方法
  getNodeById: (nodeId: string) => {
    const { currentTimeline } = get()
    return currentTimeline?.nodes.find((n) => n.id === nodeId)
  },

  getNodesByTimeRange: (startTime: string, endTime: string) => {
    const { currentTimeline } = get()
    if (!currentTimeline) return []

    return currentTimeline.nodes.filter((node) => {
      if (node.timeInfo.format === 'datetime' && node.timeInfo.datetime) {
        const nodeTime = new Date(node.timeInfo.datetime).getTime()
        const start = new Date(startTime).getTime()
        const end = new Date(endTime).getTime()
        return nodeTime >= start && nodeTime <= end
      }
      return false
    })
  },

  clearData: () => {
    set({
      timelines: [],
      currentTimeline: null,
      isLoading: false,
      error: null,
      history: [],
      historyIndex: -1,
      selectedNodeIds: [],
    })
  },

  // 批量设置数据（用于聚合接口）
  setTimelines: (timelines: TimelineMeta[]) => {
    set({ timelines, isLoading: false, error: null })
  },

  // 重新排序时间线列表
  reorderTimelines: async (timelineIds: string[]) => {
    try {
      const success = await window.electron.timeline.reorder(timelineIds)
      if (success) {
        // 更新本地状态顺序
        set((state) => ({
          timelines: timelineIds.map((id, index) => {
            const timeline = state.timelines.find(t => t.id === id)
            if (timeline) {
              return { ...timeline, order: index }
            }
            return null
          }).filter((t): t is TimelineMeta => t !== null)
        }))
      }
      return success
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '重新排序时间线失败'
      console.error('Failed to reorder timelines:', error)
      set({ error: errorMessage })
      return false
    }
  },
}))
