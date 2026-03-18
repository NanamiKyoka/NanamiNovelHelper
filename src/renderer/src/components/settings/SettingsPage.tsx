import { useState, useMemo } from 'react'
import { Layout, Menu, Input, Empty } from 'antd'
import {
  SettingOutlined,
  BgColorsOutlined,
  EditOutlined,
  LayoutOutlined,
  HighlightOutlined,
  KeyOutlined,
  ApiOutlined,
  DatabaseOutlined,
  CloudServerOutlined,
  SearchOutlined
} from '@ant-design/icons'
import AppearanceSettings from './AppearanceSettings'
import { EditorSettings } from './EditorSettings'
import { HighlightSettings } from './HighlightSettings'
import LayoutSettings from './LayoutSettings'
import { ShortcutsSettings } from './ShortcutsSettings'
import { ApiSettings } from './ApiSettings'
import { BackupSettings } from './BackupSettings'
import { DataManagementSettings } from './DataManagementSettings'
import styles from './SettingsPage.module.css'

const { Sider, Content } = Layout

type SettingsKey = 
  | 'appearance' 
  | 'shortcuts' 
  | 'api' 
  | 'data-management'
  | 'editor' 
  | 'layout' 
  | 'highlight' 
  | 'backup'

interface MenuItem {
  key: SettingsKey
  icon: React.ReactNode
  label: string
  group: 'global' | 'project'
  keywords: string[]
}

const menuItems: MenuItem[] = [
  // 全局设置
  { key: 'appearance', icon: <BgColorsOutlined />, label: '外观设置', group: 'global', keywords: ['主题', '颜色', '字体', '外观', 'theme', 'color'] },
  { key: 'shortcuts', icon: <KeyOutlined />, label: '快捷键设置', group: 'global', keywords: ['快捷键', '热键', 'shortcut', 'hotkey'] },
  { key: 'api', icon: <ApiOutlined />, label: 'AI/API 设置', group: 'global', keywords: ['AI', 'API', '密钥', 'key', '人工智能'] },
  { key: 'data-management', icon: <DatabaseOutlined />, label: '数据管理', group: 'global', keywords: ['导入', '导出', '重置', '备份', 'import', 'export', 'reset'] },
  // 项目设置
  { key: 'editor', icon: <EditOutlined />, label: '编辑器设置', group: 'project', keywords: ['编辑器', '字体', '行高', 'editor', 'font'] },
  { key: 'layout', icon: <LayoutOutlined />, label: '界面布局', group: 'project', keywords: ['布局', '徽章', '侧边栏', 'layout', 'badge'] },
  { key: 'highlight', icon: <HighlightOutlined />, label: '词汇高亮', group: 'project', keywords: ['高亮', '词汇', '匹配', 'highlight', 'vocabulary'] },
  { key: 'backup', icon: <CloudServerOutlined />, label: '备份与恢复', group: 'project', keywords: ['备份', '恢复', 'backup', 'restore'] }
]

function SettingsPage(): JSX.Element {
  const [selectedKey, setSelectedKey] = useState<SettingsKey>('appearance')
  const [searchText, setSearchText] = useState('')

  // 根据搜索文本过滤菜单项
  const filteredItems = useMemo(() => {
    if (!searchText.trim()) return menuItems
    
    const lowerSearch = searchText.toLowerCase()
    return menuItems.filter(item => 
      item.label.toLowerCase().includes(lowerSearch) ||
      item.keywords.some(keyword => keyword.toLowerCase().includes(lowerSearch))
    )
  }, [searchText])

  // 构建菜单结构（带分组）
  const menuStructure = useMemo(() => {
    const globalItems = filteredItems.filter(item => item.group === 'global')
    const projectItems = filteredItems.filter(item => item.group === 'project')
    
    const items: (MenuItem | { key: string; type: 'divider'; label?: string })[] = []
    
    if (globalItems.length > 0) {
      items.push({ key: 'group-global', type: 'divider', label: '全局设置' })
      items.push(...globalItems)
    }
    
    if (projectItems.length > 0) {
      items.push({ key: 'group-project', type: 'divider', label: '项目设置' })
      items.push(...projectItems)
    }
    
    return items
  }, [filteredItems])

  // 检查选中的项是否在过滤结果中，如果不在则选择第一个
  const currentKey = useMemo(() => {
    if (filteredItems.some(item => item.key === selectedKey)) {
      return selectedKey
    }
    return filteredItems[0]?.key || 'appearance'
  }, [filteredItems, selectedKey])

  const renderContent = (): JSX.Element => {
    const item = menuItems.find(i => i.key === currentKey)
    
    switch (currentKey) {
      case 'appearance':
        return (
          <div className={styles.panel}>
            <h2>外观设置</h2>
            <p className={styles.description}>
              自定义应用的外观，包括主题模式、主题色和字体大小等。
            </p>
            <AppearanceSettings />
          </div>
        )
      case 'shortcuts':
        return (
          <div className={styles.panel}>
            <h2>快捷键设置</h2>
            <p className={styles.description}>
              自定义快捷键绑定，提升操作效率。
            </p>
            <ShortcutsSettings />
          </div>
        )
      case 'api':
        return (
          <div className={styles.panel}>
            <h2>AI/API 设置</h2>
            <p className={styles.description}>
              管理 AI 服务的 API 密钥和相关配置。
            </p>
            <ApiSettings />
          </div>
        )
      case 'data-management':
        return (
          <div className={styles.panel}>
            <h2>数据管理</h2>
            <p className={styles.description}>
              导入、导出或重置应用设置。
            </p>
            <DataManagementSettings />
          </div>
        )
      case 'editor':
        return (
          <div className={styles.panel}>
            <h2>编辑器设置</h2>
            <p className={styles.description}>
              配置编辑器的行为和显示选项。
            </p>
            <EditorSettings />
          </div>
        )
      case 'layout':
        return (
          <div className={styles.panel}>
            <h2>界面布局</h2>
            <p className={styles.description}>
              调整界面的布局方式，包括侧边栏位置、工具栏显示、徽章显示等。
            </p>
            <LayoutSettings />
          </div>
        )
      case 'highlight':
        return (
          <div className={styles.panel}>
            <h2>词汇高亮</h2>
            <p className={styles.description}>
              配置词汇高亮的范围、匹配规则和显示样式。词汇高亮可以帮助您在写作时快速识别人物名、地点名等重要词汇。
            </p>
            <HighlightSettings />
          </div>
        )
      case 'backup':
        return (
          <div className={styles.panel}>
            <h2>备份与恢复</h2>
            <p className={styles.description}>
              管理项目备份，设置自动备份策略。
            </p>
            <BackupSettings />
          </div>
        )
      default:
        return (
          <div className={styles.panel}>
            <Empty description="请选择一个设置项" />
          </div>
        )
    }
  }

  // 渲染菜单项
  const renderMenuItem = (item: MenuItem | { key: string; type: 'divider'; label?: string }) => {
    if ('type' in item && item.type === 'divider') {
      return {
        key: item.key,
        type: 'group' as const,
        label: <span className={styles.groupLabel}>{item.label}</span>
      }
    }
    
    const menuItem = item as MenuItem
    return {
      key: menuItem.key,
      icon: menuItem.icon,
      label: menuItem.label
    }
  }

  return (
    <Layout className={styles.container}>
      <Sider width={220} className={styles.sider}>
        <div className={styles.header}>
          <SettingOutlined />
          <span>设置</span>
        </div>
        
        {/* 搜索框 */}
        <div className={styles.searchWrapper}>
          <Input
            placeholder="搜索设置..."
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            allowClear
            size="small"
          />
        </div>
        
        <Menu
          mode="inline"
          selectedKeys={[currentKey]}
          onClick={(e) => setSelectedKey(e.key as SettingsKey)}
          items={menuStructure.map(renderMenuItem)}
          className={styles.menu}
        />
      </Sider>
      <Content className={styles.content}>
        {renderContent()}
      </Content>
    </Layout>
  )
}

export default SettingsPage
