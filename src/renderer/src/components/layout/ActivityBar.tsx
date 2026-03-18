import { Tooltip } from 'antd'
import {
  FileOutlined,
  SearchOutlined,
  TagsOutlined,
  ApartmentOutlined,
  SettingOutlined,
  BranchesOutlined
} from '@ant-design/icons'
import styles from './ActivityBar.module.css'

interface ActivityBarProps {
  activePanel: string
  onPanelClick: (panelId: string) => void
}

interface ActivityBarItem {
  id: string
  icon: React.ReactNode
  title: string
}

const items: ActivityBarItem[] = [
  { id: 'files', icon: <FileOutlined />, title: '文件资源管理器' },
  { id: 'search', icon: <SearchOutlined />, title: '搜索' },
  { id: 'vocabulary', icon: <TagsOutlined />, title: '词汇管理' },
  { id: 'git', icon: <BranchesOutlined />, title: '版本控制' },
  { id: 'visualization', icon: <ApartmentOutlined />, title: '可视化工具' }
]

const bottomItems: ActivityBarItem[] = [{ id: 'settings', icon: <SettingOutlined />, title: '设置' }]

function ActivityBar({ activePanel, onPanelClick }: ActivityBarProps): JSX.Element {
  return (
    <div className={styles.activityBar}>
      <div className={styles.top}>
        {items.map((item) => (
          <Tooltip key={item.id} title={item.title} placement="right" mouseEnterDelay={0.5}>
            <div
              className={`${styles.item} ${activePanel === item.id ? styles.active : ''}`}
              onClick={() => onPanelClick(item.id)}
            >
              {item.icon}
            </div>
          </Tooltip>
        ))}
      </div>
      <div className={styles.bottom}>
        {bottomItems.map((item) => (
          <Tooltip key={item.id} title={item.title} placement="right" mouseEnterDelay={0.5}>
            <div
              className={`${styles.item} ${activePanel === item.id ? styles.active : ''}`}
              onClick={() => onPanelClick(item.id)}
            >
              {item.icon}
            </div>
          </Tooltip>
        ))}
      </div>
    </div>
  )
}

export default ActivityBar
