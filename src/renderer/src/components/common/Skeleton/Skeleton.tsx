/**
 * 骨架屏组件
 *
 * 提供优雅的加载占位效果，改善用户等待体验
 */

import { Skeleton, SkeletonProps } from 'antd'
import styles from './Skeleton.module.css'

export interface SkeletonLoaderProps extends SkeletonProps {
  /** 骨架屏类型 */
  variant?: 'text' | 'card' | 'list' | 'table' | 'custom'
  /** 行数（用于 text 类型） */
  rows?: number
  /** 是否显示动画 */
  animate?: boolean
}

/**
 * 骨架屏加载组件
 */
export function SkeletonLoader({
  variant = 'text',
  rows = 3,
  animate = true,
  className,
  ...restProps
}: SkeletonLoaderProps) {
  const containerClass = [styles.container, animate && styles.animate, className]
    .filter(Boolean)
    .join(' ')

  switch (variant) {
    case 'card':
      return (
        <div className={containerClass}>
          <Skeleton.Image active={animate} className={styles.cardImage} />
          <Skeleton active={animate} paragraph={{ rows: 2 }} {...restProps} />
        </div>
      )

    case 'list':
      return (
        <div className={containerClass}>
          {[...Array(rows)].map((_, i) => (
            <div key={i} className={styles.listItem}>
              <Skeleton.Avatar active={animate} size="small" />
              <Skeleton active={animate} paragraph={{ rows: 1 }} className={styles.listContent} />
            </div>
          ))}
        </div>
      )

    case 'table':
      return (
        <div className={containerClass}>
          <div className={styles.tableHeader}>
            {[...Array(4)].map((_, i) => (
              <Skeleton.Input key={i} active={animate} size="small" className={styles.tableCell} />
            ))}
          </div>
          {[...Array(rows)].map((_, i) => (
            <div key={i} className={styles.tableRow}>
              {[...Array(4)].map((_, j) => (
                <Skeleton.Input
                  key={j}
                  active={animate}
                  size="small"
                  className={styles.tableCell}
                />
              ))}
            </div>
          ))}
        </div>
      )

    case 'text':
    default:
      return (
        <div className={containerClass}>
          <Skeleton active={animate} paragraph={{ rows }} {...restProps} />
        </div>
      )
  }
}

/**
 * 列表骨架屏
 */
export function ListSkeleton({ count = 5 }: { count?: number }) {
  return <SkeletonLoader variant="list" rows={count} />
}

/**
 * 卡片骨架屏
 */
export function CardSkeleton({ count = 1 }: { count?: number }) {
  return (
    <div className={styles.cardGrid}>
      {[...Array(count)].map((_, i) => (
        <SkeletonLoader key={i} variant="card" />
      ))}
    </div>
  )
}

/**
 * 表格骨架屏
 */
export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return <SkeletonLoader variant="table" rows={rows} />
}

/**
 * 文本骨架屏
 */
export function TextSkeleton({ rows = 3 }: { rows?: number }) {
  return <SkeletonLoader variant="text" rows={rows} />
}

export default SkeletonLoader
