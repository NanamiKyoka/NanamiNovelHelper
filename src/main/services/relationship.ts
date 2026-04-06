/**
 * 关系图服务
 * 负责关系图的 CRUD 操作、节点/边管理和缩略图生成
 */

import JSON5 from 'json5'
import {
  RelationshipGraph,
  RelationshipGraphMeta,
  RelationshipNode,
  RelationshipEdge,
  RelationType,
  CreateRelationshipGraphOptions,
  UpdateRelationshipGraphOptions,
  BUILTIN_RELATION_TYPES
} from '../types/relationship'
import { BaseService } from './base'

/**
 * 关系图服务
 * 继承 BaseService 实现通用 CRUD 操作
 */
class RelationshipService extends BaseService<RelationshipGraph, RelationshipGraphMeta> {
  constructor() {
    super({ dataSubDir: 'relationships' })
  }

  // ============================================
  // BaseService 抽象方法实现
  // ============================================

  protected parseEntity(content: string): RelationshipGraph | null {
    try {
      return JSON5.parse(content) as RelationshipGraph
    } catch {
      return null
    }
  }

  protected serializeEntity(item: RelationshipGraph): string {
    return JSON5.stringify(item, null, 2)
  }

  protected toMetadata(item: RelationshipGraph): RelationshipGraphMeta {
    // 获取缩略图完整路径
    let thumbnailPath: string | undefined = undefined
    if (item.thumbnail) {
      const fullPath = this.getThumbnailFullPath(item.id)
      if (fullPath) {
        thumbnailPath = fullPath
      }
    }

    return {
      id: item.id,
      name: item.name,
      description: item.description,
      thumbnail: thumbnailPath,
      linkedVocabularyTypes: item.linkedVocabularyTypes,
      customRelationTypes: item.customRelationTypes || [],
      nodeStyle: item.nodeStyle || 'circle',
      nodeCount: item.nodes.length,
      edgeCount: item.edges.length,
      viewState: item.viewState,
      order: item.order ?? 0,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt
    }
  }

  protected sortItems(items: RelationshipGraphMeta[]): RelationshipGraphMeta[] {
    // 按更新时间排序
    return items.sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )
  }

  // ============================================
  // 关系图管理
  // ============================================

  /**
   * 创建关系图
   */
  createGraph(options: CreateRelationshipGraphOptions): RelationshipGraph {
    const now = this.getTimestamp()
    const graphId = this.generateId()

    // 获取当前最大 order
    const existingGraphs = this.getList()
    const maxOrder = existingGraphs.length > 0
      ? Math.max(...existingGraphs.map(g => g.order ?? 0))
      : -1

    const graph: RelationshipGraph = {
      id: graphId,
      name: options.name.trim(),
      description: options.description,
      thumbnail: undefined,
      linkedVocabularyTypes: options.linkedVocabularyTypes || [],
      customRelationTypes: [],
      nodeStyle: options.nodeStyle || 'circle',
      nodes: [],
      edges: [],
      nodeCount: 0,
      edgeCount: 0,
      order: maxOrder + 1,
      createdAt: now,
      updatedAt: now
    }

    this.save(graph)
    return graph
  }

  /**
   * 更新关系图
   */
  updateGraph(graphId: string, updates: UpdateRelationshipGraphOptions): RelationshipGraph | null {
    const graph = this.get(graphId)
    if (!graph) return null

    const now = this.getTimestamp()
    
    const updatedGraph: RelationshipGraph = {
      ...graph,
      ...updates,
      id: graph.id,
      createdAt: graph.createdAt,
      updatedAt: now
    }

    // 更新计数
    if (updates.nodes !== undefined) {
      updatedGraph.nodeCount = updates.nodes.length
    }
    if (updates.edges !== undefined) {
      updatedGraph.edgeCount = updates.edges.length
    }

    this.save(updatedGraph)
    return updatedGraph
  }

  // ============================================
  // 节点管理
  // ============================================

  /**
   * 添加节点
   */
  addNode(graphId: string, node: Omit<RelationshipNode, 'id' | 'createdAt' | 'updatedAt'>): RelationshipNode | null {
    const graph = this.get(graphId)
    if (!graph) return null

    const now = this.getTimestamp()
    const newNode: RelationshipNode = {
      ...node,
      id: this.generateId(),
      createdAt: now,
      updatedAt: now
    }

    graph.nodes.push(newNode)
    graph.nodeCount = graph.nodes.length
    graph.updatedAt = now

    this.save(graph)
    return newNode
  }

  /**
   * 更新节点
   */
  updateNode(graphId: string, nodeId: string, updates: Partial<RelationshipNode>): RelationshipNode | null {
    const graph = this.get(graphId)
    if (!graph) return null

    const nodeIndex = graph.nodes.findIndex(n => n.id === nodeId)
    if (nodeIndex === -1) return null

    const now = this.getTimestamp()
    graph.nodes[nodeIndex] = {
      ...graph.nodes[nodeIndex],
      ...updates,
      id: graph.nodes[nodeIndex].id,
      createdAt: graph.nodes[nodeIndex].createdAt,
      updatedAt: now
    }

    graph.updatedAt = now
    this.save(graph)
    return graph.nodes[nodeIndex]
  }

  /**
   * 删除节点（同时删除相关边）
   */
  deleteNode(graphId: string, nodeId: string): boolean {
    const graph = this.get(graphId)
    if (!graph) return false

    const nodeIndex = graph.nodes.findIndex(n => n.id === nodeId)
    if (nodeIndex === -1) return false

    const now = this.getTimestamp()

    // 删除节点
    graph.nodes.splice(nodeIndex, 1)
    graph.nodeCount = graph.nodes.length

    // 删除与该节点相关的所有边
    graph.edges = graph.edges.filter(e => e.source !== nodeId && e.target !== nodeId)
    graph.edgeCount = graph.edges.length

    graph.updatedAt = now
    this.save(graph)
    return true
  }

  // ============================================
  // 边管理
  // ============================================

  /**
   * 添加边
   */
  addEdge(graphId: string, edge: Omit<RelationshipEdge, 'id' | 'createdAt' | 'updatedAt'>): RelationshipEdge | null {
    const graph = this.get(graphId)
    if (!graph) return null

    // 检查节点是否存在
    const sourceExists = graph.nodes.some(n => n.id === edge.source)
    const targetExists = graph.nodes.some(n => n.id === edge.target)
    if (!sourceExists || !targetExists) return null

    const now = this.getTimestamp()
    const newEdge: RelationshipEdge = {
      ...edge,
      id: this.generateId(),
      createdAt: now,
      updatedAt: now
    }

    graph.edges.push(newEdge)
    graph.edgeCount = graph.edges.length
    graph.updatedAt = now

    this.save(graph)
    return newEdge
  }

  /**
   * 更新边
   */
  updateEdge(graphId: string, edgeId: string, updates: Partial<RelationshipEdge>): RelationshipEdge | null {
    const graph = this.get(graphId)
    if (!graph) return null

    const edgeIndex = graph.edges.findIndex(e => e.id === edgeId)
    if (edgeIndex === -1) return null

    const now = this.getTimestamp()
    graph.edges[edgeIndex] = {
      ...graph.edges[edgeIndex],
      ...updates,
      id: graph.edges[edgeIndex].id,
      createdAt: graph.edges[edgeIndex].createdAt,
      updatedAt: now
    }

    graph.updatedAt = now
    this.save(graph)
    return graph.edges[edgeIndex]
  }

  /**
   * 删除边
   */
  deleteEdge(graphId: string, edgeId: string): boolean {
    const graph = this.get(graphId)
    if (!graph) return false

    const edgeIndex = graph.edges.findIndex(e => e.id === edgeId)
    if (edgeIndex === -1) return false

    const now = this.getTimestamp()
    graph.edges.splice(edgeIndex, 1)
    graph.edgeCount = graph.edges.length
    graph.updatedAt = now

    this.save(graph)
    return true
  }

  // ============================================
  // 关系类型管理
  // ============================================

  /**
   * 获取所有关系类型（内置 + 自定义）
   */
  getRelationTypes(graphId: string): RelationType[] {
    const graph = this.get(graphId)
    if (!graph) return BUILTIN_RELATION_TYPES

    return [...BUILTIN_RELATION_TYPES, ...(graph.customRelationTypes || [])]
  }

  /**
   * 添加自定义关系类型
   */
  addCustomRelationType(graphId: string, type: Omit<RelationType, 'id' | 'isBuiltIn' | 'order'>): RelationType | null {
    const graph = this.get(graphId)
    if (!graph) return null

    const newType: RelationType = {
      ...type,
      id: this.generateId(),
      isBuiltIn: false,
      order: BUILTIN_RELATION_TYPES.length + (graph.customRelationTypes?.length || 0)
    }

    if (!graph.customRelationTypes) {
      graph.customRelationTypes = []
    }
    graph.customRelationTypes.push(newType)

    const now = this.getTimestamp()
    graph.updatedAt = now
    this.save(graph)

    return newType
  }

  /**
   * 更新自定义关系类型
   */
  updateCustomRelationType(graphId: string, typeId: string, updates: Partial<RelationType>): RelationType | null {
    const graph = this.get(graphId)
    if (!graph || !graph.customRelationTypes) return null

    const typeIndex = graph.customRelationTypes.findIndex(t => t.id === typeId)
    if (typeIndex === -1) return null

    const now = this.getTimestamp()
    graph.customRelationTypes[typeIndex] = {
      ...graph.customRelationTypes[typeIndex],
      ...updates,
      id: graph.customRelationTypes[typeIndex].id,
      isBuiltIn: false
    }

    graph.updatedAt = now
    this.save(graph)
    return graph.customRelationTypes[typeIndex]
  }

  /**
   * 删除自定义关系类型
   */
  deleteCustomRelationType(graphId: string, typeId: string): boolean {
    const graph = this.get(graphId)
    if (!graph || !graph.customRelationTypes) return false

    const typeIndex = graph.customRelationTypes.findIndex(t => t.id === typeId)
    if (typeIndex === -1) return false

    const now = this.getTimestamp()
    graph.customRelationTypes.splice(typeIndex, 1)
    graph.updatedAt = now
    this.save(graph)
    return true
  }

  // ============================================
  // 缩略图（扩展基类方法）
  // ============================================

  /**
   * 保存缩略图（扩展基类方法以更新元数据）
   */
  override saveThumbnail(graphId: string, dataUrl: string): string | null {
    const result = super.saveThumbnail(graphId, dataUrl)
    if (result) {
      const graph = this.get(graphId)
      if (graph) {
        graph.thumbnail = `${graphId}.png`
        this.save(graph)
      }
    }
    return result
  }

  // ============================================
  // 导入导出
  // ============================================

  /**
   * 导入关系图（覆盖基类方法）
   */
  override importItem(jsonContent: string): RelationshipGraph | null {
    try {
      const graph = JSON5.parse(jsonContent) as RelationshipGraph
      
      const newId = this.generateId()
      const now = this.getTimestamp()

      // 获取当前最大 order
      const existingGraphs = this.getList()
      const maxOrder = existingGraphs.length > 0
        ? Math.max(...existingGraphs.map(g => g.order ?? 0))
        : -1
      
      const importedGraph: RelationshipGraph = {
        ...graph,
        id: newId,
        name: `${graph.name} (导入)`,
        order: maxOrder + 1,
        createdAt: now,
        updatedAt: now,
        thumbnail: undefined
      }

      this.save(importedGraph)
      return importedGraph
    } catch (error) {
      this.logger.error('Failed to import relationship graph', error)
      return null
    }
  }

  /**
   * 重新排序关系图
   */
  reorderGraphs(graphIds: string[]): boolean {
    try {
      graphIds.forEach((graphId, index) => {
        const graph = this.get(graphId)
        if (graph) {
          graph.order = index
          graph.updatedAt = this.getTimestamp()
          this.save(graph)
        }
      })
      return true
    } catch (error) {
      this.logger.error('Failed to reorder relationship graphs', error)
      return false
    }
  }
}

// 单例导出
export const relationshipService = new RelationshipService()