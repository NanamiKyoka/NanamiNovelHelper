/**
 * 终端面板组件
 * 右侧面板，极简风格
 */

import { useEffect, useRef, useCallback, useState } from 'react'
import { Button, Dropdown, Tooltip, Select } from 'antd'
import {
  PlusOutlined,
  CloseOutlined,
  CodeOutlined,
  ExpandOutlined
} from '@ant-design/icons'
import type { MenuProps } from 'antd'
import { useTerminalStore } from '@stores/terminalStore'
import { useProjectStore } from '@stores/projectStore'
import { TerminalInstance } from './TerminalInstance'
import styles from './TerminalPanel.module.css'

interface TerminalPanelProps {
  onClose?: () => void
}

export function TerminalPanel({ onClose }: TerminalPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const terminalContainerRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const [, setIsTerminalWindowOpen] = useState(false)

  const {
    terminals,
    activeTerminalId,
    availableShells,
    createTerminal,
    destroyTerminal,
    setActiveTerminal,
    loadAvailableShells
  } = useTerminalStore()

  const { currentProject } = useProjectStore()

  // 检查终端窗口状态
  useEffect(() => {
    window.electron.terminalWindow.isOpen().then((isOpen) => {
      setIsTerminalWindowOpen(isOpen)
    })

    // 监听终端窗口打开/关闭
    window.electron.terminalWindow.onOpened(() => {
      setIsTerminalWindowOpen(true)
    })
    window.electron.terminalWindow.onClosed(() => {
      setIsTerminalWindowOpen(false)
    })

    return () => {
      window.electron.terminalWindow.removeOpenedListener()
      window.electron.terminalWindow.removeClosedListener()
    }
  }, [])

  // 加载可用 Shell
  useEffect(() => {
    loadAvailableShells()
  }, [loadAvailableShells])

  // 切换终端
  const handleTerminalChange = (id: string) => {
    setActiveTerminal(id)
    setTimeout(() => {
      const container = terminalContainerRefs.current.get(id)
      if (container && (container as any).fitTerminal) {
        ;(container as any).fitTerminal()
      }
    }, 100)
  }

  // 创建新终端
  const handleCreateTerminal = useCallback((shellPath?: string) => {
    const cwd = currentProject?.path
    createTerminal({ cwd, shellPath })
  }, [createTerminal, currentProject])

  // 关闭终端
  const handleCloseTerminal = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation()
    destroyTerminal(id)
  }

  // 弹出终端窗口
  const handlePopOut = useCallback(() => {
    window.electron.terminalWindow.create()
    onClose?.()
  }, [onClose])

  // Shell 选择菜单
  const shellMenuItems: MenuProps['items'] = availableShells.map((shell) => ({
    key: shell.path,
    label: (
      <span>
        {shell.name} {shell.isDefault && <span style={{ color: '#999' }}>(默认)</span>}
      </span>
    ),
    onClick: () => handleCreateTerminal(shell.path)
  }))

  // 创建终端按钮的下拉菜单
  const createMenuItems: MenuProps['items'] = [
    {
      key: 'default',
      label: '默认终端',
      onClick: () => handleCreateTerminal()
    },
    { type: 'divider' },
    ...(shellMenuItems || [])
  ]

  // 当面板高度变化时调整终端
  useEffect(() => {
    const observer = new ResizeObserver(() => {
      terminals.forEach((t) => {
        const container = terminalContainerRefs.current.get(t.id)
        if (container && (container as any).fitTerminal) {
          ;(container as any).fitTerminal()
        }
      })
    })

    if (containerRef.current) {
      observer.observe(containerRef.current)
    }

    return () => observer.disconnect()
  }, [terminals])

  // 当前活动终端
  const activeTerminal = terminals.find((t) => t.id === activeTerminalId)

  return (
    <div className={styles.panel}>
      {/* 极简标题栏 */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <CodeOutlined className={styles.icon} />
          <span className={styles.title}>终端</span>
          {terminals.length > 1 && (
            <span className={styles.count}>{terminals.length}</span>
          )}
        </div>
        <div className={styles.headerRight}>
          <Dropdown menu={{ items: createMenuItems }} trigger={['click']}>
            <Button type="text" size="small" icon={<PlusOutlined />} className={styles.headerBtn} title="新建终端" />
          </Dropdown>
          {activeTerminal && (
            <Tooltip title="关闭当前终端">
              <Button 
                type="text" 
                size="small" 
                icon={<CloseOutlined />} 
                className={styles.headerBtn}
                onClick={() => handleCloseTerminal(activeTerminal.id)}
              />
            </Tooltip>
          )}
          <Tooltip title="弹出窗口">
            <Button 
              type="text" 
              size="small" 
              icon={<ExpandOutlined />} 
              className={styles.headerBtn} 
              onClick={handlePopOut}
            />
          </Tooltip>
          {onClose && (
            <Button type="text" size="small" icon={<CloseOutlined />} className={styles.headerBtn} onClick={onClose} />
          )}
        </div>
      </div>

      {/* 终端选择器 */}
      {terminals.length > 0 && (
        <div className={styles.selector}>
          {terminals.length > 1 ? (
            <Select
              value={activeTerminalId || undefined}
              onChange={handleTerminalChange}
              size="small"
              className={styles.select}
              popupClassName={styles.selectDropdown}
              options={terminals.map((t) => ({
                value: t.id,
                label: (
                  <div className={styles.selectOption}>
                    <span className={styles.selectName}>{t.name}</span>
                    <Button
                      type="text"
                      size="small"
                      icon={<CloseOutlined />}
                      className={styles.selectCloseBtn}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleCloseTerminal(t.id)
                      }}
                    />
                  </div>
                )
              }))}
            />
          ) : (
            <span className={styles.singleTerminalName}>{activeTerminal?.name || 'Terminal'}</span>
          )}
        </div>
      )}

      {/* 终端内容区 */}
      <div ref={containerRef} className={styles.content}>
        {terminals.length === 0 ? (
          <div className={styles.empty}>
            <CodeOutlined className={styles.emptyIcon} />
            <p className={styles.emptyText}>没有打开的终端</p>
            <Button type="primary" onClick={() => handleCreateTerminal()}>
              创建终端
            </Button>
          </div>
        ) : activeTerminal ? (
          <div
            key={activeTerminal.id}
            ref={(el) => {
              if (el) terminalContainerRefs.current.set(activeTerminal.id, el)
            }}
            className={styles.terminalWrapper}
          >
            <TerminalInstance id={activeTerminal.id} cwd={activeTerminal.cwd} />
          </div>
        ) : null}
      </div>
    </div>
  )
}
