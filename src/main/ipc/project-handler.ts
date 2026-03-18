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
import { CreateProjectOptions, Project, RecentProject } from '../types/project'

/**
 * 注册项目相关 IPC 处理器
 */
export function registerProjectHandlers(): void {
  // 创建项目
  ipcMain.handle('project:create', async (_, options: CreateProjectOptions): Promise<Project> => {
    try {
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
      return project
    } catch (error) {
      console.error('Failed to create project:', error)
      throw error
    }
  })

  // 打开项目
  ipcMain.handle('project:open', async (_, path: string): Promise<Project> => {
    try {
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
      return project
    } catch (error) {
      console.error('Failed to open project:', error)
      throw error
    }
  })

  // 关闭项目
  ipcMain.handle('project:close', async (): Promise<void> => {
    projectService.closeProject()
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
    return projectService.isValidProject(path)
  })

  // 获取项目统计信息
  ipcMain.handle('project:get-stats', async (_, path: string) => {
    try {
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
