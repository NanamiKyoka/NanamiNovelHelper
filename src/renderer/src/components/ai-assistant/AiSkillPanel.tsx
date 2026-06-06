/**
 * AI Skill 管理面板
 */

import { useState, useEffect, useCallback } from 'react'
import { Card, Tag, Switch, Button, Space, Empty, Spin, Tooltip, App, Modal } from 'antd'
import {
  PlusOutlined,
  ReloadOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  ToolOutlined
} from '@ant-design/icons'
import { useAiSkillStore } from '@stores/aiSkillStore'
import type { AiSkill } from '@shared/ai-skill'
import { AiSkillEditor } from './AiSkillEditor'
import styles from './AiSkillPanel.module.css'

function AiSkillPanel(): JSX.Element {
  const { message } = App.useApp()
  const {
    skills,
    isLoading,
    loadSkills,
    deleteSkill,
    ensureBuiltins,
    toggleEnabled
  } = useAiSkillStore()

  const [expandedName, setExpandedName] = useState<string | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingSkill, setEditingSkill] = useState<AiSkill | null>(null)

  useEffect(() => {
    loadSkills()
  }, [loadSkills])

  const handleToggleEnabled = useCallback((skill: AiSkill, checked: boolean) => {
    toggleEnabled(skill.name, checked)
  }, [toggleEnabled])

  const handleDelete = useCallback((skill: AiSkill) => {
    if (skill.isBuiltIn) {
      message.warning('内置 Skill 不允许删除')
      return
    }
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除 Skill "${skill.name}" 吗？此操作不可撤销。`,
      onOk: async () => {
        await deleteSkill(skill.name)
        message.success('已删除')
      }
    })
  }, [deleteSkill, message])

  const handleEdit = useCallback((skill: AiSkill) => {
    setEditingSkill(skill)
    setEditorOpen(true)
  }, [])

  const handleNew = useCallback(() => {
    setEditingSkill(null)
    setEditorOpen(true)
  }, [])

  const handleEditorClose = useCallback(() => {
    setEditorOpen(false)
    setEditingSkill(null)
  }, [])

  const handleEditorSaved = useCallback(() => {
    setEditorOpen(false)
    setEditingSkill(null)
    loadSkills()
  }, [loadSkills])

  const handleEnsureBuiltins = useCallback(async () => {
    await ensureBuiltins()
    message.success('内置 Skill 已刷新')
  }, [ensureBuiltins, message])

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Space>
          <ToolOutlined />
          <span className={styles.headerTitle}>AI Skills</span>
        </Space>
        <Space>
          <Button size="small" icon={<ReloadOutlined />} onClick={handleEnsureBuiltins}>
            刷新内置
          </Button>
          <Button type="primary" size="small" icon={<PlusOutlined />} onClick={handleNew}>
            新建 Skill
          </Button>
        </Space>
      </div>

      <div className={styles.skillList}>
        {isLoading && skills.length === 0 && (
          <div className={styles.loading}>
            <Spin />
          </div>
        )}

        {!isLoading && skills.length === 0 && (
          <Empty description="暂无 Skill" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        )}

        {skills.map(skill => (
          <Card
            key={skill.name}
            size="small"
            className={styles.skillCard}
            title={
              <div className={styles.cardTitle}>
                <span className={styles.cardName}>{skill.name}</span>
                {skill.isBuiltIn && <Tag color="blue">内置</Tag>}
              </div>
            }
            extra={
              <Space>
                <Switch
                  size="small"
                  checked={skill.enabled}
                  onChange={checked => handleToggleEnabled(skill, checked)}
                />
                <Tooltip title="编辑">
                  <Button
                    type="text"
                    size="small"
                    icon={<EditOutlined />}
                    onClick={() => handleEdit(skill)}
                  />
                </Tooltip>
                {!skill.isBuiltIn && (
                  <Tooltip title="删除">
                    <Button
                      type="text"
                      size="small"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => handleDelete(skill)}
                    />
                  </Tooltip>
                )}
                <Tooltip title={expandedName === skill.name ? '收起' : '预览'}>
                  <Button
                    type="text"
                    size="small"
                    icon={expandedName === skill.name ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                    onClick={() =>
                      setExpandedName(prev => (prev === skill.name ? null : skill.name))
                    }
                  />
                </Tooltip>
              </Space>
            }
          >
            <div className={styles.cardDescription}>{skill.description}</div>
            <div className={styles.cardTags}>
              {skill.tags.map(tag => (
                <Tag key={tag} size="small">{tag}</Tag>
              ))}
            </div>
            {expandedName === skill.name && (
              <div className={styles.cardContent}>
                <pre>{skill.content}</pre>
              </div>
            )}
          </Card>
        ))}
      </div>

      <AiSkillEditor
        open={editorOpen}
        skill={editingSkill}
        onClose={handleEditorClose}
        onSaved={handleEditorSaved}
      />
    </div>
  )
}

export default AiSkillPanel