/**
 * 项目创建对话框
 */

import { useState, useCallback } from 'react'
import { Modal, Form, Input, Button, Checkbox, Divider, message, Collapse } from 'antd'
import { 
  FolderOpenOutlined, 
  FolderOutlined, 
  FileOutlined,
  UserOutlined,
  EnvironmentOutlined,
  TeamOutlined,
  GiftOutlined,
  ThunderboltOutlined,
  CalendarOutlined
} from '@ant-design/icons'
import { useProjectActions } from '@hooks/useProjectActions'
import type { 
  CreateProjectOptions, 
  ProjectDirectoryType, 
  ProjectTemplateType,
  PresetVocabularyType 
} from '@shared/project'
import { 
  DEFAULT_DIRECTORIES, 
  DEFAULT_TEMPLATES, 
  PRESET_VOCABULARY_TYPES 
} from '@shared/project'

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

// 图标映射
const VOCABULARY_ICONS: Record<string, React.ReactNode> = {
  'UserOutlined': <UserOutlined />,
  'EnvironmentOutlined': <EnvironmentOutlined />,
  'TeamOutlined': <TeamOutlined />,
  'GiftOutlined': <GiftOutlined />,
  'ThunderboltOutlined': <ThunderboltOutlined />,
  'CalendarOutlined': <CalendarOutlined />
}

function CreateProjectModal({ open, onCancel, onSuccess }: CreateProjectModalProps): JSX.Element {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [directories, setDirectories] = useState(DEFAULT_DIRECTORIES)
  const [templates, setTemplates] = useState(DEFAULT_TEMPLATES)
  const [vocabularyTypes, setVocabularyTypes] = useState(PRESET_VOCABULARY_TYPES)
  
  // 使用 useProjectActions 处理跨 Store 的项目操作
  const { createProject, showCreateDialog } = useProjectActions()

  // 选择项目保存位置
  const handleSelectPath = useCallback(async () => {
    const path = await showCreateDialog()
    if (path) {
      form.setFieldValue('parentPath', path)
    }
  }, [form, showCreateDialog])

  // 切换目录选择
  const toggleDirectory = useCallback((type: ProjectDirectoryType) => {
    setDirectories(prev => 
      prev.map(dir => 
        dir.type === type ? { ...dir, selected: !dir.selected } : dir
      )
    )
  }, [])

  // 切换模板选择
  const toggleTemplate = useCallback((type: ProjectTemplateType) => {
    setTemplates(prev => 
      prev.map(tpl => 
        tpl.type === type ? { ...tpl, selected: !tpl.selected } : tpl
      )
    )
  }, [])

  // 切换预设词汇类型选择
  const toggleVocabularyType = useCallback((type: PresetVocabularyType) => {
    setVocabularyTypes(prev => 
      prev.map(vt => 
        vt.type === type ? { ...vt, selected: !vt.selected } : vt
      )
    )
  }, [])

  // 全选/取消全选目录
  const toggleAllDirectories = useCallback((selectAll: boolean) => {
    setDirectories(prev => prev.map(dir => ({ ...dir, selected: selectAll })))
  }, [])

  // 全选/取消全选模板
  const toggleAllTemplates = useCallback((selectAll: boolean) => {
    setTemplates(prev => prev.map(tpl => ({ ...tpl, selected: selectAll })))
  }, [])

  // 全选/取消全选词汇类型
  const toggleAllVocabularyTypes = useCallback((selectAll: boolean) => {
    setVocabularyTypes(prev => prev.map(vt => ({ ...vt, selected: selectAll })))
  }, [])

  // 提交表单
  const handleSubmit = useCallback(async (values: FormValues) => {
    setLoading(true)
    try {
      const selectedDirectories = directories
        .filter(dir => dir.selected)
        .map(dir => dir.type)
      
      const selectedTemplates = templates
        .filter(tpl => tpl.selected)
        .map(tpl => tpl.type)
      
      const selectedVocabularyTypes = vocabularyTypes
        .filter(vt => vt.selected)
        .map(vt => vt.type)

      const options: CreateProjectOptions = {
        name: values.name.trim(),
        parentPath: values.parentPath,
        description: values.description?.trim(),
        author: values.author?.trim(),
        directories: selectedDirectories,
        templates: selectedTemplates,
        presetVocabulary: selectedVocabularyTypes
      }

      await createProject(options)
      message.success('项目创建成功')
      form.resetFields()
      // 重置选择状态
      setDirectories(DEFAULT_DIRECTORIES)
      setTemplates(DEFAULT_TEMPLATES)
      setVocabularyTypes(PRESET_VOCABULARY_TYPES)
      onSuccess?.()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '创建项目失败'
      message.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [createProject, form, onSuccess, directories, templates, vocabularyTypes])

  // 取消
  const handleCancel = useCallback(() => {
    form.resetFields()
    setDirectories(DEFAULT_DIRECTORIES)
    setTemplates(DEFAULT_TEMPLATES)
    setVocabularyTypes(PRESET_VOCABULARY_TYPES)
    onCancel()
  }, [form, onCancel])

  const allDirectoriesSelected = directories.every(dir => dir.selected)
  const allTemplatesSelected = templates.every(tpl => tpl.selected)
  const allVocabularyTypesSelected = vocabularyTypes.every(vt => vt.selected)
  const someDirectoriesSelected = directories.some(dir => dir.selected) && !allDirectoriesSelected
  const someTemplatesSelected = templates.some(tpl => tpl.selected) && !allTemplatesSelected
  const someVocabularyTypesSelected = vocabularyTypes.some(vt => vt.selected) && !allVocabularyTypesSelected

  return (
    <Modal
      title="新建项目"
      open={open}
      onCancel={handleCancel}
      footer={null}
      width={600}
      destroyOnHidden
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        requiredMark="optional"
      >
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
              <Input 
                style={{ flex: 1 }} 
                placeholder="选择项目保存位置" 
                readOnly 
              />
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

        <Form.Item
          name="author"
          label="作者"
        >
          <Input placeholder="输入作者名称（可选）" />
        </Form.Item>

        <Form.Item
          name="description"
          label="项目描述"
        >
          <Input.TextArea 
            placeholder="输入项目描述（可选）" 
            rows={2}
            maxLength={500}
            showCount
          />
        </Form.Item>

        <Divider style={{ margin: '12px 0' }} />

        {/* 预设词汇类型 */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 500 }}>
              词汇类型
            </span>
            <Checkbox
              checked={allVocabularyTypesSelected}
              indeterminate={someVocabularyTypesSelected}
              onChange={(e) => toggleAllVocabularyTypes(e.target.checked)}
            >
              全选
            </Checkbox>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {vocabularyTypes.map(vt => (
              <Checkbox
                key={vt.type}
                checked={vt.selected}
                onChange={() => toggleVocabularyType(vt.type)}
              >
                {VOCABULARY_ICONS[vt.icon]} {vt.name}
              </Checkbox>
            ))}
          </div>
        </div>

        {/* 目录选择 */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 500 }}>
              <FolderOutlined style={{ marginRight: 6 }} />
              项目目录
            </span>
            <Checkbox
              checked={allDirectoriesSelected}
              indeterminate={someDirectoriesSelected}
              onChange={(e) => toggleAllDirectories(e.target.checked)}
            >
              全选
            </Checkbox>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {directories.map(dir => (
              <Checkbox
                key={dir.type}
                checked={dir.selected}
                onChange={() => toggleDirectory(dir.type)}
              >
                {dir.name}
              </Checkbox>
            ))}
          </div>
        </div>

        {/* 模板选择 */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 500 }}>
              <FileOutlined style={{ marginRight: 6 }} />
              模板文件
            </span>
            <Checkbox
              checked={allTemplatesSelected}
              indeterminate={someTemplatesSelected}
              onChange={(e) => toggleAllTemplates(e.target.checked)}
            >
              全选
            </Checkbox>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {templates.map(tpl => (
              <Checkbox
                key={tpl.type}
                checked={tpl.selected}
                onChange={() => toggleTemplate(tpl.type)}
              >
                {tpl.name}
              </Checkbox>
            ))}
          </div>
        </div>

        <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
          <Button 
            style={{ marginRight: 8 }} 
            onClick={handleCancel}
          >
            取消
          </Button>
          <Button 
            type="primary" 
            htmlType="submit" 
            loading={loading}
          >
            创建
          </Button>
        </Form.Item>
      </Form>
    </Modal>
  )
}

export default CreateProjectModal