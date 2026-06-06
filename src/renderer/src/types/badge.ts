/**
 * 徽章类型定义
 */

export type BadgeType =
  | 'vocabulary'
  | 'sensitive'
  | 'randomName'
  | 'relationship'
  | 'timeline'
  | 'sequenceChart'
  | 'organization'
  | 'map'
  | 'terminal'

export interface BadgeConfig {
  id: BadgeType
  label: string
  icon: string
  order: number
}

export const DEFAULT_BADGE_ORDER: BadgeType[] = [
  'vocabulary',
  'sensitive',
  'randomName',
  'relationship',
  'timeline',
  'sequenceChart',
  'organization',
  'map',
  'terminal'
]

export const BADGE_DISPLAY_CONFIG: Record<BadgeType, { label: string; icon: string }> = {
  vocabulary: { label: '词汇查询', icon: 'TagOutlined' },
  sensitive: { label: '敏感词', icon: 'WarningOutlined' },
  randomName: { label: '随机起名', icon: 'UserAddOutlined' },
  relationship: { label: '关系图', icon: 'ApartmentOutlined' },
  timeline: { label: '时间线', icon: 'ClockCircleOutlined' },
  sequenceChart: { label: '事序图', icon: 'TableOutlined' },
  organization: { label: '组织架构', icon: 'ClusterOutlined' },
  map: { label: '地图设计', icon: 'EnvironmentOutlined' },
  terminal: { label: '终端', icon: 'CodeOutlined' }
}

/** 左侧边栏徽章类型（仅包含有全屏功能的） */
export type SidebarBadgeType =
  | 'vocabulary'
  | 'sensitive'
  | 'relationship'
  | 'timeline'
  | 'sequenceChart'
  | 'organization'
  | 'aiAssistant'
  | 'map'
  | 'writingGoal'

export const DEFAULT_SIDEBAR_BADGE_ORDER: SidebarBadgeType[] = [
  'vocabulary',
  'sensitive',
  'relationship',
  'timeline',
  'sequenceChart',
  'organization',
  'aiAssistant',
  'map',
  'writingGoal'
]

export const SIDEBAR_BADGE_DISPLAY_CONFIG: Record<
  SidebarBadgeType,
  { label: string; icon: string }
> = {
  vocabulary: { label: '词汇查询', icon: 'TagOutlined' },
  sensitive: { label: '敏感词', icon: 'WarningOutlined' },
  relationship: { label: '关系图', icon: 'ApartmentOutlined' },
  timeline: { label: '时间线', icon: 'ClockCircleOutlined' },
  sequenceChart: { label: '事序图', icon: 'TableOutlined' },
  organization: { label: '组织架构', icon: 'ClusterOutlined' },
  aiAssistant: { label: 'AI写作助手', icon: 'RobotOutlined' },
  map: { label: '地图', icon: 'EnvironmentOutlined' },
  writingGoal: { label: '写作目标', icon: 'FireOutlined' }
}
