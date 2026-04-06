/**
 * 统一空状态组件
 * 
 * 提供一致的空数据展示体验
 */

import { Empty as AntEmpty, Button, ButtonProps } from 'antd'
import { FileTextOutlined, FolderOutlined, SearchOutlined, UserOutlined } from '@ant-design/icons'
import styles from './Empty.module.css'

export interface EmptyProps {
  /** 空状态类型 */
  type?: 'default' | 'list' | 'folder' | 'search' | 'user' | 'custom'
  /** 自定义描述文字 */
  description?: string
  /** 操作按钮文字 */
  actionText?: string
  /** 操作按钮点击回调 */
  onAction?: () => void
  /** 操作按钮属性 */
  actionProps?: ButtonProps
  /** 自定义图标 */
  icon?: React.ReactNode
  /** 是否居中展示 */
  centered?: boolean
}

/**
 * 预设图标映射
 */
const PRESET_ICONS: Record<string, React.ReactNode> = {
  default: null,
  list: <FileTextOutlined style={{ fontSize: 48, color: '#bfbfbf' }} />,
  folder: <FolderOutlined style={{ fontSize: 48, color: '#bfbfbf' }} />,
  search: <SearchOutlined style={{ fontSize: 48, color: '#bfbfbf' }} />,
  user: <UserOutlined style={{ fontSize: 48, color: '#bfbfbf' }} />,
}

/**
 * 预设描述文字映射
 */
const PRESET_DESCRIPTIONS: Record<string, string> = {
  default: '暂无数据',
  list: '列表为空',
  folder: '文件夹为空',
  search: '未找到匹配结果',
  user: '暂无用户数据',
}

/**
 * 空状态组件
 */
export function Empty({
  type = 'default',
  description,
  actionText,
  onAction,
  actionProps,
  icon,
  centered = true,
}: EmptyProps) {
  const displayIcon = icon ?? PRESET_ICONS[type]
  const displayDescription = description ?? PRESET_DESCRIPTIONS[type]

  return (
    <div className={[styles.container, centered && styles.centered].filter(Boolean).join(' ')}>
      <AntEmpty
        image={displayIcon || AntEmpty.PRESENTED_IMAGE_SIMPLE}
        description={displayDescription}
      >
        {actionText && onAction && (
          <Button type="primary" onClick={onAction} {...actionProps}>
            {actionText}
          </Button>
        )}
      </AntEmpty>
    </div>
  )
}

/**
 * 列表空状态
 */
export function ListEmpty({ 
  actionText = '添加', 
  onAction,
  description = '列表为空，点击按钮添加新项目',
}: {
  actionText?: string
  onAction?: () => void
  description?: string
}) {
  return (
    <Empty
      type="list"
      description={description}
      actionText={onAction ? actionText : undefined}
      onAction={onAction}
    />
  )
}

/**
 * 搜索空状态
 */
export function SearchEmpty({ keyword }: { keyword?: string }) {
  return (
    <Empty
      type="search"
      description={keyword ? `未找到与"${keyword}"相关的结果` : '请输入搜索关键词'}
    />
  )
}

/**
 * 文件夹空状态
 */
export function FolderEmpty({ actionText = '新建文件', onAction }: {
  actionText?: string
  onAction?: () => void
}) {
  return (
    <Empty
      type="folder"
      description="文件夹为空"
      actionText={onAction ? actionText : undefined}
      onAction={onAction}
    />
  )
}

export default Empty
