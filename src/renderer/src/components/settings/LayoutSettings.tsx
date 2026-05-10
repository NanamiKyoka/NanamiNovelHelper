/**
 * 项目文件显示设置组件
 * 管理项目特定的文件显示规则（隐藏指定项目）
 */

import { useState, useEffect } from 'react'
import { App, Input, Button, Tag, Space, Card } from 'antd'
import { InfoCircleOutlined, PlusOutlined, FolderOutlined, FileOutlined } from '@ant-design/icons'
import { useProjectStore } from '@stores/projectStore'
import { useFileTreeStore } from '@stores/fileTreeStore'
import baseStyles from './SettingsBase.module.css'
import styles from './LayoutSettings.module.css'

function FileDisplaySettings(): JSX.Element {
  const { message } = App.useApp()
  const currentProject = useProjectStore(state => state.currentProject)
  const refreshTree = useFileTreeStore(state => state.refreshTree)

  const [hiddenItems, setHiddenItems] = useState<string[]>([])
  const [newHiddenItem, setNewHiddenItem] = useState('')

  useEffect(() => {
    if (currentProject) {
      window.electron.settings.project.getHiddenItems().then(items => setHiddenItems(items || []))
    }
  }, [currentProject])

  const handleAddHiddenItem = async () => {
    const item = newHiddenItem.trim()
    if (!item) return

    if (hiddenItems.includes(item)) {
      message.warning('该项已存在于隐藏列表中')
      return
    }

    try {
      const newItems = [...hiddenItems, item]
      await window.electron.settings.project.setHiddenItems(newItems)
      setHiddenItems(newItems)
      setNewHiddenItem('')
      refreshTree()
      message.success('已添加到隐藏列表')
    } catch (_error) {
      message.error('保存设置失败')
    }
  }

  const handleRemoveHiddenItem = async (item: string) => {
    try {
      const newItems = hiddenItems.filter(i => i !== item)
      await window.electron.settings.project.setHiddenItems(newItems)
      setHiddenItems(newItems)
      refreshTree()
    } catch (_error) {
      message.error('保存设置失败')
    }
  }

  if (!currentProject) {
    return (
      <div className={baseStyles.container}>
        <div className={baseStyles.tip}>
          <InfoCircleOutlined className={baseStyles.tipIcon} />
          <span>请先打开项目以配置文件显示规则</span>
        </div>
      </div>
    )
  }

  return (
    <div className={baseStyles.container}>
      <Card title="隐藏指定项目" className={baseStyles.card}>
        <p className={baseStyles.hint}>自定义隐藏指定的文件或文件夹。这些设置仅对当前项目生效。</p>

        <div style={{ marginTop: 16 }}>
          <div className={styles.badgeItem} style={{ alignItems: 'flex-start' }}>
            <div className={styles.badgeItemLeft}>
              <div className={styles.badgeIcon}>
                <FolderOutlined />
              </div>
              <div className={styles.badgeInfo}>
                <span className={styles.badgeName}>添加隐藏项</span>
                <span className={styles.badgeDesc}>输入相对路径，如 node_modules、dist、temp</span>
              </div>
            </div>
          </div>

          <div style={{ marginLeft: 44, marginTop: 8 }}>
            <Space.Compact style={{ width: '100%' }}>
              <Input
                placeholder="例如: node_modules、dist、temp"
                value={newHiddenItem}
                onChange={e => setNewHiddenItem(e.target.value)}
                onPressEnter={handleAddHiddenItem}
              />
              <Button type="primary" icon={<PlusOutlined />} onClick={handleAddHiddenItem}>
                添加
              </Button>
            </Space.Compact>

            {hiddenItems.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <div
                  style={{
                    marginBottom: 8,
                    color: 'var(--ant-color-text-secondary)',
                    fontSize: 12
                  }}
                >
                  已隐藏的项目：
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {hiddenItems.map(item => (
                    <Tag
                      key={item}
                      closable
                      onClose={e => {
                        e.preventDefault()
                        handleRemoveHiddenItem(item)
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        padding: '4px 8px'
                      }}
                    >
                      {item.includes('.') ? <FileOutlined /> : <FolderOutlined />}
                      <span>{item}</span>
                    </Tag>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>

      <div className={baseStyles.tip}>
        <InfoCircleOutlined className={baseStyles.tipIcon} />
        <div>
          <p style={{ margin: 0 }}>提示：</p>
          <ul style={{ margin: '8px 0 0 0', paddingLeft: 20 }}>
            <li>隐藏的项目不会在文件树中显示</li>
            <li>输入相对路径，如 folder 或 path/to/folder</li>
            <li>这些设置仅对当前项目生效</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default FileDisplaySettings
