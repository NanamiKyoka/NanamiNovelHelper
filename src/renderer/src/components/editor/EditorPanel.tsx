/**
 * 编辑器面板组件
 * 整合标签页、工具栏、编辑器和预览
 */

import { useCallback } from 'react'
import { Empty, message, Spin } from 'antd'
import { EditorTabs } from './EditorTabs'
import { NovelEditor } from './NovelEditor'
import { useEditorStore } from '@stores/editorStore'
import styles from './EditorPanel.module.css'

export function EditorPanel() {
  const {
    tabs,
    activeTabId,
    saveFileContent,
    isLoading,
    getCurrentContent,
    markDirty
  } = useEditorStore()

  const activeTab = tabs.find(tab => tab.id === activeTabId)

  // 保存文件
  const handleSave = useCallback(async () => {
    if (!activeTab) return

    try {
      const content = getCurrentContent()
      await saveFileContent(activeTab.path, content)
      message.success('保存成功')
      markDirty(activeTab.id, false)
    } catch (error) {
      message.error('保存失败')
      console.error('Save error:', error)
    }
  }, [activeTab, saveFileContent, getCurrentContent, markDirty])

  // 内容变更回调（仅标记为已修改，自动保存在 NovelEditor 中处理）
  const handleChange = useCallback(() => {
    if (activeTab && !activeTab.isDirty) {
      markDirty(activeTab.id, true)
    }
  }, [activeTab, markDirty])

  // 没有打开的文件
  if (tabs.length === 0) {
    return (
      <div className={styles.emptyState}>
        <Empty
          description={
            <span>
              没有打开的文件
              <br />
              从左侧文件树选择文件开始编辑
            </span>
          }
        />
      </div>
    )
  }

  return (
    <div className={styles.panel}>
      {/* 标签栏 */}
      <EditorTabs />

      {/* 编辑器区域 */}
      <div className={styles.editorArea}>
        {isLoading ? (
          <div className={styles.loading}>
            <Spin tip="加载中..." />
          </div>
        ) : (
          <div className={styles.editorWrapper}>
            <NovelEditor
              onChange={handleChange}
              onSave={handleSave}
              readonly={false}
            />
          </div>
        )}
      </div>
    </div>
  )
}

export default EditorPanel