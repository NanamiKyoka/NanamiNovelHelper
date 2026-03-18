/**
 * 快捷键设置组件
 */

import { useState } from 'react'
import { Table, Input, Button, Modal, message, Tag, Space, Typography, Alert } from 'antd'
import { EditOutlined, ReloadOutlined } from '@ant-design/icons'
import styles from './ShortcutsSettings.module.css'

const { Text } = Typography

// 快捷键配置类型
interface ShortcutConfig {
  id: string
  name: string
  description: string
  defaultKey: string
  currentKey: string
  category: string
}

// 默认快捷键配置
const DEFAULT_SHORTCUTS: ShortcutConfig[] = [
  // 文件操作
  { id: 'file.new', name: '新建文件', description: '创建新文件', defaultKey: 'Ctrl+N', currentKey: 'Ctrl+N', category: '文件' },
  { id: 'file.open', name: '打开文件', description: '打开现有文件', defaultKey: 'Ctrl+O', currentKey: 'Ctrl+O', category: '文件' },
  { id: 'file.save', name: '保存文件', description: '保存当前文件', defaultKey: 'Ctrl+S', currentKey: 'Ctrl+S', category: '文件' },
  { id: 'file.saveAll', name: '保存全部', description: '保存所有文件', defaultKey: 'Ctrl+Shift+S', currentKey: 'Ctrl+Shift+S', category: '文件' },
  
  // 编辑操作
  { id: 'edit.undo', name: '撤销', description: '撤销上一步操作', defaultKey: 'Ctrl+Z', currentKey: 'Ctrl+Z', category: '编辑' },
  { id: 'edit.redo', name: '重做', description: '重做上一步操作', defaultKey: 'Ctrl+Y', currentKey: 'Ctrl+Y', category: '编辑' },
  { id: 'edit.cut', name: '剪切', description: '剪切选中内容', defaultKey: 'Ctrl+X', currentKey: 'Ctrl+X', category: '编辑' },
  { id: 'edit.copy', name: '复制', description: '复制选中内容', defaultKey: 'Ctrl+C', currentKey: 'Ctrl+C', category: '编辑' },
  { id: 'edit.paste', name: '粘贴', description: '粘贴内容', defaultKey: 'Ctrl+V', currentKey: 'Ctrl+V', category: '编辑' },
  { id: 'edit.find', name: '查找', description: '在当前文件中查找', defaultKey: 'Ctrl+F', currentKey: 'Ctrl+F', category: '编辑' },
  { id: 'edit.replace', name: '替换', description: '在当前文件中替换', defaultKey: 'Ctrl+H', currentKey: 'Ctrl+H', category: '编辑' },
  
  // 视图操作
  { id: 'view.sidebar', name: '切换侧边栏', description: '显示/隐藏侧边栏', defaultKey: 'Ctrl+B', currentKey: 'Ctrl+B', category: '视图' },
  { id: 'view.settings', name: '打开设置', description: '打开设置页面', defaultKey: 'Ctrl+,', currentKey: 'Ctrl+,', category: '视图' },
  { id: 'view.fullscreen', name: '全屏', description: '切换全屏模式', defaultKey: 'F11', currentKey: 'F11', category: '视图' },
  
  // 格式操作
  { id: 'format.bold', name: '加粗', description: '将选中文字加粗', defaultKey: 'Ctrl+B', currentKey: 'Ctrl+B', category: '格式' },
  { id: 'format.italic', name: '斜体', description: '将选中文字设为斜体', defaultKey: 'Ctrl+I', currentKey: 'Ctrl+I', category: '格式' },
  { id: 'format.heading', name: '标题', description: '切换标题级别', defaultKey: 'Ctrl+1', currentKey: 'Ctrl+1', category: '格式' },
]

export function ShortcutsSettings(): JSX.Element {
  const [shortcuts, setShortcuts] = useState<ShortcutConfig[]>(DEFAULT_SHORTCUTS)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [currentEditKey, setCurrentEditKey] = useState('')
  const [recording, setRecording] = useState(false)

  // 打开编辑弹窗
  const handleEdit = (record: ShortcutConfig) => {
    setEditingId(record.id)
    setCurrentEditKey(record.currentKey)
    setEditModalOpen(true)
    setRecording(false)
  }

  // 保存快捷键
  const handleSave = () => {
    if (!editingId) return
    
    // 检查是否与其他快捷键冲突
    const conflict = shortcuts.find(s => s.id !== editingId && s.currentKey === currentEditKey)
    if (conflict) {
      message.warning(`快捷键与「${conflict.name}」冲突`)
      return
    }
    
    setShortcuts(prev => prev.map(s => 
      s.id === editingId ? { ...s, currentKey: currentEditKey } : s
    ))
    setEditModalOpen(false)
    message.success('快捷键已更新')
  }

  // 重置单个快捷键
  const handleReset = (id: string) => {
    setShortcuts(prev => prev.map(s => 
      s.id === id ? { ...s, currentKey: s.defaultKey } : s
    ))
    message.success('已重置为默认')
  }

  // 重置所有快捷键
  const handleResetAll = () => {
    Modal.confirm({
      title: '重置所有快捷键',
      content: '确定要将所有快捷键重置为默认值吗？',
      onOk: () => {
        setShortcuts(DEFAULT_SHORTCUTS)
        message.success('已重置所有快捷键')
      }
    })
  }

  // 记录按键
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!recording) return
    
    e.preventDefault()
    e.stopPropagation()
    
    const keys: string[] = []
    if (e.ctrlKey) keys.push('Ctrl')
    if (e.shiftKey) keys.push('Shift')
    if (e.altKey) keys.push('Alt')
    if (e.metaKey) keys.push('Meta')
    
    // 获取主键
    const key = e.key
    if (!['Control', 'Shift', 'Alt', 'Meta'].includes(key)) {
      keys.push(key.toUpperCase())
    }
    
    if (keys.length > 1) {
      setCurrentEditKey(keys.join('+'))
    }
  }

  // 表格列定义
  const columns = [
    {
      title: '功能',
      dataIndex: 'name',
      key: 'name',
      width: 150,
      render: (name: string, record: ShortcutConfig) => (
        <div>
          <Text strong>{name}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>{record.description}</Text>
        </div>
      )
    },
    {
      title: '快捷键',
      dataIndex: 'currentKey',
      key: 'currentKey',
      width: 150,
      render: (key: string, record: ShortcutConfig) => (
        <Tag color={key !== record.defaultKey ? 'blue' : 'default'}>
          {key}
        </Tag>
      )
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_: unknown, record: ShortcutConfig) => (
        <Space>
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          {record.currentKey !== record.defaultKey && (
            <Button
              type="text"
              size="small"
              onClick={() => handleReset(record.id)}
            >
              重置
            </Button>
          )}
        </Space>
      )
    }
  ]

  // 按分类分组
  const groupedShortcuts = shortcuts.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = []
    }
    acc[item.category].push(item)
    return acc
  }, {} as Record<string, ShortcutConfig[]>)

  return (
    <div className={styles.container}>
      <Alert
        message="快捷键设置功能开发中"
        description="当前仅展示默认快捷键配置，自定义功能即将推出。"
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />

      <div className={styles.toolbar}>
        <Button icon={<ReloadOutlined />} onClick={handleResetAll}>
          重置所有
        </Button>
      </div>

      {Object.entries(groupedShortcuts).map(([category, items]) => (
        <div key={category} className={styles.category}>
          <h3 className={styles.categoryTitle}>{category}</h3>
          <Table
            dataSource={items}
            columns={columns}
            rowKey="id"
            size="small"
            pagination={false}
            showHeader={false}
          />
        </div>
      ))}

      {/* 编辑弹窗 */}
      <Modal
        title="编辑快捷键"
        open={editModalOpen}
        onOk={handleSave}
        onCancel={() => setEditModalOpen(false)}
        okText="保存"
        cancelText="取消"
      >
        <div className={styles.editContent}>
          <p>请按下新的快捷键组合：</p>
          <Input
            className={styles.keyInput}
            value={currentEditKey}
            onChange={(e) => setCurrentEditKey(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setRecording(true)}
            onBlur={() => setRecording(false)}
            placeholder="点击此处并按下快捷键"
          />
          {recording && <Text type="secondary">正在记录按键...</Text>}
        </div>
      </Modal>
    </div>
  )
}

export default ShortcutsSettings
