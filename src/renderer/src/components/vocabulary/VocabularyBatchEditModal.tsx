import React from 'react'
import { Modal, Form, ColorPicker, Select, Alert } from 'antd'

interface VocabularyBatchEditModalProps {
  open: boolean
  selectedCount: number
  loading: boolean
  onCancel: () => void
  onOk: () => void
  form: ReturnType<typeof Form.useForm>[0]
}

const VocabularyBatchEditModal: React.FC<VocabularyBatchEditModalProps> = ({
  open,
  selectedCount,
  loading,
  onCancel,
  onOk,
  form
}) => {
  return (
    <Modal
      title={`批量编辑 ${selectedCount} 个词汇`}
      open={open}
      onCancel={onCancel}
      onOk={onOk}
      confirmLoading={loading}
      okText="应用更改"
      cancelText="取消"
    >
      <Alert
        message="只有设置了值的字段才会被更新，留空的字段将保持不变"
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />
      <Form form={form} layout="vertical">
        <Form.Item name="color" label="标记颜色">
          <ColorPicker format="hex" allowClear />
        </Form.Item>

        <Form.Item name="tagsMode" label="标签操作" initialValue="add">
          <Select>
            <Select.Option value="add">添加标签</Select.Option>
            <Select.Option value="remove">移除标签</Select.Option>
            <Select.Option value="replace">替换标签</Select.Option>
          </Select>
        </Form.Item>

        <Form.Item name="tags" label="标签">
          <Select mode="tags" placeholder="输入标签后按回车添加" />
        </Form.Item>
      </Form>
    </Modal>
  )
}

export default VocabularyBatchEditModal
