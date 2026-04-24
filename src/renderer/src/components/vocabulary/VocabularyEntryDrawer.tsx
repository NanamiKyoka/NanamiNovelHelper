import React from 'react'
import { Drawer, Form, Input, Select, ColorPicker, Space, Button, Tooltip } from 'antd'
import { SettingOutlined, FolderOpenOutlined, FileAddOutlined } from '@ant-design/icons'
import type { VocabularyEntry, VocabularyType, FieldDefinition } from '../../types/vocabulary'
import ImageUpload from './ImageUpload'

interface VocabularyEntryDrawerProps {
  open: boolean
  editingEntry: VocabularyEntry | null
  currentTypeDefinition: VocabularyType | undefined
  loading: boolean
  form: ReturnType<typeof Form.useForm>[0]
  onSave: () => void
  onSaveAndContinue: () => void
  onCancel: () => void
  onTypeSettingsOpen: () => void
  onCreateLinkedFile: () => void
  onOpenLinkedFile: (filePath: string) => void
}

const VocabularyEntryDrawer: React.FC<VocabularyEntryDrawerProps> = ({
  open,
  editingEntry,
  currentTypeDefinition,
  loading,
  form,
  onSave,
  onSaveAndContinue,
  onCancel,
  onTypeSettingsOpen,
  onCreateLinkedFile,
  onOpenLinkedFile
}) => {
  const renderFieldInput = (field: FieldDefinition): JSX.Element => {
    switch (field.type) {
      case 'text':
        return <Input placeholder={field.placeholder || `请输入${field.name}`} />
      case 'textarea':
        return <Input.TextArea rows={3} placeholder={field.placeholder || `请输入${field.name}`} />
      case 'tags':
        return <Select mode="tags" placeholder={field.placeholder || '输入后按回车添加'} />
      case 'select':
        return (
          <Select
            placeholder={field.placeholder || `请选择${field.name}`}
            options={field.options?.map(o => ({ value: o, label: o }))}
          />
        )
      case 'number':
        return <Input type="number" placeholder={field.placeholder || `请输入${field.name}`} />
      case 'date':
        return <Input type="date" />
      case 'color':
        return <ColorPicker format="hex" />
      case 'image':
        return <ImageUpload config={field.imageConfig} />
      default:
        return <Input placeholder={field.placeholder || `请输入${field.name}`} />
    }
  }

  return (
    <Drawer
      title={
        <Space>
          <span>{editingEntry ? `编辑${currentTypeDefinition?.name || '词汇'}` : `新建${currentTypeDefinition?.name || '词汇'}`}</span>
          <Button
            type="link"
            size="small"
            icon={<SettingOutlined />}
            onClick={onTypeSettingsOpen}
            style={{ marginLeft: 8 }}
          >
            管理字段
          </Button>
        </Space>
      }
      placement="right"
      width={480}
      open={open}
      onClose={onCancel}
      footer={
        <Space>
          <Button onClick={onCancel}>取消</Button>
          {!editingEntry && (
            <Button loading={loading} onClick={onSaveAndContinue}>
              保存并继续添加
            </Button>
          )}
          <Button type="primary" loading={loading} onClick={onSave}>
            保存
          </Button>
        </Space>
      }
    >
      <Form form={form} layout="vertical">
        <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入名称' }]}>
          <Input placeholder="词汇名称" />
        </Form.Item>

        <Form.Item name="aliases" label="别名">
          <Select mode="tags" placeholder="输入别名后按回车添加" />
        </Form.Item>

        <Form.Item name="color" label="标记颜色">
          <ColorPicker format="hex" />
        </Form.Item>

        {currentTypeDefinition?.fields
          .filter(f => f.id !== 'name')
          .sort((a, b) => a.order - b.order)
          .map(field => (
            <Form.Item
              key={field.id}
              name={['fields', field.id]}
              label={field.name}
              rules={[{ required: field.required, message: `请输入${field.name}` }]}
            >
              {renderFieldInput(field)}
            </Form.Item>
          ))
        }

        <Form.Item name="description" label="备注">
          <Input.TextArea rows={3} placeholder="备注说明" />
        </Form.Item>

        <Form.Item name="tags" label="标签">
          <Select mode="tags" placeholder="添加标签" />
        </Form.Item>

        <Form.Item
          name="linkedFilePath"
          label="关联文件"
        >
          <Space.Compact style={{ width: '100%' }}>
            <Input
              placeholder="关联的 Markdown 文件路径"
              disabled
              style={{ flex: 1 }}
            />
            {editingEntry?.linkedFilePath && (
              <Tooltip title="打开文件">
                <Button
                  icon={<FolderOpenOutlined />}
                  onClick={() => onOpenLinkedFile(editingEntry.linkedFilePath!)}
                />
              </Tooltip>
            )}
            {editingEntry && (
              <Tooltip title={editingEntry.linkedFilePath ? '重新生成关联文件' : '创建关联文件'}>
                <Button
                  icon={<FileAddOutlined />}
                  onClick={onCreateLinkedFile}
                />
              </Tooltip>
            )}
          </Space.Compact>
        </Form.Item>
      </Form>
    </Drawer>
  )
}

export default VocabularyEntryDrawer
