/**
 * 变更文件列表组件
 */

import { useState } from 'react'
import { Button, Empty, Tooltip, Space, Dropdown, Modal } from 'antd'
import { PlusOutlined, MinusOutlined, ReloadOutlined, UndoOutlined } from '@ant-design/icons'
import { useGitStore } from '@stores/gitStore'
import DiffViewer from './DiffViewer'
import type { GitFileChange } from '@shared/git'
import type { MenuProps } from 'antd'
import styles from './GitPanel.module.css'

const { confirm } = Modal

function ChangesList(): JSX.Element {
  const { repository, selectedFile, selectFile, add, unstage, restore, currentDiff } = useGitStore()

  const [loading, setLoading] = useState<string | null>(null)

  if (!repository) {
    return (
      <div className={styles.noChanges}>
        <Empty description="无法获取仓库状态" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      </div>
    )
  }

  const { changes, stagedChanges } = repository

  // 暂存文件
  const handleStage = async (file: GitFileChange) => {
    setLoading(file.path)
    try {
      await add([file.path])
    } finally {
      setLoading(null)
    }
  }

  // 暂存所有
  const handleStageAll = async () => {
    setLoading('__all__')
    try {
      await add(changes.map(f => f.path))
    } finally {
      setLoading(null)
    }
  }

  // 撤销暂存
  const handleUnstage = async (file: GitFileChange) => {
    setLoading(file.path)
    try {
      await unstage([file.path])
    } finally {
      setLoading(null)
    }
  }

  // 放弃更改
  const handleDiscard = (file: GitFileChange) => {
    confirm({
      title: '确认放弃更改？',
      content: `这将撤销文件 "${file.path}" 的所有更改，此操作不可恢复。`,
      okText: '确认',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        setLoading(file.path)
        try {
          await restore([file.path])
        } finally {
          setLoading(null)
        }
      }
    })
  }

  // 文件操作菜单
  const getFileMenuItems = (file: GitFileChange, staged: boolean): MenuProps['items'] => [
    {
      key: 'viewDiff',
      label: '查看差异',
      icon: <ReloadOutlined />,
      onClick: () => selectFile(file)
    },
    staged
      ? {
          key: 'unstage',
          label: '撤销暂存',
          icon: <MinusOutlined />,
          onClick: () => handleUnstage(file)
        }
      : {
          key: 'stage',
          label: '暂存',
          icon: <PlusOutlined />,
          onClick: () => handleStage(file)
        },
    {
      type: 'divider'
    },
    {
      key: 'discard',
      label: '放弃更改',
      icon: <UndoOutlined />,
      danger: true,
      onClick: () => handleDiscard(file)
    }
  ]

  // 点击文件
  const handleFileClick = async (file: GitFileChange) => {
    selectFile(file)
  }

  // 渲染文件项
  const renderFileItem = (file: GitFileChange, staged: boolean) => {
    const isLoading = loading === file.path
    const isSelected = selectedFile?.path === file.path

    return (
      <Dropdown
        key={file.path}
        menu={{ items: getFileMenuItems(file, staged) }}
        trigger={['contextMenu']}
      >
        <li
          className={`${styles.fileItem} ${isSelected ? styles.selected : ''}`}
          onClick={() => handleFileClick(file)}
        >
          <span className={`${styles.fileStatus} ${styles[file.status]}`}>{file.statusShort}</span>
          <span className={styles.fileName} title={file.path}>
            {file.path}
          </span>
          <span className={styles.fileStats}>
            {file.additions > 0 && <span className={styles.additions}>+{file.additions}</span>}
            {file.deletions > 0 && <span className={styles.deletions}>-{file.deletions}</span>}
          </span>
          <div className={styles.fileActions}>
            {staged ? (
              <Tooltip title="撤销暂存">
                <Button
                  size="small"
                  type="text"
                  icon={<MinusOutlined />}
                  loading={isLoading}
                  onClick={e => {
                    e.stopPropagation()
                    handleUnstage(file)
                  }}
                />
              </Tooltip>
            ) : (
              <>
                <Tooltip title="暂存">
                  <Button
                    size="small"
                    type="text"
                    icon={<PlusOutlined />}
                    loading={isLoading}
                    onClick={e => {
                      e.stopPropagation()
                      handleStage(file)
                    }}
                  />
                </Tooltip>
                <Tooltip title="放弃更改">
                  <Button
                    size="small"
                    type="text"
                    danger
                    icon={<UndoOutlined />}
                    onClick={e => {
                      e.stopPropagation()
                      handleDiscard(file)
                    }}
                  />
                </Tooltip>
              </>
            )}
          </div>
        </li>
      </Dropdown>
    )
  }

  const hasChanges = changes.length > 0 || stagedChanges.length > 0

  if (!hasChanges) {
    return (
      <div className={styles.noChanges}>
        <Empty description="没有更改" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      </div>
    )
  }

  return (
    <div className={styles.changesSection}>
      {/* 已暂存的更改 */}
      {stagedChanges.length > 0 && (
        <div>
          <div className={styles.sectionHeader}>
            <span>已暂存的更改</span>
            <span className={styles.sectionCount}>{stagedChanges.length}</span>
          </div>
          <ul className={styles.fileList}>
            {stagedChanges.map(file => renderFileItem(file, true))}
          </ul>
        </div>
      )}

      {/* 未暂存的更改 */}
      {changes.length > 0 && (
        <div>
          <div className={styles.sectionHeader}>
            <span>未暂存的更改</span>
            <Space>
              <Button
                size="small"
                type="link"
                icon={<PlusOutlined />}
                loading={loading === '__all__'}
                onClick={handleStageAll}
              >
                暂存全部
              </Button>
              <span className={styles.sectionCount}>{changes.length}</span>
            </Space>
          </div>
          <ul className={styles.fileList}>{changes.map(file => renderFileItem(file, false))}</ul>
        </div>
      )}

      {/* 差异查看器 */}
      {selectedFile && currentDiff && (
        <div style={{ height: '40%', borderTop: '1px solid var(--ant-color-border-secondary)' }}>
          <DiffViewer diff={currentDiff} />
        </div>
      )}
    </div>
  )
}

export default ChangesList
