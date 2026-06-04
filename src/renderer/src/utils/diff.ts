/**
 * 文本差异工具函数
 * 将两段文本对比并转换为 GitFileDiff 格式
 */

import { diffLines } from 'diff'
import type { GitFileDiff, GitDiffHunk, GitDiffLine } from '@shared/git'

/**
 * 将 oldText 和 newText 的差异转换为 GitFileDiff 格式
 */
export function textToGitDiff(path: string, oldText: string, newText: string): GitFileDiff {
  const changes = diffLines(oldText, newText)

  const lines: GitDiffLine[] = []
  let oldLineNumber = 1
  let newLineNumber = 1
  let additions = 0
  let deletions = 0

  for (const change of changes) {
    // diffLines 返回的 value 以换行符结尾，split 后最后一个元素为空字符串
    const changeLines = change.value.split('\n')
    if (changeLines.length > 0 && changeLines[changeLines.length - 1] === '') {
      changeLines.pop()
    }

    for (const line of changeLines) {
      if (change.added) {
        lines.push({ type: 'add', content: line, newLineNumber: newLineNumber++ })
        additions++
      } else if (change.removed) {
        lines.push({ type: 'delete', content: line, oldLineNumber: oldLineNumber++ })
        deletions++
      } else {
        lines.push({
          type: 'context',
          content: line,
          oldLineNumber: oldLineNumber++,
          newLineNumber: newLineNumber++
        })
      }
    }
  }

  // 将连续的行分组为 hunks（每 50 行一个 hunk，避免过大）
  const hunks: GitDiffHunk[] = []
  const HUNK_SIZE = 50
  for (let i = 0; i < lines.length; i += HUNK_SIZE) {
    const hunkLines = lines.slice(i, i + HUNK_SIZE)
    const oldCount = hunkLines.filter(l => l.type === 'delete' || l.type === 'context').length
    const newCount = hunkLines.filter(l => l.type === 'add' || l.type === 'context').length
    const startOld = hunkLines[0].oldLineNumber ?? 1
    const startNew = hunkLines[0].newLineNumber ?? 1

    hunks.push({
      oldStart: startOld,
      oldLines: oldCount,
      newStart: startNew,
      newLines: newCount,
      header: `@@ -${startOld},${oldCount} +${startNew},${newCount} @@`,
      lines: hunkLines
    })
  }

  return {
    path,
    status: 'modified',
    binary: false,
    hunks,
    additions,
    deletions
  }
}
