/**
 * 视图系统类型定义
 *
 * 所有工具面板统一注册为视图，由 ViewRegistry 管理。
 * 视图可以分布在 Primary Sidebar（左）或 Secondary Sidebar（右）。
 */

import type { ComponentType, LazyExoticComponent } from 'react'

/** 视图位置 */
export type ViewLocation = 'primary' | 'secondary'

/** 视图定义（注册时使用的元数据） */
export interface ViewDefinition {
  id: string
  label: string
  icon: ComponentType
  component: LazyExoticComponent<ComponentType<object>>
  defaultLocation: ViewLocation
  order: number
}

/** 视图运行时状态 */
export interface ViewState {
  viewId: string
  location: ViewLocation
  order: number
}

/** 视图配置（持久化结构） */
export interface ViewConfig {
  primary: string[]
  secondary: string[]
}
