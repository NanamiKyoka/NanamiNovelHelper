/**
 * Git IPC 处理器
 */

import { ipcMain } from 'electron'
import { gitService } from '../services/git'
import { GIT_CHANNELS } from '../types/git'
import type {
  GitInitOptions,
  GitCommitOptions,
  GitResetOptions,
  GitCheckoutOptions,
  GitMergeOptions,
  GitLogOptions,
  GitMode
} from '../types/git'

/** 获取项目路径的辅助函数 */
function getProjectPath(): string | null {
  // 从 projectStore 获取当前项目路径
  // 这里需要通过事件传递或者全局状态获取
  return null
}

export function registerGitHandlers(): void {
  // 检查是否是 Git 仓库
  ipcMain.handle(GIT_CHANNELS.IS_REPO, async (_event, repoPath: string) => {
    return gitService.isRepo(repoPath)
  })

  // 初始化仓库
  ipcMain.handle(GIT_CHANNELS.INIT, async (_event, options: GitInitOptions) => {
    return gitService.init(options)
  })

  // 获取仓库状态
  ipcMain.handle(GIT_CHANNELS.STATUS, async (_event, repoPath: string) => {
    return gitService.getStatus(repoPath)
  })

  // 获取提交历史
  ipcMain.handle(GIT_CHANNELS.LOG, async (_event, repoPath: string, options?: GitLogOptions) => {
    return gitService.getLog(repoPath, options)
  })

  // 添加文件到暂存区
  ipcMain.handle(GIT_CHANNELS.ADD, async (_event, repoPath: string, filepaths: string[]) => {
    return gitService.add(repoPath, filepaths)
  })

  // 撤销暂存 (使用 restore --staged)
  ipcMain.handle(GIT_CHANNELS.RESTORE, async (_event, repoPath: string, filepaths: string[], source?: string) => {
    return gitService.restore(repoPath, filepaths, source)
  })

  // 提交
  ipcMain.handle(GIT_CHANNELS.COMMIT, async (_event, repoPath: string, options: GitCommitOptions) => {
    return gitService.commit(repoPath, options)
  })

  // 回退
  ipcMain.handle(GIT_CHANNELS.RESET, async (_event, repoPath: string, options: GitResetOptions) => {
    return gitService.reset(repoPath, options)
  })

  // 获取差异
  ipcMain.handle(GIT_CHANNELS.DIFF, async (_event, repoPath: string, filepath: string, staged?: boolean) => {
    return gitService.getDiff(repoPath, filepath, staged)
  })

  // 获取分支列表
  ipcMain.handle(GIT_CHANNELS.BRANCH_LIST, async (_event, repoPath: string) => {
    return gitService.getBranches(repoPath)
  })

  // 创建分支
  ipcMain.handle(GIT_CHANNELS.BRANCH_CREATE, async (_event, repoPath: string, name: string, startPoint?: string) => {
    return gitService.createBranch(repoPath, name, startPoint)
  })

  // 删除分支
  ipcMain.handle(GIT_CHANNELS.BRANCH_DELETE, async (_event, repoPath: string, name: string, force?: boolean) => {
    return gitService.deleteBranch(repoPath, name, force)
  })

  // 切换分支
  ipcMain.handle(GIT_CHANNELS.CHECKOUT, async (_event, repoPath: string, options: GitCheckoutOptions) => {
    return gitService.checkout(repoPath, options)
  })

  // 合并分支
  ipcMain.handle(GIT_CHANNELS.MERGE, async (_event, repoPath: string, options: GitMergeOptions) => {
    return gitService.merge(repoPath, options)
  })

  // 获取配置
  ipcMain.handle(GIT_CHANNELS.CONFIG_GET, async (_event, repoPath: string, key: string) => {
    return gitService.getConfig(repoPath, key)
  })

  // 设置配置
  ipcMain.handle(GIT_CHANNELS.CONFIG_SET, async (_event, repoPath: string, key: string, value: string) => {
    return gitService.setConfig(repoPath, key, value)
  })

  // 设置 Git 模式
  ipcMain.handle(GIT_CHANNELS.SET_MODE, async (_event, mode: GitMode) => {
    gitService.setMode(mode)
    return { success: true }
  })

  // 获取 Git 模式
  ipcMain.handle(GIT_CHANNELS.GET_MODE, async () => {
    return {
      mode: gitService.getMode(),
      useSystemGit: gitService.isUsingSystemGit()
    }
  })
}
