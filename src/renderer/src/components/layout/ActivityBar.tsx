import { useEffect, useLayoutEffect, useMemo, useCallback, useRef, useState } from 'react'
import { Tooltip, Dropdown } from 'antd'
import type { MenuProps } from 'antd'
import { SettingOutlined } from '@ant-design/icons'
import { useViewStore } from '@stores/viewStore'
import type { ViewDefinition } from '@types/view'
import styles from './ActivityBar.module.css'

interface ActivityBarProps {
  activePanel: string
  sidebarCollapsed: boolean
  onPanelClick: (panelId: string) => void
}

const SETTINGS_BUTTON = { id: 'settings', icon: SettingOutlined, tooltip: '设置' }

function ActivityBar({
  activePanel,
  sidebarCollapsed,
  onPanelClick
}: ActivityBarProps): JSX.Element {
  const viewDefs = useViewStore(state => state.viewDefs)
  const viewConfig = useViewStore(state => state.viewConfig)
  const activePrimaryId = useViewStore(state => state.activePrimaryId)
  const setActivePrimary = useViewStore(state => state.setActivePrimary)
  const setActiveSecondary = useViewStore(state => state.setActiveSecondary)
  const moveView = useViewStore(state => state.moveView)

  const viewButtonsRef = useRef<HTMLDivElement>(null)
  const [showAllViews, setShowAllViews] = useState(false)
  const [needsOverflow, setNeedsOverflow] = useState(false)

  const views = useMemo(() => {
    return viewConfig.primary
      .map(id => viewDefs[id])
      .filter((d): d is ViewDefinition => d != null)
  }, [viewDefs, viewConfig])

  useEffect(() => {
    const handleBackToFiles = () => {
      onPanelClick('files')
    }
    window.addEventListener('sidebar-back-to-files', handleBackToFiles)
    return () => {
      window.removeEventListener('sidebar-back-to-files', handleBackToFiles)
    }
  }, [onPanelClick])

  const handleViewClick = useCallback((viewId: string) => {
    if (viewConfig.primary.includes(viewId)) {
      onPanelClick(viewId)
      setActivePrimary(viewId)
    } else if (viewConfig.secondary.includes(viewId)) {
      setActiveSecondary(viewId)
    }
  }, [onPanelClick, viewConfig, setActivePrimary, setActiveSecondary])

  const isActive = useCallback((viewId: string) => {
    if (sidebarCollapsed) return false
    return activePrimaryId === viewId
  }, [sidebarCollapsed, activePrimaryId])
  // Right-click context menu for ActivityBar icons
  // All visible views are in primary, so only offer "move to secondary"
  const handleContextMenu = useCallback((viewId: string): MenuProps['items'] => [
    {
      key: 'move-to-secondary',
      label: '移动到辅助侧边栏',
      onClick: () => moveView(viewId, 'secondary')
    }
  ], [moveView])
  useLayoutEffect(() => {
    const el = viewButtonsRef.current
    if (!el) return

    const checkOverflow = () => {
      const prevOverflow = el.style.overflow
      el.style.overflow = 'hidden'
      setNeedsOverflow(el.scrollHeight > el.clientHeight)
      el.style.overflow = prevOverflow
    }

    checkOverflow()
    const ro = new ResizeObserver(checkOverflow)
    ro.observe(el)
    return () => ro.disconnect()
  }, [views.length])


  const renderViewButton = (view: ViewDefinition) => {
    const IconComponent = view.icon
    const active = isActive(view.id)

    return (
      <Dropdown key={view.id} menu={{ items: handleContextMenu(view.id) }} trigger={['contextMenu']}>
        <div>
          <Tooltip title={view.label} placement="right">
            <div
              className={`${styles.button} ${active ? styles.active : ''}`}
              onClick={() => handleViewClick(view.id)}
              role="button"
              aria-label={view.label}
              aria-pressed={active}
              tabIndex={0}
            >
              <IconComponent className={styles.icon} />
            </div>
          </Tooltip>
        </div>
      </Dropdown>
    )
  }

  return (
    <div className={styles.container}>
      <div
        ref={viewButtonsRef}
        className={styles.viewButtons}
        style={showAllViews ? { overflow: 'visible' } : undefined}
        role="navigation"
        aria-label="视图面板"
      >
        {views.map(renderViewButton)}
      </div>
      {needsOverflow && (
        <div
          className={styles.moreButton}
          onClick={() => setShowAllViews(v => !v)}
          role="button"
          aria-label={showAllViews ? '收起' : '更多'}
          tabIndex={0}
        >
          {showAllViews ? '\u25B2' : '\u2026'}
        </div>
      )}
      <div className={styles.settingsSection}>
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
