/**
 * VSCode 风格编辑器标签页组件
 */

import { useRef, useCallback, useState } from 'react'
import { Dropdown, MenuProps, message } from 'antd'
import { CloseOutlined, CloseCircleFilled, ExportOutlined } from '@ant-design/icons'
import { useEditorStore } from '@stores/editorStore'
import type { EditorTab } from '@types/editor'
import styles from './EditorTabs.module.css'

function stripHtmlTags(html: string): string {
  let text = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<h[1-6][^>]*>/gi, '\n')
    .replace(/<\/h[1-6]>/gi, '\n')
    .replace(/<blockquote[^>]*>/gi, '\n')
    .replace(/<\/blockquote>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/^\s+|\s+$/g, '')
  
  return text
}

interface EditorTabsProps {
  onContextMenu?: (tab: EditorTab, x: number, y: number) => void
}

export function EditorTabs({ onContextMenu }: EditorTabsProps) {
  const {
    tabs,
    activeTabId,
    previewTabId,
    setActiveTab,
    closeTab,
    closeOtherTabs,
    closeAllTabs,
    moveTab,
    getCurrentContent
  } = useEditorStore()

  const dragIndexRef = useRef<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  // 不再排序，保持原始顺序
  const sortedTabs = tabs

  // 判断是否是预览标签
  const isPreviewTab = useCallback(
    (tabId: string) => {
      return previewTabId === tabId
    },
    [previewTabId]
  )

  const handleTabClick = useCallback(
    (tabId: string) => {
      setActiveTab(tabId)
    },
    [setActiveTab]
  )

  const handleTabClose = useCallback(
    (e: React.MouseEvent, tabId: string) => {
      e.stopPropagation()
      closeTab(tabId)
    },
    [closeTab]
  )

  // 中键点击关闭标签页
  const handleMouseDown = useCallback(
    (e: React.MouseEvent, tabId: string) => {
      // button === 1 表示中键点击
      if (e.button === 1) {
        e.preventDefault()
        closeTab(tabId)
      }
    },
    [closeTab]
  )

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, tab: EditorTab) => {
      e.preventDefault()
      onContextMenu?.(tab, e.clientX, e.clientY)
    },
    [onContextMenu]
  )

  // 拖拽开始
  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    dragIndexRef.current = index
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', index.toString())
  }, [])

  // 拖拽进入
  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverIndex(index)
  }, [])

  // 拖拽离开
  const handleDragLeave = useCallback(() => {
    setDragOverIndex(null)
  }, [])

  // 拖拽放置
  const handleDrop = useCallback(
    (e: React.DragEvent, dropIndex: number) => {
      e.preventDefault()
      setDragOverIndex(null)

      const dragIndex = dragIndexRef.current
      if (dragIndex === null || dragIndex === dropIndex) return

      moveTab(dragIndex, dropIndex)
      dragIndexRef.current = null
    },
    [moveTab]
  )

  // 拖拽结束
  const handleDragEnd = useCallback(() => {
    dragIndexRef.current = null
    setDragOverIndex(null)
  }, [])

  // 导出为 TXT
  const handleExportTxt = useCallback(async (tab: EditorTab) => {
    try {
      const content = getCurrentContent()
      if (!content) {
        message.warning('文件内容为空')
        return
      }

      const baseName = tab.name.replace(/\.[^.]+$/, '')
      const filePath = await window.electron.file.showSaveDialog({
        title: '导出为纯文本',
        defaultPath: `${baseName}.txt`,
        filters: [
          { name: '文本文件', extensions: ['txt'] },
          { name: '所有文件', extensions: ['*'] }
        ]
      })

      if (!filePath) return

      const plainText = stripHtmlTags(content)
      const success = await window.electron.file.exportTxt(filePath, plainText)
      
      if (success) {
        message.success('导出成功')
      } else {
        message.error('导出失败')
      }
    } catch (error) {
      console.error('Export failed:', error)
      message.error('导出失败')
    }
  }, [getCurrentContent])

  // 右键菜单项
  const getContextMenuItems = useCallback(
    (tab: EditorTab): MenuProps['items'] => {
      const items: MenuProps['items'] = [
        {
          key: 'close',
          label: '关闭',
          icon: <CloseOutlined />,
          onClick: () => closeTab(tab.id)
        },
        {
          key: 'closeOthers',
          label: '关闭其他',
          onClick: () => closeOtherTabs(tab.id)
        },
        {
          key: 'closeAll',
          label: '关闭所有',
          onClick: () => closeAllTabs()
        }
      ]

      if (tab.type === 'novel') {
        items.push(
          { type: 'divider' },
          {
            key: 'exportTxt',
            label: '导出为纯文本 (TXT)',
            icon: <ExportOutlined />,
            onClick: () => handleExportTxt(tab)
          }
        )
      }

      return items
    },
    [closeTab, closeOtherTabs, closeAllTabs, handleExportTxt]
  )

  if (tabs.length === 0) return null

  return (
    <div className={styles.tabsContainer}>
      <div className={styles.tabsWrapper}>
        {sortedTabs.map((tab, index) => (
          <Dropdown
            key={tab.id}
            menu={{ items: getContextMenuItems(tab) }}
            trigger={['contextMenu']}
          >
            <div
              className={`${styles.tab} ${tab.id === activeTabId ? styles.active : ''} ${isPreviewTab(tab.id) && !tab.isPinned ? styles.preview : ''} ${dragOverIndex === index ? styles.dragOver : ''}`}
              onClick={() => handleTabClick(tab.id)}
              onMouseDown={e => handleMouseDown(e, tab.id)}
              onContextMenu={e => handleContextMenu(e, tab)}
              draggable
              onDragStart={e => handleDragStart(e, index)}
              onDragOver={e => handleDragOver(e, index)}
              onDragLeave={handleDragLeave}
              onDrop={e => handleDrop(e, index)}
              onDragEnd={handleDragEnd}
            >
              {/* 文件图标 */}
              <span className={styles.fileIcon}>
                {tab.type === 'novel' ? '📝' : tab.type === 'markdown' ? '📑' : '📄'}
              </span>

              {/* 文件名 */}
              <span className={styles.tabName}>{tab.name}</span>

              {/* 修改指示器 */}
              {tab.isDirty && <span className={styles.dirtyIndicator}>●</span>}

              {/* 关闭按钮 */}
              <button
                className={styles.closeBtn}
                onClick={e => handleTabClose(e, tab.id)}
                title="关闭"
              >
                {tab.isDirty ? <CloseCircleFilled /> : <CloseOutlined />}
              </button>
            </div>
          </Dropdown>
        ))}
      </div>
    </div>
  )
}

export default EditorTabs
