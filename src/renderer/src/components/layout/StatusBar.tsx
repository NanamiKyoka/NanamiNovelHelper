import { useEditorStore } from '@stores/editorStore'
import styles from './StatusBar.module.css'

/**
 * 获取文件类型显示名称
 */
function getFileTypeLabel(type: string): string {
  switch (type) {
    case 'markdown':
      return '富文本'
    case 'text':
      return '纯文本'
    default:
      return '文本'
  }
}

function StatusBar(): JSX.Element {
  // 从 editorStore 获取编辑器状态
  const tabs = useEditorStore((state) => state.tabs)
  const activeTabId = useEditorStore((state) => state.activeTabId)
  const wordCount = useEditorStore((state) => state.wordCount)
  const statusBarConfig = useEditorStore((state) => state.statusBarConfig)
  const isSaving = useEditorStore((state) => state.isSaving)

  // 获取当前活动标签
  const activeTab = tabs.find(tab => tab.id === activeTabId)

  // 格式化数字
  const formatNumber = (num: number): string => num.toLocaleString('zh-CN')

  return (
    <div className={styles.statusBar}>
      <div className={styles.left}>
        <span className={styles.item}>NanamiNovelHelper</span>
        <span className={styles.separator}>|</span>
        {activeTab && (
          <>
            <span className={styles.item}>{activeTab.name}</span>
            {activeTab.isDirty && (
              <>
                <span className={styles.separator}>|</span>
                <span className={`${styles.item} ${styles.modified}`}>已修改</span>
              </>
            )}
            {isSaving && (
              <>
                <span className={styles.separator}>|</span>
                <span className={styles.item}>保存中...</span>
              </>
            )}
          </>
        )}
        {!activeTab && (
          <span className={styles.item}>未打开文件</span>
        )}
      </div>
      <div className={styles.right}>
        {/* 字数统计（总字数 = CJK 字符数 + 英文单词数） */}
        {statusBarConfig.showWordCount && activeTab && wordCount.total > 0 && (
          <>
            <span 
              className={styles.item} 
              title={`字数统计：\n中文 ${formatNumber(wordCount.cjkChars)} 字\n英文 ${formatNumber(wordCount.words)} 词\n总计 ${formatNumber(wordCount.total)} 字`}
            >
              字数 {formatNumber(wordCount.total)}
            </span>
            <span className={styles.separator}>|</span>
          </>
        )}
        {/* 字符数（非空白非标点） */}
        {statusBarConfig.showCharacterCount && activeTab && wordCount.nonWSNoPunct > 0 && (
          <>
            <span 
              className={styles.item} 
              title={`字符统计：\n非空白字符 ${formatNumber(wordCount.nonWSChars)}\n非空白非标点 ${formatNumber(wordCount.nonWSNoPunct)}`}
            >
              字符 {formatNumber(wordCount.nonWSNoPunct)}
            </span>
            <span className={styles.separator}>|</span>
          </>
        )}
        {/* 编码 */}
        {statusBarConfig.showEncoding && (
          <>
            <span className={styles.item}>UTF-8</span>
            <span className={styles.separator}>|</span>
          </>
        )}
        {/* 文件类型 */}
        {statusBarConfig.showFileType && activeTab && (
          <span className={styles.item}>
            {getFileTypeLabel(activeTab.type)}
          </span>
        )}
      </div>
    </div>
  )
}

export default StatusBar