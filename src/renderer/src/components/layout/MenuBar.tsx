import { useState, useRef, useEffect, useCallback } from 'react'
import { useProjectStore } from '@stores/projectStore'
import { useUIStore } from '@stores/uiStore'
import styles from './MenuBar.module.css'

interface MenuItem {
  id: string
  label: string
  shortcut?: string
  disabled?: boolean
  separator?: boolean
  children?: MenuItem[]
}

interface MenuConfig {
  id: string
  label: string
  items: MenuItem[]
}

function MenuBar(): JSX.Element {
  const [activeMenu, setActiveMenu] = useState<string | null>(null)
  const menuBarRef = useRef<HTMLDivElement>(null)

  const {
    currentProject,
    recentProjects,
    openProject,
    closeProject,
    loadRecentProjects
  } = useProjectStore()

  const openCreateProjectModal = useUIStore((state) => state.openCreateProjectModal)
  const openOpenProjectModal = useUIStore((state) => state.openOpenProjectModal)
  const fullscreenMode = useUIStore((state) => state.fullscreenMode)

  // 加载最近项目列表 - hooks 必须在条件返回之前
  useEffect(() => {
    loadRecentProjects()
  }, [loadRecentProjects])

  // 处理菜单点击
  const handleMenuClick = useCallback((menuId: string) => {
    setActiveMenu(prev => prev === menuId ? null : menuId)
  }, [])

  // 处理菜单项点击
  const handleMenuItemClick = useCallback(async (menuId: string, itemId: string, label?: string) => {
    switch (itemId) {
      // 文件菜单
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
        // TODO: 打开项目设置
        console.log('打开项目设置')
        break
      
      // 最近项目
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
  }, [openCreateProjectModal, openOpenProjectModal, openProject, closeProject])

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

  // 全屏编辑模式下隐藏菜单栏 - 在所有 hooks 之后判断
  if (fullscreenMode) {
    return <></>
  }

  // 菜单配置
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
        { id: 'toggleOutline', label: '大纲视图' },
        { id: 'charCount', label: '字符统计' },
        { id: 'separator1', label: '', separator: true },
        { id: 'focusMode', label: '专注模式' }
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

  // 渲染下拉菜单
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
                className={`${styles.dropdownItem} ${item.disabled ? styles.disabled : ''}`}
                onClick={() => !item.disabled && handleMenuItemClick(menu.id, item.id)}
                disabled={item.disabled}
              >
                <span className={styles.menuItemLabel}>{item.label}</span>
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