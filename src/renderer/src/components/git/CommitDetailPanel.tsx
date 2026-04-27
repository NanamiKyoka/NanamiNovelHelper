/**
 * 提交详情面板组件
 */

import { useEffect } from 'react'
import { Button, Spin, Empty, Tag, Tooltip, Drawer } from 'antd'
import {
  CloseOutlined,
  FileOutlined,
  PlusOutlined,
  MinusOutlined,
  SwapOutlined,
  FileAddOutlined,
  DeleteOutlined
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { useGitStore } from '@stores/gitStore'
import type { GitCommit, GitFileChange } from '@shared/git'
import DiffViewer from './DiffViewer'
import styles from './GitPanel.module.css'

interface CommitDetailPanelProps {
  commit: GitCommit
  onClose: () => void
}

function CommitDetailPanel({ commit, onClose }: CommitDetailPanelProps): JSX.Element {
  const {
    commitDetail,
    currentDiff,
    getCommitDetail,
    getCommitFileDiff,
    clearCommitDetail
  } = useGitStore()

  useEffect(() => {
    getCommitDetail(commit)
    return () => {
      clearCommitDetail()
    }
  }, [commit, getCommitDetail, clearCommitDetail])

  const handleFileClick = (file: GitFileChange) => {
    getCommitFileDiff(commit.hash, file.path)
  }

  const getStatusIcon = (status: GitFileChange['status']) => {
    switch (status) {
      case 'added':
        return <FileAddOutlined style={{ color: 'var(--color-success)' }} />
      case 'deleted':
        return <DeleteOutlined style={{ color: 'var(--color-error)' }} />
      case 'modified':
        return <FileOutlined style={{ color: 'var(--color-warning)' }} />
      case 'renamed':
        return <SwapOutlined style={{ color: 'var(--color-info)' }} />
      default:
        return <FileOutlined />
    }
  }

  const getStatusColor = (status: GitFileChange['status']) => {
    switch (status) {
      case 'added':
        return 'success'
      case 'deleted':
        return 'error'
      case 'modified':
        return 'warning'
      case 'renamed':
        return 'processing'
      default:
        return 'default'
    }
  }

  const getStatusText = (status: GitFileChange['status']) => {
    switch (status) {
      case 'added':
        return '新增'
      case 'deleted':
        return '删除'
      case 'modified':
        return '修改'
      case 'renamed':
        return '重命名'
      case 'copied':
        return '复制'
      default:
        return status
    }
  }

  const formatDate = (timestamp: number) => {
    return dayjs(timestamp * 1000).format('YYYY-MM-DD HH:mm:ss')
  }

  const files = commitDetail?.files || []
  const loading = commitDetail?.loading || false

  return (
    <Drawer
      title={`提交详情: ${commit.shortHash}`}
      placement="right"
      width={600}
      onClose={onClose}
      open={true}
      styles={{
        body: { padding: 0, display: 'flex', flexDirection: 'column' }
      }}
      closeIcon={<CloseOutlined />}
    >
      <div className={styles.commitDetailHeader}>
        <div className={styles.commitDetailTitle}>{commit.title}</div>
        {commit.message !== commit.title && (
          <div className={styles.commitDetailMessage}>{commit.message}</div>
        )}
        <div className={styles.commitDetailMeta}>
          <span>作者: {commit.authorName} &lt;{commit.authorEmail}&gt;</span>
          <span>时间: {formatDate(commit.timestamp)}</span>
        </div>
        {commit.refs.length > 0 && (
          <div className={styles.commitDetailRefs}>
            {commit.refs.map((ref, i) => (
              <Tag
                key={i}
                color={ref.startsWith('tag:') ? 'blue' : 'green'}
              >
                {ref.startsWith('tag:') ? ref.replace('tag:', '') : ref}
              </Tag>
            ))}
          </div>
        )}
      </div>

      <div className={styles.commitDetailFiles}>
        <div className={styles.commitDetailFilesHeader}>
          <span>更改的文件 ({files.length})</span>
        </div>
        {loading ? (
          <div className={styles.commitDetailLoading}>
            <Spin tip="加载文件列表..." />
          </div>
        ) : files.length === 0 ? (
          <Empty description="没有文件更改" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <ul className={styles.commitFileList}>
            {files.map((file, index) => (
              <li
                key={`${file.path}-${index}`}
                className={styles.commitFileItem}
                onClick={() => handleFileClick(file)}
              >
                {getStatusIcon(file.status)}
                <span className={styles.commitFilePath}>{file.path}</span>
                <Tag color={getStatusColor(file.status)} style={{ marginLeft: 'auto' }}>
                  {getStatusText(file.status)}
                </Tag>
              </li>
            ))}
          </ul>
        )}
      </div>

      {currentDiff && (
        <div className={styles.commitDetailDiff}>
          <div className={styles.commitDetailDiffHeader}>
            <span>{currentDiff.path}</span>
            <span className={styles.commitDetailDiffStats}>
              <span style={{ color: 'var(--color-success)' }}>
                <PlusOutlined /> {currentDiff.additions}
              </span>
              <span style={{ color: 'var(--color-error)' }}>
                <MinusOutlined /> {currentDiff.deletions}
              </span>
            </span>
          </div>
          <DiffViewer diff={currentDiff} viewMode="unified" />
        </div>
      )}
    </Drawer>
  )
}

export default CommitDetailPanel
