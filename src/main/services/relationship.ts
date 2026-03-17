/**
 * 关系图服务
 * 负责关系图的 CRUD 操作和缩略图生成
 */

import * as fs from 'fs'
import * as path from 'path'
import { v4 as uuidv4 } from 'uuid'
import JSON5 from 'json5'
import { BrowserWindow } from 'electron'
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
import { PROJECT_META_DIR } from '../types/project'

// 数据目录名
const DATA_DIR = 'data'
const RELATIONSHIPS_DIR = 'relationships'

class RelationshipService {
  private projectPath: string | null = null
  private relationshipsDir: string | null = null

  /**
   * 初始化服务
   */
  init(projectPath: string): void {
    this.projectPath = projectPath
    this.relationshipsDir = path.join(
      projectPath, 
      PROJECT_META_DIR, 
      DATA_DIR, 
      RELATIONSHIPS_DIR
    )
    this.ensureDirectories()
  }

  /**
   * 确保目录存在
   */
  private ensureDirectories(): void {
    if (!this.projectPath || !this.relationshipsDir) return

    // 创建数据目录
    if (!fs.existsSync(this.relationshipsDir)) {
      fs.mkdirSync(this.relationshipsDir, { recursive: true })
    }
  }

  /**
   * 获取关系图文件路径
   */
  private getGraphPath(graphId: string): string {
    return path.join(this.relationshipsDir!, `${graphId}.json5`)
  }

  /**
   * 获取缩略图路径
   */
  private getThumbnailPath(graphId: string): string {
    return path.join(this.relationshipsDir!, `${graphId}.png`)
  }

  // ============================================
  // 关系图管理
  // ============================================

  /**
   * 获取所有关系图列表
   */
  getGraphList(): RelationshipGraphMeta[] {
    if (!this.relationshipsDir || !fs.existsSync(this.relationshipsDir)) {
      return []
    }

    const files = fs.readdirSync(this.relationshipsDir)
    const graphs: RelationshipGraphMeta[] = []

    for (const file of files) {
      if (file.endsWith('.json5')) {
        try {
          const filePath = path.join(this.relationshipsDir, file)
          const content = fs.readFileSync(filePath, 'utf-8')
          const graph = JSON5.parse(content) as RelationshipGraph
          
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
            customRelationTypes: graph.customRelationTypes || [],
            nodeStyle: graph.nodeStyle || 'circle',
            nodeCount: graph.nodes.length,
            edgeCount: graph.edges.length,
            createdAt: graph.createdAt,
            updatedAt: graph.updatedAt
          })
        } catch (error) {
          console.error(`Failed to load relationship graph ${file}:`, error)
        }
      }
    }

    // 按更新时间排序
    return graphs.sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )
  }

  /**
   * 获取单个关系图详情
   */
  getGraph(graphId: string): RelationshipGraph | null {
    const graphPath = this.getGraphPath(graphId)
    
    if (!fs.existsSync(graphPath)) {
      return null
    }

    try {
      const content = fs.readFileSync(graphPath, 'utf-8')
      return JSON5.parse(content) as RelationshipGraph
    } catch (error) {
      console.error(`Failed to load relationship graph ${graphId}:`, error)
      return null
    }
  }

  /**
   * 创建关系图
   */
  createGraph(options: CreateRelationshipGraphOptions): RelationshipGraph {
    const now = new Date().toISOString()
    const graphId = uuidv4()

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
      createdAt: now,
      updatedAt: now
    }

    this.saveGraph(graph)
    return graph
  }

  /**
   * 更新关系图
   */
  updateGraph(graphId: string, updates: UpdateRelationshipGraphOptions): RelationshipGraph | null {
    const graph = this.getGraph(graphId)
    if (!graph) return null

    const now = new Date().toISOString()
    
    const updatedGraph: RelationshipGraph = {
      ...graph,
      ...updates,
      id: graph.id,         // 不允许修改 ID
      createdAt: graph.createdAt, // 不允许修改创建时间
      updatedAt: now
    }

    // 更新计数
    if (updates.nodes !== undefined) {
      updatedGraph.nodeCount = updates.nodes.length
    }
    if (updates.edges !== undefined) {
      updatedGraph.edgeCount = updates.edges.length
    }

    this.saveGraph(updatedGraph)
    return updatedGraph
  }

  /**
   * 删除关系图
   */
  deleteGraph(graphId: string): boolean {
    const graphPath = this.getGraphPath(graphId)
    const thumbnailPath = this.getThumbnailPath(graphId)

    try {
      // 删除数据文件
      if (fs.existsSync(graphPath)) {
        fs.unlinkSync(graphPath)
      }
      
      // 删除缩略图
      if (fs.existsSync(thumbnailPath)) {
        fs.unlinkSync(thumbnailPath)
      }

      return true
    } catch (error) {
      console.error(`Failed to delete relationship graph ${graphId}:`, error)
      return false
    }
  }

  /**
   * 保存关系图
   */
  private saveGraph(graph: RelationshipGraph): void {
    const graphPath = this.getGraphPath(graph.id)
    fs.writeFileSync(graphPath, JSON5.stringify(graph, null, 2), 'utf-8')
  }

  // ============================================
  // 节点管理
  // ============================================

  /**
   * 添加节点
   */
  addNode(graphId: string, node: Omit<RelationshipNode, 'id' | 'createdAt' | 'updatedAt'>): RelationshipNode | null {
    const graph = this.getGraph(graphId)
    if (!graph) return null

    const now = new Date().toISOString()
    const newNode: RelationshipNode = {
      ...node,
      id: uuidv4(),
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
  updateNode(graphId: string, nodeId: string, updates: Partial<RelationshipNode>): RelationshipNode | null {
    const graph = this.getGraph(graphId)
    if (!graph) return null

    const nodeIndex = graph.nodes.findIndex(n => n.id === nodeId)
    if (nodeIndex === -1) return null

    const now = new Date().toISOString()
    graph.nodes[nodeIndex] = {
      ...graph.nodes[nodeIndex],
      ...updates,
      id: graph.nodes[nodeIndex].id, // 不允许修改 ID
      createdAt: graph.nodes[nodeIndex].createdAt, // 不允许修改创建时间
      updatedAt: now
    }

    graph.updatedAt = now
    this.saveGraph(graph)
    return graph.nodes[nodeIndex]
  }

  /**
   * 删除节点
   */
  deleteNode(graphId: string, nodeId: string): boolean {
    const graph = this.getGraph(graphId)
    if (!graph) return false

    const nodeIndex = graph.nodes.findIndex(n => n.id === nodeId)
    if (nodeIndex === -1) return false

    const now = new Date().toISOString()

    // 删除节点
    graph.nodes.splice(nodeIndex, 1)
    graph.nodeCount = graph.nodes.length

    // 删除与该节点相关的所有边
    graph.edges = graph.edges.filter(e => e.source !== nodeId && e.target !== nodeId)
    graph.edgeCount = graph.edges.length

    graph.updatedAt = now
    this.saveGraph(graph)
    return true
  }

  // ============================================
  // 边管理
  // ============================================

  /**
   * 添加边
   */
  addEdge(graphId: string, edge: Omit<RelationshipEdge, 'id' | 'createdAt' | 'updatedAt'>): RelationshipEdge | null {
    const graph = this.getGraph(graphId)
    if (!graph) return null

    // 检查节点是否存在
    const sourceExists = graph.nodes.some(n => n.id === edge.source)
    const targetExists = graph.nodes.some(n => n.id === edge.target)
    if (!sourceExists || !targetExists) return null

    const now = new Date().toISOString()
    const newEdge: RelationshipEdge = {
      ...edge,
      id: uuidv4(),
      createdAt: now,
      updatedAt: now
    }

    graph.edges.push(newEdge)
    graph.edgeCount = graph.edges.length
    graph.updatedAt = now

    this.saveGraph(graph)
    return newEdge
  }

  /**
   * 更新边
   */
  updateEdge(graphId: string, edgeId: string, updates: Partial<RelationshipEdge>): RelationshipEdge | null {
    const graph = this.getGraph(graphId)
    if (!graph) return null

    const edgeIndex = graph.edges.findIndex(e => e.id === edgeId)
    if (edgeIndex === -1) return null

    const now = new Date().toISOString()
    graph.edges[edgeIndex] = {
      ...graph.edges[edgeIndex],
      ...updates,
      id: graph.edges[edgeIndex].id, // 不允许修改 ID
      createdAt: graph.edges[edgeIndex].createdAt, // 不允许修改创建时间
      updatedAt: now
    }

    graph.updatedAt = now
    this.saveGraph(graph)
    return graph.edges[edgeIndex]
  }

  /**
   * 删除边
   */
  deleteEdge(graphId: string, edgeId: string): boolean {
    const graph = this.getGraph(graphId)
    if (!graph) return false

    const edgeIndex = graph.edges.findIndex(e => e.id === edgeId)
    if (edgeIndex === -1) return false

    const now = new Date().toISOString()
    graph.edges.splice(edgeIndex, 1)
    graph.edgeCount = graph.edges.length
    graph.updatedAt = now

    this.saveGraph(graph)
    return true
  }

  // ============================================
  // 关系类型管理
  // ============================================

  /**
   * 获取所有关系类型（内置 + 自定义）
   */
  getRelationTypes(graphId: string): RelationType[] {
    const graph = this.getGraph(graphId)
    if (!graph) return BUILTIN_RELATION_TYPES

    return [...BUILTIN_RELATION_TYPES, ...(graph.customRelationTypes || [])]
  }

  /**
   * 添加自定义关系类型
   */
  addCustomRelationType(graphId: string, type: Omit<RelationType, 'id' | 'isBuiltIn' | 'order'>): RelationType | null {
    const graph = this.getGraph(graphId)
    if (!graph) return null

    const newType: RelationType = {
      ...type,
      id: uuidv4(),
      isBuiltIn: false,
      order: BUILTIN_RELATION_TYPES.length + (graph.customRelationTypes?.length || 0)
    }

    if (!graph.customRelationTypes) {
      graph.customRelationTypes = []
    }
    graph.customRelationTypes.push(newType)

    const now = new Date().toISOString()
    graph.updatedAt = now
    this.saveGraph(graph)

    return newType
  }

  /**
   * 更新自定义关系类型
   */
  updateCustomRelationType(graphId: string, typeId: string, updates: Partial<RelationType>): RelationType | null {
    const graph = this.getGraph(graphId)
    if (!graph || !graph.customRelationTypes) return null

    const typeIndex = graph.customRelationTypes.findIndex(t => t.id === typeId)
    if (typeIndex === -1) return null

    const now = new Date().toISOString()
    graph.customRelationTypes[typeIndex] = {
      ...graph.customRelationTypes[typeIndex],
      ...updates,
      id: graph.customRelationTypes[typeIndex].id,
      isBuiltIn: false
    }

    graph.updatedAt = now
    this.saveGraph(graph)
    return graph.customRelationTypes[typeIndex]
  }

  /**
   * 删除自定义关系类型
   */
  deleteCustomRelationType(graphId: string, typeId: string): boolean {
    const graph = this.getGraph(graphId)
    if (!graph || !graph.customRelationTypes) return false

    const typeIndex = graph.customRelationTypes.findIndex(t => t.id === typeId)
    if (typeIndex === -1) return false

    const now = new Date().toISOString()
    graph.customRelationTypes.splice(typeIndex, 1)
    graph.updatedAt = now
    this.saveGraph(graph)
    return true
  }

  // ============================================
  // 缩略图
  // ============================================

  /**
   * 保存缩略图
   */
  saveThumbnail(graphId: string, dataUrl: string): string | null {
    try {
      // 解析 data URL
      const matches = dataUrl.match(/^data:image\/(\w+);base64,(.+)$/)
      if (!matches) return null

      const base64Data = matches[2]
      const buffer = Buffer.from(base64Data, 'base64')
      
      const thumbnailPath = this.getThumbnailPath(graphId)
      fs.writeFileSync(thumbnailPath, buffer)

      // 更新图元数据
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
   * 导出关系图为 JSON5
   */
  exportGraph(graphId: string): string | null {
    const graph = this.getGraph(graphId)
    if (!graph) return null
    return JSON5.stringify(graph, null, 2)
  }

  /**
   * 导入关系图
   */
  importGraph(jsonContent: string): RelationshipGraph | null {
    try {
      const graph = JSON5.parse(jsonContent) as RelationshipGraph
      
      // 生成新 ID
      const newId = uuidv4()
      const now = new Date().toISOString()
      
      const importedGraph: RelationshipGraph = {
        ...graph,
        id: newId,
        name: `${graph.name} (导入)`,
        createdAt: now,
        updatedAt: now,
        thumbnail: undefined
      }

      // 更新节点和边的 ID（可选，取决于是否需要保持关联）
      // 这里保持原有 ID，因为内部关联依赖这些 ID

      this.saveGraph(importedGraph)
      return importedGraph
    } catch (error) {
      console.error('Failed to import relationship graph:', error)
      return null
    }
  }
}

// 单例导出
export const relationshipService = new RelationshipService()
