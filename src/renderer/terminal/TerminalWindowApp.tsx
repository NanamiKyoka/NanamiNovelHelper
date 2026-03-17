/**
 * 终端独立窗口应用组件
 */

import { useEffect, useRef, useCallback } from 'react'
import { Button, Dropdown, Select, Tooltip } from 'antd'
import {
  PlusOutlined,
  CloseOutlined,
  CodeOutlined,
  MinusOutlined,
  BorderOutlined
} from '@ant-design/icons'
import type { MenuProps } from 'antd'
import { useTerminalStore } from '@stores/terminalStore'
import { useProjectStore } from '@stores/projectStore'
import { TerminalInstance } from '@components/terminal/TerminalInstance'
import styles from './TerminalWindowApp.module.css'

export function TerminalWindowApp() {
  const containerRef = useRef<HTMLDivElement>(null)
  const terminalContainerRefs = useRef<Map<string, HTMLDivElement>>(new Map())

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

  // 加载可用 Shell
  useEffect(() => {
    loadAvailableShells()
  }, [loadAvailableShells])

  // 窗口大小变化时调整终端
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

  // 创建终端菜单
  const createMenuItems: MenuProps['items'] = [
    {
      key: 'default',
      label: '默认终端',
      onClick: () => handleCreateTerminal()
    },
    { type: 'divider' },
    ...(shellMenuItems || [])
  ]

  // 窗口控制
  const handleMinimize = () => {
    window.electron.terminalWindow.minimize()
  }

  const handleMaximize = () => {
    window.electron.terminalWindow.maximize()
  }

  const handleClose = () => {
    window.electron.terminalWindow.close()
  }

  // 当前活动终端
  const activeTerminal = terminals.find((t) => t.id === activeTerminalId)

  return (
    <div className={styles.app}>
      {/* 自定义标题栏 */}
      <div className={styles.titleBar}>
        <div className={styles.titleBarLeft}>
          <CodeOutlined className={styles.titleIcon} />
          <span className={styles.title}>终端</span>
          {currentProject && (
            <span className={styles.projectName}> - {currentProject.name}</span>
          )}
        </div>
        
        {/* 终端选择器 */}
        {terminals.length > 0 && (
          <div className={styles.terminalSelector}>
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
        
        {/* 操作按钮 */}
        <div className={styles.titleBarRight}>
          <Dropdown menu={{ items: createMenuItems }} trigger={['click']}>
            <Button type="text" size="small" icon={<PlusOutlined />} className={styles.titleBtn} title="新建终端" />
          </Dropdown>
          {activeTerminal && (
            <Tooltip title="关闭当前终端">
              <Button 
                type="text" 
                size="small" 
                icon={<CloseOutlined />} 
                className={styles.titleBtn}
                onClick={() => handleCloseTerminal(activeTerminal.id)}
              />
            </Tooltip>
          )}
          <div className={styles.windowControls}>
            <Button type="text" size="small" icon={<MinusOutlined />} className={styles.controlBtn} onClick={handleMinimize} />
            <Button type="text" size="small" icon={<BorderOutlined />} className={styles.controlBtn} onClick={handleMaximize} />
            <Button type="text" size="small" icon={<CloseOutlined />} className={`${styles.controlBtn} ${styles.closeBtn}`} onClick={handleClose} />
          </div>
        </div>
      </div>

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
