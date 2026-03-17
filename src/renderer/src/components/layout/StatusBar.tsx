import { useState, useEffect } from 'react'
import styles from './StatusBar.module.css'

interface StatusBarState {
  line: number
  column: number
  wordCount: number
  charCount: number
  encoding: string
  lineEnding: string
  language: string
  saveStatus: 'saved' | 'saving' | 'modified'
}

function StatusBar(): JSX.Element {
  const [status, setStatus] = useState<StatusBarState>({
    line: 1,
    column: 1,
    wordCount: 0,
    charCount: 0,
    encoding: 'UTF-8',
    lineEnding: 'LF',
    language: 'Markdown',
    saveStatus: 'saved'
  })

  // TODO: 监听编辑器状态变化
  useEffect(() => {
    // 订阅编辑器事件
  }, [])

  const getSaveStatusText = (): string => {
    switch (status.saveStatus) {
      case 'saving':
        return '保存中...'
      case 'modified':
        return '已修改'
      default:
        return '已保存'
    }
  }

  return (
    <div className={styles.statusBar}>
      <div className={styles.left}>
        <span className={styles.item}>七海小说助手</span>
        <span className={styles.separator}>|</span>
        <span className={styles.item}>{getSaveStatusText()}</span>
      </div>
      <div className={styles.right}>
        <span className={styles.item}>
          行 {status.line}, 列 {status.column}
        </span>
        <span className={styles.separator}>|</span>
        <span className={styles.item}>
          字数: {status.wordCount.toLocaleString()}
        </span>
        <span className={styles.separator}>|</span>
        <span className={styles.item}>{status.encoding}</span>
        <span className={styles.separator}>|</span>
        <span className={styles.item}>{status.lineEnding}</span>
        <span className={styles.separator}>|</span>
        <span className={styles.item}>{status.language}</span>
      </div>
    </div>
  )
}

export default StatusBar