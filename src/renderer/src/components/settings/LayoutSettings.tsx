/**
 * 界面布局设置组件
 * 管理徽章显示/隐藏等界面布局相关设置
 */

import { useMemo, useState, useEffect } from 'react'
import { Switch, message } from 'antd'
import { TagOutlined, WarningOutlined, UserAddOutlined, ApartmentOutlined, ClockCircleOutlined, TableOutlined, TeamOutlined, CodeOutlined, InfoCircleOutlined, EyeOutlined } from '@ant-design/icons'
import { useSettingsStore } from '@stores/settingsStore'
import { useProjectStore } from '@stores/projectStore'
import { useFileTreeStore } from '@stores/fileTreeStore'
import type { BadgeVisibility } from '@types/settings'
import { DEFAULT_BADGE_VISIBILITY } from '@types/settings'
import styles from './LayoutSettings.module.css'

// 徽章配置
const BADGE_CONFIG = [
  {
    key: 'vocabulary' as keyof BadgeVisibility,
    name: '词汇查询',
    description: '快速查询和管理词汇',
    icon: TagOutlined
  },
  {
    key: 'sensitive' as keyof BadgeVisibility,
    name: '敏感词',
    description: '敏感词检测与管理',
    icon: WarningOutlined
  },
  {
    key: 'randomName' as keyof BadgeVisibility,
    name: '随机起名',
    description: '快速生成随机姓名',
    icon: UserAddOutlined
  },
  {
    key: 'relationship' as keyof BadgeVisibility,
    name: '关系图',
    description: '人物关系可视化',
    icon: ApartmentOutlined
  },
  {
    key: 'timeline' as keyof BadgeVisibility,
    name: '时间线',
    description: '故事情节时间线管理',
    icon: ClockCircleOutlined
  },
  {
    key: 'sequenceChart' as keyof BadgeVisibility,
    name: '事序图',
    description: '甘特图风格的事件管理',
    icon: TableOutlined
  },
  {
    key: 'organization' as keyof BadgeVisibility,
    name: '组织架构',
    description: '组织结构和成员关系管理',
    icon: TeamOutlined
  },
  {
    key: 'terminal' as keyof BadgeVisibility,
    name: '终端',
    description: '集成终端命令行工具',
    icon: CodeOutlined
  }
]

function LayoutSettings(): JSX.Element {
  const currentProject = useProjectStore((state) => state.currentProject)
  const projectSettings = useSettingsStore((state) => state.projectSettings)
  const updateBadgeVisibility = useSettingsStore((state) => state.updateBadgeVisibility)
  const refreshTree = useFileTreeStore((state) => state.refreshTree)
  
  // 显示隐藏文件设置
  const [showHiddenFiles, setShowHiddenFiles] = useState(false)

  // 加载显示隐藏文件设置
  useEffect(() => {
    if (currentProject) {
      window.electron.settings.project.getShowHiddenFiles().then(setShowHiddenFiles)
    }
  }, [currentProject])

  // 当前徽章可见性设置
  const badgeVisibility = useMemo(() => {
    return projectSettings?.badgeVisibility || DEFAULT_BADGE_VISIBILITY
  }, [projectSettings?.badgeVisibility])

  // 切换徽章可见性
  const handleToggle = async (key: keyof BadgeVisibility, checked: boolean) => {
    try {
      await updateBadgeVisibility({ [key]: checked })
    } catch (error) {
      message.error('保存设置失败')
    }
  }

  // 切换显示隐藏文件
  const handleToggleHiddenFiles = async (checked: boolean) => {
    try {
      await window.electron.settings.project.setShowHiddenFiles(checked)
      setShowHiddenFiles(checked)
      // 刷新文件树
      refreshTree()
    } catch (error) {
      message.error('保存设置失败')
    }
  }

  if (!currentProject) {
    return (
      <div className={styles.container}>
        <div className={styles.tip}>
          <InfoCircleOutlined className={styles.tipIcon} />
          <span>请先打开项目以配置界面布局</span>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.section}>
        <div className={styles.sectionTitle}>徽章显示</div>
        <div className={styles.sectionDescription}>
          控制右侧工具栏中徽章的显示与隐藏。隐藏的徽章将不会出现在工具栏中。
        </div>
        
        <div className={styles.badgeList}>
          {BADGE_CONFIG.map((badge, index) => {
            const IconComponent = badge.icon
            const isVisible = badgeVisibility[badge.key]
            
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
                <Switch
                  checked={isVisible}
                  onChange={(checked) => handleToggle(badge.key, checked)}
                  checkedChildren="显示"
                  unCheckedChildren="隐藏"
                />
              </div>
            )
          })}
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>高级设置</div>
        <div className={styles.sectionDescription}>
          文件树的高级显示选项。
        </div>
        
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
      </div>

      <div className={styles.tip}>
        <InfoCircleOutlined className={styles.tipIcon} />
        <div>
          <p style={{ margin: 0 }}>提示：</p>
          <ul style={{ margin: '8px 0 0 0', paddingLeft: 20 }}>
            <li>徽章的显示顺序可以在工具栏中长按拖拽调整</li>
            <li>隐藏的徽章功能仍然可用，只是入口被隐藏</li>
            <li>显示隐藏文件后可在文件树中查看配置目录</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default LayoutSettings
