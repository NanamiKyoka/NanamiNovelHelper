/**
 * 关系图状态管理
 */

import { create } from 'zustand'
import { createErrorHandler } from '@utils/error'
import { BUILTIN_RELATION_TYPES } from '@shared/constants'
import type {
  RelationshipGraph,
  RelationshipGraphMeta,
  RelationshipNode,
  RelationshipEdge,
  RelationType,
  CreateRelationshipGraphOptions,
  UpdateRelationshipGraphOptions
} from '@shared/relationship'

// 创建带前缀的错误处理器
const handleError = createErrorHandler('[RelationshipStore]')

interface RelationshipState {
  // 状态
  graphs: RelationshipGraphMeta[]
  currentGraph: RelationshipGraph | null
  isLoading: boolean
  error: string | null

  // 关系图管理
  loadList: () => Promise<void>
  loadGraph: (graphId: string) => Promise<void>
  createGraph: (options: CreateRelationshipGraphOptions) => Promise<RelationshipGraph | null>
  updateGraph: (graphId: string, updates: UpdateRelationshipGraphOptions) => Promise<void>
  deleteGraph: (graphId: string) => Promise<void>
  clearCurrentGraph: () => void

  // 节点管理
  addNode: (
    node: Omit<RelationshipNode, 'id' | 'createdAt' | 'updatedAt'>
  ) => Promise<RelationshipNode | null>
  updateNode: (nodeId: string, updates: Partial<RelationshipNode>) => Promise<void>
  deleteNode: (nodeId: string) => Promise<void>

  // 边管理
  addEdge: (
    edge: Omit<RelationshipEdge, 'id' | 'createdAt' | 'updatedAt'>
  ) => Promise<RelationshipEdge | null>
  updateEdge: (edgeId: string, updates: Partial<RelationshipEdge>) => Promise<void>
  deleteEdge: (edgeId: string) => Promise<void>

  // 关系类型管理
  getRelationTypes: () => RelationType[]
  addRelationType: (
    type: Omit<RelationType, 'id' | 'isBuiltIn' | 'order'>
  ) => Promise<RelationType | null>
  updateRelationType: (typeId: string, updates: Partial<RelationType>) => Promise<void>
  deleteRelationType: (typeId: string) => Promise<void>

  // 缩略图
  saveThumbnail: (dataUrl: string) => Promise<void>

  // 导入导出
  exportGraph: (graphId: string) => Promise<string | null>
  importGraph: (jsonContent: string) => Promise<RelationshipGraph | null>

  // 辅助方法
  getNodeById: (nodeId: string) => RelationshipNode | undefined
  getEdgeById: (edgeId: string) => RelationshipEdge | undefined
  getRelationTypeById: (typeId: string) => RelationType | undefined
  clearData: () => void
  // 批量设置方法（用于聚合接口）
  setGraphs: (graphs: RelationshipGraphMeta[]) => void
  // 排序方法
  reorderGraphs: (graphIds: string[]) => Promise<boolean>
}

export const useRelationshipStore = create<RelationshipState>((set, get) => ({
  // 初始状态
  graphs: [],
  currentGraph: null,
  isLoading: false,
  error: null,

  // 关系图管理
  loadList: async () => {
    set({ isLoading: true, error: null })
    try {
      const graphs = await window.electron.relationship.getList()
      set({ graphs, isLoading: false })
    } catch (error) {
      const errorMessage = handleError(error, { fallbackMessage: '加载关系图列表失败' })
      set({ isLoading: false, error: errorMessage })
    }
  },

  loadGraph: async (graphId: string) => {
    set({ isLoading: true, error: null })
    try {
      const graph = await window.electron.relationship.get(graphId)
      set({ currentGraph: graph, isLoading: false })
    } catch (error) {
      const errorMessage = handleError(error, { fallbackMessage: '加载关系图失败' })
      set({ isLoading: false, error: errorMessage })
    }
  },

  createGraph: async (options: CreateRelationshipGraphOptions) => {
    set({ isLoading: true, error: null })
    try {
      const graph = await window.electron.relationship.create(options)
      set(state => ({
        graphs: [
          ...state.graphs,
          {
            id: graph.id,
            name: graph.name,
            description: graph.description,
            thumbnail: graph.thumbnail,
            linkedVocabularyTypes: graph.linkedVocabularyTypes,
            customRelationTypes: graph.customRelationTypes,
            nodeStyle: graph.nodeStyle,
            nodeCount: graph.nodeCount,
            edgeCount: graph.edgeCount,
            createdAt: graph.createdAt,
            updatedAt: graph.updatedAt
          }
        ],
        currentGraph: graph,
        isLoading: false
      }))
      return graph
    } catch (error) {
      const errorMessage = handleError(error, { fallbackMessage: '创建关系图失败' })
      set({ isLoading: false, error: errorMessage })
      return null
    }
  },

  updateGraph: async (graphId: string, updates: UpdateRelationshipGraphOptions) => {
    try {
      const updatedGraph = await window.electron.relationship.update(graphId, updates)
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
                  customRelationTypes: updatedGraph.customRelationTypes,
                  nodeStyle: updatedGraph.nodeStyle,
                  nodeCount: updatedGraph.nodeCount,
                  edgeCount: updatedGraph.edgeCount,
                  updatedAt: updatedGraph.updatedAt
                }
              : g
          ),
          currentGraph: state.currentGraph?.id === graphId ? updatedGraph : state.currentGraph
        }))
      }
    } catch (error) {
      const errorMessage = handleError(error, { fallbackMessage: '更新关系图失败' })
      set({ error: errorMessage })
    }
  },

  deleteGraph: async (graphId: string) => {
    try {
      const success = await window.electron.relationship.delete(graphId)
      if (success) {
        set(state => ({
          graphs: state.graphs.filter(g => g.id !== graphId),
          currentGraph: state.currentGraph?.id === graphId ? null : state.currentGraph
        }))
      }
    } catch (error) {
      const errorMessage = handleError(error, { fallbackMessage: '删除关系图失败' })
      set({ error: errorMessage })
    }
  },

  clearCurrentGraph: () => {
    set({ currentGraph: null })
  },

  // 节点管理
  addNode: async (node: Omit<RelationshipNode, 'id' | 'createdAt' | 'updatedAt'>) => {
    const { currentGraph } = get()
    if (!currentGraph) return null

    try {
      const newNode = await window.electron.relationship.addNode(currentGraph.id, node)
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

  updateNode: async (nodeId: string, updates: Partial<RelationshipNode>) => {
    const { currentGraph } = get()
    if (!currentGraph) return

    try {
      const updatedNode = await window.electron.relationship.updateNode(
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
      const success = await window.electron.relationship.deleteNode(currentGraph.id, nodeId)
      if (success) {
        set(state => ({
          currentGraph: state.currentGraph
            ? {
                ...state.currentGraph,
                nodes: (state.currentGraph.nodes || []).filter(n => n.id !== nodeId),
                edges: (state.currentGraph.edges || []).filter(
                  e => e.source !== nodeId && e.target !== nodeId
                ),
                nodeCount: (state.currentGraph.nodeCount || 0) - 1
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

  // 边管理
  addEdge: async (edge: Omit<RelationshipEdge, 'id' | 'createdAt' | 'updatedAt'>) => {
    const { currentGraph } = get()
    if (!currentGraph) return null

    try {
      const newEdge = await window.electron.relationship.addEdge(currentGraph.id, edge)
      if (newEdge) {
        set(state => ({
          currentGraph: state.currentGraph
            ? {
                ...state.currentGraph,
                edges: [...state.currentGraph.edges, newEdge],
                edgeCount: state.currentGraph.edgeCount + 1
              }
            : null
        }))
      }
      return newEdge
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '添加关系失败'
      console.error('Failed to add edge:', error)
      set({ error: errorMessage })
      return null
    }
  },

  updateEdge: async (edgeId: string, updates: Partial<RelationshipEdge>) => {
    const { currentGraph } = get()
    if (!currentGraph) return

    try {
      const updatedEdge = await window.electron.relationship.updateEdge(
        currentGraph.id,
        edgeId,
        updates
      )
      if (updatedEdge) {
        set(state => ({
          currentGraph: state.currentGraph
            ? {
                ...state.currentGraph,
                edges: (state.currentGraph.edges || []).map(e => (e.id === edgeId ? updatedEdge : e))
              }
            : null
        }))
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '更新关系失败'
      console.error('Failed to update edge:', error)
      set({ error: errorMessage })
    }
  },

  deleteEdge: async (edgeId: string) => {
    const { currentGraph } = get()
    if (!currentGraph) return

    try {
      const success = await window.electron.relationship.deleteEdge(currentGraph.id, edgeId)
      if (success) {
        set(state => ({
          currentGraph: state.currentGraph
            ? {
                ...state.currentGraph,
                edges: (state.currentGraph.edges || []).filter(e => e.id !== edgeId),
                edgeCount: (state.currentGraph.edgeCount || 0) - 1
              }
            : null
        }))
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '删除关系失败'
      console.error('Failed to delete edge:', error)
      set({ error: errorMessage })
    }
  },

  // 关系类型管理
  getRelationTypes: () => {
    const { currentGraph } = get()
    if (!currentGraph) return BUILTIN_RELATION_TYPES

    // 合并内置类型和自定义类型
    return [...BUILTIN_RELATION_TYPES, ...currentGraph.customRelationTypes].sort(
      (a, b) => a.order - b.order
    )
  },

  addRelationType: async (type: Omit<RelationType, 'id' | 'isBuiltIn' | 'order'>) => {
    const { currentGraph } = get()
    if (!currentGraph) return null

    try {
      const newType = await window.electron.relationship.addRelationType(currentGraph.id, type)
      if (newType) {
        set(state => ({
          currentGraph: state.currentGraph
            ? {
                ...state.currentGraph,
                customRelationTypes: [...state.currentGraph.customRelationTypes, newType]
              }
            : null
        }))
      }
      return newType
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '添加关系类型失败'
      console.error('Failed to add relation type:', error)
      set({ error: errorMessage })
      return null
    }
  },

  updateRelationType: async (typeId: string, updates: Partial<RelationType>) => {
    const { currentGraph } = get()
    if (!currentGraph) return

    try {
      const updatedType = await window.electron.relationship.updateRelationType(
        currentGraph.id,
        typeId,
        updates
      )
      if (updatedType) {
        set(state => ({
          currentGraph: state.currentGraph
            ? {
                ...state.currentGraph,
                customRelationTypes: (state.currentGraph.customRelationTypes || []).map(t =>
                  t.id === typeId ? updatedType : t
                )
              }
            : null
        }))
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '更新关系类型失败'
      console.error('Failed to update relation type:', error)
      set({ error: errorMessage })
    }
  },

  deleteRelationType: async (typeId: string) => {
    const { currentGraph } = get()
    if (!currentGraph) return

    try {
      const success = await window.electron.relationship.deleteRelationType(currentGraph.id, typeId)
      if (success) {
        set(state => ({
          currentGraph: state.currentGraph
            ? {
                ...state.currentGraph,
                customRelationTypes: state.currentGraph.customRelationTypes.filter(
                  t => t.id !== typeId
                )
              }
            : null
        }))
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '删除关系类型失败'
      console.error('Failed to delete relation type:', error)
      set({ error: errorMessage })
    }
  },

  // 缩略图
  saveThumbnail: async (dataUrl: string) => {
    const { currentGraph } = get()
    if (!currentGraph) return

    try {
      const thumbnailPath = await window.electron.relationship.saveThumbnail(
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
      return await window.electron.relationship.export(graphId)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '导出关系图失败'
      console.error('Failed to export relationship graph:', error)
      set({ error: errorMessage })
      return null
    }
  },

  importGraph: async (jsonContent: string) => {
    try {
      const graph = await window.electron.relationship.import(jsonContent)
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
              customRelationTypes: graph.customRelationTypes,
              nodeStyle: graph.nodeStyle,
              nodeCount: graph.nodeCount,
              edgeCount: graph.edgeCount,
              createdAt: graph.createdAt,
              updatedAt: graph.updatedAt
            }
          ]
        }))
      }
      return graph
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '导入关系图失败'
      console.error('Failed to import relationship graph:', error)
      set({ error: errorMessage })
      return null
    }
  },

  // 辅助方法
  getNodeById: (nodeId: string) => {
    const { currentGraph } = get()
    return currentGraph?.nodes?.find(n => n.id === nodeId)
  },

  getEdgeById: (edgeId: string) => {
    const { currentGraph } = get()
    return currentGraph?.edges?.find(e => e.id === edgeId)
  },

  getRelationTypeById: (typeId: string) => {
    const types = get().getRelationTypes()
    return types.find(t => t.id === typeId)
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
  setGraphs: (graphs: RelationshipGraphMeta[]) => {
    set({ graphs, isLoading: false, error: null })
  },

  // 重新排序关系图
  reorderGraphs: async (graphIds: string[]): Promise<boolean> => {
    try {
      const success = await window.electron.relationship.reorderGraphs(graphIds)
      if (success) {
        // 按新顺序更新本地状态
        set(state => {
          const graphMap = new Map(state.graphs.map(g => [g.id, g]))
          const reorderedGraphs = graphIds
            .map(id => graphMap.get(id))
            .filter((g): g is RelationshipGraphMeta => g !== undefined)
          return { graphs: reorderedGraphs }
        })
      }
      return success
    } catch (error) {
      const errorMessage = handleError(error, { fallbackMessage: '排序关系图失败' })
      set({ error: errorMessage })
      return false
    }
  }
}))
