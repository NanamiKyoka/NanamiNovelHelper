import { useState, useRef, useEffect, useCallback } from 'react'
import { message } from 'antd'
import { useProjectStore } from '@stores/projectStore'
import { useUIStore } from '@stores/uiStore'
import { useProjectActions } from '@hooks/useProjectActions'
import styles from './MenuBar.module.css'

interface MenuItem {
  id: string
  label: string
  shortcut?: string
  disabled?: boolean
  separator?: boolean
  children?: MenuItem[]
  checked?: boolean
}

interface MenuConfig {
  id: string
  label: string
  items: MenuItem[]
}

const DOCS_URL = 'https://github.com/nanami-novel-helper/nanami-novel-helper/wiki'
const GITHUB_URL = 'https://github.com/nanami-novel-helper/nanami-novel-helper'

function MenuBar(): JSX.Element {
  const [activeMenu, setActiveMenu] = useState<string | null>(null)
  const menuBarRef = useRef<HTMLDivElement>(null)

  const {
    currentProject,
    recentProjects,
    loadRecentProjects
  } = useProjectStore()

  const { openProject, closeProject } = useProjectActions()

  const openCreateProjectModal = useUIStore((state) => state.openCreateProjectModal)
  const openOpenProjectModal = useUIStore((state) => state.openOpenProjectModal)
  const fullscreenMode = useUIStore((state) => state.fullscreenMode)
  const openAboutModal = useUIStore((state) => state.openAboutModal)
  const focusMode = useUIStore((state) => state.focusMode)
  const toggleFocusMode = useUIStore((state) => state.toggleFocusMode)
  const outlineVisible = useUIStore((state) => state.outlineVisible)
  const toggleOutline = useUIStore((state) => state.toggleOutline)
  const charCountVisible = useUIStore((state) => state.charCountVisible)
  const toggleCharCount = useUIStore((state) => state.toggleCharCount)
  const setSearchReplaceVisible = useUIStore((state) => state.setSearchReplaceVisible)

  useEffect(() => {
    loadRecentProjects()
  }, [loadRecentProjects])

  const handleMenuClick = useCallback((menuId: string) => {
    setActiveMenu(prev => prev === menuId ? null : menuId)
  }, [])

  const handleOpenExternal = useCallback((url: string) => {
    window.electron?.shell?.openExternal?.(url)
  }, [])

  const handleCheckUpdate = useCallback(async () => {
    message.info('正在检查更新...')
    try {
      const result = await window.electron?.updater?.checkForUpdates?.()
      if (result) {
        message.success('发现新版本，正在下载...')
      } else {
        message.success('当前已是最新版本')
      }
    } catch {
      message.warning('检查更新失败，请稍后重试')
    }
  }, [])

  const handleMenuItemClick = useCallback(async (menuId: string, itemId: string, label?: string) => {
    switch (itemId) {
      case 'newProject':
        openCreateProjectModal()
        break
      case 'openProject':
        openOpenProjectModal()
        break
      case 'closeProject':
        try {
          await closeProject()
        } catch (error) {
          console.error('关闭项目失败:', error)
        }
        break
      case 'projectSettings':
        window.dispatchEvent(new CustomEvent('menu:openSettings'))
        break
      
      case 'undo':
        window.dispatchEvent(new CustomEvent('editor:undo'))
        break
      case 'redo':
        window.dispatchEvent(new CustomEvent('editor:redo'))
        break
      case 'cut':
        window.dispatchEvent(new CustomEvent('editor:cut'))
        break
      case 'copy':
        window.dispatchEvent(new CustomEvent('editor:copy'))
        break
      case 'paste':
        window.dispatchEvent(new CustomEvent('editor:paste'))
        break
      case 'selectAll':
        window.dispatchEvent(new CustomEvent('editor:selectAll'))
        break
      case 'findReplace':
        setSearchReplaceVisible(true)
        window.dispatchEvent(new CustomEvent('editor:openSearch'))
        break
      
      case 'toggleSidebar':
        window.dispatchEvent(new CustomEvent('menu:toggleSidebar'))
        break
      case 'toggleOutline':
        toggleOutline()
        break
      case 'charCount':
        toggleCharCount()
        break
      case 'focusMode':
        toggleFocusMode()
        break
      
      case 'about':
        openAboutModal()
        break
      case 'docs':
        handleOpenExternal(DOCS_URL)
        break
      case 'checkUpdate':
        handleCheckUpdate()
        break
      
      default:
        if (itemId.startsWith('recent-')) {
          const projectPath = itemId.replace('recent-', '')
          try {
            await openProject(projectPath)
          } catch (error) {
            console.error('打开最近项目失败:', error)
          }
        }
    }
    
    setActiveMenu(null)
  }, [openCreateProjectModal, openOpenProjectModal, openProject, closeProject, openAboutModal, toggleFocusMode, toggleOutline, toggleCharCount, setSearchReplaceVisible, handleOpenExternal, handleCheckUpdate])

  // 点击外部关闭菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuBarRef.current && !menuBarRef.current.contains(event.target as Node)) {
        setActiveMenu(null)
      }
    }

    if (activeMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [activeMenu])

  // 键盘导航
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!activeMenu) return

      if (event.key === 'Escape') {
        setActiveMenu(null)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [activeMenu])

  if (fullscreenMode || focusMode) {
    return <></>
  }

  const menuConfig: MenuConfig[] = [
    {
      id: 'file',
      label: '文件',
      items: [
        { id: 'newProject', label: '新建项目', shortcut: 'Ctrl+N' },
        { id: 'openProject', label: '打开项目', shortcut: 'Ctrl+O' },
        {
          id: 'openRecent',
          label: '打开最近',
          children: recentProjects.length > 0
            ? recentProjects.slice(0, 5).map(p => ({
                id: `recent-${p.path}`,
                label: p.name
              }))
            : [{ id: 'noRecent', label: '无最近项目', disabled: true }]
        },
        { id: 'separator1', label: '', separator: true },
        { id: 'closeProject', label: '关闭项目', disabled: !currentProject },
        { id: 'separator2', label: '', separator: true },
        { id: 'projectSettings', label: '项目设置', disabled: !currentProject }
      ]
    },
    {
      id: 'edit',
      label: '编辑',
      items: [
        { id: 'undo', label: '撤销', shortcut: 'Ctrl+Z' },
        { id: 'redo', label: '重做', shortcut: 'Ctrl+Y' },
        { id: 'separator1', label: '', separator: true },
        { id: 'cut', label: '剪切', shortcut: 'Ctrl+X' },
        { id: 'copy', label: '复制', shortcut: 'Ctrl+C' },
        { id: 'paste', label: '粘贴', shortcut: 'Ctrl+V' },
        { id: 'selectAll', label: '全选', shortcut: 'Ctrl+A' },
        { id: 'separator2', label: '', separator: true },
        { id: 'findReplace', label: '查找替换', shortcut: 'Ctrl+H' }
      ]
    },
    {
      id: 'view',
      label: '视图',
      items: [
        { id: 'toggleSidebar', label: '切换侧边栏', shortcut: 'Ctrl+B' },
        { id: 'toggleOutline', label: '大纲视图', checked: outlineVisible },
        { id: 'charCount', label: '字符统计', checked: charCountVisible },
        { id: 'separator1', label: '', separator: true },
        { id: 'focusMode', label: '专注模式', checked: focusMode }
      ]
    },
    {
      id: 'help',
      label: '帮助',
      items: [
        { id: 'about', label: '关于' },
        { id: 'docs', label: '查看文档' },
        { id: 'separator1', label: '', separator: true },
        { id: 'checkUpdate', label: '检查更新' }
      ]
    }
  ]

  // 渲染子菜单（用于"打开最近"等）
  const renderSubMenu = (items: MenuItem[], parentMenuId: string) => {
    return (
      <div className={styles.subMenu}>
        {items.map(item => (
          <button
            key={item.id}
            className={`${styles.subMenuItem} ${item.disabled ? styles.disabled : ''}`}
            onClick={(e) => {
              e.stopPropagation()
              if (!item.disabled && !item.separator) {
                handleMenuItemClick(parentMenuId, item.id, item.label)
              }
            }}
            disabled={item.disabled}
          >
            <span className={styles.menuItemLabel}>{item.label}</span>
          </button>
        ))}
      </div>
    )
  }

  const renderDropdown = (menu: MenuConfig) => {
    return (
      <div className={styles.dropdown}>
        {menu.items.map((item, index) => {
          if (item.separator) {
            return <div key={item.id || `sep-${index}`} className={styles.separator} />
          }

          return (
            <div key={item.id} className={styles.dropdownItemWrapper}>
              <button
                className={`${styles.dropdownItem} ${item.disabled ? styles.disabled : ''} ${item.checked ? styles.checked : ''}`}
                onClick={() => !item.disabled && handleMenuItemClick(menu.id, item.id)}
                disabled={item.disabled}
              >
                <span className={styles.menuItemLabel}>
                  {item.checked !== undefined && (
                    <span className={styles.checkMark}>{item.checked ? '✓' : ''}</span>
                  )}
                  {item.label}
                </span>
                {item.shortcut && (
                  <span className={styles.shortcut}>{item.shortcut}</span>
                )}
                {item.children && (
                  <span className={styles.subMenuArrow}>▶</span>
                )}
              </button>
              {item.children && renderSubMenu(item.children, menu.id)}
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className={styles.menuBar} ref={menuBarRef}>
      {menuConfig.map(menu => (
        <div key={menu.id} className={styles.menuWrapper}>
          <button
            className={`${styles.menuButton} ${activeMenu === menu.id ? styles.active : ''}`}
            onClick={() => handleMenuClick(menu.id)}
            onMouseEnter={() => activeMenu && setActiveMenu(menu.id)}
          >
            {menu.label}
          </button>
          {activeMenu === menu.id && renderDropdown(menu)}
        </div>
      ))}
    </div>
  )
}

export default MenuBar