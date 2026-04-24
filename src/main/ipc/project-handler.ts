/**
 * 项目相关 IPC 处理器
 */

import { ipcMain } from 'electron'
import { projectService } from '../services/project'
import { vocabularyService } from '../services/vocabulary'
import { fileService } from '../services/file'
import { projectSettingsService } from '../services/projectSettings'
import { backupService } from '../services/backup'
import { relationshipService } from '../services/relationship'
import { timelineService } from '../services/timeline'
import { sequenceChartService } from '../services/sequence-chart'
import { organizationService } from '../services/organization'
import { mapService } from '../services/map'
import { aiAssistantService } from '../services/aiAssistant'
import { initProject as initDynamicSkill, clearProject as clearDynamicSkill } from '../services/dynamicSkill'
import { searchService } from '../services/search'
import { CreateProjectOptions, Project, RecentProject } from '../types/project'
import { validateParams } from '../utils/validation'

/**
 * 注册项目相关 IPC 处理器
 */
export function registerProjectHandlers(): void {
  // 创建项目
  ipcMain.handle('project:create', async (_, options: CreateProjectOptions): Promise<Project> => {
    try {
      validateParams('project:create')
        .object(options, 'options')
        .nonEmptyString((options as Record<string, unknown>).parentPath as string, 'options.parentPath')
        .nonEmptyString((options as Record<string, unknown>).name as string, 'options.name')
        .validate()
      
      const project = await projectService.createProject(options)
      // 初始化文件服务
      fileService.init(project.path)
      // 初始化词汇服务
      vocabularyService.init(project.path)
      // 初始化项目设置服务
      projectSettingsService.init(project.path)
      // 初始化备份服务
      backupService.init(project.path)
      // 初始化关系图服务
      relationshipService.init(project.path)
      // 初始化时间线服务
      timelineService.init(project.path)
      // 初始化事序图服务
      sequenceChartService.init(project.path)
      // 初始化组织架构图服务
      organizationService.init(project.path)
      // 初始化地图服务
      mapService.init(project.path)
      // 初始化 AI 写作助手服务
      aiAssistantService.initProject(project.path)
      // 初始化动态 SKILL 服务
      await initDynamicSkill(project.path)
      // 初始化搜索服务
      searchService.init(project.path)
      return project
    } catch (error) {
      console.error('Failed to create project:', error)
      throw error
    }
  })

  // 打开项目
  ipcMain.handle('project:open', async (_, path: string): Promise<Project> => {
    try {
      // 参数验证
      validateParams('project:open ').nonEmptyString(path, 'path').validate()
      
      const project = await projectService.openProject(path)
      // 初始化文件服务
      fileService.init(project.path)
      // 初始化词汇服务
      vocabularyService.init(project.path)
      // 初始化项目设置服务
      projectSettingsService.init(project.path)
      // 初始化备份服务
      backupService.init(project.path)
      // 初始化关系图服务
      relationshipService.init(project.path)
      // 初始化时间线服务
      timelineService.init(project.path)
      // 初始化事序图服务
      sequenceChartService.init(project.path)
      // 初始化组织架构图服务
      organizationService.init(project.path)
      // 初始化地图服务
      mapService.init(project.path)
      // 初始化 AI 写作助手服务
      aiAssistantService.initProject(project.path)
      // 初始化动态 SKILL 服务
      await initDynamicSkill(project.path)
      // 初始化搜索服务
      searchService.init(project.path)
      return project
    } catch (error) {
      console.error('Failed to open project:', error)
      throw error
    }
  })

  // 关闭项目
  ipcMain.handle('project:close', async (): Promise<void> => {
    projectService.closeProject()
    // 清理 AI 写作助手服务
    aiAssistantService.clearProject()
    // 清理动态 SKILL 服务
    clearDynamicSkill()
    // 清理搜索服务
    searchService.clear()
  })

  // 获取当前项目
  ipcMain.handle('project:get-current', async (): Promise<Project | null> => {
    return projectService.getCurrentProject()
  })

  // 更新项目信息
  ipcMain.handle('project:update-info', async (_, info: Partial<Project>): Promise<Project> => {
    try {
      return await projectService.updateProjectInfo(info)
    } catch (error) {
      console.error('Failed to update project info:', error)
      throw error
    }
  })

  // 获取最近项目列表
  ipcMain.handle('project:get-recent', async (): Promise<RecentProject[]> => {
    return projectService.getRecentProjects()
  })

  // 从最近项目列表移除
  ipcMain.handle('project:remove-recent', async (_, path: string): Promise<void> => {
    // 参数验证
    validateParams('project:remove-recent ').nonEmptyString(path, 'path').validate()
    projectService.removeRecentProject(path)
  })

  // 清空最近项目列表
  ipcMain.handle('project:clear-recent', async (): Promise<void> => {
    projectService.clearRecentProjects()
  })

  // 显示打开项目对话框
  ipcMain.handle('project:show-open-dialog', async (): Promise<string | null> => {
    return projectService.showOpenDialog()
  })

  // 显示创建项目对话框（选择父目录）
  ipcMain.handle('project:show-create-dialog', async (): Promise<string | null> => {
    return projectService.showCreateDialog()
  })

  // 检查路径是否是有效项目
  ipcMain.handle('project:is-valid', async (_, path: string): Promise<boolean> => {
    // 参数验证
    validateParams('project:is-valid ').nonEmptyString(path, 'path').validate()
    return projectService.isValidProject(path)
  })

  // 获取项目统计信息
  ipcMain.handle('project:get-stats', async (_, path: string) => {
    try {
      // 参数验证
      validateParams('project:get-stats ').nonEmptyString(path, 'path').validate()
      return await projectService.getProjectStats(path)
    } catch (error) {
      console.error('Failed to get project stats:', error)
      throw error
    }
  })

  // 获取项目初始化数据（聚合接口）
  ipcMain.handle('project:initData', async () => {
    try {
      return await projectService.getInitData()
    } catch (error) {
      console.error('Failed to get project init data:', error)
      throw error
    }
  })
}
