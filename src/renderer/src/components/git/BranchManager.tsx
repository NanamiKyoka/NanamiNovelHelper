/**
 * 分支管理组件
 */

import { useEffect, useState } from 'react'
import { Button, Empty, Modal, Input, Space, Tag, Tooltip, Dropdown, App, Spin } from 'antd'
import {
  PlusOutlined,
  BranchesOutlined,
  CheckOutlined,
  SyncOutlined,
  DeleteOutlined,
  MergeCellsOutlined,
  MoreOutlined,
  SwapOutlined
} from '@ant-design/icons'
import { useGitStore } from '@stores/gitStore'
import type { GitBranch } from '@shared/git'
import type { MenuProps } from 'antd'
import styles from './GitPanel.module.css'

const { confirm } = Modal

function BranchManager(): JSX.Element {
  const { message } = App.useApp()
  const {
    branches,
    loading,
    currentBranch,
    getBranches,
    createBranch,
    deleteBranch,
    checkout,
    merge,
    repository
  } = useGitStore()

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newBranchName, setNewBranchName] = useState('')
  const [creating, setCreating] = useState(false)
  const [loadingAction, setLoadingAction] = useState<string | null>(null)

  // 加载分支列表
  useEffect(() => {
    getBranches()
  }, [getBranches])

  // 创建分支
  const handleCreateBranch = async () => {
    if (!newBranchName.trim()) {
      message.warning('请输入分支名称')
      return
    }

    // 验证分支名称
    const branchNameRegex = /^[a-zA-Z0-9/_-]+$/
    if (!branchNameRegex.test(newBranchName.trim())) {
      message.error('分支名称只能包含字母、数字、下划线、连字符和斜杠')
      return
    }

    setCreating(true)
    try {
      const success = await createBranch(newBranchName.trim())
      if (success) {
        message.success(`分支 "${newBranchName}" 创建成功`)
        setShowCreateModal(false)
        setNewBranchName('')
      }
    } finally {
      setCreating(false)
    }
  }

  // 切换分支
  const handleCheckout = (branch: GitBranch) => {
    if (branch.current) {
      return
    }

    // 检查是否有未提交的更改
    if (repository?.hasChanges || repository?.hasStagedChanges) {
      confirm({
        title: '有未提交的更改',
        content: '您有未提交的更改，切换分支可能会丢失这些更改。是否继续？',
        okText: '继续切换',
        cancelText: '取消',
        onOk: async () => {
          setLoadingAction(branch.name)
          try {
            const success = await checkout({ target: branch.name })
            if (success) {
              message.success(`已切换到分支 "${branch.name}"`)
            }
          } finally {
            setLoadingAction(null)
          }
        }
      })
    } else {
      confirm({
        title: '切换分支',
        content: `确定要切换到分支 "${branch.name}" 吗？`,
        okText: '切换',
        cancelText: '取消',
        onOk: async () => {
          setLoadingAction(branch.name)
          try {
            const success = await checkout({ target: branch.name })
            if (success) {
              message.success(`已切换到分支 "${branch.name}"`)
            }
          } finally {
            setLoadingAction(null)
          }
        }
      })
    }
  }

  // 删除分支
  const handleDeleteBranch = (branch: GitBranch) => {
    if (branch.current) {
      message.warning('无法删除当前分支')
      return
    }

    confirm({
      title: '删除分支',
      content: `确定要删除分支 "${branch.name}" 吗？此操作不可恢复。`,
      okText: '删除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        setLoadingAction(branch.name)
        try {
          const success = await deleteBranch(branch.name)
          if (success) {
            message.success(`分支 "${branch.name}" 已删除`)
          }
        } finally {
          setLoadingAction(null)
        }
      }
    })
  }

  // 合并分支
  const handleMergeBranch = (branch: GitBranch) => {
    if (branch.current) {
      message.warning('无法合并当前分支')
      return
    }

    confirm({
      title: '合并分支',
      content: `将分支 "${branch.name}" 合并到当前分支 "${currentBranch}"？`,
      okText: '合并',
      cancelText: '取消',
      onOk: async () => {
        setLoadingAction(branch.name)
        try {
          const success = await merge({ branch: branch.name })
          if (success) {
            message.success(`分支 "${branch.name}" 已合并`)
          }
        } finally {
          setLoadingAction(null)
        }
      }
    })
  }

  // 分支操作菜单
  const getBranchMenuItems = (branch: GitBranch): MenuProps['items'] => [
    {
      key: 'checkout',
      label: '切换到此分支',
      icon: <SwapOutlined />,
      disabled: branch.current,
      onClick: () => handleCheckout(branch)
    },
    {
      key: 'merge',
      label: '合并到当前分支',
      icon: <MergeCellsOutlined />,
      disabled: branch.current,
      onClick: () => handleMergeBranch(branch)
    },
    {
      type: 'divider'
    },
    {
      key: 'delete',
      label: '删除分支',
      icon: <DeleteOutlined />,
      danger: true,
      disabled: branch.current,
      onClick: () => handleDeleteBranch(branch)
    }
  ]

  // 分离本地和远程分支
  const localBranches = branches.filter(b => !b.remote)
  const remoteBranches = branches.filter(b => b.remote)

  if (loading && branches.length === 0) {
    return (
      <div className={styles.noChanges}>
        <Spin tip="加载分支列表..." />
      </div>
    )
  }

  return (
    <div className={styles.changesSection}>
      {/* 工具栏 */}
      <div className={styles.toolbar}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowCreateModal(true)}>
          新建分支
        </Button>
        <Tooltip title="刷新">
          <Button
            icon={<SyncOutlined spin={loading} />}
            onClick={() => getBranches()}
            loading={loading}
          />
        </Tooltip>
      </div>

      {/* 本地分支 */}
      {localBranches.length > 0 && (
        <div>
          <div className={styles.sectionHeader}>
            <BranchesOutlined style={{ marginRight: 8 }} />
            本地分支
            <span className={styles.sectionCount}>{localBranches.length}</span>
          </div>
          <ul className={styles.branchList}>
            {localBranches.map(branch => (
              <Dropdown
                key={branch.name}
                menu={{ items: getBranchMenuItems(branch) }}
                trigger={['contextMenu']}
              >
                <li
                  className={`${styles.branchItem} ${branch.current ? styles.current : ''}`}
                  onClick={() => !branch.current && handleCheckout(branch)}
                >
                  {branch.current && (
                    <CheckOutlined style={{ marginRight: 8, color: 'var(--ant-color-primary)' }} />
                  )}
                  <span className={styles.branchName}>{branch.name}</span>
                  {branch.ahead !== undefined &&
                    branch.behind !== undefined &&
                    (branch.ahead > 0 || branch.behind > 0) && (
                      <span className={styles.branchStatus}>
                        {branch.ahead > 0 && <Tag color="blue">领先 {branch.ahead}</Tag>}
                        {branch.behind > 0 && <Tag color="orange">落后 {branch.behind}</Tag>}
                      </span>
                    )}
                  <Dropdown menu={{ items: getBranchMenuItems(branch) }} trigger={['click']}>
                    <Button
                      size="small"
                      type="text"
                      icon={<MoreOutlined />}
                      loading={loadingAction === branch.name}
                      onClick={e => e.stopPropagation()}
                    />
                  </Dropdown>
                </li>
              </Dropdown>
            ))}
          </ul>
        </div>
      )}

      {/* 远程分支 */}
      {remoteBranches.length > 0 && (
        <div>
          <div className={styles.sectionHeader}>
            <BranchesOutlined style={{ marginRight: 8 }} />
            远程分支
            <span className={styles.sectionCount}>{remoteBranches.length}</span>
          </div>
          <ul className={styles.branchList}>
            {remoteBranches.map(branch => (
              <li key={branch.name} className={styles.branchItem}>
                <span
                  className={styles.branchName}
                  style={{ color: 'var(--ant-color-text-secondary)' }}
                >
                  {branch.name}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 空状态 */}
      {branches.length === 0 && (
        <div className={styles.noChanges}>
          <Empty description="没有分支" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        </div>
      )}

      {/* 创建分支弹窗 */}
      <Modal
        title="创建新分支"
        open={showCreateModal}
        onOk={handleCreateBranch}
        onCancel={() => {
          setShowCreateModal(false)
          setNewBranchName('')
        }}
        confirmLoading={creating}
        okText="创建"
        cancelText="取消"
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <div>
            <span style={{ marginRight: 8 }}>基于当前分支:</span>
            <Tag color="blue">{currentBranch || 'HEAD'}</Tag>
          </div>
          <Input
            placeholder="输入新分支名称"
            value={newBranchName}
            onChange={e => setNewBranchName(e.target.value)}
            onPressEnter={handleCreateBranch}
            autoFocus
          />
          <p style={{ fontSize: 12, color: 'var(--ant-color-text-secondary)' }}>
            分支名称只能包含字母、数字、下划线、连字符和斜杠
          </p>
        </Space>
      </Modal>
    </div>
  )
}

export default BranchManager
