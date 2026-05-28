/**
 * 统一错误代码体系 — 全应用唯一错误码来源
 *
 * Rust 后端和 TypeScript 前端共享此错误码定义。
 * Rust 端通过匹配字符串常量使用对应错误码。
 *
 * 格式：CATEGORY_CODE = 'CATEGORY_SPECIFIC'
 *   例：PRJ_OPEN_FAILED = 'PRJ_OPEN_FAILED'
 */

import { logger } from './logger'

export type ErrorSeverity = 'fatal' | 'error' | 'warning'

export enum ErrorCode {
  UNKNOWN = 'UNKNOWN',

  // === 系统 SYS ===
  SYS_APP_START_FAILED = 'SYS_APP_START_FAILED',
  SYS_WINDOW_CREATE_FAILED = 'SYS_WINDOW_CREATE_FAILED',
  SYS_IPC_TIMEOUT = 'SYS_IPC_TIMEOUT',
  SYS_UNHANDLED_ERROR = 'SYS_UNHANDLED_ERROR',

  // === 项目 PRJ ===
  PRJ_NOT_OPEN = 'PRJ_NOT_OPEN',
  PRJ_OPEN_FAILED = 'PRJ_OPEN_FAILED',
  PRJ_CREATE_FAILED = 'PRJ_CREATE_FAILED',
  PRJ_INVALID_PATH = 'PRJ_INVALID_PATH',
  PRJ_ALREADY_EXISTS = 'PRJ_ALREADY_EXISTS',
  PRJ_NOT_FOUND = 'PRJ_NOT_FOUND',
  PRJ_SAVE_FAILED = 'PRJ_SAVE_FAILED',
  PRJ_INFO_LOAD_FAILED = 'PRJ_INFO_LOAD_FAILED',

  // === 文件 FIL ===
  FIL_NOT_FOUND = 'FIL_NOT_FOUND',
  FIL_READ_ERROR = 'FIL_READ_ERROR',
  FIL_WRITE_ERROR = 'FIL_WRITE_ERROR',
  FIL_PARSE_ERROR = 'FIL_PARSE_ERROR',
  FIL_DELETE_ERROR = 'FIL_DELETE_ERROR',
  FIL_COPY_ERROR = 'FIL_COPY_ERROR',
  FIL_MKDIR_ERROR = 'FIL_MKDIR_ERROR',
  FIL_EXISTS = 'FIL_EXISTS',
  FIL_LOCKED = 'FIL_LOCKED',
  FIL_EXPORT_ERROR = 'FIL_EXPORT_ERROR',

  // === 数据 DAT ===
  DAT_INVALID = 'DAT_INVALID',
  DAT_LOAD_ERROR = 'DAT_LOAD_ERROR',
  DAT_SAVE_ERROR = 'DAT_SAVE_ERROR',
  DAT_PARSE_ERROR = 'DAT_PARSE_ERROR',
  DAT_MISSING_REQUIRED = 'DAT_MISSING_REQUIRED',
  DAT_VERSION_MISMATCH = 'DAT_VERSION_MISMATCH',
  DAT_ALREADY_EXISTS = 'DAT_ALREADY_EXISTS',

  // === 参数 ARG ===
  ARG_INVALID = 'ARG_INVALID',

  // === 词汇 VOC ===
  VOC_LOAD_FAILED = 'VOC_LOAD_FAILED',
  VOC_SAVE_FAILED = 'VOC_SAVE_FAILED',
  VOC_TYPE_NOT_FOUND = 'VOC_TYPE_NOT_FOUND',
  VOC_ENTRY_NOT_FOUND = 'VOC_ENTRY_NOT_FOUND',
  VOC_ENTRY_DUPLICATE = 'VOC_ENTRY_DUPLICATE',
  VOC_IMPORT_FAILED = 'VOC_IMPORT_FAILED',
  VOC_EXPORT_FAILED = 'VOC_EXPORT_FAILED',
  VOC_IMAGE_UPLOAD_FAILED = 'VOC_IMAGE_UPLOAD_FAILED',

  // === 图可视化 GRP ===
  GRP_LOAD_FAILED = 'GRP_LOAD_FAILED',
  GRP_SAVE_FAILED = 'GRP_SAVE_FAILED',
  GRP_NOT_FOUND = 'GRP_NOT_FOUND',
  GRP_INVALID_DATA = 'GRP_INVALID_DATA',

  // === Git GIT ===
  GIT_NOT_INITIALIZED = 'GIT_NOT_INITIALIZED',
  GIT_INIT_FAILED = 'GIT_INIT_FAILED',
  GIT_COMMIT_FAILED = 'GIT_COMMIT_FAILED',
  GIT_PUSH_FAILED = 'GIT_PUSH_FAILED',
  GIT_PULL_FAILED = 'GIT_PULL_FAILED',
  GIT_MERGE_FAILED = 'GIT_MERGE_FAILED',
  GIT_CONFLICT = 'GIT_CONFLICT',
  GIT_BRANCH_NOT_FOUND = 'GIT_BRANCH_NOT_FOUND',
  GIT_EXEC_FAILED = 'GIT_EXEC_FAILED',
  GIT_NO_COMMITS = 'GIT_NO_COMMITS',

  // === 终端 TER ===
  TER_CREATE_FAILED = 'TER_CREATE_FAILED',
  TER_NOT_FOUND = 'TER_NOT_FOUND',
  TER_WRITE_FAILED = 'TER_WRITE_FAILED',
  TER_RESIZE_FAILED = 'TER_RESIZE_FAILED',
  TER_SHELL_NOT_FOUND = 'TER_SHELL_NOT_FOUND',
  TER_WINDOW_CREATE_FAILED = 'TER_WINDOW_CREATE_FAILED',

  // === AI 服务 AI_ ===
  AI_CALL_FAILED = 'AI_CALL_FAILED',
  AI_TIMEOUT = 'AI_TIMEOUT',
  AI_RATE_LIMITED = 'AI_RATE_LIMITED',
  AI_INVALID_RESPONSE = 'AI_INVALID_RESPONSE',
  AI_API_KEY_MISSING = 'AI_API_KEY_MISSING',
  AI_TEMPLATE_NOT_FOUND = 'AI_TEMPLATE_NOT_FOUND',
  AI_WORKFLOW_NOT_FOUND = 'AI_WORKFLOW_NOT_FOUND',
  AI_EXECUTION_FAILED = 'AI_EXECUTION_FAILED',
  AI_CONNECTION_TEST_FAILED = 'AI_CONNECTION_TEST_FAILED',

  // === 设置 SET ===
  SET_LOAD_FAILED = 'SET_LOAD_FAILED',
  SET_SAVE_FAILED = 'SET_SAVE_FAILED',
  SET_INVALID_VALUE = 'SET_INVALID_VALUE',

  // === 安全 SEC ===
  SEC_PERMISSION_DENIED = 'SEC_PERMISSION_DENIED',
  SEC_KEYRING_UNAVAILABLE = 'SEC_KEYRING_UNAVAILABLE',
  SEC_KEYRING_READ_FAILED = 'SEC_KEYRING_READ_FAILED',
  SEC_KEYRING_WRITE_FAILED = 'SEC_KEYRING_WRITE_FAILED',
  SEC_ENCRYPTION_FAILED = 'SEC_ENCRYPTION_FAILED',

  // === 网络 NET ===
  NET_TIMEOUT = 'NET_TIMEOUT',
  NET_CONNECTION_REFUSED = 'NET_CONNECTION_REFUSED',
  NET_REQUEST_FAILED = 'NET_REQUEST_FAILED',
  NET_INVALID_URL = 'NET_INVALID_URL',

  // === 图像 IMG ===
  IMG_PROCESS_FAILED = 'IMG_PROCESS_FAILED',
  IMG_FORMAT_UNSUPPORTED = 'IMG_FORMAT_UNSUPPORTED',
  IMG_TOO_LARGE = 'IMG_TOO_LARGE',
  IMG_NOT_FOUND = 'IMG_NOT_FOUND',
  IMG_UPLOAD_FAILED = 'IMG_UPLOAD_FAILED',

  // === 搜索 SRC ===
  SRC_EXECUTE_FAILED = 'SRC_EXECUTE_FAILED',

  // === 技能 SKL ===
  SKL_EXECUTE_FAILED = 'SKL_EXECUTE_FAILED',
  SKL_LOAD_FAILED = 'SKL_LOAD_FAILED',
  SKL_NOT_FOUND = 'SKL_NOT_FOUND',
  SKL_PYTHON_NOT_FOUND = 'SKL_PYTHON_NOT_FOUND',
  SKL_CREATE_FAILED = 'SKL_CREATE_FAILED',

  // === 备份 BCK ===
  BCK_CREATE_FAILED = 'BCK_CREATE_FAILED',
  BCK_RESTORE_FAILED = 'BCK_RESTORE_FAILED',
  BCK_NOT_FOUND = 'BCK_NOT_FOUND',
  BCK_IMPORT_FAILED = 'BCK_IMPORT_FAILED',
  BCK_EXPORT_FAILED = 'BCK_EXPORT_FAILED'
}

/** 每个错误码的元数据 */
export interface ErrorCodeMeta {
  /** 分类 */
  category: ErrorCategory
  /** 严重度 */
  severity: ErrorSeverity
  /** 中文默认消息 */
  defaultMessage: string
  /** 恢复建议 */
  suggestion?: string
  /** 是否可恢复 */
  recoverable: boolean
}

export type ErrorCategory =
  | 'system'
  | 'project'
  | 'file'
  | 'data'
  | 'vocabulary'
  | 'graph'
  | 'git'
  | 'terminal'
  | 'ai'
  | 'settings'
  | 'security'
  | 'network'
  | 'image'
  | 'search'
  | 'skill'
  | 'backup'
  | 'unknown'

/** 完整错误码元数据映射表 */
export const ERROR_CODE_META: Record<ErrorCode, ErrorCodeMeta> = {
  [ErrorCode.UNKNOWN]: {
    category: 'unknown',
    severity: 'error',
    defaultMessage: '未知错误',
    suggestion: '请尝试重新操作或重启应用',
    recoverable: false
  },

  // 系统
  [ErrorCode.SYS_APP_START_FAILED]: {
    category: 'system',
    severity: 'fatal',
    defaultMessage: '应用启动失败',
    suggestion: '请尝试重新安装应用或联系开发者',
    recoverable: false
  },
  [ErrorCode.SYS_WINDOW_CREATE_FAILED]: {
    category: 'system',
    severity: 'fatal',
    defaultMessage: '窗口创建失败',
    suggestion: '请重启应用',
    recoverable: false
  },
  [ErrorCode.SYS_IPC_TIMEOUT]: {
    category: 'system',
    severity: 'error',
    defaultMessage: '进程通信超时',
    suggestion: '请重启应用',
    recoverable: true
  },
  [ErrorCode.SYS_UNHANDLED_ERROR]: {
    category: 'system',
    severity: 'error',
    defaultMessage: '捕获到未处理的错误',
    suggestion: '请刷新页面或重启应用',
    recoverable: true
  },

  // 项目
  [ErrorCode.PRJ_NOT_OPEN]: {
    category: 'project',
    severity: 'error',
    defaultMessage: '没有打开的项目',
    suggestion: '请先打开或创建项目',
    recoverable: true
  },
  [ErrorCode.PRJ_OPEN_FAILED]: {
    category: 'project',
    severity: 'error',
    defaultMessage: '打开项目失败',
    suggestion: '请确认项目目录存在且包含有效的项目文件',
    recoverable: true
  },
  [ErrorCode.PRJ_CREATE_FAILED]: {
    category: 'project',
    severity: 'error',
    defaultMessage: '创建项目失败',
    suggestion: '请检查目标目录是否有写入权限，或尝试选择其他位置',
    recoverable: true
  },
  [ErrorCode.PRJ_INVALID_PATH]: {
    category: 'project',
    severity: 'error',
    defaultMessage: '项目路径无效',
    suggestion: '请选择有效的项目目录',
    recoverable: true
  },
  [ErrorCode.PRJ_ALREADY_EXISTS]: {
    category: 'project',
    severity: 'warning',
    defaultMessage: '项目已存在',
    suggestion: '请选择其他位置或打开已有项目',
    recoverable: true
  },
  [ErrorCode.PRJ_NOT_FOUND]: {
    category: 'project',
    severity: 'error',
    defaultMessage: '项目未找到',
    suggestion: '项目文件可能已被移动或删除',
    recoverable: true
  },
  [ErrorCode.PRJ_SAVE_FAILED]: {
    category: 'project',
    severity: 'error',
    defaultMessage: '保存项目失败',
    suggestion: '请检查磁盘空间是否充足',
    recoverable: true
  },
  [ErrorCode.PRJ_INFO_LOAD_FAILED]: {
    category: 'project',
    severity: 'warning',
    defaultMessage: '加载项目信息失败',
    recoverable: true
  },

  // 文件
  [ErrorCode.FIL_NOT_FOUND]: {
    category: 'file',
    severity: 'error',
    defaultMessage: '文件未找到',
    suggestion: '文件可能已被删除或移动',
    recoverable: true
  },
  [ErrorCode.FIL_READ_ERROR]: {
    category: 'file',
    severity: 'error',
    defaultMessage: '文件读取失败',
    suggestion: '文件可能被其他程序占用，请关闭后重试',
    recoverable: true
  },
  [ErrorCode.FIL_WRITE_ERROR]: {
    category: 'file',
    severity: 'error',
    defaultMessage: '文件写入失败',
    suggestion: '请检查磁盘空间是否充足或文件是否被占用',
    recoverable: true
  },
  [ErrorCode.FIL_PARSE_ERROR]: {
    category: 'file',
    severity: 'error',
    defaultMessage: '文件解析失败',
    suggestion: '文件可能已损坏或格式不正确',
    recoverable: true
  },
  [ErrorCode.FIL_DELETE_ERROR]: {
    category: 'file',
    severity: 'error',
    defaultMessage: '文件删除失败',
    recoverable: true
  },
  [ErrorCode.FIL_COPY_ERROR]: {
    category: 'file',
    severity: 'error',
    defaultMessage: '文件复制失败',
    recoverable: true
  },
  [ErrorCode.FIL_MKDIR_ERROR]: {
    category: 'file',
    severity: 'error',
    defaultMessage: '创建目录失败',
    recoverable: true
  },
  [ErrorCode.FIL_EXISTS]: {
    category: 'file',
    severity: 'warning',
    defaultMessage: '路径已存在',
    recoverable: true
  },
  [ErrorCode.FIL_LOCKED]: {
    category: 'file',
    severity: 'error',
    defaultMessage: '文件被占用',
    suggestion: '请关闭占用该文件的程序后重试',
    recoverable: true
  },
  [ErrorCode.FIL_EXPORT_ERROR]: {
    category: 'file',
    severity: 'error',
    defaultMessage: '导出文件失败',
    recoverable: true
  },

  // 数据
  [ErrorCode.DAT_INVALID]: {
    category: 'data',
    severity: 'error',
    defaultMessage: '数据无效',
    recoverable: true
  },
  [ErrorCode.DAT_LOAD_ERROR]: {
    category: 'data',
    severity: 'error',
    defaultMessage: '数据加载失败',
    suggestion: '数据可能已损坏，请尝试恢复备份',
    recoverable: true
  },
  [ErrorCode.DAT_SAVE_ERROR]: {
    category: 'data',
    severity: 'error',
    defaultMessage: '数据保存失败',
    recoverable: true
  },
  [ErrorCode.DAT_PARSE_ERROR]: {
    category: 'data',
    severity: 'error',
    defaultMessage: '数据解析失败',
    recoverable: true
  },
  [ErrorCode.DAT_MISSING_REQUIRED]: {
    category: 'data',
    severity: 'error',
    defaultMessage: '缺少必要数据',
    recoverable: true
  },
  [ErrorCode.DAT_VERSION_MISMATCH]: {
    category: 'data',
    severity: 'error',
    defaultMessage: '数据版本不兼容',
    recoverable: true
  },
  [ErrorCode.DAT_ALREADY_EXISTS]: {
    category: 'data',
    severity: 'warning',
    defaultMessage: '数据已存在',
    recoverable: true
  },

  // 参数
  [ErrorCode.ARG_INVALID]: {
    category: 'unknown',
    severity: 'warning',
    defaultMessage: '参数无效',
    recoverable: true
  },

  // 词汇
  [ErrorCode.VOC_LOAD_FAILED]: {
    category: 'vocabulary',
    severity: 'error',
    defaultMessage: '加载词汇数据失败',
    suggestion: '词汇数据可能已损坏，请尝试重新打开项目',
    recoverable: true
  },
  [ErrorCode.VOC_SAVE_FAILED]: {
    category: 'vocabulary',
    severity: 'error',
    defaultMessage: '保存词汇数据失败',
    recoverable: true
  },
  [ErrorCode.VOC_TYPE_NOT_FOUND]: {
    category: 'vocabulary',
    severity: 'warning',
    defaultMessage: '词汇类型未找到',
    recoverable: true
  },
  [ErrorCode.VOC_ENTRY_NOT_FOUND]: {
    category: 'vocabulary',
    severity: 'warning',
    defaultMessage: '词条未找到',
    recoverable: true
  },
  [ErrorCode.VOC_ENTRY_DUPLICATE]: {
    category: 'vocabulary',
    severity: 'warning',
    defaultMessage: '词条已存在',
    recoverable: true
  },
  [ErrorCode.VOC_IMPORT_FAILED]: {
    category: 'vocabulary',
    severity: 'error',
    defaultMessage: '导入词汇失败',
    recoverable: true
  },
  [ErrorCode.VOC_EXPORT_FAILED]: {
    category: 'vocabulary',
    severity: 'error',
    defaultMessage: '导出词汇失败',
    recoverable: true
  },
  [ErrorCode.VOC_IMAGE_UPLOAD_FAILED]: {
    category: 'vocabulary',
    severity: 'error',
    defaultMessage: '上传词汇图片失败',
    recoverable: true
  },

  // 图可视化
  [ErrorCode.GRP_LOAD_FAILED]: {
    category: 'graph',
    severity: 'error',
    defaultMessage: '加载可视化数据失败',
    suggestion: '数据可能已损坏，请尝试重新创建',
    recoverable: true
  },
  [ErrorCode.GRP_SAVE_FAILED]: {
    category: 'graph',
    severity: 'error',
    defaultMessage: '保存可视化数据失败',
    recoverable: true
  },
  [ErrorCode.GRP_NOT_FOUND]: {
    category: 'graph',
    severity: 'warning',
    defaultMessage: '可视化数据未找到',
    recoverable: true
  },
  [ErrorCode.GRP_INVALID_DATA]: {
    category: 'graph',
    severity: 'error',
    defaultMessage: '可视化数据无效',
    recoverable: true
  },

  // Git
  [ErrorCode.GIT_NOT_INITIALIZED]: {
    category: 'git',
    severity: 'warning',
    defaultMessage: 'Git 仓库未初始化',
    suggestion: '请在项目中初始化 Git 仓库',
    recoverable: true
  },
  [ErrorCode.GIT_INIT_FAILED]: {
    category: 'git',
    severity: 'error',
    defaultMessage: 'Git 初始化失败',
    recoverable: true
  },
  [ErrorCode.GIT_COMMIT_FAILED]: {
    category: 'git',
    severity: 'error',
    defaultMessage: 'Git 提交失败',
    suggestion: '请检查是否有文件需要提交',
    recoverable: true
  },
  [ErrorCode.GIT_PUSH_FAILED]: {
    category: 'git',
    severity: 'error',
    defaultMessage: 'Git 推送失败',
    suggestion: '请检查远程仓库连接和权限',
    recoverable: true
  },
  [ErrorCode.GIT_PULL_FAILED]: {
    category: 'git',
    severity: 'error',
    defaultMessage: 'Git 拉取失败',
    recoverable: true
  },
  [ErrorCode.GIT_MERGE_FAILED]: {
    category: 'git',
    severity: 'error',
    defaultMessage: 'Git 合并失败',
    suggestion: '请手动解决冲突后在终端中操作',
    recoverable: true
  },
  [ErrorCode.GIT_CONFLICT]: {
    category: 'git',
    severity: 'warning',
    defaultMessage: '存在合并冲突',
    suggestion: '请手动解决冲突后再提交',
    recoverable: true
  },
  [ErrorCode.GIT_BRANCH_NOT_FOUND]: {
    category: 'git',
    severity: 'warning',
    defaultMessage: 'Git 分支未找到',
    recoverable: true
  },
  [ErrorCode.GIT_EXEC_FAILED]: {
    category: 'git',
    severity: 'error',
    defaultMessage: 'Git 命令执行失败',
    suggestion: '请确认 Git 已正确安装，或尝试在终端中手动操作',
    recoverable: true
  },
  [ErrorCode.GIT_NO_COMMITS]: {
    category: 'git',
    severity: 'warning',
    defaultMessage: '暂无提交记录',
    recoverable: true
  },

  // 终端
  [ErrorCode.TER_CREATE_FAILED]: {
    category: 'terminal',
    severity: 'error',
    defaultMessage: '创建终端失败',
    recoverable: true
  },
  [ErrorCode.TER_NOT_FOUND]: {
    category: 'terminal',
    severity: 'warning',
    defaultMessage: '终端实例未找到',
    recoverable: true
  },
  [ErrorCode.TER_WRITE_FAILED]: {
    category: 'terminal',
    severity: 'error',
    defaultMessage: '写入终端失败',
    recoverable: true
  },
  [ErrorCode.TER_RESIZE_FAILED]: {
    category: 'terminal',
    severity: 'error',
    defaultMessage: '调整终端大小失败',
    recoverable: true
  },
  [ErrorCode.TER_SHELL_NOT_FOUND]: {
    category: 'terminal',
    severity: 'warning',
    defaultMessage: '未找到可用 Shell',
    recoverable: true
  },
  [ErrorCode.TER_WINDOW_CREATE_FAILED]: {
    category: 'terminal',
    severity: 'error',
    defaultMessage: '创建终端窗口失败',
    recoverable: true
  },

  // AI
  [ErrorCode.AI_CALL_FAILED]: {
    category: 'ai',
    severity: 'error',
    defaultMessage: 'AI API 调用失败',
    suggestion: '请检查 API 配置和网络连接',
    recoverable: true
  },
  [ErrorCode.AI_TIMEOUT]: {
    category: 'ai',
    severity: 'error',
    defaultMessage: 'AI API 请求超时',
    suggestion: '请稍后重试或切换模型',
    recoverable: true
  },
  [ErrorCode.AI_RATE_LIMITED]: {
    category: 'ai',
    severity: 'warning',
    defaultMessage: 'API 请求频率过高',
    suggestion: '请稍后重试',
    recoverable: true
  },
  [ErrorCode.AI_INVALID_RESPONSE]: {
    category: 'ai',
    severity: 'error',
    defaultMessage: 'AI 返回数据无效',
    recoverable: true
  },
  [ErrorCode.AI_API_KEY_MISSING]: {
    category: 'ai',
    severity: 'warning',
    defaultMessage: '未配置 API Key',
    suggestion: '请在设置中配置 API Key',
    recoverable: true
  },
  [ErrorCode.AI_TEMPLATE_NOT_FOUND]: {
    category: 'ai',
    severity: 'warning',
    defaultMessage: 'AI 模板未找到',
    recoverable: true
  },
  [ErrorCode.AI_WORKFLOW_NOT_FOUND]: {
    category: 'ai',
    severity: 'warning',
    defaultMessage: 'AI 工作流未找到',
    recoverable: true
  },
  [ErrorCode.AI_EXECUTION_FAILED]: {
    category: 'ai',
    severity: 'error',
    defaultMessage: 'AI 执行失败',
    recoverable: true
  },
  [ErrorCode.AI_CONNECTION_TEST_FAILED]: {
    category: 'ai',
    severity: 'warning',
    defaultMessage: 'AI 连接测试失败',
    suggestion: '请检查 API 地址和 Key 是否正确',
    recoverable: true
  },

  // 设置
  [ErrorCode.SET_LOAD_FAILED]: {
    category: 'settings',
    severity: 'error',
    defaultMessage: '加载设置失败',
    recoverable: true
  },
  [ErrorCode.SET_SAVE_FAILED]: {
    category: 'settings',
    severity: 'error',
    defaultMessage: '保存设置失败',
    recoverable: true
  },
  [ErrorCode.SET_INVALID_VALUE]: {
    category: 'settings',
    severity: 'warning',
    defaultMessage: '设置值无效',
    recoverable: true
  },

  // 安全
  [ErrorCode.SEC_PERMISSION_DENIED]: {
    category: 'security',
    severity: 'error',
    defaultMessage: '权限不足',
    suggestion: '请检查文件权限或以管理员身份运行',
    recoverable: true
  },
  [ErrorCode.SEC_KEYRING_UNAVAILABLE]: {
    category: 'security',
    severity: 'error',
    defaultMessage: '系统密钥环不可用',
    recoverable: false
  },
  [ErrorCode.SEC_KEYRING_READ_FAILED]: {
    category: 'security',
    severity: 'error',
    defaultMessage: '读取密钥失败',
    recoverable: true
  },
  [ErrorCode.SEC_KEYRING_WRITE_FAILED]: {
    category: 'security',
    severity: 'error',
    defaultMessage: '保存密钥失败',
    recoverable: true
  },
  [ErrorCode.SEC_ENCRYPTION_FAILED]: {
    category: 'security',
    severity: 'error',
    defaultMessage: '加密操作失败',
    recoverable: true
  },

  // 网络
  [ErrorCode.NET_TIMEOUT]: {
    category: 'network',
    severity: 'error',
    defaultMessage: '网络请求超时',
    suggestion: '请检查网络连接后重试',
    recoverable: true
  },
  [ErrorCode.NET_CONNECTION_REFUSED]: {
    category: 'network',
    severity: 'error',
    defaultMessage: '网络连接被拒绝',
    suggestion: '请检查目标服务是否运行',
    recoverable: true
  },
  [ErrorCode.NET_REQUEST_FAILED]: {
    category: 'network',
    severity: 'error',
    defaultMessage: '网络请求失败',
    suggestion: '请检查网络连接',
    recoverable: true
  },
  [ErrorCode.NET_INVALID_URL]: {
    category: 'network',
    severity: 'warning',
    defaultMessage: '无效的 URL',
    recoverable: true
  },

  // 图像
  [ErrorCode.IMG_PROCESS_FAILED]: {
    category: 'image',
    severity: 'error',
    defaultMessage: '图像处理失败',
    recoverable: true
  },
  [ErrorCode.IMG_FORMAT_UNSUPPORTED]: {
    category: 'image',
    severity: 'warning',
    defaultMessage: '不支持的图像格式',
    suggestion: '支持的格式：JPEG、PNG、WebP、GIF',
    recoverable: true
  },
  [ErrorCode.IMG_TOO_LARGE]: {
    category: 'image',
    severity: 'warning',
    defaultMessage: '图像尺寸过大',
    suggestion: '图像将被自动缩放至合适尺寸',
    recoverable: true
  },
  [ErrorCode.IMG_NOT_FOUND]: {
    category: 'image',
    severity: 'warning',
    defaultMessage: '图像文件未找到',
    recoverable: true
  },
  [ErrorCode.IMG_UPLOAD_FAILED]: {
    category: 'image',
    severity: 'error',
    defaultMessage: '图像上传失败',
    recoverable: true
  },

  // 搜索
  [ErrorCode.SRC_EXECUTE_FAILED]: {
    category: 'search',
    severity: 'error',
    defaultMessage: '搜索执行失败',
    recoverable: true
  },

  // 技能
  [ErrorCode.SKL_EXECUTE_FAILED]: {
    category: 'skill',
    severity: 'error',
    defaultMessage: '技能执行失败',
    recoverable: true
  },
  [ErrorCode.SKL_LOAD_FAILED]: {
    category: 'skill',
    severity: 'error',
    defaultMessage: '加载技能失败',
    recoverable: true
  },
  [ErrorCode.SKL_NOT_FOUND]: {
    category: 'skill',
    severity: 'warning',
    defaultMessage: '技能未找到',
    recoverable: true
  },
  [ErrorCode.SKL_PYTHON_NOT_FOUND]: {
    category: 'skill',
    severity: 'error',
    defaultMessage: 'Python 环境未找到',
    suggestion: '请安装 Python 3.8+ 并确保在 PATH 中',
    recoverable: true
  },
  [ErrorCode.SKL_CREATE_FAILED]: {
    category: 'skill',
    severity: 'error',
    defaultMessage: '创建技能失败',
    recoverable: true
  },

  // 备份
  [ErrorCode.BCK_CREATE_FAILED]: {
    category: 'backup',
    severity: 'error',
    defaultMessage: '创建备份失败',
    recoverable: true
  },
  [ErrorCode.BCK_RESTORE_FAILED]: {
    category: 'backup',
    severity: 'error',
    defaultMessage: '恢复备份失败',
    recoverable: true
  },
  [ErrorCode.BCK_NOT_FOUND]: {
    category: 'backup',
    severity: 'warning',
    defaultMessage: '备份未找到',
    recoverable: true
  },
  [ErrorCode.BCK_IMPORT_FAILED]: {
    category: 'backup',
    severity: 'error',
    defaultMessage: '导入备份失败',
    recoverable: true
  },
  [ErrorCode.BCK_EXPORT_FAILED]: {
    category: 'backup',
    severity: 'error',
    defaultMessage: '导出备份失败',
    recoverable: true
  }
}

/** 分类对应的默认恢复建议 */
export const CATEGORY_SUGGESTIONS: Record<ErrorCategory, string> = {
  system: '请尝试重启应用或联系开发者',
  project: '请检查项目路径和权限',
  file: '请检查文件路径、权限和磁盘空间',
  data: '数据可能已损坏，请尝试恢复备份',
  vocabulary: '请检查词汇数据完整性',
  graph: '请重新创建可视化数据',
  git: '请在终端中手动执行 Git 操作检查状态',
  terminal: '请尝试重新打开终端',
  ai: '请检查 API 配置、Key 和网络连接',
  settings: '请检查配置文件',
  security: '请检查系统权限设置',
  network: '请检查网络连接并重试',
  image: '请检查图像文件完整性',
  search: '请重试搜索操作',
  skill: '请检查技能配置和 Python 环境',
  backup: '请检查备份文件完整性',
  unknown: '请尝试重新操作或重启应用'
}

/**
 * ServiceError — 带错误码的应用错误类
 *
 * 支持从 Rust 后端返回的 JSON 错误对象反序列化。
 * Rust 端序列化为: { "code": "PRJ_NOT_OPEN", "message": "...", "module": "..." }
 */
export class ServiceError extends Error {
  public readonly code: ErrorCode
  public readonly module: string
  public readonly severity: ErrorSeverity
  public readonly cause?: unknown
  public readonly recoverable: boolean

  constructor(code: ErrorCode, message?: string, options?: { module?: string; cause?: unknown }) {
    const meta = ERROR_CODE_META[code] || ERROR_CODE_META[ErrorCode.UNKNOWN]
    super(message ?? meta.defaultMessage)
    this.code = code
    this.module = options?.module ?? 'Service'
    this.cause = options?.cause
    this.severity = meta.severity
    this.recoverable = meta.recoverable
    this.name = 'ServiceError'
  }

  /** 获取错误元数据 */
  get meta(): ErrorCodeMeta {
    return ERROR_CODE_META[this.code] || ERROR_CODE_META[ErrorCode.UNKNOWN]
  }

  /** 获取恢复建议 */
  get suggestion(): string | undefined {
    return this.meta.suggestion || CATEGORY_SUGGESTIONS[this.meta.category]
  }

  /** 转换为 JSON（用于 IPC 传输和日志） */
  toJSON(): Record<string, unknown> {
    return {
      code: this.code,
      message: this.message,
      module: this.module,
      severity: this.severity,
      category: this.meta.category,
      recoverable: this.recoverable,
      name: this.name
    }
  }

  /** 从 Rust 后端返回的 JSON 错误对象恢复 */
  static fromIpc(json: { code?: string; message?: string; module?: string }): ServiceError {
    const rawCode = json.code
    const code = (rawCode && rawCode in ERROR_CODE_META ? rawCode as ErrorCode : ErrorCode.UNKNOWN)
    return new ServiceError(code, json.message, { module: json.module })
  }

  /** 从 JSON 恢复 */
  static fromJSON(json: ReturnType<ServiceError['toJSON']>): ServiceError {
    return new ServiceError(json.code as ErrorCode, json.message as string, {
      module: json.module as string
    })
  }
}

/** 工厂函数 */
export function createError(
  code: ErrorCode,
  message?: string,
  options?: { module?: string; cause?: unknown }
): ServiceError {
  return new ServiceError(code, message, options)
}

/** 快捷错误创建 */
export const Errors = {
  unknown: (message?: string, module?: string) =>
    createError(ErrorCode.UNKNOWN, message, { module }),

  projectNotOpen: (module?: string) =>
    createError(ErrorCode.PRJ_NOT_OPEN, undefined, { module }),

  projectInvalidPath: (message?: string, module?: string) =>
    createError(ErrorCode.PRJ_INVALID_PATH, message, { module }),

  projectNotFound: (message?: string, module?: string) =>
    createError(ErrorCode.PRJ_NOT_FOUND, message, { module }),

  fileNotFound: (path: string, module?: string) =>
    createError(ErrorCode.FIL_NOT_FOUND, `文件未找到: ${path}`, { module }),

  fileReadError: (path: string, cause?: unknown, module?: string) =>
    createError(ErrorCode.FIL_READ_ERROR, `读取文件失败: ${path}`, { module, cause }),

  fileWriteError: (path: string, cause?: unknown, module?: string) =>
    createError(ErrorCode.FIL_WRITE_ERROR, `写入文件失败: ${path}`, { module, cause }),

  fileParseError: (path: string, cause?: unknown, module?: string) =>
    createError(ErrorCode.FIL_PARSE_ERROR, `解析文件失败: ${path}`, { module, cause }),

  notFound: (message?: string, module?: string) =>
    createError(ErrorCode.FIL_NOT_FOUND, message, { module }),

  serviceNotInitialized: (module?: string) =>
    createError(ErrorCode.PRJ_NOT_OPEN, '服务未初始化', { module }),

  invalidArgument: (paramName: string, module?: string) =>
    createError(ErrorCode.ARG_INVALID, `参数无效: ${paramName}`, { module }),

  alreadyExists: (name: string, module?: string) =>
    createError(ErrorCode.DAT_ALREADY_EXISTS, `已存在: ${name}`, { module })
}

export interface HandleErrorOptions {
  module: string
  operation: string
  throw?: boolean
  log?: boolean
  defaultValue?: unknown
}

export function handleError<T>(fn: () => T, options: HandleErrorOptions): T | null {
  const { module, operation, throw: shouldThrow = false, log = true, defaultValue = null } = options

  try {
    return fn()
  } catch (error) {
    if (log) {
      if (error instanceof ServiceError) {
        logger.error(module, `${operation} failed [${error.code}]: ${error.message}`, error.cause)
      } else {
        logger.error(module, `${operation} failed`, error)
      }
    }

    if (shouldThrow) {
      if (error instanceof ServiceError) throw error
      throw new ServiceError(ErrorCode.UNKNOWN, String(error), { module, cause: error })
    }

    return defaultValue as T | null
  }
}

export async function handleErrorAsync<T>(
  fn: () => Promise<T>,
  options: HandleErrorOptions
): Promise<T | null> {
  const { module, operation, throw: shouldThrow = false, log = true, defaultValue = null } = options

  try {
    return await fn()
  } catch (error) {
    if (log) {
      if (error instanceof ServiceError) {
        logger.error(module, `${operation} failed [${error.code}]: ${error.message}`, error.cause)
      } else {
        logger.error(module, `${operation} failed`, error)
      }
    }

    if (shouldThrow) {
      if (error instanceof ServiceError) throw error
      throw new ServiceError(ErrorCode.UNKNOWN, String(error), { module, cause: error })
    }

    return defaultValue as T | null
  }
}

export function isServiceError(error: unknown): error is ServiceError {
  return error instanceof ServiceError
}

/** 从任意未知错误中提取错误码（用于日志和分类） */
export function extractErrorCode(error: unknown): ErrorCode {
  if (error instanceof ServiceError) return error.code
  if (error && typeof error === 'object' && 'code' in error) {
    const code = (error as { code: unknown }).code
    if (typeof code === 'string' && code in ERROR_CODE_META) return code as ErrorCode
  }
  return ErrorCode.UNKNOWN
}

/** 确保项目已打开 */
export function ensureProjectOpen(projectPath: string | null, module: string): void {
  if (!projectPath) {
    throw new ServiceError(ErrorCode.PRJ_NOT_OPEN, undefined, { module })
  }
}

/** 确保服务已初始化 */
export function ensureInitialized(dataDir: string | null, module: string): void {
  if (!dataDir) {
    throw new ServiceError(ErrorCode.PRJ_NOT_OPEN, undefined, { module })
  }
}