import { useState, useCallback } from 'react'
import {
  Table,
  Button,
  Input,
  Select,
  Switch,
  Modal,
  Form,
  Space,
  Popconfirm,
  message,
  Tooltip,
  Empty,
  InputNumber
} from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  HolderOutlined
} from '@ant-design/icons'
import { v4 as uuidv4 } from 'uuid'
import type { FieldType, FieldDefinition, VocabularyType } from '../../types/vocabulary'

interface FieldDefinitionEditorProps {
  fields: FieldDefinition[]
  vocabularyTypes: VocabularyType[]
  onChange: (fields: FieldDefinition[]) => Promise<void>
  readOnly?: boolean
}

// 字段类型选项
const FIELD_TYPE_OPTIONS = [
  { value: 'text', label: '单行文本' },
  { value: 'textarea', label: '多行文本' },
  { value: 'tags', label: '标签列表' },
  { value: 'select', label: '下拉选择' },
  { value: 'number', label: '数字' },
  { value: 'date', label: '日期' },
  { value: 'color', label: '颜色' },
  { value: 'image', label: '图片' },
  { value: 'reference', label: '引用' }
]

function FieldDefinitionEditor({
  fields,
  vocabularyTypes,
  onChange,
  readOnly = false
}: FieldDefinitionEditorProps): JSX.Element {
  const [editingField, setEditingField] = useState<FieldDefinition | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)

  // 打开新建弹窗
  const handleCreate = (): void => {
    if (readOnly) return
    setEditingField(null)
    form.resetFields()
    form.setFieldsValue({
      type: 'text',
      required: false,
      order: fields.length
    })
    setIsModalOpen(true)
  }

  // 打开编辑弹窗
  const handleEdit = (field: FieldDefinition): void => {
    if (readOnly) return
    setEditingField(field)
    
    // 处理 imageConfig 的加载（将字节转换为 MB）
    const imageConfigForForm = field.imageConfig ? {
      maxSize: field.imageConfig.maxSize ? field.imageConfig.maxSize / 1024 / 1024 : undefined,
      maxWidth: field.imageConfig.maxWidth,
      maxHeight: field.imageConfig.maxHeight,
      quality: field.imageConfig.quality
    } : undefined
    
    form.setFieldsValue({
      ...field,
      options: field.options?.join('\n'),
      imageConfig: imageConfigForForm
    })
    setIsModalOpen(true)
  }

  // 保存字段
  const handleSave = async (): Promise<void> => {
    try {
      const values = await form.validateFields()
      setLoading(true)

      const options = values.options
        ? values.options.split('\n').map((o: string) => o.trim()).filter(Boolean)
        : undefined

      // 处理 imageConfig
      let imageConfig = undefined
      if (values.type === 'image' && values.imageConfig) {
        imageConfig = {
          maxSize: values.imageConfig.maxSize ? values.imageConfig.maxSize * 1024 * 1024 : undefined,
          maxWidth: values.imageConfig.maxWidth,
          maxHeight: values.imageConfig.maxHeight,
          quality: values.imageConfig.quality
        }
        // 移除 undefined 值
        imageConfig = Object.fromEntries(
          Object.entries(imageConfig).filter(([_, v]) => v !== undefined)
        )
        if (Object.keys(imageConfig).length === 0) {
          imageConfig = undefined
        }
      }

      let updatedFields: FieldDefinition[]

      if (editingField) {
        // 编辑现有字段
        updatedFields = fields.map(f =>
          f.id === editingField.id
            ? { ...f, ...values, options, imageConfig }
            : f
        )
      } else {
        // 新建字段
        const newField: FieldDefinition = {
          id: uuidv4(),
          name: values.name,
          type: values.type,
          options,
          referenceTypeId: values.referenceTypeId,
          imageConfig,
          required: values.required || false,
          placeholder: values.placeholder,
          width: values.width,
          order: fields.length
        }
        updatedFields = [...fields, newField]
      }

      await onChange(updatedFields)
      message.success(editingField ? '更新成功' : '创建成功')
      setIsModalOpen(false)
    } catch (error) {
      console.error('保存失败:', error)
    } finally {
      setLoading(false)
    }
  }

  // 删除字段
  const handleDelete = async (id: string): Promise<void> => {
    if (readOnly) return
    try {
      const updatedFields = fields.filter(f => f.id !== id)
      await onChange(updatedFields)
      message.success('删除成功')
    } catch (error) {
      console.error('删除字段失败:', error)
      message.error('删除失败')
    }
  }

  // 移动字段顺序
  const handleMove = async (id: string, direction: 'up' | 'down'): Promise<void> => {
    if (readOnly) return
    const index = fields.findIndex(f => f.id === id)
    if (index === -1) return

    const newFields = [...fields]
    if (direction === 'up' && index > 0) {
      [newFields[index - 1], newFields[index]] = [newFields[index], newFields[index - 1]]
    } else if (direction === 'down' && index < fields.length - 1) {
      [newFields[index], newFields[index + 1]] = [newFields[index + 1], newFields[index]]
    }

    // 更新 order
    const updatedFields = newFields.map((f, i) => ({ ...f, order: i }))
    await onChange(updatedFields)
  }

  // 表格列定义
  const columns = [
    {
      title: '',
      key: 'drag',
      width: 30,
      render: (_: unknown, __: FieldDefinition, index: number) => (
        <Space direction="vertical" size={0}>
          <Button
            type="text"
            size="small"
            icon={<HolderOutlined rotate={-90} />}
            onClick={() => handleMove(fields[index].id, 'up')}
            disabled={index === 0 || readOnly}
            style={{ padding: '0 4px', height: 16 }}
          />
          <Button
            type="text"
            size="small"
            icon={<HolderOutlined rotate={90} />}
            onClick={() => handleMove(fields[index].id, 'down')}
            disabled={index === fields.length - 1 || readOnly}
            style={{ padding: '0 4px', height: 16 }}
          />
        </Space>
      )
    },
    {
      title: '字段名称',
      dataIndex: 'name',
      key: 'name',
      width: 120
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (type: FieldType) => 
        FIELD_TYPE_OPTIONS.find(o => o.value === type)?.label || type
    },
    {
      title: '必填',
      dataIndex: 'required',
      key: 'required',
      width: 60,
      render: (required: boolean) => required ? '是' : '否'
    },
    {
      title: '占位符',
      dataIndex: 'placeholder',
      key: 'placeholder',
      ellipsis: true,
      render: (placeholder: string) => placeholder || '-'
    },
    ...(readOnly ? [] : [{
      title: '操作',
      key: 'action',
      width: 100,
      render: (_: unknown, record: FieldDefinition) => (
        <Space>
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          />
          <Popconfirm
            title="确定删除此字段？"
            onConfirm={() => handleDelete(record.id)}
            okText="删除"
            cancelText="取消"
          >
            <Button
              type="text"
              size="small"
              icon={<DeleteOutlined />}
              danger
            />
          </Popconfirm>
        </Space>
      )
    }])
  ]

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <Button
          type="dashed"
          icon={<PlusOutlined />}
          onClick={handleCreate}
          disabled={readOnly}
          block
        >
          添加字段
        </Button>
      </div>

      {fields.length === 0 ? (
        <Empty 
          description="暂无字段定义" 
          image={Empty.PRESENTED_IMAGE_SIMPLE} 
        />
      ) : (
        <Table
          dataSource={fields}
          columns={columns as unknown[]}
          rowKey="id"
          size="small"
          pagination={false}
        />
      )}

      <Modal
        title={editingField ? '编辑字段' : '添加字段'}
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onOk={handleSave}
        confirmLoading={loading}
        okText="保存"
        cancelText="取消"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="字段名称"
            rules={[{ required: true, message: '请输入字段名称' }]}
          >
            <Input placeholder="如：姓名、年龄" />
          </Form.Item>

          <Form.Item
            name="type"
            label="字段类型"
            rules={[{ required: true, message: '请选择字段类型' }]}
          >
            <Select options={FIELD_TYPE_OPTIONS} />
          </Form.Item>

          <Form.Item
            noStyle
            shouldUpdate={(prev, curr) => prev.type !== curr.type}
          >
            {({ getFieldValue }) => {
              const type = getFieldValue('type')
              
              if (type === 'select') {
                return (
                  <Form.Item
                    name="options"
                    label="选项列表"
                    extra="每行一个选项"
                  >
                    <Input.TextArea rows={4} placeholder="选项1&#10;选项2&#10;选项3" />
                  </Form.Item>
                )
              }
              
              if (type === 'reference') {
                return (
                  <Form.Item
                    name="referenceTypeId"
                    label="引用类型"
                    rules={[{ required: true, message: '请选择引用类型' }]}
                  >
                    <Select
                      placeholder="选择要引用的词汇类型"
                      options={vocabularyTypes.map(t => ({
                        value: t.id,
                        label: t.name
                      }))}
                    />
                  </Form.Item>
                )
              }

              if (type === 'image') {
                return (
                  <>
                    <Form.Item
                      name={['imageConfig', 'maxSize']}
                      label="最大文件大小"
                      extra="单位：MB"
                    >
                      <InputNumber min={1} max={50} placeholder="5" style={{ width: '100%' }} />
                    </Form.Item>
                    <Form.Item
                      name={['imageConfig', 'maxWidth']}
                      label="最大宽度"
                      extra="单位：像素，超过将自动压缩"
                    >
                      <InputNumber min={100} max={4000} placeholder="1920" style={{ width: '100%' }} />
                    </Form.Item>
                    <Form.Item
                      name={['imageConfig', 'maxHeight']}
                      label="最大高度"
                      extra="单位：像素，超过将自动压缩"
                    >
                      <InputNumber min={100} max={4000} placeholder="1080" style={{ width: '100%' }} />
                    </Form.Item>
                    <Form.Item
                      name={['imageConfig', 'quality']}
                      label="压缩质量"
                      extra="1-100，默认 85"
                    >
                      <InputNumber min={1} max={100} placeholder="85" style={{ width: '100%' }} />
                    </Form.Item>
                  </>
                )
              }
              
              return null
            }}
          </Form.Item>

          <Form.Item name="placeholder" label="占位符">
            <Input placeholder="输入时的提示文字" />
          </Form.Item>

          <Form.Item name="required" label="必填" valuePropName="checked">
            <Switch />
          </Form.Item>

          <Form.Item name="width" label="表格列宽">
            <Space.Compact>
              <InputNumber min={50} max={500} placeholder="默认 120" style={{ width: 100 }} />
              <span style={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                padding: '0 12px',
                background: 'var(--ant-color-bg-container-disabled)',
                border: '1px solid var(--ant-color-border)',
                borderLeft: 'none',
                borderRadius: '0 6px 6px 0',
                color: 'var(--ant-color-text-secondary)',
                height: 32
              }}>px</span>
            </Space.Compact>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default FieldDefinitionEditor
