/**
 * 视图定义注册表
 * 所有工具面板统一在此注册，供 ActivityBar / SecondarySidebar 使用。
 * 默认全部在主侧边栏（左侧），用户可通过右键菜单移动到辅助侧边栏。
 * 随机起名（RandomName）不在此注册，保持在编辑器工具栏中浮动触发。
 */

import { lazy } from 'react'
import {
  FileOutlined,
  SearchOutlined,
  BranchesOutlined,
  RobotOutlined,
  FireOutlined,
  TagOutlined,
  WarningOutlined,
  ApartmentOutlined,
  ClockCircleOutlined,
  TableOutlined,
  TeamOutlined,
  EnvironmentOutlined
} from '@ant-design/icons'
import type { ViewDefinition } from '@types/view'

const FilesPanel = lazy(() => import('@components/file-tree/FileTree'))
const SearchPanel = lazy(() => import('@components/search/SearchPanel'))
const GitPanel = lazy(() => import('@components/git/GitPanel'))
const AiAssistantPanel = lazy(() => import('@components/ai-assistant/AiAssistantPanel'))
const WritingGoalPanel = lazy(() => import('@components/writing-goal/WritingGoalPanel'))
const VocabularyPanel = lazy(() => import('@components/vocabulary/VocabularyPanel'))
const SensitiveWordPanel = lazy(() => import('@components/vocabulary/SensitiveWordPanel'))
const RelationshipPanel = lazy(
  () => import('@components/visualization/relationship/RelationshipPanel')
)
const TimelinePanel = lazy(() => import('@components/visualization/timeline/TimelinePanel'))
const SequenceChartPanel = lazy(
  () => import('@components/visualization/sequence-chart/SequenceChartPanel')
)
const OrganizationPanel = lazy(
  () => import('@components/visualization/organization/OrganizationPanel')
)
const MapPanel = lazy(() => import('@components/visualization/map/MapPanel'))

export const VIEW_DEFINITIONS: ViewDefinition[] = [
  { id: 'files', label: '文件树', icon: FileOutlined, component: FilesPanel, defaultLocation: 'primary', order: 0 },
  { id: 'search', label: '搜索替换', icon: SearchOutlined, component: SearchPanel, defaultLocation: 'primary', order: 1 },
  { id: 'git', label: 'Git', icon: BranchesOutlined, component: GitPanel, defaultLocation: 'primary', order: 2 },
  { id: 'aiAssistant', label: 'AI 助手', icon: RobotOutlined, component: AiAssistantPanel, defaultLocation: 'primary', order: 3 },
  { id: 'writingGoal', label: '写作目标', icon: FireOutlined, component: WritingGoalPanel, defaultLocation: 'primary', order: 4 },
  { id: 'vocabulary', label: '词汇查询', icon: TagOutlined, component: VocabularyPanel, defaultLocation: 'primary', order: 5 },
  { id: 'sensitive', label: '敏感词', icon: WarningOutlined, component: SensitiveWordPanel, defaultLocation: 'primary', order: 6 },
  { id: 'relationship', label: '关系图', icon: ApartmentOutlined, component: RelationshipPanel, defaultLocation: 'primary', order: 7 },
  { id: 'timeline', label: '时间线', icon: ClockCircleOutlined, component: TimelinePanel, defaultLocation: 'primary', order: 8 },
  { id: 'sequenceChart', label: '事序图', icon: TableOutlined, component: SequenceChartPanel, defaultLocation: 'primary', order: 9 },
  { id: 'organization', label: '组织架构', icon: TeamOutlined, component: OrganizationPanel, defaultLocation: 'primary', order: 10 },
  { id: 'map', label: '地图设计', icon: EnvironmentOutlined, component: MapPanel, defaultLocation: 'primary', order: 11 }
]
