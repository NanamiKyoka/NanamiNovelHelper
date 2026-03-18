/**
 * Git 面板主组件
 */

import { useEffect, useState } from 'react'
import { Button, Input, Tabs, Modal, message, Dropdown, Empty, Spin, Space, Typography } from 'antd'
import {
  BranchesOutlined,
  PlusOutlined,
  SyncOutlined,
  HistoryOutlined,
  FileAddOutlined,
  SettingOutlined,
  CheckOutlined,
  CloseOutlined
} from '@ant-design/icons'
import { useGitStore } from '@stores/gitStore'
import { useProjectStore } from '@stores/projectStore'
import ChangesList from './ChangesList'
import CommitHistory from './CommitHistory'
import BranchManager from './BranchManager'
import DiffViewer from './DiffViewer'
import type { MenuProps } from 'antd'
import styles from './GitPanel.module.css'

const { TextArea } = Input
const { Text } = Typography

function GitPanel(): JSX.Element {
  const {
    initialized,
    isRepo,
    loading,
    error,
    repository,
    viewMode,
    setViewMode,
    init,
    refresh,
    commit,
    addAll
  } = useGitStore()

  const { currentProject } = useProjectStore()
  const [commitMessage, setCommitMessage] = useState('')
  const [committing, setCommitting] = useState(false)
  const [showInitModal, setShowInitModal] = useState(false)
  const [initing, setIniting] = useState(false)

  // 初始化
  useEffect(() => {
    if (currentProject?.path && !initialized) {
      init()
    }
  }, [currentProject?.path, initialized, init])

  // 项目切换时重新初始化
  useEffect(() => {
    if (currentProject?.path) {
      init()
    }
  }, [currentProject?.path])

  // 初始化仓库
  const handleInitRepo = async () => {
    if (!currentProject?.path) return

    setIniting(true)
    try {
      const result = await window.electron.git.init({
        path: currentProject.path,
        defaultBranch: 'main',
        initialCommit: '初始化项目'
      })
      if (result.success) {
        message.success('Git 仓库初始化成功')
        setShowInitModal(false)
        init()
      } else {
        message.error(result.error || '初始化失败')
      }
    } catch (err) {
      message.error(String(err))
    } finally {
      setIniting(false)
    }
  }

  // 提交
  const handleCommit = async () => {
    if (!commitMessage.trim()) {
      message.warning('请输入提交消息')
      return
    }

    setCommitting(true)
    try {
      // 先添加所有更改
      await addAll()
      // 然后提交
      const success = await commit({ message: commitMessage.trim() })
      if (success) {
        message.success('提交成功')
        setCommitMessage('')
      }
    } finally {
      setCommitting(false)
    }
  }

  // 刷新
  const handleRefresh = () => {
    refresh()
  }

  // 切换视图的下拉菜单
  const viewMenuItems: MenuProps['items'] = [
    {
      key: 'changes',
      label: '变更',
      icon: <FileAddOutlined />,
      onClick: () => setViewMode('changes')
    },
    {
      key: 'history',
      label: '历史',
      icon: <HistoryOutlined />,
      onClick: () => setViewMode('history')
    },
    {
      key: 'branches',
      label: '分支',
      icon: <BranchesOutlined />,
      onClick: () => setViewMode('branches')
    }
  ]

  // 加载中
  if (loading && !initialized) {
    return (
      <div className={styles.loading}>
        <Spin tip="加载中..." />
      </div>
    )
  }

  // 没有打开项目
  if (!currentProject) {
    return (
      <div className={styles.empty}>
        <Empty description="请先打开项目" />
      </div>
    )
  }

  // 不是 Git 仓库
  if (!isRepo) {
    return (
      <div className={styles.empty}>
        <Empty
          description="当前项目不是 Git 仓库"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        >
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowInitModal(true)}>
            初始化仓库
          </Button>
        </Empty>

        <Modal
          title="初始化 Git 仓库"
          open={showInitModal}
          onOk={handleInitRepo}
          onCancel={() => setShowInitModal(false)}
          confirmLoading={initing}
          okText="初始化"
          cancelText="取消"
        >
          <p>将在项目目录下初始化 Git 仓库：</p>
          <Text code>{currentProject.path}</Text>
          <p style={{ marginTop: 16 }}>这将创建一个初始提交。</p>
        </Modal>
      </div>
    )
  }

  // 错误状态
  if (error) {
    return (
      <div className={styles.error}>
        <Text type="danger">{error}</Text>
        <Button onClick={handleRefresh} icon={<SyncOutlined />}>
          重试
        </Button>
      </div>
    )
  }

  // 计算变更数量
  const changesCount = repository?.changes.length || 0
  const stagedCount = repository?.stagedChanges.length || 0
  const totalChanges = changesCount + stagedCount

  return (
    <div className={styles.panel}>
      {/* 头部 */}
      <div className={styles.header}>
        <div className={styles.branchInfo}>
          <BranchesOutlined />
          <Text className={styles.branchName}>{repository?.branch || 'HEAD'}</Text>
        </div>
        <div className={styles.actions}>
          <Button
            size="small"
            icon={<SyncOutlined spin={loading} />}
            onClick={handleRefresh}
            loading={loading}
            title="刷新"
          />
          <Dropdown menu={{ items: viewMenuItems }} trigger={['click']}>
            <Button size="small" icon={<SettingOutlined />} title="切换视图" />
          </Dropdown>
        </div>
      </div>

      {/* 提交区域 */}
      {viewMode === 'changes' && (
        <div className={styles.commitArea}>
          <TextArea
            placeholder="提交消息..."
            value={commitMessage}
            onChange={(e) => setCommitMessage(e.target.value)}
            rows={3}
            className={styles.commitInput}
          />
          <div className={styles.commitActions}>
            <Text type="secondary">
              {stagedCount > 0 ? `${stagedCount} 个文件已暂存` : '没有文件暂存'}
            </Text>
            <Button
              type="primary"
              icon={<CheckOutlined />}
              onClick={handleCommit}
              loading={committing}
              disabled={totalChanges === 0 || !commitMessage.trim()}
            >
              提交
            </Button>
          </div>
        </div>
      )}

      {/* 标签页切换 */}
      <Tabs
        activeKey={viewMode}
        onChange={(key) => setViewMode(key as typeof viewMode)}
        className={styles.tabs}
        items={[
          {
            key: 'changes',
            label: (
              <span>
                变更
                {totalChanges > 0 && (
                  <span className={styles.badge}>{totalChanges}</span>
                )}
              </span>
            ),
            children: <ChangesList />
          },
          {
            key: 'history',
            label: '历史',
            children: <CommitHistory />
          },
          {
            key: 'branches',
            label: '分支',
            children: <BranchManager />
          }
        ]}
      />
    </div>
  )
}

export default GitPanel
