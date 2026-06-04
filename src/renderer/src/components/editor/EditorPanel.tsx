/**
 * 编辑器面板组件
 * 整合标签页、工具栏、编辑器和预览
 */

import { useCallback } from 'react'
import { Empty, App, Spin, Button, Space } from 'antd'
import { CheckOutlined, CloseOutlined } from '@ant-design/icons'
import { EditorTabs } from './EditorTabs'
import { NovelEditor } from './NovelEditor'
import { MarkdownEditor } from './MarkdownEditor'
import DiffViewer from '@components/git/DiffViewer'
import { useEditorStore } from '@stores/editorStore'
import { useGitStore } from '@stores/gitStore'
import styles from './EditorPanel.module.css'

export function EditorPanel() {
  const { message } = App.useApp()
  const {
    tabs, activeTabId, saveFileContent, isLoading, getCurrentContent, markDirty,
    pendingAiEdits, acceptAiEdit, rejectAiEdit
  } = useEditorStore()

  const activeTab = tabs.find(tab => tab.id === activeTabId)
  const isAiEditDiff = activeTab?.type === 'diff' && pendingAiEdits.has(activeTab.path)

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
  }, [activeTab, saveFileContent, getCurrentContent, markDirty, message])

  const handleChange = useCallback(() => {
    if (activeTab && !activeTab.isDirty) {
      markDirty(activeTab.id, true)
    }
  }, [activeTab, markDirty])

  const handleAcceptAiEdit = useCallback(async () => {
    if (!activeTab) return
    try {
      await acceptAiEdit(activeTab.path)
      message.success('已接受修改')
      useGitStore.getState().refresh()
    } catch (_e) {
      message.error('接受修改失败')
    }
  }, [activeTab, acceptAiEdit, message])

  const handleRejectAiEdit = useCallback(() => {
    if (!activeTab) return
    rejectAiEdit(activeTab.path)
    message.info('已拒绝修改')
  }, [activeTab, rejectAiEdit, message])

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

  const editorTypeKey = isDiff ? 'diff' : isMarkdown ? 'markdown' : isText ? 'text' : 'novel'

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
              <>
                {isAiEditDiff && (
                  <div className={styles.aiEditActions}>
                    <Space>
                      <Button
                        type="primary"
                        icon={<CheckOutlined />}
                        onClick={handleAcceptAiEdit}
                      >
                        接受修改
                      </Button>
                      <Button
                        icon={<CloseOutlined />}
                        onClick={handleRejectAiEdit}
                      >
                        拒绝修改
                      </Button>
                    </Space>
                  </div>
                )}
                <DiffViewer
                  key={editorTypeKey}
                  diff={activeTab.diffData}
                  onClose={() => {
                    if (activeTabId) {
                      useEditorStore.getState().closeTab(activeTabId)
                    }
                  }}
                />
              </>
            ) : isMarkdown || isText ? (
              <MarkdownEditor
                key={editorTypeKey}
                onChange={handleChange}
                onSave={handleSave}
                readonly={false}
                plainText={isText}
              />
            ) : (
              <NovelEditor
                key={editorTypeKey}
                onChange={handleChange}
                onSave={handleSave}
                readonly={false}
              />
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default EditorPanel
