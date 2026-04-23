/**
 * 界面布局设置组件
 * 管理徽章显示/隐藏等界面布局相关设置
 */

import { useMemo, useState, useEffect } from 'react'
import { Switch, message, Input, Button, Tag, Space, Divider, Card } from 'antd'
import { TagOutlined, WarningOutlined, UserAddOutlined, ApartmentOutlined, ClockCircleOutlined, TableOutlined, TeamOutlined, EnvironmentOutlined, CodeOutlined, InfoCircleOutlined, EyeOutlined, PlusOutlined, FolderOutlined, FileOutlined } from '@ant-design/icons'
import { useSettingsStore } from '@stores/settingsStore'
import { useProjectStore } from '@stores/projectStore'
import { useFileTreeStore } from '@stores/fileTreeStore'
import type { BadgeVisibility, SidebarBadgeVisibility } from '@types/settings'
import { DEFAULT_BADGE_VISIBILITY, DEFAULT_SIDEBAR_BADGE_VISIBILITY } from '@types/settings'
import baseStyles from './SettingsBase.module.css'
import styles from './LayoutSettings.module.css'

const BADGE_CONFIG = [
  {
    key: 'vocabulary' as keyof BadgeVisibility,
    name: '词汇查询',
    description: '快速查询和管理词汇',
    icon: TagOutlined,
    hasSidebarEntry: true
  },
  {
    key: 'sensitive' as keyof BadgeVisibility,
    name: '敏感词',
    description: '敏感词检测与管理',
    icon: WarningOutlined,
    hasSidebarEntry: true
  },
  {
    key: 'randomName' as keyof BadgeVisibility,
    name: '随机起名',
    description: '快速生成随机姓名',
    icon: UserAddOutlined,
    hasSidebarEntry: false
  },
  {
    key: 'relationship' as keyof BadgeVisibility,
    name: '关系图',
    description: '人物关系可视化',
    icon: ApartmentOutlined,
    hasSidebarEntry: true
  },
  {
    key: 'timeline' as keyof BadgeVisibility,
    name: '时间线',
    description: '故事情节时间线管理',
    icon: ClockCircleOutlined,
    hasSidebarEntry: true
  },
  {
    key: 'sequenceChart' as keyof BadgeVisibility,
    name: '事序图',
    description: '甘特图风格的事件管理',
    icon: TableOutlined,
    hasSidebarEntry: true
  },
  {
    key: 'organization' as keyof BadgeVisibility,
    name: '组织架构',
    description: '组织结构和成员关系管理',
    icon: TeamOutlined,
    hasSidebarEntry: true
  },
  {
    key: 'map' as keyof BadgeVisibility,
    name: '地图设计',
    description: '绘制故事地图和地点关系',
    icon: EnvironmentOutlined,
    hasSidebarEntry: true
  },
  {
    key: 'terminal' as keyof BadgeVisibility,
    name: '终端',
    description: '集成终端命令行工具',
    icon: CodeOutlined,
    hasSidebarEntry: false
  }
]

function LayoutSettings(): JSX.Element {
  const currentProject = useProjectStore((state) => state.currentProject)
  const projectSettings = useSettingsStore((state) => state.projectSettings)
  const updateBadgeVisibility = useSettingsStore((state) => state.updateBadgeVisibility)
  const updateSidebarBadgeVisibility = useSettingsStore((state) => state.updateSidebarBadgeVisibility)
  const refreshTree = useFileTreeStore((state) => state.refreshTree)
  
  const [showHiddenFiles, setShowHiddenFiles] = useState(false)
  const [hiddenItems, setHiddenItems] = useState<string[]>([])
  const [newHiddenItem, setNewHiddenItem] = useState('')

  useEffect(() => {
    if (currentProject) {
      window.electron.settings.project.getShowHiddenFiles().then(setShowHiddenFiles)
      window.electron.settings.project.getHiddenItems().then(setHiddenItems)
    }
  }, [currentProject])

  const badgeVisibility = useMemo(() => {
    return projectSettings?.badgeVisibility || DEFAULT_BADGE_VISIBILITY
  }, [projectSettings?.badgeVisibility])

  const sidebarBadgeVisibility = useMemo(() => {
    return projectSettings?.sidebarBadgeVisibility || DEFAULT_SIDEBAR_BADGE_VISIBILITY
  }, [projectSettings?.sidebarBadgeVisibility])

  const handleBadgeToggle = async (key: keyof BadgeVisibility, checked: boolean) => {
    try {
      await updateBadgeVisibility({ [key]: checked })
    } catch (error) {
      message.error('保存设置失败')
    }
  }

  const handleSidebarBadgeToggle = async (key: keyof SidebarBadgeVisibility, checked: boolean) => {
    try {
      await updateSidebarBadgeVisibility({ [key]: checked })
    } catch (error) {
      message.error('保存设置失败')
    }
  }

  const handleToggleHiddenFiles = async (checked: boolean) => {
    try {
      await window.electron.settings.project.setShowHiddenFiles(checked)
      setShowHiddenFiles(checked)
      refreshTree()
    } catch (error) {
      message.error('保存设置失败')
    }
  }

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
    } catch (error) {
      message.error('保存设置失败')
    }
  }

  const handleRemoveHiddenItem = async (item: string) => {
    try {
      const newItems = hiddenItems.filter(i => i !== item)
      await window.electron.settings.project.setHiddenItems(newItems)
      setHiddenItems(newItems)
      refreshTree()
    } catch (error) {
      message.error('保存设置失败')
    }
  }

  if (!currentProject) {
    return (
      <div className={baseStyles.container}>
        <div className={baseStyles.tip}>
          <InfoCircleOutlined className={baseStyles.tipIcon} />
          <span>请先打开项目以配置界面布局</span>
        </div>
      </div>
    )
  }

  return (
    <div className={baseStyles.container}>
      <Card title="徽章显示" className={baseStyles.card}>
        <p className={baseStyles.hint}>
          控制徽章的显示位置。可以同时在右侧工具栏和左侧边栏显示入口。
        </p>
        
        <div className={styles.badgeList}>
          {BADGE_CONFIG.map((badge) => {
            const IconComponent = badge.icon
            const isBadgeVisible = badgeVisibility[badge.key]
            const isSidebarVisible = badge.hasSidebarEntry ? sidebarBadgeVisibility[badge.key as keyof SidebarBadgeVisibility] : false
            
            return (
              <div key={badge.key} className={styles.badgeItem}>
                <div className={styles.badgeItemLeft}>
                  <div className={styles.badgeIcon}>
                    <IconComponent />
                  </div>
                  <div className={styles.badgeInfo}>
                    <span className={styles.badgeName}>{badge.name}</span>
                    <span className={styles.badgeDesc}>{badge.description}</span>
                  </div>
                </div>
                <div className={styles.badgeSwitches}>
                  <div className={styles.switchItem}>
                    <span className={styles.switchLabel}>右侧徽章</span>
                    <Switch
                      checked={isBadgeVisible}
                      onChange={(checked) => handleBadgeToggle(badge.key, checked)}
                      size="small"
                    />
                  </div>
                  {badge.hasSidebarEntry && (
                    <>
                      <Divider type="vertical" className={styles.switchDivider} />
                      <div className={styles.switchItem}>
                        <span className={styles.switchLabel}>左侧入口</span>
                        <Switch
                          checked={isSidebarVisible}
                          onChange={(checked) => handleSidebarBadgeToggle(badge.key as keyof SidebarBadgeVisibility, checked)}
                          size="small"
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      <Card title="高级设置" className={baseStyles.card}>
        <p className={baseStyles.hint}>
          文件树的高级显示选项。
        </p>
        
        <div className={styles.badgeList}>
          <div className={styles.badgeItem}>
            <div className={styles.badgeItemLeft}>
              <div className={styles.badgeIcon}>
                <EyeOutlined />
              </div>
              <div className={styles.badgeInfo}>
                <span className={styles.badgeName}>显示隐藏文件</span>
                <span className={styles.badgeDesc}>显示以 . 开头的文件和目录（如 .novelhelper）</span>
              </div>
            </div>
            <Switch
              checked={showHiddenFiles}
              onChange={handleToggleHiddenFiles}
              checkedChildren="显示"
              unCheckedChildren="隐藏"
            />
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          <div className={styles.badgeItem} style={{ alignItems: 'flex-start' }}>
            <div className={styles.badgeItemLeft}>
              <div className={styles.badgeIcon}>
                <FolderOutlined />
              </div>
              <div className={styles.badgeInfo}>
                <span className={styles.badgeName}>隐藏指定项目</span>
                <span className={styles.badgeDesc}>自定义隐藏指定的文件或文件夹（输入相对路径）</span>
              </div>
            </div>
          </div>
          
          <div style={{ marginLeft: 44, marginTop: 8 }}>
            <Space.Compact style={{ width: '100%' }}>
              <Input
                placeholder="例如: node_modules、dist、temp"
                value={newHiddenItem}
                onChange={(e) => setNewHiddenItem(e.target.value)}
                onPressEnter={handleAddHiddenItem}
              />
              <Button 
                type="primary" 
                icon={<PlusOutlined />}
                onClick={handleAddHiddenItem}
              >
                添加
              </Button>
            </Space.Compact>
            
            {hiddenItems.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <div style={{ marginBottom: 8, color: 'var(--ant-color-text-secondary)', fontSize: 12 }}>
                  已隐藏的项目：
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {hiddenItems.map((item) => (
                    <Tag
                      key={item}
                      closable
                      onClose={(e) => {
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
            <li>徽章可以同时显示在右侧工具栏和左侧边栏</li>
            <li>右侧徽章和左侧边栏入口的顺序都可以通过长按拖拽调整</li>
            <li>隐藏的徽章功能仍然可用，只是入口被隐藏</li>
            <li>显示隐藏文件后可在文件树中查看配置目录</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default LayoutSettings
