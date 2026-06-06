import { useEffect, useMemo } from 'react'
import { Tooltip } from 'antd'
import {
  FileOutlined,
  SearchOutlined,
  BranchesOutlined,
  SettingOutlined,
  TagOutlined,
  WarningOutlined,
  ApartmentOutlined,
  ClockCircleOutlined,
  TableOutlined,
  TeamOutlined,
  RobotOutlined,
  EnvironmentOutlined,
  FireOutlined
} from '@ant-design/icons'
import { useSettingsStore } from '@stores/settingsStore'
import type { SidebarBadgeType } from '@types/badge'
import { DEFAULT_SIDEBAR_BADGE_ORDER } from '@types/badge'
import { DEFAULT_SIDEBAR_BADGE_VISIBILITY, type SidebarBadgeVisibility } from '@shared/settings'
import styles from './ActivityBar.module.css'

interface ActivityBarProps {
  activePanel: string
  sidebarCollapsed: boolean
  onPanelClick: (panelId: string) => void
}

const MAIN_BUTTONS = [
  { id: 'files', icon: FileOutlined, tooltip: '文件' },
  { id: 'search', icon: SearchOutlined, tooltip: '搜索' },
  { id: 'git', icon: BranchesOutlined, tooltip: 'Git' }
]

const SETTINGS_BUTTON = { id: 'settings', icon: SettingOutlined, tooltip: '设置' }

const SIDEBAR_BADGE_CONFIG: Record<
  SidebarBadgeType,
  { icon: React.ComponentType; tooltip: string }
> = {
  vocabulary: { icon: TagOutlined, tooltip: '词汇查询' },
  sensitive: { icon: WarningOutlined, tooltip: '敏感词' },
  relationship: { icon: ApartmentOutlined, tooltip: '关系图' },
  timeline: { icon: ClockCircleOutlined, tooltip: '时间线' },
  sequenceChart: { icon: TableOutlined, tooltip: '事序图' },
  organization: { icon: TeamOutlined, tooltip: '组织架构' },
  aiAssistant: { icon: RobotOutlined, tooltip: 'AI写作助手' },
  map: { icon: EnvironmentOutlined, tooltip: '地图' },
  writingGoal: { icon: FireOutlined, tooltip: '写作目标' }
}

function ActivityBar({
  activePanel,
  sidebarCollapsed,
  onPanelClick
}: ActivityBarProps): JSX.Element {
  const globalSettings = useSettingsStore(state => state.globalSettings)

  const visibility: SidebarBadgeVisibility = useMemo(() => {
    return globalSettings.layout?.sidebarBadgeVisibility || DEFAULT_SIDEBAR_BADGE_VISIBILITY
  }, [globalSettings.layout?.sidebarBadgeVisibility])

  const order: SidebarBadgeType[] = useMemo(() => {
    const savedOrder = globalSettings.layout?.sidebarBadgeOrder
    if (savedOrder && Array.isArray(savedOrder) && savedOrder.length > 0) {
      const validOrder = savedOrder.filter((b): b is SidebarBadgeType =>
        DEFAULT_SIDEBAR_BADGE_ORDER.includes(b as SidebarBadgeType)
      )
      const missingBadges = DEFAULT_SIDEBAR_BADGE_ORDER.filter(b => !validOrder.includes(b))
      return [...validOrder, ...missingBadges]
    }
    return [...DEFAULT_SIDEBAR_BADGE_ORDER]
  }, [globalSettings.layout?.sidebarBadgeOrder])

  useEffect(() => {
    const handleBackToFiles = () => {
      onPanelClick('files')
    }
    window.addEventListener('sidebar-back-to-files', handleBackToFiles)
    return () => {
      window.removeEventListener('sidebar-back-to-files', handleBackToFiles)
    }
  }, [onPanelClick])

  const visibleBadges = useMemo(() => {
    return order.filter(id => visibility[id])
  }, [order, visibility])

  return (
    <div className={styles.container}>
      <div className={styles.mainButtons} role="navigation" aria-label="主导航">
        {MAIN_BUTTONS.map(button => {
          const IconComponent = button.icon
          const isActive = !sidebarCollapsed && activePanel === button.id

          return (
            <Tooltip key={button.id} title={button.tooltip} placement="right">
              <div
                className={`${styles.button} ${isActive ? styles.active : ''}`}
                onClick={() => onPanelClick(button.id)}
                role="button"
                aria-label={button.tooltip}
                aria-pressed={isActive}
                tabIndex={0}
              >
                <IconComponent className={styles.icon} />
              </div>
            </Tooltip>
          )
        })}
      </div>

      {visibleBadges.length > 0 && <div className={styles.divider} />}

      <div className={styles.sidebarBadgeButtons} role="navigation" aria-label="功能面板">
        {visibleBadges.map(badgeId => {
          const config = SIDEBAR_BADGE_CONFIG[badgeId]
          if (!config) return null

          const IconComponent = config.icon
          const isActive = !sidebarCollapsed && activePanel === badgeId

          return (
            <Tooltip key={badgeId} title={config.tooltip} placement="right">
              <div
                className={`${styles.button} ${isActive ? styles.active : ''}`}
                onClick={() => onPanelClick(badgeId)}
                role="button"
                aria-label={config.tooltip}
                aria-pressed={isActive}
                tabIndex={0}
              >
                <IconComponent className={styles.icon} />
              </div>
            </Tooltip>
          )
        })}
      </div>

      <div className={styles.settingsButton}>
        <div className={styles.divider} />
        <Tooltip title={SETTINGS_BUTTON.tooltip} placement="right">
          <div
            className={`${styles.button} ${!sidebarCollapsed && activePanel === SETTINGS_BUTTON.id ? styles.active : ''}`}
            onClick={() => onPanelClick(SETTINGS_BUTTON.id)}
            role="button"
            aria-label={SETTINGS_BUTTON.tooltip}
            aria-pressed={!sidebarCollapsed && activePanel === SETTINGS_BUTTON.id}
            tabIndex={0}
          >
            <SETTINGS_BUTTON.icon className={styles.icon} />
          </div>
        </Tooltip>
      </div>
    </div>
  )
}

export default ActivityBar
