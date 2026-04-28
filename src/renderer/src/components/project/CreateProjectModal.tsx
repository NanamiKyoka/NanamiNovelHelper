/**
 * 项目创建对话框
 */

import { useState, useCallback } from 'react'
import { Modal, Form, Input, Button, message } from 'antd'
import { FolderOpenOutlined } from '@ant-design/icons'
import { useProjectActions } from '@hooks/useProjectActions'
import type { CreateProjectOptions } from '@shared/project'

interface CreateProjectModalProps {
  open: boolean
  onCancel: () => void
  onSuccess?: () => void
}

interface FormValues {
  name: string
  parentPath: string
  description?: string
  author?: string
}

function CreateProjectModal({ open, onCancel, onSuccess }: CreateProjectModalProps): JSX.Element {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)

  const { createProject, showCreateDialog } = useProjectActions()

  const handleSelectPath = useCallback(async () => {
    const path = await showCreateDialog()
    if (path) {
      form.setFieldValue('parentPath', path)
    }
  }, [form, showCreateDialog])

  const handleSubmit = useCallback(
    async (values: FormValues) => {
      setLoading(true)
      try {
        const options: CreateProjectOptions = {
          name: values.name.trim(),
          parentPath: values.parentPath,
          description: values.description?.trim(),
          author: values.author?.trim()
        }

        await createProject(options)
        message.success('项目创建成功')
        form.resetFields()
        onSuccess?.()
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '创建项目失败'
        message.error(errorMessage)
      } finally {
        setLoading(false)
      }
    },
    [createProject, form, onSuccess]
  )

  const handleCancel = useCallback(() => {
    form.resetFields()
    onCancel()
  }, [form, onCancel])

  return (
    <Modal
      title="新建项目"
      open={open}
      onCancel={handleCancel}
      footer={null}
      width={600}
      destroyOnHidden
    >
      <Form form={form} layout="vertical" onFinish={handleSubmit} requiredMark="optional">
        <Form.Item
          name="name"
          label="项目名称"
          rules={[
            { required: true, message: '请输入项目名称' },
            { max: 100, message: '项目名称不能超过100个字符' },
            {
              pattern: /^[^<>:"/\\|?*]+$/,
              message: '项目名称不能包含特殊字符：<>:"/\\|?*'
            }
          ]}
        >
          <Input placeholder="输入项目名称" autoFocus />
        </Form.Item>

        <Form.Item
          label="保存位置"
          required
          rules={[{ required: true, message: '请选择项目保存位置' }]}
        >
          <div style={{ display: 'flex', gap: 8 }}>
            <Form.Item
              name="parentPath"
              noStyle
              rules={[{ required: true, message: '请选择项目保存位置' }]}
            >
              <Input style={{ flex: 1 }} placeholder="选择项目保存位置" readOnly />
            </Form.Item>
            <Button
              icon={<FolderOpenOutlined />}
              onClick={handleSelectPath}
              style={{ flexShrink: 0 }}
            >
              浏览...
            </Button>
          </div>
        </Form.Item>

        <Form.Item name="author" label="作者">
          <Input placeholder="输入作者名称（可选）" />
        </Form.Item>

        <Form.Item name="description" label="项目描述">
          <Input.TextArea placeholder="输入项目描述（可选）" rows={2} maxLength={500} showCount />
        </Form.Item>

        <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
          <Button style={{ marginRight: 8 }} onClick={handleCancel}>
            取消
          </Button>
          <Button type="primary" htmlType="submit" loading={loading}>
            创建
          </Button>
        </Form.Item>
      </Form>
    </Modal>
  )
}

export default CreateProjectModal
