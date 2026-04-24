/**
 * Git 服务
 * 支持系统 Git 和 isomorphic-git 两种模式
 */

import { spawn } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'
import * as git from 'isomorphic-git'
import type {
  GitMode,
  GitFileChange,
  GitFileStatus,
  GitFileStatusShort,
  GitCommit,
  GitBranch,
  GitFileDiff,
  GitDiffHunk,
  GitRepositoryStatus,
  GitInitOptions,
  GitCommitOptions,
  GitResetOptions,
  GitCheckoutOptions,
  GitMergeOptions,
  GitLogOptions,
  GitResult
} from '../types/git'

/** 状态映射 */
const STATUS_MAP: Record<string, { status: GitFileStatus; short: GitFileStatusShort }> = {
  ' M': { status: 'modified', short: 'M' },
  'M ': { status: 'modified', short: 'M' },
  'MM': { status: 'modified', short: 'M' },
  ' A': { status: 'added', short: 'A' },
  'A ': { status: 'added', short: 'A' },
  'AM': { status: 'added', short: 'A' },
  ' D': { status: 'deleted', short: 'D' },
  'D ': { status: 'deleted', short: 'D' },
  'R ': { status: 'renamed', short: 'R' },
  'C ': { status: 'copied', short: 'C' },
  '??': { status: 'untracked', short: '?' },
  '!!': { status: 'ignored', short: '!' }
}

class GitService {
  private mode: GitMode = 'auto'
  private useSystemGit: boolean = false

  constructor() {
    this.detectGitMode()
  }

  /** 检测并设置 Git 模式 */
  private async detectGitMode(): Promise<void> {
    if (this.mode === 'auto') {
      this.useSystemGit = await this.isSystemGitAvailable()
    } else {
      this.useSystemGit = this.mode === 'system'
    }
  }

  /** 检测系统 Git 是否可用 */
  private async isSystemGitAvailable(): Promise<boolean> {
    try {
      await this.execGit(process.cwd(), ['--version'])
      return true
    } catch {
      return false
    }
  }

  /** 设置 Git 模式 */
  setMode(mode: GitMode): void {
    this.mode = mode
    this.detectGitMode()
  }

  /** 获取当前模式 */
  getMode(): GitMode {
    return this.mode
  }

  /** 是否使用系统 Git */
  isUsingSystemGit(): boolean {
    return this.useSystemGit
  }

  /** 执行系统 Git 命令（使用spawn避免shell注入） */
  private async execGit(cwd: string, args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      const proc = spawn('git', args, {
        cwd,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: process.env,
      })
      
      let stdout = ''
      let stderr = ''
      
      proc.stdout.on('data', (data: Buffer) => {
        stdout += data.toString('utf-8')
      })
      
      proc.stderr.on('data', (data: Buffer) => {
        stderr += data.toString('utf-8')
      })
      
      proc.on('close', (code) => {
        if (code === 0) {
          resolve(stdout)
        } else {
          reject(new Error(`git ${args[0]} failed with code ${code}: ${stderr}`))
        }
      })
      
      proc.on('error', (err) => {
        reject(err)
      })
    })
  }

  /** 检查是否是 Git 仓库 */
  async isRepo(repoPath: string): Promise<boolean> {
    if (this.useSystemGit) {
      try {
        await this.execGit(repoPath, ['rev-parse', '--git-dir'])
        return true
      } catch {
        return false
      }
    } else {
      return git.findRoot({ fs, filepath: repoPath }).then(() => true).catch(() => false)
    }
  }

  /** 初始化仓库 */
  async init(options: GitInitOptions): Promise<GitResult<void>> {
    try {
      if (this.useSystemGit) {
        const args = ['init']
        if (options.defaultBranch) {
          args.push('-b', options.defaultBranch)
        }
        await this.execGit(options.path, args)
        
        if (options.initialCommit) {
          await this.execGit(options.path, ['add', '.'])
          await this.execGit(options.path, ['commit', '-m', options.initialCommit])
        }
      } else {
        await git.init({ fs, dir: options.path, defaultBranch: options.defaultBranch || 'main' })
        
        if (options.initialCommit) {
          await git.add({ fs, dir: options.path, filepath: '.' })
          await git.commit({
            fs,
            dir: options.path,
            message: options.initialCommit,
            author: { name: 'NanamiNovelHelper', email: 'nanami@example.com' }
          })
        }
      }
      return { success: true }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  }

  /** 获取仓库状态 */
  async getStatus(repoPath: string): Promise<GitResult<GitRepositoryStatus>> {
    try {
      if (this.useSystemGit) {
        return await this.getStatusSystem(repoPath)
      } else {
        return await this.getStatusIso(repoPath)
      }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  }

  /** 使用系统 Git 获取状态 */
  private async getStatusSystem(repoPath: string): Promise<GitResult<GitRepositoryStatus>> {
    // 获取当前分支
    let branch: string | null = null
    try {
      branch = (await this.execGit(repoPath, ['branch', '--show-current'])).trim()
    } catch {
      // 可能是 detached HEAD
    }

    // 获取文件状态
    const statusOutput = await this.execGit(repoPath, ['status', '--porcelain=v1', '-z'])
    const changes: GitFileChange[] = []
    const stagedChanges: GitFileChange[] = []
    
    const entries = statusOutput.split('\0').filter(Boolean)
    for (const entry of entries) {
      if (entry.length < 3) continue
      
      const statusCode = entry.substring(0, 2)
      let filePath = entry.substring(3)
      let oldPath: string | undefined
      
      // 处理重命名
      if (statusCode.startsWith('R') || statusCode.startsWith('C')) {
        const parts = filePath.split('\0')
        if (parts.length === 2) {
          oldPath = parts[0]
          filePath = parts[1]
        }
      }
      
      const statusInfo = STATUS_MAP[statusCode]
      if (statusInfo) {
        const isStaged = statusCode.trim() === statusCode || statusCode[0] !== ' ' || statusCode[1] !== ' '
        
        // 获取行数统计
        let additions = 0
        let deletions = 0
        try {
          const numstat = await this.execGit(repoPath, ['diff', '--numstat', '--', filePath])
          const match = numstat.trim().match(/^(\d+|-)\t(\d+|-)/)
          if (match) {
            additions = match[1] === '-' ? 0 : parseInt(match[1])
            deletions = match[2] === '-' ? 0 : parseInt(match[2])
          }
        } catch {
          // 忽略错误
        }

        const change: GitFileChange = {
          path: filePath,
          oldPath,
          status: statusInfo.status,
          statusShort: statusInfo.short,
          staged: isStaged && statusCode[0] !== ' ',
          additions,
          deletions
        }

        if (change.staged) {
          stagedChanges.push(change)
        } else {
          changes.push(change)
        }
      }
    }

    // 获取 ahead/behind
    let ahead = 0
    let behind = 0
    try {
      const trackingOutput = await this.execGit(repoPath, ['rev-list', '--left-right', '@{upstream}...HEAD', '--count'])
      const match = trackingOutput.trim().match(/^(\d+)\s+(\d+)$/)
      if (match) {
        behind = parseInt(match[1])
        ahead = parseInt(match[2])
      }
    } catch {
      // 没有上游分支
    }

    // 检查 rebase/merge 状态
    const gitDir = path.join(repoPath, '.git')
    let rebasing = false
    let merging = false
    const conflicts: string[] = []

    try {
      rebasing = fs.existsSync(path.join(gitDir, 'rebase-merge')) || 
                 fs.existsSync(path.join(gitDir, 'rebase-apply'))
      merging = fs.existsSync(path.join(gitDir, 'MERGE_HEAD'))

      if (merging) {
        // 获取冲突文件
        try {
          const conflictOutput = await this.execGit(repoPath, ['diff', '--name-only', '--diff-filter=U'])
          conflicts.push(...conflictOutput.split('\n').filter(Boolean))
        } catch {
          // 忽略
        }
      }
    } catch {
      // 忽略
    }

    return {
      success: true,
      data: {
        branch,
        hasChanges: changes.length > 0 || stagedChanges.length > 0,
        hasStagedChanges: stagedChanges.length > 0,
        changes,
        stagedChanges,
        ahead,
        behind,
        rebasing,
        merging,
        conflicts
      }
    }
  }

  /** 使用 isomorphic-git 获取状态 */
  private async getStatusIso(repoPath: string): Promise<GitResult<GitRepositoryStatus>> {
    const changes: GitFileChange[] = []
    const stagedChanges: GitFileChange[] = []
    
    const matrix = await git.statusMatrix({ fs, dir: repoPath })
    
    for (const [filepath, head, workdir, stage] of matrix) {
      // head: HEAD 状态, workdir: 工作目录状态, stage: 暂存区状态
      // 0: absent, 1: present, 2: present with different content, 3: merged/conflict
      
      let status: GitFileStatus = 'unmodified'
      let short: GitFileStatusShort = ' '
      let staged = false

      if (head === 0 && workdir === 1) {
        status = 'untracked'
        short = '?'
      } else if (head === 1 && workdir === 0) {
        status = 'deleted'
        short = 'D'
      } else if (head === 0 && workdir === 0 && stage === 2) {
        status = 'added'
        short = 'A'
        staged = true
      } else if (head === 1 && workdir === 2) {
        status = 'modified'
        short = 'M'
        if (stage === 2) {
          staged = true
        }
      } else if (head === 1 && workdir === 0 && stage === 2) {
        status = 'deleted'
        short = 'D'
        staged = true
      }

      if (status !== 'unmodified') {
        const change: GitFileChange = {
          path: filepath,
          status,
          statusShort: short,
          staged,
          additions: 0, // isomorphic-git 不直接提供
          deletions: 0
        }
        
        if (staged) {
          stagedChanges.push(change)
        } else {
          changes.push(change)
        }
      }
    }

    // 获取当前分支
    let branch: string | null = null
    try {
      branch = await git.currentBranch({ fs, dir: repoPath })
    } catch {
      // 忽略
    }

    return {
      success: true,
      data: {
        branch,
        hasChanges: changes.length > 0,
        hasStagedChanges: stagedChanges.length > 0,
        changes,
        stagedChanges,
        ahead: 0,
        behind: 0,
        rebasing: false,
        merging: false,
        conflicts: []
      }
    }
  }

  /** 获取提交历史 */
  async getLog(repoPath: string, options: GitLogOptions = {}): Promise<GitResult<GitCommit[]>> {
    try {
      if (this.useSystemGit) {
        return await this.getLogSystem(repoPath, options)
      } else {
        return await this.getLogIso(repoPath, options)
      }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  }

  /** 使用系统 Git 获取日志 */
  private async getLogSystem(repoPath: string, options: GitLogOptions): Promise<GitResult<GitCommit[]>> {
    const args = ['log', '--pretty=format:%H%n%h%n%s%n%an%n%ae%n%at%n%P%n%D', '--date-order']
    
    if (options.maxCount) {
      args.push(`-n${options.maxCount}`)
    }
    if (options.skip) {
      args.push(`--skip=${options.skip}`)
    }
    if (options.path) {
      args.push('--', options.path)
    }
    if (options.search) {
      args.push('--grep', options.search)
    }
    if (options.author) {
      args.push('--author', options.author)
    }

    const output = await this.execGit(repoPath, args)
    const commits: GitCommit[] = []
    const lines = output.split('\n')
    
    let i = 0
    while (i < lines.length) {
      const hash = lines[i++]
      if (!hash) break
      
      const shortHash = lines[i++] || ''
      const message = lines[i++] || ''
      const authorName = lines[i++] || ''
      const authorEmail = lines[i++] || ''
      const timestamp = parseInt(lines[i++] || '0')
      const parentHashes = (lines[i++] || '').split(' ').filter(Boolean)
      const refsStr = lines[i++] || ''
      
      const refs = refsStr.split(',').map(r => r.trim()).filter(Boolean)
      
      commits.push({
        hash,
        shortHash,
        message,
        title: message.split('\n')[0],
        authorName,
        authorEmail,
        timestamp,
        date: new Date(timestamp * 1000).toISOString(),
        parentHashes,
        refs
      })
    }

    return { success: true, data: commits }
  }

  /** 使用 isomorphic-git 获取日志 */
  private async getLogIso(repoPath: string, options: GitLogOptions): Promise<GitResult<GitCommit[]>> {
    const commits: GitCommit[] = []
    
    const logOptions: git.LogResponse = await git.log({
      fs,
      dir: repoPath,
      depth: options.maxCount || 100,
      since: options.from ? new Date(options.from) : undefined
    })

    for (const commit of logOptions) {
      commits.push({
        hash: commit.oid,
        shortHash: commit.oid.substring(0, 7),
        message: commit.commit.message,
        title: commit.commit.message.split('\n')[0],
        authorName: commit.commit.author.name,
        authorEmail: commit.commit.author.email,
        timestamp: Math.floor(commit.commit.author.timestamp / 1000),
        date: new Date(commit.commit.author.timestamp * 1000).toISOString(),
        parentHashes: commit.commit.parent,
        refs: []
      })
    }

    return { success: true, data: commits }
  }

  /** 添加文件到暂存区 */
  async add(repoPath: string, filepaths: string[]): Promise<GitResult<void>> {
    try {
      if (this.useSystemGit) {
        await this.execGit(repoPath, ['add', ...filepaths])
      } else {
        for (const filepath of filepaths) {
          await git.add({ fs, dir: repoPath, filepath })
        }
      }
      return { success: true }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  }

  /** 撤销暂存 */
  async unstage(repoPath: string, filepaths: string[]): Promise<GitResult<void>> {
    try {
      if (this.useSystemGit) {
        await this.execGit(repoPath, ['restore', '--staged', ...filepaths])
      } else {
        // isomorphic-git 没有 unstage，需要 reset
        for (const filepath of filepaths) {
          await git.remove({ fs, dir: repoPath, filepath, force: true })
        }
      }
      return { success: true }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  }

  /** 提交 */
  async commit(repoPath: string, options: GitCommitOptions): Promise<GitResult<string>> {
    try {
      if (this.useSystemGit) {
        const args = ['commit', '-m', options.message]
        if (options.all) {
          args.push('-a')
        }
        if (options.authorName && options.authorEmail) {
          args.push('--author', `${options.authorName} <${options.authorEmail}>`)
        }
        await this.execGit(repoPath, args)
        
        // 获取新提交的哈希
        const hash = (await this.execGit(repoPath, ['rev-parse', 'HEAD'])).trim()
        return { success: true, data: hash }
      } else {
        const author = {
          name: options.authorName || 'NanamiNovelHelper',
          email: options.authorEmail || 'nanami@example.com'
        }
        
        const hash = await git.commit({
          fs,
          dir: repoPath,
          message: options.message,
          author
        })
        return { success: true, data: hash }
      }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  }

  /** 回退 */
  async reset(repoPath: string, options: GitResetOptions): Promise<GitResult<void>> {
    try {
      if (this.useSystemGit) {
        const modeFlag = options.mode === 'soft' ? '--soft' : options.mode === 'hard' ? '--hard' : '--mixed'
        await this.execGit(repoPath, ['reset', modeFlag, options.commit])
      } else {
        // isomorphic-git 只支持部分 reset 功能
        await git.checkout({
          fs,
          dir: repoPath,
          ref: options.commit,
          force: options.mode === 'hard'
        })
      }
      return { success: true }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  }

  /** 恢复文件 */
  async restore(repoPath: string, filepaths: string[], source?: string): Promise<GitResult<void>> {
    try {
      if (this.useSystemGit) {
        const args = ['restore']
        if (source) {
          args.push('-s', source)
        }
        args.push(...filepaths)
        await this.execGit(repoPath, args)
      } else {
        const ref = source || 'HEAD'
        for (const filepath of filepaths) {
          await git.checkout({
            fs,
            dir: repoPath,
            ref,
            filepath,
            force: true
          })
        }
      }
      return { success: true }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  }

  /** 获取文件差异 */
  async getDiff(repoPath: string, filepath: string, staged: boolean = false): Promise<GitResult<GitFileDiff>> {
    try {
      if (this.useSystemGit) {
        return await this.getDiffSystem(repoPath, filepath, staged)
      } else {
        return await this.getDiffIso(repoPath, filepath, staged)
      }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  }

  /** 使用系统 Git 获取差异 */
  private async getDiffSystem(repoPath: string, filepath: string, staged: boolean): Promise<GitResult<GitFileDiff>> {
    const args = ['diff']
    if (staged) {
      args.push('--staged')
    }
    args.push('--', filepath)
    
    const output = await this.execGit(repoPath, args)
    const hunks: GitDiffHunk[] = []
    let additions = 0
    let deletions = 0
    
    // 解析 diff 输出
    const lines = output.split('\n')
    let currentHunk: GitDiffHunk | null = null
    let oldLine = 0
    let newLine = 0
    
    for (const line of lines) {
      const hunkMatch = line.match(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@(.*)$/)
      if (hunkMatch) {
        if (currentHunk) {
          hunks.push(currentHunk)
        }
        oldLine = parseInt(hunkMatch[1])
        newLine = parseInt(hunkMatch[3])
        currentHunk = {
          oldStart: oldLine,
          oldLines: parseInt(hunkMatch[2] || '1'),
          newStart: newLine,
          newLines: parseInt(hunkMatch[4] || '1'),
          header: hunkMatch[5].trim(),
          lines: []
        }
        continue
      }
      
      if (currentHunk) {
        if (line.startsWith('+')) {
          currentHunk.lines.push({
            type: 'add',
            newLineNumber: newLine++,
            content: line.substring(1)
          })
          additions++
        } else if (line.startsWith('-')) {
          currentHunk.lines.push({
            type: 'delete',
            oldLineNumber: oldLine++,
            content: line.substring(1)
          })
          deletions++
        } else if (line.startsWith(' ')) {
          currentHunk.lines.push({
            type: 'context',
            oldLineNumber: oldLine++,
            newLineNumber: newLine++,
            content: line.substring(1)
          })
        }
      }
    }
    
    if (currentHunk) {
      hunks.push(currentHunk)
    }

    return {
      success: true,
      data: {
        path: filepath,
        status: 'modified',
        binary: false,
        hunks,
        additions,
        deletions
      }
    }
  }

  /** 使用 isomorphic-git 获取差异 */
  private async getDiffIso(_repoPath: string, filepath: string, _staged: boolean): Promise<GitResult<GitFileDiff>> {
    // isomorphic-git 的 diff 功能较有限
    const hunks: GitDiffHunk[] = []
    
    return {
      success: true,
      data: {
        path: filepath,
        status: 'modified',
        binary: false,
        hunks,
        additions: 0,
        deletions: 0
      }
    }
  }

  /** 获取分支列表 */
  async getBranches(repoPath: string): Promise<GitResult<GitBranch[]>> {
    try {
      if (this.useSystemGit) {
        return await this.getBranchesSystem(repoPath)
      } else {
        return await this.getBranchesIso(repoPath)
      }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  }

  /** 使用系统 Git 获取分支 */
  private async getBranchesSystem(repoPath: string): Promise<GitResult<GitBranch[]>> {
    const branches: GitBranch[] = []
    
    // 获取本地分支
    const output = await this.execGit(repoPath, ['branch', '-v', '--no-abbrev'])
    const lines = output.split('\n')
    
    for (const line of lines) {
      const match = line.match(/^([* ]) (.+?)\s+([a-f0-9]+) (.+)$/)
      if (match) {
        const current = match[1] === '*'
        branches.push({
          name: match[2],
          current,
          remote: false,
          lastCommit: {
            hash: match[3],
            shortHash: match[3].substring(0, 7),
            message: match[4],
            title: match[4],
            authorName: '',
            authorEmail: '',
            timestamp: 0,
            date: '',
            parentHashes: [],
            refs: []
          }
        })
      }
    }

    // 获取远程分支
    const remoteOutput = await this.execGit(repoPath, ['branch', '-r', '-v', '--no-abbrev'])
    const remoteLines = remoteOutput.split('\n')
    
    for (const line of remoteLines) {
      const match = line.match(/^  (.+?)\s+([a-f0-9]+) (.+)$/)
      if (match) {
        branches.push({
          name: match[1],
          current: false,
          remote: true,
          lastCommit: {
            hash: match[2],
            shortHash: match[2].substring(0, 7),
            message: match[3],
            title: match[3],
            authorName: '',
            authorEmail: '',
            timestamp: 0,
            date: '',
            parentHashes: [],
            refs: []
          }
        })
      }
    }

    return { success: true, data: branches }
  }

  /** 使用 isomorphic-git 获取分支 */
  private async getBranchesIso(repoPath: string): Promise<GitResult<GitBranch[]>> {
    const branches: GitBranch[] = []
    
    const branchNames = await git.listBranches({ fs, dir: repoPath })
    const currentBranch = await git.currentBranch({ fs, dir: repoPath })
    
    for (const name of branchNames) {
      branches.push({
        name,
        current: name === currentBranch,
        remote: false
      })
    }

    return { success: true, data: branches }
  }

  /** 创建分支 */
  async createBranch(repoPath: string, name: string, startPoint?: string): Promise<GitResult<void>> {
    try {
      if (this.useSystemGit) {
        const args = ['branch', name]
        if (startPoint) {
          args.push(startPoint)
        }
        await this.execGit(repoPath, args)
      } else {
        await git.branch({ fs, dir: repoPath, ref: name, checkout: false, object: startPoint })
      }
      return { success: true }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  }

  /** 删除分支 */
  async deleteBranch(repoPath: string, name: string, force: boolean = false): Promise<GitResult<void>> {
    try {
      if (this.useSystemGit) {
        const args = ['branch', force ? '-D' : '-d', name]
        await this.execGit(repoPath, args)
      } else {
        await git.deleteBranch({ fs, dir: repoPath, ref: name, force })
      }
      return { success: true }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  }

  /** 切换分支 */
  async checkout(repoPath: string, options: GitCheckoutOptions): Promise<GitResult<void>> {
    try {
      if (this.useSystemGit) {
        const args = ['checkout']
        if (options.createBranch) {
          args.push('-b', options.branchName || options.target)
        }
        if (options.force) {
          args.push('-f')
        }
        if (options.paths) {
          args.push('--', ...options.paths)
        } else {
          args.push(options.target)
        }
        await this.execGit(repoPath, args)
      } else {
        await git.checkout({
          fs,
          dir: repoPath,
          ref: options.target,
          force: options.force,
          filepath: options.paths?.[0]
        })
      }
      return { success: true }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  }

  /** 合并分支 */
  async merge(repoPath: string, options: GitMergeOptions): Promise<GitResult<void>> {
    try {
      if (this.useSystemGit) {
        const args = ['merge', options.branch]
        if (options.allowUnrelatedHistories) {
          args.push('--allow-unrelated-histories')
        }
        if (options.message) {
          args.push('-m', options.message)
        }
        await this.execGit(repoPath, args)
      } else {
        // isomorphic-git 合并功能有限
        await git.merge({
          fs,
          dir: repoPath,
          ours: 'HEAD',
          theirs: options.branch,
          author: { name: 'NanamiNovelHelper', email: 'nanami@example.com' }
        })
      }
      return { success: true }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  }

  /** 获取配置 */
  async getConfig(repoPath: string, key: string): Promise<GitResult<string>> {
    try {
      if (this.useSystemGit) {
        const value = await this.execGit(repoPath, ['config', '--get', key])
        return { success: true, data: value.trim() }
      } else {
        // isomorphic-git 需要手动读取 .git/config
        const configPath = path.join(repoPath, '.git', 'config')
        const content = await fs.promises.readFile(configPath, 'utf-8')
        // 简单解析
        const regex = new RegExp(`^\\s*${key}\\s*=\\s*(.+)$`, 'm')
        const match = content.match(regex)
        if (match) {
          return { success: true, data: match[1].trim() }
        }
        return { success: false, error: 'Config not found' }
      }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  }

  /** 设置配置 */
  async setConfig(repoPath: string, key: string, value: string): Promise<GitResult<void>> {
    try {
      if (this.useSystemGit) {
        await this.execGit(repoPath, ['config', key, value])
      } else {
        // isomorphic-git 需要手动写入 .git/config
        const configPath = path.join(repoPath, '.git', 'config')
        let content = ''
        try {
          content = await fs.promises.readFile(configPath, 'utf-8')
        } catch {
          content = ''
        }
        
        const regex = new RegExp(`^\\s*${key}\\s*=\\s*.+$`, 'm')
        if (regex.test(content)) {
          content = content.replace(regex, `\t${key} = ${value}`)
        } else {
          content += `\n\t${key} = ${value}`
        }
        
        await fs.promises.writeFile(configPath, content, 'utf-8')
      }
      return { success: true }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  }
}

export const gitService = new GitService()
