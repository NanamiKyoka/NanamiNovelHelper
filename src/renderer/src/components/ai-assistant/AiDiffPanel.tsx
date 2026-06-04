import { useMemo } from 'react'
import { Button, Space, Typography } from 'antd'
import { CheckOutlined, CloseOutlined } from '@ant-design/icons'
import { diffWords } from 'diff'
import styles from './AiDiffPanel.module.css'

interface AiDiffPanelProps {
  originalText: string
  modifiedText: string
  onAccept: () => void
  onReject: () => void
}

interface DiffPart {
  value: string
  added?: boolean
  removed?: boolean
}

function AiDiffPanel({ originalText, modifiedText, onAccept, onReject }: AiDiffPanelProps): JSX.Element {
  const diffParts = useMemo<DiffPart[]>(() => {
    return diffWords(originalText, modifiedText)
  }, [originalText, modifiedText])

  const stats = useMemo(() => {
    let added = 0
    let deleted = 0
    for (const part of diffParts) {
      if (part.added) added += part.value.length
      else if (part.removed) deleted += part.value.length
    }
    return { added, deleted }
  }, [diffParts])

  return (
    <div className={styles.diffPanel}>
      <div className={styles.diffHeader}>
        <Typography.Text strong>修改对比</Typography.Text>
        <Space className={styles.diffStats}>
          <span className={styles.diffAdded}>+{stats.added} 字符</span>
          <span className={styles.diffDeleted}>-{stats.deleted} 字符</span>
        </Space>
      </div>
      <div className={styles.diffContent}>
        {diffParts.map((part, index) => {
          if (part.added) {
            return (
              <span key={index} className={styles.diffAdd}>
                {part.value}
              </span>
            )
          }
          if (part.removed) {
            return (
              <span key={index} className={styles.diffDelete}>
                {part.value}
              </span>
            )
          }
          return <span key={index}>{part.value}</span>
        })}
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
