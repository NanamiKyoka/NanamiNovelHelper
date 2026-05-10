/**
 * 终端独立窗口应用组件
 */

import { useEffect, useRef, useCallback, useState } from 'react'
import { Button, Dropdown, Select, Tooltip, Input } from 'antd'
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

interface TerminalContainerElement extends HTMLDivElement {
  fitTerminal?: () => void
}
import styles from './TerminalWindowApp.module.css'

export function TerminalWindowApp() {
  const containerRef = useRef<HTMLDivElement>(null)
  const terminalContainerRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const renameInputRef = useRef<HTMLInputElement>(null)

  const {
    terminals,
    activeTerminalId,
    availableShells,
    createTerminal,
    destroyTerminal,
    renameTerminal,
    setActiveTerminal,
    loadAvailableShells
  } = useTerminalStore()

  const { currentProject } = useProjectStore()

  useEffect(() => {
    loadAvailableShells()
  }, [loadAvailableShells])

  useEffect(() => {
    const observer = new ResizeObserver(() => {
      terminals.forEach(t => {
        const container = terminalContainerRefs.current.get(t.id)
        if (container && (container as TerminalContainerElement).fitTerminal) {
          ;(container as TerminalContainerElement).fitTerminal()
        }
      })
    })

    if (containerRef.current) {
      observer.observe(containerRef.current)
    }

    return () => observer.disconnect()
  }, [terminals])

  const handleTerminalChange = (id: string) => {
    setActiveTerminal(id)
    setTimeout(() => {
      const container = terminalContainerRefs.current.get(id)
      if (container && (container as TerminalContainerElement).fitTerminal) {
        ;(container as TerminalContainerElement).fitTerminal()
      }
    }, 100)
  }

  const handleCreateTerminal = useCallback(
    (shellPath?: string) => {
      const cwd = currentProject?.path
      createTerminal({ cwd, shellPath })
    },
    [createTerminal, currentProject]
  )

  const handleCloseTerminal = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation()
    destroyTerminal(id)
  }

  const handleStartRename = useCallback((id: string, currentName: string) => {
    setRenamingId(id)
    setRenameValue(currentName)
    setTimeout(() => {
      renameInputRef.current?.select()
    }, 0)
  }, [])

  const handleFinishRename = useCallback(() => {
    if (renamingId && renameValue.trim()) {
      renameTerminal(renamingId, renameValue.trim())
    }
    setRenamingId(null)
  }, [renamingId, renameValue, renameTerminal])

  const handleRenameKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleFinishRename()
      } else if (e.key === 'Escape') {
        setRenamingId(null)
      }
    },
    [handleFinishRename]
  )

  const shellMenuItems: MenuProps['items'] = availableShells.map(shell => ({
    key: shell.path,
    label: (
      <span>
        {shell.name} {shell.isDefault && <span style={{ color: '#999' }}>(默认)</span>}
      </span>
    ),
    onClick: () => handleCreateTerminal(shell.path)
  }))

  const createMenuItems: MenuProps['items'] = [
    {
      key: 'default',
      label: '默认终端',
      onClick: () => handleCreateTerminal()
    },
    { type: 'divider' },
    ...(shellMenuItems || [])
  ]

  const handleMinimize = () => {
    window.api.terminalWindow.minimize()
  }

  const handleMaximize = () => {
    window.api.terminalWindow.maximize()
  }

  const handleClose = () => {
    window.api.terminalWindow.close()
  }

  const activeTerminal = terminals.find(t => t.id === activeTerminalId)

  return (
    <div className={styles.app}>
      <div className={styles.titleBar}>
        <div className={styles.titleBarLeft}>
          <CodeOutlined className={styles.titleIcon} />
          <span className={styles.title}>终端</span>
          {currentProject && <span className={styles.projectName}> - {currentProject.name}</span>}
        </div>

        {terminals.length > 0 && (
          <div className={styles.terminalSelector}>
            {terminals.length > 1 ? (
              <Select
                value={activeTerminalId || undefined}
                onChange={handleTerminalChange}
                size="small"
                className={styles.select}
                popupClassName={styles.selectDropdown}
                options={terminals.map(t => ({
                  value: t.id,
                  label: (
                    <div className={styles.selectOption}>
                      <span className={styles.selectName}>{t.name}</span>
                      <Button
                        type="text"
                        size="small"
                        icon={<CloseOutlined />}
                        className={styles.selectCloseBtn}
                        onClick={e => {
                          e.stopPropagation()
                          handleCloseTerminal(t.id)
                        }}
                      />
                    </div>
                  )
                }))}
              />
            ) : renamingId === activeTerminal?.id ? (
              <Input
                ref={renameInputRef as never}
                size="small"
                value={renameValue}
                onChange={e => setRenameValue(e.target.value)}
                onBlur={handleFinishRename}
                onKeyDown={handleRenameKeyDown}
                className={styles.renameInput}
              />
            ) : (
              <span
                className={styles.singleTerminalName}
                onDoubleClick={() => activeTerminal && handleStartRename(activeTerminal.id, activeTerminal.name)}
                title="双击重命名"
              >
                {activeTerminal?.name || 'Terminal'}
              </span>
            )}
          </div>
        )}

        <div className={styles.titleBarRight}>
          <Dropdown menu={{ items: createMenuItems }} trigger={['click']}>
            <Button
              type="text"
              size="small"
              icon={<PlusOutlined />}
              className={styles.titleBtn}
              title="新建终端"
            />
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
            <Button
              type="text"
              size="small"
              icon={<MinusOutlined />}
              className={styles.controlBtn}
              onClick={handleMinimize}
            />
            <Button
              type="text"
              size="small"
              icon={<BorderOutlined />}
              className={styles.controlBtn}
              onClick={handleMaximize}
            />
            <Button
              type="text"
              size="small"
              icon={<CloseOutlined />}
              className={`${styles.controlBtn} ${styles.closeBtn}`}
              onClick={handleClose}
            />
          </div>
        </div>
      </div>

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
            ref={el => {
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
