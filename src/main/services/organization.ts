/**
 * 组织架构图服务
 * 负责组织架构图的 CRUD 操作和树形节点管理
 */

import JSON5 from 'json5'
import {
  OrganizationGraph,
  OrganizationGraphMeta,
  OrganizationNode,
  CreateOrganizationGraphOptions,
  UpdateOrganizationGraphOptions,
  CreateOrganizationNodeOptions,
  UpdateOrganizationNodeOptions,
  ORGANIZATION_NODE_COLORS
} from '../types/organization'
import { BaseService } from './base'

/**
 * 组织架构图服务
 * 继承 BaseService 实现通用 CRUD 操作
 */
class OrganizationService extends BaseService<OrganizationGraph, OrganizationGraphMeta> {
  constructor() {
    super({ dataSubDir: 'organizations' })
  }

  // ============================================
  // BaseService 抽象方法实现
  // ============================================

  protected parseEntity(content: string): OrganizationGraph | null {
    try {
      return JSON5.parse(content) as OrganizationGraph
    } catch {
      return null
    }
  }

  protected serializeEntity(item: OrganizationGraph): string {
    return JSON5.stringify(item, null, 2)
  }

  protected toMetadata(item: OrganizationGraph): OrganizationGraphMeta {
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
      nodeStyle: item.nodeStyle || 'simple',
      nodeCount: item.nodes.length,
      viewState: item.viewState,
      order: item.order ?? 0,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt
    }
  }

  protected sortItems(items: OrganizationGraphMeta[]): OrganizationGraphMeta[] {
    // 按更新时间排序
    return items.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
  }

  // ============================================
  // 组织架构图管理
  // ============================================

  /**
   * 创建组织架构图
   */
  createGraph(options: CreateOrganizationGraphOptions): OrganizationGraph {
    const now = this.getTimestamp()
    const graphId = this.generateId()

    // 获取当前最大 order
    const existingGraphs = this.getList()
    const maxOrder =
      existingGraphs.length > 0 ? Math.max(...existingGraphs.map(g => g.order ?? 0)) : -1

    const graph: OrganizationGraph = {
      id: graphId,
      name: options.name.trim(),
      description: options.description,
      thumbnail: undefined,
      linkedVocabularyTypes: options.linkedVocabularyTypes || [],
      nodeStyle: options.nodeStyle || 'simple',
      nodes: [],
      nodeCount: 0,
      order: maxOrder + 1,
      createdAt: now,
      updatedAt: now
    }

    // 如果需要创建根节点
    if (options.createRootNode !== false) {
      const rootNode: OrganizationNode = {
        id: this.generateId(),
        name: options.rootNodeName || graph.name,
        color: ORGANIZATION_NODE_COLORS[0],
        order: 0,
        createdAt: now,
        updatedAt: now
      }
      graph.nodes.push(rootNode)
      graph.nodeCount = 1
    }

    this.save(graph)
    return graph
  }

  /**
   * 更新组织架构图
   */
  updateGraph(graphId: string, updates: UpdateOrganizationGraphOptions): OrganizationGraph | null {
    const graph = this.get(graphId)
    if (!graph) return null

    const now = this.getTimestamp()

    const updatedGraph: OrganizationGraph = {
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

    this.save(updatedGraph)
    return updatedGraph
  }

  // ============================================
  // 节点管理
  // ============================================

  /**
   * 添加节点
   */
  addNode(graphId: string, options: CreateOrganizationNodeOptions): OrganizationNode | null {
    const graph = this.get(graphId)
    if (!graph) return null

    const now = this.getTimestamp()

    // 获取同级节点的最大排序值
    const siblings = graph.nodes.filter(n => n.parentId === options.parentId)
    const maxOrder = siblings.length > 0 ? Math.max(...siblings.map(n => n.order)) : -1

    const newNode: OrganizationNode = {
      id: this.generateId(),
      name: options.name.trim(),
      parentId: options.parentId,
      description: options.description,
      color: options.color || ORGANIZATION_NODE_COLORS[0],
      linkedTypeId: options.linkedTypeId,
      linkedEntryId: options.linkedEntryId,
      order: maxOrder + 1,
      collapsed: false,
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
  updateNode(
    graphId: string,
    nodeId: string,
    updates: UpdateOrganizationNodeOptions
  ): OrganizationNode | null {
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
   * 删除节点（及其所有子节点）
   */
  deleteNode(graphId: string, nodeId: string): boolean {
    const graph = this.get(graphId)
    if (!graph) return false

    const nodeIndex = graph.nodes.findIndex(n => n.id === nodeId)
    if (nodeIndex === -1) return false

    const now = this.getTimestamp()

    // 递归获取所有子孙节点
    const getDescendants = (parentId: string): string[] => {
      const children = graph.nodes.filter(n => n.parentId === parentId)
      const result: string[] = children.map(c => c.id)
      for (const child of children) {
        result.push(...getDescendants(child.id))
      }
      return result
    }

    const descendantIds = getDescendants(nodeId)
    const idsToDelete = [nodeId, ...descendantIds]

    // 删除节点及其子孙节点
    graph.nodes = graph.nodes.filter(n => !idsToDelete.includes(n.id))
    graph.nodeCount = graph.nodes.length
    graph.updatedAt = now

    this.save(graph)
    return true
  }

  /**
   * 移动节点（更改父节点）
   */
  moveNode(
    graphId: string,
    nodeId: string,
    newParentId: string | undefined
  ): OrganizationNode | null {
    const graph = this.get(graphId)
    if (!graph) return null

    const nodeIndex = graph.nodes.findIndex(n => n.id === nodeId)
    if (nodeIndex === -1) return null

    // 不能将节点移动到自己的子孙节点下
    if (newParentId) {
      const getDescendants = (parentId: string): string[] => {
        const children = graph.nodes.filter(n => n.parentId === parentId)
        const result: string[] = children.map(c => c.id)
        for (const child of children) {
          result.push(...getDescendants(child.id))
        }
        return result
      }

      const descendants = getDescendants(nodeId)
      if (descendants.includes(newParentId)) {
        return null
      }
    }

    const now = this.getTimestamp()

    // 获取新父节点下的最大排序值
    const siblings = graph.nodes.filter(n => n.parentId === newParentId && n.id !== nodeId)
    const maxOrder = siblings.length > 0 ? Math.max(...siblings.map(n => n.order)) : -1

    graph.nodes[nodeIndex] = {
      ...graph.nodes[nodeIndex],
      parentId: newParentId,
      order: maxOrder + 1,
      updatedAt: now
    }

    graph.updatedAt = now
    this.save(graph)
    return graph.nodes[nodeIndex]
  }

  /**
   * 获取直接子节点
   */
  getChildren(graphId: string, parentId: string | undefined): OrganizationNode[] {
    const graph = this.get(graphId)
    if (!graph) return []

    return graph.nodes.filter(n => n.parentId === parentId).sort((a, b) => a.order - b.order)
  }

  /**
   * 获取所有子孙节点
   */
  getDescendants(graphId: string, nodeId: string): OrganizationNode[] {
    const graph = this.get(graphId)
    if (!graph) return []

    const getDescendantsRecursive = (parentId: string): OrganizationNode[] => {
      const children = graph.nodes.filter(n => n.parentId === parentId)
      const result: OrganizationNode[] = [...children]
      for (const child of children) {
        result.push(...getDescendantsRecursive(child.id))
      }
      return result
    }

    return getDescendantsRecursive(nodeId)
  }

  /**
   * 获取所有祖先节点
   */
  getAncestors(graphId: string, nodeId: string): OrganizationNode[] {
    const graph = this.get(graphId)
    if (!graph) return []

    const result: OrganizationNode[] = []
    let currentNode = graph.nodes.find(n => n.id === nodeId)

    while (currentNode?.parentId) {
      const parent = graph.nodes.find(n => n.id === currentNode!.parentId)
      if (parent) {
        result.push(parent)
        currentNode = parent
      } else {
        break
      }
    }

    return result
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
   * 导入组织架构图（覆盖基类方法）
   */
  override importItem(jsonContent: string): OrganizationGraph | null {
    try {
      const graph = JSON5.parse(jsonContent) as OrganizationGraph

      const newId = this.generateId()
      const now = this.getTimestamp()

      // 获取当前最大 order
      const existingGraphs = this.getList()
      const maxOrder =
        existingGraphs.length > 0 ? Math.max(...existingGraphs.map(g => g.order ?? 0)) : -1

      const importedGraph: OrganizationGraph = {
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
      this.logger.error('导入组织架构图失败', error)
      return null
    }
  }

  /**
   * 重新排序组织架构图列表
   */
  reorderGraphs(graphIds: string[]): boolean {
    try {
      for (let i = 0; i < graphIds.length; i++) {
        const graph = this.get(graphIds[i])
        if (graph) {
          graph.order = i
          graph.updatedAt = this.getTimestamp()
          this.save(graph)
        }
      }
      return true
    } catch (error) {
      this.logger.error('重排组织架构图顺序失败', error)
      return false
    }
  }
}

// 单例导出
export const organizationService = new OrganizationService()
