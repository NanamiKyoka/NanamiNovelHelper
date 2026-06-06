/**
 * AI Skill 编辑器（Modal 形式）
 */

import { useState, useEffect, useCallback } from 'react'
import { Modal, Form, Input, Button, Space, App } from 'antd'
import { SaveOutlined, CloseOutlined } from '@ant-design/icons'
import { useAiSkillStore } from '@stores/aiSkillStore'
import type { AiSkill } from '@shared/ai-skill'

interface AiSkillEditorProps {
  open: boolean
  skill: AiSkill | null
  onClose: () => void
  onSaved: () => void
}

const { TextArea } = Input

export function AiSkillEditor({ open, skill, onClose, onSaved }: AiSkillEditorProps): JSX.Element {
  const { message } = App.useApp()
  const { saveSkill } = useAiSkillStore()
  const [form] = Form.useForm()
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      if (skill) {
        form.setFieldsValue({
          name: skill.name,
          description: skill.description,
          tags: skill.tags.join(', '),
          content: skill.content
        })
      } else {
        form.resetFields()
      }
    }
  }, [open, skill, form])

  const handleSave = useCallback(async () => {
    try {
      const values = await form.validateFields()
      setSaving(true)

      const tags = values.tags
        ? values.tags.split(',').map((t: string) => t.trim()).filter((t: string) => t)
        : []

      const result = await saveSkill({
        name: values.name.trim(),
        description: values.description.trim(),
        tags,
        content: values.content
      })

      if (result) {
        message.success('保存成功')
        onSaved()
      } else {
        message.error('保存失败')
      }
    } catch (error) {
      if (error instanceof Error) {
        message.error(error.message)
      }
    } finally {
      setSaving(false)
    }
  }, [form, saveSkill, message, onSaved])

  const isEdit = !!skill
  const nameDisabled = isEdit && skill?.isBuiltIn

  return (
    <Modal
      open={open}
      title={isEdit ? `编辑 Skill: ${skill?.name}` : '新建 Skill'}
      onCancel={onClose}
      width={720}
      footer={
        <Space>
          <Button icon={<CloseOutlined />} onClick={onClose}>
            取消
          </Button>
          <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={handleSave}>
            保存
          </Button>
        </Space>
      }
    >
      <Form form={form} layout="vertical" style={{ marginTop: 12 }}>
        <Form.Item
          name="name"
          label="名称（唯一标识，英文，作为文件名）"
          rules={[{ required: true, message: '请输入 Skill 名称' }]}
        >
          <Input placeholder="例如: dialogue-polish" disabled={nameDisabled} />
        </Form.Item>

        <Form.Item
          name="description"
          label="描述（用于匹配用户意图）"
          rules={[{ required: true, message: '请输入描述' }]}
        >
          <Input placeholder="简短描述此 Skill 的用途" />
        </Form.Item>

        <Form.Item name="tags" label="标签（逗号分隔）">
          <Input placeholder="例如: polish, dialogue, character" />
        </Form.Item>

        <Form.Item
          name="content"
          label="内容（Markdown）"
          rules={[{ required: true, message: '请输入内容' }]}
        >
          <TextArea
            placeholder="在此编写 Skill 的 Markdown 内容..."
            autoSize={{ minRows: 10, maxRows: 20 }}
          />
        </Form.Item>
      </Form>
    </Modal>
  )
}

export default AiSkillEditor