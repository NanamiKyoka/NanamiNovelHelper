/**
 * 提交历史组件
 */

import { useEffect, useState } from 'react'
import { Button, Empty, Spin, Tag, Tooltip, Dropdown, Modal, Input, message } from 'antd'
import {
  SyncOutlined,
  UserOutlined,
  ClockCircleOutlined,
  MoreOutlined,
  EyeOutlined
} from '@ant-design/icons'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/zh-cn'
import { useGitStore } from '@stores/gitStore'
import type { GitCommit } from '@types/git'
import type { MenuProps } from 'antd'
import styles from './GitPanel.module.css'

dayjs.extend(relativeTime)
dayjs.locale('zh-cn')

const { confirm } = Modal
const { Search } = Input

function CommitHistory(): JSX.Element {
  const {
    commits,
    loading,
    error,
    getLog,
    reset,
    checkout
  } = useGitStore()

  const [searchKeyword, setSearchKeyword] = useState('')
  const [loadingAction, setLoadingAction] = useState<string | null>(null)

  // 加载提交历史
  useEffect(() => {
    getLog({ maxCount: 100 })
  }, [getLog])

  // 搜索
  const handleSearch = (value: string) => {
    setSearchKeyword(value)
    getLog({ maxCount: 100, search: value || undefined })
  }

  // 重置到某个提交
  const handleReset = (commit: GitCommit, mode: 'soft' | 'mixed' | 'hard') => {
    const modeText = {
      soft: '软重置（保留更改）',
      mixed: '混合重置（取消暂存）',
      hard: '硬重置（丢弃所有更改）'
    }

    confirm({
      title: `确认${modeText[mode]}？`,
      content: (
        <div>
          <p>目标提交: <code>{commit.shortHash}</code></p>
          <p>提交信息: {commit.title}</p>
          {mode === 'hard' && (
            <p style={{ color: 'var(--color-error)' }}>警告：硬重置将永久丢失所有未提交的更改！</p>
          )}
        </div>
      ),
      okText: '确认',
      cancelText: '取消',
      okButtonProps: mode === 'hard' ? { danger: true } : undefined,
      onOk: async () => {
        setLoadingAction(commit.shortHash)
        try {
          const success = await reset({ commit: commit.hash, mode })
          if (success) {
            message.success(`已重置到 ${commit.shortHash}`)
          }
        } finally {
          setLoadingAction(null)
        }
      }
    })
  }

  // 检出到某个提交（查看）
  const handleCheckout = (commit: GitCommit) => {
    confirm({
      title: '检出到此提交？',
      content: (
        <div>
          <p>将进入"游离 HEAD"状态，查看提交 <code>{commit.shortHash}</code> 的代码。</p>
          <p>如需修改，请创建新分支。</p>
        </div>
      ),
      okText: '检出',
      cancelText: '取消',
      onOk: async () => {
        setLoadingAction(commit.shortHash)
        try {
          const success = await checkout({ target: commit.hash })
          if (success) {
            message.success(`已检出 ${commit.shortHash}`)
          }
        } finally {
          setLoadingAction(null)
        }
      }
    })
  }

  // 提交操作菜单
  const getCommitMenuItems = (commit: GitCommit): MenuProps['items'] => [
    {
      key: 'view',
      label: '查看此版本',
      icon: <EyeOutlined />,
      onClick: () => handleCheckout(commit)
    },
    {
      type: 'divider'
    },
    {
      key: 'reset-soft',
      label: '软重置到此处',
      onClick: () => handleReset(commit, 'soft')
    },
    {
      key: 'reset-mixed',
      label: '混合重置到此处',
      onClick: () => handleReset(commit, 'mixed')
    },
    {
      key: 'reset-hard',
      label: '硬重置到此处',
      danger: true,
      onClick: () => handleReset(commit, 'hard')
    }
  ]

  // 格式化时间
  const formatTime = (timestamp: number) => {
    const date = dayjs(timestamp * 1000)
    return date.fromNow()
  }

  // 过滤提交（前端过滤，用于快速响应）
  const filteredCommits = searchKeyword
    ? commits.filter(c =>
        c.title.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        c.hash.includes(searchKeyword) ||
        c.authorName.toLowerCase().includes(searchKeyword.toLowerCase())
      )
    : commits

  if (loading && commits.length === 0) {
    return (
      <div className={styles.noChanges}>
        <Spin tip="加载提交历史..." />
      </div>
    )
  }

  if (error) {
    return (
      <div className={styles.noChanges}>
        <Empty description={error} image={Empty.PRESENTED_IMAGE_SIMPLE}>
          <Button onClick={() => getLog()}>重试</Button>
        </Empty>
      </div>
    )
  }

  return (
    <div className={styles.changesSection}>
      {/* 搜索工具栏 */}
      <div className={styles.toolbar}>
        <Search
          placeholder="搜索提交..."
          allowClear
          onSearch={handleSearch}
          onChange={(e) => setSearchKeyword(e.target.value)}
          className={styles.searchInput}
        />
        <Tooltip title="刷新">
          <Button
            icon={<SyncOutlined spin={loading} />}
            onClick={() => getLog()}
            loading={loading}
          />
        </Tooltip>
      </div>

      {/* 提交列表 */}
      {filteredCommits.length === 0 ? (
        <div className={styles.noChanges}>
          <Empty
            description={searchKeyword ? '没有匹配的提交' : '没有提交历史'}
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        </div>
      ) : (
        <ul className={styles.historyList}>
          {filteredCommits.map((commit) => (
            <Dropdown
              key={commit.hash}
              menu={{ items: getCommitMenuItems(commit) }}
              trigger={['contextMenu']}
            >
              <li className={styles.commitItem}>
                <div className={styles.commitHash}>{commit.shortHash}</div>
                <div className={styles.commitInfo}>
                  <div className={styles.commitTitle}>
                    {commit.title}
                    {/* 显示引用（分支、标签） */}
                    {commit.refs.length > 0 && (
                      <span className={styles.commitRefs}>
                        {commit.refs.map((ref, i) => (
                          <Tag
                            key={i}
                            color={ref.startsWith('tag:') ? 'blue' : 'green'}
                            style={{ marginLeft: 4 }}
                          >
                            {ref.startsWith('tag:') ? ref.replace('tag:', '') : ref}
                          </Tag>
                        ))}
                      </span>
                    )}
                  </div>
                  <div className={styles.commitMeta}>
                    <span>
                      <UserOutlined style={{ marginRight: 4 }} />
                      {commit.authorName}
                    </span>
                    <span>
                      <ClockCircleOutlined style={{ marginRight: 4 }} />
                      {formatTime(commit.timestamp)}
                    </span>
                  </div>
                </div>
                <Dropdown
                  menu={{ items: getCommitMenuItems(commit) }}
                  trigger={['click']}
                >
                  <Button
                    size="small"
                    type="text"
                    icon={<MoreOutlined />}
                    loading={loadingAction === commit.shortHash}
                    onClick={(e) => e.stopPropagation()}
                  />
                </Dropdown>
              </li>
            </Dropdown>
          ))}
        </ul>
      )}
    </div>
  )
}

export default CommitHistory
