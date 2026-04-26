import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { Tooltip } from 'antd'
import {
  FileOutlined,
  SearchOutlined,
  BranchesOutlined,
  SettingOutlined,
  TagOutlined,
  WarningOutlined,
  ApartmentOutlined,
  ClockCircleOutlined,
  TableOutlined,
  TeamOutlined,
  RobotOutlined,
  EnvironmentOutlined
} from '@ant-design/icons'
import { useSettingsStore } from '@stores/settingsStore'
import type { SidebarBadgeType } from '@types/badge'
import { DEFAULT_SIDEBAR_BADGE_ORDER } from '@types/badge'
import { DEFAULT_SIDEBAR_BADGE_VISIBILITY, type SidebarBadgeVisibility } from '@shared/settings'
import styles from './ActivityBar.module.css'

interface ActivityBarProps {
  activePanel: string
  sidebarCollapsed: boolean
  onPanelClick: (panelId: string) => void
}

// 主要按钮配置（文件、搜索、Git）
const MAIN_BUTTONS = [
  { id: 'files', icon: FileOutlined, tooltip: '文件' },
  { id: 'search', icon: SearchOutlined, tooltip: '搜索' },
  { id: 'git', icon: BranchesOutlined, tooltip: 'Git' }
]

// 设置按钮
const SETTINGS_BUTTON = { id: 'settings', icon: SettingOutlined, tooltip: '设置' }

// 全屏功能入口配置
const SIDEBAR_BADGE_CONFIG: Record<SidebarBadgeType, { icon: React.ComponentType; tooltip: string }> = {
  vocabulary: { icon: TagOutlined, tooltip: '词汇查询' },
  sensitive: { icon: WarningOutlined, tooltip: '敏感词' },
  relationship: { icon: ApartmentOutlined, tooltip: '关系图' },
  timeline: { icon: ClockCircleOutlined, tooltip: '时间线' },
  sequenceChart: { icon: TableOutlined, tooltip: '事序图' },
  organization: { icon: TeamOutlined, tooltip: '组织架构' },
  aiAssistant: { icon: RobotOutlined, tooltip: 'AI写作助手' },
  map: { icon: EnvironmentOutlined, tooltip: '地图' }
}

// 拖拽数据类型
const DRAG_DATA_TYPE = 'application/sidebar-badge'

function ActivityBar({ activePanel, sidebarCollapsed, onPanelClick }: ActivityBarProps): JSX.Element {
  const globalSettings = useSettingsStore((state) => state.globalSettings)
  const updateSidebarBadgeOrder = useSettingsStore((state) => state.updateSidebarBadgeOrder)
  
  // 从 globalSettings.layout 读取可见性和顺序
  const visibility: SidebarBadgeVisibility = useMemo(() => {
    return globalSettings.layout?.sidebarBadgeVisibility || DEFAULT_SIDEBAR_BADGE_VISIBILITY
  }, [globalSettings.layout?.sidebarBadgeVisibility])
  
  const order: SidebarBadgeType[] = useMemo(() => {
    const savedOrder = globalSettings.layout?.sidebarBadgeOrder
    if (savedOrder && Array.isArray(savedOrder) && savedOrder.length > 0) {
      // 过滤有效项并补充缺失项
      const validOrder = savedOrder.filter((b): b is SidebarBadgeType => 
        DEFAULT_SIDEBAR_BADGE_ORDER.includes(b as SidebarBadgeType)
      )
      const missingBadges = DEFAULT_SIDEBAR_BADGE_ORDER.filter(b => !validOrder.includes(b))
      return [...validOrder, ...missingBadges]
    }
    return [...DEFAULT_SIDEBAR_BADGE_ORDER]
  }, [globalSettings.layout?.sidebarBadgeOrder])
  
  // 拖拽状态
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [dropPosition, setDropPosition] = useState<'top' | 'bottom' | null>(null)
  
  // 容器引用
  const containerRef = useRef<HTMLDivElement>(null)

  // 监听 Sidebar 返回事件
  useEffect(() => {
    const handleBackToFiles = () => {
      onPanelClick('files')
    }
    window.addEventListener('sidebar-back-to-files', handleBackToFiles)
    return () => {
      window.removeEventListener('sidebar-back-to-files', handleBackToFiles)
    }
  }, [onPanelClick])

  // 获取可见的徽章列表（按排序）
  const visibleBadges = useMemo(() => {
    return order.filter((id) => visibility[id])
  }, [order, visibility])

  // 拖拽开始
  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData(DRAG_DATA_TYPE, String(index))
    
    // 添加拖拽样式
    const target = e.currentTarget as HTMLElement
    setTimeout(() => {
      target.classList.add(styles.dragging)
    }, 0)
  }, [])

  // 拖拽结束
  const handleDragEnd = useCallback((e: React.DragEvent) => {
    const target = e.currentTarget as HTMLElement
    target.classList.remove(styles.dragging)
    setDraggedIndex(null)
    setDragOverIndex(null)
    setDropPosition(null)
  }, [])

  // 拖拽悬停
  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    
    if (draggedIndex === null || draggedIndex === index) {
      setDragOverIndex(null)
      setDropPosition(null)
      return
    }
    
    // 计算插入位置
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const midY = rect.top + rect.height / 2
    const position = e.clientY < midY ? 'top' : 'bottom'
    
    setDragOverIndex(index)
    setDropPosition(position)
  }, [draggedIndex])

  // 拖拽离开
  const handleDragLeave = useCallback(() => {
    setDragOverIndex(null)
    setDropPosition(null)
  }, [])

  // 放置
  const handleDrop = useCallback((e: React.DragEvent, targetIndex: number) => {
    e.preventDefault()
    
    if (draggedIndex === null || draggedIndex === targetIndex) {
      return
    }
    
    // 计算新顺序
    const newOrder = [...visibleBadges]
    const [draggedItem] = newOrder.splice(draggedIndex, 1)
    
    // 根据放置位置计算插入点
    let insertIndex = targetIndex
    if (draggedIndex < targetIndex) {
      insertIndex = dropPosition === 'top' ? targetIndex - 1 : targetIndex
    } else {
      insertIndex = dropPosition === 'top' ? targetIndex : targetIndex + 1
    }
    
    // 确保插入点在有效范围内
    insertIndex = Math.max(0, Math.min(insertIndex, newOrder.length))
    
    newOrder.splice(insertIndex, 0, draggedItem)
    
    // 更新顺序 - 需要合并原有的不可见徽章
    const hiddenBadges = order.filter((id) => !visibility[id])
    const finalOrder = [...newOrder, ...hiddenBadges]
    updateSidebarBadgeOrder(finalOrder)
    
    // 重置状态
    setDraggedIndex(null)
    setDragOverIndex(null)
    setDropPosition(null)
  }, [draggedIndex, dropPosition, visibleBadges, order, visibility, updateSidebarBadgeOrder])

  
  return (
    <div className={styles.container} ref={containerRef}>
      {/* 主要按钮区域（文件、搜索、Git） */}
      <div className={styles.mainButtons} role="navigation" aria-label="主导航">
        {MAIN_BUTTONS.map((button) => {
          const IconComponent = button.icon
          const isActive = !sidebarCollapsed && activePanel === button.id
          
          return (
            <Tooltip key={button.id} title={button.tooltip} placement="right">
              <div
                className={`${styles.button} ${isActive ? styles.active : ''}`}
                onClick={() => onPanelClick(button.id)}
                role="button"
                aria-label={button.tooltip}
                aria-pressed={isActive}
                tabIndex={0}
              >
                <IconComponent className={styles.icon} />
              </div>
            </Tooltip>
          )
        })}
      </div>

      {/* 分割线 */}
      {visibleBadges.length > 0 && <div className={styles.divider} />}

      {/* 全屏功能入口区域 */}
      <div className={styles.sidebarBadgeButtons} role="navigation" aria-label="功能面板">
        {visibleBadges.map((badgeId, index) => {
          const config = SIDEBAR_BADGE_CONFIG[badgeId]
          if (!config) return null
          
          const IconComponent = config.icon
          const isActive = !sidebarCollapsed && activePanel === badgeId
          const isDragging = draggedIndex === index
          const showTopIndicator = dragOverIndex === index && dropPosition === 'top'
          const showBottomIndicator = dragOverIndex === index && dropPosition === 'bottom'
          
          return (
            <Tooltip key={badgeId} title={config.tooltip} placement="right">
              <div
                className={`${styles.button} ${isActive ? styles.active : ''} ${isDragging ? styles.dragging : ''} ${showTopIndicator ? styles.dragOverTop : ''} ${showBottomIndicator ? styles.dragOverBottom : ''}`}
                onClick={() => onPanelClick(badgeId)}
                role="button"
                aria-label={config.tooltip}
                aria-pressed={isActive}
                tabIndex={0}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, index)}
              >
                <IconComponent className={styles.icon} />
              </div>
            </Tooltip>
          )
        })}
      </div>

      {/* 设置按钮（最下方） */}
      <div className={styles.settingsButton}>
        <div className={styles.divider} />
        <Tooltip title={SETTINGS_BUTTON.tooltip} placement="right">
          <div
            className={`${styles.button} ${!sidebarCollapsed && activePanel === SETTINGS_BUTTON.id ? styles.active : ''}`}
            onClick={() => onPanelClick(SETTINGS_BUTTON.id)}
            role="button"
            aria-label={SETTINGS_BUTTON.tooltip}
            aria-pressed={!sidebarCollapsed && activePanel === SETTINGS_BUTTON.id}
            tabIndex={0}
          >
            <SETTINGS_BUTTON.icon className={styles.icon} />
          </div>
        </Tooltip>
      </div>
    </div>
  )
}

export default ActivityBar
