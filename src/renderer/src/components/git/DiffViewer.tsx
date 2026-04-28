/**
 * 差异查看器组件
 * 支持 unified（统一）和 split（左右对比）两种视图模式
 */

import { useState, useMemo } from 'react'
import { Empty, Button, Tooltip, Segmented, message } from 'antd'
import {
  CloseOutlined,
  CopyOutlined,
  SplitCellsOutlined,
  AlignLeftOutlined
} from '@ant-design/icons'
import type { GitFileDiff, GitDiffLine, GitDiffHunk } from '@shared/git'
import styles from './GitPanel.module.css'

interface DiffViewerProps {
  diff: GitFileDiff
  onClose?: () => void
}

type DiffViewMode = 'unified' | 'split'

function DiffViewer({ diff, onClose }: DiffViewerProps): JSX.Element {
  const [viewMode, setViewMode] = useState<DiffViewMode>('unified')

  const handleCopy = () => {
    const content = diff.hunks
      .map(hunk => {
        const lines = hunk.lines
          .map(line => {
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
        <span className={styles.diffFilePath} title={diff.path}>
          {diff.status === 'renamed' && diff.oldPath && (
            <span style={{ color: 'var(--ant-color-text-secondary)' }}>{diff.oldPath} → </span>
          )}
          {diff.path}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: 'var(--ant-color-text-secondary)' }}>
            <span style={{ color: 'var(--color-success)' }}>+{diff.additions}</span>
            {' / '}
            <span style={{ color: 'var(--color-error)' }}>-{diff.deletions}</span>
          </span>
          <Segmented
            size="small"
            value={viewMode}
            onChange={value => setViewMode(value as DiffViewMode)}
            options={[
              {
                value: 'unified',
                icon: <AlignLeftOutlined />
              },
              {
                value: 'split',
                icon: <SplitCellsOutlined />
              }
            ]}
          />
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
        {viewMode === 'unified' ? (
          <UnifiedDiffView hunks={diff.hunks} />
        ) : (
          <SplitDiffView hunks={diff.hunks} />
        )}
      </div>
    </div>
  )
}

interface UnifiedDiffViewProps {
  hunks: GitDiffHunk[]
}

function UnifiedDiffView({ hunks }: UnifiedDiffViewProps): JSX.Element {
  return (
    <>
      {hunks.map((hunk, hunkIndex) => (
        <div key={hunkIndex} className={styles.hunk}>
          <div className={styles.hunkHeader}>{hunk.header}</div>
          {hunk.lines.map((line, lineIndex) => (
            <div key={lineIndex} className={`${styles.diffLine} ${styles[line.type]}`}>
              <span className={styles.lineNumber}>{line.oldLineNumber ?? ''}</span>
              <span className={styles.lineNumber}>{line.newLineNumber ?? ''}</span>
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
    </>
  )
}

interface SplitDiffViewProps {
  hunks: GitDiffHunk[]
}

function SplitDiffView({ hunks }: SplitDiffViewProps): JSX.Element {
  const { leftLines, rightLines } = useMemo(() => {
    const left: SplitLine[] = []
    const right: SplitLine[] = []

    hunks.forEach((hunk, hunkIndex) => {
      hunk.lines.forEach((line, lineIndex) => {
        const key = `${hunkIndex}-${lineIndex}`
        if (line.type === 'context') {
          left.push({
            key,
            lineNumber: line.oldLineNumber!,
            content: line.content,
            type: 'context'
          })
          right.push({
            key,
            lineNumber: line.newLineNumber!,
            content: line.content,
            type: 'context'
          })
        } else if (line.type === 'delete') {
          left.push({ key, lineNumber: line.oldLineNumber!, content: line.content, type: 'delete' })
        } else if (line.type === 'add') {
          right.push({ key, lineNumber: line.newLineNumber!, content: line.content, type: 'add' })
        }
      })

      const maxLen = Math.max(left.length, right.length)
      while (left.length < maxLen) {
        left.push({
          key: `empty-left-${hunkIndex}-${left.length}`,
          lineNumber: null,
          content: '',
          type: 'empty'
        })
      }
      while (right.length < maxLen) {
        right.push({
          key: `empty-right-${hunkIndex}-${right.length}`,
          lineNumber: null,
          content: '',
          type: 'empty'
        })
      }
    })

    return { leftLines: left, rightLines: right }
  }, [hunks])

  return (
    <div className={styles.splitDiffContainer}>
      <div className={styles.splitDiffSide}>
        <div className={styles.splitDiffHeader}>原始文件</div>
        <div className={styles.splitDiffContent}>
          {leftLines.map(line => (
            <div key={line.key} className={`${styles.splitDiffLine} ${styles[line.type]}`}>
              <span className={styles.splitLineNumber}>{line.lineNumber ?? ''}</span>
              <span className={styles.splitLineContent}>
                {line.type === 'delete' && <span className={styles.linePrefix}>-</span>}
                {line.content}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className={styles.splitDiffDivider} />
      <div className={styles.splitDiffSide}>
        <div className={styles.splitDiffHeader}>新文件</div>
        <div className={styles.splitDiffContent}>
          {rightLines.map(line => (
            <div key={line.key} className={`${styles.splitDiffLine} ${styles[line.type]}`}>
              <span className={styles.splitLineNumber}>{line.lineNumber ?? ''}</span>
              <span className={styles.splitLineContent}>
                {line.type === 'add' && <span className={styles.linePrefix}>+</span>}
                {line.content}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

interface SplitLine {
  key: string
  lineNumber: number | null
  content: string
  type: 'context' | 'add' | 'delete' | 'empty'
}

export default DiffViewer
