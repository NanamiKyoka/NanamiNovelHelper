/**
 * 全局界面布局设置组件
 * 管理徽章显示/隐藏等界面布局相关设置（跨项目共享）
 */

import { useMemo } from 'react'
import { Switch, message, Divider, Card } from 'antd'
import {
  TagOutlined,
  WarningOutlined,
  UserAddOutlined,
  ApartmentOutlined,
  ClockCircleOutlined,
  TableOutlined,
  TeamOutlined,
  EnvironmentOutlined,
  CodeOutlined,
  InfoCircleOutlined,
  EyeOutlined
} from '@ant-design/icons'
import { useSettingsStore } from '@stores/settingsStore'
import type { BadgeVisibility, SidebarBadgeVisibility } from '@shared/settings'
import { DEFAULT_BADGE_VISIBILITY, DEFAULT_SIDEBAR_BADGE_VISIBILITY } from '@shared/settings'
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

function GlobalLayoutSettings(): JSX.Element {
  const globalSettings = useSettingsStore(state => state.globalSettings)
  const updateBadgeVisibility = useSettingsStore(state => state.updateBadgeVisibility)
  const updateSidebarBadgeVisibility = useSettingsStore(state => state.updateSidebarBadgeVisibility)
  const setShowHiddenFiles = useSettingsStore(state => state.setShowHiddenFiles)

  const badgeVisibility = useMemo(() => {
    return globalSettings.layout?.badgeVisibility || DEFAULT_BADGE_VISIBILITY
  }, [globalSettings.layout?.badgeVisibility])

  const sidebarBadgeVisibility = useMemo(() => {
    return globalSettings.layout?.sidebarBadgeVisibility || DEFAULT_SIDEBAR_BADGE_VISIBILITY
  }, [globalSettings.layout?.sidebarBadgeVisibility])

  const showHiddenFiles = useMemo(() => {
    return globalSettings.layout?.showHiddenFiles ?? false
  }, [globalSettings.layout?.showHiddenFiles])

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
      await setShowHiddenFiles(checked)
    } catch (error) {
      message.error('保存设置失败')
    }
  }

  return (
    <div className={baseStyles.container}>
      <Card title="徽章显示" className={baseStyles.card}>
        <p className={baseStyles.hint}>
          控制徽章的显示位置。可以同时在右侧工具栏和左侧边栏显示入口。这些设置将应用于所有项目。
        </p>

        <div className={styles.badgeList}>
          {BADGE_CONFIG.map(badge => {
            const IconComponent = badge.icon
            const isBadgeVisible = badgeVisibility[badge.key]
            const isSidebarVisible = badge.hasSidebarEntry
              ? sidebarBadgeVisibility[badge.key as keyof SidebarBadgeVisibility]
              : false

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
                      onChange={checked => handleBadgeToggle(badge.key, checked)}
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
                          onChange={checked =>
                            handleSidebarBadgeToggle(
                              badge.key as keyof SidebarBadgeVisibility,
                              checked
                            )
                          }
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

      <Card title="文件显示" className={baseStyles.card}>
        <p className={baseStyles.hint}>文件树的显示选项。</p>

        <div className={styles.badgeList}>
          <div className={styles.badgeItem}>
            <div className={styles.badgeItemLeft}>
              <div className={styles.badgeIcon}>
                <EyeOutlined />
              </div>
              <div className={styles.badgeInfo}>
                <span className={styles.badgeName}>显示隐藏文件</span>
                <span className={styles.badgeDesc}>
                  显示以 . 开头的文件和目录（如 .novelhelper）
                </span>
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
      </Card>

      <div className={baseStyles.tip}>
        <InfoCircleOutlined className={baseStyles.tipIcon} />
        <div>
          <p style={{ margin: 0 }}>提示：</p>
          <ul style={{ margin: '8px 0 0 0', paddingLeft: 20 }}>
            <li>徽章可以同时显示在右侧工具栏和左侧边栏</li>
            <li>右侧徽章和左侧边栏入口的顺序都可以通过长按拖拽调整</li>
            <li>隐藏的徽章功能仍然可用，只是入口被隐藏</li>
            <li>这些设置将应用于所有项目</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default GlobalLayoutSettings
