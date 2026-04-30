/**
 * 编辑器面板组件
 * 整合标签页、工具栏、编辑器和预览
 */

import { useCallback } from 'react'
import { Empty, message, Spin } from 'antd'
import { EditorTabs } from './EditorTabs'
import { NovelEditor } from './NovelEditor'
import { MarkdownEditor } from './MarkdownEditor'
import DiffViewer from '@components/git/DiffViewer'
import { useEditorStore } from '@stores/editorStore'
import { useGitStore } from '@stores/gitStore'
import styles from './EditorPanel.module.css'

export function EditorPanel() {
  const { tabs, activeTabId, saveFileContent, isLoading, getCurrentContent, markDirty } =
    useEditorStore()

  const activeTab = tabs.find(tab => tab.id === activeTabId)

  const handleSave = useCallback(async () => {
    if (!activeTab) return

    try {
      const content = getCurrentContent()
      await saveFileContent(activeTab.path, content)
      message.success('保存成功')
      markDirty(activeTab.id, false)
      useGitStore.getState().refresh()
    } catch (error) {
      message.error('保存失败')
      console.error('Save error:', error)
    }
  }, [activeTab, saveFileContent, getCurrentContent, markDirty])

  const handleChange = useCallback(() => {
    if (activeTab && !activeTab.isDirty) {
      markDirty(activeTab.id, true)
    }
  }, [activeTab, markDirty])

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

  const isMarkdown = activeTab?.type === 'markdown'
  const isText = activeTab?.type === 'text'
  const isDiff = activeTab?.type === 'diff'

  return (
    <div className={styles.panel}>
      <EditorTabs />

      <div className={styles.editorArea}>
        {isLoading ? (
          <div className={styles.loading}>
            <Spin tip="加载中..." />
          </div>
        ) : (
          <div className={styles.editorWrapper}>
            {isDiff && activeTab?.diffData ? (
              <DiffViewer
                diff={activeTab.diffData}
                onClose={() => {
                  if (activeTabId) {
                    useEditorStore.getState().closeTab(activeTabId)
                  }
                }}
              />
            ) : isMarkdown || isText ? (
              <MarkdownEditor
                onChange={handleChange}
                onSave={handleSave}
                readonly={false}
                plainText={isText}
              />
            ) : (
              <NovelEditor onChange={handleChange} onSave={handleSave} readonly={false} />
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default EditorPanel
