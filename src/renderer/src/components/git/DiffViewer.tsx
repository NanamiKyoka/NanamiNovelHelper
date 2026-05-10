/**
 * 差异查看器组件
 * 支持三种内容模式：渲染（rendered）、源码（source）、纯文本（plaintext）
 * 支持统一（unified）和左右对比（split）两种视图模式（源码和纯文本模式）
 * 渲染模式自动对 HTML/Markdown 内容进行渲染并智能高亮变更
 */

import { useState, useMemo, useEffect } from 'react'
import { Empty, Button, Tooltip, Segmented, App } from 'antd'
import {
  CloseOutlined,
  CopyOutlined,
  SplitCellsOutlined,
  AlignLeftOutlined,
  FileTextOutlined,
  CodeOutlined,
  EyeOutlined
} from '@ant-design/icons'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import type { GitFileDiff, GitDiffHunk } from '@shared/git'
import { stripHtmlTagsInline, isHtmlContent, isMarkdownFile, isRenderableFile } from '@utils/html'
import styles from './GitPanel.module.css'

type ContentMode = 'rendered' | 'source' | 'plaintext'
type DiffViewMode = 'unified' | 'split'

interface DiffViewerProps {
  diff: GitFileDiff
  onClose?: () => void
}

function DiffViewer({ diff, onClose }: DiffViewerProps): JSX.Element {
  const { message } = App.useApp()
  const shouldDetectHtml =
    isRenderableFile(diff.path) ||
    diff.hunks.some(hunk => hunk.lines.some(line => isHtmlContent(line.content)))

  const defaultContentMode: ContentMode = shouldDetectHtml ? 'rendered' : 'source'
  const [contentMode, setContentMode] = useState<ContentMode>(defaultContentMode)
  const [viewMode, setViewMode] = useState<DiffViewMode>('unified')

  useEffect(() => {
    setContentMode(shouldDetectHtml ? 'rendered' : 'source')
  }, [diff.path, shouldDetectHtml])

  const processedHunks = useMemo(() => {
    if (contentMode !== 'plaintext') return diff.hunks
    return diff.hunks.map(hunk => ({
      ...hunk,
      lines: hunk.lines.map(line => ({
        ...line,
        content: stripHtmlTagsInline(line.content)
      }))
    }))
  }, [diff.hunks, contentMode])

  const handleCopy = () => {
    const hunksToCopy = contentMode === 'plaintext' ? processedHunks : diff.hunks
    const content = hunksToCopy
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
          {shouldDetectHtml && (
            <Segmented
              size="small"
              value={contentMode}
              onChange={value => setContentMode(value as ContentMode)}
              options={[
                { value: 'rendered', icon: <EyeOutlined />, title: '渲染' },
                { value: 'source', icon: <CodeOutlined />, title: '源码' },
                { value: 'plaintext', icon: <FileTextOutlined />, title: '纯文本' }
              ]}
            />
          )}
          {contentMode !== 'rendered' && (
            <Segmented
              size="small"
              value={viewMode}
              onChange={value => setViewMode(value as DiffViewMode)}
              options={[
                { value: 'unified', icon: <AlignLeftOutlined /> },
                { value: 'split', icon: <SplitCellsOutlined /> }
              ]}
            />
          )}
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
        {contentMode === 'rendered' ? (
          <RenderedDiffView hunks={diff.hunks} filePath={diff.path} />
        ) : viewMode === 'unified' ? (
          <UnifiedDiffView hunks={processedHunks} />
        ) : (
          <SplitDiffView hunks={processedHunks} />
        )}
      </div>
    </div>
  )
}

interface LineGroup {
  type: 'context' | 'delete' | 'add'
  lines: { content: string; oldLineNumber?: number; newLineNumber?: number }[]
}

function groupConsecutiveLines(lines: GitDiffHunk['lines']): LineGroup[] {
  const groups: LineGroup[] = []
  let currentGroup: LineGroup | null = null

  for (const line of lines) {
    if (currentGroup && currentGroup.type === line.type) {
      currentGroup.lines.push({
        content: line.content,
        oldLineNumber: line.oldLineNumber,
        newLineNumber: line.newLineNumber
      })
    } else {
      if (currentGroup) {
        groups.push(currentGroup)
      }
      currentGroup = {
        type: line.type,
        lines: [
          {
            content: line.content,
            oldLineNumber: line.oldLineNumber,
            newLineNumber: line.newLineNumber
          }
        ]
      }
    }
  }

  if (currentGroup) {
    groups.push(currentGroup)
  }

  return groups
}

function buildRenderedHtml(hunks: GitDiffHunk[], side: 'old' | 'new', isMarkdown: boolean): string {
  const segments: string[] = []

  for (const hunk of hunks) {
    const groups = groupConsecutiveLines(hunk.lines)

    for (const group of groups) {
      const isRelevant =
        (side === 'old' && (group.type === 'context' || group.type === 'delete')) ||
        (side === 'new' && (group.type === 'context' || group.type === 'add'))

      if (!isRelevant) continue

      const rawContent = group.lines.map(l => l.content).join('\n')

      if (group.type === 'context') {
        if (isMarkdown) {
          segments.push(DOMPurify.sanitize(marked.parse(rawContent) as string))
        } else {
          segments.push(DOMPurify.sanitize(rawContent))
        }
      } else {
        const renderedContent = isMarkdown
          ? DOMPurify.sanitize(marked.parse(rawContent) as string)
          : DOMPurify.sanitize(rawContent)
        const cssClass =
          group.type === 'delete' ? 'rendered-diff-block-delete' : 'rendered-diff-block-add'
        segments.push(`<div class="${cssClass}">${renderedContent}</div>`)
      }
    }
  }

  return segments.join('\n')
}

interface RenderedDiffViewProps {
  hunks: GitDiffHunk[]
  filePath: string
}

function RenderedDiffView({ hunks, filePath }: RenderedDiffViewProps): JSX.Element {
  const isMd = isMarkdownFile(filePath)

  const { oldHtml, newHtml } = useMemo(() => {
    return {
      oldHtml: buildRenderedHtml(hunks, 'old', isMd),
      newHtml: buildRenderedHtml(hunks, 'new', isMd)
    }
  }, [hunks, isMd])

  return (
    <div className={styles.renderedDiffContainer}>
      <div className={styles.renderedDiffSide}>
        <div className={styles.renderedDiffHeader}>原始版本</div>
        <div className={styles.renderedDiffContent} dangerouslySetInnerHTML={{ __html: oldHtml }} />
      </div>
      <div className={styles.renderedDiffDivider} />
      <div className={styles.renderedDiffSide}>
        <div className={styles.renderedDiffHeader}>新版本</div>
        <div className={styles.renderedDiffContent} dangerouslySetInnerHTML={{ __html: newHtml }} />
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
