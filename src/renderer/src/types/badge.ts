/**
 * 右侧徽章类型定义
 */

// 徽章类型
export type BadgeType = 'vocabulary' | 'sensitive' | 'randomName' | 'relationship' | 'timeline' | 'sequenceChart' | 'organization' | 'terminal'

// 徽章配置
export interface BadgeConfig {
  id: BadgeType
  label: string
  icon: string  // 图标名称
  order: number // 排序顺序
}

// 默认徽章配置
export const DEFAULT_BADGE_ORDER: BadgeType[] = ['vocabulary', 'sensitive', 'randomName', 'relationship', 'timeline', 'sequenceChart', 'organization', 'terminal']

// 徽章显示配置
export const BADGE_DISPLAY_CONFIG: Record<BadgeType, { label: string; icon: string }> = {
  vocabulary: {
    label: '词汇查询',
    icon: 'TagOutlined'
  },
  sensitive: {
    label: '敏感词',
    icon: 'WarningOutlined'
  },
  randomName: {
    label: '随机起名',
    icon: 'UserAddOutlined'
  },
  relationship: {
    label: '关系图',
    icon: 'ApartmentOutlined'
  },
  timeline: {
    label: '时间线',
    icon: 'ClockCircleOutlined'
  },
  sequenceChart: {
    label: '事序图',
    icon: 'TableOutlined'
  },
  organization: {
    label: '组织架构',
    icon: 'ClusterOutlined'
  },
  terminal: {
    label: '终端',
    icon: 'CodeOutlined'
  }
}
