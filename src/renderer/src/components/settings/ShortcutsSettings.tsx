/**
 * 快捷键设置组件
 */

import { useState, useEffect, useCallback } from 'react'
import { Table, Input, Button, Modal, message, Tag, Space, Typography, Card } from 'antd'
import { EditOutlined, ReloadOutlined } from '@ant-design/icons'
import baseStyles from './SettingsBase.module.css'
import styles from './ShortcutsSettings.module.css'

const { Text } = Typography

interface ShortcutConfig {
  id: string
  name: string
  description: string
  defaultKey: string
  currentKey: string
  category: string
}

const STORAGE_KEY = 'nanami-shortcuts'

const DEFAULT_SHORTCUTS: ShortcutConfig[] = [
  {
    id: 'file.new',
    name: '新建文件',
    description: '创建新文件',
    defaultKey: 'Ctrl+N',
    currentKey: 'Ctrl+N',
    category: '文件'
  },
  {
    id: 'file.open',
    name: '打开文件',
    description: '打开现有文件',
    defaultKey: 'Ctrl+O',
    currentKey: 'Ctrl+O',
    category: '文件'
  },
  {
    id: 'file.save',
    name: '保存文件',
    description: '保存当前文件',
    defaultKey: 'Ctrl+S',
    currentKey: 'Ctrl+S',
    category: '文件'
  },
  {
    id: 'file.saveAll',
    name: '保存全部',
    description: '保存所有文件',
    defaultKey: 'Ctrl+Shift+S',
    currentKey: 'Ctrl+Shift+S',
    category: '文件'
  },

  {
    id: 'edit.undo',
    name: '撤销',
    description: '撤销上一步操作',
    defaultKey: 'Ctrl+Z',
    currentKey: 'Ctrl+Z',
    category: '编辑'
  },
  {
    id: 'edit.redo',
    name: '重做',
    description: '重做上一步操作',
    defaultKey: 'Ctrl+Y',
    currentKey: 'Ctrl+Y',
    category: '编辑'
  },
  {
    id: 'edit.cut',
    name: '剪切',
    description: '剪切选中内容',
    defaultKey: 'Ctrl+X',
    currentKey: 'Ctrl+X',
    category: '编辑'
  },
  {
    id: 'edit.copy',
    name: '复制',
    description: '复制选中内容',
    defaultKey: 'Ctrl+C',
    currentKey: 'Ctrl+C',
    category: '编辑'
  },
  {
    id: 'edit.paste',
    name: '粘贴',
    description: '粘贴内容',
    defaultKey: 'Ctrl+V',
    currentKey: 'Ctrl+V',
    category: '编辑'
  },
  {
    id: 'edit.find',
    name: '查找',
    description: '在当前文件中查找',
    defaultKey: 'Ctrl+F',
    currentKey: 'Ctrl+F',
    category: '编辑'
  },
  {
    id: 'edit.replace',
    name: '替换',
    description: '在当前文件中替换',
    defaultKey: 'Ctrl+H',
    currentKey: 'Ctrl+H',
    category: '编辑'
  },

  {
    id: 'view.sidebar',
    name: '切换侧边栏',
    description: '显示/隐藏侧边栏',
    defaultKey: 'Ctrl+B',
    currentKey: 'Ctrl+B',
    category: '视图'
  },
  {
    id: 'view.settings',
    name: '打开设置',
    description: '打开设置页面',
    defaultKey: 'Ctrl+,',
    currentKey: 'Ctrl+,',
    category: '视图'
  },
  {
    id: 'view.fullscreen',
    name: '全屏',
    description: '切换全屏模式',
    defaultKey: 'F11',
    currentKey: 'F11',
    category: '视图'
  },

  {
    id: 'format.bold',
    name: '加粗',
    description: '将选中文字加粗',
    defaultKey: 'Ctrl+B',
    currentKey: 'Ctrl+B',
    category: '格式'
  },
  {
    id: 'format.italic',
    name: '斜体',
    description: '将选中文字设为斜体',
    defaultKey: 'Ctrl+I',
    currentKey: 'Ctrl+I',
    category: '格式'
  },
  {
    id: 'format.heading',
    name: '标题',
    description: '切换标题级别',
    defaultKey: 'Ctrl+1',
    currentKey: 'Ctrl+1',
    category: '格式'
  }
]

function loadShortcuts(): ShortcutConfig[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const customKeys = JSON.parse(saved) as Record<string, string>
      return DEFAULT_SHORTCUTS.map(s => ({
        ...s,
        currentKey: customKeys[s.id] || s.defaultKey
      }))
    }
  } catch (error) {
    console.error('Failed to load shortcuts:', error)
  }
  return [...DEFAULT_SHORTCUTS]
}

function saveShortcuts(shortcuts: ShortcutConfig[]): void {
  try {
    const customKeys = shortcuts.reduce(
      (acc, s) => {
        if (s.currentKey !== s.defaultKey) {
          acc[s.id] = s.currentKey
        }
        return acc
      },
      {} as Record<string, string>
    )

    localStorage.setItem(STORAGE_KEY, JSON.stringify(customKeys))
  } catch (error) {
    console.error('Failed to save shortcuts:', error)
  }
}

export function ShortcutsSettings(): JSX.Element {
  const [shortcuts, setShortcuts] = useState<ShortcutConfig[]>(() => loadShortcuts())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [currentEditKey, setCurrentEditKey] = useState('')
  const [recording, setRecording] = useState(false)

  useEffect(() => {
    saveShortcuts(shortcuts)
  }, [shortcuts])

  const handleEdit = useCallback((record: ShortcutConfig) => {
    setEditingId(record.id)
    setCurrentEditKey(record.currentKey)
    setEditModalOpen(true)
    setRecording(false)
  }, [])

  const handleSave = useCallback(() => {
    if (!editingId) return

    const conflict = shortcuts.find(s => s.id !== editingId && s.currentKey === currentEditKey)
    if (conflict) {
      message.warning(`快捷键与「${conflict.name}」冲突，请选择其他组合`)
      return
    }

    if (!currentEditKey || currentEditKey.length < 2) {
      message.error('请输入有效的快捷键组合')
      return
    }

    setShortcuts(prev =>
      prev.map(s => (s.id === editingId ? { ...s, currentKey: currentEditKey } : s))
    )
    setEditModalOpen(false)
    message.success(`快捷键「${currentEditKey}」已保存`)
  }, [editingId, currentEditKey, shortcuts])

  const handleReset = useCallback(
    (id: string) => {
      const shortcut = shortcuts.find(s => s.id === id)
      if (shortcut) {
        setShortcuts(prev => prev.map(s => (s.id === id ? { ...s, currentKey: s.defaultKey } : s)))
        message.success(`已重置为默认快捷键「${shortcut.defaultKey}」`)
      }
    },
    [shortcuts]
  )

  const handleResetAll = useCallback(() => {
    Modal.confirm({
      title: '重置所有快捷键',
      content: '确定要将所有快捷键重置为默认值吗？您的自定义设置将丢失。',
      okText: '确定重置',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: () => {
        setShortcuts([...DEFAULT_SHORTCUTS])
        localStorage.removeItem(STORAGE_KEY)
        message.success('已重置所有快捷键为默认值')
      }
    })
  }, [])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!recording) return

      e.preventDefault()
      e.stopPropagation()

      const keys: string[] = []
      if (e.ctrlKey) keys.push('Ctrl')
      if (e.shiftKey) keys.push('Shift')
      if (e.altKey) keys.push('Alt')
      if (e.metaKey) keys.push('Meta')

      const key = e.key
      if (!['Control', 'Shift', 'Alt', 'Meta'].includes(key)) {
        keys.push(key.toUpperCase())
      }

      if (keys.length > 1) {
        setCurrentEditKey(keys.join('+'))
      }
    },
    [recording]
  )

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
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.description}
          </Text>
        </div>
      )
    },
    {
      title: '快捷键',
      dataIndex: 'currentKey',
      key: 'currentKey',
      width: 150,
      render: (key: string, record: ShortcutConfig) => (
        <Tag color={key !== record.defaultKey ? 'blue' : 'default'}>{key}</Tag>
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
            aria-label={`编辑 ${record.name} 快捷键`}
          >
            编辑
          </Button>
          {record.currentKey !== record.defaultKey && (
            <Button
              type="text"
              size="small"
              onClick={() => handleReset(record.id)}
              aria-label={`重置 ${record.name} 快捷键`}
            >
              重置
            </Button>
          )}
        </Space>
      )
    }
  ]

  const groupedShortcuts = shortcuts.reduce(
    (acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = []
      }
      acc[item.category].push(item)
      return acc
    },
    {} as Record<string, ShortcutConfig[]>
  )

  const customCount = shortcuts.filter(s => s.currentKey !== s.defaultKey).length

  return (
    <div className={baseStyles.container}>
      <div className={styles.toolbar}>
        <Text type="secondary">
          {customCount > 0 ? `已自定义 ${customCount} 个快捷键` : '所有快捷键均为默认值'}
        </Text>
        <Button icon={<ReloadOutlined />} onClick={handleResetAll} disabled={customCount === 0}>
          重置所有
        </Button>
      </div>

      {Object.entries(groupedShortcuts).map(([category, items]) => (
        <Card key={category} title={category} className={baseStyles.card}>
          <Table
            dataSource={items}
            columns={columns}
            rowKey="id"
            size="small"
            pagination={false}
            showHeader={false}
          />
        </Card>
      ))}

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
            onChange={e => setCurrentEditKey(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setRecording(true)}
            onBlur={() => setRecording(false)}
            placeholder="点击此处并按下快捷键"
            aria-label="快捷键输入框"
          />
          {recording && <Text type="secondary">正在记录按键...</Text>}
          <div style={{ marginTop: 8 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              提示：支持 Ctrl、Shift、Alt 与其他键的组合
            </Text>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default ShortcutsSettings
