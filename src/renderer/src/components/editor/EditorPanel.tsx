/**
 * 编辑器面板组件
 * 整合标签页、工具栏、编辑器和预览
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { Empty, message, Spin } from 'antd'
import { EditorTabs } from './EditorTabs'
import { MarkdownEditor } from './MarkdownEditor'
import { useEditorStore } from '@stores/editorStore'
import styles from './EditorPanel.module.css'

export function EditorPanel() {
  const {
    tabs,
    activeTabId,
    settings,
    saveFileContent,
    isSaving,
    isLoading,
    getCurrentContent,
    markDirty
  } = useEditorStore()

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
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

  // 内容变更回调
  const handleChange = useCallback(() => {
    // 标记为已修改
    if (activeTab && !activeTab.isDirty) {
      markDirty(activeTab.id, true)
    }

    // 自动保存
    if (settings.autoSaveInterval > 0) {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
      saveTimeoutRef.current = setTimeout(() => {
        handleSave()
      }, settings.autoSaveInterval)
    }
  }, [activeTab, settings.autoSaveInterval, markDirty, handleSave])

  // 清理
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [])

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
            <MarkdownEditor
              onChange={handleChange}
              onSave={handleSave}
              readonly={false}
            />
          </div>
        )}
      </div>

      {/* 状态栏 */}
      <div className={styles.statusBar}>
        <div className={styles.statusLeft}>
          <span>{activeTab?.name}</span>
          {activeTab?.isDirty && <span className={styles.dirty}>● 已修改</span>}
        </div>
        <div className={styles.statusRight}>
          <span>
            {settings.viewMode === 'wysiwyg' ? '实时预览' : '分栏预览'}
          </span>
          {isSaving && <span>保存中...</span>}
        </div>
      </div>
    </div>
  )
}

export default EditorPanel