/**
 * 终端模块类型定义
 */

/**
 * 终端创建选项
 */
export interface TerminalCreateOptions {
  /** 工作目录 */
  cwd?: string
  /** 环境变量 */
  env?: Record<string, string>
  /** Shell 路径 (可选，不指定则使用系统默认) */
  shellPath?: string
  /** Shell 参数 */
  shellArgs?: string[]
  /** 终端名称 */
  name?: string
}

/**
 * 终端实例信息
 */
export interface TerminalInstance {
  /** 终端 ID */
  id: string
  /** 终端名称 */
  name: string
  /** 进程 ID */
  pid: number
  /** 工作目录 */
  cwd: string
  /** 是否已退出 */
  exited: boolean
  /** 退出码 */
  exitCode?: number
}

/**
 * 终端尺寸
 */
export interface TerminalSize {
  /** 列数 */
  cols: number
  /** 行数 */
  rows: number
}

/**
 * IPC 通道名称
 */
export const TerminalChannels = {
  CREATE: 'terminal:create',
  WRITE: 'terminal:write',
  RESIZE: 'terminal:resize',
  DESTROY: 'terminal:destroy',
  DATA: 'terminal:data',
  EXIT: 'terminal:exit',
  LIST: 'terminal:list',
  GET_SHELLS: 'terminal:getShells',
  SET_CWD: 'terminal:setCwd'
} as const

/**
 * Shell 信息
 */
export interface ShellInfo {
  /** Shell 名称 */
  name: string
  /** Shell 路径 */
  path: string
  /** 是否为默认 Shell */
  isDefault?: boolean
}
