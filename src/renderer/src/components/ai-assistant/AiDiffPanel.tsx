import { useMemo } from 'react'
import { Button, Space, Typography } from 'antd'
import { CheckOutlined, CloseOutlined } from '@ant-design/icons'
import { diffLines } from 'diff'
import styles from './AiDiffPanel.module.css'

interface AiDiffPanelProps {
  originalText: string
  modifiedText: string
  onAccept: () => void
  onReject: () => void
}

interface DiffLine {
  type: 'add' | 'delete' | 'context'
  content: string
}

function AiDiffPanel({ originalText, modifiedText, onAccept, onReject }: AiDiffPanelProps): JSX.Element {
  const diffResult = useMemo<DiffLine[]>(() => {
    const changes = diffLines(originalText, modifiedText)
    const lines: DiffLine[] = []

    for (const change of changes) {
      const splitLines = change.value.split('\n')
      // diffLines keeps trailing newline as empty string at end, skip it
      const trimmedLines = splitLines[splitLines.length - 1] === ''
        ? splitLines.slice(0, -1)
        : splitLines

      for (const line of trimmedLines) {
        if (change.added) {
          lines.push({ type: 'add', content: line })
        } else if (change.removed) {
          lines.push({ type: 'delete', content: line })
        } else {
          lines.push({ type: 'context', content: line })
        }
      }
    }

    return lines
  }, [originalText, modifiedText])

  const stats = useMemo(() => {
    let added = 0
    let deleted = 0
    for (const line of diffResult) {
      if (line.type === 'add') added++
      else if (line.type === 'delete') deleted++
    }
    return { added, deleted }
  }, [diffResult])

  return (
    <div className={styles.diffPanel}>
      <div className={styles.diffHeader}>
        <Typography.Text strong>修改对比</Typography.Text>
        <Space className={styles.diffStats}>
          <span className={styles.diffAdded}>+{stats.added} 行</span>
          <span className={styles.diffDeleted}>-{stats.deleted} 行</span>
        </Space>
      </div>
      <div className={styles.diffContent}>
        {diffResult.map((line, index) => (
          <div
            key={index}
            className={`${styles.diffLine} ${
              line.type === 'add'
                ? styles.diffLineAdd
                : line.type === 'delete'
                  ? styles.diffLineDelete
                  : styles.diffLineContext
            }`}
          >
            <span className={styles.diffLinePrefix}>
              {line.type === 'add' ? '+' : line.type === 'delete' ? '-' : ' '}
            </span>
            <span>{line.content}</span>
          </div>
        ))}
      </div>
      <div className={styles.diffFooter}>
        <Button icon={<CloseOutlined />} onClick={onReject}>
          拒绝修改
        </Button>
        <Button type="primary" icon={<CheckOutlined />} onClick={onAccept}>
          接受修改
        </Button>
      </div>
    </div>
  )
}

export default AiDiffPanel
