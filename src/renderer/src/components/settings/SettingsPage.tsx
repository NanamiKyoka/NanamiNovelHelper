import { useState } from 'react'
import { Layout, Menu } from 'antd'
import {
  SettingOutlined,
  TagsOutlined,
  WarningOutlined,
  BgColorsOutlined,
  EditOutlined,
  LayoutOutlined,
  KeyOutlined,
  HighlightOutlined
} from '@ant-design/icons'
import AppearanceSettings from './AppearanceSettings'
import { EditorSettings } from './EditorSettings'
import { HighlightSettings } from './HighlightSettings'
import LayoutSettings from './LayoutSettings'
import VocabularyTypeSettings from '../vocabulary/VocabularyTypeSettings'
import VocabularyPanel from '../vocabulary/VocabularyPanel'
import SensitiveWordPanel from '../vocabulary/SensitiveWordPanel'
import styles from './SettingsPage.module.css'

const { Sider, Content } = Layout

type SettingsKey = 'appearance' | 'editor' | 'layout' | 'highlight' | 'vocabulary-types' | 'vocabulary-entries' | 'sensitive-words' | 'shortcuts'

const menuItems = [
  {
    key: 'appearance',
    icon: <BgColorsOutlined />,
    label: '外观设置'
  },
  {
    key: 'editor',
    icon: <EditOutlined />,
    label: '编辑器设置'
  },
  {
    key: 'layout',
    icon: <LayoutOutlined />,
    label: '界面布局'
  },
  {
    key: 'highlight',
    icon: <HighlightOutlined />,
    label: '词汇高亮'
  },
  { type: 'divider' as const },
  {
    key: 'vocabulary-types',
    icon: <TagsOutlined />,
    label: '词汇类型管理'
  },
  {
    key: 'vocabulary-entries',
    icon: <TagsOutlined />,
    label: '词汇条目'
  },
  {
    key: 'sensitive-words',
    icon: <WarningOutlined />,
    label: '敏感词管理'
  },
  { type: 'divider' as const },
  {
    key: 'shortcuts',
    icon: <KeyOutlined />,
    label: '快捷键设置'
  }
]

function SettingsPage(): JSX.Element {
  const [selectedKey, setSelectedKey] = useState<SettingsKey>('appearance')

  const renderContent = (): JSX.Element => {
    switch (selectedKey) {
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
      case 'vocabulary-types':
        return (
          <div className={styles.panel}>
            <h2>词汇类型管理</h2>
            <p className={styles.description}>
              管理词汇类型和字段定义。您可以创建自定义类型，或从预设模板开始定制。
            </p>
            <VocabularyTypeSettings />
          </div>
        )
      case 'vocabulary-entries':
        return (
          <div className={styles.panel}>
            <h2>词汇条目</h2>
            <p className={styles.description}>
              管理词汇条目。支持按类型分类，可以为每个词汇创建关联的 Markdown 文件。
            </p>
            <VocabularyPanel />
          </div>
        )
      case 'sensitive-words':
        return (
          <div className={styles.panel}>
            <h2>敏感词管理</h2>
            <p className={styles.description}>
              管理敏感词列表。敏感词在编辑器中会被标记提示，帮助您规避风险内容。
            </p>
            <SensitiveWordPanel />
          </div>
        )
      case 'shortcuts':
        return (
          <div className={styles.panel}>
            <h2>快捷键设置</h2>
            <p className={styles.description}>
              自定义快捷键绑定（开发中）。
            </p>
          </div>
        )
      default:
        return <div>未知设置项</div>
    }
  }

  return (
    <Layout className={styles.container}>
      <Sider width={200} className={styles.sider}>
        <div className={styles.header}>
          <SettingOutlined />
          <span>设置</span>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          onClick={(e) => setSelectedKey(e.key as SettingsKey)}
          items={menuItems}
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