/**
 * Git IPC 处理器
 */

import { ipcMain } from 'electron'
import { gitService } from '../services/git'
import { GIT_CHANNELS } from '../types/git'
import { validateParams } from '../utils/validation'
import type {
  GitInitOptions,
  GitCommitOptions,
  GitResetOptions,
  GitCheckoutOptions,
  GitMergeOptions,
  GitLogOptions,
  GitMode
} from '../types/git'

export function registerGitHandlers(): void {
  ipcMain.handle(GIT_CHANNELS.IS_REPO, async (_event, repoPath: string) => {
    validateParams('git:isRepo')
      .nonEmptyString(repoPath, 'repoPath')
      .validate()
    return gitService.isRepo(repoPath)
  })

  ipcMain.handle(GIT_CHANNELS.INIT, async (_event, options: GitInitOptions) => {
    validateParams('git:init')
      .object(options, 'options')
      .nonEmptyString((options as Record<string, unknown>).path as string, 'options.path')
      .validate()
    return gitService.init(options)
  })

  ipcMain.handle(GIT_CHANNELS.STATUS, async (_event, repoPath: string) => {
    validateParams('git:status')
      .nonEmptyString(repoPath, 'repoPath')
      .validate()
    return gitService.getStatus(repoPath)
  })

  ipcMain.handle(GIT_CHANNELS.LOG, async (_event, repoPath: string, options?: GitLogOptions) => {
    validateParams('git:log')
      .nonEmptyString(repoPath, 'repoPath')
      .validate()
    if (options !== undefined) {
      validateParams('git:log').object(options, 'options').validate()
    }
    return gitService.getLog(repoPath, options)
  })

  ipcMain.handle(GIT_CHANNELS.ADD, async (_event, repoPath: string, filepaths: string[]) => {
    validateParams('git:add')
      .nonEmptyString(repoPath, 'repoPath')
      .array(filepaths, 'filepaths')
      .validate()
    return gitService.add(repoPath, filepaths)
  })

  ipcMain.handle(GIT_CHANNELS.RESTORE, async (_event, repoPath: string, filepaths: string[], source?: string) => {
    validateParams('git:restore')
      .nonEmptyString(repoPath, 'repoPath')
      .array(filepaths, 'filepaths')
      .validate()
    if (source !== undefined) {
      validateParams('git:restore').nonEmptyString(source, 'source').validate()
    }
    return gitService.restore(repoPath, filepaths, source)
  })

  ipcMain.handle(GIT_CHANNELS.COMMIT, async (_event, repoPath: string, options: GitCommitOptions) => {
    validateParams('git:commit')
      .nonEmptyString(repoPath, 'repoPath')
      .object(options, 'options')
      .nonEmptyString((options as Record<string, unknown>).message as string, 'options.message')
      .validate()
    return gitService.commit(repoPath, options)
  })

  ipcMain.handle(GIT_CHANNELS.RESET, async (_event, repoPath: string, options: GitResetOptions) => {
    validateParams('git:reset')
      .nonEmptyString(repoPath, 'repoPath')
      .object(options, 'options')
      .validate()
    return gitService.reset(repoPath, options)
  })

  ipcMain.handle(GIT_CHANNELS.DIFF, async (_event, repoPath: string, filepath: string, staged?: boolean) => {
    validateParams('git:diff')
      .nonEmptyString(repoPath, 'repoPath')
      .nonEmptyString(filepath, 'filepath')
      .validate()
    return gitService.getDiff(repoPath, filepath, staged)
  })

  ipcMain.handle(GIT_CHANNELS.BRANCH_LIST, async (_event, repoPath: string) => {
    validateParams('git:branchList')
      .nonEmptyString(repoPath, 'repoPath')
      .validate()
    return gitService.getBranches(repoPath)
  })

  ipcMain.handle(GIT_CHANNELS.BRANCH_CREATE, async (_event, repoPath: string, name: string, startPoint?: string) => {
    validateParams('git:branchCreate')
      .nonEmptyString(repoPath, 'repoPath')
      .nonEmptyString(name, 'name')
      .validate()
    return gitService.createBranch(repoPath, name, startPoint)
  })

  ipcMain.handle(GIT_CHANNELS.BRANCH_DELETE, async (_event, repoPath: string, name: string, force?: boolean) => {
    validateParams('git:branchDelete')
      .nonEmptyString(repoPath, 'repoPath')
      .nonEmptyString(name, 'name')
      .validate()
    return gitService.deleteBranch(repoPath, name, force)
  })

  ipcMain.handle(GIT_CHANNELS.CHECKOUT, async (_event, repoPath: string, options: GitCheckoutOptions) => {
    validateParams('git:checkout')
      .nonEmptyString(repoPath, 'repoPath')
      .object(options, 'options')
      .validate()
    return gitService.checkout(repoPath, options)
  })

  ipcMain.handle(GIT_CHANNELS.MERGE, async (_event, repoPath: string, options: GitMergeOptions) => {
    validateParams('git:merge')
      .nonEmptyString(repoPath, 'repoPath')
      .object(options, 'options')
      .validate()
    return gitService.merge(repoPath, options)
  })

  ipcMain.handle(GIT_CHANNELS.CONFIG_GET, async (_event, repoPath: string, key: string) => {
    validateParams('git:configGet')
      .nonEmptyString(repoPath, 'repoPath')
      .nonEmptyString(key, 'key')
      .validate()
    return gitService.getConfig(repoPath, key)
  })

  ipcMain.handle(GIT_CHANNELS.CONFIG_SET, async (_event, repoPath: string, key: string, value: string) => {
    validateParams('git:configSet')
      .nonEmptyString(repoPath, 'repoPath')
      .nonEmptyString(key, 'key')
      .string(value, 'value')
      .validate()
    return gitService.setConfig(repoPath, key, value)
  })

  ipcMain.handle(GIT_CHANNELS.SET_MODE, async (_event, mode: GitMode) => {
    validateParams('git:setMode')
      .enum(['auto', 'system', 'isomorphic'] as const, mode, 'mode')
      .validate()
    gitService.setMode(mode)
    return { success: true }
  })

  ipcMain.handle(GIT_CHANNELS.GET_MODE, async () => {
    return {
      mode: gitService.getMode(),
      useSystemGit: gitService.isUsingSystemGit()
    }
  })

  ipcMain.handle(GIT_CHANNELS.COMMIT_FILES, async (_event, repoPath: string, commitHash: string) => {
    validateParams('git:commitFiles')
      .nonEmptyString(repoPath, 'repoPath')
      .nonEmptyString(commitHash, 'commitHash')
      .validate()
    return gitService.getCommitFiles(repoPath, commitHash)
  })

  ipcMain.handle(GIT_CHANNELS.COMMIT_FILE_DIFF, async (_event, repoPath: string, commitHash: string, filepath: string) => {
    validateParams('git:commitFileDiff')
      .nonEmptyString(repoPath, 'repoPath')
      .nonEmptyString(commitHash, 'commitHash')
      .nonEmptyString(filepath, 'filepath')
      .validate()
    return gitService.getCommitFileDiff(repoPath, commitHash, filepath)
  })
}
