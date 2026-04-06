/**
 * 统一加载状态组件
 * 
 * 提供一致的加载体验，支持多种展示形式
 */

import { Spin, SpinProps } from 'antd'
import styles from './Loading.module.css'

export interface LoadingProps extends Omit<SpinProps, 'tip'> {
  /** 加载提示文字 */
  tip?: string
  /** 是否全屏展示 */
  fullscreen?: boolean
  /** 是否居中展示 */
  centered?: boolean
}

/**
 * 加载状态组件
 */
export function Loading({
  tip = '加载中...',
  fullscreen = false,
  centered = false,
  className,
  ...restProps
}: LoadingProps) {
  const containerClass = [
    styles.container,
    fullscreen && styles.fullscreen,
    centered && styles.centered,
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={containerClass}>
      <Spin tip={tip} {...restProps} />
    </div>
  )
}

/**
 * 页面级加载组件
 */
export function PageLoading({ tip = '加载页面中...' }: { tip?: string }) {
  return <Loading fullscreen tip={tip} />
}

/**
 * 内容区加载组件
 */
export function ContentLoading({ tip = '加载中...' }: { tip?: string }) {
  return <Loading centered tip={tip} />
}

/**
 * 内联加载组件（用于按钮、列表项等）
 */
export function InlineLoading({ tip }: { tip?: string }) {
  return <Spin size="small" tip={tip} />
}

export default Loading
