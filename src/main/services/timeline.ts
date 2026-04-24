/**
 * 时间线服务
 * 负责时间线的 CRUD 操作、节点管理和缩略图生成
 */

import JSON5 from 'json5'
import {
  Timeline,
  TimelineMeta,
  TimelineNode,
  CreateTimelineOptions,
  UpdateTimelineOptions,
  BranchInfo
} from '../types/timeline'
import { BaseService } from './base'

/**
 * 默认分支信息（主线）
 */
const DEFAULT_BRANCH_INFO: BranchInfo = {
  type: 'main'
}

/**
 * 时间线服务
 * 继承 BaseService 实现通用 CRUD 操作
 */
class TimelineService extends BaseService<Timeline, TimelineMeta> {
  constructor() {
    super({ dataSubDir: 'timelines' })
  }

  // ============================================
  // BaseService 抽象方法实现
  // ============================================

  protected parseEntity(content: string): Timeline | null {
    try {
      return JSON5.parse(content) as Timeline
    } catch {
      return null
    }
  }

  protected serializeEntity(item: Timeline): string {
    return JSON5.stringify(item, null, 2)
  }

  protected toMetadata(item: Timeline): TimelineMeta {
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
      branchInfo: item.branchInfo || DEFAULT_BRANCH_INFO,
      nodeCount: item.nodes.length,
      tags: item.tags,
      order: item.order ?? 0,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt
    }
  }

  protected sortItems(items: TimelineMeta[]): TimelineMeta[] {
    // 按 order 字段排序
    return items.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  }

  // ============================================
  // 时间线管理
  // ============================================

  /**
   * 创建时间线
   */
  createTimeline(options: CreateTimelineOptions): Timeline {
    const now = this.getTimestamp()
    const timelineId = this.generateId()

    // 获取当前最大 order
    const existingTimelines = this.getList()
    const maxOrder = existingTimelines.length > 0
      ? Math.max(...existingTimelines.map(t => t.order ?? 0))
      : -1

    const timeline: Timeline = {
      id: timelineId,
      name: options.name.trim(),
      description: options.description,
      thumbnail: undefined,
      branchInfo: options.branchInfo || DEFAULT_BRANCH_INFO,
      nodes: [],
      nodeCount: 0,
      tags: options.tags || [],
      order: maxOrder + 1,
      createdAt: now,
      updatedAt: now
    }

    this.save(timeline)
    return timeline
  }

  /**
   * 更新时间线
   */
  updateTimeline(timelineId: string, updates: UpdateTimelineOptions): Timeline | null {
    const timeline = this.get(timelineId)
    if (!timeline) return null

    const now = this.getTimestamp()

    const updatedTimeline: Timeline = {
      ...timeline,
      ...updates,
      id: timeline.id,
      createdAt: timeline.createdAt,
      updatedAt: now
    }

    // 更新节点计数
    if (updates.nodes !== undefined) {
      updatedTimeline.nodeCount = updates.nodes.length
    }

    this.save(updatedTimeline)
    return updatedTimeline
  }

  // ============================================
  // 节点管理
  // ============================================

  /**
   * 添加节点
   */
  addNode(
    timelineId: string,
    node: Omit<TimelineNode, 'id' | 'createdAt' | 'updatedAt' | 'order'>
  ): TimelineNode | null {
    const timeline = this.get(timelineId)
    if (!timeline) return null

    const now = this.getTimestamp()
    const newNode: TimelineNode = {
      ...node,
      id: this.generateId(),
      order: timeline.nodes.length,
      createdAt: now,
      updatedAt: now
    }

    timeline.nodes.push(newNode)
    timeline.nodeCount = timeline.nodes.length
    timeline.updatedAt = now

    this.save(timeline)
    return newNode
  }

  /**
   * 更新节点
   */
  updateNode(
    timelineId: string,
    nodeId: string,
    updates: Partial<TimelineNode>
  ): TimelineNode | null {
    const timeline = this.get(timelineId)
    if (!timeline) return null

    const nodeIndex = timeline.nodes.findIndex(n => n.id === nodeId)
    if (nodeIndex === -1) return null

    const now = this.getTimestamp()
    timeline.nodes[nodeIndex] = {
      ...timeline.nodes[nodeIndex],
      ...updates,
      id: timeline.nodes[nodeIndex].id,
      createdAt: timeline.nodes[nodeIndex].createdAt,
      updatedAt: now
    }

    timeline.updatedAt = now
    this.save(timeline)
    return timeline.nodes[nodeIndex]
  }

  /**
   * 删除节点
   */
  deleteNode(timelineId: string, nodeId: string): boolean {
    const timeline = this.get(timelineId)
    if (!timeline) return false

    const nodeIndex = timeline.nodes.findIndex(n => n.id === nodeId)
    if (nodeIndex === -1) return false

    const now = this.getTimestamp()

    // 删除节点
    timeline.nodes.splice(nodeIndex, 1)
    timeline.nodeCount = timeline.nodes.length

    // 重新排序
    timeline.nodes.forEach((node, index) => {
      node.order = index
    })

    timeline.updatedAt = now
    this.save(timeline)
    return true
  }

  /**
   * 批量删除节点
   */
  batchDeleteNodes(timelineId: string, nodeIds: string[]): number {
    const timeline = this.get(timelineId)
    if (!timeline) return 0

    const now = this.getTimestamp()
    const deletedCount = timeline.nodes.length

    // 过滤掉要删除的节点
    timeline.nodes = timeline.nodes.filter(n => !nodeIds.includes(n.id))
    timeline.nodeCount = timeline.nodes.length

    // 重新排序
    timeline.nodes.forEach((node, index) => {
      node.order = index
    })

    timeline.updatedAt = now
    this.save(timeline)

    return deletedCount - timeline.nodes.length
  }

  /**
   * 移动节点（改变顺序）
   */
  moveNode(
    timelineId: string,
    nodeId: string,
    newOrder: number
  ): TimelineNode[] | null {
    const timeline = this.get(timelineId)
    if (!timeline) return null

    const nodeIndex = timeline.nodes.findIndex(n => n.id === nodeId)
    if (nodeIndex === -1) return null

    const now = this.getTimestamp()
    const node = timeline.nodes[nodeIndex]

    // 移除节点
    timeline.nodes.splice(nodeIndex, 1)

    // 在新位置插入
    timeline.nodes.splice(newOrder, 0, node)

    // 重新排序
    timeline.nodes.forEach((n, index) => {
      n.order = index
      n.updatedAt = now
    })

    timeline.updatedAt = now
    this.save(timeline)
    return timeline.nodes
  }

  /**
   * 批量移动节点
   */
  batchMoveNodes(
    timelineId: string,
    nodeIds: string[],
    targetOrder: number
  ): TimelineNode[] | null {
    const timeline = this.get(timelineId)
    if (!timeline) return null

    const now = this.getTimestamp()
    
    // 获取要移动的节点
    const nodesToMove = timeline.nodes.filter(n => nodeIds.includes(n.id))
    if (nodesToMove.length === 0) return null

    // 从原位置移除
    timeline.nodes = timeline.nodes.filter(n => !nodeIds.includes(n.id))

    // 在目标位置插入
    timeline.nodes.splice(targetOrder, 0, ...nodesToMove)

    // 重新排序
    timeline.nodes.forEach((n, index) => {
      n.order = index
      n.updatedAt = now
    })

    timeline.updatedAt = now
    this.save(timeline)
    return timeline.nodes
  }

  // ============================================
  // 分支管理
  // ============================================

  /**
   * 创建分支时间线
   */
  createBranchTimeline(
    parentTimelineId: string,
    branchFromNodeId: string,
    name?: string
  ): Timeline | null {
    const parentTimeline = this.get(parentTimelineId)
    if (!parentTimeline) return null

    const branchNode = parentTimeline.nodes.find(n => n.id === branchFromNodeId)
    if (!branchNode) return null

    const now = this.getTimestamp()
    const timelineId = this.generateId()

    // 创建分支信息
    const branchInfo: BranchInfo = {
      type: 'branch',
      parentTimelineId,
      branchFromNodeId,
      branchLabel: branchNode.title
    }

    // 创建分支时间线
    const branchTimeline: Timeline = {
      id: timelineId,
      name: name || `${parentTimeline.name} - 分支`,
      description: `从 "${branchNode.title}" 分支`,
      thumbnail: undefined,
      branchInfo,
      nodes: [],
      nodeCount: 0,
      tags: [...(parentTimeline.tags || [])],
      createdAt: now,
      updatedAt: now
    }

    this.save(branchTimeline)

    // 更新父时间线的分支点信息
    branchNode.isBranchPoint = true
    if (!branchNode.branchedTimelineIds) {
      branchNode.branchedTimelineIds = []
    }
    branchNode.branchedTimelineIds.push(timelineId)
    parentTimeline.updatedAt = now
    this.save(parentTimeline)

    return branchTimeline
  }

  /**
   * 合并分支时间线
   */
  mergeBranchTimeline(
    branchTimelineId: string,
    targetTimelineId: string,
    targetNodeId?: string
  ): boolean {
    const branchTimeline = this.get(branchTimelineId)
    const targetTimeline = this.get(targetTimelineId)

    if (!branchTimeline || !targetTimeline) return false
    if (branchTimeline.branchInfo.type !== 'branch') return false

    const now = this.getTimestamp()

    // 更新分支信息
    branchTimeline.branchInfo.mergeToTimelineId = targetTimelineId
    branchTimeline.branchInfo.mergeToNodeId = targetNodeId
    branchTimeline.updatedAt = now
    this.save(branchTimeline)

    return true
  }

  /**
   * 获取时间线的所有分支
   */
  getBranchTimelines(parentTimelineId: string): TimelineMeta[] {
    const allTimelines = this.getList()
    return allTimelines.filter(
      t => t.branchInfo.parentTimelineId === parentTimelineId
    )
  }

  /**
   * 获取分支来源节点
   */
  getBranchSourceNode(timelineId: string): TimelineNode | null {
    const timeline = this.get(timelineId)
    if (!timeline || timeline.branchInfo.type !== 'main') return null

    const parentId = timeline.branchInfo.parentTimelineId
    const nodeId = timeline.branchInfo.branchFromNodeId

    if (!parentId || !nodeId) return null

    const parentTimeline = this.get(parentId)
    if (!parentTimeline) return null

    return parentTimeline.nodes.find(n => n.id === nodeId) || null
  }

  // ============================================
  // 缩略图（扩展基类方法）
  // ============================================

  /**
   * 保存缩略图（扩展基类方法以更新元数据）
   */
  override saveThumbnail(timelineId: string, dataUrl: string): string | null {
    const result = super.saveThumbnail(timelineId, dataUrl)
    if (result) {
      // 更新时间线元数据
      const timeline = this.get(timelineId)
      if (timeline) {
        timeline.thumbnail = `${timelineId}.png`
        this.save(timeline)
      }
    }
    return result
  }

  // ============================================
  // 导入导出
  // ============================================

  /**
   * 导入时间线（覆盖基类方法）
   */
  override importItem(jsonContent: string): Timeline | null {
    try {
      const timeline = JSON5.parse(jsonContent) as Timeline

      // 生成新 ID
      const newId = this.generateId()
      const now = this.getTimestamp()

      const importedTimeline: Timeline = {
        ...timeline,
        id: newId,
        name: `${timeline.name} (导入)`,
        createdAt: now,
        updatedAt: now,
        thumbnail: undefined,
        // 重置分支信息
        branchInfo: DEFAULT_BRANCH_INFO
      }

      this.save(importedTimeline)
      return importedTimeline
    } catch (error) {
      this.logger.error('导入时间线失败', error)
      return null
    }
  }

  /**
   * 导出时间线为 Markdown
   */
  exportTimelineAsMarkdown(timelineId: string): string | null {
    const timeline = this.get(timelineId)
    if (!timeline) return null

    let md = `# ${timeline.name}\n\n`

    if (timeline.description) {
      md += `${timeline.description}\n\n`
    }

    if (timeline.tags && timeline.tags.length > 0) {
      md += `标签: ${timeline.tags.join(', ')}\n\n`
    }

    md += `---\n\n`

    // 按顺序输出节点
    const sortedNodes = [...timeline.nodes].sort((a, b) => a.order - b.order)

    for (const node of sortedNodes) {
      md += `## ${node.title}\n\n`

      // 时间信息
      if (node.timeInfo) {
        let timeStr = ''
        switch (node.timeInfo.format) {
          case 'datetime':
            timeStr = node.timeInfo.datetime || ''
            break
          case 'chapter':
            timeStr = node.timeInfo.chapterTitle || ''
            break
          case 'custom':
            timeStr = node.timeInfo.customLabel || ''
            break
        }
        if (timeStr) {
          md += `**时间**: ${timeStr}\n\n`
        }
      }

      // 关联角色
      if (node.characters && node.characters.length > 0) {
        const charNames = node.characters.map(c => c.name).join(', ')
        md += `**角色**: ${charNames}\n\n`
      }

      // 关联章节
      if (node.chapter) {
        md += `**章节**: [${node.chapter.title}](${node.chapter.path})\n\n`
      }

      // 描述
      if (node.description) {
        md += `${node.description}\n\n`
      }

      md += `---\n\n`
    }

    return md
  }

  /**
   * 重新排序时间线列表
   */
  reorderTimelines(timelineIds: string[]): boolean {
    try {
      const now = this.getTimestamp()
      
      for (let i = 0; i < timelineIds.length; i++) {
        const timeline = this.get(timelineIds[i])
        if (timeline) {
          timeline.order = i
          timeline.updatedAt = now
          this.save(timeline)
        }
      }
      
      return true
    } catch (error) {
      this.logger.error('重排时间线顺序失败', error)
      return false
    }
  }
}

// 单例导出
export const timelineService = new TimelineService()