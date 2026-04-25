/**
 * 差异查看器组件
 */

import { Empty, Button, Tooltip } from 'antd'
import { CloseOutlined, CopyOutlined } from '@ant-design/icons'
import { message } from 'antd'
import type { GitFileDiff } from '@shared/git'
import styles from './GitPanel.module.css'

interface DiffViewerProps {
  diff: GitFileDiff
  onClose?: () => void
}

function DiffViewer({ diff, onClose }: DiffViewerProps): JSX.Element {
  // 复制差异内容
  const handleCopy = () => {
    const content = diff.hunks
      .map((hunk) => {
        const lines = hunk.lines
          .map((line) => {
            const prefix = line.type === 'add' ? '+' : line.type === 'delete' ? '-' : ' '
            return `${prefix}${line.content}`
          })
          .join('\n')
        return `@@ ${hunk.header} @@\n${lines}`
      })
      .join('\n')

    navigator.clipboard.writeText(content)
    message.success('已复制到剪贴板')
  }

  // 二进制文件
  if (diff.binary) {
    return (
      <div className={styles.diffContainer}>
        <div className={styles.diffHeader}>
          <span>{diff.path}</span>
          <div>
            {onClose && (
              <Tooltip title="关闭">
                <Button size="small" type="text" icon={<CloseOutlined />} onClick={onClose} />
              </Tooltip>
            )}
          </div>
        </div>
        <div className={styles.noChanges}>
          <Empty description="二进制文件无法显示差异" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        </div>
      </div>
    )
  }

  // 没有差异
  if (diff.hunks.length === 0) {
    return (
      <div className={styles.diffContainer}>
        <div className={styles.diffHeader}>
          <span>{diff.path}</span>
          <div>
            <Tooltip title="复制差异">
              <Button size="small" type="text" icon={<CopyOutlined />} onClick={handleCopy} />
            </Tooltip>
            {onClose && (
              <Tooltip title="关闭">
                <Button size="small" type="text" icon={<CloseOutlined />} onClick={onClose} />
              </Tooltip>
            )}
          </div>
        </div>
        <div className={styles.noChanges}>
          <Empty description="没有差异" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        </div>
      </div>
    )
  }

  return (
    <div className={styles.diffContainer}>
      <div className={styles.diffHeader}>
        <span title={diff.path}>
          {diff.status === 'renamed' && diff.oldPath && (
            <span style={{ color: 'var(--ant-color-text-secondary)' }}>
              {diff.oldPath} →{' '}
            </span>
          )}
          {diff.path}
        </span>
        <div style={{ display: 'flex', gap: 8 }}>
          <span style={{ fontSize: 12, color: 'var(--ant-color-text-secondary)' }}>
            <span style={{ color: 'var(--color-success)' }}>+{diff.additions}</span>
            {' / '}
            <span style={{ color: 'var(--color-error)' }}>-{diff.deletions}</span>
          </span>
          <Tooltip title="复制差异">
            <Button size="small" type="text" icon={<CopyOutlined />} onClick={handleCopy} />
          </Tooltip>
          {onClose && (
            <Tooltip title="关闭">
              <Button size="small" type="text" icon={<CloseOutlined />} onClick={onClose} />
            </Tooltip>
          )}
        </div>
      </div>
      <div className={styles.diffContent}>
        {diff.hunks.map((hunk, hunkIndex) => (
          <div key={hunkIndex} className={styles.hunk}>
            <div className={styles.hunkHeader}>{hunk.header}</div>
            {hunk.lines.map((line, lineIndex) => (
              <div
                key={lineIndex}
                className={`${styles.diffLine} ${styles[line.type]}`}
              >
                <span className={styles.lineNumber}>
                  {line.oldLineNumber || ''}
                </span>
                <span className={styles.lineNumber}>
                  {line.newLineNumber || ''}
                </span>
                <span className={styles.lineContent}>
                  <span className={styles.linePrefix}>
                    {line.type === 'add' ? '+' : line.type === 'delete' ? '-' : ' '}
                  </span>
                  {line.content}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export default DiffViewer
