/**
 * 终端面板组件
 * 右侧面板，极简风格
 */

import { useEffect, useRef, useCallback, useState } from 'react'
import { Button, Dropdown, Tooltip, Select, Input } from 'antd'
import { PlusOutlined, CloseOutlined, CodeOutlined, ExpandOutlined } from '@ant-design/icons'
import type { MenuProps } from 'antd'
import { useTerminalStore } from '@stores/terminalStore'
import { useProjectStore } from '@stores/projectStore'
import { TerminalInstance } from './TerminalInstance'
import styles from './TerminalPanel.module.css'

interface TerminalContainerElement extends HTMLDivElement {
  fitTerminal?: () => void
}

interface TerminalPanelProps {
  onClose?: () => void
}

export function TerminalPanel({ onClose }: TerminalPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const terminalContainerRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const [, setIsTerminalWindowOpen] = useState(false)
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
    window.api.terminalWindow.isOpen().then(isOpen => {
      setIsTerminalWindowOpen(isOpen)
    })
    window.api.terminalWindow.onOpened(() => {
      setIsTerminalWindowOpen(true)
    })
    window.api.terminalWindow.onClosed(() => {
      setIsTerminalWindowOpen(false)
    })
    return () => {
      window.api.terminalWindow.removeOpenedListener()
      window.api.terminalWindow.removeClosedListener()
    }
  }, [])

  useEffect(() => {
    loadAvailableShells()
  }, [loadAvailableShells])

  const handleTerminalChange = (id: string) => {
    setActiveTerminal(id)
    setTimeout(() => {
      const container = terminalContainerRefs.current.get(id)
      if (container && (container as TerminalContainerElement).fitTerminal) {
        ;(container as TerminalContainerElement).fitTerminal!()
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

  const handlePopOut = useCallback(() => {
    window.api.terminalWindow.create()
    onClose?.()
  }, [onClose])

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

  useEffect(() => {
    const observer = new ResizeObserver(() => {
      terminals.forEach(t => {
        const container = terminalContainerRefs.current.get(t.id)
        if (container && (container as TerminalContainerElement).fitTerminal) {
          ;(container as TerminalContainerElement).fitTerminal!()
        }
      })
    })

    if (containerRef.current) {
      observer.observe(containerRef.current)
    }

    return () => observer.disconnect()
  }, [terminals])

  const activeTerminal = terminals.find(t => t.id === activeTerminalId)

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <CodeOutlined className={styles.icon} />
          <span className={styles.title}>终端</span>
          {terminals.length > 1 && <span className={styles.count}>{terminals.length}</span>}
        </div>
        <div className={styles.headerRight}>
          <Dropdown menu={{ items: createMenuItems }} trigger={['click']}>
            <Button
              type="text"
              size="small"
              icon={<PlusOutlined />}
              className={styles.headerBtn}
              title="新建终端"
            />
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
            <Button
              type="text"
              size="small"
              icon={<CloseOutlined />}
              className={styles.headerBtn}
              onClick={onClose}
            />
          )}
        </div>
      </div>

      {terminals.length > 0 && (
        <div className={styles.selector}>
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
