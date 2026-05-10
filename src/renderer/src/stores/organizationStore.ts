/**
 * 组织架构图状态管理
 */

import { create } from 'zustand'
import type {
  OrganizationGraph,
  OrganizationGraphMeta,
  OrganizationNode,
  CreateOrganizationGraphOptions,
  UpdateOrganizationGraphOptions,
  CreateOrganizationNodeOptions,
  UpdateOrganizationNodeOptions
} from '@shared/organization'

interface OrganizationState {
  // 状态
  graphs: OrganizationGraphMeta[]
  currentGraph: OrganizationGraph | null
  isLoading: boolean
  error: string | null

  // 组织架构图管理
  loadList: () => Promise<void>
  loadGraph: (graphId: string) => Promise<void>
  createGraph: (options: CreateOrganizationGraphOptions) => Promise<OrganizationGraph | null>
  updateGraph: (graphId: string, updates: UpdateOrganizationGraphOptions) => Promise<void>
  deleteGraph: (graphId: string) => Promise<void>
  clearCurrentGraph: () => void

  // 节点管理
  addNode: (options: CreateOrganizationNodeOptions) => Promise<OrganizationNode | null>
  updateNode: (nodeId: string, updates: UpdateOrganizationNodeOptions) => Promise<void>
  deleteNode: (nodeId: string) => Promise<void>
  moveNode: (nodeId: string, newParentId: string | undefined) => Promise<void>

  // 缩略图
  saveThumbnail: (dataUrl: string) => Promise<void>

  // 导入导出
  exportGraph: (graphId: string) => Promise<string | null>
  importGraph: (jsonContent: string) => Promise<OrganizationGraph | null>

  // 辅助方法
  getNodeById: (nodeId: string) => OrganizationNode | undefined
  getRootNodes: () => OrganizationNode[]
  getChildren: (parentId: string) => OrganizationNode[]
  getDescendants: (nodeId: string) => OrganizationNode[]
  getAncestors: (nodeId: string) => OrganizationNode[]
  clearData: () => void
  // 批量设置方法（用于聚合接口）
  setGraphs: (graphs: OrganizationGraphMeta[]) => void
  // 排序
  reorderGraphs: (graphIds: string[]) => Promise<boolean>
}

export const useOrganizationStore = create<OrganizationState>((set, get) => ({
  // 初始状态
  graphs: [],
  currentGraph: null,
  isLoading: false,
  error: null,

  // 组织架构图管理
  loadList: async () => {
    set({ isLoading: true, error: null })
    try {
      const graphs = await window.api.organization.getList()
      set({ graphs, isLoading: false })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '加载组织架构图列表失败'
      console.error('Failed to load organization graphs:', error)
      set({ isLoading: false, error: errorMessage })
    }
  },

  loadGraph: async (graphId: string) => {
    set({ isLoading: true, error: null })
    try {
      const graph = await window.api.organization.get(graphId)
      set({ currentGraph: graph, isLoading: false })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '加载组织架构图失败'
      console.error('Failed to load organization graph:', error)
      set({ isLoading: false, error: errorMessage })
    }
  },

  createGraph: async (options: CreateOrganizationGraphOptions) => {
    set({ isLoading: true, error: null })
    try {
      const graph = await window.api.organization.create(options)
      set(state => ({
        graphs: [
          ...state.graphs,
          {
            id: graph.id,
            name: graph.name,
            description: graph.description,
            thumbnail: graph.thumbnail,
            linkedVocabularyTypes: graph.linkedVocabularyTypes,
            nodeStyle: graph.nodeStyle,
            nodeCount: graph.nodeCount,
            createdAt: graph.createdAt,
            updatedAt: graph.updatedAt
          }
        ],
        currentGraph: graph,
        isLoading: false
      }))
      return graph
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '创建组织架构图失败'
      console.error('Failed to create organization graph:', error)
      set({ isLoading: false, error: errorMessage })
      return null
    }
  },

  updateGraph: async (graphId: string, updates: UpdateOrganizationGraphOptions) => {
    try {
      const updatedGraph = await window.api.organization.update(graphId, updates)
      if (updatedGraph) {
        set(state => ({
          graphs: state.graphs.map(g =>
            g.id === graphId
              ? {
                  ...g,
                  name: updatedGraph.name,
                  description: updatedGraph.description,
                  thumbnail: updatedGraph.thumbnail,
                  linkedVocabularyTypes: updatedGraph.linkedVocabularyTypes,
                  nodeStyle: updatedGraph.nodeStyle,
                  nodeCount: updatedGraph.nodeCount,
                  updatedAt: updatedGraph.updatedAt
                }
              : g
          ),
          currentGraph: state.currentGraph?.id === graphId ? updatedGraph : state.currentGraph
        }))
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '更新组织架构图失败'
      console.error('Failed to update organization graph:', error)
      set({ error: errorMessage })
    }
  },

  deleteGraph: async (graphId: string) => {
    try {
      const success = await window.api.organization.delete(graphId)
      if (success) {
        set(state => ({
          graphs: state.graphs.filter(g => g.id !== graphId),
          currentGraph: state.currentGraph?.id === graphId ? null : state.currentGraph
        }))
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '删除组织架构图失败'
      console.error('Failed to delete organization graph:', error)
      set({ error: errorMessage })
    }
  },

  clearCurrentGraph: () => {
    set({ currentGraph: null })
  },

  // 节点管理
  addNode: async (options: CreateOrganizationNodeOptions) => {
    const { currentGraph } = get()
    if (!currentGraph) return null

    try {
      const newNode = await window.api.organization.addNode(currentGraph.id, options)
      if (newNode) {
        set(state => ({
          currentGraph: state.currentGraph
            ? {
                ...state.currentGraph,
                nodes: [...(state.currentGraph.nodes || []), newNode],
                nodeCount: (state.currentGraph.nodeCount || 0) + 1
              }
            : null
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

  updateNode: async (nodeId: string, updates: UpdateOrganizationNodeOptions) => {
    const { currentGraph } = get()
    if (!currentGraph) return

    try {
      const updatedNode = await window.api.organization.updateNode(
        currentGraph.id,
        nodeId,
        updates
      )
      if (updatedNode) {
        set(state => ({
          currentGraph: state.currentGraph
            ? {
                ...state.currentGraph,
                nodes: (state.currentGraph.nodes || []).map(n => (n.id === nodeId ? updatedNode : n))
              }
            : null
        }))
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '更新节点失败'
      console.error('Failed to update node:', error)
      set({ error: errorMessage })
    }
  },

  deleteNode: async (nodeId: string) => {
    const { currentGraph } = get()
    if (!currentGraph) return

    try {
      const success = await window.api.organization.deleteNode(currentGraph.id, nodeId)
      if (success) {
        // 获取要删除的节点及其所有后代节点
        const descendants = get().getDescendants(nodeId)
        const idsToDelete = new Set([nodeId, ...descendants.map(n => n.id)])

        set(state => ({
          currentGraph: state.currentGraph
            ? {
                ...state.currentGraph,
                nodes: (state.currentGraph.nodes || []).filter(n => !idsToDelete.has(n.id)),
                nodeCount: (state.currentGraph.nodeCount || 0) - idsToDelete.size
              }
            : null
        }))
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '删除节点失败'
      console.error('Failed to delete node:', error)
      set({ error: errorMessage })
    }
  },

  moveNode: async (nodeId: string, newParentId: string | undefined) => {
    const { currentGraph } = get()
    if (!currentGraph) return

    try {
      const updatedNode = await window.api.organization.moveNode(
        currentGraph.id,
        nodeId,
        newParentId
      )
      if (updatedNode) {
        set(state => ({
          currentGraph: state.currentGraph
            ? {
                ...state.currentGraph,
                nodes: (state.currentGraph.nodes || []).map(n => (n.id === nodeId ? updatedNode : n))
              }
            : null
        }))
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '移动节点失败'
      console.error('Failed to move node:', error)
      set({ error: errorMessage })
    }
  },

  // 缩略图
  saveThumbnail: async (dataUrl: string) => {
    const { currentGraph } = get()
    if (!currentGraph) return

    try {
      const thumbnailPath = await window.api.organization.saveThumbnail(
        currentGraph.id,
        dataUrl
      )
      if (thumbnailPath) {
        set(state => ({
          currentGraph: state.currentGraph
            ? { ...state.currentGraph, thumbnail: thumbnailPath }
            : null,
          graphs: state.graphs.map(g =>
            g.id === currentGraph.id ? { ...g, thumbnail: thumbnailPath } : g
          )
        }))
      }
    } catch (error) {
      console.error('Failed to save thumbnail:', error)
    }
  },

  // 导入导出
  exportGraph: async (graphId: string) => {
    try {
      return await window.api.organization.export(graphId)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '导出组织架构图失败'
      console.error('Failed to export organization graph:', error)
      set({ error: errorMessage })
      return null
    }
  },

  importGraph: async (jsonContent: string) => {
    try {
      const graph = await window.api.organization.import(jsonContent)
      if (graph) {
        set(state => ({
          graphs: [
            ...state.graphs,
            {
              id: graph.id,
              name: graph.name,
              description: graph.description,
              thumbnail: graph.thumbnail,
              linkedVocabularyTypes: graph.linkedVocabularyTypes,
              nodeStyle: graph.nodeStyle,
              nodeCount: graph.nodeCount,
              createdAt: graph.createdAt,
              updatedAt: graph.updatedAt
            }
          ]
        }))
      }
      return graph
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '导入组织架构图失败'
      console.error('Failed to import organization graph:', error)
      set({ error: errorMessage })
      return null
    }
  },

  // 辅助方法
  getNodeById: (nodeId: string) => {
    const { currentGraph } = get()
    return currentGraph?.nodes?.find(n => n.id === nodeId)
  },

  getRootNodes: () => {
    const { currentGraph } = get()
    if (!currentGraph) return []
    return (currentGraph.nodes || []).filter(n => !n.parentId).sort((a, b) => a.order - b.order)
  },

  getChildren: (parentId: string) => {
    const { currentGraph } = get()
    if (!currentGraph) return []
    return (currentGraph.nodes || []).filter(n => n.parentId === parentId).sort((a, b) => a.order - b.order)
  },

  getDescendants: (nodeId: string) => {
    const { currentGraph } = get()
    if (!currentGraph) return []

    const descendants: OrganizationNode[] = []
    const collectDescendants = (id: string) => {
      const children = (currentGraph.nodes || []).filter(n => n.parentId === id)
      for (const child of children) {
        descendants.push(child)
        collectDescendants(child.id)
      }
    }
    collectDescendants(nodeId)
    return descendants
  },

  getAncestors: (nodeId: string) => {
    const { currentGraph } = get()
    if (!currentGraph) return []

    const ancestors: OrganizationNode[] = []
    let current = (currentGraph.nodes || []).find(n => n.id === nodeId)
    while (current?.parentId) {
      const parent = (currentGraph.nodes || []).find(n => n.id === current!.parentId)
      if (parent) {
        ancestors.push(parent)
        current = parent
      } else {
        break
      }
    }
    return ancestors
  },

  clearData: () => {
    set({
      graphs: [],
      currentGraph: null,
      isLoading: false,
      error: null
    })
  },

  // 批量设置数据（用于聚合接口）
  setGraphs: (graphs: OrganizationGraphMeta[]) => {
    set({ graphs, isLoading: false, error: null })
  },

  // 排序
  reorderGraphs: async (graphIds: string[]) => {
    try {
      const success = await window.api.organization.reorderGraphs(graphIds)
      if (success) {
        // 更新本地状态中的排序
        set(state => ({
          graphs: graphIds
            .map(id => state.graphs.find(g => g.id === id))
            .filter((g): g is OrganizationGraphMeta => g !== undefined)
        }))
      }
      return success
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '排序保存失败'
      console.error('Failed to reorder organization graphs:', error)
      set({ error: errorMessage })
      return false
    }
  }
}))
