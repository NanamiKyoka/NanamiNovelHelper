/**
 * 文件系统相关类型定义
 */

/**
 * 文件节点信息
 */
export interface FileNode {
  /** 唯一标识（使用路径） */
  key: string
  /** 文件/目录名称 */
  name: string
  /** 相对路径（相对于项目根目录） */
  path: string
  /** 是否为目录 */
  isDirectory: boolean
  /** 子节点 */
  children?: FileNode[]
  /** 文件扩展名 */
  extension?: string
  /** 文件大小（字节） */
  size?: number
  /** 最后修改时间 */
  modifiedAt?: string
}

/**
 * 读取文件选项
 */
export interface ReadFileOptions {
  /** 文件路径（绝对路径或相对于项目根目录的路径） */
  path: string
  /** 编码，默认 utf-8 */
  encoding?: BufferEncoding
}

/**
 * 写入文件选项
 */
export interface WriteFileOptions {
  /** 文件路径 */
  path: string
  /** 文件内容 */
  content: string
  /** 编码，默认 utf-8 */
  encoding?: BufferEncoding
  /** 是否创建父目录，默认 true */
  createParentDir?: boolean
}

/**
 * 创建目录选项
 */
export interface MkdirOptions {
  /** 目录路径 */
  path: string
  /** 是否递归创建，默认 true */
  recursive?: boolean
}

/**
 * 删除选项
 */
export interface DeleteOptions {
  /** 要删除的路径 */
  path: string
  /** 是否递归删除（目录），默认 false */
  recursive?: boolean
  /** 是否移入回收站而非永久删除，默认 true */
  useTrash?: boolean
}

/**
 * 重命名选项
 */
export interface RenameOptions {
  /** 原路径 */
  oldPath: string
  /** 新路径 */
  newPath: string
}

/**
 * 列出目录选项
 */
export interface ListDirOptions {
  /** 目录路径 */
  path: string
  /** 是否递归列出，默认 false */
  recursive?: boolean
  /** 是否包含隐藏文件，默认 false */
  includeHidden?: boolean
}

/**
 * 文件是否存在选项
 */
export interface ExistsOptions {
  /** 文件路径 */
  path: string
}

/**
 * 复制选项
 */
export interface CopyOptions {
  /** 源路径 */
  source: string
  /** 目标路径 */
  destination: string
  /** 是否覆盖已存在的文件，默认 false */
  overwrite?: boolean
}

/**
 * 移动选项
 */
export interface MoveOptions {
  /** 源路径 */
  source: string
  /** 目标路径 */
  destination: string
  /** 是否覆盖已存在的文件，默认 false */
  overwrite?: boolean
}
