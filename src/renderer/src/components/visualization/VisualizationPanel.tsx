/**
 * 可视化工具面板
 * 包含时间线、关系图谱、事序图、组织架构等工具的入口
 */

import { useState } from 'react'
import { Typography, Card, Row, Col, Button } from 'antd'
import {
  ClockCircleOutlined,
  ApartmentOutlined,
  TeamOutlined,
  EnvironmentOutlined,
  ArrowLeftOutlined,
  TableOutlined
} from '@ant-design/icons'
import RelationshipPanel from './relationship/RelationshipPanel'
import TimelinePanel from './timeline/TimelinePanel'
import { SequenceChartPanel } from './sequence-chart'
import { OrganizationPanel } from './organization'
import { MapPanel } from './map'
import styles from './VisualizationPanel.module.css'

const { Text, Title } = Typography

interface ToolCard {
  key: string
  icon: React.ReactNode
  title: string
  description: string
  status: 'available' | 'coming' | 'development'
}

const tools: ToolCard[] = [
  {
    key: 'timeline',
    icon: <ClockCircleOutlined className={styles.toolIcon} />,
    title: '时间线',
    description: '管理故事时间线，追踪事件发展顺序',
    status: 'available'
  },
  {
    key: 'sequenceChart',
    icon: <TableOutlined className={styles.toolIcon} />,
    title: '事序图',
    description: '甘特图风格的事件管理，可视化事件时间跨度',
    status: 'available'
  },
  {
    key: 'relationship',
    icon: <ApartmentOutlined className={styles.toolIcon} />,
    title: '关系图谱',
    description: '可视化人物关系网络',
    status: 'available'
  },
  {
    key: 'organization',
    icon: <TeamOutlined className={styles.toolIcon} />,
    title: '组织架构',
    description: '管理组织结构和成员关系',
    status: 'available'
  },
  {
    key: 'map',
    icon: <EnvironmentOutlined className={styles.toolIcon} />,
    title: '地图设计',
    description: '绘制故事地图和地点关系',
    status: 'available'
  }
]

function VisualizationPanel(): JSX.Element {
  const [activeTool, setActiveTool] = useState<string | null>(null)

  // 渲染活动工具面板
  const renderActiveTool = () => {
    switch (activeTool) {
      case 'relationship':
        return <RelationshipPanel />
      case 'timeline':
        return <TimelinePanel />
      case 'sequenceChart':
        return <SequenceChartPanel />
      case 'organization':
        return <OrganizationPanel />
      case 'map':
        return <MapPanel />
      default:
        return null
    }
  }

  // 如果选中了某个工具，显示对应的工具面板
  if (
    activeTool &&
    ['relationship', 'timeline', 'sequenceChart', 'organization', 'map'].includes(activeTool)
  ) {
    return (
      <div className={styles.toolContainer}>
        <div className={styles.toolHeader}>
          <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => setActiveTool(null)}>
            返回
          </Button>
        </div>
        <div className={styles.toolContent}>{renderActiveTool()}</div>
      </div>
    )
  }

  const handleToolClick = (tool: ToolCard) => {
    if (tool.status === 'available') {
      setActiveTool(tool.key)
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Title level={5}>可视化工具</Title>
        <Text type="secondary">通过可视化方式管理和展示创作内容</Text>
      </div>

      <Row gutter={[16, 16]} className={styles.content}>
        {tools.map(tool => (
          <Col span={12} key={tool.key}>
            <Card
              hoverable={tool.status === 'available'}
              className={`${styles.toolCard} ${tool.status !== 'available' ? styles.toolCardDisabled : ''}`}
              onClick={() => handleToolClick(tool)}
            >
              <div className={styles.cardContent}>
                {tool.icon}
                <div className={styles.cardText}>
                  <Text strong>{tool.title}</Text>
                  <Text type="secondary" className={styles.cardDesc}>
                    {tool.description}
                  </Text>
                </div>
                {tool.status === 'coming' && <span className={styles.badge}>即将推出</span>}
                {tool.status === 'development' && (
                  <span className={`${styles.badge} ${styles.badgeDevelopment}`}>开发中</span>
                )}
                {tool.status === 'available' && (
                  <span className={`${styles.badge} ${styles.badgeAvailable}`}>可用</span>
                )}
              </div>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  )
}

export default VisualizationPanel
