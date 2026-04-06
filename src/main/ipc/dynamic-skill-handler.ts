/**
 * 动态 SKILL IPC 处理器
 */

import { ipcMain, BrowserWindow } from 'electron'
import { dynamicSkillService } from '@main/services/dynamicSkill'
import type {
  DynamicSkill,
  DynamicSkillExecutionRequest,
  DynamicSkillExecutionResult,
  SkillWhitelistEntry,
} from '@shared/ai-assistant'
import type { CreateSkillOptions, UpdateSkillOptions } from '@main/services/dynamicSkill'

/**
 * 注册 SKILL 相关的 IPC 处理器
 */
export function registerDynamicSkillHandlers(): void {
  /**
   * 获取所有 SKILL 列表
   */
  ipcMain.handle('dynamicSkill:getList', async (): Promise<DynamicSkill[]> => {
    return dynamicSkillService.getAllSkills()
  })

  /**
   * 获取单个 SKILL
   */
  ipcMain.handle('dynamicSkill:get', async (_event, skillId: string): Promise<DynamicSkill | undefined> => {
    return dynamicSkillService.getSkill(skillId)
  })

  /**
   * 重新加载 SKILL（使用当前项目路径）
   */
  ipcMain.handle('dynamicSkill:reload', async (): Promise<DynamicSkill[]> => {
    const projectPath = dynamicSkillService.getProjectPath()
    if (!projectPath) {
      throw new Error('No project opened')
    }
    return dynamicSkillService.loadSkills(projectPath)
  })

  /**
   * 获取 SKILL 的工具列表
   */
  ipcMain.handle('dynamicSkill:getTools', async (_event, skillId: string) => {
    const skill = dynamicSkillService.getSkill(skillId)
    return skill?.tools || []
  })

  /**
   * 执行 SKILL 工具
   */
  ipcMain.handle(
    'dynamicSkill:execute',
    async (
      event,
      skillId: string,
      toolId: string,
      parameters: Record<string, unknown>,
      context: { projectPath: string; currentChapter?: { path: string; content: string }; selectedText?: string },
    ): Promise<DynamicSkillExecutionResult> => {
      const request: DynamicSkillExecutionRequest = {
        skillId,
        toolId,
        parameters,
        context,
      }

      const win = BrowserWindow.fromWebContents(event.sender)

      return dynamicSkillService.executeTool(request, (line) => {
        // 流式输出到渲染进程（使用正确的事件名）
        win?.webContents.send('dynamicSkill:execution-output', {
          executionId: `${skillId}-${toolId}`,
          line,
        })
      })
    },
  )

  /**
   * 取消执行
   */
  ipcMain.handle('dynamicSkill:cancel', async (_event, executionId: string): Promise<boolean> => {
    return dynamicSkillService.cancelExecution(executionId)
  })

  /**
   * 获取白名单
   */
  ipcMain.handle('dynamicSkill:getWhitelist', async (): Promise<SkillWhitelistEntry[]> => {
    const config = (dynamicSkillService as any).whitelistConfig
    return config?.entries || []
  })

  /**
   * 添加到白名单（信任 SKILL）
   */
  ipcMain.handle(
    'dynamicSkill:addToWhitelist',
    async (_event, skillId: string, skillName: string, skillPath: string): Promise<void> => {
      return dynamicSkillService.trustSkill(skillId, skillName, skillPath)
    },
  )

  /**
   * 从白名单移除（取消信任）
   */
  ipcMain.handle('dynamicSkill:removeFromWhitelist', async (_event, skillId: string): Promise<void> => {
    return dynamicSkillService.untrustSkill(skillId)
  })

  /**
   * 检查 SKILL 是否被信任
   */
  ipcMain.handle(
    'dynamicSkill:isTrusted',
    async (_event, skillId: string, skillPath: string): Promise<boolean> => {
      return dynamicSkillService.isSkillTrusted(skillId, skillPath)
    },
  )

  /**
   * 创建新 SKILL
   */
  ipcMain.handle(
    'dynamicSkill:create',
    async (_event, options: CreateSkillOptions): Promise<DynamicSkill> => {
      return dynamicSkillService.createSkill(options)
    },
  )

  /**
   * 更新 SKILL
   */
  ipcMain.handle(
    'dynamicSkill:update',
    async (_event, skillId: string, options: UpdateSkillOptions): Promise<DynamicSkill> => {
      return dynamicSkillService.updateSkill(skillId, options)
    },
  )

  /**
   * 删除 SKILL（移动到回收站）
   */
  ipcMain.handle(
    'dynamicSkill:delete',
    async (_event, skillId: string): Promise<void> => {
      return dynamicSkillService.deleteSkill(skillId)
    },
  )
}
