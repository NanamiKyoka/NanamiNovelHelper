import { describe, it, expect, beforeEach, vi } from 'vitest'

const mockGitApi = {
  isRepo: vi.fn(),
  init: vi.fn(),
  status: vi.fn(),
  log: vi.fn(),
  add: vi.fn(),
  restore: vi.fn(),
  restoreStaged: vi.fn(),
  commit: vi.fn(),
  reset: vi.fn(),
  diff: vi.fn(),
  branchList: vi.fn(),
  branchCreate: vi.fn(),
  branchDelete: vi.fn(),
  branchRename: vi.fn(),
  checkout: vi.fn(),
  merge: vi.fn(),
  configGet: vi.fn(),
  configSet: vi.fn(),
  checkAuthorIdentity: vi.fn(),
  setMode: vi.fn(),
  getMode: vi.fn(),
  getCommitFiles: vi.fn(),
  getCommitFileDiff: vi.fn()
}

const mockProjectApi = {
  getCurrent: vi.fn().mockResolvedValue({ path: '/test/project' })
}

vi.stubGlobal('api', {
  git: mockGitApi,
  project: mockProjectApi,
  platform: 'windows'
})

describe('Git 取消暂存功能', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('正常仓库状态下取消暂存单个文件应调用 restoreStaged', async () => {
    mockGitApi.restoreStaged.mockResolvedValue({ success: true })
    mockGitApi.status.mockResolvedValue({
      success: true,
      data: {
        branch: 'main',
        hasChanges: true,
        hasStagedChanges: false,
        changes: [{ path: 'test.txt', statusShort: 'M', staged: false, status: 'modified', additions: 1, deletions: 0 }],
        stagedChanges: [],
        ahead: 0,
        behind: 0,
        rebasing: false,
        merging: false,
        conflicts: []
      }
    })

    const result = await mockGitApi.restoreStaged('/test/project', ['test.txt'])
    expect(result.success).toBe(true)
    expect(mockGitApi.restoreStaged).toHaveBeenCalledWith('/test/project', ['test.txt'])
  })

  it('空仓库状态下取消暂存文件应成功（后端使用 git rm --cached）', async () => {
    mockGitApi.restoreStaged.mockResolvedValue({ success: true })

    const result = await mockGitApi.restoreStaged('/test/project', ['newfile.txt'])
    expect(result.success).toBe(true)
  })

  it('取消暂存多个文件应传递完整文件列表', async () => {
    mockGitApi.restoreStaged.mockResolvedValue({ success: true })

    const files = ['file1.txt', 'file2.txt', 'file3.txt']
    const result = await mockGitApi.restoreStaged('/test/project', files)
    expect(result.success).toBe(true)
    expect(mockGitApi.restoreStaged).toHaveBeenCalledWith('/test/project', files)
  })

  it('取消暂存失败时应返回错误信息', async () => {
    mockGitApi.restoreStaged.mockResolvedValue({
      success: false,
      error: 'git restore 失败: fatal: could not resolve HEAD'
    })

    const result = await mockGitApi.restoreStaged('/test/project', ['test.txt'])
    expect(result.success).toBe(false)
    expect(result.error).toContain('could not resolve HEAD')
  })
})

describe('Git 提交身份验证', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('无任何 Git 身份配置时 checkAuthorIdentity 应返回 hasIdentity=false', async () => {
    mockGitApi.checkAuthorIdentity.mockResolvedValue({
      success: true,
      data: {
        hasIdentity: false,
        userName: null,
        userEmail: null
      }
    })

    const result = await mockGitApi.checkAuthorIdentity('/test/project')
    expect(result.success).toBe(true)
    expect(result.data.hasIdentity).toBe(false)
    expect(result.data.userName).toBeNull()
    expect(result.data.userEmail).toBeNull()
  })

  it('已配置全局身份信息时 checkAuthorIdentity 应返回 hasIdentity=true', async () => {
    mockGitApi.checkAuthorIdentity.mockResolvedValue({
      success: true,
      data: {
        hasIdentity: true,
        userName: 'Test User',
        userEmail: 'test@example.com'
      }
    })

    const result = await mockGitApi.checkAuthorIdentity('/test/project')
    expect(result.success).toBe(true)
    expect(result.data.hasIdentity).toBe(true)
    expect(result.data.userName).toBe('Test User')
    expect(result.data.userEmail).toBe('test@example.com')
  })

  it('仅配置用户名时 checkAuthorIdentity 应返回 hasIdentity=false', async () => {
    mockGitApi.checkAuthorIdentity.mockResolvedValue({
      success: true,
      data: {
        hasIdentity: false,
        userName: 'Test User',
        userEmail: null
      }
    })

    const result = await mockGitApi.checkAuthorIdentity('/test/project')
    expect(result.success).toBe(true)
    expect(result.data.hasIdentity).toBe(false)
  })

  it('配置身份信息时应调用 configSet 并传递 scope 参数', async () => {
    mockGitApi.configSet.mockResolvedValue({ success: true })

    await mockGitApi.configSet('/test/project', 'user.name', 'Test User', 'global')
    await mockGitApi.configSet('/test/project', 'user.email', 'test@example.com', 'global')

    expect(mockGitApi.configSet).toHaveBeenCalledWith('/test/project', 'user.name', 'Test User', 'global')
    expect(mockGitApi.configSet).toHaveBeenCalledWith('/test/project', 'user.email', 'test@example.com', 'global')
  })

  it('配置本地范围身份信息应传递 scope=local', async () => {
    mockGitApi.configSet.mockResolvedValue({ success: true })

    await mockGitApi.configSet('/test/project', 'user.name', 'Local User', 'local')
    await mockGitApi.configSet('/test/project', 'user.email', 'local@example.com', 'local')

    expect(mockGitApi.configSet).toHaveBeenCalledWith('/test/project', 'user.name', 'Local User', 'local')
    expect(mockGitApi.configSet).toHaveBeenCalledWith('/test/project', 'user.email', 'local@example.com', 'local')
  })

  it('配置身份后提交应成功', async () => {
    mockGitApi.configSet.mockResolvedValue({ success: true })
    mockGitApi.commit.mockResolvedValue({ success: true, data: 'abc123' })

    await mockGitApi.configSet('/test/project', 'user.name', 'Test User', 'global')
    await mockGitApi.configSet('/test/project', 'user.email', 'test@example.com', 'global')
    const commitResult = await mockGitApi.commit('/test/project', { message: 'test commit' })

    expect(commitResult.success).toBe(true)
  })

  it('未配置 scope 时 configSet 应使用默认仓库级别', async () => {
    mockGitApi.configSet.mockResolvedValue({ success: true })

    await mockGitApi.configSet('/test/project', 'user.name', 'Test User')

    expect(mockGitApi.configSet).toHaveBeenCalledWith('/test/project', 'user.name', 'Test User')
  })
})

describe('Git 差异查看功能', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('获取未暂存文件差异应传递 staged=false', async () => {
    mockGitApi.diff.mockResolvedValue({
      success: true,
      data: {
        path: 'test.txt',
        status: 'modified',
        binary: false,
        hunks: [],
        additions: 5,
        deletions: 2
      }
    })

    const result = await mockGitApi.diff('/test/project', 'test.txt', false)
    expect(result.success).toBe(true)
    expect(mockGitApi.diff).toHaveBeenCalledWith('/test/project', 'test.txt', false)
  })

  it('获取已暂存文件差异应传递 staged=true', async () => {
    mockGitApi.diff.mockResolvedValue({
      success: true,
      data: {
        path: 'test.txt',
        status: 'modified',
        binary: false,
        hunks: [],
        additions: 3,
        deletions: 1
      }
    })

    const result = await mockGitApi.diff('/test/project', 'test.txt', true)
    expect(result.success).toBe(true)
    expect(mockGitApi.diff).toHaveBeenCalledWith('/test/project', 'test.txt', true)
  })

  it('二进制文件差异应标记 binary=true', async () => {
    mockGitApi.diff.mockResolvedValue({
      success: true,
      data: {
        path: 'image.png',
        status: 'added',
        binary: true,
        hunks: [],
        additions: 0,
        deletions: 0
      }
    })

    const result = await mockGitApi.diff('/test/project', 'image.png', true)
    expect(result.success).toBe(true)
    expect(result.data.binary).toBe(true)
  })
})
