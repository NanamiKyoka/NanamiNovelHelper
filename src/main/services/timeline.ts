/**
 * 时间线服务
 * 负责时间线的 CRUD 操作、节点管理和缩略图生成
 */

import * as fs from 'fs'
import * as path from 'path'
import { v4 as uuidv4 } from 'uuid'
import JSON5 from 'json5'
import {
  Timeline,
  TimelineMeta,
  TimelineNode,
  CreateTimelineOptions,
  UpdateTimelineOptions,
  BranchInfo,
  TimeInfo
} from '../types/timeline'
import { PROJECT_META_DIR } from '../types/project'

// 数据目录名
const DATA_DIR = 'data'
const TIMELINES_DIR = 'timelines'

/**
 * 默认时间信息
 */
const DEFAULT_TIME_INFO: TimeInfo = {
  format: 'custom',
  customLabel: '',
  orderValue: 0
}

/**
 * 默认分支信息（主线）
 */
const DEFAULT_BRANCH_INFO: BranchInfo = {
  type: 'main'
}

class TimelineService {
  private projectPath: string | null = null
  private timelinesDir: string | null = null

  /**
   * 初始化服务
   */
  init(projectPath: string): void {
    this.projectPath = projectPath
    this.timelinesDir = path.join(
      projectPath,
      PROJECT_META_DIR,
      DATA_DIR,
      TIMELINES_DIR
    )
    this.ensureDirectories()
  }

  /**
   * 确保目录存在
   */
  private ensureDirectories(): void {
    if (!this.projectPath || !this.timelinesDir) return

    if (!fs.existsSync(this.timelinesDir)) {
      fs.mkdirSync(this.timelinesDir, { recursive: true })
    }
  }

  /**
   * 获取时间线文件路径
   */
  private getTimelinePath(timelineId: string): string {
    return path.join(this.timelinesDir!, `${timelineId}.json5`)
  }

  /**
   * 获取缩略图路径
   */
  private getThumbnailPath(timelineId: string): string {
    return path.join(this.timelinesDir!, `${timelineId}.png`)
  }

  // ============================================
  // 时间线管理
  // ============================================

  /**
   * 获取所有时间线列表
   */
  getTimelineList(): TimelineMeta[] {
    if (!this.timelinesDir || !fs.existsSync(this.timelinesDir)) {
      return []
    }

    const files = fs.readdirSync(this.timelinesDir)
    const timelines: TimelineMeta[] = []

    for (const file of files) {
      if (file.endsWith('.json5')) {
        try {
          const filePath = path.join(this.timelinesDir, file)
          const content = fs.readFileSync(filePath, 'utf-8')
          const timeline = JSON5.parse(content) as Timeline

          // 获取缩略图完整路径
          let thumbnailPath: string | undefined = undefined
          if (timeline.thumbnail) {
            const fullPath = this.getThumbnailPath(timeline.id)
            if (fs.existsSync(fullPath)) {
              thumbnailPath = fullPath
            }
          }

          timelines.push({
            id: timeline.id,
            name: timeline.name,
            description: timeline.description,
            thumbnail: thumbnailPath,
            branchInfo: timeline.branchInfo || DEFAULT_BRANCH_INFO,
            nodeCount: timeline.nodes.length,
            tags: timeline.tags,
            createdAt: timeline.createdAt,
            updatedAt: timeline.updatedAt
          })
        } catch (error) {
          console.error(`Failed to load timeline ${file}:`, error)
        }
      }
    }

    // 按更新时间排序
    return timelines.sort((a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )
  }

  /**
   * 获取单个时间线详情
   */
  getTimeline(timelineId: string): Timeline | null {
    const timelinePath = this.getTimelinePath(timelineId)

    if (!fs.existsSync(timelinePath)) {
      return null
    }

    try {
      const content = fs.readFileSync(timelinePath, 'utf-8')
      return JSON5.parse(content) as Timeline
    } catch (error) {
      console.error(`Failed to load timeline ${timelineId}:`, error)
      return null
    }
  }

  /**
   * 创建时间线
   */
  createTimeline(options: CreateTimelineOptions): Timeline {
    const now = new Date().toISOString()
    const timelineId = uuidv4()

    const timeline: Timeline = {
      id: timelineId,
      name: options.name.trim(),
      description: options.description,
      thumbnail: undefined,
      branchInfo: options.branchInfo || DEFAULT_BRANCH_INFO,
      nodes: [],
      nodeCount: 0,
      tags: options.tags || [],
      createdAt: now,
      updatedAt: now
    }

    this.saveTimeline(timeline)
    return timeline
  }

  /**
   * 更新时间线
   */
  updateTimeline(timelineId: string, updates: UpdateTimelineOptions): Timeline | null {
    const timeline = this.getTimeline(timelineId)
    if (!timeline) return null

    const now = new Date().toISOString()

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

    this.saveTimeline(updatedTimeline)
    return updatedTimeline
  }

  /**
   * 删除时间线
   */
  deleteTimeline(timelineId: string): boolean {
    const timelinePath = this.getTimelinePath(timelineId)
    const thumbnailPath = this.getThumbnailPath(timelineId)

    try {
      // 如果是主线，检查是否有分支时间线依赖它
      const timeline = this.getTimeline(timelineId)
      if (timeline && timeline.branchInfo.type === 'main') {
        const allTimelines = this.getTimelineList()
        const dependentBranches = allTimelines.filter(
          t => t.branchInfo.parentTimelineId === timelineId
        )
        if (dependentBranches.length > 0) {
          // 有分支依赖，需要先删除分支或解除关联
          console.warn(`Timeline ${timelineId} has dependent branches`)
        }
      }

      // 删除数据文件
      if (fs.existsSync(timelinePath)) {
        fs.unlinkSync(timelinePath)
      }

      // 删除缩略图
      if (fs.existsSync(thumbnailPath)) {
        fs.unlinkSync(thumbnailPath)
      }

      return true
    } catch (error) {
      console.error(`Failed to delete timeline ${timelineId}:`, error)
      return false
    }
  }

  /**
   * 保存时间线
   */
  private saveTimeline(timeline: Timeline): void {
    const timelinePath = this.getTimelinePath(timeline.id)
    fs.writeFileSync(timelinePath, JSON5.stringify(timeline, null, 2), 'utf-8')
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
    const timeline = this.getTimeline(timelineId)
    if (!timeline) return null

    const now = new Date().toISOString()
    const newNode: TimelineNode = {
      ...node,
      id: uuidv4(),
      order: timeline.nodes.length,
      createdAt: now,
      updatedAt: now
    }

    timeline.nodes.push(newNode)
    timeline.nodeCount = timeline.nodes.length
    timeline.updatedAt = now

    this.saveTimeline(timeline)
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
    const timeline = this.getTimeline(timelineId)
    if (!timeline) return null

    const nodeIndex = timeline.nodes.findIndex(n => n.id === nodeId)
    if (nodeIndex === -1) return null

    const now = new Date().toISOString()
    timeline.nodes[nodeIndex] = {
      ...timeline.nodes[nodeIndex],
      ...updates,
      id: timeline.nodes[nodeIndex].id,
      createdAt: timeline.nodes[nodeIndex].createdAt,
      updatedAt: now
    }

    timeline.updatedAt = now
    this.saveTimeline(timeline)
    return timeline.nodes[nodeIndex]
  }

  /**
   * 删除节点
   */
  deleteNode(timelineId: string, nodeId: string): boolean {
    const timeline = this.getTimeline(timelineId)
    if (!timeline) return false

    const nodeIndex = timeline.nodes.findIndex(n => n.id === nodeId)
    if (nodeIndex === -1) return false

    const now = new Date().toISOString()

    // 删除节点
    timeline.nodes.splice(nodeIndex, 1)
    timeline.nodeCount = timeline.nodes.length

    // 重新排序
    timeline.nodes.forEach((node, index) => {
      node.order = index
    })

    timeline.updatedAt = now
    this.saveTimeline(timeline)
    return true
  }

  /**
   * 批量删除节点
   */
  batchDeleteNodes(timelineId: string, nodeIds: string[]): number {
    const timeline = this.getTimeline(timelineId)
    if (!timeline) return 0

    const now = new Date().toISOString()
    const deletedCount = timeline.nodes.length

    // 过滤掉要删除的节点
    timeline.nodes = timeline.nodes.filter(n => !nodeIds.includes(n.id))
    timeline.nodeCount = timeline.nodes.length

    // 重新排序
    timeline.nodes.forEach((node, index) => {
      node.order = index
    })

    timeline.updatedAt = now
    this.saveTimeline(timeline)

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
    const timeline = this.getTimeline(timelineId)
    if (!timeline) return null

    const nodeIndex = timeline.nodes.findIndex(n => n.id === nodeId)
    if (nodeIndex === -1) return null

    const now = new Date().toISOString()
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
    this.saveTimeline(timeline)
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
    const timeline = this.getTimeline(timelineId)
    if (!timeline) return null

    const now = new Date().toISOString()
    
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
    this.saveTimeline(timeline)
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
    const parentTimeline = this.getTimeline(parentTimelineId)
    if (!parentTimeline) return null

    const branchNode = parentTimeline.nodes.find(n => n.id === branchFromNodeId)
    if (!branchNode) return null

    const now = new Date().toISOString()
    const timelineId = uuidv4()

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

    this.saveTimeline(branchTimeline)

    // 更新父时间线的分支点信息
    branchNode.isBranchPoint = true
    if (!branchNode.branchedTimelineIds) {
      branchNode.branchedTimelineIds = []
    }
    branchNode.branchedTimelineIds.push(timelineId)
    parentTimeline.updatedAt = now
    this.saveTimeline(parentTimeline)

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
    const branchTimeline = this.getTimeline(branchTimelineId)
    const targetTimeline = this.getTimeline(targetTimelineId)

    if (!branchTimeline || !targetTimeline) return false
    if (branchTimeline.branchInfo.type !== 'branch') return false

    const now = new Date().toISOString()

    // 更新分支信息
    branchTimeline.branchInfo.mergeToTimelineId = targetTimelineId
    branchTimeline.branchInfo.mergeToNodeId = targetNodeId
    branchTimeline.updatedAt = now
    this.saveTimeline(branchTimeline)

    return true
  }

  /**
   * 获取时间线的所有分支
   */
  getBranchTimelines(parentTimelineId: string): TimelineMeta[] {
    const allTimelines = this.getTimelineList()
    return allTimelines.filter(
      t => t.branchInfo.parentTimelineId === parentTimelineId
    )
  }

  /**
   * 获取分支来源节点
   */
  getBranchSourceNode(timelineId: string): TimelineNode | null {
    const timeline = this.getTimeline(timelineId)
    if (!timeline || timeline.branchInfo.type !== 'main') return null

    const parentId = timeline.branchInfo.parentTimelineId
    const nodeId = timeline.branchInfo.branchFromNodeId

    if (!parentId || !nodeId) return null

    const parentTimeline = this.getTimeline(parentId)
    if (!parentTimeline) return null

    return parentTimeline.nodes.find(n => n.id === nodeId) || null
  }

  // ============================================
  // 缩略图
  // ============================================

  /**
   * 保存缩略图
   */
  saveThumbnail(timelineId: string, dataUrl: string): string | null {
    try {
      // 解析 data URL
      const matches = dataUrl.match(/^data:image\/(\w+);base64,(.+)$/)
      if (!matches) return null

      const base64Data = matches[2]
      const buffer = Buffer.from(base64Data, 'base64')

      const thumbnailPath = this.getThumbnailPath(timelineId)
      fs.writeFileSync(thumbnailPath, buffer)

      // 更新时间线元数据
      const timeline = this.getTimeline(timelineId)
      if (timeline) {
        timeline.thumbnail = `${timelineId}.png`
        this.saveTimeline(timeline)
      }

      return thumbnailPath
    } catch (error) {
      console.error(`Failed to save thumbnail for ${timelineId}:`, error)
      return null
    }
  }

  /**
   * 获取缩略图路径
   */
  getThumbnailPath_(timelineId: string): string | null {
    const thumbnailPath = this.getThumbnailPath(timelineId)
    if (fs.existsSync(thumbnailPath)) {
      return thumbnailPath
    }
    return null
  }

  // ============================================
  // 导入导出
  // ============================================

  /**
   * 导出时间线为 JSON5
   */
  exportTimeline(timelineId: string): string | null {
    const timeline = this.getTimeline(timelineId)
    if (!timeline) return null
    return JSON5.stringify(timeline, null, 2)
  }

  /**
   * 导入时间线
   */
  importTimeline(jsonContent: string): Timeline | null {
    try {
      const timeline = JSON5.parse(jsonContent) as Timeline

      // 生成新 ID
      const newId = uuidv4()
      const now = new Date().toISOString()

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

      this.saveTimeline(importedTimeline)
      return importedTimeline
    } catch (error) {
      console.error('Failed to import timeline:', error)
      return null
    }
  }

  /**
   * 导出时间线为 Markdown
   */
  exportTimelineAsMarkdown(timelineId: string): string | null {
    const timeline = this.getTimeline(timelineId)
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
}

// 单例导出
export const timelineService = new TimelineService()
