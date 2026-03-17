/**
 * 组织架构图服务
 * 负责组织架构图的 CRUD 操作和树形节点管理
 */

import * as fs from 'fs'
import * as path from 'path'
import { v4 as uuidv4 } from 'uuid'
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
import { PROJECT_META_DIR } from '../types/project'

// 数据目录名
const DATA_DIR = 'data'
const ORGANIZATIONS_DIR = 'organizations'

class OrganizationService {
  private projectPath: string | null = null
  private organizationsDir: string | null = null

  /**
   * 初始化服务
   */
  init(projectPath: string): void {
    this.projectPath = projectPath
    this.organizationsDir = path.join(
      projectPath,
      PROJECT_META_DIR,
      DATA_DIR,
      ORGANIZATIONS_DIR
    )
    this.ensureDirectories()
  }

  /**
   * 确保目录存在
   */
  private ensureDirectories(): void {
    if (!this.projectPath || !this.organizationsDir) return

    if (!fs.existsSync(this.organizationsDir)) {
      fs.mkdirSync(this.organizationsDir, { recursive: true })
    }
  }

  /**
   * 获取组织架构图文件路径
   */
  private getGraphPath(graphId: string): string {
    return path.join(this.organizationsDir!, `${graphId}.json5`)
  }

  /**
   * 获取缩略图路径
   */
  private getThumbnailPath(graphId: string): string {
    return path.join(this.organizationsDir!, `${graphId}.png`)
  }

  // ============================================
  // 组织架构图管理
  // ============================================

  /**
   * 获取所有组织架构图列表
   */
  getGraphList(): OrganizationGraphMeta[] {
    if (!this.organizationsDir || !fs.existsSync(this.organizationsDir)) {
      return []
    }

    const files = fs.readdirSync(this.organizationsDir)
    const graphs: OrganizationGraphMeta[] = []

    for (const file of files) {
      if (file.endsWith('.json5')) {
        try {
          const filePath = path.join(this.organizationsDir, file)
          const content = fs.readFileSync(filePath, 'utf-8')
          const graph = JSON5.parse(content) as OrganizationGraph

          // 获取缩略图完整路径
          let thumbnailPath: string | undefined = undefined
          if (graph.thumbnail) {
            const fullPath = this.getThumbnailPath(graph.id)
            if (fs.existsSync(fullPath)) {
              thumbnailPath = fullPath
            }
          }

          graphs.push({
            id: graph.id,
            name: graph.name,
            description: graph.description,
            thumbnail: thumbnailPath,
            linkedVocabularyTypes: graph.linkedVocabularyTypes,
            nodeStyle: graph.nodeStyle || 'simple',
            nodeCount: graph.nodes.length,
            viewState: graph.viewState,
            createdAt: graph.createdAt,
            updatedAt: graph.updatedAt
          })
        } catch (error) {
          console.error(`Failed to load organization graph ${file}:`, error)
        }
      }
    }

    // 按更新时间排序
    return graphs.sort((a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )
  }

  /**
   * 获取单个组织架构图详情
   */
  getGraph(graphId: string): OrganizationGraph | null {
    const graphPath = this.getGraphPath(graphId)

    if (!fs.existsSync(graphPath)) {
      return null
    }

    try {
      const content = fs.readFileSync(graphPath, 'utf-8')
      return JSON5.parse(content) as OrganizationGraph
    } catch (error) {
      console.error(`Failed to load organization graph ${graphId}:`, error)
      return null
    }
  }

  /**
   * 创建组织架构图
   */
  createGraph(options: CreateOrganizationGraphOptions): OrganizationGraph {
    const now = new Date().toISOString()
    const graphId = uuidv4()

    const graph: OrganizationGraph = {
      id: graphId,
      name: options.name.trim(),
      description: options.description,
      thumbnail: undefined,
      linkedVocabularyTypes: options.linkedVocabularyTypes || [],
      nodeStyle: options.nodeStyle || 'simple',
      nodes: [],
      nodeCount: 0,
      createdAt: now,
      updatedAt: now
    }

    // 如果需要创建根节点
    if (options.createRootNode !== false) {
      const rootNode: OrganizationNode = {
        id: uuidv4(),
        name: options.rootNodeName || graph.name,
        color: ORGANIZATION_NODE_COLORS[0],
        order: 0,
        createdAt: now,
        updatedAt: now
      }
      graph.nodes.push(rootNode)
      graph.nodeCount = 1
    }

    this.saveGraph(graph)
    return graph
  }

  /**
   * 更新组织架构图
   */
  updateGraph(graphId: string, updates: UpdateOrganizationGraphOptions): OrganizationGraph | null {
    const graph = this.getGraph(graphId)
    if (!graph) return null

    const now = new Date().toISOString()

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

    this.saveGraph(updatedGraph)
    return updatedGraph
  }

  /**
   * 删除组织架构图
   */
  deleteGraph(graphId: string): boolean {
    const graphPath = this.getGraphPath(graphId)
    const thumbnailPath = this.getThumbnailPath(graphId)

    try {
      if (fs.existsSync(graphPath)) {
        fs.unlinkSync(graphPath)
      }

      if (fs.existsSync(thumbnailPath)) {
        fs.unlinkSync(thumbnailPath)
      }

      return true
    } catch (error) {
      console.error(`Failed to delete organization graph ${graphId}:`, error)
      return false
    }
  }

  /**
   * 保存组织架构图
   */
  private saveGraph(graph: OrganizationGraph): void {
    const graphPath = this.getGraphPath(graph.id)
    fs.writeFileSync(graphPath, JSON5.stringify(graph, null, 2), 'utf-8')
  }

  // ============================================
  // 节点管理
  // ============================================

  /**
   * 添加节点
   */
  addNode(graphId: string, options: CreateOrganizationNodeOptions): OrganizationNode | null {
    const graph = this.getGraph(graphId)
    if (!graph) return null

    const now = new Date().toISOString()

    // 获取同级节点的最大排序值
    const siblings = graph.nodes.filter(n => n.parentId === options.parentId)
    const maxOrder = siblings.length > 0
      ? Math.max(...siblings.map(n => n.order))
      : -1

    const newNode: OrganizationNode = {
      id: uuidv4(),
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

    this.saveGraph(graph)
    return newNode
  }

  /**
   * 更新节点
   */
  updateNode(graphId: string, nodeId: string, updates: UpdateOrganizationNodeOptions): OrganizationNode | null {
    const graph = this.getGraph(graphId)
    if (!graph) return null

    const nodeIndex = graph.nodes.findIndex(n => n.id === nodeId)
    if (nodeIndex === -1) return null

    const now = new Date().toISOString()
    graph.nodes[nodeIndex] = {
      ...graph.nodes[nodeIndex],
      ...updates,
      id: graph.nodes[nodeIndex].id,
      createdAt: graph.nodes[nodeIndex].createdAt,
      updatedAt: now
    }

    graph.updatedAt = now
    this.saveGraph(graph)
    return graph.nodes[nodeIndex]
  }

  /**
   * 删除节点（及其所有子节点）
   */
  deleteNode(graphId: string, nodeId: string): boolean {
    const graph = this.getGraph(graphId)
    if (!graph) return false

    const nodeIndex = graph.nodes.findIndex(n => n.id === nodeId)
    if (nodeIndex === -1) return false

    const now = new Date().toISOString()

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

    this.saveGraph(graph)
    return true
  }

  /**
   * 移动节点（更改父节点）
   */
  moveNode(graphId: string, nodeId: string, newParentId: string | undefined): OrganizationNode | null {
    const graph = this.getGraph(graphId)
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

    const now = new Date().toISOString()

    // 获取新父节点下的最大排序值
    const siblings = graph.nodes.filter(n => n.parentId === newParentId && n.id !== nodeId)
    const maxOrder = siblings.length > 0
      ? Math.max(...siblings.map(n => n.order))
      : -1

    graph.nodes[nodeIndex] = {
      ...graph.nodes[nodeIndex],
      parentId: newParentId,
      order: maxOrder + 1,
      updatedAt: now
    }

    graph.updatedAt = now
    this.saveGraph(graph)
    return graph.nodes[nodeIndex]
  }

  /**
   * 获取直接子节点
   */
  getChildren(graphId: string, parentId: string | undefined): OrganizationNode[] {
    const graph = this.getGraph(graphId)
    if (!graph) return []

    return graph.nodes
      .filter(n => n.parentId === parentId)
      .sort((a, b) => a.order - b.order)
  }

  /**
   * 获取所有子孙节点
   */
  getDescendants(graphId: string, nodeId: string): OrganizationNode[] {
    const graph = this.getGraph(graphId)
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
    const graph = this.getGraph(graphId)
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
  // 缩略图
  // ============================================

  /**
   * 保存缩略图
   */
  saveThumbnail(graphId: string, dataUrl: string): string | null {
    try {
      const matches = dataUrl.match(/^data:image\/(\w+);base64,(.+)$/)
      if (!matches) return null

      const base64Data = matches[2]
      const buffer = Buffer.from(base64Data, 'base64')

      const thumbnailPath = this.getThumbnailPath(graphId)
      fs.writeFileSync(thumbnailPath, buffer)

      const graph = this.getGraph(graphId)
      if (graph) {
        graph.thumbnail = `${graphId}.png`
        this.saveGraph(graph)
      }

      return thumbnailPath
    } catch (error) {
      console.error(`Failed to save thumbnail for ${graphId}:`, error)
      return null
    }
  }

  /**
   * 获取缩略图路径
   */
  getThumbnailPath_(graphId: string): string | null {
    const thumbnailPath = this.getThumbnailPath(graphId)
    if (fs.existsSync(thumbnailPath)) {
      return thumbnailPath
    }
    return null
  }

  // ============================================
  // 导入导出
  // ============================================

  /**
   * 导出组织架构图为 JSON5
   */
  exportGraph(graphId: string): string | null {
    const graph = this.getGraph(graphId)
    if (!graph) return null
    return JSON5.stringify(graph, null, 2)
  }

  /**
   * 导入组织架构图
   */
  importGraph(jsonContent: string): OrganizationGraph | null {
    try {
      const graph = JSON5.parse(jsonContent) as OrganizationGraph

      const newId = uuidv4()
      const now = new Date().toISOString()

      const importedGraph: OrganizationGraph = {
        ...graph,
        id: newId,
        name: `${graph.name} (导入)`,
        createdAt: now,
        updatedAt: now,
        thumbnail: undefined
      }

      this.saveGraph(importedGraph)
      return importedGraph
    } catch (error) {
      console.error('Failed to import organization graph:', error)
      return null
    }
  }
}

// 单例导出
export const organizationService = new OrganizationService()
