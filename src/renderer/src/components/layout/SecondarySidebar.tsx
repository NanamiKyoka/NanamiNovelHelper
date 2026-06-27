import { Suspense, useCallback, useMemo } from 'react'
import { Tabs, Spin, Dropdown } from 'antd'
import type { TabsProps, MenuProps } from 'antd'
import { CloseOutlined } from '@ant-design/icons'
import { useViewStore } from '@stores/viewStore'
import styles from './SecondarySidebar.module.css'

function SecondarySidebar(): JSX.Element | null {
  const secondaryVisible = useViewStore(s => s.secondaryVisible)
  const secondaryWidth = useViewStore(s => s.secondaryWidth)
  const activeSecondaryId = useViewStore(s => s.activeSecondaryId)
  const viewDefs = useViewStore(s => s.viewDefs)
  const viewConfig = useViewStore(s => s.viewConfig)
  const getSecondaryViews = useViewStore(s => s.getSecondaryViews)
  const setActiveSecondary = useViewStore(s => s.setActiveSecondary)
  const setSecondaryWidth = useViewStore(s => s.setSecondaryWidth)
  const toggleSecondary = useViewStore(s => s.toggleSecondary)
  const moveView = useViewStore(s => s.moveView)

  const secondaryViews = useMemo(() => getSecondaryViews(), [getSecondaryViews, viewConfig])
  const activeViewDef = activeSecondaryId ? viewDefs[activeSecondaryId] : null

  // --- Resize logic ---
  const handleResize = useCallback(
    (e: MouseEvent) => {
      const newWidth = window.innerWidth - e.clientX
      setSecondaryWidth(newWidth)
    },
    [setSecondaryWidth]
  )

  const handleResizeEnd = useCallback(() => {
    document.removeEventListener('mousemove', handleResize)
    document.removeEventListener('mouseup', handleResizeEnd)
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }, [handleResize])

  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
      document.addEventListener('mousemove', handleResize)
      document.addEventListener('mouseup', handleResizeEnd)
    },
    [handleResize, handleResizeEnd]
  )

  if (!secondaryVisible) return null
  if (secondaryViews.length === 0) return null

  // Context menu for right-click on tabs
  const tabContextMenu = (viewId: string): MenuProps['items'] => [
    {
      key: 'move-to-primary',
      label: '移动到主侧边栏',
      onClick: () => moveView(viewId, 'primary')
    }
  ]

  // Antd Tabs items — label wrapped in Dropdown for right-click context menu
  const tabItems: TabsProps['items'] = secondaryViews.map(view => ({
    key: view.id,
    label: (
      <Dropdown menu={{ items: tabContextMenu(view.id) }} trigger={['contextMenu']}>
        <span className={styles.tabLabel}>
          <view.icon />
          <span>{view.label}</span>
        </span>
      </Dropdown>
    )
  }))

  return (
    <div
      className={styles.container}
      style={{ width: secondaryWidth }}
      role="complementary"
      aria-label="辅助侧边栏"
    >
      <div
        className={styles.resizeHandle}
        onMouseDown={handleResizeStart}
        role="separator"
        aria-label="调整辅助侧边栏宽度"
        tabIndex={0}
      />

      <button
        className={styles.closeBtn}
        onClick={toggleSecondary}
        aria-label="关闭辅助侧边栏"
        type="button"
      >
        <CloseOutlined />
      </button>

      <Tabs
        className={styles.tabs}
        size="small"
        activeKey={activeSecondaryId ?? undefined}
        onChange={(key) => setActiveSecondary(key)}
        items={tabItems}
      />

      <div className={styles.content} role="tabpanel" aria-label={activeViewDef?.label ?? '面板内容'}>
        {activeViewDef ? (
          <Suspense
            fallback={
              <div className={styles.spinContainer}>
                <Spin />
              </div>
            }
          >
            <activeViewDef.component />
          </Suspense>
        ) : (
          <div className={styles.emptyState}>选择面板以查看内容</div>
        )}
      </div>
    </div>
  )
}

export default SecondarySidebar
